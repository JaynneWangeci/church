import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import { sendSMS } from "../lib/sajsoft.js";
import { REMINDER_VERSES, CONGRATULATION_VERSES, pickVerse } from "./verses.js";
import { getPhoneForName, savePhoneForName } from "../lib/contacts.js";

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
  // Send initial reminder within first 2 hours of creation
  if (diffDays < 1 && diffMs < 2 * 60 * 60 * 1000) return true;
  if (freq === "daily") {
    // 9 AM EAT = 6 AM UTC — send once per day
    return now.getUTCHours() === 6;
  }
  if (freq === "weekly") return diffDays >= 1 && diffDays % 7 === 0;
  if (freq === "monthly") return diffDays >= 1 && diffDays % 30 === 0;
  return false;
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
      .select("id, donor_name, phone, whatsapp_number, reminder_freq, amount, paid, remaining, created_at")
      .neq("status", "fulfilled");

    const usedRefs = new Set<number>();
    let sent = 0;
    let skipped = 0;
    for (const pledge of due || []) {
      // Use canonical phone (church_members.phone), fall back to pledge's stored number
      const phone = await getPhoneForName(pledge.donor_name) || pledge.whatsapp_number || pledge.phone;
      if (!phone) { skipped++; continue; }

      // Backfill: if we found a phone via the pledge but it's not yet on church_members, save it
      if (pledge.phone) savePhoneForName(pledge.donor_name, pledge.phone).catch(() => {});

      const freq = parseFreq(pledge.reminder_freq);
      if (!shouldSendNow(pledge.created_at, freq)) { skipped++; continue; }

      const pct = pledge.amount > 0 ? Math.round((pledge.paid / pledge.amount) * 100) : 0;
      const remaining = Math.max(0, pledge.amount - pledge.paid);

      let milestone = "";
      let verseList = REMINDER_VERSES;
      if (remaining === 0 && pledge.amount > 0) {
        milestone = `\nCONGRATULATIONS! You have fully paid your pledge! Thank you for your faithfulness! May the Lord bless you abundantly.`;
        verseList = CONGRATULATION_VERSES;
      } else if (pct >= 50 && pct < 100) {
        milestone = `\nYou are over halfway there! Keep going — every shilling builds His house!`;
      }

      const v = pickVerse(verseList, "en", usedRefs);
      usedRefs.add(v.idx);
      if (usedRefs.size >= verseList.length) usedRefs.clear();
      const message = `Pledge Progress - AIPCA Bahati Cathedral\n\nHi ${pledge.donor_name}!\n\nPledged: KES ${pledge.amount.toLocaleString()}\nPaid: KES ${pledge.paid.toLocaleString()} (${pct}%)\nRemaining: KES ${remaining.toLocaleString()}${milestone}\n\n"${v.text}" - ${v.ref}\n\nMungu akubariki!`;

      const ok = await sendSMS(phone, message);
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
      const phone = n.phone;
      if (!phone) continue;
      const msg = n.message || `AIPCA Bahati Cathedral - Thank you for your generosity!`;
      const sentFollowUp = await sendSMS(phone, msg);
      if (sentFollowUp) {
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

    // Look up church_member by exact name
    const { data: member } = await db
      .from("church_members")
      .select("id, phone")
      .ilike("name", q)
      .maybeSingle();

    // Pledges: primary by donor_name match, fallback by member phone
    const { data: pledgesByName } = await db
      .from("pledges")
      .select("*")
      .ilike("donor_name", q)
      .order("created_at", { ascending: false });

    let pledgesByPhone: any[] = [];
    if (member?.phone) {
      const { data: phonePledges } = await db
        .from("pledges")
        .select("*")
        .eq("phone", member.phone)
        .order("created_at", { ascending: false });
      pledgesByPhone = phonePledges || [];
    }

    const pledgeMap = new Map<string, any>();
    for (const p of [...(pledgesByName || []), ...pledgesByPhone]) pledgeMap.set(p.id, p);
    const pledges = Array.from(pledgeMap.values());

    const memberIds = member ? [member.id] : [];

    const [donationsByDonor, donationsByMember, donationsByHonour, honouredRes] = await Promise.all([
      // donations where donor_name matches
      db.from("donations").select("id, donor_name, amount, status, receipt_number, phone, created_at").eq("status", "completed").ilike("donor_name", q).order("created_at", { ascending: false }),
      // donations where church_member_id matches (donor's member record)
      memberIds.length ? db.from("donations").select("id, donor_name, amount, status, receipt_number, phone, created_at").eq("status", "completed").in("church_member_id", memberIds).order("created_at", { ascending: false }) : { data: [] },
      // donations where honored_member_id matches (donations in honour of this person)
      memberIds.length ? db.from("donations").select("id, donor_name, amount, status, receipt_number, phone, created_at").eq("status", "completed").in("honored_member_id", memberIds).order("created_at", { ascending: false }) : { data: [] },
      // people who honoured this person (donations where honored_member_id matches)
      memberIds.length ? db.from("donations").select("id, donor_name, honour_known_as, amount, phone, created_at").eq("status", "completed").in("honored_member_id", memberIds).order("created_at", { ascending: false }) : { data: [] },
    ]);

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
