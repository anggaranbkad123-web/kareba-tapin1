import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Ensure Next.js does not bundle Node.js native modules that are not
  // available in the Cloudflare Workers runtime.
  // (opennextjs/cloudflare handles shimming for most cases via nodejs_compat.)
};

// Enable Cloudflare bindings (D1, etc.) in local `next dev` for testing the
// D1 code path locally. This is OPTIONAL — local dev falls back to the SQLite
// file when this isn't active. Wrapped in try/catch so dev still works before
// the user has created a D1 database / configured wrangler.
if (process.env.NODE_ENV === "development") {
  import("@opennextjs/cloudflare")
    .then((m) =>
      typeof m.initOpenNextCloudflareForDev === "function"
        ? m.initOpenNextCloudflareForDev()
        : undefined
    )
    .catch((e) => {
      // Silent: local SQLite dev works without the Cloudflare context proxy.
      console.warn(
        "[next.config] Cloudflare dev context not initialized (local SQLite will be used):",
        e?.message ?? e
      );
    });
}

export default nextConfig;
