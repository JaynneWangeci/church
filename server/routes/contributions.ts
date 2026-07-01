import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import { requireAdmin, logAudit, recalculatePledgeFulfillment } from "../lib/admin.js";


export const contributionsRouter = Router();

contributionsRouter.get("/analytics", requireAdmin, async (req, res) => {
  try {
    const db = requireService();


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

    await recalculatePledgeFulfillment(db);

    const { data: donations } = await db
      .from("donations")
      .select("id, donor_name, amount, method, status, receipt_number, message, created_at, honored_member_id, church_members!church_member_id(name, council, gender), honoured:church_members!honored_member_id(name, council)")
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    const { data: pledges } = await db.from("pledges").select("*");
    const { data: memberData } = await db.from("church_members").select("*").eq("is_active", true);

    const completed = donations || [];
    const totalRaised = completed.reduce((s, d) => s + Number(d.amount), 0);
    const count = completed.length;
    const avg = count > 0 ? Math.round(totalRaised / count) : 0;
    const topDonor = completed.reduce((best, d) => Number(d.amount) > Number(best?.amount || 0) ? d : best, null);
    const genDate = new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const totalPledges = (pledges || []).reduce((s, p) => s + Number(p.amount), 0);
    const paidPledges = (pledges || []).reduce((s, p) => s + Number(p.paid), 0);
    const uniqueDonors = new Set(completed.map(d => d.donor_name?.toLowerCase()).filter(Boolean)).size;

    const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: "AIPCA Harambee Contribution Report", Author: "AIPCA Bahati Cathedral" } });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", async () => {
      const pdf = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=AIPCA-Harambee-Report-${new Date().toISOString().slice(0, 10)}.pdf`);
      res.send(pdf);
      await logAudit({
        adminId: admin.id,
        action: "export_ledger",
        details: { type: "pdf", count: completed.length },
        ipAddress: (req as any).adminIp,
      });
    });

    const pw = doc.page.width - 100;
    const m = 50;
    let pageNum = 0;

    function addFooter() {
      pageNum++;
      doc.fontSize(7).fillColor("#6B7280");
      doc.text(`AIPCA Bahati Cathedral — Harambee Report | ${genDate} | Page ${pageNum}`, m, doc.page.height - 40, { align: "center", width: pw });
      doc.rect(m, doc.page.height - 45, pw, 0.5).fill("#C4964A");
    }
    doc.on("pageAdded", addFooter);

    // ═══════════════════════════════════════════
    // COVER PAGE
    // ═══════════════════════════════════════════
    doc.rect(0, 0, doc.page.width, doc.page.height).fill("#0F2847");
    doc.fontSize(36).font("Helvetica-Bold").fillColor("#C4964A").text("AIPCA BAHATI", m, 180, { align: "center", width: pw });
    doc.fontSize(36).font("Helvetica-Bold").fillColor("#FFFFFF").text("CATHEDRAL", m, 220, { align: "center", width: pw });
    doc.moveDown(2);
    doc.fontSize(18).fillColor("#C4964A").text("Harambee Development Fund", { align: "center", width: pw });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor("#94A3B8").text("Contribution Report", { align: "center", width: pw });
    doc.moveDown(3);
    doc.rect(m + 100, doc.y, pw - 200, 1).fillColor("#C4964A").fill();
    doc.moveDown(3);
    doc.fontSize(10).fillColor("#94A3B8");
    doc.text(`Prepared by: ${admin.name} (${admin.role.replace("_", " ")})`, { align: "center", width: pw });
    doc.text(`Generated: ${genDate}`, { align: "center", width: pw });
    doc.text(`Period: ${completed.length > 0 ? `${new Date(completed[completed.length-1].created_at).toLocaleDateString("en-KE")} – ${new Date(completed[0].created_at).toLocaleDateString("en-KE")}` : "—"}`, { align: "center", width: pw });
    doc.addPage();

    // ═══════════════════════════════════════════
    // EXECUTIVE SUMMARY
    // ═══════════════════════════════════════════
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#0F2847").text("Executive Summary", m, 50);
    doc.rect(m, doc.y + 2, pw, 1.5).fill("#C4964A");
    doc.moveDown(2);

    const kpiBoxes = [
      { label: "Total Raised", value: `KES ${totalRaised.toLocaleString("en-KE")}` },
      { label: "Donations", value: `${count}` },
      { label: "Average Gift", value: `KES ${avg.toLocaleString("en-KE")}` },
      { label: "Unique Donors", value: `${uniqueDonors}` },
    ];
    const boxW = (pw - 30) / 4;
    const boxY = doc.y;
    kpiBoxes.forEach((b, i) => {
      const bx = m + i * (boxW + 10);
      doc.roundedRect(bx, boxY, boxW, 42, 4).fill("#EFF6FF").lineWidth(0.5).stroke("#BFDBFE");
      doc.fontSize(5).font("Helvetica").fillColor("#64748B").text(b.label.toUpperCase(), bx + 4, boxY + 6, { width: boxW - 8, align: "center" });
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#0F2847").text(b.value, bx + 4, boxY + 20, { width: boxW - 8, align: "center" });
    });
    doc.y = boxY + 55;

    // Secondary KPIs
    const kpiBoxes2 = [
      { label: "Pledges", value: `KES ${totalPledges.toLocaleString("en-KE")}` },
      { label: "Paid", value: `KES ${paidPledges.toLocaleString("en-KE")}` },
      { label: "Fulfillment", value: totalPledges > 0 ? `${((paidPledges / totalPledges) * 100).toFixed(1)}%` : "0%" },
      { label: "Members", value: `${(memberData || []).length}` },
    ];
    const boxY2 = doc.y;
    kpiBoxes2.forEach((b, i) => {
      const bx = m + i * (boxW + 10);
      doc.roundedRect(bx, boxY2, boxW, 42, 4).fill("#FEF3C7").lineWidth(0.5).stroke("#FDE68A");
      doc.fontSize(5).font("Helvetica").fillColor("#92400E").text(b.label.toUpperCase(), bx + 4, boxY2 + 6, { width: boxW - 8, align: "center" });
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#78350F").text(b.value, bx + 4, boxY2 + 20, { width: boxW - 8, align: "center" });
    });
    doc.y = boxY2 + 55;

    if (topDonor?.donor_name) {
      doc.fontSize(9).font("Helvetica").fillColor("#475569").text(`🏆 Top Donor: ${topDonor.donor_name} — KES ${Number(topDonor.amount).toLocaleString("en-KE")}`, m, doc.y, { width: pw });
      doc.moveDown(0.5);
    }

    // ═══════════════════════════════════════════
    // FELLOWSHIP SUMMARY TABLE
    // ═══════════════════════════════════════════
    doc.moveDown(0.5);
    doc.fontSize(14).font("Helvetica-Bold").fillColor("#0F2847").text("Fellowship Contribution Summary", m, doc.y);
    doc.rect(m, doc.y + 2, pw, 1).fill("#C4964A");
    doc.moveDown(1.5);

    const councilData: Record<string, { total: number; count: number; members: number }> = {};
    for (const d of completed) {
      const c = (d as any).church_members?.council || "Unassigned";
      if (!councilData[c]) councilData[c] = { total: 0, count: 0, members: 0 };
      councilData[c].total += Number(d.amount);
      councilData[c].count += 1;
    }
    for (const mem of memberData || []) {
      const c = mem.council || "Unassigned";
      if (!councilData[c]) councilData[c] = { total: 0, count: 0, members: 0 };
      councilData[c].members += 1;
    }

    const sortedC = Object.entries(councilData).sort((a, b) => b[1].total - a[1].total);
    const cHeaders = ["Fellowship", "Raised (KES)", "Donations", "Members", "Avg/Member"];
    const cWidths = [pw * 0.28, pw * 0.20, pw * 0.15, pw * 0.15, pw * 0.22];
    let cy = doc.y;

    doc.fontSize(7).font("Helvetica-Bold").fillColor("FFFFFF");
    let cx2 = m;
    doc.rect(m, cy, pw, 14).fill("#0F2847");
    cHeaders.forEach((h, i) => { doc.text(h, cx2 + 3, cy + 3, { width: cWidths[i], align: i > 0 ? "right" : "left" }); cx2 += cWidths[i]; });
    cy += 14;

    let gTotal = 0, gCount = 0;
    sortedC.forEach(([name, data], idx) => {
      const avg2 = data.members > 0 ? Math.round(data.total / data.members) : 0;
      const bg2 = idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
      doc.rect(m, cy, pw, 13).fill(bg2);
      doc.fontSize(7).font("Helvetica").fillColor("#334155");
      let xp = m;
      const vals = [name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()), data.total.toLocaleString("en-KE"), data.count.toString(), data.members.toString(), `KES ${avg2.toLocaleString("en-KE")}`];
      vals.forEach((v, i) => { doc.text(v, xp + 3, cy + 2, { width: cWidths[i], align: i > 0 ? "right" : "left" }); xp += cWidths[i]; });
      cy += 13;
      gTotal += data.total; gCount += data.count;
    });

    // Total row
    doc.rect(m, cy, pw, 14).fill("#E2E8F0");
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#0F2847");
    let xp = m;
    const tVals = ["TOTAL", gTotal.toLocaleString("en-KE"), gCount.toString(), "", ""];
    cHeaders.forEach((_, i) => { doc.text(tVals[i] || "", xp + 3, cy + 3, { width: cWidths[i], align: i > 0 ? "right" : "left" }); xp += cWidths[i]; });
    cy += 20;

    // ═══════════════════════════════════════════
    // GENDER ANALYSIS
    // ═══════════════════════════════════════════
    doc.y = cy;
    doc.addPage();
    cy = 50;
    doc.fontSize(14).font("Helvetica-Bold").fillColor("#0F2847").text("Gender Contribution Analysis", m, cy);
    doc.rect(m, cy + 2, pw, 1).fill("#C4964A");
    cy += 20;

    const genderTotals: Record<string, { total: number; count: number; members: Set<string> }> = {};
    for (const d of completed) {
      const g = (d as any).church_members?.gender || "unknown";
      if (!genderTotals[g]) genderTotals[g] = { total: 0, count: 0, members: new Set() };
      genderTotals[g].total += Number(d.amount);
      genderTotals[g].count += 1;
      if (d.church_member_id) genderTotals[g].members.add(d.church_member_id);
    }

    const gEntries = Object.entries(genderTotals).filter(([k]) => k !== "unknown").sort((a, b) => b[1].total - a[1].total);
    const gHeaders = ["Gender", "Total (KES)", "Donations", "Members", "Avg/Person"];
    const gWidths = [pw * 0.22, pw * 0.22, pw * 0.18, pw * 0.18, pw * 0.20];
    doc.fontSize(7).font("Helvetica-Bold").fillColor("FFFFFF");
    let gx = m;
    doc.rect(m, cy, pw, 14).fill("#0F2847");
    gHeaders.forEach((h, i) => { doc.text(h, gx + 3, cy + 3, { width: gWidths[i], align: i > 0 ? "right" : "left" }); gx += gWidths[i]; });
    cy += 14;

    let maleTotal = 0, femaleTotal = 0;
    gEntries.forEach(([gender, data], idx) => {
      const avg3 = data.members.size > 0 ? Math.round(data.total / data.members.size) : 0;
      doc.rect(m, cy, pw, 13).fill(idx % 2 === 0 ? "#FFF1F2" : "#F0F7FF");
      doc.font("Helvetica").fontSize(7).fillColor("#334155");
      let xp = m;
      const label = gender === "male" ? "👨 Men" : gender === "female" ? "👩 Women" : gender;
      [label, data.total.toLocaleString("en-KE"), data.count.toString(), data.members.size.toString(), `KES ${avg3.toLocaleString("en-KE")}`].forEach((v, i) => {
        doc.text(v, xp + 3, cy + 2, { width: gWidths[i], align: i > 0 ? "right" : "left" }); xp += gWidths[i];
      });
      cy += 13;
      if (gender === "male") maleTotal = data.total;
      if (gender === "female") femaleTotal = data.total;
    });

    if (maleTotal > 0 || femaleTotal > 0) {
      cy += 5;
      const higher = maleTotal > femaleTotal ? "Men" : "Women";
      const diff = Math.abs(maleTotal - femaleTotal);
      doc.fontSize(8).font("Helvetica").fillColor("#475569")
        .text(`📊 ${higher} are leading by KES ${diff.toLocaleString("en-KE")}`, m, cy, { width: pw, align: "center" });
      cy += 20;
    }

    // ═══════════════════════════════════════════
    // TOP DONORS TABLE
    // ═══════════════════════════════════════════
    cy += 10;
    doc.fontSize(14).font("Helvetica-Bold").fillColor("#0F2847").text("Top Donors", m, cy);
    doc.rect(m, cy + 2, pw, 1).fill("#C4964A");
    cy += 20;

    const donorAgg: Record<string, { total: number; count: number }> = {};
    for (const d of completed) {
      const name = d.donor_name?.trim() || "Anonymous";
      if (!donorAgg[name]) donorAgg[name] = { total: 0, count: 0 };
      donorAgg[name].total += Number(d.amount);
      donorAgg[name].count += 1;
    }
    const topDonors = Object.entries(donorAgg).sort((a, b) => b[1].total - a[1].total).slice(0, 20);

    const dHeaders = ["#", "Donor Name", "Total (KES)", "Donations", "Avg (KES)"];
    const dWidths = [pw * 0.06, pw * 0.34, pw * 0.22, pw * 0.16, pw * 0.22];
    doc.fontSize(7).font("Helvetica-Bold").fillColor("FFFFFF");
    let dx = m;
    doc.rect(m, cy, pw, 14).fill("#0F2847");
    dHeaders.forEach((h, i) => { doc.text(h, dx + 3, cy + 3, { width: dWidths[i], align: i > 1 ? "right" : "left" }); dx += dWidths[i]; });
    cy += 14;

    topDonors.forEach(([name, data], idx) => {
      const isTop3 = idx < 3;
      const colors = ["#FFD700", "#C0C0C0", "#CD7F32"];
      doc.rect(m, cy, pw, 12).fill(idx % 2 === 0 ? "#FEF9E7" : "#FFFFFF");
      if (isTop3) doc.rect(m, cy, pw, 12).fill(isTop3 ? colors[idx] + "40" : "").lineWidth(0.5).stroke(colors[idx]);
      doc.font(isTop3 ? "Helvetica-Bold" : "Helvetica").fontSize(7).fillColor("#334155");
      let xp = m;
      const avg3 = data.count > 0 ? Math.round(data.total / data.count) : 0;
      [idx + 1, name, data.total.toLocaleString("en-KE"), data.count.toString(), `KES ${avg3.toLocaleString("en-KE")}`].forEach((v, i) => {
        doc.text(String(v), xp + 3, cy + 2, { width: dWidths[i], align: i > 1 ? "right" : "left" }); xp += dWidths[i];
      });
      cy += 12;
    });

    // ═══════════════════════════════════════════
    // RECENT DONATIONS
    // ═══════════════════════════════════════════
    doc.y = cy + 10;
    doc.addPage();
    cy = 50;
    doc.fontSize(14).font("Helvetica-Bold").fillColor("#0F2847").text("Recent Donations (Last 50)", m, cy);
    doc.rect(m, cy + 2, pw, 1).fill("#C4964A");
    cy += 20;

    const rHeaders = ["Donor", "Amount (KES)", "Method", "Receipt", "Date"];
    const rWidths = [pw * 0.24, pw * 0.16, pw * 0.14, pw * 0.20, pw * 0.26];
    doc.fontSize(7).font("Helvetica-Bold").fillColor("FFFFFF");
    let rx = m;
    doc.rect(m, cy, pw, 14).fill("#0F2847");
    rHeaders.forEach((h, i) => { doc.text(h, rx + 3, cy + 3, { width: rWidths[i], align: i === 1 ? "right" : "left" }); rx += rWidths[i]; });
    cy += 14;

    completed.slice(0, 50).forEach((d, idx) => {
      if (cy > doc.page.height - 60) { doc.addPage(); cy = 50; addFooter(); }
      doc.rect(m, cy, pw, 12).fill(idx % 2 === 0 ? "#F8FAFC" : "#FFFFFF");
      doc.font("Helvetica").fontSize(6).fillColor("#475569");
      let xp = m;
      const vals = [
        (d.donor_name || "Anonymous").slice(0, 22),
        `${Number(d.amount).toLocaleString("en-KE")}`,
        d.method?.toUpperCase() || "—",
        (d.receipt_number || "—").slice(0, 14),
        d.created_at ? new Date(d.created_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—",
      ];
      vals.forEach((v, i) => { doc.text(v, xp + 2, cy + 2, { width: rWidths[i], align: i === 1 ? "right" : "left" }); xp += rWidths[i]; });
      cy += 12;
    });

    // ═══════════════════════════════════════════
    // CLOSING
    // ═══════════════════════════════════════════
    cy = Math.max(cy + 30, doc.page.height - 100);
    doc.rect(m, cy, pw, 1.5).fill("#C4964A");
    cy += 15;
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#0F2847").text("— End of Report —", m, cy, { align: "center", width: pw });
    cy += 20;
    doc.fontSize(7).font("Helvetica").fillColor("#94A3B8");
    doc.text("AIPCA Bahati Cathedral | Jogoo Road, Nairobi, Kenya", m, cy, { align: "center", width: pw });
    doc.text("Tujenge Pamoja — Building our house of worship together.", m, cy + 10, { align: "center", width: pw });

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

    await recalculatePledgeFulfillment(db);

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
    autoCols(s1, [4, 28, 22, 14, 22, 4, 20, 20, 22, 14]);
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

    // Fellowship summary (donations + pledges)
    const memberLookup = new Map<string, string>();
    for (const mem of memberData || []) memberLookup.set(mem.name.toLowerCase().trim(), mem.council || "Unassigned");

    const councilSummary: Record<string, { total: number; count: number; members: number; pledgeTotal: number; pledgePaid: number; pledgeRemaining: number }> = {};
    for (const d of completed) {
      const m = (d as any).church_members;
      const c = m?.council || "Unassigned";
      if (!councilSummary[c]) councilSummary[c] = { total: 0, count: 0, members: 0, pledgeTotal: 0, pledgePaid: 0, pledgeRemaining: 0 };
      councilSummary[c].total += Number(d.amount);
      councilSummary[c].count += 1;
    }
    for (const mem of memberData || []) {
      const c = mem.council || "Unassigned";
      if (!councilSummary[c]) councilSummary[c] = { total: 0, count: 0, members: 0, pledgeTotal: 0, pledgePaid: 0, pledgeRemaining: 0 };
      councilSummary[c].members += 1;
    }
    for (const p of pledges || []) {
      const council = memberLookup.get(p.donor_name.toLowerCase().trim()) || "Unassigned";
      if (!councilSummary[council]) councilSummary[council] = { total: 0, count: 0, members: 0, pledgeTotal: 0, pledgePaid: 0, pledgeRemaining: 0 };
      councilSummary[council].pledgeTotal += Number(p.amount);
      councilSummary[council].pledgePaid += Number(p.paid);
      councilSummary[council].pledgeRemaining += Number(p.remaining);
    }

    const fs = sr + metrics.length + 2;
    addTitleRow(s1, "FELLOWSHIP CONTRIBUTION SUMMARY", "J", fs);
    const fh = fs + 1;
    s1.getRow(fh).values = ["#", "Fellowship", "Total Raised (KES)", "Donations", "Members", "Avg/Member (KES)", "Pledged (KES)", "Paid (KES)", "Remaining (KES)", "Fulfillment"];
    styleHeader(s1, s1.getRow(fh));

    const sortedCouncils = Object.entries(councilSummary).sort((a, b) => b[1].total - a[1].total);
    let grandTotal = 0, grandCount = 0, grandMembers = 0, grandPledgeTotal = 0, grandPledgePaid = 0, grandPledgeRemaining = 0;
    sortedCouncils.forEach(([name, data], i) => {
      const r = s1.getRow(fh + 1 + i);
      const avg = data.members > 0 ? Math.round(data.total / data.members) : 0;
      const fulfillment = data.pledgeTotal > 0 ? (data.pledgePaid / data.pledgeTotal * 100).toFixed(2) + "%" : "—";
      r.values = [i + 1, name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()), data.total, data.count, data.members, avg, data.pledgeTotal, data.pledgePaid, data.pledgeRemaining, fulfillment];
      r.getCell(3).numFmt = '#,##0';
      r.getCell(6).numFmt = '#,##0';
      r.getCell(7).numFmt = '#,##0';
      r.getCell(8).numFmt = '#,##0';
      r.getCell(9).numFmt = '#,##0';
      r.height = 20;
      if (i % 2 === 0) r.eachCell((c: any) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F0F7FF" } }; });
      grandTotal += data.total; grandCount += data.count; grandMembers += data.members;
      grandPledgeTotal += data.pledgeTotal; grandPledgePaid += data.pledgePaid; grandPledgeRemaining += data.pledgeRemaining;
    });
    const ft = fh + 1 + sortedCouncils.length;
    const totalRow = s1.getRow(ft);
    const grandFulfillment = grandPledgeTotal > 0 ? (grandPledgePaid / grandPledgeTotal * 100).toFixed(2) + "%" : "—";
    totalRow.values = ["", "TOTAL", grandTotal, grandCount, grandMembers, Math.round(grandTotal / Math.max(grandMembers, 1)), grandPledgeTotal, grandPledgePaid, grandPledgeRemaining, grandFulfillment];
    totalRow.font = { bold: true, color: { argb: dark.replace("#", "") }, size: 11 };
    totalRow.eachCell((c: any) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E8EDF2" } }; });
    totalRow.getCell(3).numFmt = '#,##0';
    totalRow.getCell(6).numFmt = '#,##0';
    totalRow.getCell(7).numFmt = '#,##0';
    totalRow.getCell(8).numFmt = '#,##0';
    totalRow.getCell(9).numFmt = '#,##0';
    addBorder(s1, fh, ft, 10);
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
      r.getCell(3).numFmt = '#,##0';
      r.getCell(4).numFmt = '#,##0';
      r.getCell(5).numFmt = '#,##0';
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
      if (i % 2 === 0) r.eachCell((c: any) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F0F7FF" } }; });
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
      r.getCell(3).numFmt = '#,##0';
      r.getCell(5).numFmt = '#,##0';
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
