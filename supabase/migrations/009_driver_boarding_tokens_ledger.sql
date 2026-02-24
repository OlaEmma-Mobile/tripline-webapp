-- Extend booking status lifecycle for driver finalization flow.
alter table if exists public.bookings
drop constraint if exists bookings_status_check;

alter table if exists public.bookings
add constraint bookings_status_check
check (status in ('pending', 'confirmed', 'booked', 'boarded', 'no_show', 'completed', 'cancelled', 'expired'));

-- Driver finalization timestamps.
alter table if exists public.bookings
add column if not exists boarded_at timestamptz null;

alter table if exists public.bookings
add column if not exists no_show_marked_at timestamptz null;

-- Informational wallet/consumption ledger (no refund/deduction duplication here).
create table if not exists public.tokens_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  amount int not null default 0,
  type text not null check (type in ('debit', 'credit', 'info')),
  reference text not null,
  reason text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_tokens_ledger_user_created_at
  on public.tokens_ledger(user_id, created_at desc);
create index if not exists idx_tokens_ledger_reference
  on public.tokens_ledger(reference);
create index if not exists idx_tokens_ledger_reason
  on public.tokens_ledger(reason);

-- Transactional driver-side booking finalization.
create or replace function public.driver_mark_booking(
  p_booking_id uuid,
  p_driver_id uuid,
  p_action text,
  p_no_show_grace_minutes int default 10
)
returns public.bookings
language plpgsql
as $$
declare
  v_booking public.bookings%rowtype;
  v_ride_status text;
  v_ride_driver_id uuid;
  v_ride_date date;
  v_departure_time time;
  v_departure_at timestamptz;
  v_action text;
begin
  select b.*
  into v_booking
  from public.bookings b
  where b.id = p_booking_id
  for update;

  if v_booking.id is null then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  select ri.status, ri.driver_id, ri.ride_date, ri.departure_time
  into v_ride_status, v_ride_driver_id, v_ride_date, v_departure_time
  from public.ride_instances ri
  where ri.id = v_booking.ride_instance_id
  for update;

  if v_ride_driver_id is null or v_ride_driver_id <> p_driver_id then
    raise exception 'FORBIDDEN_DRIVER';
  end if;

  if v_ride_status in ('completed', 'cancelled') then
    raise exception 'RIDE_CLOSED';
  end if;

  if v_booking.status <> 'booked' then
    raise exception 'BOOKING_NOT_BOOKED';
  end if;

  v_action := upper(coalesce(trim(p_action), ''));
  if v_action not in ('BOARDED', 'NO_SHOW') then
    raise exception 'INVALID_ACTION';
  end if;

  if v_action = 'NO_SHOW' then
    v_departure_at := (v_ride_date + v_departure_time) at time zone 'UTC';
    if now() < (v_departure_at + make_interval(mins => greatest(p_no_show_grace_minutes, 0))) then
      raise exception 'NO_SHOW_TOO_EARLY';
    end if;
  end if;

  if v_action = 'BOARDED' then
    update public.bookings
    set status = 'boarded',
        boarded_at = now()
    where id = p_booking_id
    returning * into v_booking;

    insert into public.tokens_ledger(user_id, amount, type, reference, reason, metadata)
    values (
      v_booking.rider_id,
      0,
      'info',
      v_booking.id::text,
      'RIDE_BOARDED',
      jsonb_build_object('booking_id', v_booking.id, 'driver_id', p_driver_id)
    );
  else
    update public.bookings
    set status = 'no_show',
        no_show_marked_at = now()
    where id = p_booking_id
    returning * into v_booking;

    insert into public.tokens_ledger(user_id, amount, type, reference, reason, metadata)
    values (
      v_booking.rider_id,
      0,
      'info',
      v_booking.id::text,
      'NO_SHOW_TOKEN_CONSUMED',
      jsonb_build_object('booking_id', v_booking.id, 'driver_id', p_driver_id)
    );
  end if;

  return v_booking;
end;
$$;
