import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import { sendWhatsApp } from "../lib/twilio.js";
import { requireAdmin } from "../lib/admin.js";

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

// Pre-cache access token on startup for instant STK Push
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

function whatsAppConfirmation(donation: any): void {
  const name = donation.donor_name || "Mungu anakupenda";
  const amount = Number(donation.amount).toLocaleString("en-KE");
  const receipt = donation.receipt_number || "";
  const msg =
    `🙏 *Harambee Donation Confirmation* — AIPCA Bahati Cathedral\n\n` +
    `Asante sana ${name}!\n` +
    `Your gift of *KES ${amount}* has been received successfully.\n` +
    `${receipt ? `Receipt: ${receipt}\n` : ""}` +
    `\n"Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver." — 2 Corinthians 9:7\n` +
    `\n_Baraka tele, familia yako ya AIPCA inakuombea._ 🇰🇪\n\n` +
    `*EN* — Thank you for building His house. Your generosity is building the Kingdom of God in Bahati and beyond. May the Lord bless you abundantly.\n` +
    `*SW* — Asante kwa kujenga Nyumba Yake. Mungu akubariki sana, na tujenge pamoja!`;

  sendWhatsApp(donation.phone, msg).catch(() => {});
}

mpesaRouter.post("/stkpush", async (req, res) => {
  try {
    const { phone, amount, account_reference, transaction_desc, donation_id } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({ error: "phone and amount required" });
    }

    let normalizedPhone = phone.replace(/[\s\-\(\)]/g, "");
    if (normalizedPhone.startsWith("0")) {
      normalizedPhone = "254" + normalizedPhone.slice(1);
    } else if (normalizedPhone.startsWith("+")) {
      normalizedPhone = normalizedPhone.slice(1);
    }

    if (normalizedPhone.length < 10) {
      return res.status(400).json({ error: "Invalid phone number" });
    }

    const accessToken = await getAccessToken();
    const ts = timestamp();
    const password = Buffer.from(`${SHORTCODE}${PASSKEY}${ts}`).toString("base64");

    const payload = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: ts,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(Number(amount)),
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

          whatsAppConfirmation({ ...donation, receipt_number: `SANDBOX-${Date.now()}` });
        }
      }
    }

    res.json(stkData);
  } catch (err: any) {
    console.error("mpesa stkpush error:", err);
    res.status(200).json({
      errorCode: "500",
      errorMessage: err?.message || "M-Pesa request failed",
    });
  }
});

mpesaRouter.post("/callback", async (req, res) => {
  try {
    const { Body } = req.body;
    if (!Body?.stkCallback) return res.status(200).json({ ok: true });

    const { ResultCode, CheckoutRequestID, CallbackMetadata } = Body.stkCallback;

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

      // If this donation is linked to a pledge, update the pledge
      if (donation.account_reference && String(donation.account_reference).startsWith("PLD:")) {
        const pledgeId = String(donation.account_reference).replace("PLD:", "");
        const { data: pledge } = await db.from("pledges").select("*").eq("id", pledgeId).single();
        if (pledge) {
          const payAmount = Number(donation.amount);
          const newPaid = Number(pledge.paid) + payAmount;
          const newRemaining = Math.max(0, Number(pledge.amount) - newPaid);
          const newStatus = newRemaining <= 0 ? "fulfilled" : "pending";
          await db.from("pledges").update({ paid: newPaid, remaining: newRemaining, status: newStatus }).eq("id", pledgeId);
          await db.from("pledge_payments").insert({
            pledge_id: pledgeId,
            amount: payAmount,
            receipt_number: receiptNumber || `MPESA-${Date.now()}`,
          });
        }
      }

      whatsAppConfirmation({ ...donation, receipt_number: receiptNumber });
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

// ── Resend WhatsApp for completed donations that missed it ──
mpesaRouter.post("/resend-whatsapp/:id", async (req, res) => {
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

    whatsAppConfirmation(data);
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

    // Always check DB first — callback may have already finalized it
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

    // Query Safaricom for real-time status
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

      // Only auto-complete if Safaricom confirms with a receipt number
      const receiptNumber = data.CallbackMetadata?.Item
        ?.find((item: any) => item.Name === "MpesaReceiptNumber")?.Value;

      if (String(data.ResultCode) === "0" && receiptNumber && donation) {
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

        whatsAppConfirmation({ ...donation, receipt_number: receiptNumber });

        return res.json({ ResultCode: "0", status: "completed", receipt_number: receiptNumber });
      }
    }

    res.json({ status: "pending" });
  } catch (err) {
    console.error("mpesa status error:", err);
    res.status(500).json({ error: "Query failed" });
  }
});

// ── C2B (Paybill direct) – Shared handler ──
// NOTE: Safaricom rejects URLs containing "mpesa" substring, so /paybill/ paths are used
async function handleC2BConfirmation(req: any, res: any) {
  try {
    const body = req.body;
    res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });

    const donorName = (body.BillRefNumber || "").trim();
    if (!donorName || donorName.length < 2) {
      console.log("C2B skipped: no BillRefNumber");
      return;
    }

    const amount = Number(body.TransAmount) || 0;
    if (amount < 10) { console.log("C2B skipped: amount too small"); return; }

    const phone = String(body.MSISDN || "");
    const receiptNumber = String(body.TransID || "");
    const db = requireService();

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

    const { data: donation } = await db.from("donations").insert({
      donor_name: donorName, amount, phone, status: "completed", method: "mpesa",
      receipt_number: receiptNumber, church_member_id: memberId,
      campaign_id: campaign?.id, account_reference: "C2B:" + receiptNumber,
      transaction_desc: "Paybill Direct",
    }).select().single();

    if (donation && campaign?.id) {
      await db.rpc("increment_campaign_raised", { campaign_id: campaign.id, amount }).catch(() => {});
    }
    if (donation && phone) {
      whatsAppConfirmation({ ...donation, receipt_number: receiptNumber });
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
  } catch (err: any) {
    console.error("C2B register error:", err);
    res.status(500).json({ error: err?.message || "C2B registration failed" });
  }
});
