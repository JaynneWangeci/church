import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const svc = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  // Check members with council = 'theophilus' (without _fellowship)
  const { data: oldMembers, error: e1 } = await svc
    .from("church_members")
    .select("id, name, council")
    .eq("council", "theophilus");

  if (e1) { console.error("Error fetching theophilus members:", e1); process.exit(1); }

  console.log(`Found ${oldMembers?.length || 0} members with council='theophilus':`);
  for (const m of oldMembers || []) {
    console.log(`  - ${m.name} (${m.id})`);
  }

  // Check members with council = 'theophilus_fellowship'
  const { data: newMembers, error: e2 } = await svc
    .from("church_members")
    .select("id, name, council")
    .eq("council", "theophilus_fellowship");

  if (e2) { console.error("Error fetching theophilus_fellowship members:", e2); process.exit(1); }

  console.log(`\nFound ${newMembers?.length || 0} members with council='theophilus_fellowship':`);
  for (const m of newMembers || []) {
    console.log(`  - ${m.name} (${m.id})`);
  }

  if (!oldMembers?.length) {
    console.log("\nNo members to migrate. Already clean.");
    return;
  }

  // Update them
  const ids = oldMembers.map(m => m.id);
  const { error: e3 } = await svc
    .from("church_members")
    .update({ council: "theophilus_fellowship" })
    .in("id", ids);

  if (e3) { console.error("Error updating members:", e3); process.exit(1); }

  console.log(`\n✓ Successfully migrated ${ids.length} members from 'theophilus' → 'theophilus_fellowship'`);
}

main().catch(console.error);
