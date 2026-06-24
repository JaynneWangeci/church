-- Create payment callback logs table for audit trail and idempotency
CREATE TABLE IF NOT EXISTS payment_callback_logs (
  id SERIAL PRIMARY KEY,
  checkout_request_id TEXT NOT NULL,
  raw_payload TEXT,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for idempotency lookups
CREATE INDEX IF NOT EXISTS idx_callback_logs_checkout_id ON payment_callback_logs(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_callback_logs_processed ON payment_callback_logs(processed);
