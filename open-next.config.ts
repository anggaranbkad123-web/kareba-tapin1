// OpenNext config for deploying Next.js to Cloudflare Pages.
// Docs: https://opennext.js.org/cloudflare
import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";

export default defineCloudflareConfig({
  // The D1 database binding name must match wrangler.jsonc > d1_databases > binding
  // incremental cache is not available on Cloudflare free tier; disable to avoid errors
  incrementalCache: false,
});
