const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY!;
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET!;
const SHORTCODE = process.env.MPESA_SHORTCODE!;
const PASSKEY = process.env.MPESA_PASSKEY!;
const CALLBACK_URL = process.env.MPESA_CALLBACK_URL!;
const ENV = process.env.MPESA_ENV || "sandbox";

const BASE_URL =
  ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

interface OAuthResponse {
  access_token: string;
  expires_in: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString(
    "base64",
  );

  const res = await fetch(
    `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } },
  );

  if (!res.ok) {
    throw new Error(`Daraja auth failed: ${res.status}`);
  }

  const data: OAuthResponse = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in) - 60) * 1000,
  };

  return data.access_token;
}

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

function password(): string {
  return Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp()}`).toString("base64");
}

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    return "254" + cleaned.slice(1);
  }
  if (cleaned.startsWith("254") && cleaned.length === 12) {
    return cleaned;
  }
  if (cleaned.startsWith("+254")) {
    return cleaned.slice(1);
  }
  throw new Error("Invalid phone number format");
}

export interface StkPushResult {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export async function stkPush(
  phone: string,
  amount: number,
  accountRef: string,
  transactionDesc: string,
): Promise<StkPushResult> {
  const token = await getAccessToken();
  const formattedPhone = formatPhone(phone);

  const body = {
    BusinessShortCode: SHORTCODE,
    Password: password(),
    Timestamp: timestamp(),
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.round(amount),
    PartyA: formattedPhone,
    PartyB: SHORTCODE,
    PhoneNumber: formattedPhone,
    CallBackURL: CALLBACK_URL,
    AccountReference: accountRef.slice(0, 12),
    TransactionDesc: transactionDesc.slice(0, 13),
  };

  const res = await fetch(
    `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`STK push failed (${res.status}): ${errBody}`);
  }

  return res.json();
}
