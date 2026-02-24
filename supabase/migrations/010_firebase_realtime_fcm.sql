alter table if exists public.users
add column if not exists fcm_token text null;

create index if not exists idx_users_fcm_token_not_null
  on public.users(fcm_token)
  where fcm_token is not null;
