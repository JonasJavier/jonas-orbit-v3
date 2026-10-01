import { articleProse } from "@velite";
import { ARTICLE_IDS, articlesData, type ArticleId } from "@/content/articles.data";
import type { Locale } from "@/content/site.data";

type ArticleProse = (typeof articleProse)[number];

export type Article = (typeof articlesData)[ArticleId] & { id: ArticleId; prose: ArticleProse };

/** Una nota de taller en un idioma: su estructura más su prosa. */
export function getArticle(id: ArticleId, locale: Locale): Article {
  const prose = articleProse.find((entry) => entry.id === id && entry.locale === locale);
  // Velite ya exige una prosa por nota e idioma publicado: esto no debería pasar.
  if (!prose) throw new Error(`Falta la nota «${id}» en «${locale}».`);
  return { ...articlesData[id], id, prose };
}

export function getArticles(locale: Locale): Article[] {
  return ARTICLE_IDS.map((id) => getArticle(id, locale));
}

export function getArticleBySlug(slug: string, locale: Locale): Article | undefined {
  return getArticles(locale).find((article) => article.prose.slug === slug);
}
