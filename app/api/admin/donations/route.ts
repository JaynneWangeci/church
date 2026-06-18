import { NextRequest, NextResponse } from "next/server";
import { requireServiceSupabase } from "@/lib/supabase";
import { verifyToken, logAudit } from "@/lib/admin";

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

  const svc = requireServiceSupabase();
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
  const offset = Number(searchParams.get("offset")) || 0;

  let query = svc
    .from("donations")
    .select("*, committee_members!left(name)")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && ["pending", "completed", "failed"].includes(status)) {
    query = query.eq("status", status);
  }

  if (payload.role === "viewer") {
    query = query.eq("status", "completed");
  }

  const { data: donations } = await query;

  const { count } = await svc
    .from("donations")
    .select("*", { count: "exact", head: true });

  await logAudit(payload.adminId, "view_donations", {
    details: { filter: status || "all", limit, offset },
    ipAddress: request.headers.get("x-forwarded-for") || undefined,
  });

  return NextResponse.json({
    donations: donations || [],
    total: count || 0,
  });
}
