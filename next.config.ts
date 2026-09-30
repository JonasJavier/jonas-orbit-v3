import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { LANGUAGE_COOKIE } from "./lib/language-cookie";

const isDev = process.env.NODE_ENV === "development";

/**
 * Dominios antiguos que siguen apuntando al servicio de Railway. Redirigen
 * de forma permanente al origen canónico (`NEXT_PUBLIC_SITE_URL`) para que
 * enlaces viejos sigan vivos sin duplicar contenido.
 */
const LEGACY_HOSTS = ["orbit.jonasjavier.dev"];
const CANONICAL_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(
  /\/+$/,
  "",
);

/**
 * Content-Security-Policy sin nonces: todas las rutas se prerenderizan, y un
 * nonce obligaría a renderizarlas en cada petición. `'unsafe-inline'` cubre el
 * arranque en línea de Next y los `style=""` del marcado; el único origen
 * externo es Turnstile, que el formulario de contacto carga bajo demanda.
 * El resto —imágenes, audio, `/api/contact`— es del propio sitio.
 */
const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${TURNSTILE_ORIGIN}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  `connect-src 'self' ${TURNSTILE_ORIGIN}`,
  `frame-src ${TURNSTILE_ORIGIN}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  // Sin `includeSubDomains`: otros proyectos viven en subdominios propios.
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Acelerómetro y giroscopio quedan permitidos: alimentan el paralaje.
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
];

/*
  Next sirve `public/` con `max-age=0`: en cada visita el navegador volvía a
  preguntar por cada foto, y en el teléfono cada pregunta es un viaje de
  ~200 ms (medido 2026-09-29). Los nombres no llevan hash —una foto
  recomprimida conserva el suyo—, así que no se marcan `immutable`: valen un
  día y, pasado, se sirven mientras se revalidan en segundo plano.
*/
const PUBLIC_ASSET_DIRS = ["art", "audio", "brand", "cv", "education", "images", "media"];
const PUBLIC_ASSET_CACHE = [
  { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // El layout raíz vive bajo `app/[locale]`: una URL fuera de los idiomas
  // publicados no tiene layout que componga su 404 (`app/global-not-found.tsx`).
  experimental: { globalNotFound: true },
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      ...PUBLIC_ASSET_DIRS.map((dir) => ({
        source: `/${dir}/:path*`,
        headers: PUBLIC_ASSET_CACHE,
      })),
    ];
  },
  // Sin proxy/middleware: un redirect estático cubre todo el tráfico. `/` va
  // al inglés, el idioma por defecto (decisión de Jonás, 2026-09-29), y no
  // se negocia con `Accept-Language`: la versión en español está a un clic en
  // la cabecera, y una portada que cambia según quién pregunte es una portada
  // que Google no puede cachear ni enlazar de forma estable.
  async redirects() {
    const canonicalHost = CANONICAL_ORIGIN
      ? new URL(CANONICAL_ORIGIN).host
      : undefined;
    const legacy = canonicalHost
      ? LEGACY_HOSTS.filter((host) => host !== canonicalHost).map((host) => ({
          source: "/:path*",
          has: [{ type: "host" as const, value: host }],
          destination: `${CANONICAL_ORIGIN}/:path*`,
          permanent: true,
        }))
      : [];
    return [
      ...legacy,
      // Quien eligió español en el selector vuelve a entrar en español.
      {
        source: "/",
        has: [{ type: "cookie" as const, key: LANGUAGE_COOKIE, value: "es" }],
        destination: "/es",
        permanent: false,
      },
      {
        source: "/",
        destination: "/en",
        permanent: false,
      },
    ];
  },
};

export default async function config(phase: string): Promise<NextConfig> {
  // Expone bindings, request.cf y ctx durante `next dev` con la misma forma que
  // tendrá el Worker, levantando Miniflare (workerd) en segundo plano.
  //
  //  1. Sólo en `next dev`. El guard interno del adaptador es
  //     `!!globalThis.AsyncLocalStorage`, que Next también define en
  //     `next build`: cada build arrancaba un workerd que nadie consumía, y si
  //     fallaba se llevaba el build por delante. La importación dinámica,
  //     además, deja `next start` en producción sin cargar el adaptador.
  //  2. `CF_DEV_CONTEXT=off`. workerd no arranca en todas las máquinas Windows
  //     (con VBS/HVCI activo aborta con access violation antes de servir nada).
  //     `readContactBindings()` ya cae a `process.env` sin contexto de
  //     Cloudflare, y el runtime real se verifica en CI.
  if (
    phase === PHASE_DEVELOPMENT_SERVER &&
    process.env.CF_DEV_CONTEXT !== "off"
  ) {
    const { initOpenNextCloudflareForDev } = await import(
      "@opennextjs/cloudflare"
    );
    initOpenNextCloudflareForDev();
  }
  return nextConfig;
}
