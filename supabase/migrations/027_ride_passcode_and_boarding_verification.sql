alter table if exists public.users
  add column if not exists ride_passcode_hash text,
  add column if not exists ride_passcode_set_at timestamptz,
  add column if not exists ride_passcode_updated_at timestamptz;

alter table if exists public.bookings
  add column if not exists boarding_status text not null default 'none'
    check (boarding_status in ('none', 'requested', 'approved', 'declined', 'expired', 'passcode_verified')),
  add column if not exists boarding_requested_at timestamptz,
  add column if not exists boarding_expires_at timestamptz,
  add column if not exists boarding_requested_by_driver_id uuid references public.users(id) on delete set null,
  add column if not exists boarding_approved_at timestamptz,
  add column if not exists boarding_declined_at timestamptz,
  add column if not exists boarding_decline_reason text,
  add column if not exists boarding_verified_at timestamptz,
  add column if not exists boarding_verification_method text
    check (boarding_verification_method in ('rider_approved', 'driver_verified_passcode'));

create index if not exists idx_bookings_boarding_status on public.bookings(boarding_status, boarding_expires_at);
create index if not exists idx_bookings_boarding_driver on public.bookings(boarding_requested_by_driver_id);

update public.bookings
set boarding_status = case
  when status = 'boarded' then 'approved'
  else coalesce(boarding_status, 'none')
end,
boarding_approved_at = case
  when status = 'boarded' and boarding_approved_at is null then coalesce(boarded_at, now())
  else boarding_approved_at
end,
boarding_verified_at = case
  when status = 'boarded' and boarding_verified_at is null then coalesce(boarded_at, now())
  else boarding_verified_at
end,
boarding_verification_method = case
  when status = 'boarded' and boarding_verification_method is null then 'driver_verified_passcode'
  else boarding_verification_method
end
where status = 'boarded';
