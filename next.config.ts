import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Expone bindings, request.cf y ctx durante `next dev` con la misma forma que
// tendrá el Worker desplegado. La función solo inicializa el proxy cuando aplica.
initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  // F1A/F1B: sin proxy/middleware — redirect estático cubre todo el tráfico.
  // La detección Accept-Language llega en F2A (proxy.ts) junto con /en.
  async redirects() {
    return [
      {
        source: "/",
        destination: "/es",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
