// Seed the Rekening table from prisma/seed-data.json
import fs from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const data = JSON.parse(
    fs.readFileSync("/home/z/my-project/prisma/seed-data.json", "utf8")
  );
  console.log(`Seeding ${data.length} rows...`);

  // Clear existing
  await prisma.rekening.deleteMany({});
  console.log("Cleared existing rows.");

  // Insert in batches of 1000 using createMany
  const batchSize = 1000;
  let inserted = 0;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize).map((r) => ({
      kategori: r.kategori,
      kode: r.kode,
      uraian: r.uraian,
      deskripsi: r.deskripsi || "",
      contoh: r.contoh || "--",
    }));
    const res = await prisma.rekening.createMany({ data: batch });
    inserted += res.count;
    console.log(`  inserted ${inserted}/${data.length}`);
  }

  // Count per kategori
  const counts = await prisma.rekening.groupBy({
    by: ["kategori"],
    _count: { _all: true },
  });
  console.log("\nRows per kategori:");
  for (const c of counts) {
    console.log(`  ${c.kategori}: ${c._count._all}`);
  }

  // Record sync log
  await prisma.syncLog.deleteMany({});
  for (const c of counts) {
    await prisma.syncLog.create({
      data: {
        kategori: c.kategori,
        rowCount: c._count._all,
        status: "success",
        message: "Disinkronkan sesuai Permendagri 90 Tahun 2019",
      },
    });
  }
  console.log("Sync log recorded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
