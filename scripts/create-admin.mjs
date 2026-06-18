// Run: node scripts/create-admin.mjs <email> <password> <name> <role>
// Role: super_admin, admin, viewer (default: admin)
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const [email, password, name, role = "admin"] = process.argv.slice(2);

if (!email || !password || !name) {
  console.error("Usage: node scripts/create-admin.mjs <email> <password> <name> [role]");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const validRoles = ["super_admin", "admin", "viewer"];
const finalRole = validRoles.includes(role) ? role : "admin";

const passwordHash = await bcrypt.hash(password, 12);

const { data, error } = await supabase
  .from("admin_users")
  .insert({ email, password_hash: passwordHash, name, role: finalRole })
  .select()
  .single();

if (error) {
  console.error("Error creating admin:", error.message);
  process.exit(1);
}

console.log(`Admin created: ${data.email} (${data.role})`);
