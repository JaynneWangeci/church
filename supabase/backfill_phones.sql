-- One-time backfill: populate church_members.phone from existing pledges and donations
-- Skips members who already have a phone (does not overwrite)

-- 1. Backfill from pledges (prioritised: whatsapp_number then phone)
update church_members cm
set phone = coalesce(cm.phone, p.best_phone)
from (
  select distinct on (lower(donor_name))
    donor_name,
    coalesce(nullif(trim(whatsapp_number), ''), nullif(trim(phone), '')) as best_phone
  from pledges
  where coalesce(nullif(trim(whatsapp_number), ''), nullif(trim(phone), '')) is not null
  order by lower(donor_name), created_at desc
) p
where cm.name ilike p.donor_name
  and cm.phone is null;

-- 2. Backfill from donations (only where church_members.phone is still null)
update church_members cm
set phone = coalesce(cm.phone, d.best_phone)
from (
  select distinct on (lower(donor_name))
    donor_name,
    nullif(trim(phone), '') as best_phone
  from donations
  where nullif(trim(phone), '') is not null
    and status = 'completed'
  order by lower(donor_name), created_at desc
) d
where cm.name ilike d.donor_name
  and cm.phone is null;
