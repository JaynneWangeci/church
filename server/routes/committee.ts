import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import { requireAdmin, requireAdminOrAbove, logAudit } from "../lib/admin.js";

export const committeeRouter = Router();

committeeRouter.get("/", async (_req, res) => {
  try {
    const db = requireService();
    const { data, error } = await db
      .from("committee_members")
      .select("*")
      .order("council")
      .order("order");

    if (error) return res.status(500).json({ error: error.message });
    res.json({ members: data || [] });
  } catch (err) {
    console.error("committee error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

committeeRouter.post("/", requireAdmin, requireAdminOrAbove, async (req, res) => {
  try {
    const db = requireService();
    const { name, role, council, photo_url, order } = req.body;
    if (!name || !role || !council) return res.status(400).json({ error: "name, role, council required" });

    const { data, error } = await db
      .from("committee_members")
      .insert({ name, role, council, photo_url, order: order || 0 })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const admin = (req as any).admin;
    await logAudit({
      adminId: admin.id,
      action: "create_committee",
      resourceType: "committee_member",
      resourceId: data.id,
      ipAddress: (req as any).ipAddress,
      userAgent: (req as any).userAgent,
    });

    res.status(201).json({ member: data });
  } catch (err) {
    console.error("committee create error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

committeeRouter.patch("/:id", requireAdmin, requireAdminOrAbove, async (req, res) => {
  try {
    const db = requireService();
    const { name, role, council, photo_url, order } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role;
    if (council !== undefined) updates.council = council;
    if (photo_url !== undefined) updates.photo_url = photo_url;
    if (order !== undefined) updates.order = order;

    const { data, error } = await db
      .from("committee_members")
      .update(updates)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const admin = (req as any).admin;
    await logAudit({
      adminId: admin.id,
      action: "update_committee",
      resourceType: "committee_member",
      resourceId: data.id,
      ipAddress: (req as any).ipAddress,
      userAgent: (req as any).userAgent,
    });

    res.json({ member: data });
  } catch (err) {
    console.error("committee update error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

committeeRouter.delete("/:id", requireAdmin, requireAdminOrAbove, async (req, res) => {
  try {
    const db = requireService();
    const { error } = await db.from("committee_members").delete().eq("id", req.params.id);

    if (error) return res.status(500).json({ error: error.message });

    const admin = (req as any).admin;
    await logAudit({
      adminId: admin.id,
      action: "delete_committee",
      resourceType: "committee_member",
      resourceId: req.params.id,
      ipAddress: (req as any).ipAddress,
      userAgent: (req as any).userAgent,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("committee delete error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
