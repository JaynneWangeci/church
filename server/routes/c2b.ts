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

    const safName = [FirstName, MiddleName, LastName].filter(Boolean).join(" ").trim();
    const phone = MSISDN?.toString().replace(/^\+/, "").replace(/^0+/, "254") || "";
    const accountRef = (BillRefNumber || "").trim();

    const db = requireService();

    // If Safaricom didn't return a name, try looking up by phone
    let payerName = safName || "";
    if (!payerName && phone) {
      const { data: prevDonation } = await db
        .from("donations")
        .select("donor_name")
        .eq("phone", phone)
        .not("donor_name", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);
      if (prevDonation?.[0]?.donor_name) payerName = prevDonation[0].donor_name;
    }
    payerName = payerName || "Anonymous";

    // Look up campaign
    const { data: campaign } = await db
      .from("campaigns")
      .select("id")
      .eq("slug", "development-fund")
      .eq("is_active", true)
      .single();

    if (!campaign) {
      console.warn("[c2b] no active campaign");
      return res.json({ ResultCode: 0, ResultDesc: "Success" });
    }

    // Look up honoured member — try exact match, then prefix match
    let honoredMemberId: string | null = null;
    if (accountRef) {
      const { data: exact } = await db
        .from("church_members")
        .select("id")
        .eq("name", accountRef)
        .eq("is_active", true)
        .maybeSingle();
      if (exact) {
        honoredMemberId = exact.id;
      } else {
        const { data: fuzzy } = await db
          .from("church_members")
          .select("id")
          .ilike("name", `%${accountRef}%`)
          .eq("is_active", true)
          .limit(1);
        if (fuzzy?.length) honoredMemberId = fuzzy[0].id;
      }
    }

    // Auto-register payer as church member
    if (payerName !== "Anonymous" && payerName.length >= 2) {
      const { data: existing } = await db
        .from("church_members")
        .select("id")
        .eq("is_active", true)
        .ilike("name", `%${payerName}%`);
      if (!existing?.length) {
        await db.from("church_members").insert({
          name: payerName,
          council: "aefeso_fellowship",
        });
      }
    }

    await db.from("donations").insert({
      campaign_id: campaign.id,
      donor_name: payerName,
      amount: Number(TransAmount),
      method: "mpesa",
      status: "completed",
      receipt_number: TransID,
      account_reference: accountRef || null,
      transaction_id: TransID,
      donor_phone: phone || null,
      phone: phone || null,
      honored_member_id: honoredMemberId,
      church_member_id: null,
    });

    console.log(`[c2b] recorded: ${payerName} KES ${TransAmount} ${TransID}`);
    res.json({ ResultCode: 0, ResultDesc: "Success" });
  } catch (err) {
    console.error("[c2b] confirmation error:", err);
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

    // Try v2 first (modern Safaricom), fall back to v1
    let lastErr: any;
    for (const ver of ["v2", "v1"]) {
      const regRes = await fetch(`${BASE_URL}/mpesa/c2b/${ver}/registerurl`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await regRes.json();
      if (String(data.ResponseCode) === "0" || String(data.errorCode) !== "401.003.01") {
        return res.json(data);
      }
      lastErr = data;
    }

    console.error("c2b register failed on v2 and v1:", lastErr);
    res.status(400).json(lastErr);
  } catch (err) {
    console.error("c2b register error:", err);
    res.status(500).json({ error: "C2B registration failed" });
  }
});
