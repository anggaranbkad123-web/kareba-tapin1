import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  verifyAdminPassword,
  ADMIN_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// POST /api/auth/login  body: { password }
export async function POST(req: NextRequest) {
  let body: { password?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body tidak valid" },
      { status: 400 }
    );
  }

  const password = (body.password || "").trim();
  if (!password) {
    return NextResponse.json(
      { success: false, error: "Password wajib diisi" },
      { status: 400 }
    );
  }

  const ok = await verifyAdminPassword(password);
  if (!ok) {
    return NextResponse.json(
      { success: false, error: "Password salah" },
      { status: 401 }
    );
  }

  const token = createSessionToken();
  const res = NextResponse.json({ success: true, role: "admin" });
  res.cookies.set(ADMIN_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
  return res;
}
