import { Router } from "express";
import { requireService } from "../lib/supabase.js";

export const c2bRouter = Router();

const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || "";
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || "";
const SHORTCODE = process.env.MPESA_SHORTCODE || "174379";
const CONFIRMATION_URL = process.env.MPESA_C2B_CONFIRMATION_URL || "https://yourdomain.com/api/c2b/confirmation";
const VALIDATION_URL = process.env.MPESA_C2B_VALIDATION_URL || "https://yourdomain.com/api/c2b/validation";
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

c2bRouter.post("/validation", async (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: "Success" });
});

c2bRouter.post("/confirmation", async (req, res) => {
  try {
    const {
      TransID, TransAmount, BillRefNumber, MSISDN, FirstName, MiddleName, LastName,
    } = req.body;

    const donorName = [FirstName, MiddleName, LastName].filter(Boolean).join(" ");
    const phone = MSISDN?.toString().replace(/^\+/, "");

    const db = requireService();
    const { data: campaign } = await db
      .from("campaigns")
      .select("id")
      .eq("slug", "development-fund")
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

c2bRouter.post("/register", async (_req, res) => {
  try {
    const accessToken = await getAccessToken();
    const payload = {
      ShortCode: SHORTCODE,
      ResponseType: "Completed",
      ConfirmationURL: CONFIRMATION_URL,
      ValidationURL: VALIDATION_URL,
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
