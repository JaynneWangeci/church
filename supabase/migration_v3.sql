-- ====== v3: Church Members, SOC2 Audit, Session Management, Access Control ======

-- 1. CHURCH MEMBERS (for contribution dropdown)
create table if not exists church_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  council member_council not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Add church_member_id to donations
alter table donations add column if not exists church_member_id uuid references church_members(id);

-- 3. Indexes
create index if not exists idx_church_members_council on church_members(council) where is_active;
create index if not exists idx_church_members_active on church_members(is_active);
create index if not exists idx_donations_church_member on donations(church_member_id);

-- 4. SOC2: Enriched audit_logs
alter table audit_logs add column if not exists user_agent text;
alter table audit_logs add column if not exists admin_name text;

-- SOC2: Immutable audit logs
create or replace function guard_audit_logs()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs are immutable: % operation denied', tg_op;
end;
$$;

drop trigger if exists trg_audit_immutable on audit_logs;
create trigger trg_audit_immutable
  before update or delete on audit_logs
  for each row execute function guard_audit_logs();

create index if not exists idx_audit_admin_role on audit_logs(created_at desc, action);

-- 5. Session management
drop table if exists admin_sessions cascade;
create table admin_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references admin_users(id) on delete cascade,
  token_hash text not null,
  ip_address text,
  user_agent text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_sessions_token on admin_sessions(token_hash);
create index if not exists idx_sessions_admin on admin_sessions(admin_id);
create index if not exists idx_sessions_expires on admin_sessions(expires_at);

-- 6. Rate-limiting: track failed login attempts
alter table admin_users add column if not exists failed_attempts int not null default 0;
alter table admin_users add column if not exists locked_until timestamptz;
alter table admin_users add column if not exists last_login_at timestamptz;
alter table admin_users add column if not exists last_login_ip text;

-- 7. RLS for church_members
alter table church_members enable row level security;
create policy church_members_select_all on church_members
  for select using (true);
create policy church_members_admin_all on church_members
  for all using (current_setting('app.admin_role', true) in ('admin', 'super_admin'));

-- 8. Enhanced RLS for data isolation
drop policy if exists donations_viewer_select on donations;
drop policy if exists donations_admin_select on donations;
drop policy if exists donations_super_admin_insert on donations;
drop policy if exists donations_super_admin_update on donations;
drop policy if exists committee_viewer_select on committee_members;
drop policy if exists committee_admin_all on committee_members;
drop policy if exists audit_super_admin_select on audit_logs;

create policy donations_select_policy on donations
  for select
  using (
    current_setting('app.admin_role', true) = 'super_admin'
    or (current_setting('app.admin_role', true) = 'viewer' and status = 'completed')
    or (current_setting('app.admin_role', true) = 'admin')
  );

create policy donations_role_modify on donations
  for insert
  with check (current_setting('app.admin_role', true) = 'super_admin');

create policy donations_role_update on donations
  for update
  using (current_setting('app.admin_role', true) = 'super_admin');

create policy committee_role_select on committee_members
  for select using (true);

create policy committee_role_modify on committee_members
  for all
  using (current_setting('app.admin_role', true) in ('admin', 'super_admin'));

create policy audit_role_select on audit_logs
  for select
  using (current_setting('app.admin_role', true) = 'super_admin');

alter table admin_users enable row level security;
create policy admin_role_select on admin_users
  for select
  using (current_setting('app.admin_role', true) = 'super_admin');

create policy admin_role_modify on admin_users
  for all
  using (current_setting('app.admin_role', true) = 'super_admin');

-- 9. Update set_admin_context
create or replace function set_admin_context(admin_id uuid, role text, campaign_id text default null)
returns void
language plpgsql
security definer
as $$
begin
  perform set_config('app.admin_id', admin_id::text, true);
  perform set_config('app.admin_role', role, true);
  if campaign_id is not null then
    perform set_config('app.campaign_id', campaign_id, true);
  end if;
end;
$$;

-- 10. Extended audit actions
do $$
begin
  if not exists (select 1 from pg_enum where enumlabel = 'view_church_members' and enumtypid = 'audit_action'::regtype) then
    alter type audit_action add value 'view_church_members';
  end if;
  if not exists (select 1 from pg_enum where enumlabel = 'create_church_member' and enumtypid = 'audit_action'::regtype) then
    alter type audit_action add value 'create_church_member';
  end if;
  if not exists (select 1 from pg_enum where enumlabel = 'update_church_member' and enumtypid = 'audit_action'::regtype) then
    alter type audit_action add value 'update_church_member';
  end if;
  if not exists (select 1 from pg_enum where enumlabel = 'delete_church_member' and enumtypid = 'audit_action'::regtype) then
    alter type audit_action add value 'delete_church_member';
  end if;
  if not exists (select 1 from pg_enum where enumlabel = 'update_donation' and enumtypid = 'audit_action'::regtype) then
    alter type audit_action add value 'update_donation';
  end if;
  if not exists (select 1 from pg_enum where enumlabel = 'failed_login' and enumtypid = 'audit_action'::regtype) then
    alter type audit_action add value 'failed_login';
  end if;
  if not exists (select 1 from pg_enum where enumlabel = 'view_stats' and enumtypid = 'audit_action'::regtype) then
    alter type audit_action add value 'view_stats';
  end if;
  if not exists (select 1 from pg_enum where enumlabel = 'view_members' and enumtypid = 'audit_action'::regtype) then
    alter type audit_action add value 'view_members';
  end if;
  if not exists (select 1 from pg_enum where enumlabel = 'password_change' and enumtypid = 'audit_action'::regtype) then
    alter type audit_action add value 'password_change';
  end if;
  if not exists (select 1 from pg_enum where enumlabel = 'rate_limit_blocked' and enumtypid = 'audit_action'::regtype) then
    alter type audit_action add value 'rate_limit_blocked';
  end if;
end $$;

-- 11. Seed church members from committee
insert into church_members (name, council)
select name, council::member_council
from committee_members
where not exists (select 1 from church_members limit 1);
