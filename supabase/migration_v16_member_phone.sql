-- ====== v16: Add phone column to church_members for unified messaging ======

alter table church_members add column if not exists phone text;
alter table church_members add column if not exists whatsapp_number text;

-- Allow one phone per member (enforced at app level — some members may share a phone)
create index if not exists idx_church_members_phone on church_members(phone) where phone is not null;

-- Upsert phone from pledges/donations into church_members by matching name
create or replace function sync_member_phone(p_name text, p_phone text)
returns void
language plpgsql
security definer
as $$
begin
  update church_members
  set phone = coalesce(church_members.phone, p_phone)
  where name ilike p_name
    and church_members.phone is null;
end;
$$;
