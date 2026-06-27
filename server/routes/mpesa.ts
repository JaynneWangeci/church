import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import { sendWhatsApp } from "../lib/meta-whatsapp.js";
import { sendSMS } from "../lib/sajsoft.js";
import { requireAdmin } from "../lib/admin.js";
import { PAYMENT_VERSES, pickVerse } from "./verses.js";
import { enqueueFollowUp } from "../lib/queue.js";
import {
  checkPhoneStkRateLimit,
  validateDonationAmount,
  isCallbackAlreadyProcessed,
  logCallback,
  markCallbackProcessed,
  getCallbackIp,
  withRetry,
  checkSuspiciousActivity,
  logSuspiciousActivity,
} from "../lib/financial-safety.js";

export const mpesaRouter = Router();

const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || "";
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || "";
const SHORTCODE = process.env.MPESA_SHORTCODE || "";
const PASSKEY = process.env.MPESA_PASSKEY || "";
const CALLBACK_URL = process.env.MPESA_CALLBACK_URL || "";
const ENV = (process.env.MPESA_ENV || "sandbox") as "sandbox" | "production";

const BASE_URL =
  ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

let cachedToken: { token: string; expiresAt: number } | null = null;

getAccessToken().catch(() => {});
setInterval(() => getAccessToken().catch(() => {}), 55 * 60 * 1000);

function timestamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  return `${y}${m}${d}${h}${min}${s}`;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!res.ok) {
    throw new Error(`Daraja auth failed (${res.status})`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in) - 60) * 1000,
  };
  return data.access_token;
}

function donationConfirmation(donation: any): void {
  const name = donation.donor_name || "Mungu anakupenda";
  const amount = Number(donation.amount).toLocaleString("en-KE");
  const receipt = donation.receipt_number || "";
  const v = pickVerse(PAYMENT_VERSES, "en");
  const msg =
    `Donation Confirmation - AIPCA Bahati Cathedral\n\n` +
    `Asante sana ${name}!\n` +
    `Your gift of KES ${amount} has been received successfully.\n` +
    `${receipt ? `Receipt: ${receipt}\n` : ""}` +
    `\n"${v.text}" - ${v.ref}\n` +
    `Thank you for building His house. May the Lord bless you abundantly.`;

  sendSMS(donation.phone, msg).catch((err) => console.error("✉ SMS failed (donation confirm):", err));
  enqueueFollowUp("payment", donation.phone, name, donation.amount, donation.receipt_number);
}

// ── STK Push (public, rate-limited) ── //

mpesaRouter.post("/stkpush", async (req, res) => {
  try {
    const { phone, amount, account_reference, transaction_desc, donation_id } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({ error: "phone and amount required" });
    }

    const numericAmount = Math.round(Number(amount));

    // Safety check 1: validate amount
    const amountCheck = validateDonationAmount(numericAmount);
    if (!amountCheck.valid) {
      return res.status(400).json({ error: amountCheck.error });
    }

    // Normalize phone
    let normalizedPhone = phone.replace(/[\s\-\(\)]/g, "");
    if (normalizedPhone.startsWith("0")) {
      normalizedPhone = "254" + normalizedPhone.slice(1);
    } else if (normalizedPhone.startsWith("+")) {
      normalizedPhone = normalizedPhone.slice(1);
    }

    if (normalizedPhone.length < 10) {
      return res.status(400).json({ error: "Invalid phone number" });
    }

    // Safety check 2: per-phone rate limiting (max 3 STK Push per hour per phone)
    const phoneCheck = checkPhoneStkRateLimit(normalizedPhone);
    if (!phoneCheck.allowed) {
      const { logAudit } = await import("../lib/audit.js");
      logAudit({ action: "stk_rate_limited" as any, details: { phone: normalizedPhone } }).catch(() => {});
      return res.status(429).json({
        error: `Too many requests to this phone. Try again in ${phoneCheck.retryAfterMinutes} minutes.`,
      });
    }

    // Safety check 3: flag suspicious activity (non-blocking)
    const flags = checkSuspiciousActivity(normalizedPhone, numericAmount, null);
    if (flags.length) {
      logSuspiciousActivity(flags, donation_id);
    }

    const accessToken = await getAccessToken();
    const ts = timestamp();
    const password = Buffer.from(`${SHORTCODE}${PASSKEY}${ts}`).toString("base64");

    const payload = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: ts,
      TransactionType: "CustomerPayBillOnline",
      Amount: numericAmount,
      PartyA: normalizedPhone,
      PartyB: SHORTCODE,
      PhoneNumber: normalizedPhone,
      CallBackURL: CALLBACK_URL,
      AccountReference: account_reference?.slice(0, 12) || "Harambee",
      TransactionDesc: transaction_desc?.slice(0, 13) || "Harambee Donation",
    };

    const stkRes = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const stkData = await stkRes.json();

    if (String(stkData.ResponseCode) === "0" && donation_id) {
      const db = requireService();

      await db
        .from("donations")
        .update({ checkout_request_id: stkData.CheckoutRequestID })
        .eq("id", donation_id);

      if (ENV === "sandbox") {
        const { data: donation } = await db
          .from("donations")
          .select("id, campaign_id, amount, phone, donor_name")
          .eq("id", donation_id)
          .single();

        if (donation) {
          await withRetry(async () => {
            await db
              .from("donations")
              .update({
                status: "completed",
                receipt_number: `SANDBOX-${Date.now()}`,
              })
              .eq("id", donation.id);

            await db.rpc("increment_campaign_raised", {
              campaign_id: donation.campaign_id,
              amount: Number(donation.amount),
            });
          }, "stkpush sandbox complete");

          donationConfirmation({ ...donation, receipt_number: `SANDBOX-${Date.now()}` });
        }
      }
    }

    res.json(stkData);
  } catch (e) {
    console.error("mpesa stkpush error:", e);
    res.status(200).json({
      errorCode: "500",
      errorMessage: "M-Pesa request failed",
    });
  }
});

// ── M-Pesa Callback (Safaricom calls this after user enters PIN) ── //

mpesaRouter.post("/callback", async (req, res) => {
  try {
    const { Body } = req.body;
    if (!Body?.stkCallback) return res.status(200).json({ ok: true });

    const { ResultCode, CheckoutRequestID, CallbackMetadata } = Body.stkCallback;

    // Safety check 1: log every callback for audit trail
    await logCallback(CheckoutRequestID, req.body, false);

    // Safety check 2: idempotency — skip if already processed
    if (await isCallbackAlreadyProcessed(CheckoutRequestID)) {
      return res.status(200).json({ ok: true });
    }

    const db = requireService();
    const { data: donations } = await db
      .from("donations")
      .select("*")
      .eq("checkout_request_id", CheckoutRequestID)
      .limit(1);

    if (!donations?.length) return res.status(200).json({ ok: true });

    const donation = donations[0];

    if (ENV === "sandbox") {
      return res.status(200).json({ ok: true });
    }

    if (ResultCode === 0 && CallbackMetadata?.Item) {
      let receiptNumber = "";
      for (const item of CallbackMetadata.Item) {
        if (item.Name === "MpesaReceiptNumber") receiptNumber = item.Value;
      }

      // Safety check 3: deadlock-safe update with retry
      await withRetry(async () => {
        await db
          .from("donations")
          .update({
            status: "completed",
            receipt_number: receiptNumber || `TXN-${Date.now()}`,
          })
          .eq("id", donation.id);

        await db.rpc("increment_campaign_raised", {
          campaign_id: donation.campaign_id,
          amount: Number(donation.amount),
        });
      }, "callback complete donation");

      // If this donation is linked to a pledge, update the pledge
      if (donation.account_reference && String(donation.account_reference).startsWith("PLD:")) {
        const pledgeId = String(donation.account_reference).replace("PLD:", "");
        await withRetry(async () => {
          const { data: pledge } = await db.from("pledges").select("*").eq("id", pledgeId).single();
          if (pledge) {
            const payAmount = Number(donation.amount);
            const newPaid = Number(pledge.paid) + payAmount;
            const newRemaining = Math.max(0, Number(pledge.amount) - newPaid);
            const newStatus = newRemaining <= 0 ? "fulfilled" : "pending";
            await db.from("pledges").update({ paid: newPaid, remaining: newRemaining, status: newStatus }).eq("id", pledgeId);
          }
        }, "callback update pledge");
      }

      // Mark callback as processed (idempotency)
      await markCallbackProcessed(CheckoutRequestID);

      donationConfirmation({ ...donation, receipt_number: receiptNumber });
    } else {
      await db
        .from("donations")
        .update({ status: "failed" })
        .eq("id", donation.id);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("mpesa callback error:", err);
    res.status(200).json({ ok: true });
  }
});

// ── Resend WhatsApp (admin only) ──

mpesaRouter.post("/resend-whatsapp/:id", requireAdmin, async (req, res) => {
  try {
    const db = requireService();
    const { data } = await db
      .from("donations")
      .select("id, donor_name, amount, phone, receipt_number")
      .eq("id", req.params.id)
      .eq("status", "completed")
      .single();

    if (!data) return res.status(404).json({ error: "Completed donation not found" });
    if (!data.phone) return res.status(400).json({ error: "No phone number on record" });

    donationConfirmation(data);
    res.json({ ok: true });
  } catch (err) {
    console.error("resend wa error:", err);
    res.status(500).json({ error: "Failed" });
  }
});

mpesaRouter.get("/status/:checkoutRequestId", async (req, res) => {
  try {
    const { checkoutRequestId } = req.params;
    const db = requireService();

    const { data: donation } = await db
      .from("donations")
      .select("id, campaign_id, amount, status, receipt_number, phone, donor_name")
      .eq("checkout_request_id", checkoutRequestId)
      .single();

    if (donation?.status === "completed") {
      return res.json({ ResultCode: "0", status: "completed", receipt_number: donation.receipt_number });
    }

    if (ENV === "sandbox") {
      return res.json({ status: "pending" });
    }

    if (ENV !== "sandbox") {
      const accessToken = await getAccessToken();
      const ts = timestamp();
      const password = Buffer.from(`${SHORTCODE}${PASSKEY}${ts}`).toString("base64");

      const payload = {
        BusinessShortCode: SHORTCODE,
        Password: password,
        Timestamp: ts,
        CheckoutRequestID: checkoutRequestId,
      };

      const statusRes = await fetch(`${BASE_URL}/mpesa/stkpushquery/v1/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await statusRes.json();

      const receiptNumber = data.CallbackMetadata?.Item
        ?.find((item: any) => item.Name === "MpesaReceiptNumber")?.Value;

      if (String(data.ResultCode) === "0" && receiptNumber && donation) {
        await withRetry(async () => {
          await db
            .from("donations")
            .update({
              status: "completed",
              receipt_number: receiptNumber,
            })
            .eq("id", donation.id);

          await db.rpc("increment_campaign_raised", {
            campaign_id: donation.campaign_id,
            amount: Number(donation.amount),
          });
        }, "status query complete");

        donationConfirmation({ ...donation, receipt_number: receiptNumber });

        return res.json({ ResultCode: "0", status: "completed", receipt_number: receiptNumber });
      }
    }

    res.json({ status: "pending" });
  } catch (err) {
    console.error("mpesa status error:", err);
    res.status(500).json({ error: "Query failed" });
  }
});

// ── C2B (Paybill direct) ──

async function handleC2BConfirmation(req: any, res: any) {
  try {
    const body = req.body;
    res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });

    const donorName = (body.BillRefNumber || "").trim().replace(/[%_<>]/g, "").slice(0, 100);
    if (!donorName || donorName.length < 2) {
      console.log("C2B skipped: no BillRefNumber");
      return;
    }

    const amount = Number(body.TransAmount) || 0;
    if (amount < 10) { console.log("C2B skipped: amount too small"); return; }

    // Safety check: cap max amount
    const amountCheck = validateDonationAmount(amount);
    if (!amountCheck.valid) {
      console.log(`C2B skipped: ${amountCheck.error}`);
      return;
    }

    const phone = String(body.MSISDN || "");
    const receiptNumber = String(body.TransID || "");

    // Safety check: idempotency — skip duplicate TransID
    const db = requireService();
    const { data: duplicate } = await db
      .from("donations")
      .select("id")
      .eq("receipt_number", receiptNumber)
      .limit(1);
    if (duplicate?.length) {
      console.log(`C2B skipped: duplicate receipt ${receiptNumber}`);
      return;
    }

    const { data: existing } = await db
      .from("church_members").select("id").eq("is_active", true).ilike("name", donorName);
    let memberId = existing?.[0]?.id || null;
    if (!memberId) {
      const { data: newMember } = await db
        .from("church_members").insert({ name: donorName, council: "general_member" }).select().single();
      if (newMember) memberId = newMember.id;
    }

    const { data: campaign } = await db
      .from("campaigns").select("id").eq("slug", "development-fund").single();

    const { data: donation } = await withRetry(async () => {
      return await db.from("donations").insert({
        donor_name: donorName, amount, phone, status: "completed", method: "mpesa",
        receipt_number: receiptNumber, church_member_id: memberId,
        campaign_id: campaign?.id, account_reference: "C2B:" + receiptNumber,
        transaction_desc: "Paybill Direct",
      }).select().single();
    }, "c2b insert donation");

    if (donation && campaign?.id) {
      await db.rpc("increment_campaign_raised", { campaign_id: campaign.id, amount }).catch(() => {});
    }
    if (donation && phone) {
      donationConfirmation({ ...donation, receipt_number: receiptNumber });
    }
    console.log("C2B: recorded donation", donorName, amount, receiptNumber);
  } catch (err) {
    console.error("C2B confirmation error:", err);
  }
}

mpesaRouter.post("/c2b/validation", async (_req, res) => { res.json({ ResultCode: 0, ResultDesc: "Accepted" }); });
mpesaRouter.post("/paybill/validation", async (_req, res) => { res.json({ ResultCode: 0, ResultDesc: "Accepted" }); });
mpesaRouter.post("/c2b/confirmation", handleC2BConfirmation);
mpesaRouter.post("/paybill/confirmation", handleC2BConfirmation);

// ── C2B URL registration with Safaricom (admin only) ──

mpesaRouter.post("/c2b/register", requireAdmin, async (_req, res) => {
  try {
    const accessToken = await getAccessToken();
    const baseUrl = CALLBACK_URL.replace(/\/callback\/?$/, "").replace(/\/?$/, "");

    const payload = {
      ShortCode: SHORTCODE,
      ResponseType: "Completed",
      ConfirmationURL: `${baseUrl}/paybill/confirmation`,
      ValidationURL: `${baseUrl}/paybill/validation`,
    };

    const regRes = await fetch(`${BASE_URL}/mpesa/c2b/v2/register`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await regRes.json();
    console.log("C2B register response:", JSON.stringify(data));
    res.json(data);
  } catch (e) {
    console.error("C2B register error:", e);
    res.status(500).json({ error: "C2B registration failed" });
  }
});

mpesaRouter.post("/test-whatsapp", requireAdmin, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone number required" });

    const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || "";
    const ACCESS_TOKEN = process.env.META_WHATSAPP_TOKEN || "";

    if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
      return res.json({ ok: false, error: "META_PHONE_NUMBER_ID or META_WHATSAPP_TOKEN not set. Add them in Vercel project settings → Environment Variables." });
    }

    const clean = phone.replace(/\D/g, "");
    const formatted = clean.startsWith("0") ? "254" + clean.slice(1) : clean.startsWith("254") ? clean : "254" + clean;

    const apiRes = await fetch(`https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formatted,
        type: "text",
        text: { body: "Test message from AIPCA Bahati Cathedral admin. WhatsApp is working! 🎉" },
      }),
    });

    const body = await apiRes.text();
    let parsed: any;
    try { parsed = JSON.parse(body); } catch { parsed = body; }

    if (!apiRes.ok) {
      const code = parsed?.error?.code;
      const msg = parsed?.error?.message || body;
      if (code === 131030) {
        return res.json({ ok: false, error: `Add ${phone} (${formatted}) to your Meta WhatsApp Allowed Recipients list in the Meta Developer dashboard.`, meta_error: msg });
      }
      if (code === 131048) {
        return res.json({ ok: false, error: `The phone number ${phone} is not registered on WhatsApp. Ask them to register first.`, meta_error: msg });
      }
      if (code === 100) {
        return res.json({ ok: false, error: `META_PHONE_NUMBER_ID is invalid. Get the correct Phone Number ID from Meta Developer dashboard → WhatsApp → API Setup.`, meta_error: msg });
      }
      return res.json({ ok: false, error: `Meta API error (${apiRes.status}): ${msg}`, meta_error: msg });
    }

    res.json({ ok: true, message: "Test message sent successfully!", response: parsed });
  } catch (err: any) {
    console.error("test-whatsapp error:", err);
    res.status(500).json({ error: err?.message || "Failed" });
  }
});
