import type { Locale } from "@/content/site.data";
import { OG_LOCALE } from "./i18n";

/**
 * Campos de Open Graph comunes a todo el sitio.
 *
 * Next fusiona `openGraph` de forma superficial: una página que declara el suyo
 * pierde lo que puso el layout raíz (`site_name`, `locale`, `type`). Cada
 * página compone sobre esta base en vez de repetir los valores a mano.
 *
 * `siteName` es la persona, no la marca: es el rótulo que Discord, LinkedIn o
 * WhatsApp ponen encima de la tarjeta («Jonás Orbit» sigue en la imagen, en
 * `applicationName` y en el WebSite de JSON-LD).
 */
export function siteOpenGraph(locale: Locale) {
  return {
    type: "website",
    siteName: "Jonás Javier",
    locale: OG_LOCALE[locale],
    alternateLocale: Object.entries(OG_LOCALE)
      .filter(([other]) => other !== locale)
      .map(([, tag]) => tag),
  } as const;
}

const DEFAULT_OG_ALT: Record<Locale, string> = {
  es: "Tarjeta de Jonás Javier, Full-Stack Developer: «Software real. Sistemas que llegan a producción.» Django, React y TypeScript junto a Gargantúa sobre un cielo oscuro.",
  en: "Card for Jonás Javier, Full-Stack Developer: “Real software. Systems that reach production.” Django, React and TypeScript beside Gargantua on a dark sky.",
};

/**
 * Versión de la tarjeta. Discord, LinkedIn y Facebook guardan la imagen por
 * URL; al cambiar el diseño de `opengraph-image.tsx` se sube este número para
 * que la pidan de nuevo. La ruta ignora el parámetro: sigue siendo estática.
 */
const DEFAULT_OG_VERSION = 2;

/**
 * Tarjeta por defecto (`app/[locale]/opengraph-image.tsx`) para las páginas que
 * no tienen imagen propia. Sin ella, la portada se compartía sin vista previa.
 */
export function defaultOgImage(locale: Locale) {
  return {
    url: `/${locale}/opengraph-image?v=${DEFAULT_OG_VERSION}`,
    width: 1200,
    height: 630,
    type: "image/png",
    alt: DEFAULT_OG_ALT[locale],
  };
}

/** La tarjeta JPEG de un caso, derivada de su captura destacada por `tools/prepare-projects.mjs`. */
export function projectOgImagePath(featuredSrc: string): string {
  return featuredSrc.replace(/\.png$/, "-og.jpg");
}
