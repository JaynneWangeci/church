import { Router } from "express";
import crypto from "crypto";
import { requireService } from "../lib/supabase.js";
import {
  hashPassword, verifyPassword, signToken, verifyToken,
  logAudit, requireAdmin, getClientIp,
  createSession, invalidateSession,
  checkLoginRateLimit, recordFailedAttempt, resetFailedAttempts, invalidateAllAdminSessions,
} from "../lib/admin.js";
import { sendSMS } from "../lib/africastalking.js";

export const authRouter = Router();



authRouter.get("/check-setup", async (_req, res) => {
  try {
    const db = requireService();
    const { data, error } = await db.from("admin_users").select("id").limit(1);
    if (error) return res.json({ can_setup: false });
    res.json({ can_setup: !data || data.length === 0 });
  } catch {
    res.json({ can_setup: false });
  }
});

authRouter.post("/setup", async (req, res) => {
  try {
    const db = requireService();

    const { email, password, name, phone } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "email, password, and name required" });
    }
    if (!phone) {
      return res.status(400).json({ error: "phone required for password reset" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ error: "Password must include at least one uppercase letter and one number" });
    }

    const { data: existing } = await db.from("admin_users").select("id").limit(1);
    const role = existing && existing.length > 0 ? "admin" : "super_admin";

    const passwordHash = hashPassword(password);
    const { data: admin, error } = await db
      .from("admin_users")
      .insert({ email: email.toLowerCase().trim(), password_hash: passwordHash, name, role, phone })
      .select("id, email, name, role, phone")
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const token = signToken({ id: admin.id, email: admin.email, role: admin.role });

    await logAudit({
      adminId: admin.id,
      action: "login",
      ipAddress: getClientIp(req),
    });

    res.status(201).json({ token, admin });
  } catch (err) {
    console.error("setup error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const normalizedEmail = email.toLowerCase().trim();
    const ip = getClientIp(req);
    const ua = (req.headers["user-agent"] || "").slice(0, 512) || null;

    const rateCheck = await checkLoginRateLimit(normalizedEmail);
    if (rateCheck.blocked) {
      return res.status(429).json({
        error: `Account locked due to too many failed attempts. Try again in ${rateCheck.remainingMinutes} minutes.`,
      });
    }

    const db = requireService();
    const { data: user, error } = await db
      .from("admin_users")
      .select("*")
      .eq("email", normalizedEmail)
      .single();

    if (error || !user || !verifyPassword(password, user.password_hash)) {
      await recordFailedAttempt(normalizedEmail);

      if (user) {
        await logAudit({
          adminId: user.id,
          action: "failed_login",
          ipAddress: ip,
          userAgent: ua,
          details: { email: normalizedEmail },
        });
      }

      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });

    await createSession(user.id, token, ip, ua);
    await resetFailedAttempts(normalizedEmail);
    await db.from("admin_users").update({ last_login_ip: ip }).eq("id", user.id);

    await logAudit({
      adminId: user.id,
      action: "login",
      ipAddress: ip,
      userAgent: ua,
    });

    res.json({ token, admin: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

authRouter.get("/me", requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).admin;
    const db = requireService();
    const { data } = await db.from("admin_users").select("id, email, name, role").eq("id", admin.id).single();
    if (!data) return res.status(404).json({ error: "Admin not found" });
    res.json({ admin: data });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

authRouter.post("/logout", requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).admin;
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";

    await invalidateSession(token);
    await logAudit({
      adminId: admin.id,
      action: "logout",
      ipAddress: (req as any).adminIp,
      userAgent: (req as any).userAgent,
    });

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

authRouter.get("/sessions", requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).admin;
    const db = requireService();
    const authHeader = req.headers.authorization;
    const currentToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const currentHash = crypto.createHash("sha256").update(currentToken).digest("hex");

    const { data: sessions } = await db
      .from("admin_sessions")
      .select("id, ip_address, user_agent, created_at, expires_at, token_hash")
      .eq("admin_id", admin.id)
      .order("created_at", { ascending: false });

    const list = (sessions || []).map((s: Record<string, unknown>) => ({
      id: s.id,
      ipAddress: s.ip_address,
      userAgent: s.user_agent,
      createdAt: s.created_at,
      expiresAt: s.expires_at,
      isCurrent: s.token_hash === currentHash,
    }));

    res.json({ sessions: list });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

authRouter.delete("/sessions/:id", requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).admin;
    const db = requireService();
    const { id } = req.params;

    const { data: session } = await db
      .from("admin_sessions")
      .select("id")
      .eq("id", id)
      .eq("admin_id", admin.id)
      .single();

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    await db.from("admin_sessions").delete().eq("id", id);

    await logAudit({
      adminId: admin.id,
      action: "session_revoked",
      ipAddress: (req as any).adminIp,
      details: { sessionId: id },
    });

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

authRouter.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    const db = requireService();
    const normalizedEmail = email.toLowerCase().trim();

    const { data: admin } = await db
      .from("admin_users")
      .select("id, email, name, role, phone")
      .eq("email", normalizedEmail)
      .single();

    if (!admin) {
      return res.status(404).json({ error: "Email not found." });
    }

    if (admin.role !== "super_admin") {
      return res.status(403).json({ error: "Only super admins can reset their password." });
    }

    if (!admin.phone) {
      return res.status(400).json({ error: "No phone number registered. Contact support." });
    }

    // Invalidate any existing unexpired tokens so we always generate a fresh code
    await db.from("password_reset_tokens").delete().eq("admin_id", admin.id);

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await db.from("password_reset_tokens").insert({
      admin_id: admin.id,
      token_hash: crypto.createHash("sha256").update(code).digest("hex"),
      expires_at: expiresAt,
    });

    // Send code via SMS
    const smsSent = await sendSMS(admin.phone, `AIPCA Bahati: Your password reset code is ${code}. It expires in 1 hour.`);

    await logAudit({
      adminId: admin.id,
      action: "password_reset_request",
      ipAddress: getClientIp(req),
    });

    if (!smsSent) {
      return res.status(500).json({ error: "Failed to send SMS. Try again." });
    }

    res.json({ ok: true, message: "Reset code sent to your registered phone." });
  } catch (err) {
    console.error("forgot-password error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

authRouter.post("/reset-password", async (req, res) => {
  try {
    const { code, password } = req.body;
    if (!code || !password) return res.status(400).json({ error: "Code and password required" });
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ error: "Password must include at least one uppercase letter and one number" });
    }

    const db = requireService();
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");

    const { data: stored, error } = await db
      .from("password_reset_tokens")
      .select("id, admin_id, expires_at")
      .eq("token_hash", codeHash)
      .single();

    if (error || !stored) {
      return res.status(400).json({ error: "Invalid or expired reset code" });
    }

    if (new Date(stored.expires_at) < new Date()) {
      return res.status(400).json({ error: "Reset code has expired" });
    }

    const passwordHash = hashPassword(password);
    await db.from("admin_users").update({ password_hash: passwordHash }).eq("id", stored.admin_id);
    await db.from("password_reset_tokens").delete().eq("id", stored.id);
    await invalidateAllAdminSessions(stored.admin_id);

    await logAudit({
      adminId: stored.admin_id,
      action: "password_reset",
      ipAddress: getClientIp(req),
    });

    res.json({ ok: true, message: "Password reset successfully. Please log in with your new password." });
  } catch (err) {
    console.error("reset-password error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
