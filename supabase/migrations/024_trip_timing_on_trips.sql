alter table if exists public.trips
  add column if not exists departure_time time;

alter table if exists public.trips
  add column if not exists estimated_duration_minutes integer;

update public.trips t
set departure_time = coalesce(t.departure_time, ri.departure_time, time '06:30:00'),
    estimated_duration_minutes = coalesce(t.estimated_duration_minutes, 60)
from public.ride_instances ri
where ri.id = t.ride_instance_id;

alter table if exists public.trips
  alter column departure_time set not null;

alter table if exists public.trips
  alter column estimated_duration_minutes set not null;

alter table if exists public.trips
  alter column estimated_duration_minutes set default 60;

alter table if exists public.ride_instances
  alter column departure_time drop not null;

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

drop function if exists public.driver_mark_booking(uuid, uuid, text, integer);
create function public.driver_mark_booking(
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
  v_trip public.trips%rowtype;
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

  select t.*
  into v_trip
  from public.trips t
  where t.id = v_booking.trip_id
  for update;

  if v_trip.id is null then
    raise exception 'TRIP_NOT_FOUND';
  end if;

  if v_trip.driver_id <> p_driver_id then
    raise exception 'FORBIDDEN_DRIVER';
  end if;

  select ri.ride_date
  into v_ride_date
  from public.ride_instances ri
  where ri.id = v_trip.ride_instance_id
  for update;

  v_departure_time := v_trip.departure_time;

  if v_trip.status in ('completed', 'cancelled') then
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
      jsonb_build_object('booking_id', v_booking.id, 'driver_id', p_driver_id, 'trip_id', v_trip.id)
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
      jsonb_build_object('booking_id', v_booking.id, 'driver_id', p_driver_id, 'trip_id', v_trip.id)
    );
  end if;

  return v_booking;
end;
$$;
