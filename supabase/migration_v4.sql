-- ====== v4: M-Pesa C2B (tithe-style) Support ======

-- 1. Add account_reference to donations for C2B flow
alter table donations add column if not exists account_reference text;
alter table donations add column if not exists transaction_id text;
create index if not exists idx_donations_account_ref on donations(account_reference);
create index if not exists idx_donations_transaction_id on donations(transaction_id);

-- 2. Add donor_phone to donations for C2B (separate from the STK push phone)
alter table donations add column if not exists donor_phone text;
