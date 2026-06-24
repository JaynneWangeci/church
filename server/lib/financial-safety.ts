import { requireService } from "./supabase.js";
import { getClientIp } from "./admin.js";
import type { Request } from "express";

// ── Constants ── //

const MAX_STK_PER_PHONE_PER_HOUR = 3;
const MAX_DONATION_AMOUNT = 500_000;
const MIN_DONATION_AMOUNT = 10;

// Known Safaricom callback IP ranges (production)
// Source: Safaricom Daraja docs — these may change; update as needed
const SAFARICOM_CIDR_BLOCKS = [
  "196.201.214.200/27",
  "196.201.214.208/28",
  "196.201.213.200/27",
  "196.201.213.208/28",
  "196.201.213.0/24",
  "196.201.214.0/24",
];

// ── Per-phone STK Push rate limiting (in-memory) ── //

const phoneStkTimestamps = new Map<string, number[]>();

// Periodic cleanup (every 5 min)
setInterval(() => {
  const cutoff = Date.now() - 3600_000;
  for (const [phone, timestamps] of phoneStkTimestamps) {
    const recent = timestamps.filter(t => t > cutoff);
    if (recent.length === 0) phoneStkTimestamps.delete(phone);
    else phoneStkTimestamps.set(phone, recent);
  }
}, 5 * 60_000);

export function checkPhoneStkRateLimit(phone: string): { allowed: boolean; retryAfterMinutes?: number } {
  const cutoff = Date.now() - 3600_000;
  const existing = phoneStkTimestamps.get(phone) || [];
  const recent = existing.filter(t => t > cutoff);

  if (recent.length >= MAX_STK_PER_PHONE_PER_HOUR) {
    const oldest = Math.min(...recent);
    const retryAfter = Math.ceil((oldest + 3600_000 - Date.now()) / 60_000);
    return { allowed: false, retryAfterMinutes: Math.max(1, retryAfter) };
  }

  recent.push(Date.now());
  phoneStkTimestamps.set(phone, recent);
  return { allowed: true };
}

// ── Amount validation ── //

export function validateDonationAmount(amount: number): { valid: boolean; error?: string } {
  if (!amount || amount < MIN_DONATION_AMOUNT) {
    return { valid: false, error: `Minimum donation is KES ${MIN_DONATION_AMOUNT}` };
  }
  if (amount > MAX_DONATION_AMOUNT) {
    return { valid: false, error: `Maximum donation is KES ${MAX_DONATION_AMOUNT.toLocaleString()}` };
  }
  return { valid: true };
}

// ── Callback idempotency ── //
// Prevents double-counting if Safaricom sends the same callback twice

export async function isCallbackAlreadyProcessed(checkoutRequestId: string): Promise<boolean> {
  try {
    const db = requireService();
    const { data } = await db
      .from("payment_callback_logs")
      .select("id")
      .eq("checkout_request_id", checkoutRequestId)
      .eq("processed", true)
      .limit(1);
    return (data?.length || 0) > 0;
  } catch {
    return false;
  }
}

export async function logCallback(checkoutRequestId: string, rawBody: unknown, processed: boolean): Promise<void> {
  try {
    const db = requireService();
    await db.from("payment_callback_logs").insert({
      checkout_request_id: checkoutRequestId,
      raw_payload: JSON.stringify(rawBody),
      processed,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Failed to log callback:", e);
  }
}

export async function markCallbackProcessed(checkoutRequestId: string): Promise<void> {
  try {
    const db = requireService();
    await db
      .from("payment_callback_logs")
      .update({ processed: true })
      .eq("checkout_request_id", checkoutRequestId);
  } catch (e) {
    console.error("Failed to mark callback processed:", e);
  }
}

// ── Safaricom IP verification ── //

function ipToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function cidrToRange(cidr: string): { start: number; end: number } {
  const [ip, bits] = cidr.split("/");
  const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1);
  const ipInt = ipToInt(ip);
  return { start: ipInt & mask, end: ipInt | ~mask };
}

export function isSafaricomIp(ip: string): boolean {
  try {
    const ipInt = ipToInt(ip);
    return SAFARICOM_CIDR_BLOCKS.some(cidr => {
      const { start, end } = cidrToRange(cidr);
      return ipInt >= start && ipInt <= end;
    });
  } catch {
    return false;
  }
}

export function getCallbackIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.ip?.replace(/^::ffff:/, "") || req.socket.remoteAddress?.replace(/^::ffff:/, "") || "unknown";
}

// ── Deadlock-safe DB update with retry ── //

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 100;

export async function withRetry<T>(fn: () => Promise<T>, description = "db operation"): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      const isDeadlock = e?.message?.toLowerCase?.().includes("deadlock") ||
                          e?.code === "40P01" ||
                          e?.message?.toLowerCase?.().includes("could not serialize");
      if (!isDeadlock) throw e;
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// ── Suspicious activity detection ── //

export interface SuspiciousFlag {
  reason: string;
  severity: "low" | "medium" | "high";
  details: Record<string, unknown>;
}

export function checkSuspiciousActivity(
  phone: string,
  amount: number,
  donorName: string | null,
): SuspiciousFlag[] {
  const flags: SuspiciousFlag[] = [];

  if (amount >= 100_000) {
    flags.push({
      reason: "high_value_transaction",
      severity: "medium",
      details: { amount, phone },
    });
  }

  // Rate limit check
  const cutoff = Date.now() - 3600_000;
  const recent = (phoneStkTimestamps.get(phone) || []).filter(t => t > cutoff);
  if (recent.length > 1) {
    flags.push({
      reason: "repeated_stk_push_same_phone",
      severity: "low",
      details: { phone, attemptsInLastHour: recent.length },
    });
  }

  return flags;
}

export async function logSuspiciousActivity(flags: SuspiciousFlag[], donationId?: string): Promise<void> {
  try {
    for (const flag of flags) {
      console.warn(
        `[SUSPICIOUS] ${flag.severity.toUpperCase()}: ${flag.reason}` +
        `${donationId ? ` (donation: ${donationId})` : ""}` +
        ` ${JSON.stringify(flag.details)}`
      );
    }
  } catch {
    // non-critical
  }
}
