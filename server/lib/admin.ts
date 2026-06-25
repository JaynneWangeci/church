import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { requireService, requireAnon, verifyAuth, createAuthUser, updateAuthUserPassword, deleteAuthUser } from "./supabase.js";
import { hasPermission, DataType, Action } from "./permissions.js";
import { cacheGet, cacheSet, cacheKey } from "./redis.js";
import { logAudit } from "./audit.js";
import { v4 as uuid } from "uuid";

// Keep JWT/bcrypt imports only for legacy password verification (existing admin_users)
const JWT_SECRET = process.env.JWT_SECRET || "";

let jwtModule: any = null;
async function getJwt() {
  if (!jwtModule) jwtModule = await import("jsonwebtoken");
  return jwtModule.default || jwtModule;
}

let bcryptModule: any = null;
async function getBcrypt() {
  if (!bcryptModule) bcryptModule = await import("bcryptjs");
  return bcryptModule.default || bcryptModule;
}

// API rate limiting (per-IP)
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 300;
const reqCounts = new Map<string, { count: number; resetAt: number }>();
// Periodic cleanup of expired rate limit entries (every 5 min)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of reqCounts) {
    if (now > entry.resetAt) reqCounts.delete(ip);
  }
}, 5 * 60 * 1000);

export { hasPermission } from "./permissions.js";
export { requirePermission } from "./permissions.js";
export { DataType, Action } from "./permissions.js";
export type { AuditAction, AuditResourceType } from "./audit.js";

// ----- Password hashing (legacy, for existing admin_users with bcrypt hashes) ----- //

export async function hashPassword(password: string) {
  const bcrypt = await getBcrypt();
  return bcrypt.hashSync(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  const bcrypt = await getBcrypt();
  return bcrypt.compareSync(password, hash);
}

// ----- Supabase Auth token verification (sole auth mechanism) ----- //

let _verifyAuthTokenCache = new Map<string, { user: any; expiresAt: number }>();
const AUTH_CACHE_TTL = 5_000;

async function verifySupabaseToken(token: string) {
  const cached = _verifyAuthTokenCache.get(token);
  if (cached && Date.now() < cached.expiresAt) return cached.user;

  const supabase = requireAnon();
  const { data, error } = await (supabase.auth as any).getUser(token);
  if (error || !data?.user) return null;

  _verifyAuthTokenCache.set(token, { user: data.user, expiresAt: Date.now() + AUTH_CACHE_TTL });
  if (_verifyAuthTokenCache.size > 1000) {
    const now = Date.now();
    for (const [key, entry] of _verifyAuthTokenCache) {
      if (now >= entry.expiresAt) _verifyAuthTokenCache.delete(key);
      if (_verifyAuthTokenCache.size <= 900) break;
    }
  }

  return data.user;
}

// ----- IP & Context ----- //

export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.ip?.replace(/^::ffff:/, "") || req.socket.remoteAddress?.replace(/^::ffff:/, "") || "unknown";
}

function getUserAgent(req: Request): string | null {
  return (req.headers["user-agent"] || "").slice(0, 512) || null;
}

export async function setAdminContext(adminId: string, role: string) {
  try {
    const db = requireService();
    await db.rpc("set_admin_context", { admin_id: adminId, role });
  } catch {
    // non-critical: RLS context is fallback
  }
}

// ----- Legacy In-Memory Cache (deprecated, kept for backward compat) ----- //

interface CacheEntry { data: any; expiresAt: number; }
const memCache = new Map<string, CacheEntry>();
const MEM_CACHE_TTL = 30 * 1000;

// Periodic cleanup of expired cache entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memCache) {
    if (now >= entry.expiresAt) memCache.delete(key);
  }
}, 60 * 1000);

export function getCached(key: string): any | null {
  const entry = memCache.get(key);
  if (entry && Date.now() < entry.expiresAt) return entry.data;
  memCache.delete(key);
  return null;
}

export function setCache(key: string, data: any, ttl = MEM_CACHE_TTL) {
  memCache.set(key, { data, expiresAt: Date.now() + ttl });
}

// ----- API Rate Limiting ----- //

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const now = Date.now();
  let entry = reqCounts.get(ip);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
    reqCounts.set(ip, entry);
  }

  entry.count++;
  res.setHeader("X-RateLimit-Limit", RATE_LIMIT_MAX.toString());
  res.setHeader("X-RateLimit-Remaining", Math.max(0, RATE_LIMIT_MAX - entry.count).toString());

  if (entry.count > RATE_LIMIT_MAX) {
    logAudit({
      action: "rate_limit_blocked",
      details: { ip, count: entry.count, path: req.path },
      ipAddress: ip,
    }).catch(() => {});
    return res.status(429).json({ error: "Too many requests. Try again later." });
  }

  next();
}

// ----- Session Management (deprecated — Supabase Auth handles sessions) ----- //

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(adminId: string, token: string, ipAddress?: string | null, userAgent?: string | null) {
  const db = requireService();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const { error } = await db.from("admin_sessions").insert({
    admin_id: adminId,
    token_hash: tokenHash,
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
    expires_at: expiresAt.toISOString(),
  });
  if (error) console.error("create session error:", error.message);
}

export async function invalidateSession(token: string) {
  const db = requireService();
  const tokenHash = hashToken(token);
  await db.from("admin_sessions").delete().eq("token_hash", tokenHash);
}

export async function invalidateAllAdminSessions(adminId: string) {
  const db = requireService();
  await db.from("admin_sessions").delete().eq("admin_id", adminId);
}

// ----- Login Rate Limiting (per-email, supabase) ----- //

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export async function checkLoginRateLimit(email: string): Promise<{ blocked: boolean; remainingMinutes?: number }> {
  const db = requireService();
  const { data: admin } = await db
    .from("admin_users")
    .select("failed_attempts, locked_until")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (!admin) return { blocked: false };

  if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
    const remainingMs = new Date(admin.locked_until).getTime() - Date.now();
    return { blocked: true, remainingMinutes: Math.ceil(remainingMs / 60000) };
  }

  if (admin.locked_until && new Date(admin.locked_until) <= new Date()) {
    await db.from("admin_users").update({ failed_attempts: 0, locked_until: null }).eq("email", email.toLowerCase().trim());
  }

  return { blocked: false };
}

export async function recordFailedAttempt(email: string) {
  const db = requireService();
  const { data: admin } = await db
    .from("admin_users")
    .select("id, failed_attempts")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (!admin) return;

  const newAttempts = (admin.failed_attempts || 0) + 1;
  const updates: Record<string, unknown> = { failed_attempts: newAttempts };

  if (newAttempts >= MAX_FAILED_ATTEMPTS) {
    updates.locked_until = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
  }

  await db.from("admin_users").update(updates).eq("id", admin.id);
}

export async function resetFailedAttempts(email: string) {
  const db = requireService();
  await db
    .from("admin_users")
    .update({ failed_attempts: 0, locked_until: null, last_login_at: new Date().toISOString(), last_login_ip: null })
    .eq("email", email.toLowerCase().trim());
}

// ----- Middleware ----- //

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }

  const token = authHeader.slice(7);

  try {
    const authUser = await verifySupabaseToken(token);
    if (!authUser) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const db = requireService();
    const { data: admin } = await db
      .from("admin_users")
      .select("id, email, name, role, phone")
      .eq("id", authUser.id)
      .single();

    if (!admin) {
      return res.status(401).json({ error: "Admin account not found" });
    }

    (req as any).admin = { id: admin.id, email: admin.email, role: admin.role };
    (req as any).adminIp = getClientIp(req);
    (req as any).ipAddress = getClientIp(req);
    (req as any).userAgent = getUserAgent(req);
    (req as any).requestId = (req.headers["x-request-id"] as string) || uuid();
    return next();
  } catch (err) {
    console.error("requireAdmin error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const admin = (req as any).admin;
  if (!admin || admin.role !== "super_admin") {
    return res.status(403).json({ error: "Super admin only" });
  }
  next();
}

export function requireAdminOrAbove(req: Request, res: Response, next: NextFunction) {
  const admin = (req as any).admin;
  if (!admin || admin.role === "viewer") {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  next();
}

// ----- Data Isolation Helpers ----- //

export function maskSensitiveData(donation: Record<string, unknown>): Record<string, unknown> {
  const masked = { ...donation };
  if (masked.phone) {
    const phone = masked.phone as string;
    masked.phone = phone.slice(0, 6) + "****";
  }
  delete masked.checkout_request_id;
  return masked;
}

export function filterDonationsByRole(
  donations: Record<string, unknown>[],
  role: string
): Record<string, unknown>[] {
  return donations.map((d) => {
    if (role === "viewer") {
      if (d.status !== "completed") return null;
      return maskSensitiveData(d);
    }
    if (role === "admin") {
      return maskSensitiveData(d);
    }
    return d;
  }).filter(Boolean) as Record<string, unknown>[];
}
