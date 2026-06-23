import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import {
  requireAdmin, requireAdminOrAbove, requireSuperAdmin, logAudit,
  filterDonationsByRole, verifyPassword, hashPassword, getClientIp,
} from "../lib/admin.js";

export const adminRouter = Router();

adminRouter.get("/stats", requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).admin;
    const db = requireService();

    const { data: campaign } = await db
      .from("campaigns")
      .select("*")
      .eq("slug", "development-fund")
      .single();

    const goal = Number(campaign?.goal || 30000000);
    const campaignId = campaign?.id;

    let query = db.from("donations")
      .select("id, amount, donor_name, status, method, receipt_number, phone, message, created_at, campaign_id")
      .eq("status", "completed");
    if (campaignId) query = query.eq("campaign_id", campaignId);
    const { data: completedDonations } = await query.order("created_at", { ascending: false });

    let pendingQuery = db.from("donations").select("amount").eq("status", "pending");
    if (campaignId) pendingQuery = pendingQuery.eq("campaign_id", campaignId);
    const { data: pendingDonations } = await pendingQuery;

    let failedQuery = db.from("donations").select("amount").eq("status", "failed");
    if (campaignId) failedQuery = failedQuery.eq("campaign_id", campaignId);
    const { data: failedDonations } = await failedQuery;

    await logAudit({
      adminId: admin.id,
      action: "view_stats",
      ipAddress: (req as any).adminIp,
      userAgent: (req as any).userAgent,
    });

    const totalRaised = (completedDonations || []).reduce((s, d) => s + Number(d.amount), 0);

    const donors = new Set(
      (completedDonations || [])
        .map((d) => d.donor_name)
        .filter(Boolean)
    );

    const filtered = filterDonationsByRole(completedDonations || [], admin.role);
    const maskedDonations = filtered.slice(0, 20);

    // ── Per-fellowship statistics ──
    const { data: fellowshipMemberCounts } = await db
      .from("church_members")
      .select("council, id")
      .eq("is_active", true);

    let fellowQuery = db
      .from("donations")
      .select("amount, church_members!church_member_id!inner(council)")
      .eq("status", "completed")
      .not("church_member_id", "is", null);
    if (campaignId) fellowQuery = fellowQuery.eq("campaign_id", campaignId);
    const { data: fellowshipDonationStats } = await fellowQuery;

    const memberCountMap: Record<string, number> = {};
    for (const m of fellowshipMemberCounts || []) {
      const c = m.council || "unknown";
      memberCountMap[c] = (memberCountMap[c] || 0) + 1;
    }

    const donationAggMap: Record<string, { total: number; count: number }> = {};
    for (const d of fellowshipDonationStats || []) {
      const council = (d as any).church_members?.council || "unknown";
      if (!donationAggMap[council]) donationAggMap[council] = { total: 0, count: 0 };
      donationAggMap[council].total += Number(d.amount);
      donationAggMap[council].count += 1;
    }

    const allCouncilSlugs = [...new Set([
      ...Object.keys(memberCountMap),
      ...Object.keys(donationAggMap),
    ])];

    const fellowshipStats = allCouncilSlugs.map(slug => ({
      council: slug,
      member_count: memberCountMap[slug] || 0,
      donation_count: donationAggMap[slug]?.count || 0,
      total_amount: donationAggMap[slug]?.total || 0,
      avg_per_member: memberCountMap[slug] ? Math.round((donationAggMap[slug]?.total || 0) / memberCountMap[slug]) : 0,
    })).sort((a, b) => b.total_amount - a.total_amount);

    const { count: memberCount } = await db
      .from("church_members")
      .select("*", { count: "exact", head: true });

    const stats = {
      goal,
      raised: totalRaised,
      total_raised: totalRaised,
      total_donors: donors.size,
      avg_gift: (completedDonations || []).length ? Math.round(totalRaised / (completedDonations || []).length) : 0,
      pending_count: (pendingDonations || []).length,
      failed_count: (failedDonations || []).length,
      member_count: memberCount || 0,
      recent_donations: maskedDonations,
      fellowship_stats: fellowshipStats,
    };

    res.json(stats);
  } catch (err) {
    console.error("stats error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

adminRouter.get("/audit-logs", requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).admin;
    if (admin.role !== "super_admin") {
      return res.status(403).json({ error: "Super admin only" });
    }

    const db = requireService();
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const { data, error } = await db
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return res.status(500).json({ error: error.message });

    await logAudit({
      adminId: admin.id,
      action: "view_audit_logs",
      ipAddress: (req as any).adminIp,
      userAgent: (req as any).userAgent,
    });

    res.json({ logs: data || [] });
  } catch (err) {
    console.error("audit logs error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

adminRouter.post("/admins", requireAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const db = requireService();
    const { email, name, password, role, phone } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: "email, name, password required" });
    }

    const password_hash = hashPassword(password);

    const { data, error } = await db
      .from("admin_users")
      .insert({ email: email.toLowerCase().trim(), name, password_hash, role: role || "viewer", phone: phone || null })
      .select("id, email, name, role, phone")
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const superAdmin = (req as any).admin;
    await logAudit({
      adminId: superAdmin.id,
      action: "create_admin",
      resourceType: "admin_user",
      resourceId: data.id,
      ipAddress: (req as any).adminIp,
      userAgent: (req as any).userAgent,
    });

    res.status(201).json({ admin: data });
  } catch (err) {
    console.error("create admin error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

adminRouter.get("/users", requireAdmin, requireSuperAdmin, async (_req, res) => {
  try {
    const db = requireService();
    const { data, error } = await db
      .from("admin_users")
      .select("id, email, name, role, phone, created_at")
      .order("created_at", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ users: data || [] });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

adminRouter.put("/users/:id", requireAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const db = requireService();
    const { email, name, role, phone } = req.body;
    const updates: Record<string, string> = {};
    if (email) updates.email = email.toLowerCase().trim();
    if (name) updates.name = name;
    if (role) updates.role = role;
    if (phone !== undefined) updates.phone = phone;

    const { data, error } = await db
      .from("admin_users")
      .update(updates)
      .eq("id", req.params.id)
      .select("id, email, name, role, phone")
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const superAdmin = (req as any).admin;
    await logAudit({
      adminId: superAdmin.id,
      action: "update_admin",
      resourceType: "admin_user",
      resourceId: data.id,
      ipAddress: (req as any).adminIp,
      userAgent: (req as any).userAgent,
    });

    res.json({ admin: data });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

adminRouter.delete("/users/:id", requireAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const db = requireService();
    const superAdmin = (req as any).admin;

    const { data: target } = await db
      .from("admin_users")
      .select("id")
      .eq("id", req.params.id)
      .single();

    if (!target) return res.status(404).json({ error: "Admin not found" });
    if (target.id === superAdmin.id) {
      return res.status(400).json({ error: "Cannot delete yourself" });
    }

    const { error } = await db.from("admin_users").delete().eq("id", req.params.id);
    if (error) return res.status(500).json({ error: error.message });

    await logAudit({
      adminId: superAdmin.id,
      action: "delete_admin",
      resourceType: "admin_user",
      resourceId: req.params.id,
      ipAddress: (req as any).adminIp,
      userAgent: (req as any).userAgent,
    });

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

adminRouter.put("/users/:id/password", requireAdmin, async (req, res) => {
  try {
    const db = requireService();
    const admin = (req as any).admin;
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const isSelf = admin.id === req.params.id;

    if (isSelf) {
      const { data: user } = await db
        .from("admin_users")
        .select("password_hash")
        .eq("id", admin.id)
        .single();

      if (!user || !verifyPassword(currentPassword, user.password_hash)) {
        return res.status(403).json({ error: "Current password is incorrect" });
      }
    } else if (admin.role !== "super_admin") {
      return res.status(403).json({ error: "Only super_admin can change other admins' passwords" });
    }

    const hash = hashPassword(newPassword);
    const { error } = await db
      .from("admin_users")
      .update({ password_hash: hash })
      .eq("id", req.params.id);

    if (error) return res.status(500).json({ error: error.message });

    await logAudit({
      adminId: admin.id,
      action: isSelf ? "update_self_password" : "update_admin",
      resourceType: "admin_user",
      resourceId: req.params.id,
      ipAddress: (req as any).adminIp,
      userAgent: (req as any).userAgent,
    });

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

adminRouter.get("/fellowship-report", requireAdmin, async (req, res) => {
  try {
    const db = requireService();
    const admin = (req as any).admin;

    const { data: campaign } = await db
      .from("campaigns")
      .select("*")
      .eq("slug", "development-fund")
      .single();
    const campaignId = campaign?.id;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // All active members grouped by council
    const { data: allMembers } = await db
      .from("church_members")
      .select("id, name, council, gender, created_at")
      .eq("is_active", true)
      .order("name");

    const memberByCouncil: Record<string, { id: string; name: string; created_at: string }[]> = {};
    const memberLookup = new Map<string, string>();
    for (const m of allMembers || []) {
      if (!memberByCouncil[m.council]) memberByCouncil[m.council] = [];
      memberByCouncil[m.council].push(m);
      memberLookup.set(m.name.toLowerCase().trim(), m.council);
    }

    // Campaign-scoped completed donations
    let donationQuery = db
      .from("donations")
      .select("id, amount, donor_name, method, church_member_id, created_at")
      .eq("status", "completed");
    if (campaignId) donationQuery = donationQuery.eq("campaign_id", campaignId);
    const { data: allDonations } = await donationQuery;

    // All pledges
    const { data: allPledges } = await db
      .from("pledges")
      .select("id, donor_name, amount, paid, remaining, status, created_at");

    // Match pledges to councils via donor_name
    const pledgeByCouncil: Record<string, typeof allPledges> = {};
    for (const p of allPledges || []) {
      const council = memberLookup.get(p.donor_name.toLowerCase().trim()) || "general_member";
      if (!pledgeByCouncil[council]) pledgeByCouncil[council] = [];
      pledgeByCouncil[council].push(p);
    }

    // Match donations to councils via donor_name fallback when church_member_id is null
    const donationByCouncil: Record<string, typeof allDonations> = {};
    const donationNoMember: typeof allDonations = [];
    for (const d of allDonations || []) {
      let council: string | null = null;
      if (d.church_member_id) {
        const member = (allMembers || []).find(m => m.id === d.church_member_id);
        if (member) council = member.council;
      }
      if (!council) {
        council = memberLookup.get((d.donor_name || "").toLowerCase().trim()) || null;
      }
      if (council) {
        if (!donationByCouncil[council]) donationByCouncil[council] = [];
        donationByCouncil[council].push(d);
      } else {
        donationNoMember.push(d);
      }
    }

    // All council slugs
    const allCouncilSlugs = [...new Set([
      ...Object.keys(memberByCouncil),
      ...Object.keys(pledgeByCouncil),
      ...Object.keys(donationByCouncil),
    ])];

    const report = [];
    for (const council of allCouncilSlugs) {
      const members = memberByCouncil[council] || [];
      const pledges = pledgeByCouncil[council] || [];
      const donations = donationByCouncil[council] || [];

      // Pledge stats
      const pledgeTotal = pledges.reduce((s, p) => s + Number(p.amount), 0);
      const pledgePaid = pledges.reduce((s, p) => s + Number(p.paid), 0);
      const pledgeRemaining = pledges.reduce((s, p) => s + Number(p.remaining), 0);
      const pledgeFulfilled = pledges.filter(p => p.status === "fulfilled").length;
      const pledgeActive = pledges.filter(p => p.status === "pending").length;

      // Donation stats
      const donationTotal = donations.reduce((s, d) => s + Number(d.amount), 0);
      const donationCount = donations.length;

      // Recent 30d activity
      const recentDonations = donations.filter(d => d.created_at >= thirtyDaysAgo);
      const recentTotal = recentDonations.reduce((s, d) => s + Number(d.amount), 0);

      // Top donors in this fellowship
      const donorMap: Record<string, number> = {};
      for (const d of donations) {
        const name = d.donor_name || "Anonymous";
        donorMap[name] = (donorMap[name] || 0) + Number(d.amount);
      }
      const topDonors = Object.entries(donorMap)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      // Payment method breakdown
      const methodMap: Record<string, number> = {};
      for (const d of donations) {
        const method = d.method || "unknown";
        methodMap[method] = (methodMap[method] || 0) + Number(d.amount);
      }
      const methodBreakdown = Object.entries(methodMap)
        .map(([method, total]) => ({ method, total }))
        .sort((a, b) => b.total - a.total);

      report.push({
        council,
        member_count: members.length,
        members: members.map(m => ({ id: m.id, name: m.name })),
        donation: {
          total: donationTotal,
          count: donationCount,
          avg_gift: donationCount > 0 ? Math.round(donationTotal / donationCount) : 0,
          recent_30d_total: recentTotal,
          recent_30d_count: recentDonations.length,
          method_breakdown: methodBreakdown,
          top_donors: topDonors,
        },
        pledge: {
          total: pledgeTotal,
          paid: pledgePaid,
          remaining: pledgeRemaining,
          fulfilled: pledgeFulfilled,
          active: pledgeActive,
          count: pledges.length,
          fulfillment_rate: pledgeTotal > 0 ? Math.round((pledgePaid / pledgeTotal) * 100 * 100) / 100 : 0,
        },
      });
    }

    report.sort((a, b) => b.donation.total - a.donation.total);

    // Unlinked donations (donor not matched to any member)
    const unlinkedTotal = donationNoMember.reduce((s, d) => s + Number(d.amount), 0);

    await logAudit({
      adminId: admin.id,
      action: "view_fellowship_report",
      ipAddress: (req as any).adminIp,
      userAgent: (req as any).userAgent,
    });

    res.json({
      report,
      unlinked: {
        count: donationNoMember.length,
        total: unlinkedTotal,
      },
    });
  } catch (err) {
    console.error("fellowship report error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

adminRouter.get("/audit-actions", requireAdmin, requireSuperAdmin, async (_req, res) => {
  try {
    const db = requireService();
    const { data } = await db
      .from("audit_logs")
      .select("action")
      .order("created_at", { ascending: false })
      .limit(1000);

    const actions = [...new Set((data || []).map((l: { action: string }) => l.action))];
    res.json({ actions });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Migration v9: add honour_known_as column ──
adminRouter.post("/migrate-v9", requireAdmin, requireAdminOrAbove, async (_req, res) => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return res.status(500).json({ error: "Supabase not configured" });
    const sql = "ALTER TABLE donations ADD COLUMN IF NOT EXISTS honour_known_as TEXT;";
    const ref = url.match(/https:\/\/(.+)\.supabase\.co/)?.[1];

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
      "apikey": key,
    };

    // 1. Try pg-meta DDL endpoint (schema changes, bypasses schema cache)
    const ddlRes = await fetch(`${url}/pg/ddl`, {
      method: "POST", headers, body: JSON.stringify({ query: sql }),
    });
    if (ddlRes.ok) return res.json({ ok: true, message: "Migration complete (pg/ddl)" });
    const ddlErr = await ddlRes.text().catch(() => "unknown");

    // 2. Try pg-meta query endpoint
    const queryRes = await fetch(`${url}/pg/query`, {
      method: "POST", headers, body: JSON.stringify({ query: sql }),
    });
    if (queryRes.ok) return res.json({ ok: true, message: "Migration complete (pg/query)" });
    const queryErr = await queryRes.text().catch(() => "unknown");

    // 3. Try Supabase SQL API
    const sqlRes = await fetch(`${url}/api/sql`, {
      method: "POST", headers, body: JSON.stringify({ query: sql }),
    });
    if (sqlRes.ok) return res.json({ ok: true, message: "Migration complete (api/sql)" });
    const sqlErr = await sqlRes.text().catch(() => "unknown");

    // 4. Try Management API (uses service key as bearer)
    if (ref) {
      const mgmtRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
        method: "POST", headers, body: JSON.stringify({ query: sql }),
      });
      if (mgmtRes.ok) return res.json({ ok: true, message: "Migration complete (mgmt API)" });
      const mgmtErr = await mgmtRes.text().catch(() => "unknown");
      return res.status(500).json({
        error: "All endpoints failed",
        ddl: ddlErr.slice(0, 200),
        query: queryErr.slice(0, 200),
        sql: sqlErr.slice(0, 200),
        mgmt: mgmtErr.slice(0, 200),
      });
    }

    res.status(500).json({ error: "All endpoints failed", ddl: ddlErr.slice(0, 200), query: queryErr.slice(0, 200), sql: sqlErr.slice(0, 200) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminRouter.post("/migrate-v10", requireAdmin, requireAdminOrAbove, async (_req, res) => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return res.status(500).json({ error: "Supabase not configured" });
    const sql = "ALTER TABLE church_members ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female'));";
    const ref = url.match(/https:\/\/(.+)\.supabase\.co/)?.[1];
    const headers = { "Content-Type": "application/json", "apikey": key, "Authorization": `Bearer ${key}` };

    const results: string[] = [];

    // 1. Management API (most reliable)
    if (ref) {
      const mgmtRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
        method: "POST", headers, body: JSON.stringify({ query: sql }),
      });
      if (mgmtRes.ok) return res.json({ ok: true, message: "gender column added" });
      results.push("mgmt: " + (await mgmtRes.text().catch(() => "?")));
    }

    // 2. pg-meta DDL
    const ddlRes = await fetch(`${url}/pg/ddl`, { method: "POST", headers, body: JSON.stringify({ query: sql }) });
    if (ddlRes.ok) return res.json({ ok: true, message: "gender column added" });
    results.push("ddl: " + (await ddlRes.text().catch(() => "?")));

    // 3. pg-meta query
    const queryRes = await fetch(`${url}/pg/query`, { method: "POST", headers, body: JSON.stringify({ query: sql }) });
    if (queryRes.ok) return res.json({ ok: true, message: "gender column added" });
    results.push("query: " + (await queryRes.text().catch(() => "?")));

    // 4. /api/sql
    const sqlRes = await fetch(`${url}/api/sql`, { method: "POST", headers, body: JSON.stringify({ query: sql }) });
    if (sqlRes.ok) return res.json({ ok: true, message: "gender column added" });
    results.push("sql: " + (await sqlRes.text().catch(() => "?")));

    res.status(500).json({ error: "All endpoints failed", details: results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
