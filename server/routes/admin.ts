import { Router } from "express";
import { v4 as uuid } from "uuid";
import { requireService, requireAnon, createAuthUser, updateAuthUserPassword, deleteAuthUser } from "../lib/supabase.js";
import {
  requireAdmin, requireAdminOrAbove, requireSuperAdmin, logAudit,
  filterDonationsByRole, verifyPassword, hashPassword, getClientIp,
  recalculatePledgeFulfillment,
} from "../lib/admin.js";
import { getActiveCampaignId } from "../lib/campaigns.js";
import { sendSMS, sendTestSMS } from "../lib/sajsoft.js";
import { getPhoneForName, savePhoneForName } from "../lib/contacts.js";
import { REMINDER_VERSES, CONGRATULATION_VERSES, pickVerse } from "./verses.js";

export const adminRouter = Router();

adminRouter.get("/stats", requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).admin;
    const db = requireService();

    const campaignId = await getActiveCampaignId(db);
    let goal = 30000000;
    if (campaignId) {
      const { data: camp } = await db.from("campaigns").select("goal").eq("id", campaignId).single();
      if (camp) goal = Number(camp.goal);
    }

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

    // SMS stats
    let smsStats = { total_sent: 0, total_failed: 0, total_cost: 0, recent: [] };
    try {
      const { data: smsLogs } = await db.from("sms_logs").select("*").order("created_at", { ascending: false }).limit(200);
      if (smsLogs?.length) {
        const sent = smsLogs.filter(s => s.status === "sent");
        const failed = smsLogs.filter(s => s.status === "failed");
        smsStats = {
          total_sent: sent.length,
          total_failed: failed.length,
          total_cost: sent.reduce((s: number, l: any) => s + Number(l.cost || 0), 0),
          recent: smsLogs.slice(0, 10).map(l => ({ phone: l.phone, status: l.status, created_at: l.created_at, message_preview: l.message_preview })),
        };
      }
    } catch { /* sms_logs table may not exist */ }

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
      sms: smsStats,
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

    const campaignId = await getActiveCampaignId(db);

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
      .select("id, amount, donor_name, method, donor_phone, church_member_id, created_at")
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
          if (d.donor_phone && !donorMap.get(key)!.phones.includes(d.donor_phone)) {
            donorMap.get(key)!.phones.push(d.donor_phone);
          }
        } else {
          donorMap.set(key, { name: rawName, total: Number(d.amount), phones: d.donor_phone ? [d.donor_phone] : [] });
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

// ── Campaign Management ──

adminRouter.get("/campaigns", requireAdmin, requireSuperAdmin, async (_req, res) => {
  try {
    const db = requireService();
    const { data } = await db.from("campaigns").select("*").order("created_at", { ascending: false });
    const { data: activeSetting } = await db.from("settings").select("value").eq("key", "active_campaign_id").maybeSingle();
    const activeId = activeSetting?.value || null;

    const result = await Promise.all((data || []).map(async (c: any) => {
      const { data: sumData } = await db.from("donations").select("amount").eq("campaign_id", c.id).eq("status", "completed");
      const raised = (sumData || []).reduce((s: number, d: any) => s + Number(d.amount), 0);
      return {
        id: c.id, slug: c.slug, title: c.title, description: c.description,
        goal: Number(c.goal), raised, currency: c.currency,
        starts_at: c.starts_at, ends_at: c.ends_at,
        is_active: c.is_active, created_at: c.created_at,
        is_displayed: c.id === activeId,
      };
    }));
    res.json({ campaigns: result });
  } catch (err) {
    console.error("list campaigns error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

adminRouter.post("/campaigns", requireAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const db = requireService();
    const { title, description, goal, slug, currency, starts_at, ends_at } = req.body;
    if (!title || !goal) return res.status(400).json({ error: "title and goal required" });

    const actualSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { data, error } = await db.from("campaigns").insert({
      title, description: description || "", goal, slug: actualSlug,
      currency: currency || "KES", starts_at: starts_at || new Date().toISOString(),
      ends_at: ends_at || null, is_active: true,
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });

    const admin = (req as any).admin;
    await logAudit({ adminId: admin.id, action: "create_campaign", resourceType: "campaign", resourceId: data.id, ipAddress: (req as any).adminIp, userAgent: (req as any).userAgent });
    res.status(201).json({ campaign: data });
  } catch (err) {
    console.error("create campaign error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

adminRouter.put("/campaigns/:id", requireAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const db = requireService();
    const { title, description, goal, slug, currency, starts_at, ends_at } = req.body;
    const updates: Record<string, any> = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (goal !== undefined) updates.goal = goal;
    if (slug !== undefined) updates.slug = slug;
    if (currency !== undefined) updates.currency = currency;
    if (starts_at !== undefined) updates.starts_at = starts_at;
    if (ends_at !== undefined) updates.ends_at = ends_at;

    const { data, error } = await db.from("campaigns").update(updates).eq("id", req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });

    const admin = (req as any).admin;
    await logAudit({ adminId: admin.id, action: "update_campaign", resourceType: "campaign", resourceId: data.id, ipAddress: (req as any).adminIp, userAgent: (req as any).userAgent });
    res.json({ campaign: data });
  } catch (err) {
    console.error("update campaign error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

adminRouter.post("/campaigns/:id/activate", requireAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const db = requireService();
    const { data: campaign } = await db.from("campaigns").select("id, title").eq("id", req.params.id).single();
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    await db.from("settings").upsert({ key: "active_campaign_id", value: req.params.id }, { onConflict: "key" });

    const admin = (req as any).admin;
    await logAudit({ adminId: admin.id, action: "activate_campaign", resourceType: "campaign", resourceId: req.params.id, details: { title: campaign.title }, ipAddress: (req as any).adminIp, userAgent: (req as any).userAgent });
    res.json({ ok: true, campaign: { id: campaign.id, title: campaign.title } });
  } catch (err) {
    console.error("activate campaign error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Database Backup ──

adminRouter.post("/backup", requireAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const db = requireService();

    // Export all key tables
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

    // Store in Supabase backups table
    const { error } = await db.from("backups").insert(backupRecord).single();
    if (error) {
      console.error("backup insert error:", error);
      return res.status(500).json({ error: error.message });
    }

    // Try git backup via GitHub API if token is configured
    let gitResult: any = { pushed: false, reason: "no token" };
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO || process.env.VERCEL_GIT_REPO_SLUG;
    if (githubToken && githubRepo) {
      try {
        const backupDir = "backups";
        const filename = `${backupDir}/${now.slice(0, 10)}-${backupId.slice(0, 8)}.json`;
        const content = Buffer.from(JSON.stringify(dump, null, 2)).toString("base64");

        // Check if file exists to get its SHA
        const getRes = await fetch(`https://api.github.com/repos/${githubRepo}/contents/${filename}`, {
          headers: { Authorization: `Bearer ${githubToken}` },
        });
        const existingSha = getRes.ok ? (await getRes.json()).sha : undefined;

        // Commit the backup file
        const commitRes = await fetch(`https://api.github.com/repos/${githubRepo}/contents/${filename}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${githubToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `backup: ${now.slice(0, 10)} - ${Object.keys(dump).join(", ")} data dump`,
            content,
            sha: existingSha,
            branch: "backups",
          }),
        });
        gitResult = await commitRes.json();

        // Also update a latest.json pointer
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
      } catch (gitErr: any) {
        gitResult = { error: (gitErr as Error).message };
      }
    }

    const admin = (req as any).admin;
    await logAudit({ adminId: admin.id, action: "backup", details: { backupId, tables: Object.keys(dump), git: gitResult.pushed }, ipAddress: (req as any).adminIp, userAgent: (req as any).userAgent });

    res.json({ ok: true, backup_id: backupId, created_at: now, summary: backupRecord.summary, git: gitResult.pushed ? { pushed: true } : gitResult });
  } catch (err) {
    console.error("backup error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

adminRouter.get("/backups", requireAdmin, requireSuperAdmin, async (_req, res) => {
  try {
    const db = requireService();
    const { data } = await db.from("backups").select("id, created_at, summary").order("created_at", { ascending: false }).limit(30);
    res.json({ backups: data || [] });
  } catch (err) {
    console.error("list backups error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Paginated SMS Logs ──

adminRouter.get("/sms-logs", requireAdmin, async (req, res) => {
  try {
    const db = requireService();
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Number(req.query.offset) || 0;
    const context = req.query.context as string | undefined;

    let query = db.from("sms_logs").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (context) query = query.eq("context", context);

    const { data, count, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    res.json({ logs: data || [], total: count || 0, limit, offset });
  } catch (err) {
    console.error("sms logs error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

adminRouter.get("/sms-log-contexts", requireAdmin, async (_req, res) => {
  try {
    const db = requireService();
    const { data } = await db.from("sms_logs").select("context").order("created_at", { ascending: false }).limit(1000);
    const contexts = [...new Set((data || []).map((l: any) => l.context).filter(Boolean))];
    res.json({ contexts });
  } catch (err) {
    console.error("sms contexts error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
