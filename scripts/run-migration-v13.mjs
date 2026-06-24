import { createClient } from "@supabase/supabase-js";

const sql = `
CREATE TABLE IF NOT EXISTS payment_callback_logs (
  id SERIAL PRIMARY KEY,
  checkout_request_id TEXT NOT NULL,
  raw_payload TEXT,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_callback_logs_checkout_id ON payment_callback_logs(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_callback_logs_processed ON payment_callback_logs(processed);
`;

async function run() {
  const supabase = createClient(
    "https://ktyfkzyigauhwqgfpjsc.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Try RPC first
  const { error } = await supabase.rpc("exec_sql", { sql });
  if (error) {
    console.log("RPC error:", error.message);
    // Fallback: direct SQL via management API
    const res = await fetch(
      "https://api.supabase.com/v1/projects/ktyfkzyigauhwqgfpjsc/database/query",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({ query: sql }),
      }
    );
    const txt = await res.text();
    console.log("Management API:", res.status, txt.slice(0, 300));
  } else {
    console.log("Migration applied successfully via RPC");
  }
}

run().catch(console.error);
