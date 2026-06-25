const ENDPOINT = "https://bulksms.sajsoft.co.ke/api/sms/v1/sendsms";
const BALANCE_EP = "https://bulksms.sajsoft.co.ke/api/sms/v1/credit-balance";
const API_KEY = process.env.SMS_APIKEY || "";
const SENDER_ID = process.env.SMS_SENDERID || "";

export async function sendSMS(to: string, message: string): Promise<boolean> {
  try {
    if (!API_KEY || !SENDER_ID) {
      console.warn("SAJSOFT not configured — skipping SMS send");
      return false;
    }
    const phone = normalisePhone(to);
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: API_KEY,
        sender_id: SENDER_ID,
        message,
        phone,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("SAJSOFT SMS error:", res.status, text);
      return false;
    }
    const json = await res.json().catch(() => null);
    if (json?.status === "success") {
      console.log("SAJSOFT SMS sent:", json.data?.message_id, "credits:", json.data?.credits_used);
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
    const res = await fetch(BALANCE_EP, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: API_KEY }),
    });
    const json = await res.json();
    const balance = Number(json?.[0]?.balance);
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
