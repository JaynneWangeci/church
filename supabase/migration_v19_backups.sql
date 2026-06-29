-- ====== v19: Backups table for database dumps ======

create table if not exists backups (
  id uuid primary key,
  created_at timestamptz not null default now(),
  data jsonb not null,
  summary jsonb
);

create index if not exists idx_backups_created on backups(created_at desc);
