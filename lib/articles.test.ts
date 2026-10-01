import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { ARTICLE_IDS } from "@/content/articles.data";
import { PROJECT_IDS } from "@/content/projects.data";
import { PUBLISHED_LOCALES } from "@/content/site.data";
import { WORLD_IDS } from "@/content/worlds.data";
import { getArticle, getArticleBySlug } from "./articles";
import { OBSERVATORY_IDS } from "./observatory-slugs";
import { articlePath, pageAlternates, servicesPath, type PageRef } from "./page-paths";

const publicFile = (src: string) => existsSync(join(process.cwd(), "public", src));

/** Todas las rutas del sitio que un enlace interno puede pedir. */
const KNOWN_PATHS = new Set(
  (
    [
      { kind: "home" },
      { kind: "services" },
      ...WORLD_IDS.map((id) => ({ kind: "world", id }) as const),
      ...PROJECT_IDS.map((id) => ({ kind: "project", id }) as const),
      ...OBSERVATORY_IDS.map((id) => ({ kind: "observatory", id }) as const),
      ...ARTICLE_IDS.map((id) => ({ kind: "article", id }) as const),
    ] satisfies PageRef[]
  ).flatMap((page) => Object.values(pageAlternates(page))),
);

describe("notas de taller", () => {
  it("cada nota existe en cada idioma, cuelga de Experimentos y se encuentra por su slug", () => {
    for (const id of ARTICLE_IDS) {
      const slugs = PUBLISHED_LOCALES.map((locale) => {
        const article = getArticle(id, locale);
        expect(articlePath(id, locale)).toMatch(locale === "es" ? /^\/es\/experimentos\// : /^\/en\/experiments\//);
        expect(getArticleBySlug(article.prose.slug, locale)?.id).toBe(id);
        return article.prose.slug;
      });
      // Un slug por idioma: la versión inglesa no reutiliza la española.
      expect(new Set(slugs).size).toBe(PUBLISHED_LOCALES.length);
    }
  });

  it("la portada y cada <Figure> del cuerpo tienen sus dos copias WebP publicadas", () => {
    for (const id of ARTICLE_IDS) {
      for (const locale of PUBLISHED_LOCALES) {
        const article = getArticle(id, locale);
        const figures = [...article.prose.body.matchAll(/name:\s*"([a-z0-9-]+)"/g)].map(
          ([, name]) => `/images/articulos/agujero-negro/${name}`,
        );
        expect(figures.length, `${id}/${locale}`).toBeGreaterThan(0);
        for (const base of [article.cover, ...figures]) {
          expect(publicFile(`${base}-800.webp`), `${base}-800`).toBe(true);
          expect(publicFile(`${base}-1600.webp`), `${base}-1600`).toBe(true);
        }
      }
    }
  });

  it("los enlaces internos del cuerpo llevan a páginas que existen, en el idioma de la nota", () => {
    for (const id of ARTICLE_IDS) {
      for (const locale of PUBLISHED_LOCALES) {
        const links = [...getArticle(id, locale).prose.body.matchAll(/href:\s*"(\/[^"]*)"/g)].map(([, href]) => href);
        expect(links.length, `${id}/${locale}`).toBeGreaterThan(0);
        for (const href of links) {
          expect(KNOWN_PATHS.has(href), href).toBe(true);
          expect(href.startsWith(`/${locale}/`), href).toBe(true);
        }
      }
    }
  });
});

describe("sitemap", () => {
  it("publica los servicios y cada nota en los dos idiomas", () => {
    const urls = sitemap().map((entry) => new URL(entry.url).pathname);
    for (const locale of PUBLISHED_LOCALES) {
      expect(urls).toContain(servicesPath(locale));
      for (const id of ARTICLE_IDS) expect(urls).toContain(articlePath(id, locale));
    }
  });
});
