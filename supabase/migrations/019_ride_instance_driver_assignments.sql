create table if not exists public.ride_instance_driver_assignments (
  id uuid primary key default gen_random_uuid(),
  ride_instance_id uuid not null references public.ride_instances(id) on delete cascade,
  driver_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'ended')),
  assigned_at timestamptz not null default now(),
  ended_at timestamptz null,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_ride_instance_driver_assignment_active_pair
  on public.ride_instance_driver_assignments(ride_instance_id, driver_id)
  where status = 'active';

create index if not exists idx_ride_instance_driver_assignments_ride
  on public.ride_instance_driver_assignments(ride_instance_id, status);

create index if not exists idx_ride_instance_driver_assignments_driver
  on public.ride_instance_driver_assignments(driver_id, status);

drop index if exists public.uq_ride_instances_driver_date_slot;

create or replace function public.validate_ride_instance_driver_assignment()
returns trigger
language plpgsql
as $$
declare
  v_ride_date date;
  v_time_slot text;
begin
  if new.status <> 'active' then
    return new;
  end if;

  select ri.ride_date, ri.time_slot
  into v_ride_date, v_time_slot
  from public.ride_instances ri
  where ri.id = new.ride_instance_id;

  if v_ride_date is null then
    raise exception 'RIDE_INSTANCE_NOT_FOUND';
  end if;

  if exists (
    select 1
    from public.ride_instance_driver_assignments rida
    join public.ride_instances ri on ri.id = rida.ride_instance_id
    where rida.driver_id = new.driver_id
      and rida.status = 'active'
      and ri.ride_date = v_ride_date
      and ri.time_slot = v_time_slot
      and rida.id <> coalesce(new.id, gen_random_uuid())
  ) then
    raise exception 'DRIVER_ALREADY_ASSIGNED_FOR_SLOT';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_ride_instance_driver_assignment
  on public.ride_instance_driver_assignments;
create trigger trg_validate_ride_instance_driver_assignment
before insert or update on public.ride_instance_driver_assignments
for each row execute procedure public.validate_ride_instance_driver_assignment();

create or replace function public.validate_ride_instance_driver_reassignment()
returns trigger
language plpgsql
as $$
declare
  v_conflict_driver_id uuid;
begin
  if new.ride_date = old.ride_date and new.time_slot = old.time_slot then
    return new;
  end if;

  for v_conflict_driver_id in
    select rida.driver_id
    from public.ride_instance_driver_assignments rida
    where rida.ride_instance_id = new.id
      and rida.status = 'active'
  loop
    if exists (
      select 1
      from public.ride_instance_driver_assignments other
      join public.ride_instances ri on ri.id = other.ride_instance_id
      where other.driver_id = v_conflict_driver_id
        and other.status = 'active'
        and ri.ride_date = new.ride_date
        and ri.time_slot = new.time_slot
        and other.ride_instance_id <> new.id
    ) then
      raise exception 'DRIVER_ALREADY_ASSIGNED_FOR_SLOT';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_validate_ride_instance_driver_reassignment
  on public.ride_instances;
create trigger trg_validate_ride_instance_driver_reassignment
before update of ride_date, time_slot on public.ride_instances
for each row execute procedure public.validate_ride_instance_driver_reassignment();

insert into public.ride_instance_driver_assignments (ride_instance_id, driver_id, status, assigned_at, created_at)
select ri.id, ri.driver_id, 'active', coalesce(ri.created_at, now()), coalesce(ri.created_at, now())
from public.ride_instances ri
where ri.driver_id is not null
  and not exists (
    select 1
    from public.ride_instance_driver_assignments rida
    where rida.ride_instance_id = ri.id
      and rida.driver_id = ri.driver_id
      and rida.status = 'active'
  );

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

  select ri.status, ri.ride_date, ri.departure_time
  into v_ride_status, v_ride_date, v_departure_time
  from public.ride_instances ri
  where ri.id = v_booking.ride_instance_id
  for update;

  if not exists (
    select 1
    from public.ride_instance_driver_assignments rida
    where rida.ride_instance_id = v_booking.ride_instance_id
      and rida.driver_id = p_driver_id
      and rida.status = 'active'
  ) then
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
