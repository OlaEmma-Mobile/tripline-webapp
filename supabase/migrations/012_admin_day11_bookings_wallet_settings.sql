-- Booking operational fields
alter table if exists public.bookings
add column if not exists pickup_point_id uuid references public.pickup_points(id) on delete set null;

alter table if exists public.bookings
add column if not exists token_cost int not null default 0;

alter table if exists public.bookings
add column if not exists problem_flag boolean not null default false;

alter table if exists public.bookings
add column if not exists problem_note text;

alter table if exists public.bookings
add column if not exists refunded_tokens int not null default 0;

alter table if exists public.bookings
add column if not exists refunded_at timestamptz;

alter table if exists public.bookings
add column if not exists refunded_by uuid references public.users(id) on delete set null;

create index if not exists idx_bookings_pickup_point_id on public.bookings(pickup_point_id);
create index if not exists idx_bookings_status_created_at on public.bookings(status, created_at);

-- Wallet ledger for admin/manual adjustments
create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  amount int not null,
  balance_after int not null,
  type text not null check (type in ('CREDIT', 'DEBIT')),
  reason text not null,
  reference text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_wallet_ledger_user_created_at
  on public.wallet_ledger(user_id, created_at desc);

-- Admin app settings
create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  booking_window_days_ahead int not null default 7,
  cancellation_window_minutes int not null default 60,
  token_expiry_days int not null default 60,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null
);

insert into public.app_settings (booking_window_days_ahead, cancellation_window_minutes, token_expiry_days)
select 7, 60, 60
where not exists (select 1 from public.app_settings);

-- Replace booking creation RPC to persist pickup_point_id + token_cost.
create or replace function public.create_booking_with_tokens(
  p_ride_instance_id uuid,
  p_rider_id uuid,
  p_pickup_point_id uuid,
  p_seat_count int default 1
)
returns table (
  booking_id uuid,
  ride_instance_id uuid,
  rider_id uuid,
  pickup_point_id uuid,
  token_cost int,
  status text,
  seat_count int,
  tokens_deducted int,
  tokens_remaining int,
  capacity int,
  reserved_seats int,
  available_seats int
)
language plpgsql
as $$
declare
  v_route_id uuid;
  v_vehicle_id uuid;
  v_ride_status text;
  v_capacity int;
  v_reserved int;
  v_token_cost int;
  v_required_tokens int;
  v_total_available_tokens int;
  v_booking_id uuid;
  v_remaining_to_deduct int;
  v_credit record;
  v_use int;
begin
  if p_seat_count is null or p_seat_count <= 0 then
    raise exception 'INVALID_SEAT_COUNT';
  end if;

  select ri.route_id, ri.vehicle_id, ri.status, v.capacity
  into v_route_id, v_vehicle_id, v_ride_status, v_capacity
  from public.ride_instances ri
  join public.vehicles v on v.id = ri.vehicle_id
  where ri.id = p_ride_instance_id
  for update;

  if v_route_id is null then
    raise exception 'RIDE_INSTANCE_NOT_FOUND';
  end if;

  if v_ride_status not in ('scheduled', 'boarding') then
    raise exception 'RIDE_NOT_BOOKABLE';
  end if;

  if p_pickup_point_id is null then
    raise exception 'PICKUP_POINT_REQUIRED';
  end if;

  select pp.token_cost
  into v_token_cost
  from public.pickup_points pp
  where pp.id = p_pickup_point_id
    and pp.route_id = v_route_id;

  if v_token_cost is null then
    raise exception 'PICKUP_POINT_NOT_FOUND';
  end if;

  update public.bookings
  set status = 'expired'
  where ride_instance_id = p_ride_instance_id
    and status = 'pending'
    and lock_expires_at <= now();

  select coalesce(sum(seat_count), 0)::int
  into v_reserved
  from public.bookings
  where ride_instance_id = p_ride_instance_id
    and (
      status in ('confirmed', 'booked')
      or (status = 'pending' and lock_expires_at > now())
    );

  if v_reserved + p_seat_count > v_capacity then
    raise exception 'NO_SEATS_AVAILABLE';
  end if;

  v_required_tokens := v_token_cost * p_seat_count;

  update public.token_credits
  set status = 'expired'
  where user_id = p_rider_id
    and status = 'active'
    and (expires_at <= now() or tokens <= 0);

  select coalesce(sum(tokens), 0)::int
  into v_total_available_tokens
  from public.token_credits
  where user_id = p_rider_id
    and status = 'active'
    and expires_at > now()
    and tokens > 0;

  if v_total_available_tokens < v_required_tokens then
    raise exception 'INSUFFICIENT_TOKENS';
  end if;

  insert into public.bookings (
    ride_instance_id,
    rider_id,
    pickup_point_id,
    token_cost,
    status,
    seat_count,
    confirmed_at
  )
  values (
    p_ride_instance_id,
    p_rider_id,
    p_pickup_point_id,
    v_token_cost,
    'booked',
    p_seat_count,
    now()
  )
  returning id into v_booking_id;

  v_remaining_to_deduct := v_required_tokens;

  for v_credit in
    select id, tokens
    from public.token_credits
    where user_id = p_rider_id
      and status = 'active'
      and expires_at > now()
      and tokens > 0
    order by expires_at asc, created_at asc
    for update
  loop
    exit when v_remaining_to_deduct <= 0;

    v_use := least(v_credit.tokens, v_remaining_to_deduct);

    update public.token_credits
    set tokens = tokens - v_use
    where id = v_credit.id;

    update public.token_credits
    set status = 'expired'
    where id = v_credit.id
      and tokens <= 0;

    insert into public.booking_token_deductions (booking_id, token_credit_id, tokens_deducted)
    values (v_booking_id, v_credit.id, v_use);

    v_remaining_to_deduct := v_remaining_to_deduct - v_use;
  end loop;

  update public.token_wallets
  set balance = coalesce((
      select sum(tokens)::int
      from public.token_credits
      where user_id = p_rider_id
        and status = 'active'
        and expires_at > now()
        and tokens > 0
    ), 0),
    updated_at = now()
  where user_id = p_rider_id;

  select coalesce(sum(seat_count), 0)::int
  into v_reserved
  from public.bookings
  where ride_instance_id = p_ride_instance_id
    and (
      status in ('confirmed', 'booked')
      or (status = 'pending' and lock_expires_at > now())
    );

  return query
  select
    b.id,
    b.ride_instance_id,
    b.rider_id,
    b.pickup_point_id,
    b.token_cost,
    b.status,
    b.seat_count,
    v_required_tokens,
    coalesce((
      select sum(tokens)::int
      from public.token_credits tc
      where tc.user_id = p_rider_id
        and tc.status = 'active'
        and tc.expires_at > now()
        and tc.tokens > 0
    ), 0) as tokens_remaining,
    v_capacity,
    v_reserved,
    greatest(v_capacity - v_reserved, 0)::int as available_seats
  from public.bookings b
  where b.id = v_booking_id;
end;
$$;

-- Admin wallet adjustment helper.
create or replace function public.admin_adjust_wallet(
  p_user_id uuid,
  p_amount int,
  p_reason text,
  p_reference text default null,
  p_created_by uuid default null
)
returns table (
  user_id uuid,
  amount int,
  balance_after int,
  ledger_id uuid
)
language plpgsql
as $$
declare
  v_balance int;
  v_ledger_id uuid;
begin
  if p_amount = 0 then
    raise exception 'AMOUNT_MUST_NOT_BE_ZERO';
  end if;

  insert into public.token_wallets (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select balance
  into v_balance
  from public.token_wallets
  where user_id = p_user_id
  for update;

  if v_balance + p_amount < 0 then
    raise exception 'INSUFFICIENT_WALLET_BALANCE';
  end if;

  v_balance := v_balance + p_amount;

  update public.token_wallets
  set balance = v_balance,
      updated_at = now()
  where user_id = p_user_id;

  insert into public.wallet_ledger(
    user_id,
    amount,
    balance_after,
    type,
    reason,
    reference,
    created_by
  )
  values (
    p_user_id,
    p_amount,
    v_balance,
    case when p_amount > 0 then 'CREDIT' else 'DEBIT' end,
    p_reason,
    p_reference,
    p_created_by
  )
  returning id into v_ledger_id;

  return query select p_user_id, p_amount, v_balance, v_ledger_id;
end;
$$;

-- Admin booking refund helper.
create or replace function public.admin_refund_booking(
  p_booking_id uuid,
  p_amount int,
  p_reason text,
  p_admin_id uuid
)
returns table (
  booking_id uuid,
  refunded_tokens int,
  wallet_balance_after int,
  ledger_id uuid
)
language plpgsql
as $$
declare
  v_booking public.bookings%rowtype;
  v_ledger_id uuid;
  v_wallet_balance int;
begin
  if p_amount <= 0 then
    raise exception 'INVALID_REFUND_AMOUNT';
  end if;

  select *
  into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if v_booking.id is null then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  if v_booking.refunded_tokens + p_amount > v_booking.token_cost then
    raise exception 'REFUND_EXCEEDS_TOKEN_COST';
  end if;

  perform * from public.admin_adjust_wallet(
    v_booking.rider_id,
    p_amount,
    p_reason,
    p_booking_id::text,
    p_admin_id
  );

  select balance into v_wallet_balance
  from public.token_wallets
  where user_id = v_booking.rider_id;

  update public.bookings
  set refunded_tokens = refunded_tokens + p_amount,
      refunded_at = now(),
      refunded_by = p_admin_id
  where id = p_booking_id;

  select id
  into v_ledger_id
  from public.wallet_ledger
  where user_id = v_booking.rider_id
    and reference = p_booking_id::text
  order by created_at desc
  limit 1;

  return query
  select
    p_booking_id,
    v_booking.refunded_tokens + p_amount,
    v_wallet_balance,
    v_ledger_id;
end;
$$;
