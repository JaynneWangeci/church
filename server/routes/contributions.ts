import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import { requireAdmin, logAudit } from "../lib/admin.js";
import { cacheGet, cacheSet, cacheKey, invalidateOnChange } from "../lib/redis.js";

export const contributionsRouter = Router();

contributionsRouter.get("/analytics", requireAdmin, async (req, res) => {
  try {
    const db = requireService();

    // Try Redis cache first
    const cacheKeyStr = cacheKey("analytics", "contributions");
    const cached = await cacheGet<any>(cacheKeyStr);
    if (cached) return res.json(cached);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [dailyData, topDonors, councilData, memberRanking, totals] = await Promise.all([
      db.from("donations")
        .select("amount, created_at")
        .eq("status", "completed")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true }),

      db.from("donations")
        .select("donor_name, amount")
        .eq("status", "completed")
        .not("donor_name", "is", null)
        .order("amount", { ascending: false })
        .limit(20),

      db.from("donations")
        .select("amount, church_members!church_member_id!inner(council)")
        .eq("status", "completed")
        .not("church_member_id", "is", null),

      db.from("donations")
        .select("amount, church_member_id, church_members!church_member_id!inner(name, council)")
        .eq("status", "completed")
        .not("church_member_id", "is", null),

      db.from("donations")
        .select("amount", { count: "exact", head: false })
        .eq("status", "completed"),
    ]);

    const dailyMap: Record<string, number> = {};
    for (const d of dailyData.data || []) {
      const day = (d.created_at as string).slice(0, 10);
      dailyMap[day] = (dailyMap[day] || 0) + Number(d.amount);
    }
    const daily = Object.entries(dailyMap).map(([date, total]) => ({ date, total }));

    const topDonorsList = (topDonors.data || []).map((d: any) => ({
      name: d.donor_name,
      amount: Number(d.amount),
    }));

    const councilMap: Record<string, number> = {};
    for (const d of councilData.data || []) {
      const council = (d as any).church_members?.council || "unknown";
      councilMap[council] = (councilMap[council] || 0) + Number(d.amount);
    }
    const councilBreakdown = Object.entries(councilMap)
      .map(([council, total]) => ({ council, total }))
      .sort((a, b) => b.total - a.total);

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

    const overallTotal = (totals.data || []).reduce((sum: number, d: any) => sum + Number(d.amount), 0);
    const overallCount = (totals.data || []).length;

    const admin = (req as any).admin;
    await logAudit({
      adminId: admin.id,
      action: "view_stats",
      ipAddress: (req as any).adminIp,
    });

    const result = {
      daily,
      top_donors: topDonorsList,
      council_breakdown: councilBreakdown,
      member_ranking: memberRankingList,
      overall_total: overallTotal,
      overall_count: overallCount,
    };

    // Cache for 60 seconds
    await cacheSet(cacheKeyStr, result, 60);

    res.json(result);
  } catch (err) {
    console.error("analytics error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

contributionsRouter.get("/export/ppt", requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).admin;
    if (admin.role === "viewer") return res.status(403).json({ error: "Viewers cannot export" });

    const PptxGenJS = (await import("pptxgenjs")).default;
    const db = requireService();

    const { data: donations } = await db
      .from("donations")
      .select("id, donor_name, amount, method, status, receipt_number, message, created_at, church_members(name, council)")
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    const total = (donations || []).reduce((s, d) => s + Number(d.amount), 0);
    const count = (donations || []).length;

    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";

    const slide1 = pptx.addSlide();
    slide1.background = { fill: "1f2a1d" };
    slide1.addText("AIPCA Bahati Cathedral", { x: 0.5, y: 0.5, w: 9, h: 0.6, fontSize: 14, color: "C4964A", bold: true });
    slide1.addText("Harambee Contribution Report", { x: 0.5, y: 1.2, w: 9, h: 0.8, fontSize: 28, color: "FFFFFF", bold: true });
    slide1.addText(`Generated: ${new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`, { x: 0.5, y: 2.2, w: 9, h: 0.4, fontSize: 12, color: "AAAAAA" });
    slide1.addText(`Total Raised: KES ${total.toLocaleString("en-KE")}`, { x: 0.5, y: 3.0, w: 9, h: 0.5, fontSize: 18, color: "C4964A", bold: true });
    slide1.addText(`Total Donations: ${count}`, { x: 0.5, y: 3.6, w: 9, h: 0.4, fontSize: 14, color: "FFFFFF" });

    const headers = ["Donor", "Amount (KES)", "Method", "Status", "Receipt", "Date"];
    const rows = (donations || []).slice(0, 50).map((d: any) => [
      d.donor_name || "Anonymous",
      `KES ${Number(d.amount).toLocaleString("en-KE")}`,
      d.method || "—",
      d.status || "—",
      d.receipt_number || "—",
      new Date(d.created_at).toLocaleDateString("en-KE"),
    ]);

    const slide2 = pptx.addSlide();
    slide2.background = { fill: "FFFFFF" };
    slide2.addText("Recent Donations (last 50)", { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 16, color: "1f2a1d", bold: true });
    slide2.addTable(rows, {
      x: 0.3, y: 1, w: 9.4,
      colW: [2, 1.5, 1, 1, 1.5, 2],
      fontSize: 9,
      color: "333333",
      border: { type: "solid", color: "CCCCCC", pt: 0.5 },
      headerRow: { fill: { fill: "1f2a1d" }, color: "FFFFFF", bold: true },
      rowH: 0.35,
    });

    const buf = await pptx.write({ outputType: "nodebuffer" });

    await logAudit({
      adminId: admin.id,
      action: "export_ledger",
      details: { type: "ppt", count: donations?.length },
      ipAddress: (req as any).adminIp,
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    res.setHeader("Content-Disposition", `attachment; filename=harambee-report-${new Date().toISOString().slice(0, 10)}.pptx`);
    res.send(buf);
  } catch (err) {
    console.error("ppt export error:", err);
    res.status(500).json({ error: "Export failed" });
  }
});

contributionsRouter.get("/export/pdf", requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).admin;
    if (admin.role === "viewer") return res.status(403).json({ error: "Viewers cannot export" });

    const PDFDocument = (await import("pdfkit")).default;
    const db = requireService();

    const { data: donations } = await db
      .from("donations")
      .select("id, donor_name, amount, method, status, receipt_number, message, created_at, honored_member_id, church_members!honored_member_id(name), church_members!church_member_id(name, council)")
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    const total = (donations || []).reduce((s, d) => s + Number(d.amount), 0);
    const count = (donations || []).length;
    const avg = count > 0 ? Math.round(total / count) : 0;
    const topDonor = (donations || []).reduce((best, d) => Number(d.amount) > Number(best?.amount || 0) ? d : best, null);
    const genDate = new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    // Group by honoured member
    const honourGroups = new Map<string, { name: string; donations: any[]; total: number }>();
    const ungrouped: any[] = [];
    for (const d of donations || []) {
      const honoured = d.honored_member_id ? (d as any).church_members?.[0]?.name : null;
      if (honoured) {
        if (!honourGroups.has(honoured)) honourGroups.set(honoured, { name: honoured, donations: [], total: 0 });
        const g = honourGroups.get(honoured)!;
        g.donations.push(d);
        g.total += Number(d.amount);
      } else {
        ungrouped.push(d);
      }
    }

    const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: "Harambee Contribution Report", Author: "AIPCA Bahati Cathedral" } });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", async () => {
      const pdf = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=harambee-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      res.send(pdf);
      await logAudit({
        adminId: admin.id,
        action: "export_ledger",
        details: { type: "pdf", count: donations?.length },
        ipAddress: (req as any).adminIp,
      });
    });

    const pw = doc.page.width - 100;
    const m = 50;
    let pageNum = 0;

    function addFooter() {
      pageNum++;
      doc.fontSize(7).fillColor("#6B7280");
      doc.text(`AIPCA Bahati Cathedral — Harambee Report | Generated ${genDate} | Page ${pageNum}`, m, doc.page.height - 40, { align: "center", width: pw });
      doc.rect(m, doc.page.height - 45, pw, 0.5).fill("#3B82F6");
    }
    doc.on("pageAdded", addFooter);

    // ── Cover Header ──
    doc.rect(m, 30, pw, 4).fill("#1E3A5F");
    doc.rect(m, 34, pw, 1.5).fill("#3B82F6");
    doc.moveDown(3);
    doc.fontSize(24).font("Helvetica-Bold").fillColor("#1E3A5F").text("AIPCA Bahati Cathedral", { align: "center" });
    doc.fontSize(14).fillColor("#3B82F6").text("Harambee Contribution Report", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(8).fillColor("#6B7280").text(`Prepared on ${genDate}`, { align: "center" });
    doc.moveDown(0.5);

    // ── Summary line ──
    const summaryData = [
      { label: "Total Raised", value: `KES ${total.toLocaleString("en-KE")}` },
      { label: "Donations", value: `${count}` },
      { label: "Average", value: `KES ${avg.toLocaleString("en-KE")}` },
      { label: "Top Gift", value: topDonor ? `KES ${Number(topDonor.amount).toLocaleString("en-KE")}` : "—" },
    ];
    const cw = (pw - 30) / 4;
    const cy = doc.y;
    summaryData.forEach((c, i) => {
      const cx = m + i * (cw + 10);
      doc.roundedRect(cx, cy, cw, 40, 4).fill("#EFF6FF").lineWidth(0.5).stroke("#BFDBFE");
      doc.fontSize(6).font("Helvetica").fillColor("#6B7280").text(c.label.toUpperCase(), cx + 6, cy + 6, { width: cw - 12, align: "center" });
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#1E3A5F").text(c.value, cx + 6, cy + 18, { width: cw - 12, align: "center" });
    });
    doc.y = cy + 50;

    function drawTableHeader(ypos: number) {
      doc.fontSize(8).font("Helvetica-Bold").fillColor("FFFFFF");
      const hdrs = ["Donor", "Amount", "Method", "Receipt", "Date"];
      const cws = [pw * 0.24, pw * 0.14, pw * 0.14, pw * 0.22, pw * 0.26];
      let xp = m;
      doc.rect(m, ypos, pw, 14).fill("#1E3A5F");
      hdrs.forEach((h, i) => { doc.text(h, xp + 3, ypos + 3, { width: cws[i], align: i === 1 ? "right" : "left" }); xp += cws[i]; });
      return { y: ypos + 14, widths: cws };
    }

    function checkPage(ypos: number): number {
      if (ypos <= doc.page.height - 60) return ypos;
      doc.addPage();
      const { y: ny } = drawTableHeader(50);
      return ny;
    }

    let { y: curY, widths: colW } = drawTableHeader(doc.y);

    // ── Honour groups ──
    doc.font("Helvetica").fontSize(8).fillColor("#374151");
    for (const [honouredName, group] of honourGroups) {
      curY = checkPage(curY + 2);
      doc.rect(m, curY - 2, pw, 14).fill("#EFF6FF");
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#1E3A5F");
      doc.text(`★ ${honouredName}`, m + 4, curY + 2);
      doc.text(`Total: KES ${group.total.toLocaleString("en-KE")}`, m + pw - 80, curY + 2, { width: 80, align: "right" });
      curY += 14;
      for (const d of (group.donations || []).slice(0, 10)) {
        curY = checkPage(curY + 2);
        const vals = [
          (d.donor_name || "Anonymous").slice(0, 20),
          `${Number(d.amount).toLocaleString("en-KE")}`,
          d.method || "—",
          (d.receipt_number || "—").slice(0, 12),
          new Date(d.created_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short" }),
        ];
        const bg = curY % 2 === 0 ? "#FFFFFF" : "#F9FAFB";
        doc.rect(m, curY - 1, pw, 13).fill(bg);
        doc.font("Helvetica").fontSize(7).fillColor("#6B7280");
        let xp = m;
        vals.forEach((v, i) => { doc.text(v, xp + 3, curY, { width: colW[i], align: i === 1 ? "right" : "left" }); xp += colW[i]; });
        curY += 13;
      }
    }

    // ── Ungrouped / general donations ──
    if (ungrouped.length) {
      curY = checkPage(curY + 2);
      doc.rect(m, curY - 2, pw, 14).fill("#F3F4F6");
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#374151");
      doc.text(`General Harambee Fund`, m + 4, curY + 2);
      curY += 14;
      for (const d of ungrouped.slice(0, 50)) {
        curY = checkPage(curY + 2);
        const vals = [
          (d.donor_name || "Anonymous").slice(0, 20),
          `${Number(d.amount).toLocaleString("en-KE")}`,
          d.method || "—",
          (d.receipt_number || "—").slice(0, 12),
          new Date(d.created_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short" }),
        ];
        const bg = curY % 2 === 0 ? "#FFFFFF" : "#F9FAFB";
        doc.rect(m, curY - 1, pw, 13).fill(bg);
        doc.font("Helvetica").fontSize(7).fillColor("#6B7280");
        let xp = m;
        vals.forEach((v, i) => { doc.text(v, xp + 3, curY, { width: colW[i], align: i === 1 ? "right" : "left" }); xp += colW[i]; });
        curY += 13;
      }
    }

    // ── Bottom summary ──
    curY = checkPage(curY + 10);
    doc.rect(m, curY, pw, 0.5).fill("#3B82F6");
    curY += 10;
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#1E3A5F").text("Report Summary", { align: "center" });
    curY += 14;
    doc.fontSize(8).font("Helvetica").fillColor("#6B7280");
    const summaryLines = [
      `Total donations: ${count}`,
      `Total amount raised: KES ${total.toLocaleString("en-KE")}`,
      `Average contribution: KES ${avg.toLocaleString("en-KE")}`,
    ];
    if (topDonor?.donor_name) summaryLines.push(`Highest: KES ${Number(topDonor.amount).toLocaleString("en-KE")} by ${topDonor.donor_name}`);
    summaryLines.forEach(l => { doc.text(l, m, curY, { align: "center" }); curY += 12; });
    curY += 6;
    doc.fontSize(7).fillColor("#9CA3AF").text("— End of Report —", { align: "center" });
    doc.end();
  } catch (err) {
    console.error("pdf export error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Export failed" });
  }
});

contributionsRouter.get("/export/xlsx", requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).admin;
    if (admin.role === "viewer") return res.status(403).json({ error: "Viewers cannot export" });

    const ExcelJS = (await import("exceljs")).default;
    const db = requireService();

    const { data: donations } = await db
      .from("donations")
      .select("id, donor_name, amount, method, status, receipt_number, phone, message, created_at, honored_member_id, church_member_id, church_members!church_member_id(name, council, gender), honoured:church_members!honored_member_id(name, council)")
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    const { data: pledges } = await db
      .from("pledges")
      .select("*")
      .order("amount", { ascending: false });

    const { data: memberData } = await db
      .from("church_members")
      .select("*")
      .eq("is_active", true)
      .order("name");

    const { data: councilData } = await db
      .from("councils")
      .select("*")
      .eq("is_active", true);

    const wb = new ExcelJS.Workbook();
    wb.creator = "AIPCA Bahati Cathedral";
    wb.created = new Date();
    const dark = "1E3A5F";
    const gold = "C4964A";

    const completed = donations || [];
    const totalRaised = completed.reduce((s, d) => s + Number(d.amount), 0);
    const donationCount = completed.length;
    const avgGift = donationCount > 0 ? Math.round(totalRaised / donationCount) : 0;
    const totalPledges = (pledges || []).reduce((s, p) => s + Number(p.amount), 0);
    const paidPledges = (pledges || []).reduce((s, p) => s + Number(p.paid), 0);
    const memberCount = (memberData || []).length;
    const uniqueDonors = new Set(completed.map(d => d.donor_name?.toLowerCase().trim()).filter(Boolean)).size;

    // ── Helpers ──
    function styleHeader(ws: ExcelJS.Worksheet, row: ExcelJS.Row) {
      row.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: dark.replace("#", "") } };
      row.alignment = { vertical: "middle", horizontal: "center" };
      row.height = 22;
    }

    function autoCols(ws: ExcelJS.Worksheet, widths: number[]) {
      ws.columns = widths.map((w, i) => ({ key: i.toString(), width: w }));
    }

    function addTitleRow(ws: ExcelJS.Worksheet, text: string, mergeTo: string, rowNum: number) {
      ws.mergeCells(`A${rowNum}:${mergeTo}${rowNum}`);
      const r = ws.getRow(rowNum);
      r.getCell(1).value = text;
      r.font = { bold: true, size: 14, color: { argb: dark.replace("#", "") } };
      r.alignment = { horizontal: "center", vertical: "middle" };
      r.height = 28;
    }

    function addSubtitleRow(ws: ExcelJS.Worksheet, text: string, mergeTo: string, rowNum: number) {
      ws.mergeCells(`A${rowNum}:${mergeTo}${rowNum}`);
      const r = ws.getRow(rowNum);
      r.getCell(1).value = text;
      r.font = { italic: true, size: 10, color: { argb: "6B7280" } };
      r.alignment = { horizontal: "center" };
    }

    function addBorder(ws: ExcelJS.Worksheet, startRow: number, endRow: number, colCount: number) {
      const thin = { style: "thin" as const, color: { argb: "D1D5DB" } };
      for (let r = startRow; r <= endRow; r++) {
        for (let c = 1; c <= colCount; c++) {
          ws.getRow(r).getCell(c).border = { top: thin, bottom: thin, left: thin, right: thin };
        }
      }
    }

    function fmtKES(val: number) { return `KES ${val.toLocaleString("en-KE")}`; }

    // ══════════════════════════════════════════════════════════════
    // SHEET 1 — EXECUTIVE SUMMARY
    // ══════════════════════════════════════════════════════════════
    const s1 = wb.addWorksheet("Executive Summary");
    autoCols(s1, [4, 28, 22, 28, 22, 4]);
    addTitleRow(s1, "AIPCA BAHATI CATHEDRAL — HARAMBEE DEVELOPMENT FUND", "F", 1);
    addSubtitleRow(s1, `Executive Audit Report — Generated ${new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}`, "F", 2);

    const genRow = 3;
    s1.getRow(genRow).values = ["", `Report prepared for: ${admin.name} (${admin.role.replace("_", " ")})`, "", "", "", ""];
    s1.getRow(genRow).font = { italic: true, size: 9, color: { argb: "9CA3AF" } };
    s1.mergeCells(`B${genRow}:E${genRow}`);

    // Key Performance Indicators
    const kpiRow = 5;
    s1.getRow(kpiRow).values = ["", "KEY PERFORMANCE INDICATORS", "", "", "", ""];
    s1.mergeCells(`B${kpiRow}:E${kpiRow}`);
    s1.getRow(kpiRow).font = { bold: true, size: 12, color: { argb: dark.replace("#", "") } };

    const metrics = [
      ["💰 Total Raised", fmtKES(totalRaised), "📊 Total Transactions", donationCount.toString()],
      ["📈 Average Gift", fmtKES(avgGift), "👥 Unique Donors", uniqueDonors.toString()],
      ["📋 Total Pledged", fmtKES(totalPledges), "✅ Pledge Fulfillment", `${totalPledges > 0 ? ((paidPledges / totalPledges) * 100).toFixed(1) : "0.0"}%`],
      ["💳 Paid on Pledges", fmtKES(paidPledges), "⏳ Outstanding Pledges", fmtKES(totalPledges - paidPledges)],
      ["🏛️ Church Members", memberCount.toString(), "🔰 Active Fellowships", (councilData || []).length.toString()],
      ["📅 Campaign Period", completed.length > 0 ? `${new Date(completed[completed.length-1].created_at).toLocaleDateString("en-KE")} – ${new Date(completed[0].created_at).toLocaleDateString("en-KE")}` : "—", "📄 Report Coverage", `${donationCount} donations recorded`],
    ];

    let sr = 6;
    s1.getRow(sr).values = ["#", "Metric", "Value", "Metric", "Value", ""];
    styleHeader(s1, s1.getRow(sr));
    const metricStart = sr + 1;
    metrics.forEach((m, i) => {
      const r = s1.getRow(sr + i + 1);
      r.values = [i + 1, m[0], m[1], m[2], m[3], ""];
      r.getCell(2).font = { bold: true, size: 10 };
      r.getCell(4).font = { bold: true, size: 10 };
      r.height = 22;
      if (i % 2 === 0) r.eachCell((c: any) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F0F7FF" } }; });
    });
    addBorder(s1, metricStart, metricStart + metrics.length - 1, 5);

    // Fellowship summary
    const councilSummary: Record<string, { total: number; count: number; members: number }> = {};
    for (const d of completed) {
      const m = (d as any).church_members;
      const c = m?.council || "Unassigned";
      if (!councilSummary[c]) councilSummary[c] = { total: 0, count: 0, members: 0 };
      councilSummary[c].total += Number(d.amount);
      councilSummary[c].count += 1;
    }
    for (const mem of memberData || []) {
      const c = mem.council || "Unassigned";
      if (!councilSummary[c]) councilSummary[c] = { total: 0, count: 0, members: 0 };
      councilSummary[c].members += 1;
    }

    const fs = sr + metrics.length + 2;
    addTitleRow(s1, "FELLOWSHIP CONTRIBUTION SUMMARY", "F", fs);
    const fh = fs + 1;
    s1.getRow(fh).values = ["#", "Fellowship", "Total Raised (KES)", "Donations", "Members", "Avg/Member (KES)"];
    styleHeader(s1, s1.getRow(fh));

    const sortedCouncils = Object.entries(councilSummary).sort((a, b) => b[1].total - a[1].total);
    let grandTotal = 0, grandCount = 0, grandMembers = 0;
    sortedCouncils.forEach(([name, data], i) => {
      const r = s1.getRow(fh + 1 + i);
      const avg = data.members > 0 ? Math.round(data.total / data.members) : 0;
      r.values = [i + 1, name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()), data.total, data.count, data.members, avg];
      r.getCell(3).numFmt = '#,##0';
      r.getCell(6).numFmt = '#,##0';
      r.height = 20;
      if (i % 2 === 0) r.eachCell((c: any) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F0F7FF" } }; });
      grandTotal += data.total; grandCount += data.count; grandMembers += data.members;
    });
    const ft = fh + 1 + sortedCouncils.length;
    const totalRow = s1.getRow(ft);
    totalRow.values = ["", "TOTAL", grandTotal, grandCount, grandMembers, Math.round(grandTotal / Math.max(grandMembers, 1))];
    totalRow.font = { bold: true, color: { argb: dark.replace("#", "") }, size: 11 };
    totalRow.eachCell((c: any) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E8EDF2" } }; });
    totalRow.getCell(3).numFmt = '#,##0';
    totalRow.getCell(6).numFmt = '#,##0';
    addBorder(s1, fh, ft, 6);
    s1.views = [{ state: "frozen", ySplit: fs }];

    // ══════════════════════════════════════════════════════════════
    // SHEET 2 — PAYMENT METHOD ANALYSIS
    // ══════════════════════════════════════════════════════════════
    const s2 = wb.addWorksheet("Method Analysis");
    autoCols(s2, [4, 20, 16, 16, 16, 20]);
    addTitleRow(s2, "PAYMENT METHOD BREAKDOWN", "F", 1);
    addSubtitleRow(s2, "STK Push vs Paybill Direct analysis", "F", 2);

    const methodGroups: Record<string, { total: number; count: number }> = {};
    for (const d of completed) {
      const method = d.method || "unknown";
      if (!methodGroups[method]) methodGroups[method] = { total: 0, count: 0 };
      methodGroups[method].total += Number(d.amount);
      methodGroups[method].count += 1;
    }

    s2.getRow(4).values = ["#", "Payment Method", "Total Amount (KES)", "Transactions", "Percentage of Total", "Avg per Transaction (KES)"];
    styleHeader(s2, s2.getRow(4));
    const methodEntries = Object.entries(methodGroups).sort((a, b) => b[1].total - a[1].total);
    let mRow = 5;
    methodEntries.forEach(([method, data], i) => {
      const r = s2.getRow(mRow + i);
      const pct = totalRaised > 0 ? ((data.total / totalRaised) * 100).toFixed(1) : "0.0";
      const avg = data.count > 0 ? Math.round(data.total / data.count) : 0;
      r.values = [i + 1, method.toUpperCase(), data.total, data.count, `${pct}%`, avg];
      r.getCell(3).numFmt = '#,##0';
      r.getCell(6).numFmt = '#,##0';
      r.height = 20;
      if (i % 2 === 0) r.eachCell((c: any) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E0F2FE" } }; });
    });
    const methodTotalRow = mRow + methodEntries.length;
    s2.getRow(methodTotalRow).values = ["", "TOTAL", totalRaised, donationCount, "100%", avgGift];
    s2.getRow(methodTotalRow).font = { bold: true, color: { argb: dark.replace("#", "") } };
    s2.getRow(methodTotalRow).eachCell((c: any) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "DBEAFE" } }; });
    addBorder(s2, 4, methodTotalRow, 6);

    // STK vs Paybill daily breakdown
    const stkVsPaybill: Record<string, { stk: number; paybill: number; stkCount: number; paybillCount: number }> = {};
    for (const d of completed) {
      const day = d.created_at?.slice(0, 10) || "unknown";
      if (!stkVsPaybill[day]) stkVsPaybill[day] = { stk: 0, paybill: 0, stkCount: 0, paybillCount: 0 };
      if (d.method === "mpesa") { stkVsPaybill[day].stk += Number(d.amount); stkVsPaybill[day].stkCount += 1; }
      else { stkVsPaybill[day].paybill += Number(d.amount); stkVsPaybill[day].paybillCount += 1; }
    }

    const dailyRows = methodTotalRow + 3;
    addTitleRow(s2, "DAILY METHOD COMPARISON (Last 30 Days)", "F", dailyRows);
    s2.getRow(dailyRows + 1).values = ["#", "Date", "STK Push (KES)", "STK Txns", "Paybill (KES)", "Paybill Txns"];
    styleHeader(s2, s2.getRow(dailyRows + 1));
    const sortedDays = Object.entries(stkVsPaybill).sort(([a], [b]) => a.localeCompare(b)).slice(-30);
    sortedDays.forEach(([day, data], i) => {
      const r = s2.getRow(dailyRows + 2 + i);
      r.values = [i + 1, day, data.stk, data.stkCount, data.paybill, data.paybillCount];
      if (i % 2 === 0) r.eachCell((c: any) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F0F7FF" } }; });
    });

    // ══════════════════════════════════════════════════════════════
    // SHEET 3 — GENDER CONTRIBUTIONS
    // ══════════════════════════════════════════════════════════════
    const s3 = wb.addWorksheet("Gender Analysis");
    autoCols(s3, [4, 18, 18, 14, 14, 18]);
    addTitleRow(s3, "GENDER-BASED CONTRIBUTION ANALYSIS", "F", 1);
    addSubtitleRow(s3, "Men vs Women giving comparison across all fellowships", "F", 2);

    const genderTotals: Record<string, { total: number; count: number }> = { male: { total: 0, count: 0 }, female: { total: 0, count: 0 } };
    const genderCouncil: Record<string, Record<string, { total: number; count: number; members: Set<string> }>> = {};
    for (const d of completed) {
      const m = (d as any).church_members;
      const gender = m?.gender || "unknown";
      if (!genderTotals[gender]) genderTotals[gender] = { total: 0, count: 0 };
      genderTotals[gender].total += Number(d.amount);
      genderTotals[gender].count += 1;
      const council = m?.council || "Unassigned";
      if (!genderCouncil[council]) genderCouncil[council] = {};
      if (!genderCouncil[council][gender]) genderCouncil[council][gender] = { total: 0, count: 0, members: new Set() };
      genderCouncil[council][gender].total += Number(d.amount);
      genderCouncil[council][gender].count += 1;
    }
    for (const mem of memberData || []) {
      const g = mem.gender || "unknown";
      if (genderCouncil[mem.council]?.[g]) genderCouncil[mem.council][g].members.add(mem.id);
    }

    s3.getRow(4).values = ["#", "Gender", "Total Donated (KES)", "Transactions", "Members", "Avg per Person (KES)"];
    styleHeader(s3, s3.getRow(4));
    const genderEntries = Object.entries(genderTotals).filter(([k]) => k !== "unknown").sort((a, b) => b[1].total - a[1].total);
    let gRow = 5;
    genderEntries.forEach(([gender, data], i) => {
      const memberIds = new Set<string>();
      for (const c of Object.values(genderCouncil)) {
        if (c[gender]) c[gender].members.forEach(id => memberIds.add(id));
      }
      const avg = memberIds.size > 0 ? Math.round(data.total / memberIds.size) : 0;
      const r = s3.getRow(gRow + i);
      r.values = [i + 1, gender === "male" ? "👨 Men" : "👩 Women", data.total, data.count, memberIds.size, avg];
      r.getCell(3).numFmt = '#,##0';
      r.getCell(6).numFmt = '#,##0';
      r.height = 20;
    });
    const gTotalRow = gRow + genderEntries.length;
    s3.getRow(gTotalRow).values = ["", "TOTAL", totalRaised, donationCount, memberCount, avgGift];
    s3.getRow(gTotalRow).font = { bold: true, color: { argb: dark.replace("#", "") } };
    addBorder(s3, 4, gTotalRow, 6);

    // Gender by council
    const gcRow = gTotalRow + 3;
    addTitleRow(s3, "GENDER CONTRIBUTION BY FELLOWSHIP", "F", gcRow);
    s3.getRow(gcRow + 1).values = ["#", "Fellowship", "Men (KES)", "Women (KES)", "Difference", "Leading"];
    styleHeader(s3, s3.getRow(gcRow + 1));
    const councilGenderEntries = Object.entries(genderCouncil)
      .filter(([c]) => c !== "Unassigned")
      .sort((a, b) => {
        const aTotal = Object.values(a[1]).reduce((s: number, v: any) => s + v.total, 0);
        const bTotal = Object.values(b[1]).reduce((s: number, v: any) => s + v.total, 0);
        return bTotal - aTotal;
      });
    councilGenderEntries.forEach(([council, genders], i) => {
      const male = genders.male?.total || 0;
      const female = genders.female?.total || 0;
      const diff = Math.abs(male - female);
      const leading = male > female ? "Men" : female > male ? "Women" : "Equal";
      const r = s3.getRow(gcRow + 2 + i);
      r.values = [i + 1, council.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()), male, female, diff, leading];
      if (i % 2 === 0) r.eachCell((c: any) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F0F7FF" } }; });
    });

    // ══════════════════════════════════════════════════════════════
    // SHEET 4 — MONTHLY TRENDS
    // ══════════════════════════════════════════════════════════════
    const s4 = wb.addWorksheet("Monthly Trends");
    autoCols(s4, [4, 14, 16, 14, 14, 14, 14]);
    addTitleRow(s4, "MONTHLY DONATION TRENDS", "G", 1);
    addSubtitleRow(s4, "Month-by-month breakdown of all completed donations", "G", 2);

    const monthly: Record<string, { total: number; count: number; stk: number; paybill: number }> = {};
    for (const d of completed) {
      const m = d.created_at?.slice(0, 7) || "unknown";
      if (!monthly[m]) monthly[m] = { total: 0, count: 0, stk: 0, paybill: 0 };
      monthly[m].total += Number(d.amount);
      monthly[m].count += 1;
      if (d.method === "mpesa") monthly[m].stk += Number(d.amount);
      else monthly[m].paybill += Number(d.amount);
    }

    s4.getRow(4).values = ["#", "Month", "Total (KES)", "Transactions", "STK Push (KES)", "Paybill (KES)", "Avg/Transaction (KES)"];
    styleHeader(s4, s4.getRow(4));
    const sortedMonths = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b));
    sortedMonths.forEach(([month, data], i) => {
      const r = s4.getRow(5 + i);
      const avg = data.count > 0 ? Math.round(data.total / data.count) : 0;
      const [y, m] = month.split("-");
      const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const label = `${monthNames[parseInt(m)]} ${y}`;
      r.values = [i + 1, label, data.total, data.count, data.stk, data.paybill, avg];
      r.getCell(3).numFmt = '#,##0';
      r.getCell(5).numFmt = '#,##0';
      r.getCell(6).numFmt = '#,##0';
      r.getCell(7).numFmt = '#,##0';
      if (i % 2 === 0) r.eachCell((c: any) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F0F7FF" } }; });
    });

    // ══════════════════════════════════════════════════════════════
    // SHEET 5 — TOP DONORS
    // ══════════════════════════════════════════════════════════════
    const s5 = wb.addWorksheet("Top Donors");
    autoCols(s5, [4, 24, 16, 14, 14, 14, 20]);
    addTitleRow(s5, "TOP DONORS RANKING", "G", 1);
    addSubtitleRow(s5, "All donors ranked by total contribution amount", "G", 2);

    const donorAgg: Record<string, { total: number; count: number; methods: Set<string>; lastDate: string }> = {};
    for (const d of completed) {
      const name = d.donor_name?.trim() || "Anonymous";
      if (!donorAgg[name]) donorAgg[name] = { total: 0, count: 0, methods: new Set(), lastDate: "" };
      donorAgg[name].total += Number(d.amount);
      donorAgg[name].count += 1;
      if (d.method) donorAgg[name].methods.add(d.method);
      if (d.created_at && d.created_at > donorAgg[name].lastDate) donorAgg[name].lastDate = d.created_at;
    }

    s5.getRow(4).values = ["#", "Donor Name", "Total Donated (KES)", "Donations", "Avg Gift (KES)", "% of Total", "Last Donation"];
    styleHeader(s5, s5.getRow(4));

    const sortedDonors = Object.entries(donorAgg).sort((a, b) => b[1].total - a[1].total);
    sortedDonors.slice(0, 50).forEach(([name, data], i) => {
      const r = s5.getRow(5 + i);
      const pct = totalRaised > 0 ? ((data.total / totalRaised) * 100).toFixed(1) : "0.0";
      const avg = data.count > 0 ? Math.round(data.total / data.count) : 0;
      r.values = [i + 1, name, data.total, data.count, avg, `${pct}%`, data.lastDate ? new Date(data.lastDate).toLocaleDateString("en-KE") : "—"];
      r.getCell(3).numFmt = '#,##0';
      r.getCell(5).numFmt = '#,##0';
      r.height = 20;
      if (i % 2 === 0) r.eachCell((c: any) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FEF9E7" } }; });
      // Gold highlight for top 3
      if (i < 3) r.eachCell((c: any) => {
        if (c.fill) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ["FFD700", "C0C0C0", "CD7F32"][i] } };
      });
    });
    s5.views = [{ state: "frozen", ySplit: 4 }];

    // ══════════════════════════════════════════════════════════════
    // SHEET 6 — DAILY COLLECTION (Last 60 Days)
    // ══════════════════════════════════════════════════════════════
    const s6 = wb.addWorksheet("Daily Collection");
    autoCols(s6, [4, 16, 16, 14, 14, 14]);
    addTitleRow(s6, "DAILY COLLECTION SUMMARY (Last 60 Days)", "F", 1);
    addSubtitleRow(s6, "Day-by-day donation activity for recent period", "F", 2);

    const dailyColl: Record<string, { total: number; count: number }> = {};
    for (const d of completed) {
      const day = d.created_at?.slice(0, 10) || "unknown";
      if (!dailyColl[day]) dailyColl[day] = { total: 0, count: 0 };
      dailyColl[day].total += Number(d.amount);
      dailyColl[day].count += 1;
    }

    s6.getRow(4).values = ["#", "Date", "Total (KES)", "Transactions", "Avg (KES)", "Day of Week"];
    styleHeader(s6, s6.getRow(4));
    const sortedDaily = Object.entries(dailyColl).sort(([a], [b]) => a.localeCompare(b)).slice(-60);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    sortedDaily.forEach(([date, data], i) => {
      const r = s6.getRow(5 + i);
      const dow = dayNames[new Date(date).getDay()];
      const avg = data.count > 0 ? Math.round(data.total / data.count) : 0;
      r.values = [i + 1, date, data.total, data.count, avg, dow];
      if (dow === "Sun") r.eachCell((c: any) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FEE2E2" } }; });
      else if (i % 2 === 0) r.eachCell((c: any) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F0F7FF" } }; });
    });

    // ══════════════════════════════════════════════════════════════
    // SHEET 7 — DONATION REGISTER
    // ══════════════════════════════════════════════════════════════
    const s7 = wb.addWorksheet("Donation Register");
    autoCols(s7, [4, 24, 14, 10, 18, 18, 22, 16, 16, 16]);
    addTitleRow(s7, "COMPLETED DONATION REGISTER", "J", 1);
    addSubtitleRow(s7, `All ${donationCount} completed transactions — full audit trail`, "J", 2);
    s7.getRow(3).values = ["#", "Donor Name", "Amount (KES)", "Method", "Receipt Number", "Phone", "Church Member", "Fellowship", "Honoured Member", "Date"];
    styleHeader(s7, s7.getRow(3));

    completed.forEach((d, i) => {
      const r = s7.getRow(i + 4);
      const member = (d as any).church_members;
      const honoured = (d as any).honoured;
      r.values = [
        i + 1, d.donor_name || "—", Number(d.amount), d.method || "—",
        d.receipt_number || "—", d.phone || "—",
        member?.name || "—", member?.council || d.church_member_id ? "—" : "Non-Member",
        honoured?.name || "—",
        d.created_at ? new Date(d.created_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—",
      ];
      r.getCell(3).numFmt = '#,##0';
      if (i % 2 === 0) r.eachCell((c: any) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F9FAFB" } }; });
    });
    s7.views = [{ state: "frozen", ySplit: 3 }];

    // ══════════════════════════════════════════════════════════════
    // SHEET 8 — FELLOWSHIP DETAILS
    // ══════════════════════════════════════════════════════════════
    const s8 = wb.addWorksheet("Fellowship Details");
    autoCols(s8, [4, 22, 18, 14, 16, 14, 16]);
    addTitleRow(s8, "PER-FELLOWSHIP CONTRIBUTION DETAILS", "G", 1);
    addSubtitleRow(s8, "Each fellowship's members and their individual contributions", "G", 2);

    let s8row = 4;
    const fellowshipGroups: Record<string, typeof memberData> = {};
    for (const m of memberData || []) {
      const c = m.council || "Unassigned";
      if (!fellowshipGroups[c]) fellowshipGroups[c] = [];
      fellowshipGroups[c].push(m);
    }

    const councilDonationMap2: Record<string, Record<string, { total: number; count: number }>> = {};
    for (const d of completed) {
      const dm = (d as any).church_members;
      if (dm && dm.name && d.church_member_id) {
        if (!councilDonationMap2[dm.council]) councilDonationMap2[dm.council] = {};
        if (!councilDonationMap2[dm.council][dm.name]) councilDonationMap2[dm.council][dm.name] = { total: 0, count: 0 };
        councilDonationMap2[dm.council][dm.name].total += Number(d.amount);
        councilDonationMap2[dm.council][dm.name].count += 1;
      }
    }

    Object.entries(fellowshipGroups).sort((a, b) => {
      const aTotal = Object.values(councilDonationMap2[a[0]] || {}).reduce((s: number, v: any) => s + v.total, 0);
      const bTotal = Object.values(councilDonationMap2[b[0]] || {}).reduce((s: number, v: any) => s + v.total, 0);
      return bTotal - aTotal;
    }).forEach(([council, members]) => {
      const fTotal = Object.values(councilDonationMap2[council] || {}).reduce((s: number, v: any) => s + v.total, 0);
      const fCount = Object.values(councilDonationMap2[council] || {}).reduce((s: number, v: any) => s + v.count, 0);

      s8.mergeCells(`A${s8row}:G${s8row}`);
      const hr = s8.getRow(s8row);
      hr.getCell(1).value = `${council.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())} — Total: ${fmtKES(fTotal)} (${fCount} donations, ${members.length} members)`;
      hr.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
      hr.fill = { type: "pattern", pattern: "solid", fgColor: { argb: dark.replace("#", "") } };
      hr.height = 22;
      s8row++;

      s8.getRow(s8row).values = ["#", "Member Name", "Total Donated (KES)", "Donations", "Top Donation (KES)", "Share of Fellowship", ""];
      styleHeader(s8, s8.getRow(s8row));
      s8row++;

      const councilDonors = Object.entries(councilDonationMap2[council] || {}).sort((a, b) => b[1].total - a[1].total);
      councilDonors.forEach(([name, data], i) => {
        const r = s8.getRow(s8row);
        const share = fTotal > 0 ? ((data.total / fTotal) * 100).toFixed(1) : "0.0";
        r.values = [i + 1, name, data.total, data.count, data.total, `${share}%`, ""];
        r.getCell(3).numFmt = '#,##0';
        r.getCell(5).numFmt = '#,##0';
        if (i % 2 === 0) r.eachCell((c: any) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F0F7FF" } }; });
        s8row++;
      });

      const subR = s8.getRow(s8row);
      subR.values = ["", "Fellowship Total", fTotal, fCount, "", "100.0%", ""];
      subR.font = { bold: true };
      subR.eachCell((c: any) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E8EDF2" } }; });
      subR.getCell(3).numFmt = '#,##0';
      addBorder(s8, s8row - councilDonors.length - 1, s8row, 6);
      s8row += 2;
    });

    // ══════════════════════════════════════════════════════════════
    // SHEET 9 — HONOUR ROLL
    // ══════════════════════════════════════════════════════════════
    const s9 = wb.addWorksheet("Honour Roll");
    autoCols(s9, [4, 22, 18, 14, 14, 14, 28, 22]);
    addTitleRow(s9, "HONOUR ROLL — MEMBER RECOGNITION", "H", 1);
    addSubtitleRow(s9, "Total honour donations received per member, with donor names", "H", 2);
    s9.getRow(3).values = ["#", "Honoured Member", "Fellowship", "Total Received (KES)", "Times Honoured", "Avg Honour (KES)", "Donors", "Last Honour Date"];
    styleHeader(s9, s9.getRow(3));

    const honourByMember: Record<string, { name: string; council: string; total: number; count: number; donors: Set<string>; lastDate: string }> = {};
    for (const d of completed) {
      if (d.honored_member_id) {
        const honoured = (d as any).honoured;
        const key = d.honored_member_id;
        if (!honourByMember[key]) {
          honourByMember[key] = { name: honoured?.name || "Unknown", council: honoured?.council || "—", total: 0, count: 0, donors: new Set(), lastDate: "" };
        }
        honourByMember[key].total += Number(d.amount);
        honourByMember[key].count += 1;
        if (d.donor_name) honourByMember[key].donors.add(d.donor_name.trim());
        const dDate = d.created_at ? new Date(d.created_at).toLocaleDateString("en-KE") : "";
        if (dDate > honourByMember[key].lastDate) honourByMember[key].lastDate = dDate;
      }
    }

    const sortedHonour = Object.entries(honourByMember).sort((a, b) => b[1].total - a[1].total);
    let s9row = 4;
    let grandHonourTotal = 0, grandHonourCount = 0;

    sortedHonour.forEach(([, data], i) => {
      const r = s9.getRow(s9row);
      const donorList = Array.from(data.donors).join(", ") || "—";
      r.values = [i + 1, data.name, data.council, data.total, data.count, data.count > 0 ? Math.round(data.total / data.count) : 0, donorList, data.lastDate || "—"];
      r.getCell(4).numFmt = '#,##0';
      r.getCell(6).numFmt = '#,##0';
      r.height = 20;
      if (i % 2 === 0) r.eachCell((c: any) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FEF3C7" } }; });
      grandHonourTotal += data.total;
      grandHonourCount += data.count;
      s9row++;
    });

    if (sortedHonour.length > 0) {
      const hrTotalRow = s9.getRow(s9row);
      hrTotalRow.values = ["", "GRAND TOTAL", "", grandHonourTotal, grandHonourCount, Math.round(grandHonourTotal / Math.max(grandHonourCount, 1)), "", ""];
      hrTotalRow.font = { bold: true, color: { argb: dark.replace("#", "") } };
      hrTotalRow.eachCell((c: any) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FEF3C7" } }; });
      hrTotalRow.getCell(4).numFmt = '#,##0';
      hrTotalRow.getCell(6).numFmt = '#,##0';
      addBorder(s9, 3, s9row, 8);
    } else {
      s9.getRow(4).values = ["", "No honour donations recorded yet", "", "", "", "", "", ""];
      s9.mergeCells(`B4:G4`);
    }
    s9.views = [{ state: "frozen", ySplit: 3 }];

    // ══════════════════════════════════════════════════════════════
    // SHEET 10 — PLEDGES & FULFILLMENT
    // ══════════════════════════════════════════════════════════════
    const s10 = wb.addWorksheet("Pledges & Fulfillment");
    autoCols(s10, [4, 24, 14, 14, 14, 12, 14, 16]);
    addTitleRow(s10, "PLEDGES REGISTER & FULFILLMENT TRACKING", "H", 1);
    addSubtitleRow(s10, "All pledges, payment progress, and fulfillment status", "H", 2);
    s10.getRow(3).values = ["#", "Donor Name", "Amount (KES)", "Paid (KES)", "Remaining (KES)", "Status", "Frequency", "Date"];
    styleHeader(s10, s10.getRow(3));

    (pledges || []).forEach((p, i) => {
      const r = s10.getRow(i + 4);
      const pct = p.amount > 0 ? ((p.paid / p.amount) * 100).toFixed(1) : "0.0";
      r.values = [
        i + 1, p.donor_name || "—", Number(p.amount), Number(p.paid), Number(p.remaining),
        `${(p.status || "—").toUpperCase()} (${pct}%)`, p.reminder_freq || "—",
        p.created_at ? new Date(p.created_at).toLocaleDateString("en-KE") : "—",
      ];
      r.getCell(3).numFmt = '#,##0';
      r.getCell(4).numFmt = '#,##0';
      r.getCell(5).numFmt = '#,##0';
      if (p.status === "fulfilled") r.getCell(6).font = { color: { argb: "059669" }, bold: true };
      else if (p.status === "pending") r.getCell(6).font = { color: { argb: "2563EB" }, bold: true };
      else r.getCell(6).font = { color: { argb: "D97706" }, bold: true };
      if (i % 2 === 0) r.eachCell((c: any) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F9FAFB" } }; });
    });

    // Pledge summary + KPI cards
    const pSumRow = (pledges?.length || 0) + 5;
    s10.getRow(pSumRow).values = ["", "TOTAL", totalPledges, paidPledges, totalPledges - paidPledges, "", "", ""];
    s10.getRow(pSumRow).font = { bold: true, color: { argb: dark.replace("#", "") }, size: 11 };
    s10.getRow(pSumRow).eachCell((c: any) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E8EDF2" } }; });
    s10.getRow(pSumRow).getCell(3).numFmt = '#,##0';
    s10.getRow(pSumRow).getCell(4).numFmt = '#,##0';
    s10.getRow(pSumRow).getCell(5).numFmt = '#,##0';

    const pledFulfilled = (pledges || []).filter(p => p.status === "fulfilled").length;
    const pledPending = (pledges || []).filter(p => p.status === "pending").length;
    const pExtraRow = pSumRow + 2;
    s10.getRow(pExtraRow).values = ["", "Pledge KPIs", "", "", "", "", "", ""];
    s10.getRow(pExtraRow).font = { bold: true, size: 11, color: { argb: dark.replace("#", "") } };
    s10.getRow(pExtraRow + 1).values = ["", "Fulfilled Pledges", pledFulfilled, "Pending Pledges", pledPending, "Fulfillment Rate", totalPledges > 0 ? `${((paidPledges / totalPledges) * 100).toFixed(1)}%` : "0%", ""];
    s10.views = [{ state: "frozen", ySplit: 3 }];

    // ══════════════════════════════════════════════════════════════
    // SHEET 11 — MEMBER DIRECTORY
    // ══════════════════════════════════════════════════════════════
    const s11 = wb.addWorksheet("Member Directory");
    autoCols(s11, [4, 24, 20, 14, 14, 16]);
    addTitleRow(s11, "CHURCH MEMBERSHIP DIRECTORY", "F", 1);
    addSubtitleRow(s11, `All registered members across all fellowships (${memberCount} total) — ranked by total donations`, "F", 2);
    s11.getRow(3).values = ["#", "Name", "Fellowship", "Total Donated (KES)", "Donation Count", "Registered"];
    styleHeader(s11, s11.getRow(3));

    const memberDonationMap: Record<string, { total: number; count: number }> = {};
    for (const d of completed) {
      const member = (d as any).church_members;
      if (member?.name && d.church_member_id) {
        if (!memberDonationMap[d.church_member_id]) memberDonationMap[d.church_member_id] = { total: 0, count: 0 };
        memberDonationMap[d.church_member_id].total += Number(d.amount);
        memberDonationMap[d.church_member_id].count += 1;
      }
    }

    const rankedMembers = (memberData || [])
      .map(m => ({ ...m, donated: memberDonationMap[m.id]?.total || 0, donationCount: memberDonationMap[m.id]?.count || 0 }))
      .sort((a, b) => b.donated - a.donated);

    rankedMembers.forEach((m, i) => {
      const r = s11.getRow(i + 4);
      const councilLabel = m.council ? m.council.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) : "—";
      r.values = [i + 1, m.name, councilLabel, m.donated || 0, m.donationCount || 0, m.created_at ? new Date(m.created_at).toLocaleDateString("en-KE") : "—"];
      r.getCell(4).numFmt = '#,##0';
      r.height = 18;
      if (i % 2 === 0) r.eachCell((c: any) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F9FAFB" } }; });
    });
    s11.views = [{ state: "frozen", ySplit: 3 }];

    // ── Write ──
    const buf = await wb.xlsx.writeBuffer();

    await logAudit({
      adminId: admin.id,
      action: "export_ledger",
      details: { type: "xlsx", count: completed.length },
      ipAddress: (req as any).adminIp,
    });

    const filename = `AIPCA-Harambee-Report-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(Buffer.from(buf));
  } catch (err) {
    console.error("xlsx export error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Export failed" });
  }
});
