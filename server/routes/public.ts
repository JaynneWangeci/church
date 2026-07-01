import { Router } from "express";
import { requireService } from "../lib/supabase.js";

export const publicRouter = Router();

publicRouter.get("/gender-contributions", async (_req, res) => {
  try {
    const db = requireService();

    // Fetch all active members for donor_name fallback
    const { data: allMembers } = await db
      .from("church_members")
      .select("name, gender")
      .eq("is_active", true);

    const genderLookup = new Map<string, string>();
    for (const m of (allMembers || []) as any[]) {
      if (m.name && m.gender) {
        genderLookup.set(m.name.toLowerCase().trim(), m.gender);
      }
    }

    const { data: donations } = await db
      .from("donations")
      .select("amount, donor_name, church_members!church_member_id(gender)")
      .eq("status", "completed");

    let male = 0, female = 0;
    for (const d of donations || []) {
      const linkedMember = (d as any).church_members;
      const amt = Number(d.amount);
      if (linkedMember?.gender === "male") male += amt;
      else if (linkedMember?.gender === "female") female += amt;
      else {
        const donorName = ((d as any).donor_name || "").toLowerCase().trim();
        const matchedGender = donorName ? genderLookup.get(donorName) : undefined;
        if (matchedGender === "male") male += amt;
        else if (matchedGender === "female") female += amt;
      }
    }

    const { count: maleCount } = await db
      .from("church_members")
      .select("id", { count: "exact", head: false })
      .eq("is_active", true)
      .eq("gender", "male");

    const { count: femaleCount } = await db
      .from("church_members")
      .select("id", { count: "exact", head: false })
      .eq("is_active", true)
      .eq("gender", "female");

    res.json({
      male: Math.round(male),
      female: Math.round(female),
      male_members: maleCount || 0,
      female_members: femaleCount || 0,
    });
  } catch (err) {
    console.error("gender contributions error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
