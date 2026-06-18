import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";
import { requireService } from "./supabase.js";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const JWT_EXPIRES = "24h";

export type AuditAction =
  | "login" | "logout"
  | "view_donations" | "view_donation"
  | "export_ledger"
  | "create_committee" | "update_committee" | "delete_committee"
  | "view_audit_logs"
  | "create_admin" | "update_admin";

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compareSync(password, hash);
}

export function signToken(payload: { id: string; email: string; role: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
}

export async function logAudit(params: {
  adminId: string;
  action: AuditAction;
  resourceType?: string | null;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
}) {
  const db = requireService();
  const { error } = await db.from("audit_logs").insert({
    admin_id: params.adminId,
    action: params.action,
    resource_type: params.resourceType || null,
    resource_id: params.resourceId || null,
    details: params.details || null,
    ip_address: params.ipAddress || null,
  });
  if (error) console.error("audit log error:", error.message);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const decoded = verifyToken(authHeader.slice(7));
    (req as any).admin = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
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
