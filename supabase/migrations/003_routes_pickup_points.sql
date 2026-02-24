create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_id uuid,
  from_name text not null,
  from_latitude double precision not null,
  from_longitude double precision not null,
  to_name text not null,
  to_latitude double precision not null,
  to_longitude double precision not null,
  base_token_cost int not null check (base_token_cost >= 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, company_id)
);

create index if not exists idx_routes_status on public.routes(status);
create index if not exists idx_routes_company_id on public.routes(company_id);
create index if not exists idx_routes_name on public.routes(name);
create index if not exists idx_routes_from_name on public.routes(from_name);
create index if not exists idx_routes_to_name on public.routes(to_name);

create table if not exists public.pickup_points (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  order_index int not null check (order_index > 0),
  token_cost int not null check (token_cost >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (route_id, order_index),
  unique (route_id, name)
);

create index if not exists idx_pickup_points_route_id on public.pickup_points(route_id);
create index if not exists idx_pickup_points_route_order on public.pickup_points(route_id, order_index);
create index if not exists idx_pickup_points_name on public.pickup_points(name);
