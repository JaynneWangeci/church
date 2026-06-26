const ENDPOINT = "https://bulksms.sajsoft.co.ke/sms/v3/sendsms";
const PROFILE_EP = "https://bulksms.sajsoft.co.ke/sms/v3/profile";
const API_KEY = process.env.SMS_APIKEY || "";
const SENDER_ID = process.env.SMS_SENDERID || "AIPCABAHATI";

export async function sendSMS(to: string, message: string): Promise<boolean> {
  try {
    if (!API_KEY) {
      console.warn("SAJSOFT not configured — skipping SMS send");
      return false;
    }
    const phone = normalisePhone(to);
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: API_KEY,
        service_id: 0,
        mobile: phone,
        response_type: "json",
        shortcode: SENDER_ID,
        message,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("SAJSOFT SMS error:", res.status, text);
      return false;
    }
    const json = await res.json().catch(() => null);
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

export async function getBalance(): Promise<number | null> {
  try {
    const res = await fetch(PROFILE_EP, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: API_KEY }),
    });
    const json = await res.json();
    const balance = Number(json?.[0]?.wallet?.credit_balance);
    return isNaN(balance) ? null : balance;
  } catch {
    return null;
  }
}

function normalisePhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("254")) return d;
  if (d.startsWith("0")) return "254" + d.slice(1);
  if (d.startsWith("7") || d.startsWith("1")) return "254" + d;
  return d;
}
