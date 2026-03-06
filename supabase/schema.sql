-- Supabase SQL schema for VoiceDesk
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- 1) Business profiles — linked to auth.users
create table if not exists business_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  owner_name text not null,
  email text not null,
  phone text not null,
  city text not null,
  category text not null check (category in ('doctor', 'hotel')),
  tier int not null default 1 check (tier between 1 and 4),
  kb_files jsonb default '[]'::jsonb,
  integration_config jsonb default '{}'::jsonb,
  provisioned_number text,
  dashboard_url text,
  knowledge_base_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id)
);

-- 2) Payments — tracks Cashfree orders per business
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references business_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  cf_order_id text not null unique,
  payment_session_id text,
  amount int not null,
  currency text not null default 'INR',
  status text not null default 'PENDING' check (status in ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
  cf_payment_id text,
  payment_method text,
  tier int not null check (tier between 1 and 4),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3) Indexes
create index if not exists idx_business_profiles_user on business_profiles(user_id);
create index if not exists idx_payments_business on payments(business_id);
create index if not exists idx_payments_cf_order on payments(cf_order_id);
create index if not exists idx_payments_user on payments(user_id);

-- 4) Row Level Security (RLS)
alter table business_profiles enable row level security;
alter table payments enable row level security;

-- Users can only see/edit their own business profile
create policy "Users can view own profile"
  on business_profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on business_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on business_profiles for update
  using (auth.uid() = user_id);

-- Users can only see their own payments
create policy "Users can view own payments"
  on payments for select
  using (auth.uid() = user_id);

create policy "Users can insert own payments"
  on payments for insert
  with check (auth.uid() = user_id);

-- 5) Updated-at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_business_profiles_updated_at
  before update on business_profiles
  for each row execute function update_updated_at();

create trigger set_payments_updated_at
  before update on payments
  for each row execute function update_updated_at();
