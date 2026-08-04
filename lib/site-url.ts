/**
 * Origen canónico del sitio.
 *
 * `NEXT_PUBLIC_SITE_URL` se fija en el entorno de build. Mientras el dominio
 * definitivo siga sin decidirse (WP6, decisión de Jonás), el fallback de
 * desarrollo mantiene `next dev`, los tests y Playwright funcionando.
 *
 * Reglas de resolución:
 *  - sin definir  → fallback de desarrollo (no rompe dev ni CI)
 *  - definido pero inválido → ERROR de build, porque un origen roto genera un
 *    sitemap, un canonical y unas OG rotas sin que nadie lo note
 */

const FALLBACK_SITE_URL = "http://localhost:3000";

export function resolveSiteUrl(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) return FALLBACK_SITE_URL;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL no es una URL absoluta válida: ${JSON.stringify(value)}`,
    );
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL debe usar http o https, no ${parsed.protocol}`,
    );
  }

  // Sin barra final: todas las composiciones de abajo añaden la suya.
  return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
}

export const SITE_URL = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

/** Compone una URL absoluta a partir de una ruta interna (`/es/privacidad`). */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
