-- Token wallets
create table if not exists public.token_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  balance int not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_token_wallets_user on public.token_wallets(user_id);

-- Token purchases
create table if not exists public.token_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  reference text not null unique,
  amount_ngn int not null,
  tokens int not null,
  status text not null default 'pending' check (status in ('pending','success','failed')),
  provider text not null default 'paystack',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_token_purchases_reference on public.token_purchases(reference);
create index if not exists idx_token_purchases_user on public.token_purchases(user_id);

-- Token credits
create table if not exists public.token_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  purchase_id uuid not null references public.token_purchases(id) on delete cascade,
  tokens int not null,
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active','expired')),
  created_at timestamptz not null default now()
);

create index if not exists idx_token_credits_user on public.token_credits(user_id);
create index if not exists idx_token_credits_expiry on public.token_credits(user_id, expires_at);
