// Extract the 3 JSON data arrays (Belanja, Pendapatan, Pembiayaan) from the JS bundle
import fs from "fs";

const js = fs.readFileSync("/tmp/belakas_app.js", "utf8");

// Find all JSON.parse(`[{"KODE": ... }]`) blocks
const marker = 'JSON.parse(`[{"KODE":';
const arrays = [];
let searchFrom = 0;
while (true) {
  const start = js.indexOf(marker, searchFrom);
  if (start === -1) break;
  // start of the actual JSON array
  const arrStart = js.indexOf("[", start);
  // find closing `])  — pattern is `]` then backtick
  // we look for the backtick that closes the template literal:
  // the JSON ends with }]` so search for `]\`` 
  const endQuote = js.indexOf("]`", arrStart);
  if (endQuote === -1) break;
  const jsonStr = js.slice(arrStart, endQuote + 1); // includes the ]
  arrays.push(jsonStr);
  searchFrom = endQuote + 2;
}

console.log(`Found ${arrays.length} JSON arrays`);

const kategoriNames = ["Belanja", "Pendapatan", "Pembiayaan"];
const all = [];

arrays.forEach((jsonStr, i) => {
  // Convert JS-only escapes to JSON-compatible ones:
  //  \xHH  -> \u00HH   (hex escape, valid in JS strings, not in JSON)
  let normalized = jsonStr.replace(/\\x([0-9A-Fa-f]{2})/g, (m, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
  let parsed;
  try {
    parsed = JSON.parse(normalized);
  } catch (e) {
    console.error(`Failed to parse array ${i}:`, e.message);
    return;
  }
  const kategori = kategoriNames[i] || `Unknown${i}`;
  console.log(`${kategori}: ${parsed.length} rows`);
  for (const row of parsed) {
    all.push({
      kategori,
      kode: String(row.KODE ?? ""),
      uraian: String(row.URAIAN ?? ""),
      deskripsi: String(row.DESKRIPSI ?? ""),
      contoh: String(row.KETENTUAN ?? "--"),
    });
  }
});

console.log(`TOTAL: ${all.length} rows`);
fs.writeFileSync(
  "/home/z/my-project/prisma/seed-data.json",
  JSON.stringify(all, null, 2)
);
console.log("Wrote prisma/seed-data.json");

// Samples per kategori
for (const k of kategoriNames) {
  const rows = all.filter((r) => r.kategori === k);
  console.log(`\n=== ${k} (${rows.length} rows) ===`);
  console.log(`  first: ${rows[0].kode} - ${rows[0].uraian}`);
  console.log(`  last:  ${rows[rows.length - 1].kode} - ${rows[rows.length - 1].uraian}`);
}
