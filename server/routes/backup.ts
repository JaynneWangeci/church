import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import { v4 as uuid } from "uuid";

export const backupRouter = Router();

backupRouter.post("/cron", async (req, res) => {
  const cronSecret = req.headers["x-cron-secret"] as string || req.headers.authorization?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const db = requireService();

    const tables = ["campaigns", "donations", "pledges", "church_members", "settings", "admin_users", "sms_logs"];
    const dump: Record<string, any[]> = {};

    for (const table of tables) {
      try {
        const { data } = await db.from(table).select("*");
        dump[table] = data || [];
      } catch { dump[table] = []; }
    }

    const backupId = uuid();
    const now = new Date().toISOString();
    const backupRecord = {
      id: backupId,
      created_at: now,
      data: dump,
      summary: Object.fromEntries(Object.entries(dump).map(([k, v]) => [k, v.length])),
    };

    const { error } = await db.from("backups").insert(backupRecord).single();
    if (error) return res.status(500).json({ error: error.message });

    // Push to GitHub if token configured
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO || process.env.VERCEL_GIT_REPO_SLUG;
    if (githubToken && githubRepo) {
      try {
        const backupDir = "backups";
        const filename = `${backupDir}/${now.slice(0, 10)}-${backupId.slice(0, 8)}.json`;
        const content = Buffer.from(JSON.stringify(dump, null, 2)).toString("base64");

        const getRes = await fetch(`https://api.github.com/repos/${githubRepo}/contents/${filename}`, {
          headers: { Authorization: `Bearer ${githubToken}` },
        });
        const existingSha = getRes.ok ? (await getRes.json()).sha : undefined;

        await fetch(`https://api.github.com/repos/${githubRepo}/contents/${filename}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${githubToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `backup: ${now.slice(0, 10)} - ${Object.keys(dump).join(", ")} data dump`,
            content,
            sha: existingSha,
            branch: "backups",
          }),
        });

        const latestRes = await fetch(`https://api.github.com/repos/${githubRepo}/contents/${backupDir}/latest.json`, {
          headers: { Authorization: `Bearer ${githubToken}` },
        });
        const latestSha = latestRes.ok ? (await latestRes.json()).sha : undefined;
        await fetch(`https://api.github.com/repos/${githubRepo}/contents/${backupDir}/latest.json`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${githubToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `backup: update latest.json pointer`,
            content: Buffer.from(JSON.stringify({ backupId, created_at: now, file: filename }, null, 2)).toString("base64"),
            sha: latestSha,
            branch: "backups",
          }),
        });
      } catch {}
    }

    res.json({ ok: true, backup_id: backupId, created_at: now, summary: backupRecord.summary });
  } catch (err) {
    console.error("backup cron error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
