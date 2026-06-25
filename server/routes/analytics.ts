import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import { requireAdmin, logAudit } from "../lib/admin.js";
import { cacheGet, cacheSet, cacheKey } from "../lib/redis.js";

export const analyticsRouter = Router();

analyticsRouter.get("/dashboard", requireAdmin, async (req, res) => {
  try {
    const db = requireService();

    // Try cache first
    const cacheKeyStr = cacheKey("analytics", "dashboard", "v2");
    const cached = await cacheGet<any>(cacheKeyStr);
    if (cached) return res.json(cached);
    const now = new Date();
    const periods = {
      "7d": new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      "30d": new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      "90d": new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      "1y": new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
    };
    const prev30d = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const p30Start = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const p30End = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const { data: campaign } = await db
      .from("campaigns")
      .select("id")
      .eq("slug", "development-fund")
      .single();
    const campaignId = campaign?.id;

    const campaignFilter = (q: any) => campaignId ? q.eq("campaign_id", campaignId) : q;

    const [
      dailyData,
      prevData,
      topDonors,
      councilData,
      memberRanking,
      totals,
      pledgesData,
      memberCount,
      newMembers,
      genderCounts,
    ] = await Promise.all([
      // Current 90d daily data
      campaignFilter(db.from("donations")
        .select("amount, created_at")
        .eq("status", "completed")
        .gte("created_at", periods["90d"].toISOString())
        .order("created_at", { ascending: true })),

      // Previous 30d for comparison
      campaignFilter(db.from("donations")
        .select("amount")
        .eq("status", "completed")
        .gte("created_at", p30Start.toISOString())
        .lt("created_at", p30End.toISOString())),

      // Top donors
      campaignFilter(db.from("donations")
        .select("donor_name, amount")
        .eq("status", "completed")
        .not("donor_name", "is", null)
        .order("amount", { ascending: false })
        .limit(20)),

      // Council breakdown
      campaignFilter(db.from("donations")
        .select("amount, church_members!church_member_id!inner(council)")
        .eq("status", "completed")
        .not("church_member_id", "is", null)),

      // Member honour ranking
      campaignFilter(db.from("donations")
        .select("amount, church_member_id, church_members!church_member_id!inner(name, council)")
        .eq("status", "completed")
        .not("church_member_id", "is", null)),

      // All totals
      campaignFilter(db.from("donations")
        .select("amount", { count: "exact", head: false })
        .eq("status", "completed")),

      // Pledge stats
      db.from("pledges")
        .select("amount, paid, remaining, status"),

      // Member count
      db.from("church_members")
        .select("id", { count: "exact", head: false })
        .eq("is_active", true),

      // New members in last 30d
      db.from("church_members")
        .select("id", { count: "exact", head: false })
        .eq("is_active", true)
        .gte("created_at", periods["30d"].toISOString()),

      // Gender breakdown (fetch all active members with gender)
      db.from("church_members")
        .select("gender")
        .eq("is_active", true),
    ]);

    // ── Daily aggregation ──
    const dailyMap: Record<string, number> = {};
    for (const d of dailyData.data || []) {
      const day = (d.created_at as string).slice(0, 10);
      dailyMap[day] = (dailyMap[day] || 0) + Number(d.amount);
    }
    const daily = Object.entries(dailyMap)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ── Weekly aggregation ──
    const weeklyMap: Record<string, { total: number; count: number }> = {};
    for (const d of dailyData.data || []) {
      const dt = new Date(d.created_at as string);
      const weekStart = new Date(dt);
      weekStart.setDate(dt.getDate() - dt.getDay());
      const weekKey = weekStart.toISOString().slice(0, 10);
      if (!weeklyMap[weekKey]) weeklyMap[weekKey] = { total: 0, count: 0 };
      weeklyMap[weekKey].total += Number(d.amount);
      weeklyMap[weekKey].count += 1;
    }
    const weekly = Object.entries(weeklyMap)
      .map(([week, { total, count }]) => ({ week, total, count }))
      .sort((a, b) => a.week.localeCompare(b.week));

    // ── Monthly aggregation ──
    const monthlyMap: Record<string, { total: number; count: number }> = {};
    for (const d of dailyData.data || []) {
      const monthKey = (d.created_at as string).slice(0, 7);
      if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { total: 0, count: 0 };
      monthlyMap[monthKey].total += Number(d.amount);
      monthlyMap[monthKey].count += 1;
    }
    const monthly = Object.entries(monthlyMap)
      .map(([month, { total, count }]) => ({ month, total, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // ── Current 30d stats for KPI comparison ──
    const cur30Total = dailyData.data
      ?.filter((d: any) => new Date(d.created_at) >= periods["30d"])
      .reduce((s, d) => s + Number(d.amount), 0) || 0;
    const cur30Count = dailyData.data
      ?.filter((d: any) => new Date(d.created_at) >= periods["30d"])
      .length || 0;

    // Previous 30d window for same-period comparison
    const previousTotal = (prevData.data || []).reduce((s, d) => s + Number(d.amount), 0);
    const periodChange = previousTotal > 0 ? ((cur30Total - previousTotal) / previousTotal) * 100 : 0;

    const previousCount = (prevData.data || []).length;
    const countChange = previousCount > 0 ? ((cur30Count - previousCount) / previousCount) * 100 : 0;

    // ── Top donors ──
    const donorMap = new Map<string, { name: string; total: number }>();
    for (const d of topDonors.data || []) {
      const rawName = d.donor_name || "Anonymous";
      const key = rawName.toLowerCase().trim();
      if (donorMap.has(key)) {
        donorMap.get(key)!.total += Number(d.amount);
      } else {
        donorMap.set(key, { name: rawName, total: Number(d.amount) });
      }
    }
    const topDonorsList = Array.from(donorMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 20)
      .map(d => ({ name: d.name, amount: d.total }));

    // ── Per-fellowship member counts ──
    const { data: fellowshipMembers } = await db
      .from("church_members")
      .select("council, id")
      .eq("is_active", true);
    const memberCountMap: Record<string, number> = {};
    for (const m of fellowshipMembers || []) {
      const c = m.council || "unknown";
      memberCountMap[c] = (memberCountMap[c] || 0) + 1;
    }

    // ── Council breakdown (with counts) ──
    const councilMap: Record<string, { total: number; count: number }> = {};
    for (const d of councilData.data || []) {
      const council = (d as any).church_members?.council || "unknown";
      const amt = Number(d.amount);
      if (!councilMap[council]) councilMap[council] = { total: 0, count: 0 };
      councilMap[council].total += amt;
      councilMap[council].count += 1;
    }
    const councilBreakdown = Object.entries(councilMap)
      .map(([council, { total, count }]) => ({
        council,
        total,
        count,
        member_count: memberCountMap[council] || 0,
        avg_per_member: memberCountMap[council] ? Math.round(total / memberCountMap[council]) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // ── Member honour ranking ──
    const memberMap: Record<string, { name: string; council: string; total: number; count: number }> = {};
    for (const d of memberRanking.data || []) {
      const member = (d as any).church_members;
      const id = d.church_member_id as string;
      if (!memberMap[id]) {
        memberMap[id] = { name: member?.name || "Unknown", council: member?.council || "", total: 0, count: 0 };
      }
      memberMap[id].total += Number(d.amount);
      memberMap[id].count += 1;
    }
    const memberRankingList = Object.entries(memberMap)
      .map(([id, m]) => ({ id, ...m }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 30);

    // ── Overall totals ──
    const overallTotal = (totals.data || []).reduce((sum: number, d: any) => sum + Number(d.amount), 0);
    const overallCount = (totals.data || []).length;
    const avgGift = overallCount > 0 ? Math.round(overallTotal / overallCount) : 0;

    // ── Pledge analytics ──
    const pledges = pledgesData.data || [];
    const pledgeTotal = pledges.reduce((s, p) => s + Number(p.amount), 0);
    const pledgePaid = pledges.reduce((s, p) => s + Number(p.paid), 0);
    const pledgeRemaining = pledges.reduce((s, p) => s + Number(p.remaining), 0);
    const pledgeFulfilled = pledges.filter(p => p.status === "fulfilled").length;
    const pledgeActive = pledges.filter(p => p.status === "pending").length;
    const pledgeFulfillmentRate = pledgeTotal > 0 ? (pledgePaid / pledgeTotal) * 100 : 0;

    // ── Recent transactions ──
    let recentQuery = db.from("donations")
      .select("donor_name, amount, method, created_at, receipt_number")
      .eq("status", "completed")
      .not("donor_name", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);
    if (campaignId) recentQuery = recentQuery.eq("campaign_id", campaignId);
    const { data: recentDonations } = await recentQuery;

    // ── Donations by gender ──
    const { data: genderDonations } = await db
      .from("donations")
      .select("amount, church_members!church_member_id!inner(gender)")
      .eq("status", "completed")
      .not("church_member_id", "is", null);
    let maleContributions = 0, femaleContributions = 0, unsetContributions = 0;
    for (const d of genderDonations || []) {
      const gender = (d as any).church_members?.gender;
      const amt = Number(d.amount);
      if (gender === "male") maleContributions += amt;
      else if (gender === "female") femaleContributions += amt;
      else unsetContributions += amt;
    }

    // ── Payment method breakdown ──
    let methodQuery = db.from("donations").select("method, amount").eq("status", "completed");
    if (campaignId) methodQuery = methodQuery.eq("campaign_id", campaignId);
    const { data: methodData } = await methodQuery;

    const methodMap: Record<string, number> = {};
    for (const d of methodData || []) {
      const method = d.method || "unknown";
      methodMap[method] = (methodMap[method] || 0) + Number(d.amount);
    }
    const methodBreakdown = Object.entries(methodMap)
      .map(([method, total]) => ({ method, total }))
      .sort((a, b) => b.total - a.total);

    // ── Page views ──
    const { data: pageViews7d } = await db
      .from("page_views")
      .select("id", { count: "exact", head: false })
      .gte("created_at", periods["7d"].toISOString());
    const { data: pageViews30d } = await db
      .from("page_views")
      .select("id", { count: "exact", head: false })
      .gte("created_at", periods["30d"].toISOString());
    const { data: pageViewsLive } = await db
      .from("page_views")
      .select("id, path, page_title, created_at")
      .gte("created_at", periods["7d"].toISOString())
      .order("created_at", { ascending: false })
      .limit(20);

    // ── Page views daily trend (last 30d) ──
    const { data: pvTrend } = await db
      .from("page_views")
      .select("created_at")
      .gte("created_at", periods["30d"].toISOString())
      .order("created_at", { ascending: true });
    const pvDailyMap: Record<string, number> = {};
    for (const v of pvTrend || []) {
      const day = (v.created_at as string).slice(0, 10);
      pvDailyMap[day] = (pvDailyMap[day] || 0) + 1;
    }
    const pageViewsTrend = Object.entries(pvDailyMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ── Top pages (last 30d) ──
    const { data: topPagesRaw } = await db
      .from("page_views")
      .select("path, page_title")
      .gte("created_at", periods["30d"].toISOString());
    const pageCountMap: Record<string, { path: string; title: string; count: number }> = {};
    for (const p of topPagesRaw || []) {
      const key = p.path || "/";
      if (!pageCountMap[key]) pageCountMap[key] = { path: key, title: p.page_title || key, count: 0 };
      pageCountMap[key].count++;
    }
    const topPages = Object.values(pageCountMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ── Hourly breakdown (last 7d) ──
    const { data: hourlyRaw } = await db
      .from("page_views")
      .select("created_at")
      .gte("created_at", periods["7d"].toISOString());
    const hourlyMap: Record<number, number> = {};
    for (const v of hourlyRaw || []) {
      const h = new Date(v.created_at).getHours();
      hourlyMap[h] = (hourlyMap[h] || 0) + 1;
    }
    const hourlyBreakdown = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: hourlyMap[i] || 0,
    }));

    // ── Unique IPs ──
    const { data: ips7d } = await db
      .from("page_views")
      .select("ip_address")
      .gte("created_at", periods["7d"].toISOString())
      .not("ip_address", "is", null);
    const { data: ips30d } = await db
      .from("page_views")
      .select("ip_address")
      .gte("created_at", periods["30d"].toISOString())
      .not("ip_address", "is", null);
    const uniqueIps7d = new Set((ips7d || []).map((r: any) => r.ip_address)).size;
    const uniqueIps30d = new Set((ips30d || []).map((r: any) => r.ip_address)).size;

    // ── Browser / device breakdown (last 7d) ──
    const { data: uaRaw } = await db
      .from("page_views")
      .select("user_agent")
      .gte("created_at", periods["7d"].toISOString())
      .not("user_agent", "is", null);
    let mobile = 0, desktop = 0, tablet = 0, unknown = 0;
    for (const r of uaRaw || []) {
      const ua = (r.user_agent || "").toLowerCase();
      if (ua.includes("tablet") || ua.includes("ipad")) tablet++;
      else if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone") || ua.includes("ipod")) mobile++;
      else if (ua) desktop++;
      else unknown++;
    }

    // ── Login activity (last 30d) ──
    const { data: loginAudits } = await db
      .from("audit_logs")
      .select("action, created_at, admin_name, ip_address")
      .in("action", ["login", "failed_login"])
      .gte("created_at", periods["30d"].toISOString())
      .order("created_at", { ascending: true });
    const loginDailyMap: Record<string, { success: number; failed: number }> = {};
    for (const a of loginAudits || []) {
      const day = (a.created_at as string).slice(0, 10);
      if (!loginDailyMap[day]) loginDailyMap[day] = { success: 0, failed: 0 };
      if (a.action === "login") loginDailyMap[day].success++;
      else loginDailyMap[day].failed++;
    }
    const loginTrend = Object.entries(loginDailyMap)
      .map(([date, vals]) => ({ date, ...vals }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ── Recent logins ──
    const { data: recentLogins } = await db
      .from("audit_logs")
      .select("action, created_at, admin_name, ip_address")
      .in("action", ["login", "failed_login"])
      .gte("created_at", periods["7d"].toISOString())
      .order("created_at", { ascending: false })
      .limit(20);

    // ── Audit log count ──
    const { count: auditCount } = await db
      .from("audit_logs")
      .select("id", { count: "exact", head: false });

    await logAudit({
      adminId: (req as any).admin.id,
      action: "view_dashboard_analytics",
      ipAddress: (req as any).adminIp,
    });

    // Harambee event info
    const { data: harambeeSetting } = await db.from("settings").select("*").eq("key", "harambee_date").single();
    const harambeeDateStr = harambeeSetting?.value || "2026-09-27";
    const harambeeEventDate = new Date(harambeeDateStr + "T23:59:59+03:00");
    const harambeeDiffMs = harambeeEventDate.getTime() - Date.now();
    const harambeeDaysRemaining = Math.max(0, Math.ceil(harambeeDiffMs / (1000 * 60 * 60 * 24)));

    const result = {
      system: {
        audit_logs_total: auditCount || 0,
        page_views_7d: pageViews7d?.count || 0,
        page_views_30d: pageViews30d?.count || 0,
        page_views_live: (pageViewsLive?.data || []).map((v: any) => ({
          path: v.path,
          title: v.page_title,
          viewed_at: v.created_at,
        })),
      },
      usage: {
        page_views_trend: pageViewsTrend,
        top_pages: topPages,
        hourly_breakdown: hourlyBreakdown,
        unique_visitors_7d: uniqueIps7d,
        unique_visitors_30d: uniqueIps30d,
        browser_breakdown: { mobile, desktop, tablet, unknown },
        login_trend: loginTrend,
        recent_logins: (recentLogins || []).map((r: any) => ({
          action: r.action,
          admin_name: r.admin_name,
          ip_address: r.ip_address,
          created_at: r.created_at,
        })),
      },
      kpis: {
        current30d_total: cur30Total,
        current30d_count: cur30Count,
        total_raised: overallTotal,
        total_donations: overallCount,
        avg_gift: avgGift,
        period_change: Math.round(periodChange * 10) / 10,
        count_change: Math.round(countChange * 10) / 10,
      },
      trends: {
        daily,
        weekly,
        monthly,
      },
      breakdowns: {
        council: councilBreakdown,
        method: methodBreakdown,
        top_donors: topDonorsList,
      },
      recent_transactions: (recentDonations || []).map((d: any) => ({
        donor_name: d.donor_name,
        amount: Number(d.amount),
        method: d.method,
        created_at: d.created_at,
      })),
      members: {
        total: memberCount.count || 0,
        new_30d: newMembers.count || 0,
        ranking: memberRankingList,
        gender: {
          male: (genderCounts.data || []).filter((g: any) => g.gender === "male").length,
          female: (genderCounts.data || []).filter((g: any) => g.gender === "female").length,
          unset: (genderCounts.data || []).filter((g: any) => !g.gender).length,
        },
        gender_contributions: {
          male: Math.round(maleContributions),
          female: Math.round(femaleContributions),
          unset: Math.round(unsetContributions),
        },
      },
      pledges: {
        total: pledgeTotal,
        paid: pledgePaid,
        remaining: pledgeRemaining,
        fulfilled: pledgeFulfilled,
        active: pledgeActive,
        fulfillment_rate: Math.round(pledgeFulfillmentRate * 10) / 10,
      },
      harambee: {
        date: harambeeDateStr,
        days_remaining: harambeeDaysRemaining,
        passed: harambeeDiffMs < 0,
      },
    };

    // Cache for 60 seconds
    await cacheSet(cacheKeyStr, result, 60);

    res.json(result);
  } catch (err) {
    console.error("analytics dashboard error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
