import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// GET /api/auth/me — returns current admin status
export async function GET(req: NextRequest) {
  const isAdmin = isAdminRequest(req);
  return NextResponse.json({ isAdmin });
}
