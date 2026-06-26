import crypto from "crypto";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { getRedis, cacheGet, cacheSet, cacheKey } from "./lib/redis.js";
import { authRouter } from "./routes/auth.js";
import { campaignsRouter } from "./routes/campaigns.js";
import { committeeRouter } from "./routes/committee.js";
import { councilsRouter } from "./routes/councils.js";
import { donationsRouter } from "./routes/donations.js";
import { adminRouter } from "./routes/admin.js";
import { mpesaRouter } from "./routes/mpesa.js";
import { c2bRouter } from "./routes/c2b.js";
import { ledgerRouter } from "./routes/ledger.js";
import { membersRouter } from "./routes/members.js";
import { contributionsRouter } from "./routes/contributions.js";
import { pledgesRouter } from "./routes/pledges.js";
import { remindersRouter } from "./routes/reminders.js";
import { analyticsRouter } from "./routes/analytics.js";
import { settingsRouter } from "./routes/settings.js";
import { translateRouter } from "./routes/translate.js";
import { versesRouter } from "./routes/verses.js";
import { fellowshipsRouter } from "./routes/fellowships.js";
import { trackRouter } from "./routes/track.js";
import { publicRouter } from "./routes/public.js";
import { securityRouter } from "./routes/security.js";
import { rateLimit, requireAdmin, requireSuperAdmin, requireMasterPassword } from "./lib/admin.js";
import { startAllWorkers, stopAllWorkers } from "./lib/queue.js";

if (!process.env.VERCEL) {
  dotenv.config({ path: ".env.local" });
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json());

// ── Redis connection + caching middleware ──
try {
  const redis = getRedis();
  if (process.env.REDIS_URL || process.env.KV_URL) {
    redis.connect().catch(() => {});
  }
} catch { /* Redis not available */ }

// Request ID middleware
app.use((req, _res, next) => {
  (req as any).requestId = (req.headers["x-request-id"] as string) || crypto.randomUUID();
  next();
});

app.use("/api/auth", rateLimit, authRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/api/committee", committeeRouter);
app.use("/api/councils", councilsRouter);
app.use("/api/donations", donationsRouter);
app.use("/api/admin", rateLimit, adminRouter);
app.use("/api/admin/security", securityRouter);
app.use("/api/mpesa", mpesaRouter);
app.use("/api/c2b", c2bRouter);
app.use("/api/ledger", rateLimit, ledgerRouter);
app.use("/api/members", membersRouter);
app.use("/api/contributions", contributionsRouter);
app.use("/api/pledges", pledgesRouter);
app.use("/api/reminders", remindersRouter);
app.use("/api/analytics", rateLimit, analyticsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/translate", translateRouter);
app.use("/api/verses", versesRouter);
app.use("/api/track", trackRouter);
app.use("/api/fellowships", fellowshipsRouter);
app.use("/api/public", publicRouter);

// Master password gate — all write operations require x-action-secret header
app.use("/api", (req, res, next) => {
  const path = (req as any).path || req.path;
  if (path.startsWith("/api/auth") || path.startsWith("/api/public") || path.startsWith("/api/health") || path.startsWith("/api/translate") || path.startsWith("/api/track") || path.startsWith("/api/verses")) {
    return next();
  }
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return requireMasterPassword(req, res, next);
  }
  next();
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/debug", requireAdmin, requireSuperAdmin, (_req, res) => {
  const mask = (s: string) => s ? `${s.slice(0, 4)}...${s.slice(-4)}` : "not set";
  res.json({
    has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    has_supabase_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    mpesa_env: process.env.MPESA_ENV || "not set",
    mpesa_consumer_key: mask(process.env.MPESA_CONSUMER_KEY),
    mpesa_consumer_secret: mask(process.env.MPESA_CONSUMER_SECRET),
    mpesa_shortcode: mask(process.env.MPESA_SHORTCODE || "not set"),
    mpesa_passkey: mask(process.env.MPESA_PASSKEY),
    mpesa_callback_url: mask(process.env.MPESA_CALLBACK_URL || "not set"),
  });
});

if (process.env.VERCEL !== "1") {
  // Start background workers
  startAllWorkers();

  const server = app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

  // Graceful shutdown
  const shutdown = async () => {
    console.log("Shutting down gracefully...");
    await stopAllWorkers();
    server.close(() => process.exit(0));
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

export default app;
