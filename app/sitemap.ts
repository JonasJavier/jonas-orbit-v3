import type { MetadataRoute } from "next";
import { DEFAULT_LOCALE, PUBLISHED_LOCALES, SITE_PROFILE, type Locale } from "@/content/site.data";
import { ARTICLE_IDS } from "@/content/articles.data";
import { WORLD_IDS } from "@/content/worlds.data";
import { articleCover, articleImage, getArticle } from "@/lib/articles";
import { screenSources } from "@/lib/engineering-table";
import { specimenImage } from "@/lib/observatory-images";
import { OBSERVATORY_IDS } from "@/lib/observatory-slugs";
import { pageAlternates, type PageRef } from "@/lib/page-paths";
import { getF1AProjects, getProject } from "@/lib/projects";
import { projectOgImagePath } from "@/lib/site-metadata";
import { absoluteUrl } from "@/lib/site-url";
import { getWorld } from "@/lib/worlds";

/**
 * Imágenes que cada página quiere en Google Imágenes (sitemap de imágenes).
 * Jonás también es fotógrafo y diseñador: la galería de Creatividad y su
 * retrato son contenido que se busca por imagen. De «Sobre mí» sólo va el
 * retrato: las fotos de su gente se ven en la página, no se empujan al índice.
 */
function pageImages(page: PageRef, locale: Locale): string[] | undefined {
  if (page.kind === "world") {
    if (page.id === "gargantua") return [absoluteUrl(SITE_PROFILE.portrait)];
    const artworks = getWorld(page.id, locale).prose.creativity?.artworks ?? [];
    return artworks.length
      ? artworks.map((art) => absoluteUrl(`/art/edmunds/${art.id}-1920.webp`))
      : undefined;
  }
  if (page.kind === "project") {
    const image = getProject(page.id, locale).prose.featuredImage;
    return [
      absoluteUrl(projectOgImagePath(image.src)),
      absoluteUrl(screenSources(image.src, image.frame ?? "desktop").src),
    ];
  }
  if (page.kind === "article") {
    const article = getArticle(page.id, locale);
    return [absoluteUrl(`${articleImage(article, articleCover(article))}-1600.webp`)];
  }
  // La captura real de cada espécimen: «Gargantúa 3D» o «nave Endurance» en
  // Google Imágenes llevan a la página donde se mueven.
  if (page.kind === "observatory") return [absoluteUrl(specimenImage(page.id, "1600"))];
  return undefined;
}

/**
 * Cada página indexable, con su prioridad. `/…/contacto/gracias` queda
 * deliberadamente FUERA: el plan la marca `noindex` y fuera del sitemap porque
 * es una confirmación privada, no una página de aterrizaje.
 *
 * Los especímenes entran porque el §1.3 vende «mira la Endurance» como enlace
 * compartible dentro de una candidatura. Salen de la misma tabla que la
 * recepción y el raíl, así que montar uno nuevo lo añade aquí solo.
 */
const PAGES: readonly { page: PageRef; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }[] = [
  { page: { kind: "home" }, priority: 1, changeFrequency: "weekly" },
  // Por debajo del home y por encima de los casos: son las páginas de
  // aterrizaje temáticas, la puerta de entrada desde una búsqueda.
  ...WORLD_IDS.map((id) => ({ page: { kind: "world", id } as const, priority: 0.9, changeFrequency: "monthly" as const })),
  // Los casos son la prueba profesional; un espécimen es una pieza de trabajo
  // con URL propia, a la misma altura.
  ...getF1AProjects(DEFAULT_LOCALE).map((project) => ({
    page: { kind: "project", id: project.id } as const,
    priority: 0.8,
    changeFrequency: "monthly" as const,
  })),
  // La página de quien busca contratar: a la altura de los mundos, que es
  // donde compite («desarrollador web freelance Santo Domingo»).
  { page: { kind: "services" }, priority: 0.9, changeFrequency: "monthly" },
  // El blog y sus entradas: el texto que el buscador puede leer sobre el canvas.
  { page: { kind: "blog" }, priority: 0.8, changeFrequency: "weekly" },
  ...ARTICLE_IDS.map((id) => ({ page: { kind: "article", id } as const, priority: 0.8, changeFrequency: "monthly" as const })),
  ...OBSERVATORY_IDS.map((id) => ({ page: { kind: "observatory", id } as const, priority: 0.8, changeFrequency: "monthly" as const })),
  { page: { kind: "privacy" }, priority: 0.3, changeFrequency: "yearly" },
];

/**
 * Sitemap: cada página en cada idioma publicado, y cada entrada declara sus
 * hermanas (`xhtml:link rel="alternate" hreflang`). Es la misma relación que
 * el `hreflang` del `<head>`, dicha también aquí porque el buscador lee el
 * sitemap antes de rastrear.
 *
 * Sin `lastModified`: sellar cada URL con la fecha del build afirmaría un
 * cambio que no ocurrió, y los buscadores descartan un `lastmod` poco fiable.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.flatMap(({ page, priority, changeFrequency }) => {
    const alternates = pageAlternates(page);
    const languages = Object.fromEntries(
      Object.entries(alternates).map(([locale, path]) => [locale, absoluteUrl(path)]),
    );
    return PUBLISHED_LOCALES.map((locale) => {
      const images = pageImages(page, locale);
      return {
        url: absoluteUrl(alternates[locale]),
        changeFrequency,
        priority,
        alternates: { languages },
        ...(images ? { images } : {}),
      };
    });
  });
}
