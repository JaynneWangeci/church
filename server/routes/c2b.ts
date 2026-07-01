import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import { requireAdmin } from "../lib/admin.js";
import { getActiveCampaignId } from "../lib/campaigns.js";
import { savePhoneForName } from "../lib/contacts.js";

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

/**
 * Resolve the best name from Safaricom callback data.
 * Priority:
 *   1. BillRefNumber (account number) — often contains the full name
 *   2. FirstName + MiddleName + LastName concatenated
 */
function sanitize(val: string): string {
  return val.replace(/[%_<>]/g, "").trim().slice(0, 100);
}

function resolvePayerName(FirstName: string, MiddleName: string, LastName: string, BillRefNumber: string): string {
  const safName = [FirstName, MiddleName, LastName].filter(Boolean).join(" ").trim();
  const acctName = (BillRefNumber || "").trim();

  // If both exist, prefer whichever is longer (likely more complete)
  if (safName && acctName) {
    return safName.length >= acctName.length ? safName : acctName;
  }
  return safName || acctName || "";
}

/**
 * Try to find an existing church member by name (case-insensitive).
 * Checks both the full name and the account reference.
 */
async function findMember(db: any, name: string, accountRef: string): Promise<{ id: string; council: string; gender: string | null; phone: string | null } | null> {
  const candidates = [name];
  if (accountRef && accountRef.toLowerCase() !== name.toLowerCase()) {
    candidates.push(accountRef);
  }

  for (const candidate of candidates) {
    // Exact case-insensitive match
    const { data: exact } = await db
      .from("church_members")
      .select("id, council, gender, phone")
      .eq("is_active", true)
      .ilike("name", candidate.trim())
      .maybeSingle();
    if (exact) return exact;

    // Prefix match (e.g., "JOHN" matches "John Kamau")
    const { data: prefix } = await db
      .from("church_members")
      .select("id, council, gender, phone")
      .eq("is_active", true)
      .ilike("name", `${candidate.trim()}%`)
      .limit(1);
    if (prefix?.length) return prefix[0];

    // Token match — if the name has multiple words, try matching each word
    const tokens = candidate.trim().split(/\s+/).filter(Boolean);
    if (tokens.length > 1) {
      for (const token of tokens) {
        if (token.length < 2) continue;
        const { data: tokenMatch } = await db
          .from("church_members")
          .select("id, council, gender, phone")
          .eq("is_active", true)
          .ilike("name", `%${token}%`)
          .limit(1);
        if (tokenMatch?.length) return tokenMatch[0];
      }
    }
  }

  return null;
}

c2bRouter.post("/confirmation", async (req, res) => {
  try {
    const raw = req.body;
    const TransID = sanitize(raw.TransID || "");
    const TransAmount = raw.TransAmount || "0";
    const BillRefNumber = sanitize(raw.BillRefNumber || "");
    const MSISDN = raw.MSISDN?.toString().replace(/^\+/, "").replace(/^0+/, "254") || "";
    const FirstName = sanitize(raw.FirstName || "");
    const MiddleName = sanitize(raw.MiddleName || "");
    const LastName = sanitize(raw.LastName || "");

    const phone = MSISDN;
    let accountRef = BillRefNumber;

    const db = requireService();

    // Resolve the best name
    let payerName = resolvePayerName(FirstName, MiddleName, LastName, BillRefNumber);

    // If BillRefNumber is a PLD pledge reference, resolve the actual donor name from the pledge
    if (accountRef && accountRef.trim().toUpperCase().startsWith("PLD:")) {
      const shortId = accountRef.replace(/^PLD:/i, "").toLowerCase();
      const { data: pledges } = await db.from("pledges").select("id, donor_name");
      const pledge = (pledges || []).find(p => p.id.toLowerCase().startsWith(shortId));
      if (pledge) {
        payerName = pledge.donor_name;
        // Update accountRef to full pledge ID so the donation links back
        accountRef = `PLD:${pledge.id}`;
        // Clean up any fake PLD member created by a previous C2B
        const { data: pldMembers } = await db
          .from("church_members")
          .select("id")
          .ilike("name", `PLD:${shortId}%`);
        if (pldMembers?.length) {
          const { data: realMember } = await db
            .from("church_members").select("id").eq("is_active", true).ilike("name", payerName);
          if (realMember?.length) {
            await db.from("donations").update({ church_member_id: realMember[0].id }).eq("church_member_id", pldMembers[0].id);
            await db.from("church_members").delete().eq("id", pldMembers[0].id);
          } else {
            await db.from("church_members").update({ name: payerName }).eq("id", pldMembers[0].id);
          }
        }
      }
    }

    // If no name from Safaricom or pledge, try looking up by phone
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
    const campaignId = await getActiveCampaignId(db);
    if (!campaignId) {
      console.warn("[c2b] no active campaign");
      return res.json({ ResultCode: 0, ResultDesc: "Success" });
    }

    // Look up honoured member
    let honoredMemberId: string | null = null;
    if (accountRef) {
      const { data: exact } = await db
        .from("church_members")
        .select("id")
        .eq("is_active", true)
        .ilike("name", accountRef.trim())
        .maybeSingle();
      if (exact) {
        honoredMemberId = exact.id;
      } else {
        const { data: fuzzy } = await db
          .from("church_members")
          .select("id")
          .eq("is_active", true)
          .ilike("name", `%${accountRef}%`)
          .limit(1);
        if (fuzzy?.length) honoredMemberId = fuzzy[0].id;
      }
    }

    // Find or auto-register payer as church member
    let memberId: string | null = null;
    let memberCouncil = "general_member";

    if (payerName !== "Anonymous" && payerName.length >= 2) {
      let existing = await findMember(db, payerName, accountRef);

      // Fallback: search by phone if name lookup failed
      if (!existing && phone) {
        const { data: phoneMember } = await db
          .from("church_members")
          .select("id, council, gender, phone")
          .eq("is_active", true)
          .eq("phone", phone)
          .maybeSingle();
        if (phoneMember) {
          existing = phoneMember;
        }
      }

      if (existing) {
        // Member already exists — use their council, don't override
        memberId = existing.id;
        memberCouncil = existing.council;
        // Backfill phone if not set
        if (phone && !existing.phone) {
          await db.from("church_members").update({ phone }).eq("id", existing.id);
        }
      } else {
        // New member — use BillRefNumber as name if it's more complete
        const finalName = (accountRef && accountRef.length > payerName.length) ? accountRef : payerName;
        const memberInsert: Record<string, unknown> = { name: finalName, council: memberCouncil };
        if (phone) memberInsert.phone = phone;
        const { data: newMember } = await db
          .from("church_members")
          .insert(memberInsert)
          .select()
          .single();
        if (newMember) memberId = newMember.id;
      }
    }

    const vc = phone ? require("crypto").createHash("sha256").update(phone).digest("hex") : null;
    await db.from("donations").insert({
      campaign_id: campaignId,
      donor_name: payerName,
      amount: Number(TransAmount),
      method: "mpesa",
      status: "completed",
      receipt_number: TransID,
      account_reference: accountRef || null,
      transaction_id: TransID,
      donor_phone: phone || null,
      honored_member_id: honoredMemberId,
      church_member_id: memberId,
      transaction_desc: vc ? `VC:${vc}` : null,
    });

    // Backfill phone into church_members
    if (payerName && payerName !== "Anonymous" && phone) {
      savePhoneForName(payerName, phone).catch(() => {});
    }

    console.log(`[c2b] recorded: ${payerName} KES ${TransAmount} ${TransID}`);
    res.json({ ResultCode: 0, ResultDesc: "Success" });
  } catch (err) {
    console.error("[c2b] confirmation error:", err);
    res.json({ ResultCode: 0, ResultDesc: "Success" });
  }
});

c2bRouter.post("/register", requireAdmin, async (_req, res) => {
  try {
    const accessToken = await getAccessToken();
    const payload = {
      ShortCode: SHORTCODE,
      ResponseType: "Completed",
      ConfirmationURL: CONFIRMATION_URL,
      ValidationURL: VALIDATION_URL,
    };

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
