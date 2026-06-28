// ── Token Bucket Rate Limiter ──
// Uses @upstash/ratelimit with Redis backend (Upstash or local)
// Capacity and refill rate configurable via env vars:
//   RATE_LIMIT_MAX_TOKENS=100
//   RATE_LIMIT_REFILL_RATE=100
//   RATE_LIMIT_REFILL_INTERVAL=1m

import { Ratelimit } from "@upstash/ratelimit";
import type { Request, Response, NextFunction } from "express";
import { getRedis, isRedisEnabled } from "./redis.js";

const MAX_TOKENS = Number(process.env.RATE_LIMIT_MAX_TOKENS) || 100;
const REFILL_RATE = Number(process.env.RATE_LIMIT_REFILL_RATE) || 100;
const REFILL_INTERVAL = (process.env.RATE_LIMIT_REFILL_INTERVAL || "1m") as `${number}m`;

let ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit {
  if (!ratelimit) {
    const redis = getRedis();
    if (!isRedisEnabled()) {
      ratelimit = null!;
    } else {
      ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.tokenBucket(REFILL_RATE, REFILL_INTERVAL, MAX_TOKENS),
        analytics: true,
        prefix: "church:ratelimit",
      });
    }
  }
  return ratelimit!;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
}

export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const rl = getRatelimit();
  if (!rl) {
    return { allowed: true, remaining: Infinity, reset: 0 };
  }
  const { success, remaining, reset } = await rl.limit(identifier);
  return { allowed: success, remaining, reset };
}

export function rateLimitMiddleware(identifierFn?: (req: Request) => string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim()
        || req.headers["x-real-ip"]?.toString()
        || req.ip
        || req.socket?.remoteAddress
        || "unknown";

      const identifier = identifierFn ? identifierFn(req) : `stkpush:${ip}`;
      const { allowed, remaining, reset } = await checkRateLimit(identifier);

      res.setHeader("X-RateLimit-Remaining", String(remaining));
      res.setHeader("X-RateLimit-Reset", String(Math.ceil(reset / 1000)));

      if (!allowed) {
        const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
        res.setHeader("Retry-After", String(retryAfter));
        res.status(429).json({
          error: "Too many requests. Please wait before trying again.",
          retryAfterSeconds: retryAfter,
        });
        return;
      }

      next();
    } catch (err) {
      console.error("rateLimitMiddleware error:", err);
      next();
    }
  };
}
