import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import { hashPassword, verifyPassword, signToken, verifyToken, logAudit, requireAdmin, getClientIp } from "../lib/admin.js";

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

    const { data: existing } = await db.from("admin_users").select("id").limit(1);
    if (existing && existing.length > 0) {
      return res.status(400).json({ error: "Setup already completed. An admin already exists." });
    }

    const inviteCode = process.env.ADMIN_INVITE_CODE;
    if (!inviteCode) {
      return res.status(500).json({ error: "ADMIN_INVITE_CODE not configured on server" });
    }

    const { email, password, name, code } = req.body;
    if (!email || !password || !name || !code) {
      return res.status(400).json({ error: "email, password, name, and invite code required" });
    }

    if (code !== inviteCode) {
      return res.status(403).json({ error: "Invalid invite code" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const passwordHash = hashPassword(password);
    const { data: admin, error } = await db
      .from("admin_users")
      .insert({ email: email.toLowerCase().trim(), password_hash: passwordHash, name, role: "super_admin" })
      .select("id, email, name, role")
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

    const db = requireService();
    const { data: user, error } = await db
      .from("admin_users")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .single();

    const ip = getClientIp(req);

    if (error || !user || !verifyPassword(password, user.password_hash)) {
      if (user) {
        await logAudit({
          adminId: user.id,
          action: "failed_login",
          ipAddress: ip,
          details: { email: email.toLowerCase().trim() },
        });
      }
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });

    await logAudit({
      adminId: user.id,
      action: "login",
      ipAddress: ip,
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
    await logAudit({
      adminId: admin.id,
      action: "logout",
      ipAddress: (req as any).adminIp,
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
