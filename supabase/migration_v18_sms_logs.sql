-- ====== v18: SMS Logs for send tracking ======

create table if not exists sms_logs (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  recipient_name text,
  message_preview text,
  status text not null default 'sent',
  message_id text,
  cost numeric,
  error text,
  context text,
  context_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_sms_logs_created on sms_logs(created_at desc);
create index if not exists idx_sms_logs_status on sms_logs(status);
create index if not exists idx_sms_logs_context on sms_logs(context);
