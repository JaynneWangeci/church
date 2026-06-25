import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import { sendWhatsApp } from "../lib/meta-whatsapp.js";
import { REMINDER_VERSES, PAYMENT_VERSES, pickVerse } from "./verses.js";

export const remindersRouter = Router();

function parseFreq(freq: string | null): "daily" | "weekly" | "monthly" {
  if (freq === "daily" || freq === "weekly" || freq === "monthly") return freq;
  return "weekly";
}

function shouldSendNow(createdAt: string, freq: "daily" | "weekly" | "monthly"): boolean {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return true; // always send at least once
  if (freq === "daily") return true;
  if (freq === "weekly") return diffDays % 7 === 0;
  if (freq === "monthly") return diffDays % 30 === 0;
  return true;
}

// ── Send pending reminders (callable by cron every hour) ──
remindersRouter.post("/send", async (req, res) => {
  // Verify cron secret if provided (Vercel Cron sends x-cron-secret header)
  const cronSecret = req.headers["x-cron-secret"] as string || req.headers.authorization?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    if (process.env.CRON_SECRET) return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const db = requireService();
    const now = new Date().toISOString();

    const { data: due } = await db
      .from("pledges")
      .select("id, donor_name, whatsapp_number, reminder_freq, amount, paid, remaining, created_at")
      .not("whatsapp_number", "is", null)
      .neq("status", "fulfilled");

    let sent = 0;
    let skipped = 0;
    for (const pledge of due || []) {
      if (!pledge.whatsapp_number) continue;

      const freq = parseFreq(pledge.reminder_freq);
      if (!shouldSendNow(pledge.created_at, freq)) { skipped++; continue; }

      const enV = pickVerse(REMINDER_VERSES, "en");
      const swV = pickVerse(REMINDER_VERSES, "sw");
      const pct = pledge.amount > 0 ? Math.round((pledge.paid / pledge.amount) * 100) : 0;
      const remaining = Math.max(0, pledge.amount - pledge.paid);

      let milestone = "";
      if (remaining === 0 && pledge.amount > 0) {
        milestone = `\n\n🎉 CONGRATULATIONS! You have fully paid your pledge! Thank you for your faithfulness! Mungu akubariki sana! 🎉`;
      } else if (pct >= 50 && pct < 100) {
        milestone = `\n\n🌟 You're over halfway there! Keep going — every shilling builds His house!`;
      }

      const message = `⛪ AIPCA Bahati Cathedral\n\nHabari ${pledge.donor_name}!\n\nYour Pledge Summary:\n• Pledged: KES ${pledge.amount.toLocaleString()}\n• Paid: KES ${pledge.paid.toLocaleString()} (${pct}%)\n• Remaining: KES ${remaining.toLocaleString()}\n\nEncouragement:\n"${enV.text}" — ${enV.ref}\n\n"${swV.text}" — ${swV.ref}${milestone}\n\nMungu akubariki! AIPCA Bahati Cathedral`;

      const ok = await sendWhatsApp(pledge.whatsapp_number, message);
      if (ok) sent++;
    }

    // Process pending follow-ups (donation thank-yous, etc.)
    const { data: pending } = await db
      .from("pending_notifications")
      .select("*")
      .lte("send_at", now)
      .limit(50);

    let followUpSent = 0;
    for (const n of pending || []) {
      let msg = "";
      if (n.type === "donation_thanks") {
        const v = pickVerse(PAYMENT_VERSES);
        msg = `⛪ AIPCA Bahati Cathedral\n\nAsante sana ${n.donor_name}! Your gift of KES ${Number(n.amount).toLocaleString("en-KE")} has been received. ${n.receipt ? `Receipt: ${n.receipt}` : ""}\n\n"${v.text}" — ${v.ref}\n\nMungu akubariki!`;
      } else if (n.type === "pledge_followup") {
        const enV = pickVerse(REMINDER_VERSES, "en");
        const swV = pickVerse(REMINDER_VERSES, "sw");
        msg = `⛪ AIPCA Bahati Cathedral\n\nHabari ${n.donor_name}! Just checking in on your pledge of KES ${Number(n.amount).toLocaleString("en-KE")}.\n\nYou can pay via M-Pesa Paybill 835872, Account: Your Name.\n\n"${enV.text}" — ${enV.ref}\n\n"${swV.text}" — ${swV.ref}\n\nMungu akubariki!`;
      } else continue;

      const ok = await sendWhatsApp(n.phone, msg);
      if (ok) {
        await db.from("pending_notifications").delete().eq("id", n.id);
        followUpSent++;
      }
    }

    res.json({ ok: true, sent, skipped, follow_up_sent: followUpSent, total: due?.length || 0 });
  } catch (err) {
    console.error("reminder send error:", err);
    res.status(500).json({ error: "Failed to send reminders" });
  }
});

// ── Get a random Bible verse ──
remindersRouter.get("/verse", async (req, res) => {
  try {
    const db = requireService();
    const lang = (req.query.lang as string) || "en";
    const { data } = await db
      .from("bible_verses")
      .select("*")
      .eq("language", lang)
      .limit(20);

    const verses = data || [];
    const verse = verses.length ? verses[Math.floor(Math.random() * verses.length)] : null;
    res.json({ verse });
  } catch (err) {
    console.error("verse error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Personal portfolio endpoint ──
remindersRouter.get("/portfolio", async (req, res) => {
  try {
    const db = requireService();
    const q = String(req.query.name || "").trim().replace(/[%_<>]/g, "").slice(0, 100);
    if (!q) return res.status(400).json({ error: "name required" });

    // Get matching member ids for sub-queries
    const { data: matchingMembers } = await db
      .from("church_members")
      .select("id")
      .ilike("name", `%${q}%`);
    const memberIds = (matchingMembers || []).map(m => m.id);

    const [pledgesRes, donationsByDonor, donationsByMember, donationsByHonour, honouredRes] = await Promise.all([
      db.from("pledges").select("*").ilike("donor_name", `%${q}%`).order("created_at", { ascending: false }),
      // donations where donor_name matches
      db.from("donations").select("id, donor_name, amount, status, receipt_number, phone, created_at").eq("status", "completed").ilike("donor_name", `%${q}%`).order("created_at", { ascending: false }),
      // donations where church_member_id matches (donor's member record)
      memberIds.length ? db.from("donations").select("id, donor_name, amount, status, receipt_number, phone, created_at").eq("status", "completed").in("church_member_id", memberIds).order("created_at", { ascending: false }) : { data: [] },
      // donations where honored_member_id matches (donations in honour of this person)
      memberIds.length ? db.from("donations").select("id, donor_name, amount, status, receipt_number, phone, created_at").eq("status", "completed").in("honored_member_id", memberIds).order("created_at", { ascending: false }) : { data: [] },
      // people who honoured this person (donations where honored_member_id matches)
      memberIds.length ? db.from("donations").select("id, donor_name, honour_known_as, amount, phone, created_at").eq("status", "completed").in("honored_member_id", memberIds).order("created_at", { ascending: false }) : { data: [] },
    ]);

    const pledges = pledgesRes.data || [];

    // Merge donations: de-duplicate by id
    const donationMap = new Map();
    for (const d of [...(donationsByDonor.data || []), ...((donationsByMember as any).data || []), ...((donationsByHonour as any).data || [])]) {
      donationMap.set(d.id, d);
    }
    const donations = Array.from(donationMap.values());

    const honoured = honouredRes.data || [];

    const totalDonated = donations.reduce((s: number, d: any) => s + Number(d.amount), 0);
    const honourCount = honoured.length;
    const honourTotal = honoured.reduce((s: number, h: any) => s + Number(h.amount), 0);

    res.json({
      name: q,
      pledges,
      donations,
      honoured,
      stats: {
        total_donated: totalDonated,
        donation_count: donations.length,
        honour_count: honourCount,
        honour_total: honourTotal,
      },
    });
  } catch (err) {
    console.error("portfolio error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
