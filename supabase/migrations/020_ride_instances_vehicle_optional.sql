alter table if exists public.ride_instances
  alter column vehicle_id drop not null;

drop view if exists public.ride_instance_availability;
create view public.ride_instance_availability as
select
  ri.id as ride_instance_id,
  ri.ride_id,
  ri.route_id,
  ri.vehicle_id,
  ri.driver_id,
  ri.ride_date,
  ri.departure_time,
  ri.time_slot,
  ri.status,
  coalesce(v.capacity, 0)::int as capacity,
  coalesce(
    sum(
      case
        when b.status = 'confirmed' then b.seat_count
        when b.status = 'booked' then b.seat_count
        when b.status = 'pending' and b.lock_expires_at > now() then b.seat_count
        else 0
      end
    ),
    0
  )::int as reserved_seats,
  greatest(
    coalesce(v.capacity, 0) - coalesce(
      sum(
        case
          when b.status = 'confirmed' then b.seat_count
          when b.status = 'booked' then b.seat_count
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
left join public.vehicles v on v.id = ri.vehicle_id
left join public.bookings b on b.ride_instance_id = ri.id
group by ri.id, v.capacity;

create or replace function public.create_booking_with_tokens(
  p_ride_instance_id uuid,
  p_rider_id uuid,
  p_pickup_point_id uuid,
  p_seat_count int default 1
)
returns table (
  booking_id uuid,
  ride_instance_id uuid,
  rider_id uuid,
  pickup_point_id uuid,
  token_cost int,
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

  select ri.route_id, ri.vehicle_id, ri.status, coalesce(v.capacity, 0)
  into v_route_id, v_vehicle_id, v_ride_status, v_capacity
  from public.ride_instances ri
  left join public.vehicles v on v.id = ri.vehicle_id
  where ri.id = p_ride_instance_id
  for update;

  if v_route_id is null then
    raise exception 'RIDE_INSTANCE_NOT_FOUND';
  end if;

  if v_vehicle_id is null or v_capacity <= 0 then
    raise exception 'RIDE_NOT_READY';
  end if;

  if v_ride_status not in ('scheduled', 'boarding') then
    raise exception 'RIDE_NOT_BOOKABLE';
  end if;

  if p_pickup_point_id is null then
    raise exception 'PICKUP_POINT_REQUIRED';
  end if;

  select pp.token_cost
  into v_token_cost
  from public.pickup_points pp
  where pp.id = p_pickup_point_id
    and pp.route_id = v_route_id;

  if v_token_cost is null then
    raise exception 'PICKUP_POINT_NOT_FOUND';
  end if;

  update public.bookings b
  set status = 'expired'
  where b.ride_instance_id = p_ride_instance_id
    and b.status = 'pending'
    and b.lock_expires_at <= now();

  select coalesce(sum(b.seat_count), 0)::int
  into v_reserved
  from public.bookings b
  where b.ride_instance_id = p_ride_instance_id
    and (
      b.status in ('confirmed', 'booked')
      or (b.status = 'pending' and b.lock_expires_at > now())
    );

  if v_reserved + p_seat_count > v_capacity then
    raise exception 'NO_SEATS_AVAILABLE';
  end if;

  v_required_tokens := v_token_cost * p_seat_count;

  update public.token_credits tc
  set status = 'expired'
  where tc.user_id = p_rider_id
    and tc.status = 'active'
    and (tc.expires_at <= now() or tc.tokens <= 0);

  select coalesce(sum(tc.tokens), 0)::int
  into v_total_available_tokens
  from public.token_credits tc
  where tc.user_id = p_rider_id
    and tc.status = 'active'
    and tc.expires_at > now()
    and tc.tokens > 0;

  if v_total_available_tokens < v_required_tokens then
    raise exception 'INSUFFICIENT_TOKENS';
  end if;

  insert into public.bookings (
    ride_instance_id,
    rider_id,
    pickup_point_id,
    token_cost,
    status,
    seat_count,
    confirmed_at
  )
  values (
    p_ride_instance_id,
    p_rider_id,
    p_pickup_point_id,
    v_token_cost,
    'booked',
    p_seat_count,
    now()
  )
  returning id into v_booking_id;

  v_remaining_to_deduct := v_required_tokens;

  for v_credit in
    select tc.id, tc.tokens
    from public.token_credits tc
    where tc.user_id = p_rider_id
      and tc.status = 'active'
      and tc.expires_at > now()
      and tc.tokens > 0
    order by tc.expires_at asc, tc.created_at asc
    for update
  loop
    exit when v_remaining_to_deduct <= 0;

    v_use := least(v_credit.tokens, v_remaining_to_deduct);

    update public.token_credits tc
    set tokens = tc.tokens - v_use
    where tc.id = v_credit.id;

    update public.token_credits tc
    set status = 'expired'
    where tc.id = v_credit.id
      and tc.tokens <= 0;

    insert into public.booking_token_deductions (booking_id, token_credit_id, tokens_deducted)
    values (v_booking_id, v_credit.id, v_use);

    v_remaining_to_deduct := v_remaining_to_deduct - v_use;
  end loop;

  update public.token_wallets tw
  set balance = coalesce((
      select sum(tc.tokens)::int
      from public.token_credits tc
      where tc.user_id = p_rider_id
        and tc.status = 'active'
        and tc.expires_at > now()
        and tc.tokens > 0
    ), 0),
    updated_at = now()
  where tw.user_id = p_rider_id;

  select coalesce(sum(b.seat_count), 0)::int
  into v_reserved
  from public.bookings b
  where b.ride_instance_id = p_ride_instance_id
    and (
      b.status in ('confirmed', 'booked')
      or (b.status = 'pending' and b.lock_expires_at > now())
    );

  return query
  select
    b.id as booking_id,
    b.ride_instance_id,
    b.rider_id,
    b.pickup_point_id,
    b.token_cost,
    b.status,
    b.seat_count,
    v_required_tokens,
    coalesce((
      select sum(tc.tokens)::int
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

create or replace function public.lock_seat(
  p_ride_instance_id uuid,
  p_rider_id uuid,
  p_seat_count int default 1,
  p_lock_minutes int default 5
)
returns table (
  booking_id uuid,
  ride_instance_id uuid,
  rider_id uuid,
  status text,
  seat_count int,
  lock_expires_at timestamptz,
  capacity int,
  reserved_seats int,
  available_seats int
)
language plpgsql
as $$
declare
  v_ride_exists boolean;
  v_vehicle_id uuid;
  v_capacity int;
  v_reserved int;
  v_existing_id uuid;
  v_existing_status text;
  v_existing_lock timestamptz;
begin
  if p_seat_count is null or p_seat_count <= 0 then
    raise exception 'INVALID_SEAT_COUNT';
  end if;

  select true, ri.vehicle_id, coalesce(v.capacity, 0)
  into v_ride_exists, v_vehicle_id, v_capacity
  from public.ride_instances ri
  left join public.vehicles v on v.id = ri.vehicle_id
  where ri.id = p_ride_instance_id
  for update;

  if coalesce(v_ride_exists, false) = false then
    raise exception 'RIDE_INSTANCE_NOT_FOUND';
  end if;

  if v_vehicle_id is null then
    raise exception 'RIDE_NOT_READY';
  end if;

  update public.bookings b
  set status = 'expired'
  where b.ride_instance_id = p_ride_instance_id
    and b.status = 'pending'
    and b.lock_expires_at <= now();

  select b.id, b.status, b.lock_expires_at
  into v_existing_id, v_existing_status, v_existing_lock
  from public.bookings b
  where b.ride_instance_id = p_ride_instance_id
    and b.rider_id = p_rider_id
    and b.status in ('pending', 'confirmed')
  for update;

  select coalesce(sum(b.seat_count), 0)::int
  into v_reserved
  from public.bookings b
  where b.ride_instance_id = p_ride_instance_id
    and (
      b.status = 'confirmed'
      or (b.status = 'pending' and b.lock_expires_at > now())
    )
    and (v_existing_id is null or b.id <> v_existing_id);

  if v_reserved + p_seat_count > v_capacity then
    raise exception 'NO_SEATS_AVAILABLE';
  end if;

  if v_existing_id is not null and v_existing_status = 'confirmed' then
    raise exception 'BOOKING_ALREADY_CONFIRMED';
  elsif v_existing_id is not null then
    update public.bookings b
    set seat_count = p_seat_count,
        lock_expires_at = now() + make_interval(mins => p_lock_minutes),
        status = 'pending'
    where b.id = v_existing_id;
  else
    insert into public.bookings (ride_instance_id, rider_id, status, seat_count, lock_expires_at)
    values (
      p_ride_instance_id,
      p_rider_id,
      'pending',
      p_seat_count,
      now() + make_interval(mins => p_lock_minutes)
    )
    returning id into v_existing_id;
  end if;

  return query
  with stats as (
    select
      v_capacity as capacity,
      coalesce(sum(
        case
          when b.status = 'confirmed' then b.seat_count
          when b.status = 'pending' and b.lock_expires_at > now() then b.seat_count
          else 0
        end
      ), 0)::int as reserved
    from public.bookings b
    where b.ride_instance_id = p_ride_instance_id
  )
  select
    b.id as booking_id,
    b.ride_instance_id,
    b.rider_id,
    b.status,
    b.seat_count,
    b.lock_expires_at,
    s.capacity,
    s.reserved,
    greatest(s.capacity - s.reserved, 0)::int as available
  from public.bookings b
  cross join stats s
  where b.id = v_existing_id;
end;
$$;
