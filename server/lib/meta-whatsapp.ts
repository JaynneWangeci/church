const API_VERSION = "v21.0";
const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || "";
const ACCESS_TOKEN = process.env.META_WHATSAPP_TOKEN || "";

const BASE_URL = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;

export async function sendWhatsApp(to: string, message: string): Promise<boolean> {
  try {
    if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
      console.warn("Meta WhatsApp not configured — skipping send");
      return false;
    }
    const clean = to.replace(/\D/g, "");
    const formatted = clean.startsWith("0") ? "254" + clean.slice(1) : clean.startsWith("254") ? clean : "254" + clean;

    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formatted,
        type: "text",
        text: { body: message },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Meta WhatsApp API error:", res.status, errBody);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Meta WhatsApp send error:", err);
    return false;
  }
}
