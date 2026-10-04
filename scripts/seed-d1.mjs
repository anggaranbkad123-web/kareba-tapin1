// Seed a Cloudflare D1 database with the KAREBA rekening data.
//
// Usage (run from project root, after `wrangler login`):
//
//   1. Apply the schema migration first:
//        bunx wrangler d1 migrations apply kareba-db --remote
//
//   2. Seed the data (15,286 rows) — uses D1 REST API:
//        D1_DATABASE_ID=<id> CLOUDFLARE_API_TOKEN=<token> \
//          ACCOUNT_ID=<account> node scripts/seed-d1.mjs
//
// Alternatively, seed the LOCAL wrangler D1 for testing:
//        bunx wrangler d1 execute kareba-db --local --file=migrations/d1/0001_init.sql
//        node scripts/seed-d1.mjs --local
//
// This script reads prisma/seed-data.json and inserts rows in batches
// via parameterized INSERT statements.

import fs from "fs";
import { execSync } from "child_process";

const IS_LOCAL = process.argv.includes("--local");
const DB_NAME = "kareba-db";
const SEED_FILE = "prisma/seed-data.json";

function log(...args) {
  console.log("[seed-d1]", ...args);
}

/** Escape a string for safe inclusion in a SQL literal. */
function sqlEscape(s) {
  return String(s).replace(/'/g, "''");
}

function buildInsertSQL(rows) {
  const values = rows
    .map(
      (r) =>
        `('${sqlEscape(r.kategori)}','${sqlEscape(r.kode)}','${sqlEscape(
          r.uraian
        )}','${sqlEscape(r.deskripsi)}','${sqlEscape(r.contoh)}',datetime('now'))`
    )
    .join(",");
  return `INSERT INTO "Rekening" ("kategori","kode","uraian","deskripsi","contoh","createdAt") VALUES ${values};`;
}

/** Run a SQL statement against D1 via wrangler CLI. */
function runD1SQL(sql, { local = false } = {}) {
  // Write SQL to a temp file to avoid shell-escaping issues with huge strings.
  const tmpFile = `/tmp/kareba-seed-${Date.now()}.sql`;
  fs.writeFileSync(tmpFile, sql);
  try {
    const flag = local ? "--local" : "--remote";
    const cmd = `bunx wrangler d1 execute ${DB_NAME} ${flag} --file="${tmpFile}"`;
    execSync(cmd, { stdio: "inherit" });
  } finally {
    fs.unlinkSync(tmpFile);
  }
}

async function main() {
  if (!fs.existsSync(SEED_FILE)) {
    console.error(
      `Seed file not found: ${SEED_FILE}. Run scripts/extract-bundle.mjs first.`
    );
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(SEED_FILE, "utf8"));
  log(`Loaded ${data.length} rows from ${SEED_FILE}`);

  // Clear existing data first (idempotent re-seed)
  log(`Clearing existing Rekening rows (${IS_LOCAL ? "local" : "remote"})...`);
  runD1SQL(`DELETE FROM "Rekening";`, { local: IS_LOCAL });

  // Insert in batches of 200 (D1 has statement size limits)
  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < data.length; i += BATCH) {
    const batch = data.slice(i, i + BATCH);
    const sql = buildInsertSQL(batch);
    runD1SQL(sql, { local: IS_LOCAL });
    inserted += batch.length;
    if (inserted % 2000 === 0 || inserted === data.length) {
      log(`  inserted ${inserted}/${data.length}`);
    }
  }

  // Record a sync log
  const counts = data.reduce((acc, r) => {
    acc[r.kategori] = (acc[r.kategori] || 0) + 1;
    return acc;
  }, {});
  const logRows = Object.entries(counts)
    .map(
      ([k, n]) =>
        `('${k}',${n},'success','Disinkronkan sesuai Permendagri 90 Tahun 2019',datetime('now'))`
    )
    .join(",");
  runD1SQL(
    `INSERT INTO "SyncLog" ("kategori","rowCount","status","message","createdAt") VALUES ${logRows};`,
    { local: IS_LOCAL }
  );

  log(`Done. Inserted ${inserted} rekening rows + sync log.`);
  log(`Per kategori:`, counts);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
