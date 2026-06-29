import { Router } from "express";
import { requireService } from "../lib/supabase.js";

export const campaignsRouter = Router();

function computeRaised(donations: { amount: number }[] | null): number {
  return (donations || []).reduce((acc, d) => acc + Number(d.amount), 0);
}

function formatCampaign(data: any, raised: number) {
  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    description: data.description,
    goal: Number(data.goal),
    raised,
    currency: data.currency,
    starts_at: data.starts_at,
    ends_at: data.ends_at,
    is_active: data.is_active,
    created_at: data.created_at,
  };
}

campaignsRouter.get("/active", async (_req, res) => {
  try {
    const db = requireService();
    const { data: activeSetting } = await db.from("settings").select("value").eq("key", "active_campaign_id").maybeSingle();
    let campaignId = activeSetting?.value || null;

    let query = db.from("campaigns").select("*");
    if (campaignId) {
      query = query.eq("id", campaignId);
    } else {
      query = query.eq("slug", "development-fund");
    }
    const { data: campaign } = await query.single();
    if (!campaign) {
      const { data: fallback } = await db.from("campaigns").select("*").limit(1).single();
      if (!fallback) return res.status(404).json({ error: "No campaigns found" });
      return res.json(formatCampaign(fallback, 0));
    }
    const { data: sumData } = await db.from("donations").select("amount").eq("campaign_id", campaign.id).eq("status", "completed");
    res.json(formatCampaign(campaign, computeRaised(sumData)));
  } catch (err) {
    console.error("active campaign error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

campaignsRouter.get("/:slug", async (req, res) => {
  try {
    const db = requireService();
    const { data } = await db.from("campaigns").select("*").eq("slug", req.params.slug).single();
    if (!data) return res.status(404).json({ error: "Campaign not found" });
    const { data: sumData } = await db.from("donations").select("amount").eq("campaign_id", data.id).eq("status", "completed");
    res.json(formatCampaign(data, computeRaised(sumData)));
  } catch (err) {
    console.error("campaign error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
