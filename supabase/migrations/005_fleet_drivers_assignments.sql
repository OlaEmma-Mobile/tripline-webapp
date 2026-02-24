create table if not exists public.vehicle_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  contact_name text,
  contact_email text,
  contact_phone text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vehicle_providers_status on public.vehicle_providers(status);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references public.vehicle_providers(id) on delete set null,
  registration_number text not null unique,
  model text,
  capacity int not null check (capacity > 0),
  status text not null default 'active' check (status in ('active', 'inactive', 'maintenance')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vehicles_provider_id on public.vehicles(provider_id);
create index if not exists idx_vehicles_status on public.vehicles(status);

create table if not exists public.driver_vehicle_assignments (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'ended')),
  assigned_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_driver_vehicle_assignments_driver_status on public.driver_vehicle_assignments(driver_id, status);
create index if not exists idx_driver_vehicle_assignments_vehicle_status on public.driver_vehicle_assignments(vehicle_id, status);
create unique index if not exists uq_driver_vehicle_active_driver on public.driver_vehicle_assignments(driver_id) where status = 'active';
create unique index if not exists uq_driver_vehicle_active_vehicle on public.driver_vehicle_assignments(vehicle_id) where status = 'active';

create table if not exists public.driver_route_assignments (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.users(id) on delete cascade,
  route_id uuid not null references public.routes(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'ended')),
  assigned_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_driver_route_assignments_driver_status on public.driver_route_assignments(driver_id, status);
create index if not exists idx_driver_route_assignments_route_status on public.driver_route_assignments(route_id, status);
create unique index if not exists uq_driver_route_active_driver on public.driver_route_assignments(driver_id) where status = 'active';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_vehicle_providers_updated_at on public.vehicle_providers;
create trigger trg_vehicle_providers_updated_at
before update on public.vehicle_providers
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_vehicles_updated_at on public.vehicles;
create trigger trg_vehicles_updated_at
before update on public.vehicles
for each row execute procedure public.set_updated_at();
