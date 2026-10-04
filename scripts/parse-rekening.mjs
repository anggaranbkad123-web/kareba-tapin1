// Parse the scraped belakas pages into clean JSON data
import fs from "fs";

const PAGES = [
  { file: "/tmp/rekening_page.json", kategori: "Belanja" },
  { file: "/tmp/pendapatan_page.json", kategori: "Pendapatan" },
  { file: "/tmp/pembiayaan_page.json", kategori: "Pembiayaan" },
];

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function cellToText(tdHtml) {
  // Remove all <span ...></span> highlight wrappers (empty spans)
  let s = tdHtml.replace(/<span[^>]*><\/span>/g, "");
  // Remove <br> -> newline
  s = s.replace(/<br\s*\/?>/gi, "\n");
  // Strip remaining tags
  s = s.replace(/<[^>]*>/g, "");
  // Decode entities
  s = decodeEntities(s);
  // Collapse whitespace per line, trim
  s = s
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .join("\n")
    .trim();
  return s;
}

function parsePage(file, kategori) {
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const html = raw.data.html;
  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
  if (!tbodyMatch) return [];
  const tbody = tbodyMatch[1];
  const rows = tbody.match(/<tr[\s\S]*?<\/tr>/g) || [];
  const out = [];
  for (const tr of rows) {
    const tds = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [];
    if (tds.length < 4) continue;
    const kode = cellToText(tds[0]);
    const uraian = cellToText(tds[1]);
    const deskripsi = cellToText(tds[2]);
    const contoh = cellToText(tds[3]);
    if (!kode && !uraian) continue;
    out.push({ kategori, kode, uraian, deskripsi, contoh });
  }
  return out;
}

const all = [];
for (const p of PAGES) {
  const rows = parsePage(p.file, p.kategori);
  console.log(`${p.kategori}: ${rows.length} rows`);
  all.push(...rows);
}

console.log(`TOTAL: ${all.length} rows`);
fs.writeFileSync(
  "/home/z/my-project/prisma/seed-data.json",
  JSON.stringify(all, null, 2)
);
console.log("Wrote prisma/seed-data.json");

// Print a few samples
console.log("\n--- SAMPLE (first 3 of Belanja) ---");
all.filter((r) => r.kategori === "Belanja").slice(0, 3).forEach((r, i) => {
  console.log(`[${i}] kode=${r.kode} | uraian=${r.uraian}`);
  console.log(`    deskripsi=${r.deskripsi.slice(0, 80)}...`);
  console.log(`    contoh=${r.contoh.slice(0, 80)}`);
});
