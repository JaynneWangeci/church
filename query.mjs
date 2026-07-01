import { createClient } from "@supabase/supabase-js";

const url = "https://ktyfkzyigauhwqgfpjsc.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0eWZrenlpZ2F1aHdxZ2ZwanNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTcxODA2NiwiZXhwIjoyMDk3Mjk0MDY2fQ.kVhBdqtZCU0yz2YAeVeJTklU3AI9Ui3fqTmlLHL20Og";

const svc = createClient(url, key, { auth: { persistSession: false } });

const { data: allDonations, error } = await svc
  .from("donations")
  .select(`
    id,
    donor_name,
    amount,
    transaction_id,
    account_reference,
    checkout_request_id,
    church_member_id,
    status,
    method
  `)
  .eq("status", "completed")
  .limit(500);

if (error) { console.error("Query error:", error); process.exit(1); }

const paybill = allDonations.filter(d => d.transaction_id || (d.account_reference && d.account_reference.startsWith("C2B:")));
console.log(`Total completed donations: ${allDonations.length}`);
console.log(`Paybill donations: ${paybill.length}`);

// Get the linked members
const memberIds = [...new Set(paybill.filter(d => d.church_member_id).map(d => d.church_member_id))];
const { data: members } = await svc.from("church_members").select("id, name, council").in("id", memberIds);

const councilCounts = {};
for (const m of members || []) {
  councilCounts[m.council] = (councilCounts[m.council] || 0) + 1;
}
console.log("Members linked to paybill, by council:", JSON.stringify(councilCounts, null, 2));

// "Not opted in to any fellowship" — perhaps means council is NULL or empty 
// (since all members have a council, this would be 0)
// OR "general_member" is not a real fellowship
const specificFellowships = [
  "maranatha_fellowship", "bethlehem_fellowship", "jerusalem_fellowship",
  "aefeso_fellowship", "galilee_fellowship", "bethel_fellowship",
  "berea_fellowship", "judea_fellowship"
];

const noFellowship = (members || []).filter(m => !m.council || !specificFellowships.includes(m.council));
console.log(`\nPaybill members NOT in a specific fellowship (including general_member): ${noFellowship.length}`);
noFellowship.forEach(m => console.log(`  ${m.name} | council: ${m.council}`));
