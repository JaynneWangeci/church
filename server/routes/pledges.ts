import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import { requireAdmin } from "../lib/admin.js";
import { sendWhatsApp } from "../lib/twilio.js";
import { PLEDGE_VERSES, pickVerse } from "./verses.js";
import { enqueueFollowUp } from "../lib/queue.js";

export const pledgesRouter = Router();

pledgesRouter.post("/", async (req, res) => {
  try {
    const db = requireService();
    const { donor_name, amount, phone, whatsapp_number, reminder_freq, campaign_id } = req.body;
    if (!donor_name || !amount) return res.status(400).json({ error: "donor_name and amount required" });

    const newAmount = Number(amount);
    const name = donor_name.trim();

    // Check if this person already has a pending pledge
    const { data: existing } = await db
      .from("pledges")
      .select("*")
      .ilike("donor_name", name)
      .neq("status", "fulfilled")
      .order("created_at", { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      // Add to existing pledge
      const current = existing[0];
      const updatedAmount = Number(current.amount) + newAmount;
      const updatedRemaining = Math.max(0, updatedAmount - Number(current.paid));

      const { data, error } = await db
        .from("pledges")
        .update({ amount: updatedAmount, remaining: updatedRemaining })
        .eq("id", current.id)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });

      if (data?.whatsapp_number) {
        const amt = Number(data.amount).toLocaleString("en-KE");
        const added = newAmount.toLocaleString("en-KE");
        const v = pickVerse(PLEDGE_VERSES);
        const msg =
          `🙏 *Pledge Updated* — AIPCA Bahati Cathedral\n\n` +
          `Hi ${data.donor_name}! You added *KES ${added}* to your pledge. Your new total is *KES ${amt}*.\n\n` +
          `📖 *${v.ref}* — "${v.text}"\n\n` +
          `*EN* — Thank you for building His house. May the Lord bless you abundantly.\n` +
          `*SW* — Asante kwa kujenga Nyumba Yake. Mungu akubariki sana, na tujenge pamoja!`;

        sendWhatsApp(data.whatsapp_number, msg).catch(() => {});
      }

      return res.status(200).json({ pledge: data, updated: true });
    }

    // No existing pledge — create new
    const { data: campaign } = await db
      .from("campaigns")
      .select("id")
      .eq("slug", campaign_id || "development-fund")
      .single();

    const { data, error } = await db
      .from("pledges")
      .insert({
        donor_name: name,
        amount: newAmount,
        phone,
        whatsapp_number,
        reminder_freq: reminder_freq || "weekly",
        paid: 0,
        remaining: newAmount,
        campaign_id: campaign?.id,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    if (data?.whatsapp_number) {
      const amt = Number(data.amount).toLocaleString("en-KE");
      const v = pickVerse(PLEDGE_VERSES);
      const msg =
        `🙏 *Pledge Confirmation* — AIPCA Bahati Cathedral\n\n` +
        `Hi ${data.donor_name}! Thank you for your pledge of *KES ${amt}* towards the Harambee Development Fund.\n\n` +
        `📖 *${v.ref}* — "${v.text}"\n\n` +
        `_Baraka tele, familia yako ya AIPCA inakuombea._ 🇰🇪\n\n` +
        `You can track your progress and make payments at any time.\n` +
        `*EN* — Thank you for building His house. May the Lord bless you abundantly.\n` +
        `*SW* — Asante kwa kujenga Nyumba Yake. Mungu akubariki sana, na tujenge pamoja!`;

      sendWhatsApp(data.whatsapp_number, msg).catch(() => {});

      // Follow-up in 3 days
      enqueueFollowUp("pledge", data.whatsapp_number, data.donor_name, data.amount).catch(() => {});
    }

    res.status(201).json({ pledge: data, updated: false });
  } catch (err) {
    console.error("pledge create error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

pledgesRouter.get("/", async (_req, res) => {
  try {
    const db = requireService();
    const { data, error } = await db
      .from("pledges")
      .select("id, donor_name, amount, paid, remaining, status, rating, color_hex, created_at")
      .order("amount", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ pledges: data || [] });
  } catch (err) {
    console.error("pledges list error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

pledgesRouter.get("/:name", async (req, res) => {
  try {
    const db = requireService();
    const { data: pledges, error } = await db
      .from("pledges")
      .select("id, donor_name, amount, paid, remaining, status, rating, created_at")
      .ilike("donor_name", `%${req.params.name}%`)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const { data: honouredMembers } = await db
      .from("church_members")
      .select("id")
      .ilike("name", `%${req.params.name}%`);
    const honouredIds = (honouredMembers || []).map(m => m.id);

    const { data: honoured } = honouredIds.length
      ? await db.from("donations").select("id, donor_name, honour_known_as, amount, phone, created_at").eq("status", "completed").in("honored_member_id", honouredIds).order("created_at", { ascending: false })
      : { data: [] };

    res.json({ pledges: pledges || [], honoured: honoured || [] });
  } catch (err) {
    console.error("pledge search error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

pledgesRouter.get("/search/name", async (req, res) => {
  try {
    const db = requireService();
    const q = String(req.query.q || "").trim();
    if (!q) return res.json({ pledges: [], donations: [], honoured: [] });

    const { data: pledges } = await db
      .from("pledges")
      .select("id, donor_name, amount, paid, remaining, status, rating, color_hex, created_at")
      .ilike("donor_name", `%${q}%`)
      .order("amount", { ascending: false });

    const [
      { data: donationsByName },
      { data: honourMemberIds },
    ] = await Promise.all([
      db.from("donations").select("id, donor_name, amount, created_at, honored_member_id, receipt_number, phone").eq("status", "completed").ilike("donor_name", `%${q}%`),
      db.from("church_members").select("id").ilike("name", `%${q}%`),
    ]);

    const honourIds2 = (honourMemberIds || []).map(m => m.id);
    const { data: donationsByHonour } = honourIds2.length
      ? await db.from("donations").select("id, donor_name, honour_known_as, amount, created_at, honored_member_id, receipt_number, phone").eq("status", "completed").in("honored_member_id", honourIds2)
      : { data: [] };

    const donationMap = new Map<string, any>();
    for (const d of [...(donationsByName || []), ...(donationsByHonour || [])]) donationMap.set(d.id, d);
    const donations = Array.from(donationMap.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const { data: honouredMembers } = await db
      .from("church_members")
      .select("id")
      .ilike("name", `%${q}%`);
    const honouredIds = (honouredMembers || []).map(m => m.id);

    const { data: honoured } = honouredIds.length
      ? await db.from("donations").select("id, donor_name, honour_known_as, amount, phone, created_at").eq("status", "completed").in("honored_member_id", honouredIds).order("created_at", { ascending: false })
      : { data: [] };

    res.json({ pledges: pledges || [], donations: donations || [], honoured: honoured || [] });
  } catch (err) {
    console.error("pledge search error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

pledgesRouter.post("/:id/verify-phone", async (req, res) => {
  try {
    const db = requireService();
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "phone required" });

    const { data: pledge, error } = await db
      .from("pledges")
      .select("id, donor_name, whatsapp_number, phone")
      .eq("id", req.params.id)
      .single();

    if (error || !pledge) return res.status(404).json({ error: "Pledge not found" });

    const cleanStored = (pledge.whatsapp_number || pledge.phone || "").replace(/[^0-9]/g, "");
    const cleanInput = phone.replace(/[^0-9]/g, "");

    if (!cleanStored) {
      return res.status(400).json({ verified: false, error: "No phone number on record. Contact admin to adjust." });
    }

    const verified = cleanStored === cleanInput;
    res.json({ verified, donor_name: pledge.donor_name });
  } catch (err) {
    console.error("verify phone error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

pledgesRouter.post("/:id/pay-with-mpesa", async (req, res) => {
  try {
    const db = requireService();
    const { phone, amount } = req.body;
    if (!phone || !amount) return res.status(400).json({ error: "phone and amount required" });

    const { data: pledge } = await db.from("pledges").select("*").eq("id", req.params.id).single();
    if (!pledge) return res.status(404).json({ error: "Pledge not found" });

    // Try to find campaign
    const { data: campaign } = await db
      .from("campaigns")
      .select("id")
      .eq("slug", "development-fund")
      .single();

    // Auto-resolve church_member_id from donor name
    const { data: member } = await db
      .from("church_members")
      .select("id")
      .eq("is_active", true)
      .ilike("name", pledge.donor_name);
    const churchMemberId = member?.[0]?.id || null;

    // Create a donation record linked to this pledge
    const { data: donation, error: donErr } = await db
      .from("donations")
      .insert({
        donor_name: pledge.donor_name,
        amount: Number(amount),
        phone,
        status: "pending",
        method: "mpesa",
        campaign_id: campaign?.id,
        church_member_id: churchMemberId,
        account_reference: `PLD:${req.params.id}`,
        transaction_desc: "Pledge Payment",
      })
      .select()
      .single();

    if (donErr || !donation) return res.status(500).json({ error: "Failed to create payment record" });

    // Call STK Push via internal request
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const host = req.headers.host || "localhost:3000";
    const mpesaRes = await fetch(`${protocol}://${host}/api/mpesa/stkpush`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        amount: Number(amount),
        donation_id: donation.id,
        account_reference: `PLD:${req.params.id}`,
        transaction_desc: "Pledge Payment",
      }),
    });

    const mpesaData = await mpesaRes.json();

    if (!mpesaData.CheckoutRequestID) {
      // STK Push failed, delete the donation
      await db.from("donations").delete().eq("id", donation.id).limit(1);
      return res.status(400).json({ error: mpesaData.errorMessage || "M-Pesa request failed" });
    }

    res.json({ CheckoutRequestID: mpesaData.CheckoutRequestID, donation_id: donation.id });
  } catch (err) {
    console.error("pledge pay-with-mpesa error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

pledgesRouter.post("/:id/adjust", async (req, res) => {
  try {
    const db = requireService();
    const { phone, new_amount } = req.body;
    if (!phone || !new_amount) return res.status(400).json({ error: "phone and new_amount required" });

    const { data: pledge } = await db.from("pledges").select("*").eq("id", req.params.id).single();
    if (!pledge) return res.status(404).json({ error: "Pledge not found" });

    const cleanStored = (pledge.whatsapp_number || pledge.phone || "").replace(/[^0-9]/g, "");
    const cleanInput = phone.replace(/[^0-9]/g, "");
    if (!cleanStored) return res.status(400).json({ error: "No phone number on record. Contact admin to adjust." });
    if (cleanStored !== cleanInput) return res.status(403).json({ error: "Phone verification failed" });

    const newAmount = Number(new_amount);
    if (newAmount < 10) return res.status(400).json({ error: "Minimum pledge is KES 10" });
    if (newAmount < Number(pledge.paid)) return res.status(400).json({ error: "New amount cannot be less than already paid" });

    const newRemaining = Math.max(0, newAmount - Number(pledge.paid));
    const newStatus = newRemaining <= 0 ? "fulfilled" : "pending";

    const { data, error } = await db
      .from("pledges")
      .update({ amount: newAmount, remaining: newRemaining, status: newStatus })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ pledge: data });
  } catch (err) {
    console.error("pledge adjust error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

pledgesRouter.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const db = requireService();
    const { amount, reminder_freq, whatsapp_number } = req.body;

    const { data: pledge } = await db.from("pledges").select("*").eq("id", req.params.id).single();
    if (!pledge) return res.status(404).json({ error: "Pledge not found" });

    const updates: any = {};
    if (amount !== undefined) {
      const newAmount = Number(amount);
      if (newAmount < Number(pledge.paid)) return res.status(400).json({ error: "Amount cannot be less than already paid" });
      updates.amount = newAmount;
      updates.remaining = Math.max(0, newAmount - Number(pledge.paid));
    }
    if (reminder_freq) updates.reminder_freq = reminder_freq;
    if (whatsapp_number !== undefined) updates.whatsapp_number = whatsapp_number;

    const { data, error } = await db
      .from("pledges")
      .update(updates)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ pledge: data });
  } catch (err) {
    console.error("pledge update error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

pledgesRouter.patch("/:id/pay", async (req, res) => {
  try {
    const db = requireService();
    const { amount, receipt_number } = req.body;
    if (!amount) return res.status(400).json({ error: "amount required" });
    const payAmount = Number(amount);
    if (payAmount <= 0) return res.status(400).json({ error: "amount must be greater than 0" });

    const { data: pledge } = await db.from("pledges").select("*").eq("id", req.params.id).single();
    if (!pledge) return res.status(404).json({ error: "Pledge not found" });

    if (payAmount > Number(pledge.remaining)) return res.status(400).json({ error: `Amount exceeds remaining balance of KES ${Number(pledge.remaining).toLocaleString("en-KE")}` });

    const newPaid = Number(pledge.paid) + payAmount;
    const newRemaining = Math.max(0, Number(pledge.amount) - newPaid);
    const newStatus = newRemaining <= 0 ? "fulfilled" : "pending";

    await db.from("pledge_payments").insert({
      pledge_id: req.params.id,
      amount: payAmount,
      receipt_number,
    });

    const { data, error } = await db
      .from("pledges")
      .update({ paid: newPaid, remaining: newRemaining, status: newStatus })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ pledge: data });
  } catch (err) {
    console.error("pledge pay error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

pledgesRouter.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const db = requireService();
    const { data: pledge } = await db.from("pledges").select("id").eq("id", req.params.id).single();
    if (!pledge) return res.status(404).json({ error: "Pledge not found" });
    await db.from("pledge_payments").delete().eq("pledge_id", req.params.id);
    const { error } = await db.from("pledges").delete().eq("id", req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    console.error("pledge delete error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
