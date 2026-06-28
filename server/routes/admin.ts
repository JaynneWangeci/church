import { Router } from "express";
import { v4 as uuid } from "uuid";
import { requireService, requireAnon, createAuthUser, updateAuthUserPassword, deleteAuthUser } from "../lib/supabase.js";
import {
  requireAdmin, requireAdminOrAbove, requireSuperAdmin, logAudit,
  filterDonationsByRole, verifyPassword, hashPassword, getClientIp,
  recalculatePledgeFulfillment,
} from "../lib/admin.js";
import { sendSMS, sendTestSMS } from "../lib/sajsoft.js";
import { getPhoneForName, savePhoneForName } from "../lib/contacts.js";
import { REMINDER_VERSES, CONGRATULATION_VERSES, pickVerse } from "./verses.js";

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
      .select("id, amount, donor_name, status, method, receipt_number, phone, message, created_at, campaign_id, checkout_request_id, account_reference, transaction_id")
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
        .map((d) => d.donor_name?.toLowerCase().trim())
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

    const paybillCompleted = (completedDonations || []).filter(d => d.transaction_id || (d.account_reference && d.account_reference.startsWith("C2B:")));
    const stkCompleted = (completedDonations || []).filter(d => !d.transaction_id && d.checkout_request_id);

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
      paybill_count: paybillCompleted.length,
      paybill_total: paybillCompleted.reduce((s, d) => s + Number(d.amount), 0),
      stk_count: stkCompleted.length,
      stk_total: stkCompleted.reduce((s, d) => s + Number(d.amount), 0),
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

    const adminId = uuid();

    const { error: authError } = await createAuthUser(email, password, adminId);
    if (authError) {
      return res.status(500).json({ error: authError.message || "Failed to create auth user" });
    }

    const { data, error } = await db
      .from("admin_users")
      .insert({ id: adminId, email: email.toLowerCase().trim(), name, role: role || "viewer", phone: phone || null })
      .select("id, email, name, role, phone")
      .single();

    if (error) {
      await db.from("admin_users").delete().eq("id", adminId).catch(() => {});
      return res.status(500).json({ error: error.message });
    }

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

    await deleteAuthUser(req.params.id).catch(() => {});
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
    const admin = (req as any).admin;
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ error: "Password must include at least one uppercase letter and one number" });
    }

    const isSelf = admin.id === req.params.id;

    if (isSelf) {
      if (!currentPassword) {
        return res.status(400).json({ error: "Current password required" });
      }
      const supabase = requireAnon();
      const { error: signInError } = await (supabase.auth as any).signInWithPassword({
        email: admin.email,
        password: currentPassword,
      });
      if (signInError) {
        return res.status(403).json({ error: "Current password is incorrect" });
      }
    } else if (admin.role !== "super_admin") {
      return res.status(403).json({ error: "Only super_admin can change other admins' passwords" });
    }

    const { error: updateError } = await updateAuthUserPassword(req.params.id, newPassword);
    if (updateError) {
      return res.status(500).json({ error: updateError.message || "Failed to update password" });
    }

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

    await recalculatePledgeFulfillment(db);

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
      .select("id, amount, donor_name, method, phone, church_member_id, created_at")
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
      const donorMap = new Map<string, { name: string; total: number; phones: string[] }>();
      for (const d of donations) {
        const rawName = d.donor_name || "Anonymous";
        const key = rawName.toLowerCase().trim();
        if (donorMap.has(key)) {
          donorMap.get(key)!.total += Number(d.amount);
          if (d.phone && !donorMap.get(key)!.phones.includes(d.phone)) {
            donorMap.get(key)!.phones.push(d.phone);
          }
        } else {
          donorMap.set(key, { name: rawName, total: Number(d.amount), phones: d.phone ? [d.phone] : [] });
        }
      }
      const topDonors = Array.from(donorMap.values())
        .sort((a, b) => b.total - a.total);

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

    report.sort((a, b) => a.council.localeCompare(b.council));

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
adminRouter.post("/migrate-v9", requireAdmin, requireSuperAdmin, async (_req, res) => {
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

adminRouter.post("/migrate-v10", requireAdmin, requireSuperAdmin, async (_req, res) => {
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

adminRouter.post("/migrate-v11", requireAdmin, requireSuperAdmin, async (_req, res) => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return res.status(500).json({ error: "Supabase not configured" });
    const sql = "ALTER TABLE admin_users ALTER COLUMN password_hash DROP NOT NULL;";
    const ref = url.match(/https:\/\/(.+)\.supabase\.co/)?.[1];
    const headers = { "Content-Type": "application/json", "apikey": key, "Authorization": `Bearer ${key}` };

    const results: string[] = [];

    if (ref) {
      const mgmtRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
        method: "POST", headers, body: JSON.stringify({ query: sql }),
      });
      if (mgmtRes.ok) return res.json({ ok: true, message: "password_hash nullable" });
      results.push("mgmt: " + (await mgmtRes.text().catch(() => "?")));
    }

    const ddlRes = await fetch(`${url}/pg/ddl`, { method: "POST", headers, body: JSON.stringify({ query: sql }) });
    if (ddlRes.ok) return res.json({ ok: true, message: "password_hash nullable" });
    results.push("ddl: " + (await ddlRes.text().catch(() => "?")));

    const queryRes = await fetch(`${url}/pg/query`, { method: "POST", headers, body: JSON.stringify({ query: sql }) });
    if (queryRes.ok) return res.json({ ok: true, message: "password_hash nullable" });
    results.push("query: " + (await queryRes.text().catch(() => "?")));

    const sqlRes = await fetch(`${url}/api/sql`, { method: "POST", headers, body: JSON.stringify({ query: sql }) });
    if (sqlRes.ok) return res.json({ ok: true, message: "password_hash nullable" });
    results.push("sql: " + (await sqlRes.text().catch(() => "?")));

    res.status(500).json({ error: "All endpoints failed", details: results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send bulk SMS campaign reminder to all members with a phone on record
adminRouter.post("/send-bulk-sms", requireAdmin, requireAdminOrAbove, async (req, res) => {
  try {
    const db = requireService();
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "message required" });

    // Get all members that have a phone number stored directly on church_members
    const { data: members } = await db
      .from("church_members")
      .select("name, phone")
      .eq("is_active", true)
      .not("phone", "is", null);

    const phones = new Set<string>();
    for (const m of members || []) {
      if (m.phone) phones.add(m.phone);
    }

    // Also collect phones from pledges for people not yet in church_members
    const { data: pledges } = await db
      .from("pledges")
      .select("phone")
      .not("phone", "is", null);
    for (const p of pledges || []) {
      if (p.phone) phones.add(p.phone);
    }

    // Also collect phones from completed donations (M-Pesa numbers)
    const { data: donations } = await db
      .from("donations")
      .select("phone, donor_name")
      .eq("status", "completed")
      .not("phone", "is", null);
    for (const d of donations || []) {
      if (d.phone) {
        phones.add(d.phone);
        // Backfill into church_members
        if (d.donor_name) savePhoneForName(d.donor_name, d.phone).catch(() => {});
      }
    }

    let sent = 0, failed = 0;
    for (const phone of phones) {
      const ok = await sendSMS(phone, message);
      if (ok) sent++; else failed++;
    }

    const admin = (req as any).admin;
    await logAudit({
      adminId: admin.id,
      action: "bulk_sms",
      details: { recipients: phones.size, sent, failed },
      ipAddress: (req as any).adminIp,
      userAgent: (req as any).userAgent,
    });

    res.json({ ok: true, total: phones.size, sent, failed });
  } catch (err) {
    console.error("bulk sms error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Send personal portfolio progress to all pledgers
adminRouter.post("/send-portfolio-sms", requireAdmin, requireAdminOrAbove, async (req, res) => {
  try {
    const db = requireService();
    const { data: pledges } = await db
      .from("pledges")
      .select("id, donor_name, phone, amount, paid, remaining, status");

    const usedRefs = new Set<number>();
    let sent = 0, failed = 0;
    for (const p of pledges || []) {
      const phone = await getPhoneForName(p.donor_name) || p.phone;
      if (!phone) { failed++; continue; }
      const pct = p.amount > 0 ? Math.round((p.paid / p.amount) * 100) : 0;
      const remaining = Math.max(0, Number(p.amount) - Number(p.paid));
      const isFulfilled = p.status === "fulfilled";
      const verseList = isFulfilled ? CONGRATULATION_VERSES : REMINDER_VERSES;
      const v = pickVerse(verseList, "en", usedRefs);
      usedRefs.add(v.idx);
      if (usedRefs.size >= verseList.length) usedRefs.clear();
      const msg = `Portfolio Update - AIPCA Bahati Cathedral\n\nHi ${p.donor_name}!\n\nPledge: KES ${Number(p.amount).toLocaleString()}\nPaid: KES ${Number(p.paid).toLocaleString()} (${pct}%)\nRemaining: KES ${remaining.toLocaleString()}\nStatus: ${p.status}\n\n"${v.text}" - ${v.ref}\n\nTrack your progress at any time.`;
      const ok = await sendSMS(phone, msg);
      if (ok) sent++; else failed++;
    }

    const admin = (req as any).admin;
    await logAudit({
      adminId: admin.id,
      action: "portfolio_sms",
      details: { recipients: pledges?.length || 0, sent, failed },
      ipAddress: (req as any).adminIp,
      userAgent: (req as any).userAgent,
    });

    res.json({ ok: true, total: pledges?.length || 0, sent, failed });
  } catch (err) {
    console.error("portfolio sms error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// TEMP: fix PLD donations with truncated donor_name
adminRouter.post("/fix-pld-donations", async (_req, res) => {
  try {
    const db = requireService();
    const { data: pldDonations } = await db
      .from("donations")
      .select("id, donor_name, amount, receipt_number, account_reference, church_member_id")
      .ilike("donor_name", "PLD:%");
    if (!pldDonations?.length) return res.json({ fixed: 0, message: "No PLD donations found" });
    const fixes: { id: string; donor_name: string; account_reference: string }[] = [];
    for (const d of pldDonations) {
      const shortId = String(d.donor_name).replace("PLD:", "");
      const { data: pledge } = await db
        .from("pledges")
        .select("id, donor_name")
        .ilike("id", `${shortId}%`)
        .limit(1)
        .single();
      if (pledge) {
        fixes.push({ id: d.id, donor_name: pledge.donor_name, account_reference: `PLD:${pledge.id}` });
      }
    }
    for (const f of fixes) {
      await db.from("donations").update({ donor_name: f.donor_name, account_reference: f.account_reference }).eq("id", f.id);
    }
    // Recalculate all pledges
    const { recalculatePledgeFulfillment } = await import("../lib/admin.js");
    await recalculatePledgeFulfillment(db);
    res.json({ fixed: fixes.length, donations: pldDonations.map(d => ({ id: d.id, old_name: d.donor_name })), updates: fixes });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || String(err) });
  }
});

adminRouter.post("/test-sms", requireAdmin, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone required" });
    const result = await sendTestSMS(phone);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});
