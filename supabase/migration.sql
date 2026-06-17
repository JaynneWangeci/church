create extension if not exists "pgcrypto";

create type payment_method as enum ('mpesa');
create type donation_status as enum ('pending', 'completed', 'failed');
create type pledge_status as enum ('pending', 'fulfilled', 'cancelled');
create type member_council as enum ('parish_board', 'women_council', 'men_council', 'development');

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text not null,
  goal numeric not null,
  raised numeric not null default 0,
  currency text not null default 'KES',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists committee_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  council member_council not null,
  photo_url text,
  "order" int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists donations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id),
  donor_name text,
  amount numeric not null,
  method payment_method not null,
  status donation_status not null default 'pending',
  checkout_request_id text unique,
  receipt_number text unique,
  message text,
  phone text,
  honored_member_id uuid references committee_members(id),
  created_at timestamptz not null default now()
);

create table if not exists pledges (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id),
  donor_name text not null,
  amount numeric not null,
  message text,
  status pledge_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists phone_lookup (
  id uuid primary key default gen_random_uuid(),
  phone_hash text not null,
  donation_id uuid not null references donations(id),
  created_at timestamptz not null default now()
);

create table if not exists payment_queue (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null references donations(id),
  status text not null default 'pending',
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function increment_campaign_raised(campaign_id uuid, amount numeric)
returns void
language plpgsql
security definer
as $$
begin
  update campaigns
  set raised = raised + amount
  where id = campaign_id;
end;
$$;

create index if not exists idx_donations_campaign on donations(campaign_id);
create index if not exists idx_donations_status on donations(status);
create index if not exists idx_donations_checkout on donations(checkout_request_id);
create index if not exists idx_phone_lookup_hash on phone_lookup(phone_hash);
create index if not exists idx_committee_order on committee_members("order");
create index if not exists idx_pledges_campaign on pledges(campaign_id);
