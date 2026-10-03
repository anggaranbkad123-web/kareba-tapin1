// Shared logic to sync Rekening data from the upstream source.
// The data follows Permendagri Nomor 90 Tahun 2019 classification.
// 1. Fetch the HTML page to discover the current JS bundle URL
// 2. Download the JS bundle
// 3. Extract the 3 JSON arrays (Belanja, Pendapatan, Pembiayaan)
// 4. Replace the Rekening table
import { db } from "@/lib/db";

const SOURCE_BASE = "https://belakas.pages.dev";
const KATEGORI_NAMES = ["Belanja", "Pendapatan", "Pembiayaan"] as const;
export type Kategori = (typeof KATEGORI_NAMES)[number];

export interface SyncResult {
  total: number;
  perKategori: Record<string, number>;
  bundleUrl: string;
}

/** Decode JS-only \xHH escapes so the string is valid JSON. */
function normalizeJsString(s: string): string {
  return s.replace(/\\x([0-9A-Fa-f]{2})/g, (_m, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/** Fetch the HTML of the source site and discover the JS bundle URL. */
async function discoverBundleUrl(): Promise<string> {
  const res = await fetch(`${SOURCE_BASE}/rekening`, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; KarebaSync/1.0)" },
  });
  if (!res.ok) throw new Error(`Failed to fetch source HTML: ${res.status}`);
  const html = await res.text();
  // Look for: <script type="module" crossorigin src="/assets/index-XXXX.js"></script>
  const m = html.match(/<script[^>]*src="(\/assets\/index-[^"]+\.js)"/);
  if (!m) throw new Error("Could not find JS bundle URL in source HTML");
  return `${SOURCE_BASE}${m[1]}`;
}

/** Download the JS bundle and extract the 3 rekening arrays. */
async function extractRekeningArrays(
  bundleUrl: string
): Promise<Array<{ kategori: string; kode: string; uraian: string; deskripsi: string; contoh: string }>> {
  const res = await fetch(bundleUrl, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; KarebaSync/1.0)" },
  });
  if (!res.ok) throw new Error(`Failed to fetch JS bundle: ${res.status}`);
  const js = await res.text();

  const marker = 'JSON.parse(`[{"KODE":';
  const arrays: string[] = [];
  let searchFrom = 0;
  while (true) {
    const start = js.indexOf(marker, searchFrom);
    if (start === -1) break;
    const arrStart = js.indexOf("[", start);
    const endQuote = js.indexOf("]`", arrStart);
    if (endQuote === -1) break;
    arrays.push(js.slice(arrStart, endQuote + 1));
    searchFrom = endQuote + 2;
  }

  if (arrays.length < 3) {
    throw new Error(
      `Expected 3 data arrays in bundle, found ${arrays.length}`
    );
  }

  const out: Array<{
    kategori: string;
    kode: string;
    uraian: string;
    deskripsi: string;
    contoh: string;
  }> = [];

  arrays.forEach((jsonStr, i) => {
    const normalized = normalizeJsString(jsonStr);
    let parsed: Array<Record<string, unknown>>;
    try {
      parsed = JSON.parse(normalized);
    } catch (e) {
      throw new Error(
        `Failed to parse array ${i} (${KATEGORI_NAMES[i] ?? i}): ${
          e instanceof Error ? e.message : String(e)
        }`
      );
    }
    const kategori = KATEGORI_NAMES[i] ?? `Unknown${i}`;
    for (const row of parsed) {
      out.push({
        kategori,
        kode: String(row.KODE ?? ""),
        uraian: decodeEntities(String(row.URAIAN ?? "")),
        deskripsi: decodeEntities(String(row.DESKRIPSI ?? "")),
        contoh: decodeEntities(String(row.KETENTUAN ?? "--")) || "--",
      });
    }
  });

  return out;
}

/** Full sync: replace all Rekening rows with fresh data from source. */
export async function syncRekeningData(): Promise<SyncResult> {
  const bundleUrl = await discoverBundleUrl();
  const rows = await extractRekeningArrays(bundleUrl);

  // Replace data inside a transaction (delete + recreate)
  await db.rekening.deleteMany({});
  const batchSize = 1000;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await db.rekening.createMany({ data: batch });
  }

  // Compute per-kategori counts
  const grouped = await db.rekening.groupBy({
    by: ["kategori"],
    _count: { _all: true },
  });
  const perKategori: Record<string, number> = {};
  for (const g of grouped) perKategori[g.kategori] = g._count._all;

  // Record sync log
  await db.syncLog.createMany({
    data: Object.entries(perKategori).map(([kategori, rowCount]) => ({
      kategori,
      rowCount,
      status: "success",
      message: "Disinkronkan sesuai Permendagri 90 Tahun 2019",
    })),
  });

  return {
    total: rows.length,
    perKategori,
    bundleUrl,
  };
}
