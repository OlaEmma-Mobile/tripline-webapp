create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  message text not null,
  is_read boolean not null default false,
  reference text,
  reason text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists idx_notifications_user_created_at
  on public.notifications(user_id, created_at desc);

create index if not exists idx_notifications_user_unread
  on public.notifications(user_id, is_read)
  where is_read = false;

create unique index if not exists uq_notifications_user_reference_reason
  on public.notifications(user_id, reference, reason)
  where reference is not null and reason is not null;
