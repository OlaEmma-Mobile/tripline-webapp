create sequence if not exists public.driver_trip_id_seq start 1;

alter table if exists public.ride_instance_driver_assignments
  add column if not exists driver_trip_id text;

create or replace function public.generate_driver_trip_id()
returns text
language plpgsql
as $$
declare
  v_next bigint;
begin
  v_next := nextval('public.driver_trip_id_seq');
  return 'DT-' || lpad(v_next::text, 4, '0');
end;
$$;

create or replace function public.set_driver_trip_id()
returns trigger
language plpgsql
as $$
begin
  if new.driver_trip_id is null or btrim(new.driver_trip_id) = '' then
    new.driver_trip_id := public.generate_driver_trip_id();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_driver_trip_id on public.ride_instance_driver_assignments;
create trigger trg_set_driver_trip_id
before insert on public.ride_instance_driver_assignments
for each row execute procedure public.set_driver_trip_id();

update public.ride_instance_driver_assignments
set driver_trip_id = public.generate_driver_trip_id()
where driver_trip_id is null or btrim(driver_trip_id) = '';

alter table if exists public.ride_instance_driver_assignments
  alter column driver_trip_id set not null;

create unique index if not exists uq_ride_instance_driver_assignments_driver_trip_id
  on public.ride_instance_driver_assignments(driver_trip_id);
