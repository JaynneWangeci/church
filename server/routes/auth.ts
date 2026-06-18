import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import { verifyPassword, signToken, verifyToken, logAudit, requireAdmin } from "../lib/admin.js";

export const authRouter = Router();

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

    if (error || !user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    const ip = req.ip || req.socket.remoteAddress || null;

    await logAudit({
      adminId: user.id,
      action: "login",
      ipAddress: ip?.replace(/^::ffff:/, ""),
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
    const ip = req.ip || req.socket.remoteAddress || null;
    await logAudit({
      adminId: admin.id,
      action: "logout",
      ipAddress: ip?.replace(/^::ffff:/, ""),
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
