import africastalking from "africastalking";

const apiKey = process.env.AT_API_KEY || "";
const username = process.env.AT_USERNAME || "";

let client: ReturnType<typeof africastalking> | null = null;
let smsService: ReturnType<typeof africastalking>["SMS"] | null = null;

function getClient() {
  if (!apiKey || !username) return null;
  if (!client) client = africastalking({ apiKey, username });
  return client;
}

export function getSmsService() {
  const c = getClient();
  if (!c) return null;
  if (!smsService) smsService = c.SMS;
  return smsService;
}

export async function sendSMS(to: string, message: string): Promise<boolean> {
  try {
    const sms = getSmsService();
    if (!sms) {
      console.warn("AT not configured — skipping SMS send");
      return false;
    }
    const clean = to.replace(/\D/g, "");
    const formatted = clean.startsWith("0") ? "+254" + clean.slice(1) : clean.startsWith("254") ? "+" + clean : "+254" + clean;
    const resp = await sms.send({ to: [formatted], message });
    const entries: any[] = resp?.SMSMessageData?.Recipients || [];
    if (entries.length > 0 && entries[0].status !== "Success") {
      console.error("AT SMS delivery failed:", JSON.stringify(entries[0]));
    }
    return true;
  } catch (err: any) {
    console.error("AT SMS send error:", err?.message || err, err?.stack || "");
    return false;
  }
}
