import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin, logAudit } from "@/lib/admin";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  const result = await authenticateAdmin(email, password);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

  await logAudit(result.admin.id, "login", {
    ipAddress: ip,
  });

  const response = NextResponse.json({
    admin: result.admin,
    token: result.token,
  });

  response.cookies.set("session", result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 8 * 60 * 60,
    path: "/",
  });

  return response;
}
