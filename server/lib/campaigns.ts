// Get the active campaign ID from settings (falls back to "development-fund")
export async function getActiveCampaignId(db: any): Promise<string | null> {
  const { data: activeSetting } = await db.from("settings").select("value").eq("key", "active_campaign_id").maybeSingle();
  if (activeSetting?.value) return activeSetting.value;
  const { data: fallback } = await db.from("campaigns").select("id").eq("slug", "development-fund").maybeSingle();
  return fallback?.id || null;
}
