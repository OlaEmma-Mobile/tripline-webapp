-- Users table
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null unique,
  phone text,
  role text not null check (role in ('rider','driver','admin','sub_admin')),
  password_hash text not null,
  email_verified_at timestamptz,
  status text not null default 'active' check (status in ('active','inactive','restricted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_email on public.users(email);

-- OTPs table
create table if not exists public.otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  code_hash text not null,
  purpose text not null check (purpose in ('verify_email','reset_password')),
  expires_at timestamptz not null,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_otps_user_purpose on public.otps(user_id, purpose);

-- Refresh tokens
create table if not exists public.refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_refresh_tokens_user on public.refresh_tokens(user_id);
create index if not exists idx_refresh_tokens_hash on public.refresh_tokens(token_hash);

-- Driver KYC
create table if not exists public.driver_kyc (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  license_number text not null,
  nin_bvn_nid text not null,
  status text not null default 'pending' check (status in ('pending','verified','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_driver_kyc_user on public.driver_kyc(user_id);
