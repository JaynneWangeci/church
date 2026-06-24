import { Router } from "express";
import { requireService } from "../lib/supabase.js";

export const trackRouter = Router();

trackRouter.post("/pageview", async (req, res) => {
  try {
    const { path, title, referrer } = req.body;
    if (!path) return res.status(400).json({ error: "path required" });
    const db = requireService();
    await db.from("page_views").insert({
      path,
      page_title: title || null,
      referrer: referrer || null,
      user_agent: (req.headers["user-agent"] || "").slice(0, 512) || null,
      ip_address: req.ip?.replace(/^::ffff:/, "") || null,
    });
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});
