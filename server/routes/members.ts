import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import { requireAdmin, requireAdminOrAbove, logAudit } from "../lib/admin.js";
import type { AuditAction } from "../lib/admin.js";

export const membersRouter = Router();

membersRouter.get("/", async (_req, res) => {
  try {
    const db = requireService();
    const { data, error } = await db
      .from("church_members")
      .select("*")
      .eq("is_active", true)
      .order("council")
      .order("name");

    if (error) return res.status(500).json({ error: error.message });
    res.json({ member: data });
  } catch (err) {
    console.error("member create error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

membersRouter.post("/dedup", requireAdmin, requireAdminOrAbove, async (_req, res) => {
  try {
    const db = requireService();
    const { data: all } = await db.from("church_members").select("*").eq("is_active", true).order("created_at");
    if (!all?.length) return res.json({ deduped: 0, message: "No members found in the registry." });

    const seen = new Map<string, typeof all[0]>();
    const toDeactivate: string[] = [];
    const toDelete: string[] = [];

    for (const m of all) {
      const key = m.name.toLowerCase().trim();
      if (seen.has(key)) {
        const prev = seen.get(key)!;
        toDeactivate.push(prev.id);
        toDelete.push(m.id);
      } else {
        seen.set(key, m);
      }
    }

    let deactivated = 0;
    if (toDeactivate.length) {
      const { error: e1 } = await db.from("church_members").update({ is_active: false }).in("id", toDeactivate);
      if (!e1) deactivated += toDeactivate.length;
    }
    if (toDelete.length) {
      const { error: e2 } = await db.from("church_members").delete().in("id", toDelete);
      if (!e2) deactivated += toDelete.length;
    }

    const admin = (_req as any).admin;
    await logAudit({
      adminId: admin.id,
      action: "dedup_church_members",
      resourceType: "church_member",
      resourceId: `${deactivated} deduped`,
      ipAddress: (_req as any).adminIp,
    });

    res.json({ deduped: deactivated, message: `${deactivated} duplicate record${deactivated !== 1 ? 's' : ''} removed.` });
  } catch (err) {
    console.error("dedup error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

membersRouter.post("/", requireAdmin, requireAdminOrAbove, async (req, res) => {
  try {
    const db = requireService();
    const { name, council } = req.body;
    if (!name || !council) return res.status(400).json({ error: "name and council required" });

    const trimmed = name.trim();

    const { data: existing } = await db
      .from("church_members")
      .select("id, name, council")
      .eq("is_active", true)
      .ilike("name", trimmed);

    if (existing?.length) {
      return res.status(409).json({ error: "A member with this name already exists", duplicate: existing[0] });
    }

    const { data, error } = await db
      .from("church_members")
      .insert({ name: trimmed, council })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const admin = (req as any).admin;
    await logAudit({
      adminId: admin.id,
      action: "create_church_member",
      resourceType: "church_member",
      resourceId: data.id,
      ipAddress: (req as any).adminIp,
    });

    res.status(201).json({ member: data });
  } catch (err) {
    console.error("member create error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

membersRouter.post("/bulk-delete", requireAdmin, requireAdminOrAbove, async (req, res) => {
  try {
    const db = requireService();
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: "Please select at least one member to remove" });

    const { error } = await db.from("church_members").delete().in("id", ids);

    if (error) return res.status(500).json({ error: error.message });

    const admin = (req as any).admin;
    await logAudit({
      adminId: admin.id,
      action: "bulk_delete_church_members",
      resourceType: "church_member",
      resourceId: ids.join(","),
      ipAddress: (req as any).adminIp,
    });

    res.json({ ok: true, deleted: ids.length });
  } catch (err) {
    console.error("bulk delete error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

membersRouter.patch("/:id", requireAdmin, requireAdminOrAbove, async (req, res) => {
  try {
    const db = requireService();
    const { name, council, is_active } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (council !== undefined) updates.council = council;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await db
      .from("church_members")
      .update(updates)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const admin = (req as any).admin;
    await logAudit({
      adminId: admin.id,
      action: "update_church_member",
      resourceType: "church_member",
      resourceId: data.id,
      ipAddress: (req as any).adminIp,
    });

    res.json({ member: data });
  } catch (err) {
    console.error("member update error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

membersRouter.delete("/:id", requireAdmin, requireAdminOrAbove, async (req, res) => {
  try {
    const db = requireService();
    const { error } = await db.from("church_members").delete().eq("id", req.params.id);

    if (error) return res.status(500).json({ error: error.message });

    const admin = (req as any).admin;
    await logAudit({
      adminId: admin.id,
      action: "delete_church_member",
      resourceType: "church_member",
      resourceId: req.params.id,
      ipAddress: (req as any).adminIp,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("member delete error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});
