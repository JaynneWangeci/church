import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function migrate() {
  const { data: admins, error } = await supabase
    .from("admin_users")
    .select("id, email, name, role, created_at");

  if (error) {
    console.error("Failed to fetch admins:", error.message);
    process.exit(1);
  }

  console.log(`Found ${admins.length} admin(s) to migrate`);

  for (const admin of admins) {
    console.log(`Processing ${admin.email} (${admin.id})...`);

    const { data: existingAuth } = await supabase.auth.admin.getUserById(admin.id);
    if (existingAuth?.user) {
      console.log(`  Already has auth user, skipping`);
      continue;
    }

    const tempPassword = crypto.randomUUID().slice(0, 16) + "Aa1";

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: admin.email,
      password: tempPassword,
      email_confirm: true,
      id: admin.id,
    });

    if (authError) {
      console.error(`  FAILED: ${authError.message}`);
      continue;
    }

    console.log(`  Created auth user ${authUser.user.id} with temporary password`);
    console.log(`  Admin must reset their password on next login`);
  }

  console.log("Migration complete");
}

migrate().catch(console.error);
