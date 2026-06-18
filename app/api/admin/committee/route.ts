import { NextRequest, NextResponse } from "next/server";
import { requireServiceSupabase } from "@/lib/supabase";
import { verifyToken, logAudit } from "@/lib/admin";

export async function POST(request: NextRequest) {
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

  const body = await request.json();
  const { name, role, council, order } = body;

  if (!name || !role || !council) {
    return NextResponse.json({ error: "Name, role, and council are required" }, { status: 400 });
  }

  const validCouncils = ["parish_board", "women_council", "men_council", "development"];
  if (!validCouncils.includes(council)) {
    return NextResponse.json({ error: "Invalid council" }, { status: 400 });
  }

  const svc = requireServiceSupabase();

  const { data: member, error } = await svc
    .from("committee_members")
    .insert({
      name,
      role,
      council,
      order: order || 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAudit(payload.adminId, "create_committee", {
    resourceType: "committee_member",
    resourceId: member.id,
    details: { name, role, council },
    ipAddress: request.headers.get("x-forwarded-for") || undefined,
  });

  return NextResponse.json({ member }, { status: 201 });
}
