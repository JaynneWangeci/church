import { requireService } from "./supabase.js";

export async function getPhoneForName(name: string): Promise<string | null> {
  if (!name) return null;
  const db = requireService();

  // 1. Try church_members (canonical phone)
  const { data: member } = await db
    .from("church_members")
    .select("phone")
    .eq("is_active", true)
    .ilike("name", name)
    .maybeSingle();
  if (member?.phone) return member.phone;

  // 2. Fallback to pledge phone
  const { data: pledge } = await db
    .from("pledges")
    .select("phone, whatsapp_number")
    .ilike("donor_name", name)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (pledge?.whatsapp_number) return pledge.whatsapp_number;
  if (pledge?.phone) return pledge.phone;

  // 3. Fallback to latest donation phone
  const { data: donation } = await db
    .from("donations")
    .select("phone")
    .eq("status", "completed")
    .ilike("donor_name", name)
    .not("phone", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (donation?.phone) return donation.phone;

  return null;
}

export async function savePhoneForName(name: string, phone: string): Promise<void> {
  if (!name || !phone) return;
  const db = requireService();

  // Upsert into church_members if a matching active member exists
  const clean = phone.replace(/\D/g, "");
  if (clean.length < 10) return;

  const { data: existing } = await db
    .from("church_members")
    .select("id, phone")
    .eq("is_active", true)
    .ilike("name", name)
    .maybeSingle();

  if (existing) {
    // Only set if not already set (don't overwrite a manually curated number)
    if (!existing.phone) {
      await db.from("church_members").update({ phone: clean }).eq("id", existing.id);
    }
  }
}
