import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import { requireAdmin, logAudit } from "../lib/admin.js";

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
        .select("amount, church_members!inner(council)")
        .eq("status", "completed")
        .not("church_member_id", "is", null),

      db.from("donations")
        .select("amount, church_member_id, church_members!inner(name, council)")
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

    res.json({
      daily,
      top_donors: topDonorsList,
      council_breakdown: councilBreakdown,
      member_ranking: memberRankingList,
      overall_total: overallTotal,
      overall_count: overallCount,
    });
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
      .select("id, donor_name, amount, method, status, receipt_number, message, created_at, church_members(name, council)")
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    const total = (donations || []).reduce((s, d) => s + Number(d.amount), 0);
    const count = (donations || []).length;
    const avg = count > 0 ? Math.round(total / count) : 0;
    const topDonor = (donations || []).reduce((best, d) => Number(d.amount) > Number(best?.amount || 0) ? d : best, null);
    const genDate = new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: "Harambee Contribution Report", Author: "AIPCA Bahati Cathedral" } });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=harambee-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    doc.pipe(res);

    const pageWidth = doc.page.width - 100;
    const margin = 50;
    let pageNum = 0;

    function addFooter() {
      pageNum++;
      doc.fontSize(7).fillColor("999999");
      doc.text(`AIPCA Bahati Cathedral — Harambee Report | Generated ${genDate} | Page ${pageNum}`, margin, doc.page.height - 40, { align: "center", width: pageWidth });
      doc.rect(margin, doc.page.height - 45, pageWidth, 0.5).fill("C4964A");
    }

    doc.on("pageAdded", addFooter);

    // ── Decorative top border ──
    doc.rect(margin, 30, pageWidth, 4).fill("1f2a1d");
    doc.rect(margin, 34, pageWidth, 1.5).fill("C4964A");

    // ── Header ──
    doc.moveDown(3);
    doc.fontSize(26).font("Helvetica-Bold").fillColor("1f2a1d").text("AIPCA Bahati Cathedral", { align: "center" });
    doc.fontSize(14).fillColor("C4964A").text("Harambee Contribution Report", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(8).fillColor("999999").text(`Prepared on ${genDate}`, { align: "center" });
    doc.moveDown(1);

    // ── Summary cards ──
    const cardW = (pageWidth - 30) / 4;
    const cardY = doc.y;
    const cardH = 45;
    const cards = [
      { label: "Total Raised", value: `KES ${total.toLocaleString("en-KE")}`, color: "1f2a1d" },
      { label: "Donations", value: `${count}`, color: "C4964A" },
      { label: "Average Gift", value: `KES ${avg.toLocaleString("en-KE")}`, color: "2C4056" },
      { label: "Top Gift", value: topDonor ? `KES ${Number(topDonor.amount).toLocaleString("en-KE")}` : "—", color: "9E7A3A" },
    ];
    cards.forEach((card, i) => {
      const cx = margin + i * (cardW + 10);
      doc.roundedRect(cx, cardY, cardW, cardH, 4).fill("#FDF7F0");
      doc.roundedRect(cx, cardY, cardW, cardH, 4).lineWidth(0.5).stroke("#E8EDF2");
      doc.fontSize(7).font("Helvetica").fillColor("8B7D6B").text(card.label.toUpperCase(), cx + 8, cardY + 6, { width: cardW - 16, align: "center" });
      doc.fontSize(11).font("Helvetica-Bold").fillColor(card.color).text(card.value, cx + 8, cardY + 20, { width: cardW - 16, align: "center" });
    });
    doc.y = cardY + cardH + 20;

    // ── Separator ──
    doc.moveDown(0.5);
    doc.rect(margin, doc.y, pageWidth, 0.5).fill("E8EDF2");
    doc.moveDown(1);

    // ── Table header ──
    doc.fontSize(9).font("Helvetica-Bold").fillColor("FFFFFF");
    const colWidths = [pageWidth * 0.22, pageWidth * 0.14, pageWidth * 0.10, pageWidth * 0.10, pageWidth * 0.18, pageWidth * 0.26];
    const headers = ["Donor", "Amount (KES)", "Method", "Status", "Receipt", "Date"];
    let y = doc.y;
    let x = margin;
    doc.rect(margin, y, pageWidth, 16).fill("1f2a1d");
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], x + 4, y + 4, { width: colWidths[i], align: i === 1 ? "right" : "left" });
      x += colWidths[i];
    }
    y += 16;

    // ── Table rows ──
    doc.font("Helvetica").fontSize(8).fillColor("333333");
    for (const d of (donations || []).slice(0, 50)) {
      if (y > doc.page.height - 70) {
        doc.addPage();
        y = 50;
        x = margin;
        doc.fontSize(9).font("Helvetica-Bold").fillColor("FFFFFF");
        doc.rect(margin, y, pageWidth, 16).fill("1f2a1d");
        for (let i = 0; i < headers.length; i++) {
          doc.text(headers[i], x + 4, y + 4, { width: colWidths[i], align: i === 1 ? "right" : "left" });
          x += colWidths[i];
        }
        y += 16;
        doc.font("Helvetica").fontSize(8).fillColor("333333");
      }

      x = margin;
      const values = [
        (d.donor_name || "Anonymous").slice(0, 22),
        `${Number(d.amount).toLocaleString("en-KE")}`,
        d.method || "—",
        d.status || "—",
        (d.receipt_number || "—").slice(0, 14),
        new Date(d.created_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }),
      ];

      const isEven = ((y - 50) / 14) % 2 === 0;
      doc.rect(margin, y, pageWidth, 13).fill(isEven ? "FDF7F0" : "FFFFFF");
      for (let i = 0; i < values.length; i++) {
        doc.text(values[i], x + 4, y + 3, { width: colWidths[i], align: i === 1 ? "right" : "left" });
        x += colWidths[i];
      }
      y += 13;
    }

    // ── Bottom summary ──
    if (y < doc.page.height - 120) {
      doc.y = y + 20;
    } else {
      doc.addPage();
      doc.y = 50;
    }
    doc.moveDown(1);
    doc.rect(margin, doc.y, pageWidth, 0.5).fill("C4964A");
    doc.moveDown(0.5);
    doc.fontSize(9).font("Helvetica-Bold").fillColor("1f2a1d").text(`Report Summary`, { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(8).font("Helvetica").fillColor("666666");
    doc.text(`Total donations recorded: ${count}`, { align: "center" });
    doc.text(`Total amount raised: KES ${total.toLocaleString("en-KE")}`, { align: "center" });
    doc.text(`Average contribution: KES ${avg.toLocaleString("en-KE")}`, { align: "center" });
    if (topDonor?.donor_name) {
      doc.text(`Highest contribution: KES ${Number(topDonor.amount).toLocaleString("en-KE")} by ${topDonor.donor_name}`, { align: "center" });
    }
    doc.moveDown(1);
    doc.fontSize(7).fillColor("999999").text("— End of Report —", { align: "center" });

    addFooter = () => {};
    addFooter();

    doc.end();

    await logAudit({
      adminId: admin.id,
      action: "export_ledger",
      details: { type: "pdf", count: donations?.length },
      ipAddress: (req as any).adminIp,
    });
  } catch (err) {
    console.error("pdf export error:", err);
    res.status(500).json({ error: "Export failed" });
  }
});
