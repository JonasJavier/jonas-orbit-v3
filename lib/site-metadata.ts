import type { Locale } from "@/content/site.data";
import { OG_LOCALE } from "./i18n";

/**
 * Campos de Open Graph comunes a todo el sitio.
 *
 * Next fusiona `openGraph` de forma superficial: una página que declara el suyo
 * pierde lo que puso el layout raíz (`site_name`, `locale`, `type`). Cada
 * página compone sobre esta base en vez de repetir los valores a mano.
 */
export function siteOpenGraph(locale: Locale) {
  return {
    type: "website",
    siteName: "Jonás Orbit",
    locale: OG_LOCALE[locale],
    alternateLocale: Object.entries(OG_LOCALE)
      .filter(([other]) => other !== locale)
      .map(([, tag]) => tag),
  } as const;
}

const DEFAULT_OG_ALT: Record<Locale, string> = {
  es: "Jonás Javier Encarnación — Desarrollador full-stack y diseñador UX/UI",
  en: "Jonás Javier Encarnación — Full-stack developer and UX/UI designer",
};

/**
 * Tarjeta por defecto (`app/[locale]/opengraph-image.tsx`) para las páginas que
 * no tienen imagen propia. Sin ella, la portada se compartía sin vista previa.
 */
export function defaultOgImage(locale: Locale) {
  return {
    url: `/${locale}/opengraph-image`,
    width: 1200,
    height: 630,
    alt: DEFAULT_OG_ALT[locale],
  };
}

/** La tarjeta JPEG de un caso, derivada de su captura destacada por `tools/prepare-projects.mjs`. */
export function projectOgImagePath(featuredSrc: string): string {
  return featuredSrc.replace(/\.png$/, "-og.jpg");
}
