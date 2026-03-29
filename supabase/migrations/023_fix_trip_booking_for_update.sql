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

  if v_trip_status not in ('scheduled', 'boarding') then
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
    trip_id,
    ride_instance_id,
    rider_id,
    pickup_point_id,
    token_cost,
    status,
    seat_count,
    confirmed_at
  )
  values (
    p_trip_id,
    v_ride_instance_id,
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
  where b.trip_id = p_trip_id
    and (
      b.status in ('confirmed', 'booked', 'boarded', 'no_show', 'completed')
      or (b.status = 'pending' and b.lock_expires_at > now())
    );

  return query
  select
    b.id as booking_id,
    b.trip_id,
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

drop function if exists public.lock_seat(uuid, uuid, integer, integer);
create function public.lock_seat(
  p_trip_id uuid,
  p_rider_id uuid,
  p_seat_count integer default 1,
  p_lock_minutes integer default 5
)
returns table (
  booking_id uuid,
  trip_id uuid,
  ride_instance_id uuid,
  rider_id uuid,
  seat_count integer,
  status text,
  lock_expires_at timestamptz,
  capacity integer,
  reserved_seats integer,
  available_seats integer
)
language plpgsql
as $$
declare
  v_ride_instance_id uuid;
  v_vehicle_id uuid;
  v_trip_status text;
  v_capacity int;
  v_reserved int;
  v_booking public.bookings%rowtype;
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

  if v_trip_status not in ('scheduled', 'boarding') then
    raise exception 'RIDE_NOT_BOOKABLE';
  end if;

  update public.bookings b
  set status = 'expired'
  where b.trip_id = p_trip_id
    and b.status = 'pending'
    and b.lock_expires_at <= now();

  select *
  into v_booking
  from public.bookings b
  where b.trip_id = p_trip_id
    and b.rider_id = p_rider_id
    and b.status = 'pending'
    and b.lock_expires_at > now()
  order by b.created_at desc
  limit 1
  for update;

  select coalesce(sum(b.seat_count), 0)::int
  into v_reserved
  from public.bookings b
  where b.trip_id = p_trip_id
    and (
      b.status in ('confirmed', 'booked', 'boarded', 'no_show', 'completed')
      or (b.status = 'pending' and b.lock_expires_at > now())
    );

  if v_booking.id is not null then
    v_reserved := greatest(v_reserved - coalesce(v_booking.seat_count, 0), 0);
  end if;

  if v_reserved + p_seat_count > v_capacity then
    raise exception 'NO_SEATS_AVAILABLE';
  end if;

  v_lock_expires_at := now() + make_interval(mins => greatest(coalesce(p_lock_minutes, 5), 1));

  if v_booking.id is null then
    insert into public.bookings (
      trip_id,
      ride_instance_id,
      rider_id,
      status,
      seat_count,
      lock_expires_at
    )
    values (
      p_trip_id,
      v_ride_instance_id,
      p_rider_id,
      'pending',
      p_seat_count,
      v_lock_expires_at
    )
    returning * into v_booking;
  else
    update public.bookings b
    set seat_count = p_seat_count,
        lock_expires_at = v_lock_expires_at,
        status = 'pending'
    where b.id = v_booking.id
    returning * into v_booking;
  end if;

  select coalesce(sum(b.seat_count), 0)::int
  into v_reserved
  from public.bookings b
  where b.trip_id = p_trip_id
    and (
      b.status in ('confirmed', 'booked', 'boarded', 'no_show', 'completed')
      or (b.status = 'pending' and b.lock_expires_at > now())
    );

  return query
  select
    v_booking.id as booking_id,
    v_booking.trip_id,
    v_booking.ride_instance_id,
    v_booking.rider_id,
    v_booking.seat_count,
    v_booking.status,
    v_booking.lock_expires_at,
    v_capacity,
    v_reserved,
    greatest(v_capacity - v_reserved, 0)::int as available_seats;
end;
$$;
