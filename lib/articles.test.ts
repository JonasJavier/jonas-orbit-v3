import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { ARTICLE_IDS } from "@/content/articles.data";
import { PROJECT_IDS } from "@/content/projects.data";
import { PUBLISHED_LOCALES } from "@/content/site.data";
import { WORLD_IDS } from "@/content/worlds.data";
import { articleCover, articleImage, getArticle, getArticleBySlug, getArticles } from "./articles";
import { OBSERVATORY_IDS } from "./observatory-slugs";
import { articlePath, blogPath, pageAlternates, servicesPath, type PageRef } from "./page-paths";

const publicFile = (src: string) => existsSync(join(process.cwd(), "public", src));

/** Todas las rutas del sitio que un enlace interno puede pedir. */
const KNOWN_PATHS = new Set(
  (
    [
      { kind: "home" },
      { kind: "services" },
      { kind: "blog" },
      ...WORLD_IDS.map((id) => ({ kind: "world", id }) as const),
      ...PROJECT_IDS.map((id) => ({ kind: "project", id }) as const),
      ...OBSERVATORY_IDS.map((id) => ({ kind: "observatory", id }) as const),
      ...ARTICLE_IDS.map((id) => ({ kind: "article", id }) as const),
    ] satisfies PageRef[]
  ).flatMap((page) => Object.values(pageAlternates(page))),
);

describe("blog", () => {
  it("cada entrada existe en cada idioma, cuelga del blog y se encuentra por su slug", () => {
    for (const id of ARTICLE_IDS) {
      const slugs = PUBLISHED_LOCALES.map((locale) => {
        const article = getArticle(id, locale);
        expect(articlePath(id, locale).startsWith(`${blogPath(locale)}/`)).toBe(true);
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
        const figures = [...article.prose.body.matchAll(/name:\s*"([a-z0-9-]+)"/g)].map(([, name]) => name);
        for (const base of [articleCover(article), ...figures].map((name) => articleImage(article, name))) {
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
          expect(href === `/${locale}` || href.startsWith(`/${locale}/`), href).toBe(true);
        }
      }
    }
  });
});

describe("índice de cada entrada", () => {
  it("cada título del índice tiene su ancla en el cuerpo compilado", () => {
    for (const locale of PUBLISHED_LOCALES) {
      for (const article of getArticles(locale)) {
        expect(article.prose.headings.length, article.id).toBeGreaterThan(1);
        for (const heading of article.prose.headings) {
          expect(article.prose.body, `${article.id}#${heading.id}`).toMatch(new RegExp(`id:\\s*"${heading.id}"`));
        }
      }
    }
  });

  it("el blog va de la más reciente a la más antigua", () => {
    const dates = getArticles("es").map((article) => article.published);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});

describe("sitemap", () => {
  it("publica los servicios, el blog y cada entrada en los dos idiomas", () => {
    const urls = sitemap().map((entry) => new URL(entry.url).pathname);
    for (const locale of PUBLISHED_LOCALES) {
      expect(urls).toContain(servicesPath(locale));
      expect(urls).toContain(blogPath(locale));
      for (const id of ARTICLE_IDS) expect(urls).toContain(articlePath(id, locale));
    }
  });
});
