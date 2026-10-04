// Simple signed-cookie session for admin authentication.
// Stateless HMAC-SHA256 token: base64(payload).hmac
import crypto from "crypto";
import { getDb } from "@/lib/db";

const SECRET =
  process.env.ADMIN_SECRET || "kareba-dev-secret-change-me-in-production";
const COOKIE_NAME = "kareba_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

export const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || "admin123"; // demo default (used until changed)

// ===== Password hashing (scrypt, built into Node) =====
const SCRYPT_KEYLEN = 64;
const SCRYPT_SALTLEN = 16;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SCRYPT_SALTLEN);
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 64 * 1024 * 1024,
  });
  // format: scrypt$N$r$p$saltB64$hashB64
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString(
    "base64"
  )}$${derived.toString("base64")}`;
}

function verifyHash(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4], "base64");
  const expected = Buffer.from(parts[5], "base64");
  let derived: Buffer;
  try {
    derived = crypto.scryptSync(password, salt, expected.length, {
      N,
      r,
      p,
      maxmem: 64 * 1024 * 1024,
    });
  } catch {
    return false;
  }
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

/** Constant-time string compare for plaintext passwords. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verify a password against the current admin credential.
 * - If a DB-stored hash exists (password was changed), check against it.
 * - Otherwise fall back to the env ADMIN_PASSWORD default.
 */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  const db = await getDb();
  const cred = await db.adminCredential.findUnique({ where: { id: 1 } });
  if (cred) {
    return verifyHash(password, cred.passwordHash);
  }
  // No custom password set yet — use env default
  return safeEqual(password, ADMIN_PASSWORD);
}

/**
 * Set a new admin password (stores a scrypt hash in the DB).
 * After this is called once, the env ADMIN_PASSWORD is ignored.
 */
export async function setAdminPassword(newPassword: string): Promise<void> {
  const db = await getDb();
  const hash = hashPassword(newPassword);
  await db.adminCredential.upsert({
    where: { id: 1 },
    create: { id: 1, passwordHash: hash },
    update: { passwordHash: hash },
  });
}

interface SessionPayload {
  role: "admin";
  exp: number;
}

function b64encode(s: string): string {
  return Buffer.from(s, "utf8").toString("base64url");
}
function b64decode(s: string): string {
  return Buffer.from(s, "base64url").toString("utf8");
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

/** Create a signed session token for the admin. */
export function createSessionToken(): string {
  const payload: SessionPayload = {
    role: "admin",
    exp: Date.now() + SESSION_TTL_MS,
  };
  const payloadStr = b64encode(JSON.stringify(payload));
  return `${payloadStr}.${sign(payloadStr)}`;
}

/** Verify a session token. Returns true if valid and not expired. */
export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot === -1) return false;
  const payloadStr = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payloadStr);
  // constant-time compare
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return false;
  }
  try {
    const payload = JSON.parse(b64decode(payloadStr)) as SessionPayload;
    if (payload.role !== "admin") return false;
    if (Date.now() > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_MS / 1000,
};

/** Read & verify admin session from a Next.js Request. */
export function isAdminRequest(req: Request): boolean {
  const cookieHeader = req.headers.get("cookie") || "";
  const token = parseCookie(cookieHeader, COOKIE_NAME);
  return verifySessionToken(token);
}

function parseCookie(header: string, name: string): string | undefined {
  const parts = header.split(";");
  for (const p of parts) {
    const [k, ...v] = p.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}
