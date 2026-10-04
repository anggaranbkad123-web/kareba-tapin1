# 🚀 Panduan Deploy KAREBA ke Cloudflare Pages

Aplikasi KAREBA sudah dikonfigurasi untuk deploy ke **Cloudflare Pages** menggunakan:
- **@opennextjs/cloudflare** — adapter Next.js → Cloudflare Workers
- **Cloudflare D1** — database SQLite serverless (pengganti file SQLite lokal)
- **Prisma + @prisma/adapter-d1** — ORM yang otomatis pakai D1 di production

> ⚠️ **Penting:** Cloudflare Pages **tidak punya filesystem persisten**, jadi file SQLite lokal (`db/custom.db`) tidak akan bekerja di production. Karena itu kita pakai **Cloudflare D1** sebagai database production. Local dev tetap pakai file SQLite seperti biasa.

---

## 📋 Prasyarat

1. **Akun Cloudflare** (gratis) — daftar di https://dash.cloudflare.com/sign-up
2. **Node.js 18+** dan **Bun** terinstall di komputer Anda
3. Kode proyek KAREBA (folder ini) di komputer Anda

---

## 🔧 Langkah 1: Login ke Cloudflare via Wrangler

Jalankan di terminal (di folder proyek):

```bash
bunx wrangler login
```

Ini akan membuka browser untuk login ke akun Cloudflare Anda. Setelah berhasil, terminal akan menampilkan `✅ Successfully logged in`.

---

## 🗄️ Langkah 2: Buat Database D1

Buat database D1 baru bernama `kareba-db`:

```bash
bunx wrangler d1 create kareba-db
```

Perintah ini akan mengembalikan output seperti:

```
✅ Successfully created DB 'kareba-db'
[[d1_databases]]
binding = "DB"
database_name = "kareba-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"   ← COPY ID INI
```

**Salin `database_id`** yang muncul, lalu buka file `wrangler.jsonc` dan ganti bagian:

```jsonc
"database_id": "REPLACE_WITH_YOUR_D1_DATABASE_ID"
```

dengan ID asli Anda.

---

## 📊 Langkah 3: Terapkan Skema Database ke D1

Jalankan migrasi untuk membuat tabel di D1 production:

```bash
bun run d1:migrate:remote
```

Ini akan menjalankan `migrations/d1/0001_init.sql` ke D1 remote. Konfirmasi dengan `y` saat diminta.

> Untuk testing lokal (D1 di komputer Anda, bukan production), gunakan:
> ```bash
> bun run d1:migrate:local
> ```

---

## 🌱 Langkah 4: Seed Data ke D1 (15.286 rekening)

Masukkan data rekening ke D1 production:

```bash
bun run d1:seed:remote
```

Ini akan memasukkan 15.286 baris (Belanja 4.873 + Pendapatan 9.347 + Pembiayaan 1.066) ke D1. Proses ini butuh beberapa menit karena memasukkan data dalam batch 200 baris.

> **Catatan:** Script ini memanggil `bunx wrangler d1 execute` berulang. Pastikan Anda sudah `wrangler login` (Langkah 1).
>
> Untuk seed D1 lokal: `bun run d1:seed:local`

Verifikasi data sudah masuk:

```bash
bunx wrangler d1 execute kareba-db --remote --command="SELECT kategori, COUNT(*) as jumlah FROM Rekening GROUP BY kategori;"
```

---

## 🔑 Langkah 5: Set Secret Admin Password (Produksi)

Untuk keamanan, set password admin dan secret session sebagai **secret** Cloudflare (tidak terlihat di kode):

```bash
bunx wrangler secret put ADMIN_PASSWORD
# → masukkan password admin yang kuat, mis: Kareba@2024!

bunx wrangler secret put ADMIN_SECRET
# → masukkan string acak panjang, mis: kareba-session-super-secret-key-2024
```

> Jika Anda TIDAK menjalankan ini, password default `admin123` (dari `wrangler.jsonc` vars) akan dipakai — **tidak aman untuk produksi**.

---

## 🚀 Langkah 6: Deploy ke Cloudflare Pages

Build dan deploy aplikasi:

```bash
bun run deploy
```

Perintah ini menjalankan:
1. `opennextjs-cloudflare build` — build Next.js menjadi Cloudflare Worker
2. `wrangler deploy` — deploy ke Cloudflare Pages/Workers

Setelah selesai, Anda akan mendapat URL seperti:

```
https://kareba.<your-subdomain>.workers.dev
```

**URL ini bisa Anda share ke teman!** 🎉

---

## ✅ Langkah 7: Verifikasi Deployment

Buka URL deployment di browser. Pastikan:

- [ ] Halaman KAREBA muncul dengan background kuning
- [ ] 3 kartu kategori menampilkan jumlah (Belanja 4.873, dst.)
- [ ] Tabel rekening menampilkan data
- [ ] Pencarian berfungsi
- [ ] Tombol **Admin** → login dengan password Anda → bisa tambah/edit/hapus
- [ ] Footer menampilkan "Referensi: Permendagri Nomor 90 Tahun 2019"

Jika data tidak muncul, kemungkinan Langkah 3-4 (migrasi + seed) belum dijalankan ke D1 remote.

---

## 🔄 Update Data (Sinkronisasi)

Setelah deploy, tombol **"Sinkron"** di aplikasi akan menarik data terbaru dan menyimpannya ke D1 production. Tidak perlu deploy ulang.

> **Catatan:** Sinkronisasi mengunduh bundle ~5MB. Cloudflare Workers free tier punya batas waktu CPU. Jika sinkronisasi timeout, jalankan ulang Langkah 4 (seed) secara manual.

---

## 🧪 Testing Lokal dengan D1 (Opsional)

Jika ingin test code path D1 secara lokal (bukan SQLite file):

1. Pastikan `wrangler.jsonc` sudah punya `database_id` yang valid
2. Jalankan migrasi & seed lokal:
   ```bash
   bun run d1:migrate:local
   bun run d1:seed:local
   ```
3. Jalankan dev server dengan context Cloudflare:
   ```bash
   bun run dev
   ```
   (next.config.ts otomatis menginisialisasi `initOpenNextCloudflareForDev`)

Untuk kembali ke mode SQLite file biasa, cukup pastikan `initOpenNextCloudflareForDev` tidak error (sudah ada fallback otomatis).

---

## 🌐 Custom Domain (Opsional)

Untuk pakai domain sendiri (mis. `kareba.tapinkab.go.id`):

1. Buka Cloudflare Dashboard → Workers & Pages → pilih deployment `kareba`
2. Tab **Custom Domains** → **Set up a custom domain**
3. Masukkan domain Anda (domain harus di-manage oleh Cloudflare DNS)
4. Cloudflare akan otomatis setup DNS + SSL

---

## 🆘 Troubleshooting

**Error: `D1 binding 'DB' not found`**
→ `wrangler.jsonc` belum punya `database_id` yang valid, atau deploy belum selesai. Ulangi Langkah 2 & 6.

**Halaman muncul tapi tabel kosong**
→ Data belum di-seed ke D1 remote. Jalankan Langkah 4 (`bun run d1:seed:remote`).

**Login admin gagal setelah deploy**
→ Anda belum set secret password, atau lupa password. Set ulang dengan `bunx wrangler secret put ADMIN_PASSWORD`.

**Deploy gagal: build error**
→ Jalankan `bun run lint` untuk cek error kode. Pastikan tidak ada `import { db }` yang lupa diganti dengan `getDb()`.

**Sync timeout di production**
→ Free tier Cloudflare punya batas CPU time. Coba jalankan seed manual (Langkah 4) alih-alih sync dari UI.

---

## 📁 File Konfigurasi Cloudflare

| File | Fungsi |
|------|--------|
| `wrangler.jsonc` | Konfigurasi Cloudflare Workers (binding D1, vars) |
| `open-next.config.ts` | Konfigurasi OpenNext (Next.js → Cloudflare) |
| `migrations/d1/0001_init.sql` | Skema database untuk D1 |
| `scripts/seed-d1.mjs` | Script seed data ke D1 |
| `.env` | Konfigurasi local dev (DATABASE_URL, ADMIN_PASSWORD) |

## 📜 Perintah Berguna

| Perintah | Fungsi |
|----------|--------|
| `bun run dev` | Jalankan dev server lokal (SQLite) |
| `bun run lint` | Cek kualitas kode |
| `bun run preview` | Build & jalankan lokal seperti production |
| `bun run deploy` | Deploy ke Cloudflare Pages |
| `bun run d1:migrate:remote` | Terapkan skema ke D1 production |
| `bun run d1:seed:remote` | Seed data ke D1 production |
| `bun run d1:migrate:local` | Terapkan skema ke D1 lokal |
| `bun run d1:seed:local` | Seed data ke D1 lokal |

---

**Selamat!** Setelah mengikuti langkah-langkah di atas, aplikasi KAREBA Anda akan online di Cloudflare Pages dan bisa diakses siapa saja lewat URL. 🎉
