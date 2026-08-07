import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Expone bindings, request.cf y ctx durante `next dev` con la misma forma que
// tendrá el Worker desplegado, levantando Miniflare (workerd) en segundo plano.
//
// Va envuelta en dos guardas, ambas por defectos reales observados:
//
//  1. `NODE_ENV`. El guard interno del adaptador es `!!globalThis.AsyncLocalStorage`,
//     que Next también define durante `next build`. Sin esta condición cada build
//     arranca un workerd que nadie consume — y si ese workerd falla, se lleva el
//     build por delante con un `unhandledRejection`.
//  2. `CF_DEV_CONTEXT=off`. workerd no arranca en todas las máquinas Windows
//     (con VBS/HVCI activo aborta con access violation antes de servir nada).
//     La salida no degrada el desarrollo: `readContactBindings()` ya cae a
//     `process.env` cuando el contexto de Cloudflare no existe, y el runtime
//     real se verifica igualmente en CI y en el deploy.
if (
  process.env.NODE_ENV === "development" &&
  process.env.CF_DEV_CONTEXT !== "off"
) {
  initOpenNextCloudflareForDev();
}

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
