alter table if exists public.trips
  alter column driver_id drop not null;

alter table if exists public.trips
  alter column driver_trip_id drop not null;

alter table if exists public.trips
  drop constraint if exists trips_status_check;

alter table if exists public.trips
  add constraint trips_status_check
  check (status in ('scheduled', 'awaiting_driver', 'ongoing', 'completed', 'cancelled'));

update public.trips
set status = 'awaiting_driver'
where status = 'scheduled'
  and driver_id is null;

create or replace function public.validate_trip_slot_conflict()
returns trigger
language plpgsql
as $$
declare
  v_ride_date date;
  v_time_slot text;
begin
  if new.driver_id is null or new.status in ('awaiting_driver', 'cancelled', 'completed') then
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
    from public.trips t
    join public.ride_instances ri on ri.id = t.ride_instance_id
    where t.driver_id = new.driver_id
      and t.status not in ('awaiting_driver', 'cancelled', 'completed')
      and ri.ride_date = v_ride_date
      and ri.time_slot = v_time_slot
      and t.id <> coalesce(new.id, gen_random_uuid())
  ) then
    raise exception 'DRIVER_ALREADY_ASSIGNED_FOR_SLOT';
  end if;

  return new;
end;
$$;

drop view if exists public.trip_availability;
create view public.trip_availability as
select
  t.id as id,
  t.trip_id,
  t.driver_trip_id,
  t.ride_instance_id,
  ri.ride_id,
  ri.route_id,
  t.driver_id,
  t.vehicle_id,
  ri.ride_date,
  t.departure_time,
  t.estimated_duration_minutes,
  ri.time_slot,
  t.status,
  coalesce(v.capacity, 0)::int as capacity,
  coalesce(
    sum(
      case
        when b.status in ('confirmed', 'booked', 'boarded', 'no_show', 'completed') then b.seat_count
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
          when b.status in ('confirmed', 'booked', 'boarded', 'no_show', 'completed') then b.seat_count
          when b.status = 'pending' and b.lock_expires_at > now() then b.seat_count
          else 0
        end
      ),
      0
    ),
    0
  )::int as available_seats,
  t.created_at,
  t.updated_at
from public.trips t
join public.ride_instances ri on ri.id = t.ride_instance_id
left join public.vehicles v on v.id = t.vehicle_id
left join public.bookings b on b.trip_id = t.id
group by t.id, ri.ride_id, ri.route_id, ri.ride_date, t.departure_time, t.estimated_duration_minutes, ri.time_slot, v.capacity;

drop function if exists public.create_booking_with_tokens(uuid, uuid, uuid, integer);
create function public.create_booking_with_tokens(
  p_trip_id uuid,
  p_rider_id uuid,
  p_pickup_point_id uuid,
  p_seat_count int default 1
)
returns table (
  booking_id uuid,
  trip_id uuid,
  ride_instance_id uuid,
  rider_id uuid,
  pickup_point_id uuid,
  pickup_point_latitude double precision,
  pickup_point_longitude double precision,
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
  v_ride_instance_id uuid;
  v_route_id uuid;
  v_vehicle_id uuid;
  v_trip_status text;
  v_capacity int;
  v_reserved int;
  v_token_cost int;
  v_required_tokens int;
  v_total_available_tokens int;
  v_booking_id uuid;
  v_remaining_to_deduct int;
  v_credit record;
  v_use int;
  v_pickup_point_latitude double precision;
  v_pickup_point_longitude double precision;
begin
  if p_seat_count is null or p_seat_count <= 0 then
    raise exception 'INVALID_SEAT_COUNT';
  end if;

  select t.ride_instance_id, ri.route_id, t.vehicle_id, t.status, coalesce(v.capacity, 0)
  into v_ride_instance_id, v_route_id, v_vehicle_id, v_trip_status, v_capacity
  from public.trips t
  join public.ride_instances ri on ri.id = t.ride_instance_id
  left join public.vehicles v on v.id = t.vehicle_id
  where t.id = p_trip_id
  for update of t;

  if v_ride_instance_id is null then
    raise exception 'TRIP_NOT_FOUND';
  end if;

  if v_vehicle_id is null or v_capacity <= 0 then
    raise exception 'TRIP_NOT_READY';
  end if;

  if v_trip_status not in ('scheduled', 'awaiting_driver') then
    raise exception 'RIDE_NOT_BOOKABLE';
  end if;

  if p_pickup_point_id is null then
    raise exception 'PICKUP_POINT_REQUIRED';
  end if;

  select pp.token_cost, pp.latitude, pp.longitude
  into v_token_cost, v_pickup_point_latitude, v_pickup_point_longitude
  from public.pickup_points pp
  where pp.id = p_pickup_point_id
    and pp.route_id = v_route_id;

  if v_token_cost is null then
    raise exception 'PICKUP_POINT_NOT_FOUND';
  end if;

  update public.bookings b
  set status = 'expired'
  where b.trip_id = p_trip_id
    and b.status = 'pending'
    and b.lock_expires_at <= now();

  select coalesce(sum(b.seat_count), 0)::int
  into v_reserved
  from public.bookings b
  where b.trip_id = p_trip_id
    and (
      b.status in ('confirmed', 'booked', 'boarded', 'no_show', 'completed')
      or (b.status = 'pending' and b.lock_expires_at > now())
    );

  if v_reserved + p_seat_count > v_capacity then
    raise exception 'NO_SEATS_AVAILABLE';
  end if;

  v_required_tokens := v_token_cost * p_seat_count;

  select coalesce(sum(balance), 0)::int
  into v_total_available_tokens
  from public.token_wallet_credits
  where user_id = p_rider_id
    and balance > 0;

  if v_total_available_tokens < v_required_tokens then
    raise exception 'INSUFFICIENT_TOKENS';
  end if;

  insert into public.bookings (
    trip_id,
    ride_instance_id,
    rider_id,
    pickup_point_id,
    pickup_point_latitude,
    pickup_point_longitude,
    token_cost,
    status,
    seat_count,
    confirmed_at,
    created_at,
    updated_at
  )
  values (
    p_trip_id,
    v_ride_instance_id,
    p_rider_id,
    p_pickup_point_id,
    v_pickup_point_latitude,
    v_pickup_point_longitude,
    v_required_tokens,
    'booked',
    p_seat_count,
    now(),
    now(),
    now()
  )
  returning id into v_booking_id;

  v_remaining_to_deduct := v_required_tokens;

  for v_credit in
    select id, balance
    from public.token_wallet_credits
    where user_id = p_rider_id
      and balance > 0
    order by created_at asc
    for update
  loop
    exit when v_remaining_to_deduct <= 0;

    v_use := least(v_credit.balance, v_remaining_to_deduct);

    update public.token_wallet_credits
    set balance = balance - v_use,
        updated_at = now()
    where id = v_credit.id;

    insert into public.tokens_ledger(user_id, amount, type, reference, reason, metadata)
    values (
      p_rider_id,
      -v_use,
      'debit',
      v_booking_id::text,
      'BOOKING_CREATED',
      jsonb_build_object('booking_id', v_booking_id, 'trip_id', p_trip_id, 'wallet_credit_id', v_credit.id)
    );

    v_remaining_to_deduct := v_remaining_to_deduct - v_use;
  end loop;

  if v_remaining_to_deduct <> 0 then
    raise exception 'INSUFFICIENT_TOKENS';
  end if;

  return query
  select
    v_booking_id,
    p_trip_id,
    v_ride_instance_id,
    p_rider_id,
    p_pickup_point_id,
    v_pickup_point_latitude,
    v_pickup_point_longitude,
    v_required_tokens,
    'booked'::text,
    p_seat_count,
    v_required_tokens,
    greatest(v_total_available_tokens - v_required_tokens, 0),
    v_capacity,
    v_reserved + p_seat_count,
    greatest(v_capacity - (v_reserved + p_seat_count), 0);
end;
$$;

drop function if exists public.lock_seat(uuid, uuid, integer, integer);
create function public.lock_seat(
  p_trip_id uuid,
  p_rider_id uuid,
  p_seat_count int default 1,
  p_lock_minutes int default 5
)
returns table (
  booking_id uuid,
  trip_id uuid,
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
  v_ride_instance_id uuid;
  v_vehicle_id uuid;
  v_trip_status text;
  v_capacity int;
  v_reserved int;
  v_booking_id uuid;
  v_lock_expires_at timestamptz;
begin
  if p_seat_count is null or p_seat_count <= 0 then
    raise exception 'INVALID_SEAT_COUNT';
  end if;

  select t.ride_instance_id, t.vehicle_id, t.status, coalesce(v.capacity, 0)
  into v_ride_instance_id, v_vehicle_id, v_trip_status, v_capacity
  from public.trips t
  left join public.vehicles v on v.id = t.vehicle_id
  where t.id = p_trip_id
  for update of t;

  if v_ride_instance_id is null then
    raise exception 'TRIP_NOT_FOUND';
  end if;

  if v_vehicle_id is null or v_capacity <= 0 then
    raise exception 'TRIP_NOT_READY';
  end if;

  if v_trip_status not in ('scheduled', 'awaiting_driver') then
    raise exception 'RIDE_NOT_BOOKABLE';
  end if;

  update public.bookings b
  set status = 'expired'
  where b.trip_id = p_trip_id
    and b.status = 'pending'
    and b.lock_expires_at <= now();

  select coalesce(sum(b.seat_count), 0)::int
  into v_reserved
  from public.bookings b
  where b.trip_id = p_trip_id
    and (
      b.status in ('confirmed', 'booked', 'boarded', 'no_show', 'completed')
      or (b.status = 'pending' and b.lock_expires_at > now())
    );

  if v_reserved + p_seat_count > v_capacity then
    raise exception 'NO_SEATS_AVAILABLE';
  end if;

  v_lock_expires_at := now() + make_interval(mins => greatest(p_lock_minutes, 1));

  insert into public.bookings (
    trip_id,
    ride_instance_id,
    rider_id,
    status,
    seat_count,
    lock_expires_at,
    created_at,
    updated_at
  )
  values (
    p_trip_id,
    v_ride_instance_id,
    p_rider_id,
    'pending',
    p_seat_count,
    v_lock_expires_at,
    now(),
    now()
  )
  returning id into v_booking_id;

  return query
  select
    v_booking_id,
    p_trip_id,
    v_ride_instance_id,
    p_rider_id,
    'pending'::text,
    p_seat_count,
    v_lock_expires_at,
    v_capacity,
    v_reserved + p_seat_count,
    greatest(v_capacity - (v_reserved + p_seat_count), 0);
end;
$$;
