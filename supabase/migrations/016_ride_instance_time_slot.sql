-- Add ride_id and time_slot to ride_instances
alter table if exists public.ride_instances
  add column if not exists ride_id text,
  add column if not exists time_slot text;

-- Sequence for ride_id
create sequence if not exists public.ride_id_seq start 1;

-- Ensure ride_id format TL-0000
create or replace function public.generate_ride_id()
returns text
language plpgsql
as $$
declare
  v_next int;
begin
  select nextval('public.ride_id_seq') into v_next;
  return 'TL-' || lpad(v_next::text, 4, '0');
end;
$$;

-- Trigger to populate ride_id and default time_slot
create or replace function public.set_ride_id_and_time_slot()
returns trigger
language plpgsql
as $$
begin
  if new.ride_id is null then
    new.ride_id := public.generate_ride_id();
  end if;
  if new.time_slot is null then
    new.time_slot := 'morning';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ride_instances_ride_id on public.ride_instances;
create trigger trg_ride_instances_ride_id
before insert on public.ride_instances
for each row execute procedure public.set_ride_id_and_time_slot();

-- Constraints
create unique index if not exists uq_ride_instances_ride_id on public.ride_instances(ride_id);

create unique index if not exists uq_ride_instances_driver_date_slot
  on public.ride_instances(driver_id, ride_date, time_slot)
  where driver_id is not null;

alter table if exists public.ride_instances
  drop constraint if exists ride_instances_time_slot_check;

alter table if exists public.ride_instances
  add constraint ride_instances_time_slot_check
  check (time_slot in ('morning','afternoon','evening'));

-- Backfill time_slot for existing rows
update public.ride_instances
set time_slot = 'morning'
where time_slot is null;

-- Backfill ride_id for existing rows
update public.ride_instances
set ride_id = public.generate_ride_id()
where ride_id is null;

-- Update availability view to include ride_id and time_slot
-- Drop first to avoid column rename conflicts on existing view definition.
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
