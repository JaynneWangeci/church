import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import { requireAdmin, requireAdminOrAbove, logAudit, rateLimit, filterDonationsByRole, maskSensitiveData } from "../lib/admin.js";
import { invalidateOnChange } from "../lib/redis.js";
import type { AuditAction } from "../lib/admin.js";

function sanitizeName(name: string): string {
  return name.replace(/<[^>]*>/g, "").replace(/[%_]/g, "").trim().slice(0, 100);
}

let validCouncils: string[] = [];
async function refreshCouncils(): Promise<string[]> {
  try {
    const db = requireService();
    const { data } = await db.from("councils").select("slug").eq("is_active", true);
    validCouncils = (data || []).map(c => c.slug);
    return validCouncils;
  } catch {
    return validCouncils;
  }
}
refreshCouncils();
setInterval(refreshCouncils, 60000);

export const membersRouter = Router();

membersRouter.get("/template", async (_req, res) => {
  try {
    const PDFDocument = (await import("pdfkit")).default;
    const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: "Member Template", Author: "AIPCA Bahati Cathedral" } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=member-template.pdf");
      res.send(Buffer.concat(chunks));
    });

    doc.fontSize(18).font("Helvetica-Bold").text("AIPCA Bahati Cathedral", { align: "center" });
    doc.fontSize(14).text("Member Bulk Upload Template", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica").fillColor("#666666").text("Format: Name - Fellowship  OR  Name, Fellowship", { align: "center" });
    doc.text("Or just one name per line (uses fellowship selected in upload)", { align: "center" });
    doc.fillColor("#000000");
    doc.moveDown(1);
    doc.fontSize(11).font("Helvetica-Bold").text("Instructions:", { underline: true });
    doc.fontSize(10).font("Helvetica");
    doc.list(["Delete sample names below", "Type one name per line", 'Optional: add " - FellowshipName" after each name', "Save as PDF and upload in admin panel"]);
    doc.moveDown(1);
    doc.fontSize(11).font("Helvetica-Bold").text("Sample Names (replace these):");
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica");
    ["John Kamau, Maranatha Fellowship", "Mary Wambui, Bethlehem Fellowship", "Peter Njoroge, Jerusalem Fellowship", "Grace Akinyi, Aefeso Fellowship", "", "--- Replace with your own names (comma or dash separated) ---"].forEach(t => doc.text(t, 50, doc.y, { indent: 20 }));
    doc.end();
  } catch (err) {
    console.error("template error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate template" });
  }
});

membersRouter.get("/", rateLimit, async (_req, res) => {
  try {
    const db = requireService();
    const { data, error } = await db
      .from("church_members")
      .select("*")
      .eq("is_active", true)
      .order("council")
      .order("name");

    if (error) return res.status(500).json({ error: error.message });
    res.json({ members: data });
  } catch (err) {
    console.error("members list error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// Member search autocomplete (admin only)
membersRouter.get("/search", rateLimit, async (req, res) => {
  try {
    const db = requireService();
    let q = ((req.query.q as string) || "").trim().replace(/[^a-zA-Z0-9\s\-'.]/g, "");
    if (!q || q.length < 1) {
      const { data, error } = await db
        .from("church_members")
        .select("id, name, council, gender, is_active, created_at")
        .eq("is_active", true)
        .order("name")
        .limit(50);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ members: data || [] });
    }

    const { data, error } = await db
      .from("church_members")
      .select("id, name, council, gender, is_active, created_at")
      .eq("is_active", true)
      .ilike("name", `${q}%`)
      .order("name")
      .limit(50);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ members: data || [] });
  } catch (err) {
    console.error("member search error:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// Public endpoint: auto-add a name when typing in a form (no auth required, rate-limited)
// If member exists and council/gender differ, updates them in place.
// Uses fuzzy matching: exact (case-insensitive) → prefix → token match.
membersRouter.post("/auto-add", rateLimit, async (req, res) => {
  try {
    const db = requireService();
    let { name, council, gender } = req.body;
    name = sanitizeName(name || "");
    council = (council || "general_member").toLowerCase();

    if (!name || name.length < 2) return res.status(400).json({ error: "Name must be at least 2 characters" });
    if (!validCouncils.includes(council)) council = "general_member";

    // Try to find existing member: exact → prefix → token match
    let existingMember: { id: string; name: string; council: string; gender: string | null } | null = null;

    // Exact case-insensitive
    const { data: exact } = await db
      .from("church_members")
      .select("id, name, council, gender")
      .eq("is_active", true)
      .ilike("name", name)
      .maybeSingle();
    if (exact) existingMember = exact;

    // Prefix match
    if (!existingMember) {
      const { data: prefix } = await db
        .from("church_members")
        .select("id, name, council, gender")
        .eq("is_active", true)
        .ilike("name", `${name}%`)
        .limit(1);
      if (prefix?.length) existingMember = prefix[0];
    }

    // Token match — try each word of the name
    if (!existingMember) {
      const tokens = name.split(/\s+/).filter(Boolean);
      for (const token of tokens) {
        if (token.length < 2) continue;
        const { data: tokenMatch } = await db
          .from("church_members")
          .select("id, name, council, gender")
          .eq("is_active", true)
          .ilike("name", `%${token}%`)
          .limit(1);
        if (tokenMatch?.length) { existingMember = tokenMatch[0]; break; }
      }
    }

    if (existingMember) {
      const member = existingMember;
      const updates: Record<string, unknown> = {};
      if (member.council !== council) updates.council = council;
      if (gender === "male" || gender === "female") {
        if (member.gender !== gender) updates.gender = gender;
      }
      if (Object.keys(updates).length > 0) {
        await db.from("church_members").update(updates).eq("id", member.id);
      }
      return res.json({ member: { ...member, ...updates }, existed: true });
    }

    const insertData: Record<string, unknown> = { name, council };
    if (gender === "male" || gender === "female") insertData.gender = gender;
    const { data, error } = await db
      .from("church_members")
      .insert(insertData)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ member: data, existed: false });
  } catch (err) {
    console.error("auto-add error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

async function reassignDonations(db: any, survivorId: string, sourceIds: string[]): Promise<number> {
  if (!sourceIds.length) return 0;
  const { data, error } = await db
    .from("donations")
    .update({ church_member_id: survivorId })
    .in("church_member_id", sourceIds)
    .select("id");
  if (error) { console.error("reassign donations error:", error); return 0; }
  return data?.length || 0;
}

async function reassignHonours(db: any, survivorId: string, sourceIds: string[]): Promise<number> {
  if (!sourceIds.length) return 0;
  const { data, error } = await db
    .from("donations")
    .update({ honored_member_id: survivorId })
    .in("honored_member_id", sourceIds)
    .select("id");
  if (error) { console.error("reassign honours error:", error); return 0; }
  return data?.length || 0;
}

async function reassignPledges(db: any, survivorId: string, sourceIds: string[]): Promise<number> {
  if (!sourceIds.length) return 0;
  const { data, error } = await db
    .from("pledges")
    .update({ church_member_id: survivorId })
    .in("church_member_id", sourceIds)
    .select("id");
  if (error) { console.error("reassign pledges error:", error); return 0; }
  return data?.length || 0;
}

membersRouter.post("/dedup", requireAdmin, requireAdminOrAbove, async (_req, res) => {
  try {
    const db = requireService();
    const { data: all } = await db.from("church_members").select("*").eq("is_active", true).order("created_at");
    if (!all?.length) return res.json({ deduped: 0, message: "No members found in the registry." });

    const seen = new Map<string, typeof all[0]>();
    const toDeactivate: string[] = [];
    const toDelete: string[] = [];
    const idMap = new Map<string, string>();

    for (const m of all) {
      const key = m.name.toLowerCase().trim();
      if (seen.has(key)) {
        const prev = seen.get(key)!;
        toDeactivate.push(prev.id);
        toDelete.push(m.id);
        idMap.set(m.id, prev.id);
      } else {
        seen.set(key, m);
      }
    }

    // Reassign donations, honours, and pledges before removing duplicates
    let reassignedDonations = 0;
    let reassignedHonours = 0;
    let reassignedPledges = 0;
    for (const [obsoleteId, survivorId] of idMap) {
      reassignedDonations += await reassignDonations(db, survivorId, [obsoleteId]);
      reassignedHonours += await reassignHonours(db, survivorId, [obsoleteId]);
      reassignedPledges += await reassignPledges(db, survivorId, [obsoleteId]);
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

    res.json({
      deduped: deactivated,
      reassigned: { donations: reassignedDonations, honours: reassignedHonours, pledges: reassignedPledges },
      message: `${deactivated} duplicate record${deactivated !== 1 ? 's' : ''} removed. ${reassignedDonations} donations, ${reassignedHonours} honours, ${reassignedPledges} pledges reassigned.`,
    });
  } catch (err) {
    console.error("dedup error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

membersRouter.post("/:id/merge", requireAdmin, requireAdminOrAbove, async (req, res) => {
  try {
    const db = requireService();
    const survivorId = req.params.id;
    const { source_ids } = req.body;

    if (!Array.isArray(source_ids) || !source_ids.length) {
      return res.status(400).json({ error: "source_ids array required" });
    }

    // Verify survivor exists
    const { data: survivor } = await db.from("church_members").select("id, name").eq("id", survivorId).single();
    if (!survivor) return res.status(404).json({ error: "Survivor member not found" });

    // Verify source members exist
    const { data: sources } = await db.from("church_members").select("id, name").in("id", source_ids);
    if (!sources?.length) return res.status(404).json({ error: "No source members found" });

    const validSourceIds = sources.map(s => s.id);

    // Reassign all donations, honours, and pledges
    const donations = await reassignDonations(db, survivorId, validSourceIds);
    const honours = await reassignHonours(db, survivorId, validSourceIds);
    const pledges = await reassignPledges(db, survivorId, validSourceIds);

    // Reassign donations by donor_name match (for donations with null church_member_id)
    let donorNameMatch = 0;
    for (const src of sources) {
      const { data: nameDons, error: nameErr } = await db
        .from("donations")
        .select("id")
        .is("church_member_id", null)
        .ilike("donor_name", src.name);
      if (!nameErr && nameDons?.length) {
        const ids = nameDons.map(d => d.id);
        const { error: updErr } = await db
          .from("donations")
          .update({ church_member_id: survivorId })
          .in("id", ids);
        if (!updErr) donorNameMatch += ids.length;
      }
    }

    // Deactivate source members
    const { error: deactErr } = await db
      .from("church_members")
      .update({ is_active: false })
      .in("id", validSourceIds);

    const admin = (req as any).admin;
    await logAudit({
      adminId: admin.id,
      action: "merge_church_members" as AuditAction,
      resourceType: "church_member",
      resourceId: `${survivorId} merged with ${validSourceIds.join(",")}`,
      ipAddress: (req as any).adminIp,
    });

    res.json({
      ok: true,
      survivor: { id: survivor.id, name: survivor.name },
      merged: sources.map(s => ({ id: s.id, name: s.name })),
      reassigned: { donations, honours, pledges, donor_name_matches: donorNameMatch },
      message: `${survivor.name} absorbed ${sources.length} member${sources.length > 1 ? 's' : ''}. ${donations} donations, ${honours} honours, ${pledges} pledges, ${donorNameMatch} additional donor-name matches reassigned.`,
    });
  } catch (err) {
    console.error("merge error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

membersRouter.post("/", requireAdmin, requireAdminOrAbove, async (req, res) => {
  try {
    const db = requireService();
    let { name, council, gender } = req.body;
    name = sanitizeName(name || "");
    if (!name) return res.status(400).json({ error: "name is required" });
    if (!council) council = "general_member";

    const trimmed = name.trim();

    const { data: existing } = await db
      .from("church_members")
      .select("id, name, council")
      .eq("is_active", true)
      .ilike("name", trimmed);

    if (existing?.length) {
      return res.status(409).json({ error: "A member with this name already exists", duplicate: existing[0] });
    }

    const insertData: Record<string, unknown> = { name: trimmed, council };
    if (gender === "male" || gender === "female") insertData.gender = gender;
    const { data, error } = await db
      .from("church_members")
      .insert(insertData)
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

membersRouter.post("/bulk-edit", requireAdmin, requireAdminOrAbove, async (req, res) => {
  try {
    const db = requireService();
    let { names, council, gender } = req.body;
    if (!Array.isArray(names) || !names.length) return res.status(400).json({ error: "Provide at least one name" });
    if (!council) council = "general_member";

    names = names.map((n: string) => n.replace(/^\d+[\.\)]?\s*/, "").replace(/\.+$/, "").replace(/[%_<>]/g, "").trim()).filter(Boolean);

    const { data: all, error: fetchErr } = await db.from("church_members").select("id, name").eq("is_active", true);
    if (fetchErr) return res.status(500).json({ error: "Failed to fetch members: " + fetchErr.message });

    const nameToId = new Map<string, string>();
    if (all) for (const m of all) nameToId.set(m.name.trim().toLowerCase(), m.id);

    const foundIds: string[] = [];
    const missing: string[] = [];
    for (const n of names) {
      const key = n.toLowerCase();
      let id = nameToId.get(key);
      if (id) { foundIds.push(id); continue; }
      // fallback: ilike for names with slight differences
      const { data: match } = await db.from("church_members").select("id").eq("is_active", true).ilike("name", n).maybeSingle();
      if (match) { foundIds.push(match.id); nameToId.set(key, match.id); }
      else missing.push(n);
    }

    let updated = 0;
    if (foundIds.length) {
      const updates: Record<string, unknown> = { council };
      if (gender === "male" || gender === "female") updates.gender = gender;
      const { error: updErr } = await db.from("church_members").update(updates).in("id", foundIds);
      if (updErr) return res.status(500).json({ error: updErr.message });
      updated = foundIds.length;
    }

    const admin = (req as any).admin;
    await logAudit({
      adminId: admin.id,
      action: "bulk_edit_church_members",
      resourceType: "church_member",
      resourceId: `${updated} updated`,
      ipAddress: (req as any).adminIp,
    });

    if (updated) invalidateOnChange("analytics");

    let msg = `${updated} of ${names.length} members updated.`;
    if (missing.length) msg += ` Not found: ${missing.join(", ")}`;
    res.json({ ok: true, updated, total: names.length, message: msg, missing });
  } catch (err) {
    console.error("bulk edit error:", err);
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

    invalidateOnChange("analytics");

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
    const { name, council, is_active, gender } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (council !== undefined) updates.council = council || "general_member";
    if (is_active !== undefined) updates.is_active = is_active;
    if (gender === "male" || gender === "female" || gender === null) updates.gender = gender;

    const { data, error } = await db
      .from("church_members")
      .update(updates)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    invalidateOnChange("analytics");

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

membersRouter.get("/history", requireAdmin, async (req, res) => {
  try {
    const db = requireService();
    const raw = (req.query.name as string || "").trim();
    // Only allow alphanumeric, spaces, hyphens, apostrophes, periods, underscores
    const name = raw.replace(/[^a-zA-Z0-9\s\-'.]/g, "").slice(0, 100);

    if (!name || name.length < 2) {
      return res.status(400).json({ error: "Name must be at least 2 characters" });
    }

    // Find matching members by name
    const { data: members } = await db
      .from("church_members")
      .select("id, name, council, gender, is_active, created_at")
      .ilike("name", `%${name}%`)
      .order("name");

    const memberIds = (members || []).map(m => m.id);

    // Fetch all donations linked to these members (by church_member_id or donor_name)
    // Using parameterized ilike instead of string interpolation
    let query = db
      .from("donations")
      .select("id, amount, method, status, receipt_number, phone, message, donor_name, checkout_request_id, church_member_id, created_at")
      .order("created_at", { ascending: false });

    if (memberIds.length) {
      query = query.or(
        `church_member_id.in.(${memberIds.join(",")}),donor_name.ilike.%${name}%`
      );
    } else {
      query = query.ilike("donor_name", `%${name}%`);
    }

    const { data: donations } = await query;

    // Fetch all pledges linked to this donor name
    const { data: pledges } = await db
      .from("pledges")
      .select("id, donor_name, amount, paid, remaining, status, message, phone, reminder_freq, created_at")
      .ilike("donor_name", `%${name}%`)
      .order("created_at", { ascending: false });

    // Apply role-based data masking on donation results
    const admin = (req as any).admin;
    let allDonations = (donations || []) as any[];
    if (admin?.role === "viewer") {
      allDonations = allDonations.filter((d: any) => d.status === "completed").map((d: any) => maskSensitiveData(d));
    } else if (admin?.role === "admin") {
      allDonations = allDonations.map((d: any) => maskSensitiveData(d));
    }

    const completedDons = allDonations.filter(d => d.status === "completed");
    const failedDons = allDonations.filter(d => d.status === "failed");
    const pendingDons = allDonations.filter(d => d.status === "pending");

    const allPledges = pledges || [];

    const summary = {
      total_donated: completedDons.reduce((s, d) => s + Number(d.amount), 0),
      total_donations: allDonations.length,
      completed_donations: completedDons.length,
      failed_donations: failedDons.length,
      pending_donations: pendingDons.length,
      total_pledged: allPledges.reduce((s, p) => s + Number(p.amount), 0),
      total_paid: allPledges.reduce((s, p) => s + Number(p.paid), 0),
      pledge_count: allPledges.length,
    };

    // Audit log
    await logAudit({
      adminId: admin.id,
      action: "view_member_history" as AuditAction,
      resourceType: "member",
      resourceId: memberIds.join(",") || name,
      ipAddress: (req as any).adminIp,
    });

    res.json({
      members,
      donations: allDonations,
      pledges: allPledges,
      summary,
    });
  } catch (err) {
    console.error("member history error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

membersRouter.delete("/:id", requireAdmin, requireAdminOrAbove, async (req, res) => {
  try {
    const db = requireService();
    const { error } = await db.from("church_members").delete().eq("id", req.params.id);

    if (error) return res.status(500).json({ error: error.message });

    invalidateOnChange("analytics");

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
