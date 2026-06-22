import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import { requireAdmin, requireAdminOrAbove, logAudit } from "../lib/admin.js";

export const councilsRouter = Router();

const COUNCIL_RANK: Record<string, number> = {
  maranatha_fellowship: 1, bethlehem_fellowship: 2, jerusalem_fellowship: 3,
  aefeso_fellowship: 4, galilee_fellowship: 5, bethel_fellowship: 6,
  berea_fellowship: 7, judea_fellowship: 8, general_member: 9,
};

councilsRouter.get("/", async (_req, res) => {
  try {
    const db = requireService();
    const { data, error } = await db.from("councils").select("*");
    if (error) return res.status(500).json({ error: error.message });
    const sorted = (data || []).sort((a: any, b: any) => (COUNCIL_RANK[a.slug] || 99) - (COUNCIL_RANK[b.slug] || 99));
    res.json({ councils: sorted });
  } catch (err) {
    console.error("councils error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

councilsRouter.post("/", requireAdmin, requireAdminOrAbove, async (req, res) => {
  try {
    const db = requireService();
    const { slug, name } = req.body;
    if (!slug || !name) return res.status(400).json({ error: "slug and name required" });

    const cleanSlug = slug.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z_]/g, "");
    if (!cleanSlug) return res.status(400).json({ error: "Invalid slug" });

    const { data, error } = await db
      .from("councils")
      .insert({ slug: cleanSlug, name })
      .select()
      .single();

    if (error) {
      if (error.message?.includes("duplicate")) {
        return res.status(409).json({ error: "A council with this slug already exists" });
      }
      return res.status(500).json({ error: error.message });
    }

    const admin = (req as any).admin;
    await logAudit({
      adminId: admin.id,
      action: "create_council",
      resourceType: "council",
      resourceId: data.slug,
      ipAddress: (req as any).ipAddress,
      userAgent: (req as any).userAgent,
    });

    res.status(201).json({ council: data });
  } catch (err) {
    console.error("council create error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

councilsRouter.patch("/:slug", requireAdmin, requireAdminOrAbove, async (req, res) => {
  try {
    const db = requireService();
    const { name, is_active } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await db
      .from("councils")
      .update(updates)
      .eq("slug", req.params.slug)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const admin = (req as any).admin;
    await logAudit({
      adminId: admin.id,
      action: "update_council",
      resourceType: "council",
      resourceId: data.slug,
      ipAddress: (req as any).ipAddress,
      userAgent: (req as any).userAgent,
    });

    res.json({ council: data });
  } catch (err) {
    console.error("council update error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

councilsRouter.delete("/:slug", requireAdmin, requireAdminOrAbove, async (req, res) => {
  try {
    const db = requireService();

    const { count: comCount } = await db
      .from("committee_members")
      .select("*", { count: "exact", head: true })
      .eq("council", req.params.slug);

    const { count: memCount } = await db
      .from("church_members")
      .select("*", { count: "exact", head: true })
      .eq("council", req.params.slug);

    if ((comCount || 0) > 0 || (memCount || 0) > 0) {
      return res.status(400).json({
        error: `Cannot delete: ${comCount || 0} committee and ${memCount || 0} members still reference this council. Reassign them first.`,
      });
    }

    const { error } = await db.from("councils").delete().eq("slug", req.params.slug);
    if (error) return res.status(500).json({ error: error.message });

    const admin = (req as any).admin;
    await logAudit({
      adminId: admin.id,
      action: "delete_council",
      resourceType: "council",
      resourceId: req.params.slug,
      ipAddress: (req as any).ipAddress,
      userAgent: (req as any).userAgent,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("council delete error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
