import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const KATEGORI_LIST = ["Belanja", "Pendapatan", "Pembiayaan"] as const;
type Kategori = (typeof KATEGORI_LIST)[number];

// GET /api/rekening?kategori=Belanja&q=...&page=1&pageSize=20
export async function GET(req: NextRequest) {
  const db = await getDb();
  const { searchParams } = new URL(req.url);
  const kategoriParam = searchParams.get("kategori") || "Belanja";
  const q = (searchParams.get("q") || "").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(
    500,
    Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10) || 20)
  );

  const kategori = (
    KATEGORI_LIST.includes(kategoriParam as Kategori)
      ? kategoriParam
      : "Belanja"
  ) as Kategori;

  const where = {
    kategori,
    ...(q
      ? {
          OR: [
            { kode: { contains: q } },
            { uraian: { contains: q } },
            { deskripsi: { contains: q } },
            { contoh: { contains: q } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    db.rekening.count({ where }),
    db.rekening.findMany({
      where,
      orderBy: [{ kode: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    kategori,
    q,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    rows,
  });
}

// POST /api/rekening — create a new rekening (admin only)
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  const db = await getDb();
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

  // prevent duplicate kode within same kategori
  const existing = await db.rekening.findFirst({
    where: { kategori, kode },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      {
        success: false,
        error: `Kode "${kode}" sudah ada di kategori ${kategori}`,
      },
      { status: 409 }
    );
  }

  const created = await db.rekening.create({
    data: {
      kategori,
      kode,
      uraian,
      deskripsi: (body.deskripsi || "").trim(),
      contoh: (body.contoh || "--").trim() || "--",
    },
  });

  return NextResponse.json({ success: true, row: created }, { status: 201 });
}
