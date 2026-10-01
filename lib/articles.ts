import { articleProse } from "@velite";
import { ARTICLE_IDS, articlesData, type ArticleId, type ArticleStructuralData } from "@/content/articles.data";
import type { Locale } from "@/content/site.data";

type ArticleProse = (typeof articleProse)[number];

export type Article = ArticleStructuralData & { id: ArticleId; prose: ArticleProse };

/** Una entrada del blog en un idioma: su estructura más su prosa. */
export function getArticle(id: ArticleId, locale: Locale): Article {
  const prose = articleProse.find((entry) => entry.id === id && entry.locale === locale);
  // Velite ya exige una prosa por entrada e idioma publicado: esto no debería pasar.
  if (!prose) throw new Error(`Falta la entrada «${id}» en «${locale}».`);
  return { ...articlesData[id], id, prose };
}

/** Todas las entradas de un idioma, de la más reciente a la más antigua. */
export function getArticles(locale: Locale): Article[] {
  return ARTICLE_IDS.map((id) => getArticle(id, locale)).sort((a, b) => b.published.localeCompare(a.published));
}

export function getArticleBySlug(slug: string, locale: Locale): Article | undefined {
  return getArticles(locale).find((article) => article.prose.slug === slug);
}

/** La base de una imagen de la entrada (sin `-800.webp` / `-1600.webp`). */
export function articleImage(article: Article, name: string): string {
  return `${article.images}/${name}`;
}
