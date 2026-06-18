-- ====== v2: Admin Auth, Audit Logs, Data Isolation ======

alter table admin_users add column if not exists role text not null default 'viewer'
  check (role in ('super_admin', 'admin', 'viewer'));

create table if not exists admin_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references admin_users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_sessions_token on admin_sessions(token_hash);
create index if not exists idx_sessions_admin on admin_sessions(admin_id);

create type audit_action as enum (
  'login', 'logout',
  'view_donations', 'view_donation',
  'export_ledger',
  'create_committee', 'update_committee', 'delete_committee',
  'view_audit_logs',
  'create_admin', 'update_admin'
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references admin_users(id),
  action audit_action not null,
  resource_type text,
  resource_id text,
  details jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_admin on audit_logs(admin_id);
create index if not exists idx_audit_action on audit_logs(action);
create index if not exists idx_audit_created on audit_logs(created_at desc);

-- RLS: data isolation per admin role
alter table donations enable row level security;
alter table committee_members enable row level security;
alter table audit_logs enable row level security;

-- Viewers can only see completed donations (no phone numbers)
create policy donations_viewer_select on donations
  for select
  using (
    current_setting('app.admin_role', true) = 'viewer'
    and status = 'completed'
  );

-- Admins can see all donations
create policy donations_admin_select on donations
  for select
  using (
    current_setting('app.admin_role', true) in ('admin', 'super_admin')
  );

-- Only super_admin can modify
create policy donations_super_admin_insert on donations
  for insert
  with check (current_setting('app.admin_role', true) = 'super_admin');

create policy donations_super_admin_update on donations
  for update
  using (current_setting('app.admin_role', true) = 'super_admin');

-- Committee members: viewers can select, admin+ can modify
create policy committee_viewer_select on committee_members
  for select using (true);

create policy committee_admin_all on committee_members
  for all
  using (current_setting('app.admin_role', true) in ('admin', 'super_admin'));

-- Audit logs: only super_admin can see
create policy audit_super_admin_select on audit_logs
  for select
  using (current_setting('app.admin_role', true) = 'super_admin');

-- Function to set admin context
create or replace function set_admin_context(admin_id uuid, role text)
returns void
language plpgsql
security definer
as $$
begin
  perform set_config('app.admin_id', admin_id::text, true);
  perform set_config('app.admin_role', role, true);
end;
$$;
