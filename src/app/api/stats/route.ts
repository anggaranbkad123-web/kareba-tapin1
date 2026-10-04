import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/stats — counts per kategori + last sync info
export async function GET() {
  const db = await getDb();
  const grouped = await db.rekening.groupBy({
    by: ["kategori"],
    _count: { _all: true },
  });

  const counts: Record<string, number> = {
    Belanja: 0,
    Pendapatan: 0,
    Pembiayaan: 0,
  };
  let total = 0;
  for (const g of grouped) {
    counts[g.kategori] = g._count._all;
    total += g._count._all;
  }

  // Last sync per kategori
  const logs = await db.syncLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  const lastSync = logs[0]?.createdAt ?? null;

  return NextResponse.json({
    total,
    counts,
    lastSync,
    logs,
  });
}
