import type { NextConfig } from "next";

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
