import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import { requireAdmin, requireAdminOrAbove, recalculatePledgeFulfillment } from "../lib/admin.js";
import { sendSMS } from "../lib/sajsoft.js";
import { withRetry } from "../lib/financial-safety.js";
import { stkPushToPhone } from "./mpesa.js";
import { PLEDGE_VERSES, pickVerse } from "./verses.js";
import { enqueueFollowUp } from "../lib/queue.js";
import { cacheGet, cacheSet, cacheKey } from "../lib/redis.js";
import { rateLimitMiddleware } from "../lib/rateLimiter.js";
import { savePhoneForName } from "../lib/contacts.js";

export const pledgesRouter = Router();

pledgesRouter.post("/", async (req, res) => {
  try {
    const db = requireService();
    const { donor_name, amount, phone, reminder_freq, campaign_id } = req.body;
    if (!donor_name || !amount) return res.status(400).json({ error: "donor_name and amount required" });

    const newAmount = Number(amount);
    const name = donor_name.trim().replace(/[%_<>]/g, "").slice(0, 100);

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

      if (data?.phone) savePhoneForName(data.donor_name, data.phone).catch(() => {});

      if (data?.phone) {
        const amt = Number(data.amount).toLocaleString("en-KE");
        const added = newAmount.toLocaleString("en-KE");
        const v = pickVerse(PLEDGE_VERSES, "en");
        const msg = `Pledge Updated - AIPCA Bahati Cathedral\n\nHi ${data.donor_name}! You added KES ${added} to your pledge. Your new total is KES ${amt}.\n\n"${v.text}" - ${v.ref}\n\nThank you for building His house. May the Lord bless you abundantly.`;

        sendSMS(data.phone, msg).catch(e => console.error("✉ SMS failed (pledge update):", e));
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
        reminder_freq: reminder_freq || "weekly",
        paid: 0,
        remaining: newAmount,
        campaign_id: campaign?.id,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Save phone to church_members for unified messaging
    if (phone) savePhoneForName(data.donor_name, phone).catch(() => {});

    if (data?.phone) {
      const amt = Number(data.amount).toLocaleString("en-KE");
      const v = pickVerse(PLEDGE_VERSES, "en");
      const msg = `Pledge Confirmation - AIPCA Bahati Cathedral\n\nHi ${data.donor_name}! Thank you for your pledge of KES ${amt} towards the Harambee Development Fund.\n\n"${v.text}" - ${v.ref}\n\nYou can track your progress and make payments at any time.\nThank you for building His house. May the Lord bless you abundantly.`;

      sendSMS(data.phone, msg).catch(e => console.error("✉ SMS failed (pledge create):", e));

      enqueueFollowUp("pledge", data.phone, data.donor_name, data.amount);
    }

    res.status(201).json({ pledge: data, updated: false });
  } catch (err) {
    console.error("pledge create error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

pledgesRouter.get("/", async (_req, res) => {
  try {
    const cacheKeyStr = cacheKey("pledges", "list");
    const cached = await cacheGet<any>(cacheKeyStr);
    if (cached) return res.json(cached);

    const db = requireService();
    await recalculatePledgeFulfillment(db);
    const { data, error } = await db
      .from("pledges")
      .select("id, donor_name, amount, paid, remaining, status, rating, color_hex, created_at")
      .order("amount", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    const result = { pledges: data || [] };
    await cacheSet(cacheKeyStr, result, 5).catch(() => {});
    res.json(result);
  } catch (err) {
    console.error("pledges list error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

pledgesRouter.get("/totals/public", async (_req, res) => {
  try {
    const db = requireService();
    const { data } = await db
      .from("pledges")
      .select("amount, paid");
    const totals = (data || []).reduce(
      (acc, p) => ({
        total_pledged: acc.total_pledged + Number(p.amount),
        total_paid: acc.total_paid + Number(p.paid),
      }),
      { total_pledged: 0, total_paid: 0 }
    );
    res.json(totals);
  } catch (err) {
    console.error("pledge totals error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

pledgesRouter.get("/:name", async (req, res) => {
  try {
    const db = requireService();
    const name = String(req.params.name || "").trim().replace(/[%_<>]/g, "").slice(0, 100);
    const { data: pledges, error } = await db
      .from("pledges")
      .select("id, donor_name, amount, paid, remaining, status, rating, created_at")
      .ilike("donor_name", `%${name}%`)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const { data: honouredMembers } = await db
      .from("church_members")
      .select("id")
      .ilike("name", `%${name}%`);
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
    const q = String(req.query.q || "").trim().replace(/[%_<>]/g, "").slice(0, 100);
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
      .select("id, donor_name, phone")
      .eq("id", req.params.id)
      .single();

    if (error || !pledge) return res.status(404).json({ error: "Pledge not found" });

    const cleanStored = (pledge.phone || "").replace(/[^0-9]/g, "");
    const cleanInput = phone.replace(/[^0-9]/g, "");

    if (!cleanStored) {
      // No phone on record — save this phone and allow the adjustment
      await db.from("pledges").update({ phone }).eq("id", req.params.id);
      return res.json({ verified: true, donor_name: pledge.donor_name, phone_saved: true });
    }

    const verified = cleanStored === cleanInput;
    res.json({ verified, donor_name: pledge.donor_name });
  } catch (err) {
    console.error("verify phone error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

pledgesRouter.post("/:id/pay-with-mpesa", rateLimitMiddleware(), async (req, res) => {
  try {
    const db = requireService();
    const { phone, amount } = req.body;
    if (!phone || !amount) return res.status(400).json({ error: "phone and amount required" });

    const { data: pledge } = await db.from("pledges").select("id, donor_name, campaign_id").eq("id", req.params.id).single();
    if (!pledge) return res.status(404).json({ error: "Pledge not found" });

    // Try to find campaign
    const { data: campaign } = await db.from("campaigns").select("id").eq("slug", "development-fund").single();

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
        account_reference: `PLD:${req.params.id}`,
        transaction_desc: "Pledge Payment",
      })
      .select()
      .single();

    if (donErr || !donation) return res.status(500).json({ error: "Failed to create payment record" });

    // Call STK Push directly
    const result = await stkPushToPhone(phone, Number(amount), `PLD:${req.params.id}`, "Pledge Payment");

    if (!result.ok || !result.CheckoutRequestID) {
      await db.from("donations").delete().eq("id", donation.id).limit(1);
      return res.status(400).json({ error: result.errorMessage || "M-Pesa request failed" });
    }

    // Save the checkout request ID on the donation
    await db.from("donations").update({ checkout_request_id: result.CheckoutRequestID }).eq("id", donation.id);

    // Sandbox auto-complete
    if ((process.env.MPESA_ENV || "sandbox") === "sandbox") {
      await withRetry(async () => {
        await db.from("donations").update({ status: "completed", receipt_number: `SANDBOX-${Date.now()}` }).eq("id", donation.id);
        await db.rpc("increment_campaign_raised", { campaign_id: donation.campaign_id, amount: Number(donation.amount) }).catch(() => {});
      }, "pay-with-mpesa sandbox");
      const { PAYMENT_VERSES, pickVerse } = await import("./verses.js");
      const v = pickVerse(PAYMENT_VERSES, "en");
      const msg = `Donation Confirmation - AIPCA Bahati Cathedral\n\nAsante sana ${pledge.donor_name}!\nYour gift of KES ${Number(amount).toLocaleString("en-KE")} has been received successfully.\n\n"${v.text}" - ${v.ref}\n\nThank you for building His house. May the Lord bless you abundantly.`;
      sendSMS(phone, msg).catch(e => console.error("✉ SMS failed:", e));
    }

    res.json({ CheckoutRequestID: result.CheckoutRequestID, donation_id: donation.id });
  } catch (err) {
    console.error("pledge pay-with-mpesa error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

pledgesRouter.post("/:id/adjust", async (req, res) => {
  try {
    const db = requireService();
    const { new_amount } = req.body;
    if (!new_amount) return res.status(400).json({ error: "new_amount required" });

    const raw = String(new_amount).replace(/[^0-9]/g, "");
    if (!raw || raw.length > 9) return res.status(400).json({ error: "Invalid amount" });
    const newAmount = parseInt(raw, 10);
    if (newAmount < 10) return res.status(400).json({ error: "Minimum pledge is KES 10" });

    const { data: pledge } = await db.from("pledges").select("*").eq("id", req.params.id).single();
    if (!pledge) return res.status(404).json({ error: "Pledge not found" });
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

    // Send SMS confirmation
    if (data?.phone) {
      const amt = Number(data.amount).toLocaleString("en-KE");
      const diff = Math.abs(newAmount - Number(pledge.amount)).toLocaleString("en-KE");
      const direction = newAmount > Number(pledge.amount) ? "increased" : "reduced";
      const v = pickVerse(PLEDGE_VERSES, "en");
      const msg = `Pledge ${direction === "increased" ? "Increased" : "Reduced"} - AIPCA Bahati Cathedral\n\nHi ${data.donor_name}! Your pledge has been ${direction} by KES ${diff}. Your new total is KES ${amt}.\n\n"${v.text}" - ${v.ref}\n\nThank you for building His house. May the Lord bless you abundantly.`;
      sendSMS(data.phone, msg).catch(e => console.error("✉ SMS failed (pledge adjust):", e));
    }

    res.json({ pledge: data });
  } catch (err) {
    console.error("pledge adjust error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

pledgesRouter.patch("/:id", async (req, res) => {
  try {
    const db = requireService();
    const { amount, reminder_freq } = req.body;

    const { data: pledge } = await db.from("pledges").select("*").eq("id", req.params.id).single();
    if (!pledge) return res.status(404).json({ error: "Pledge not found" });

    const updates: any = {};
    if (amount !== undefined) {
      const raw = String(amount).replace(/[^0-9]/g, "");
      if (!raw || raw.length > 9) return res.status(400).json({ error: "Invalid amount" });
      const newAmount = parseInt(raw, 10);
      if (newAmount < Number(pledge.paid)) return res.status(400).json({ error: "Amount cannot be less than already paid" });
      updates.amount = newAmount;
      updates.remaining = Math.max(0, newAmount - Number(pledge.paid));
    }
    if (reminder_freq) updates.reminder_freq = reminder_freq;

    const { data, error } = await db
      .from("pledges")
      .update(updates)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Send SMS confirmation
    if (data?.phone && amount !== undefined) {
      const amt = Number(data.amount).toLocaleString("en-KE");
      const v = pickVerse(PLEDGE_VERSES, "en");
      const msg = `Pledge Updated - AIPCA Bahati Cathedral\n\nHi ${data.donor_name}! Your pledge has been updated to KES ${amt}.\n\n"${v.text}" - ${v.ref}\n\nThank you for building His house. May the Lord bless you abundantly.`;
      sendSMS(data.phone, msg).catch(e => console.error("✉ SMS failed (pledge edit):", e));
    }

    res.json({ pledge: data });
  } catch (err) {
    console.error("pledge update error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

pledgesRouter.patch("/:id/pay", requireAdmin, requireAdminOrAbove, async (req, res) => {
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

    // Record payment as a real donation so recalculation picks it up
    const { error: donErr } = await db.from("donations").insert({
      donor_name: pledge.donor_name,
      amount: payAmount,
      method: "cash",
      status: "completed",
      campaign_id: pledge.campaign_id,
      channel: "admin",
      receipt_number: receipt_number || `ADMIN-${Date.now()}`,
    });
    if (donErr) console.error("donation insert error:", donErr);

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

// TEMPORARY: Debug SMS endpoint — no auth required
pledgesRouter.get("/debug-sms", async (req, res) => {
  const phone = String(req.query.phone || "");
  if (!phone) return res.json({ error: "Add ?phone=2547XXXXXXX to test" });
  const { sendTestSMS } = await import("../lib/sajsoft.js");
  const result = await sendTestSMS(phone);
  res.json(result);
});

pledgesRouter.delete("/:id", requireAdmin, requireAdminOrAbove, async (req, res) => {
  try {
    const db = requireService();
    const { data: pledge } = await db.from("pledges").select("id").eq("id", req.params.id).single();
    if (!pledge) return res.status(404).json({ error: "Pledge not found" });
    const { error } = await db.from("pledges").delete().eq("id", req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    console.error("pledge delete error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
