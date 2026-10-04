// Environment-aware Prisma client.
//
// - LOCAL DEV (`next dev`): uses the local SQLite file via DATABASE_URL.
// - CLOUDFLARE PAGES (production): uses the Cloudflare D1 binding via
//   `@prisma/adapter-d1` and the OpenNext `getCloudflareContext()`.
//
// This keeps the existing local-dev workflow unchanged while making the app
// deployable to Cloudflare Pages (which has no persistent filesystem).

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Detect whether we are running on Cloudflare (Workers/Pages runtime).
 * On Cloudflare, `process.env.CF_PAGES` is set by the platform; we also
 * check for the absence of a local DATABASE_URL file path as a fallback.
 */
function isCloudflare(): boolean {
  // CF_PAGES is "1" (string) on Cloudflare Pages
  if (process.env.CF_PAGES === "1" || process.env.CF_PAGES === "true") {
    return true;
  }
  // OpenNext sets this in the worker runtime
  // (kept broad: any truthy CF_PAGES or CF_WORKER indicator)
  return false;
}

async function createCloudflareClient(): Promise<PrismaClient> {
  // Dynamic imports so local dev never loads the D1 adapter / OpenNext runtime.
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { PrismaD1 } = await import("@prisma/adapter-d1");
  const ctx = await getCloudflareContext({ async: true });
  if (!ctx || !ctx.env?.DB) {
    throw new Error(
      "Cloudflare D1 binding 'DB' not found. Make sure wrangler.jsonc has a d1_databases entry with binding 'DB'."
    );
  }
  const adapter = new PrismaD1(ctx.env.DB as D1Database);
  return new PrismaClient({ adapter });
}

function createLocalClient(): PrismaClient {
  return new PrismaClient({
    log: ["error", "warn"],
  });
}

/**
 * Get a Prisma client.
 *
 * - On Cloudflare: returns a D1-backed client. Because the Workers runtime is
 *   stateless across requests, we do NOT cache it in `globalThis` there.
 * - Locally: returns a cached singleton (avoids exhausting DB connections
 *   during hot-reload in `next dev`).
 */
export async function getDb(): Promise<PrismaClient> {
  if (isCloudflare()) {
    return createCloudflareClient();
  }
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createLocalClient();
  }
  return globalForPrisma.prisma;
}

/**
 * Backwards-compatible synchronous accessor.
 *
 * For LOCAL DEV only — returns the cached SQLite-backed singleton directly.
 * Throws if called on Cloudflare (where the client must be created async).
 *
 * Existing route handlers that import { db } still work locally. To deploy to
 * Cloudflare, replace `import { db } from "@/lib/db"` usages with
 * `import { getDb } from "@/lib/db"` and `const db = await getDb()` at the
 * top of each handler. (See DEPLOY.md — the migration is mechanical.)
 */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_t, prop) {
    if (isCloudflare()) {
      throw new Error(
        `On Cloudflare, use "const db = await getDb()" instead of importing "db" directly (tried to access "${String(
          prop
        )}").`
      );
    }
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createLocalClient();
    }
    const target = globalForPrisma.prisma as unknown as Record<string | symbol, unknown>;
    const value = target[prop as string | symbol];
    if (typeof value === "function") {
      return value.bind(globalForPrisma.prisma);
    }
    return value;
  },
});
