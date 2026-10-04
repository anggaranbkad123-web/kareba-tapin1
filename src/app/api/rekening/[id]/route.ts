import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const KATEGORI_LIST = ["Belanja", "Pendapatan", "Pembiayaan"] as const;
type Kategori = (typeof KATEGORI_LIST)[number];

function requireAdmin(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  return null;
}

// PUT /api/rekening/[id] — update a rekening (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAdmin(req);
  if (authError) return authError;

  const db = await getDb();

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { success: false, error: "ID tidak valid" },
      { status: 400 }
    );
  }

  let body: {
    kategori?: string;
    kode?: string;
    uraian?: string;
    deskripsi?: string;
    contoh?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body tidak valid" },
      { status: 400 }
    );
  }

  const kategori = (body.kategori || "").trim();
  const kode = (body.kode || "").trim();
  const uraian = (body.uraian || "").trim();

  if (!KATEGORI_LIST.includes(kategori as Kategori)) {
    return NextResponse.json(
      { success: false, error: "Kategori tidak valid" },
      { status: 400 }
    );
  }
  if (!kode) {
    return NextResponse.json(
      { success: false, error: "Kode wajib diisi" },
      { status: 400 }
    );
  }
  if (!uraian) {
    return NextResponse.json(
      { success: false, error: "Uraian wajib diisi" },
      { status: 400 }
    );
  }

  // check exists
  const existing = await db.rekening.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Rekening tidak ditemukan" },
      { status: 404 }
    );
  }

  // check duplicate kode (excluding self)
  const dup = await db.rekening.findFirst({
    where: { kategori, kode, NOT: { id } },
    select: { id: true },
  });
  if (dup) {
    return NextResponse.json(
      {
        success: false,
        error: `Kode "${kode}" sudah dipakai di kategori ${kategori}`,
      },
      { status: 409 }
    );
  }

  const updated = await db.rekening.update({
    where: { id },
    data: {
      kategori,
      kode,
      uraian,
      deskripsi: (body.deskripsi || "").trim(),
      contoh: (body.contoh || "--").trim() || "--",
    },
  });

  return NextResponse.json({ success: true, row: updated });
}

// DELETE /api/rekening/[id] — delete a rekening (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAdmin(req);
  if (authError) return authError;

  const db = await getDb();

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { success: false, error: "ID tidak valid" },
      { status: 400 }
    );
  }

  const existing = await db.rekening.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Rekening tidak ditemukan" },
      { status: 404 }
    );
  }

  await db.rekening.delete({ where: { id } });
  return NextResponse.json({ success: true, id });
}
