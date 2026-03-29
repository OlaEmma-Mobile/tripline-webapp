create table if not exists public.bulk_booking_rules (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.users(id) on delete cascade,
  route_id uuid not null references public.routes(id) on delete cascade,
  pickup_point_id uuid not null references public.pickup_points(id) on delete restrict,
  time_slots text[] not null,
  duration_type text not null check (duration_type in ('1_week', '2_weeks', '3_weeks', '1_month')),
  day_mode text not null check (day_mode in ('custom_days', 'working_days')),
  weekdays text[] not null,
  start_date date not null,
  end_date date not null,
  seat_count integer not null default 1 check (seat_count > 0),
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled', 'completed')),
  last_processed_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (array_length(time_slots, 1) >= 1),
  check (array_length(weekdays, 1) >= 1)
);

create index if not exists idx_bulk_booking_rules_rider_status
  on public.bulk_booking_rules(rider_id, status, start_date, end_date);

create table if not exists public.bulk_booking_occurrences (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.bulk_booking_rules(id) on delete cascade,
  rider_id uuid not null references public.users(id) on delete cascade,
  route_id uuid not null references public.routes(id) on delete cascade,
  pickup_point_id uuid not null references public.pickup_points(id) on delete restrict,
  service_date date not null,
  time_slot text not null check (time_slot in ('morning', 'afternoon', 'evening')),
  seat_count integer not null default 1 check (seat_count > 0),
  trip_id uuid references public.trips(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  status text not null default 'pending_trip' check (status in ('pending_trip', 'pending_booking', 'booked', 'failed', 'cancelled', 'skipped')),
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rule_id, service_date, time_slot)
);

create index if not exists idx_bulk_booking_occurrences_status_date
  on public.bulk_booking_occurrences(status, service_date, time_slot);

alter table if exists public.bookings
  add column if not exists bulk_booking_occurrence_id uuid references public.bulk_booking_occurrences(id) on delete set null;

create unique index if not exists uq_bookings_bulk_booking_occurrence_id
  on public.bookings(bulk_booking_occurrence_id)
  where bulk_booking_occurrence_id is not null;
