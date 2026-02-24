-- 1) Extend bookings status to include 'booked' for direct paid bookings.
alter table if exists public.bookings
drop constraint if exists bookings_status_check;

alter table if exists public.bookings
add constraint bookings_status_check
check (status in ('pending', 'confirmed', 'booked', 'cancelled', 'expired'));

-- 2) Ensure rider has at most one active booking state per ride instance.
drop index if exists public.uq_bookings_active_rider_per_ride;
create unique index if not exists uq_bookings_active_rider_per_ride
  on public.bookings(ride_instance_id, rider_id)
  where status in ('pending', 'confirmed', 'booked');

-- 3) Booking token deduction ledger.
create table if not exists public.booking_token_deductions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  token_credit_id uuid not null references public.token_credits(id) on delete restrict,
  tokens_deducted int not null check (tokens_deducted > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_booking_token_deductions_booking on public.booking_token_deductions(booking_id);
create index if not exists idx_booking_token_deductions_credit on public.booking_token_deductions(token_credit_id);

-- 4) Availability view should treat BOOKED as reserved seats.
create or replace view public.ride_instance_availability as
select
  ri.id as ride_instance_id,
  ri.route_id,
  ri.vehicle_id,
  ri.driver_id,
  ri.ride_date,
  ri.departure_time,
  ri.status,
  v.capacity,
  coalesce(
    sum(
      case
        when b.status in ('confirmed', 'booked') then b.seat_count
        when b.status = 'pending' and b.lock_expires_at > now() then b.seat_count
        else 0
      end
    ),
    0
  )::int as reserved_seats,
  greatest(
    v.capacity - coalesce(
      sum(
        case
          when b.status in ('confirmed', 'booked') then b.seat_count
          when b.status = 'pending' and b.lock_expires_at > now() then b.seat_count
          else 0
        end
      ),
      0
    ),
    0
  )::int as available_seats,
  ri.created_at,
  ri.updated_at
from public.ride_instances ri
join public.vehicles v on v.id = ri.vehicle_id
left join public.bookings b on b.ride_instance_id = ri.id
group by ri.id, v.capacity;

-- 5) Atomic booking + token deduction.
create or replace function public.create_booking_with_tokens(
  p_ride_instance_id uuid,
  p_rider_id uuid,
  p_seat_count int default 1
)
returns table (
  booking_id uuid,
  ride_instance_id uuid,
  rider_id uuid,
  status text,
  seat_count int,
  tokens_deducted int,
  tokens_remaining int,
  capacity int,
  reserved_seats int,
  available_seats int
)
language plpgsql
as $$
declare
  v_route_id uuid;
  v_vehicle_id uuid;
  v_ride_status text;
  v_capacity int;
  v_reserved int;
  v_token_cost int;
  v_required_tokens int;
  v_total_available_tokens int;
  v_booking_id uuid;
  v_remaining_to_deduct int;
  v_credit record;
  v_use int;
begin
  if p_seat_count is null or p_seat_count <= 0 then
    raise exception 'INVALID_SEAT_COUNT';
  end if;

  select ri.route_id, ri.vehicle_id, ri.status, v.capacity
  into v_route_id, v_vehicle_id, v_ride_status, v_capacity
  from public.ride_instances ri
  join public.vehicles v on v.id = ri.vehicle_id
  where ri.id = p_ride_instance_id
  for update;

  if v_route_id is null then
    raise exception 'RIDE_INSTANCE_NOT_FOUND';
  end if;

  if v_ride_status not in ('scheduled', 'boarding') then
    raise exception 'RIDE_NOT_BOOKABLE';
  end if;

  update public.bookings
  set status = 'expired'
  where ride_instance_id = p_ride_instance_id
    and status = 'pending'
    and lock_expires_at <= now();

  select coalesce(sum(seat_count), 0)::int
  into v_reserved
  from public.bookings
  where ride_instance_id = p_ride_instance_id
    and (
      status in ('confirmed', 'booked')
      or (status = 'pending' and lock_expires_at > now())
    );

  if v_reserved + p_seat_count > v_capacity then
    raise exception 'NO_SEATS_AVAILABLE';
  end if;

  select base_token_cost
  into v_token_cost
  from public.routes
  where id = v_route_id;

  if v_token_cost is null then
    raise exception 'ROUTE_NOT_FOUND';
  end if;

  v_required_tokens := v_token_cost * p_seat_count;

  update public.token_credits
  set status = 'expired'
  where user_id = p_rider_id
    and status = 'active'
    and (expires_at <= now() or tokens <= 0);

  select coalesce(sum(tokens), 0)::int
  into v_total_available_tokens
  from public.token_credits
  where user_id = p_rider_id
    and status = 'active'
    and expires_at > now()
    and tokens > 0;

  if v_total_available_tokens < v_required_tokens then
    raise exception 'INSUFFICIENT_TOKENS';
  end if;

  insert into public.bookings (
    ride_instance_id,
    rider_id,
    status,
    seat_count,
    confirmed_at
  )
  values (
    p_ride_instance_id,
    p_rider_id,
    'booked',
    p_seat_count,
    now()
  )
  returning id into v_booking_id;

  v_remaining_to_deduct := v_required_tokens;

  for v_credit in
    select id, tokens
    from public.token_credits
    where user_id = p_rider_id
      and status = 'active'
      and expires_at > now()
      and tokens > 0
    order by expires_at asc, created_at asc
    for update
  loop
    exit when v_remaining_to_deduct <= 0;

    v_use := least(v_credit.tokens, v_remaining_to_deduct);

    update public.token_credits
    set tokens = tokens - v_use
    where id = v_credit.id;

    update public.token_credits
    set status = 'expired'
    where id = v_credit.id
      and tokens <= 0;

    insert into public.booking_token_deductions (booking_id, token_credit_id, tokens_deducted)
    values (v_booking_id, v_credit.id, v_use);

    v_remaining_to_deduct := v_remaining_to_deduct - v_use;
  end loop;

  update public.token_wallets
  set balance = coalesce((
      select sum(tokens)::int
      from public.token_credits
      where user_id = p_rider_id
        and status = 'active'
        and expires_at > now()
        and tokens > 0
    ), 0),
    updated_at = now()
  where user_id = p_rider_id;

  select coalesce(sum(seat_count), 0)::int
  into v_reserved
  from public.bookings
  where ride_instance_id = p_ride_instance_id
    and (
      status in ('confirmed', 'booked')
      or (status = 'pending' and lock_expires_at > now())
    );

  return query
  select
    b.id,
    b.ride_instance_id,
    b.rider_id,
    b.status,
    b.seat_count,
    v_required_tokens,
    coalesce((
      select sum(tokens)::int
      from public.token_credits tc
      where tc.user_id = p_rider_id
        and tc.status = 'active'
        and tc.expires_at > now()
        and tc.tokens > 0
    ), 0) as tokens_remaining,
    v_capacity,
    v_reserved,
    greatest(v_capacity - v_reserved, 0)::int as available_seats
  from public.bookings b
  where b.id = v_booking_id;
end;
$$;
