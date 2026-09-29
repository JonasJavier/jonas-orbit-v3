import type { Metadata } from "next";
import { DEFAULT_LOCALE, PUBLISHED_LOCALES, type Locale } from "@/content/site.data";
import type { ProjectId } from "@/content/projects.data";
import type { WorldId } from "@/content/worlds.data";
import { observatorySlug } from "./observatory-slugs";
import { PATH_SEGMENTS } from "./path-segments";
import { getProject } from "./projects";
import { getWorld, getWorldPath } from "./worlds";

/**
 * Todas las URL del sitio, en los dos idiomas, salen de aquí.
 *
 * Una página se nombra por lo que ES —un mundo, un caso, un espécimen— y no por
 * su ruta: `/es/sobre-mi` y `/en/about` son la misma página, y el selector de
 * idioma, el `hreflang` y el sitemap tienen que saberlo sin adivinarlo a
 * partir de la URL. Los slugs de los mundos siguen en el frontmatter de cada
 * MDX (regla 4); los segmentos que no son de ningún mundo, en
 * `path-segments.ts`.
 */

export type PageRef =
  | { kind: "home" }
  | { kind: "world"; id: WorldId }
  | { kind: "project"; id: ProjectId }
  | { kind: "thanks" }
  | { kind: "observatory"; id: WorldId }
  | { kind: "privacy" };

export function homePath(locale: Locale): string {
  return `/${locale}`;
}

export function worldPath(id: WorldId, locale: Locale): string {
  return getWorldPath(getWorld(id, locale), locale);
}

export function projectPath(id: ProjectId, locale: Locale): string {
  return `${worldPath("endurance", locale)}/${getProject(id, locale).prose.slug}`;
}

export function thanksPath(locale: Locale): string {
  return `${worldPath("ranger", locale)}/${PATH_SEGMENTS.thanks[locale]}`;
}

export function observatoryPath(id: WorldId, locale: Locale): string {
  return `${worldPath("tesseract", locale)}/${PATH_SEGMENTS.observatory[locale]}/${observatorySlug(id, locale)}`;
}

export function privacyPath(locale: Locale): string {
  return `/${locale}/${PATH_SEGMENTS.privacy[locale]}`;
}

function pagePath(page: PageRef, locale: Locale): string {
  switch (page.kind) {
    case "home":
      return homePath(locale);
    case "world":
      return worldPath(page.id, locale);
    case "project":
      return projectPath(page.id, locale);
    case "thanks":
      return thanksPath(locale);
    case "observatory":
      return observatoryPath(page.id, locale);
    case "privacy":
      return privacyPath(locale);
  }
}

/** La misma página en cada idioma publicado, en el orden del selector. */
export function pageAlternates(page: PageRef): Record<Locale, string> {
  return Object.fromEntries(
    PUBLISHED_LOCALES.map((locale) => [locale, pagePath(page, locale)]),
  ) as Record<Locale, string>;
}

/**
 * `alternates` de la metadata de una página: su canónica y el `hreflang` de
 * cada idioma, con `x-default` en el idioma por defecto. Sin esto Google trata
 * `/es/sobre-mi` y `/en/about` como dos páginas que compiten entre sí en vez de
 * una sola página en dos idiomas.
 */
export function pageAlternatesMetadata(page: PageRef, locale: Locale): NonNullable<Metadata["alternates"]> {
  const alternates = pageAlternates(page);
  return {
    canonical: alternates[locale],
    languages: { ...alternates, "x-default": alternates[DEFAULT_LOCALE] },
  };
}
