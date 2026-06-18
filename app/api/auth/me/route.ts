import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/admin";
import { requireServiceSupabase } from "@/lib/supabase";
import type { AdminUser } from "@/types";

export async function GET(request: NextRequest) {
  const token =
    request.cookies.get("session")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const svc = requireServiceSupabase();
  const { data: admin } = await svc
    .from("admin_users")
    .select("id, email, name, role, created_at")
    .eq("id", payload.adminId)
    .single();

  if (!admin) {
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  }

  return NextResponse.json({ admin: admin as AdminUser });
}
