create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  channel text not null check (channel in ('rtdb', 'fcm')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempt_count int not null default 0,
  last_error text,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique(notification_id, channel)
);

create index if not exists idx_notification_deliveries_notification
  on public.notification_deliveries(notification_id);

create index if not exists idx_notification_deliveries_status
  on public.notification_deliveries(status);

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  channel text not null check (channel in ('rtdb', 'fcm')),
  run_after timestamptz not null default now(),
  attempt_count int not null default 0,
  status text not null default 'queued' check (status in ('queued', 'processing', 'failed', 'completed')),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notification_outbox_status_run_after
  on public.notification_outbox(status, run_after);

create index if not exists idx_notification_outbox_notification_channel
  on public.notification_outbox(notification_id, channel);

create unique index if not exists uq_notification_outbox_active
  on public.notification_outbox(notification_id, channel)
  where status in ('queued', 'processing');

drop trigger if exists trg_notification_outbox_updated_at on public.notification_outbox;
create trigger trg_notification_outbox_updated_at
before update on public.notification_outbox
for each row execute procedure public.set_updated_at();
