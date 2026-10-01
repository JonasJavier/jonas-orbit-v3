import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticlePage, articleMetadata } from "@/components/article-page";
import { PUBLISHED_LOCALES, isPublishedLocale } from "@/content/site.data";
import { getArticleBySlug, getArticles } from "@/lib/articles";

/** Una entrada del blog. Cada idioma tiene su slug: `/en/blog/como-…` es un 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return PUBLISHED_LOCALES.flatMap((locale) =>
    getArticles(locale).map((article) => ({ locale, slug: article.prose.slug })),
  );
}

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isPublishedLocale(locale)) return {};
  const article = getArticleBySlug(slug, locale);
  return article ? articleMetadata(article, locale) : {};
}

export default async function ArticleRoute({ params }: Props) {
  const { locale, slug } = await params;
  if (!isPublishedLocale(locale)) notFound();
  const article = getArticleBySlug(slug, locale);
  if (!article) notFound();
  return <ArticlePage article={article} locale={locale} />;
}
