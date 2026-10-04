import { NextResponse } from "next/server";
import { syncRekeningData } from "@/lib/rekening-source";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // sync can take a while (downloading 5MB bundle)

// POST /api/sync — re-pull rekening data and replace DB (sesuai Permendagri 90/2019)
export async function POST() {
  try {
    const result = await syncRekeningData();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
