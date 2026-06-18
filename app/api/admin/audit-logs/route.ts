import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getAuditLogs, logAudit } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token =
    request.cookies.get("session")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  if (payload.role !== "super_admin") {
    return NextResponse.json({ error: "Only super admin can view audit logs" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
  const offset = Number(searchParams.get("offset")) || 0;

  const logs = await getAuditLogs(limit, offset);

  await logAudit(payload.adminId, "view_audit_logs", {
    ipAddress: request.headers.get("x-forwarded-for") || undefined,
  });

  return NextResponse.json({ logs });
}
