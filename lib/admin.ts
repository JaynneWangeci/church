import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { requireServiceSupabase } from "./supabase";
import type { AdminUser, AuditAction, AuditLog } from "@/types";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-in-production";

export interface JwtPayload {
  adminId: string;
  role: AdminUser["role"];
  name: string;
}

export function signToken(admin: AdminUser): string {
  return jwt.sign(
    { adminId: admin.id, role: admin.role, name: admin.name },
    JWT_SECRET,
    { expiresIn: "8h" },
  );
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

async function getServiceClient() {
  const svc = requireServiceSupabase();
  return svc;
}

export async function authenticateAdmin(
  email: string,
  password: string,
): Promise<{ admin: AdminUser; token: string } | { error: string }> {
  const svc = await getServiceClient();

  const { data: admin, error } = await svc
    .from("admin_users")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (error || !admin) {
    return { error: "Invalid email or password" };
  }

  const valid = await verifyPassword(password, admin.password_hash);
  if (!valid) {
    return { error: "Invalid email or password" };
  }

  const token = signToken(admin);

  const tokenHash = await hashPassword(token);

  await svc.from("admin_sessions").insert({
    admin_id: admin.id,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  });

  return {
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      created_at: admin.created_at,
    },
    token,
  };
}

export async function logAudit(
  adminId: string,
  action: AuditAction,
  opts: {
    resourceType?: string;
    resourceId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
  } = {},
): Promise<void> {
  const svc = await getServiceClient();
  await svc.from("audit_logs").insert({
    admin_id: adminId,
    action,
    resource_type: opts.resourceType || null,
    resource_id: opts.resourceId || null,
    details: opts.details || null,
    ip_address: opts.ipAddress || null,
  });
}

export async function getAuditLogs(
  limit = 50,
  offset = 0,
): Promise<AuditLog[]> {
  const svc = await getServiceClient();
  const { data } = await svc
    .from("audit_logs")
    .select("*, admin_users!inner(name)")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (!data) return [];

  return data.map((log: Record<string, unknown>) => ({
    id: log.id as string,
    admin_id: log.admin_id as string,
    action: log.action as AuditAction,
    resource_type: log.resource_type as string | null,
    resource_id: log.resource_id as string | null,
    details: log.details as Record<string, unknown> | null,
    ip_address: log.ip_address as string | null,
    created_at: log.created_at as string,
    admin_name: (log.admin_users as Record<string, unknown>)?.name as string | undefined,
  }));
}
