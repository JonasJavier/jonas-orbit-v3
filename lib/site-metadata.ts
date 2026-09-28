/**
 * Campos de Open Graph comunes a todo el sitio.
 *
 * Next fusiona `openGraph` de forma superficial: una página que declara el suyo
 * pierde lo que puso el layout raíz (`site_name`, `locale`, `type`). Cada
 * página compone sobre esta base en vez de repetir los valores a mano.
 */
export const SITE_OPEN_GRAPH = {
  type: "website",
  siteName: "Jonás Orbit",
  locale: "es_DO",
} as const;

/**
 * Tarjeta por defecto (`app/opengraph-image.tsx`) para las páginas que no
 * tienen imagen propia. Sin ella, `/es` se compartía sin vista previa.
 */
export const DEFAULT_OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Jonás Javier Encarnación — Desarrollador full-stack y creador visual",
};

/** La tarjeta JPEG de un caso, derivada de su captura destacada por `tools/prepare-projects.mjs`. */
export function projectOgImagePath(featuredSrc: string): string {
  return featuredSrc.replace(/\.png$/, "-og.jpg");
}
