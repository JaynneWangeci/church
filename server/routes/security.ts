import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import { requireAdmin } from "../lib/admin.js";

export const securityRouter = Router();

const CRITICAL_ACTIONS = [
  "failed_login", "suspicious_activity", "rate_limit_blocked",
  "stk_rate_limited", "ip_blocked",
];

securityRouter.get("/feed", requireAdmin, async (req, res) => {
  try {
    const db = requireService();
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Number(req.query.offset) || 0;
    const action = req.query.action as string | undefined;

    let query = db
      .from("audit_logs")
      .select("id, action, details, ip_address, created_at, admin_name, admin_id, resource_type, resource_id")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (action) query = query.eq("action", action);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    const { count } = await db
      .from("audit_logs")
      .select("*", { count: "exact", head: true });

    res.json({ events: data || [], total: count || 0 });
  } catch (err: any) {
    console.error("security feed error:", err);
    res.status(500).json({ error: "Failed to load security feed" });
  }
});

securityRouter.get("/feed/critical", requireAdmin, async (req, res) => {
  try {
    const db = requireService();
    const hours = Number(req.query.hours) || 6;

    const since = new Date(Date.now() - hours * 3600000).toISOString();
    const { data, error } = await db
      .from("audit_logs")
      .select("id, action, details, ip_address, created_at")
      .in("action", CRITICAL_ACTIONS)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) return res.status(500).json({ error: error.message });

    // Compute summary counts
    const summary: Record<string, number> = {};
    for (const key of CRITICAL_ACTIONS) summary[key] = 0;
    for (const ev of data || []) {
      summary[ev.action] = (summary[ev.action] || 0) + 1;
    }

    res.json({ events: data || [], summary, since });
  } catch (err: any) {
    console.error("security critical error:", err);
    res.status(500).json({ error: "Failed to load critical events" });
  }
});
