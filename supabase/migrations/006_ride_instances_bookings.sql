create table if not exists public.ride_instances (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete restrict,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  driver_id uuid references public.users(id) on delete set null,
  ride_date date not null,
  departure_time time not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'boarding', 'departed', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (route_id, vehicle_id, ride_date, departure_time)
);

create index if not exists idx_ride_instances_date_route_status
  on public.ride_instances(ride_date, route_id, status);
create index if not exists idx_ride_instances_vehicle_date
  on public.ride_instances(vehicle_id, ride_date);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  ride_instance_id uuid not null references public.ride_instances(id) on delete cascade,
  rider_id uuid not null references public.users(id) on delete restrict,
  status text not null check (status in ('pending', 'confirmed', 'cancelled', 'expired')),
  seat_count int not null default 1 check (seat_count > 0),
  seat_number int,
  lock_expires_at timestamptz,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_bookings_active_rider_per_ride
  on public.bookings(ride_instance_id, rider_id)
  where status in ('pending', 'confirmed');

create index if not exists idx_bookings_ride_status_lock
  on public.bookings(ride_instance_id, status, lock_expires_at);
create index if not exists idx_bookings_rider_status
  on public.bookings(rider_id, status);

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
        when b.status = 'confirmed' then b.seat_count
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
          when b.status = 'confirmed' then b.seat_count
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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ride_instances_updated_at on public.ride_instances;
create trigger trg_ride_instances_updated_at
before update on public.ride_instances
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_bookings_updated_at on public.bookings;
create trigger trg_bookings_updated_at
before update on public.bookings
for each row execute procedure public.set_updated_at();

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

  update public.bookings
  set status = 'expired'
  where ride_instance_id = p_ride_instance_id
    and status = 'pending'
    and lock_expires_at <= now();

  select id, status, lock_expires_at
  into v_existing_id, v_existing_status, v_existing_lock
  from public.bookings
  where ride_instance_id = p_ride_instance_id
    and rider_id = p_rider_id
    and status in ('pending', 'confirmed')
  for update;

  select coalesce(sum(seat_count), 0)::int
  into v_reserved
  from public.bookings
  where ride_instance_id = p_ride_instance_id
    and (
      status = 'confirmed'
      or (status = 'pending' and lock_expires_at > now())
    )
    and (v_existing_id is null or id <> v_existing_id);

  if v_reserved + p_seat_count > v_capacity then
    raise exception 'NO_SEATS_AVAILABLE';
  end if;

  if v_existing_id is not null and v_existing_status = 'confirmed' then
    raise exception 'BOOKING_ALREADY_CONFIRMED';
  elsif v_existing_id is not null then
    update public.bookings
    set seat_count = p_seat_count,
        lock_expires_at = now() + make_interval(mins => p_lock_minutes),
        status = 'pending'
    where id = v_existing_id;
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
    b.id,
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

create or replace function public.confirm_booking(
  p_booking_id uuid,
  p_rider_id uuid
)
returns public.bookings
language plpgsql
as $$
declare
  v_booking public.bookings%rowtype;
begin
  select *
  into v_booking
  from public.bookings
  where id = p_booking_id
    and rider_id = p_rider_id
  for update;

  if v_booking.id is null then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  if v_booking.status = 'pending' and v_booking.lock_expires_at <= now() then
    update public.bookings
    set status = 'expired'
    where id = p_booking_id;
    raise exception 'LOCK_EXPIRED';
  end if;

  if v_booking.status = 'confirmed' then
    return v_booking;
  end if;

  if v_booking.status <> 'pending' then
    raise exception 'BOOKING_NOT_CONFIRMABLE';
  end if;

  update public.bookings
  set status = 'confirmed',
      confirmed_at = now(),
      lock_expires_at = null
  where id = p_booking_id
  returning * into v_booking;

  return v_booking;
end;
$$;

create or replace function public.cancel_booking(
  p_booking_id uuid,
  p_actor_user_id uuid
)
returns public.bookings
language plpgsql
as $$
declare
  v_booking public.bookings%rowtype;
begin
  select *
  into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if v_booking.id is null then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  if v_booking.rider_id <> p_actor_user_id then
    raise exception 'FORBIDDEN_CANCEL';
  end if;

  if v_booking.status in ('cancelled', 'expired') then
    return v_booking;
  end if;

  update public.bookings
  set status = 'cancelled',
      cancelled_at = now(),
      lock_expires_at = null
  where id = p_booking_id
  returning * into v_booking;

  return v_booking;
end;
$$;
