/* Copias WebP preparadas a mano (800 y 1600 px, 16:9): se sirven tal cual, sin
   pasar por el optimizador, como la sala de Experimentos. */
/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import type { ComponentType } from "react";
import type { Locale } from "@/content/site.data";
import type { Article } from "@/lib/articles";
import { articleLabel } from "@/lib/footer-labels";
import { defineCopy } from "@/lib/i18n";
import { articlePath, observatoryPath, pageAlternatesMetadata, worldPath } from "@/lib/page-paths";
import { siteOpenGraph } from "@/lib/site-metadata";
import { absoluteUrl } from "@/lib/site-url";
import { getWorld } from "@/lib/worlds";
import { MDXContent } from "./mdx-content";
import { SiteShell } from "./site-shell";
import { StructuredData } from "./structured-data";
import "./article-page.css";

const COPY = defineCopy({
  es: {
    kicker: "TESSERACTO / NOTAS DE TALLER",
    open: "Abrir el simulador",
    back: "Volver a Experimentos",
    date: (iso: string) =>
      new Intl.DateTimeFormat("es-DO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
        new Date(iso),
      ),
  },
  en: {
    kicker: "TESSERACT / WORKSHOP NOTES",
    open: "Open the simulator",
    back: "Back to Experiments",
    date: (iso: string) =>
      new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
        new Date(iso),
      ),
  },
});

/** Las dos copias de una imagen del artículo. Todas son 16:9. */
const sources = (base: string) => ({
  src: `${base}-1600.webp`,
  srcSet: `${base}-800.webp 800w, ${base}-1600.webp 1600w`,
});

const FIGURE_DIR = "/images/articulos/agujero-negro";

/** Una figura del cuerpo MDX: `<Figure name="gargantua-lente" alt="…" caption="…" />`. */
function Figure({ name, alt, caption }: { name: string; alt: string; caption: string }) {
  return (
    <figure className="article-page__figure">
      <img
        {...sources(`${FIGURE_DIR}/${name}`)}
        sizes="(max-width: 52rem) calc(100vw - 2.5rem), 48rem"
        width={1600}
        height={900}
        alt={alt}
        loading="lazy"
        decoding="async"
      />
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

export function articleMetadata(article: Article, locale: Locale): Metadata {
  const { prose } = article;
  return {
    title: prose.seoTitle,
    description: prose.seoDescription,
    alternates: pageAlternatesMetadata({ kind: "article", id: article.id }, locale),
    openGraph: {
      ...siteOpenGraph(locale),
      type: "article",
      title: prose.seoTitle,
      description: prose.seoDescription,
      url: articlePath(article.id, locale),
      publishedTime: article.published,
      images: [{ url: `${article.cover}-1600.webp`, width: 1600, height: 900, alt: prose.coverAlt }],
    },
  };
}

/**
 * Una nota de taller (`/es/experimentos/como-hice-un-agujero-negro-en-webgl`):
 * texto largo sobre cómo se hizo una pieza del sitio. Es el texto que el
 * buscador puede leer sobre el canvas, que por sí solo no dice nada.
 */
export function ArticlePage({ article, locale }: { article: Article; locale: Locale }) {
  const copy = COPY[locale];
  const { prose } = article;
  const path = articlePath(article.id, locale);
  const experimentsHref = worldPath("tesseract", locale);
  const specimenHref = observatoryPath(article.specimen, locale);
  const cover = sources(article.cover);

  return (
    <SiteShell
      locale={locale}
      page={{ kind: "article", id: article.id }}
      activeWorldId="tesseract"
      mainClassName="article-page"
      footerLabel={articleLabel(locale)}
    >
      <StructuredData
        locale={locale}
        breadcrumb={[
          { path: experimentsHref, name: getWorld("tesseract", locale).prose.title },
          { path, name: prose.title },
        ]}
        work={{
          "@type": "TechArticle",
          "@id": `${absoluteUrl(path)}#nota`,
          headline: prose.seoTitle,
          name: prose.title,
          description: prose.seoDescription,
          url: absoluteUrl(path),
          image: absoluteUrl(cover.src),
          datePublished: article.published,
          about: { "@id": `${absoluteUrl(specimenHref)}#especimen` },
          keywords: "WebGL, Three.js, GLSL, black hole, ray tracing, Gargantua",
        }}
      />

      <header className="article-page__header">
        <p className="section-kicker">{copy.kicker}</p>
        <h1>{prose.title}</h1>
        <p className="article-page__lead">{prose.summary}</p>
        <p className="article-page__meta">
          <time dateTime={article.published}>{copy.date(article.published)}</time>
          <span aria-hidden="true">·</span>
          <Link href={specimenHref}>
            {copy.open} <span aria-hidden="true">→</span>
          </Link>
        </p>
      </header>

      <figure className="article-page__cover">
        <img
          {...cover}
          sizes="(max-width: 72rem) calc(100vw - 2.5rem), 68rem"
          width={1600}
          height={900}
          alt={prose.coverAlt}
          fetchPriority="high"
          decoding="async"
        />
      </figure>

      <div className="article-page__body">
        <MDXContent code={prose.body} components={{ Figure: Figure as ComponentType }} />
      </div>

      <nav className="article-page__links" aria-label={copy.back}>
        <Link href={specimenHref}>
          {copy.open} <span aria-hidden="true">→</span>
        </Link>
        <Link href={experimentsHref}>
          <span aria-hidden="true">←</span> {copy.back}
        </Link>
      </nav>
    </SiteShell>
  );
}
