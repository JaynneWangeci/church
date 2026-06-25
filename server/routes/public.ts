import { Router } from "express";
import { requireService } from "../lib/supabase.js";

export const publicRouter = Router();

publicRouter.get("/gender-contributions", async (_req, res) => {
  try {
    const db = requireService();

    const { data: donations } = await db
      .from("donations")
      .select("amount, church_members!church_member_id!inner(gender)")
      .eq("status", "completed")
      .not("church_member_id", "is", null);

    let male = 0, female = 0;
    for (const d of donations || []) {
      const gender = (d as any).church_members?.gender;
      const amt = Number(d.amount);
      if (gender === "male") male += amt;
      else if (gender === "female") female += amt;
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
