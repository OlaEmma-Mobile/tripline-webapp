alter table if exists public.users
add column if not exists fcm_token_platform text null;

alter table if exists public.users
add column if not exists fcm_token_updated_at timestamptz null;

create index if not exists idx_users_fcm_token_updated_at
  on public.users(fcm_token_updated_at);
