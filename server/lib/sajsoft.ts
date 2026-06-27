const ENDPOINT = "https://bulksms.sajsoft.co.ke/sms/v3/sendsms";
const PROFILE_EP = "https://bulksms.sajsoft.co.ke/sms/v3/profile";
const API_KEY = process.env.SMS_APIKEY || "";
const SENDER_ID = process.env.SMS_SENDERID || "AIPCABahati";

export async function sendSMS(to: string, message: string): Promise<boolean> {
  try {
    if (!API_KEY) {
      console.warn("SAJSOFT not configured — skipping SMS send");
      return false;
    }
    const phone = normalisePhone(to);
    const body = JSON.stringify({
      api_key: API_KEY,
      service_id: 0,
      mobile: phone,
      response_type: "json",
      shortcode: SENDER_ID,
      message,
    });
    console.log("SAJSOFT sending to", phone, "sender", SENDER_ID);
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const text = await res.text();
    console.log("SAJSOFT raw response:", res.status, text);
    if (!res.ok) {
      console.error("SAJSOFT SMS error:", res.status, text);
      return false;
    }
    let json: any;
    try { json = JSON.parse(text); } catch { json = null; }
    if (json?.[0]?.status_code === "1000") {
      console.log("SAJSOFT SMS sent:", json[0].message_id, "cost:", json[0].message_cost);
      return true;
    }
    console.error("SAJSOFT SMS unexpected response:", JSON.stringify(json));
    return false;
  } catch (err: any) {
    console.error("SAJSOFT SMS send error:", err?.message || err);
    return false;
  }
}

export async function sendTestSMS(phone: string): Promise<{ ok: boolean; error?: string; raw?: any }> {
  try {
    if (!API_KEY) return { ok: false, error: "SMS_APIKEY not configured" };
    const normalised = normalisePhone(phone);
    const msg = `Test message from AIPCA Bahati Cathedral. Sent at ${new Date().toISOString()}. If you receive this, SMS is working.`;
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: API_KEY,
        service_id: 0,
        mobile: normalised,
        response_type: "json",
        shortcode: SENDER_ID,
        message: msg,
      }),
    });
    const text = await res.text();
    let json: any;
    try { json = JSON.parse(text); } catch { json = text; }
    if (json?.[0]?.status_code === "1000") {
      return { ok: true, raw: json };
    }
    return { ok: false, error: "Unexpected response", raw: json };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}

export async function getBalance(): Promise<{ balance: number | null; raw?: any }> {
  try {
    const res = await fetch(PROFILE_EP, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: API_KEY }),
    });
    const text = await res.text();
    let json: any;
    try { json = JSON.parse(text); } catch { json = text; }
    const balance = Number(json?.[0]?.wallet?.credit_balance);
    return { balance: isNaN(balance) ? null : balance, raw: json };
  } catch (err: any) {
    return { balance: null, raw: err?.message };
  }
}

function normalisePhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("254")) return d;
  if (d.startsWith("0")) return "254" + d.slice(1);
  if (d.startsWith("7") || d.startsWith("1")) return "254" + d;
  return d;
}
