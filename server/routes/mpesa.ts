import { Router } from "express";
import { requireService } from "../lib/supabase.js";

export const mpesaRouter = Router();

const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || "";
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || "";
const SHORTCODE = process.env.MPESA_SHORTCODE || "174379";
const PASSKEY = process.env.MPESA_PASSKEY || "";
const CALLBACK_URL = process.env.MPESA_CALLBACK_URL || "https://yourdomain.com/api/mpesa/callback";
const C2B_CONFIRMATION_URL = process.env.MPESA_C2B_CONFIRMATION_URL || `${CALLBACK_URL.replace(/\/callback$/, "")}/c2b/confirmation`;
const C2B_VALIDATION_URL = process.env.MPESA_C2B_VALIDATION_URL || `${CALLBACK_URL.replace(/\/callback$/, "")}/c2b/validation`;
const ENV = process.env.MPESA_ENV || "sandbox";

const BASE_URL = ENV === "production"
  ? "https://api.safaricom.co.ke"
  : "https://sandbox.safaricom.co.ke";

async function getAccessToken() {
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const data = await res.json();
  return data.access_token;
}

mpesaRouter.post("/stkpush", async (req, res) => {
  try {
    const { phone, amount, account_reference, transaction_desc, donation_id } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({ error: "phone and amount required" });
    }

    const normalizedPhone = phone.replace(/^0+/, "254").replace(/^\+/, "");
    if (normalizedPhone.length < 10) {
      return res.status(400).json({ error: "Invalid phone number" });
    }

    const accessToken = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
    const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString("base64");

    const payload = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(Number(amount)),
      PartyA: normalizedPhone,
      PartyB: SHORTCODE,
      PhoneNumber: normalizedPhone,
      CallBackURL: CALLBACK_URL,
      AccountReference: account_reference || "Harambee",
      TransactionDesc: transaction_desc || "Harambee Donation",
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

    if (stkData.ResponseCode === "0" && donation_id) {
      const db = requireService();
      await db
        .from("donations")
        .update({ checkout_request_id: stkData.CheckoutRequestID })
        .eq("id", donation_id);
    }

    res.json(stkData);
  } catch (err) {
    console.error("mpesa stkpush error:", err);
    res.status(500).json({ error: "M-Pesa request failed" });
  }
});

mpesaRouter.post("/callback", async (req, res) => {
  try {
    const { Body } = req.body;
    if (!Body?.stkCallback) return res.status(200).json({ ok: true });

    const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = Body.stkCallback;

    const db = requireService();
    const { data: donations } = await db
      .from("donations")
      .select("*")
      .eq("checkout_request_id", CheckoutRequestID)
      .limit(1);

    if (!donations?.length) return res.status(200).json({ ok: true });

    const donation = donations[0];

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

// ====== C2B (Tithe-style) endpoints ======

// Safaricom calls this to validate a C2B transaction before processing
mpesaRouter.post("/c2b/validation", async (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: "Success" });
});

// Safaricom calls this after a successful C2B transaction
mpesaRouter.post("/c2b/confirmation", async (req, res) => {
  try {
    const {
      TransactionType,
      TransID,
      TransTime,
      TransAmount,
      BusinessShortCode,
      BillRefNumber,
      InvoiceNumber,
      OrgAccountBalance,
      ThirdPartyTransID,
      MSISDN,
      FirstName,
      MiddleName,
      LastName,
    } = req.body;

    const donorName = [FirstName, MiddleName, LastName].filter(Boolean).join(" ");
    const phone = MSISDN?.toString().replace(/^\+/, "");
    const campaignSlug = "development-fund";

    const db = requireService();

    const { data: campaign } = await db
      .from("campaigns")
      .select("id")
      .eq("slug", campaignSlug)
      .eq("is_active", true)
      .single();

    if (campaign) {
      await db.from("donations").insert({
        campaign_id: campaign.id,
        donor_name: BillRefNumber || donorName || "Anonymous",
        amount: Number(TransAmount),
        method: "mpesa",
        status: "completed",
        receipt_number: TransID,
        account_reference: BillRefNumber || null,
        transaction_id: TransID,
        donor_phone: phone || null,
        phone: phone || null,
      });
    }

    res.json({ ResultCode: 0, ResultDesc: "Success" });
  } catch {
    res.json({ ResultCode: 0, ResultDesc: "Success" });
  }
});

// Register C2B validation/confirmation URLs with Safaricom (call once)
mpesaRouter.post("/c2b/register", async (_req, res) => {
  try {
    const accessToken = await getAccessToken();

    const payload = {
      ShortCode: SHORTCODE,
      ResponseType: "Completed",
      ConfirmationURL: C2B_CONFIRMATION_URL,
      ValidationURL: C2B_VALIDATION_URL,
    };

    const regRes = await fetch(`${BASE_URL}/mpesa/c2b/v1/registerurl`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await regRes.json();
    res.json(data);
  } catch (err) {
    console.error("c2b register error:", err);
    res.status(500).json({ error: "C2B registration failed" });
  }
});

mpesaRouter.get("/status/:checkoutRequestId", async (req, res) => {
  try {
    const { checkoutRequestId } = req.params;
    const accessToken = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
    const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString("base64");

    const payload = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
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
    res.json(data);
  } catch (err) {
    console.error("mpesa status error:", err);
    res.status(500).json({ error: "Query failed" });
  }
});
