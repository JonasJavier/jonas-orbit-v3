import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogPage, blogMetadata } from "@/components/blog-page";
import { PUBLISHED_LOCALES, isPublishedLocale } from "@/content/site.data";

/** `/es/blog` y `/en/blog`: el segmento es el mismo en los dos idiomas (`PATH_SEGMENTS.blog`). */
export const dynamicParams = false;

export function generateStaticParams() {
  return PUBLISHED_LOCALES.map((locale) => ({ locale }));
}

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return isPublishedLocale(locale) ? blogMetadata(locale) : {};
}

export default async function BlogRoute({ params }: Props) {
  const { locale } = await params;
  if (!isPublishedLocale(locale)) notFound();
  return <BlogPage locale={locale} />;
}
