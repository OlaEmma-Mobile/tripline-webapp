-- Fix ambiguous column references in lock_seat
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

  select ri.vehicle_id, v.capacity
  into v_vehicle_id, v_capacity
  from public.ride_instances ri
  join public.vehicles v on v.id = ri.vehicle_id
  where ri.id = p_ride_instance_id
  for update;

  if v_vehicle_id is null then
    raise exception 'RIDE_INSTANCE_NOT_FOUND';
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
