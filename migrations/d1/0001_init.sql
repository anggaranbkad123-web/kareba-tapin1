-- D1 migration: initial schema for KAREBA
-- Matches prisma/schema.prisma (Rekening, SyncLog, AdminCredential).
-- (User and Post models from the scaffold are included for completeness.)

-- =========================================================
-- Rekening: Chart of Accounts (Belanja / Pendapatan / Pembiayaan)
-- Reference: Permendagri Nomor 90 Tahun 2019
-- =========================================================
CREATE TABLE IF NOT EXISTS "Rekening" (
  "id"        INTEGER PRIMARY KEY AUTOINCREMENT,
  "kategori"  TEXT    NOT NULL,
  "kode"      TEXT    NOT NULL,
  "uraian"    TEXT    NOT NULL,
  "deskripsi" TEXT    NOT NULL DEFAULT '',
  "contoh"    TEXT    NOT NULL DEFAULT '--',
  "createdAt" TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS "Rekening_kategori_idx" ON "Rekening"("kategori");
CREATE INDEX IF NOT EXISTS "Rekening_kode_idx"     ON "Rekening"("kode");

-- =========================================================
-- SyncLog: metadata for sync operations
-- =========================================================
CREATE TABLE IF NOT EXISTS "SyncLog" (
  "id"        INTEGER PRIMARY KEY AUTOINCREMENT,
  "kategori"  TEXT    NOT NULL,
  "rowCount"  INTEGER NOT NULL,
  "status"    TEXT    NOT NULL,
  "message"   TEXT    NOT NULL DEFAULT '',
  "createdAt" TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- =========================================================
-- AdminCredential: single-row store (id = 1) for admin password hash
-- =========================================================
CREATE TABLE IF NOT EXISTS "AdminCredential" (
  "id"           INTEGER PRIMARY KEY,
  "passwordHash" TEXT    NOT NULL,
  "updatedAt"    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- =========================================================
-- Scaffold models (kept for compatibility; not used by KAREBA)
-- =========================================================
CREATE TABLE IF NOT EXISTS "User" (
  "id"        TEXT PRIMARY KEY,
  "email"     TEXT NOT NULL,
  "name"      TEXT,
  "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
  "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

CREATE TABLE IF NOT EXISTS "Post" (
  "id"        TEXT PRIMARY KEY,
  "title"     TEXT NOT NULL,
  "content"   TEXT,
  "published" INTEGER NOT NULL DEFAULT 0,
  "authorId"  TEXT NOT NULL,
  "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
  "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
);
