-- ====== v17: Add verification_code column and fix phone storage ======

-- 1. Add verification_code to donations (for hash/transaction reference codes)
alter table donations add column if not exists verification_code text;

-- 2. Migrate existing hash strings from donor_phone to verification_code
--    (hashes are SHA-256 hex strings or long digit strings, not real phones)
update donations
set verification_code = donor_phone,
    donor_phone = null
where donor_phone ~ '^[a-f0-9]{30,}$'
   or donor_phone ~ '^\d{30,}$';

-- 3. Backfill donor_phone from church_members.phone where name matches
update donations d
set donor_phone = cm.phone
from church_members cm
where d.church_member_id = cm.id
  and cm.phone is not null
  and (d.donor_phone is null or d.donor_phone = '');
