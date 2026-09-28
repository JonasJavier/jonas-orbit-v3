import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// All published pages are prerendered. The default dummy cache loses those
// entries in Workers (dynamicParams=false then returns 404). Serve the build's
// read-only cache through ASSETS; no R2, revalidation or runtime MDX evaluation.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
