import { Router } from "express";
import { requireService } from "../lib/supabase.js";

export const fellowshipsRouter = Router();

fellowshipsRouter.get("/progress", async (_req, res) => {
  try {
    const db = requireService();

    const COUNCIL_RANK: Record<string, number> = {
      maranatha_fellowship: 1, bethlehem_fellowship: 2, jerusalem_fellowship: 3,
      aefeso_fellowship: 4, galilee_fellowship: 5, bethel_fellowship: 6,
      berea_fellowship: 7, judea_fellowship: 8, general_member: 9,
    };
    const councilMeta: Record<string, { label: string; color: string }> = {
      maranatha_fellowship: { label: "Maranatha Fellowship", color: "#1E6F9F" },
      bethlehem_fellowship: { label: "Bethlehem Fellowship", color: "#5B9BD5" },
      jerusalem_fellowship: { label: "Jerusalem Fellowship", color: "#3A5A7A" },
      aefeso_fellowship: { label: "Aefeso Fellowship", color: "#2C4056" },
      galilee_fellowship: { label: "Galilee Fellowship", color: "#7C3AED" },
      bethel_fellowship: { label: "Bethel Fellowship", color: "#0891B2" },
      berea_fellowship: { label: "Berea Fellowship", color: "#059669" },
      judea_fellowship: { label: "Judea Fellowship", color: "#D97706" },
      general_member: { label: "General Member", color: "#6B7280" },
    };

    const { data: campaign } = await db
      .from("campaigns")
      .select("id, goal")
      .eq("slug", "development-fund")
      .single();
    const goal = Number(campaign?.goal || 30000000);
    const campaignId = campaign?.id;

    const { data: members } = await db
      .from("church_members")
      .select("id, council")
      .eq("is_active", true);

    const memberByCouncil: Record<string, number> = {};
    const memberLookup = new Map<string, string>();
    for (const m of members || []) {
      memberByCouncil[m.council] = (memberByCouncil[m.council] || 0) + 1;
      memberLookup.set(m.id, m.council);
    }

    let donationQuery = db
      .from("donations")
      .select("amount, church_member_id")
      .eq("status", "completed");
    if (campaignId) donationQuery = donationQuery.eq("campaign_id", campaignId);
    const { data: donations } = await donationQuery;

    const donationByCouncil: Record<string, { total: number; count: number }> = {};
    for (const d of donations || []) {
      const council = d.church_member_id ? (memberLookup.get(d.church_member_id) || "general_member") : "general_member";
      if (!donationByCouncil[council]) donationByCouncil[council] = { total: 0, count: 0 };
      donationByCouncil[council].total += Number(d.amount);
      donationByCouncil[council].count += 1;
    }

    const allCouncils = [...new Set([...Object.keys(memberByCouncil), ...Object.keys(donationByCouncil)])];

    const fellowshipStats = allCouncils
      .map(council => {
        const meta = councilMeta[council] || { label: council.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), color: "#6B7280" };
        const d = donationByCouncil[council] || { total: 0, count: 0 };
        return {
          council,
          label: meta.label,
          color: meta.color,
          member_count: memberByCouncil[council] || 0,
          donation_count: d.count,
          total_amount: d.total,
          goal,
          percentage: goal > 0 ? Math.round((d.total / goal) * 10000) / 100 : 0,
        };
      })
      .sort((a, b) => b.total_amount - a.total_amount);
    res.json({ fellowships: fellowshipStats });
  } catch (err) {
    console.error("fellowship progress error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
