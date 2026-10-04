import { NextRequest, NextResponse } from "next/server";
import {
  isAdminRequest,
  verifyAdminPassword,
  setAdminPassword,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const MIN_PASSWORD_LENGTH = 6;

// POST /api/auth/change-password  body: { oldPassword, newPassword }
// Admin only. Verifies the current password before accepting the new one.
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: { oldPassword?: string; newPassword?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body tidak valid" },
      { status: 400 }
    );
  }

  const oldPassword = (body.oldPassword || "").trim();
  const newPassword = (body.newPassword || "").trim();

  if (!oldPassword) {
    return NextResponse.json(
      { success: false, error: "Password lama wajib diisi" },
      { status: 400 }
    );
  }
  if (!newPassword) {
    return NextResponse.json(
      { success: false, error: "Password baru wajib diisi" },
      { status: 400 }
    );
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      {
        success: false,
        error: `Password baru minimal ${MIN_PASSWORD_LENGTH} karakter`,
      },
      { status: 400 }
    );
  }
  if (oldPassword === newPassword) {
    return NextResponse.json(
      { success: false, error: "Password baru harus berbeda dari password lama" },
      { status: 400 }
    );
  }

  // Verify the current password
  const ok = await verifyAdminPassword(oldPassword);
  if (!ok) {
    return NextResponse.json(
      { success: false, error: "Password lama salah" },
      { status: 401 }
    );
  }

  // Store the new hashed password
  await setAdminPassword(newPassword);

  return NextResponse.json({
    success: true,
    message: "Password berhasil diubah",
  });
}
