  create sequence if not exists public.trip_id_seq start 1;

  create or replace function public.generate_trip_id()
  returns text
  language plpgsql
  as $$
  declare
    v_next bigint;
  begin
    v_next := nextval('public.trip_id_seq');
    return 'TP-' || lpad(v_next::text, 4, '0');
  end;
  $$;

  create table if not exists public.trips (
    id uuid primary key default gen_random_uuid(),
    trip_id text not null unique,
    ride_instance_id uuid not null references public.ride_instances(id) on delete cascade,
    assignment_id uuid unique references public.ride_instance_driver_assignments(id) on delete cascade,
    driver_id uuid not null references public.users(id) on delete cascade,
    vehicle_id uuid not null references public.vehicles(id) on delete restrict,
    driver_trip_id text not null unique,
    status text not null default 'scheduled' check (status in ('scheduled','boarding','departed','completed','cancelled')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create index if not exists idx_trips_ride_instance_status on public.trips(ride_instance_id, status);
  create index if not exists idx_trips_driver_status on public.trips(driver_id, status);
  create index if not exists idx_trips_vehicle_status on public.trips(vehicle_id, status);

  create or replace function public.set_trip_defaults()
  returns trigger
  language plpgsql
  as $$
  begin
    if new.trip_id is null or btrim(new.trip_id) = '' then
      new.trip_id := public.generate_trip_id();
    end if;
    if new.updated_at is null then
      new.updated_at := now();
    end if;
    return new;
  end;
  $$;

  drop trigger if exists trg_set_trip_defaults on public.trips;
  create trigger trg_set_trip_defaults
  before insert on public.trips
  for each row execute procedure public.set_trip_defaults();

  create or replace function public.touch_trip_updated_at()
  returns trigger
  language plpgsql
  as $$
  begin
    new.updated_at := now();
    return new;
  end;
  $$;

  drop trigger if exists trg_touch_trip_updated_at on public.trips;
  create trigger trg_touch_trip_updated_at
  before update on public.trips
  for each row execute procedure public.touch_trip_updated_at();

  create or replace function public.validate_trip_slot_conflict()
  returns trigger
  language plpgsql
  as $$
  declare
    v_ride_date date;
    v_time_slot text;
  begin
    if new.status in ('cancelled', 'completed') then
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
        and t.status not in ('cancelled', 'completed')
        and ri.ride_date = v_ride_date
        and ri.time_slot = v_time_slot
        and t.id <> coalesce(new.id, gen_random_uuid())
    ) then
      raise exception 'DRIVER_ALREADY_ASSIGNED_FOR_SLOT';
    end if;

    return new;
  end;
  $$;

  drop trigger if exists trg_validate_trip_slot_conflict on public.trips;
  create trigger trg_validate_trip_slot_conflict
  before insert or update on public.trips
  for each row execute procedure public.validate_trip_slot_conflict();

  insert into public.trips (ride_instance_id, assignment_id, driver_id, vehicle_id, driver_trip_id, status, created_at, updated_at)
  select
    rida.ride_instance_id,
    rida.id,
    rida.driver_id,
    coalesce(dva.vehicle_id, ri.vehicle_id) as vehicle_id,
    rida.driver_trip_id,
    case when ri.status in ('scheduled','boarding','departed','completed','cancelled') then ri.status else 'scheduled' end,
    coalesce(rida.assigned_at, now()),
    now()
  from public.ride_instance_driver_assignments rida
  join public.ride_instances ri on ri.id = rida.ride_instance_id
  left join public.driver_vehicle_assignments dva on dva.driver_id = rida.driver_id and dva.status = 'active'
  where coalesce(dva.vehicle_id, ri.vehicle_id) is not null
    and not exists (
      select 1
      from public.trips t
      where t.assignment_id = rida.id
    );

  alter table if exists public.bookings
    add column if not exists trip_id uuid references public.trips(id) on delete set null;

  create index if not exists idx_bookings_trip_id on public.bookings(trip_id);
  create index if not exists idx_bookings_trip_status_lock on public.bookings(trip_id, status, lock_expires_at);

  update public.bookings b
  set trip_id = trip_map.trip_id
  from (
    select
      t.ride_instance_id,
      (array_agg(t.id order by t.created_at asc, t.id asc))[1] as trip_id
    from public.trips t
    group by t.ride_instance_id
    having count(*) = 1
  ) as trip_map
  where b.trip_id is null
    and b.ride_instance_id = trip_map.ride_instance_id;

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
    ri.departure_time,
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
  group by t.id, ri.ride_id, ri.route_id, ri.ride_date, ri.departure_time, ri.time_slot, v.capacity;

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
    for update;

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
      ride_instance_id,
      trip_id,
      rider_id,
      pickup_point_id,
      token_cost,
      status,
      seat_count,
      confirmed_at
    )
    values (
      v_ride_instance_id,
      p_trip_id,
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
    for update;

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
      v_reserved := greatest(v_reserved - v_booking.seat_count, 0);
    end if;

    if v_reserved + p_seat_count > v_capacity then
      raise exception 'NO_SEATS_AVAILABLE';
    end if;

    v_lock_expires_at := now() + make_interval(mins => greatest(p_lock_minutes, 1));

    if v_booking.id is not null then
      update public.bookings
      set seat_count = p_seat_count,
          lock_expires_at = v_lock_expires_at
      where id = v_booking.id
      returning * into v_booking;
    else
      insert into public.bookings (ride_instance_id, trip_id, rider_id, status, seat_count, lock_expires_at)
      values (
        v_ride_instance_id,
        p_trip_id,
        p_rider_id,
        'pending',
        p_seat_count,
        v_lock_expires_at
      )
      returning * into v_booking;
    end if;

    v_reserved := v_reserved + p_seat_count;

    return query
    select
      v_booking.id,
      v_booking.trip_id,
      v_booking.ride_instance_id,
      v_booking.rider_id,
      v_booking.status,
      v_booking.seat_count,
      v_booking.lock_expires_at,
      v_capacity,
      v_reserved,
      greatest(v_capacity - v_reserved, 0)::int;
  end;
  $$;

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

    select ri.ride_date, ri.departure_time
    into v_ride_date, v_departure_time
    from public.ride_instances ri
    where ri.id = v_trip.ride_instance_id
    for update;

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
