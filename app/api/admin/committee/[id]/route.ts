import { NextRequest, NextResponse } from "next/server";
import { requireServiceSupabase } from "@/lib/supabase";
import { verifyToken, logAudit } from "@/lib/admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token =
    request.cookies.get("session")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload || payload.role === "viewer") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const svc = requireServiceSupabase();

  const { data: member, error } = await svc
    .from("committee_members")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAudit(payload.adminId, "update_committee", {
    resourceType: "committee_member",
    resourceId: id,
    details: body,
    ipAddress: request.headers.get("x-forwarded-for") || undefined,
  });

  return NextResponse.json({ member });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token =
    request.cookies.get("session")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload || payload.role !== "super_admin") {
    return NextResponse.json({ error: "Only super admin can delete" }, { status: 403 });
  }

  const { id } = await params;
  const svc = requireServiceSupabase();

  const { error } = await svc
    .from("committee_members")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAudit(payload.adminId, "delete_committee", {
    resourceType: "committee_member",
    resourceId: id,
    ipAddress: request.headers.get("x-forwarded-for") || undefined,
  });

  return NextResponse.json({ success: true });
}
