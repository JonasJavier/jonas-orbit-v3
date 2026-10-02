/* Copias WebP preparadas a mano (800 y 1600 px, 16:9): se sirven tal cual, sin
   pasar por el optimizador, como la sala de Experimentos. */
/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import type { ComponentType } from "react";
import { SITE_PROFILE, type Locale } from "@/content/site.data";
import { articleCover, articleImage, getArticles, type Article } from "@/lib/articles";
import { blogLabel } from "@/lib/footer-labels";
import { defineCopy } from "@/lib/i18n";
import { articlePath, blogPath, observatoryPath, pageAlternatesMetadata, servicesPath, worldPath } from "@/lib/page-paths";
import { siteOpenGraph } from "@/lib/site-metadata";
import { absoluteUrl } from "@/lib/site-url";
import { BLOG_COPY } from "./blog-copy";
import { BlogSky } from "./blog-sky";
import { MDXContent } from "./mdx-content";
import { SiteShell } from "./site-shell";
import { StructuredData } from "./structured-data";
import "./blog.css";
import "./article-page.css";

const COPY = defineCopy({
  es: {
    crumbs: "Ruta de la entrada",
    toc: "En esta entrada",
    open: "Abrir el simulador",
    openLead: "Lo que lees está vivo en el Observatorio: míralo a pantalla completa y en modo Estudio.",
    authorKicker: "Quién escribe",
    authorBio:
      "Desarrollador full-stack y diseñador UX/UI en Santo Domingo. Construyo aplicaciones web y móviles a medida, y de vez en cuando un agujero negro.",
    services: "Ver servicios",
    contact: "Escribirme",
    more: "Sigue leyendo",
    back: "Todas las entradas",
  },
  en: {
    crumbs: "Post breadcrumb",
    toc: "In this post",
    open: "Open the simulator",
    openLead: "What you’re reading about is live in the Observatory: see it full screen, in Study mode.",
    authorKicker: "Who writes this",
    authorBio:
      "Full-stack developer and UX/UI designer in Santo Domingo. I build custom web and mobile apps, and now and then a black hole.",
    services: "See services",
    contact: "Write to me",
    more: "Keep reading",
    back: "All posts",
  },
});

/** Las dos copias de una imagen de la entrada. Todas son 16:9. */
const articleSources = (base: string) => ({
  src: `${base}-1600.webp`,
  srcSet: `${base}-800.webp 800w, ${base}-1600.webp 1600w`,
});

/** Las figuras del cuerpo MDX (`<Figure name="…" alt="…" caption="…" />`) buscan en la carpeta de su entrada. */
function figureFor(article: Article) {
  return function Figure({ name, alt, caption }: { name: string; alt: string; caption: string }) {
    return (
      <figure className="post__figure">
        <img
          {...articleSources(articleImage(article, name))}
          sizes="(max-width: 52rem) calc(100vw - 2.5rem), 46rem"
          width={1600}
          height={900}
          alt={alt}
          loading="lazy"
          decoding="async"
        />
        <figcaption>{caption}</figcaption>
      </figure>
    );
  };
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
      authors: [SITE_PROFILE.name],
      images: [{ url: `${articleImage(article, articleCover(article))}-1600.webp`, width: 1600, height: 900, alt: prose.coverAlt }],
    },
  };
}

/**
 * Una entrada del blog (`/es/blog/como-hice-un-agujero-negro-en-webgl`).
 *
 * Primero se lee: título, entradilla y autor sobre un cielo quieto, la portada
 * debajo y no detrás. El índice lateral sale de los `##` del MDX
 * (`content/article-outline.ts`); al final, quién escribe —con la salida a
 * Servicios, que es para lo que alguien llega leyendo— y las demás entradas.
 */
export function ArticlePage({ article, locale }: { article: Article; locale: Locale }) {
  const copy = COPY[locale];
  const blog = BLOG_COPY[locale];
  const { prose } = article;
  const path = articlePath(article.id, locale);
  const listHref = blogPath(locale);
  const specimenHref = article.specimen ? observatoryPath(article.specimen, locale) : null;
  const cover = articleSources(articleImage(article, articleCover(article)));
  const others = getArticles(locale).filter((entry) => entry.id !== article.id).slice(0, 3);

  return (
    <SiteShell
      locale={locale}
      page={{ kind: "article", id: article.id }}
      mainClassName="blog-route"
      footerLabel={blogLabel(locale)}
    >
      <BlogSky />
      <StructuredData
        locale={locale}
        breadcrumb={[
          { path: listHref, name: blog.name },
          { path, name: prose.title },
        ]}
        work={{
          "@type": "BlogPosting",
          "@id": `${absoluteUrl(path)}#entrada`,
          headline: prose.seoTitle,
          name: prose.title,
          description: prose.seoDescription,
          url: absoluteUrl(path),
          mainEntityOfPage: absoluteUrl(path),
          image: absoluteUrl(cover.src),
          datePublished: article.published,
          articleSection: blog.topics[article.topic],
          timeRequired: `PT${prose.readingMinutes}M`,
          isPartOf: { "@type": "Blog", "@id": `${absoluteUrl(listHref)}#blog` },
          ...(specimenHref ? { about: { "@id": `${absoluteUrl(specimenHref)}#especimen` } } : {}),
        }}
      />

      <div className="post__progress" aria-hidden="true" />

      <article className="post">
        <header className="post__hero">
          <nav className="post__crumbs" aria-label={copy.crumbs}>
            <Link href={listHref}>{blog.name}</Link>
            <span aria-hidden="true">/</span>
            <span>{blog.topics[article.topic]}</span>
          </nav>
          <h1>{prose.title}</h1>
          <p className="post__lead">{prose.summary}</p>
          <div className="post__byline">
            <span className="blog-avatar">
              <img src="/images/sobre-mi/jonas-javier-encarnacion-320.webp" width={320} height={427} alt="" decoding="async" />
            </span>
            <p>
              <strong>{SITE_PROFILE.name}</strong>
              <span>
                <time dateTime={article.published}>{blog.date(article.published)}</time>
                <span aria-hidden="true"> · </span>
                {blog.minutes(prose.readingMinutes)}
              </span>
            </p>
          </div>
        </header>

        <figure className="post__cover">
          <img
            {...cover}
            sizes="(max-width: 76rem) calc(100vw - 2.5rem), 72rem"
            width={1600}
            height={900}
            alt={prose.coverAlt}
            fetchPriority="high"
            decoding="async"
          />
        </figure>

        <div className="post__layout">
          <aside className="post__aside">
            {prose.headings.length > 1 ? (
              <nav className="post__toc" aria-label={copy.toc}>
                <p className="blog-label">{copy.toc}</p>
                <ol>
                  {prose.headings.map((heading) => (
                    <li key={heading.id}>
                      <a href={`#${heading.id}`}>{heading.title}</a>
                    </li>
                  ))}
                </ol>
              </nav>
            ) : null}
            {specimenHref ? (
              <Link className="post__live" href={specimenHref}>
                <span className="blog-label">{copy.open}</span>
                <span>{copy.openLead}</span>
                <span className="post__live-arrow" aria-hidden="true">→</span>
              </Link>
            ) : null}
          </aside>

          <div className="post__body">
            <MDXContent code={prose.body} components={{ Figure: figureFor(article) as ComponentType }} />
          </div>
        </div>

        <footer className="post__end">
          <section className="post__author" aria-label={copy.authorKicker}>
            <span className="blog-avatar blog-avatar--large">
              <img src="/images/sobre-mi/jonas-javier-encarnacion-320.webp" width={320} height={427} alt="" loading="lazy" decoding="async" />
            </span>
            <div>
              <p className="blog-label">{copy.authorKicker}</p>
              <p className="post__author-name">
                <Link href={worldPath("gargantua", locale)}>{SITE_PROFILE.name}</Link>
              </p>
              <p>{copy.authorBio}</p>
              <div className="post__author-actions">
                <Link className="blog-button" href={servicesPath(locale)}>
                  {copy.services} <span aria-hidden="true">→</span>
                </Link>
                <Link className="blog-button blog-button--ghost" href={worldPath("ranger", locale)}>
                  {copy.contact}
                </Link>
              </div>
            </div>
          </section>

          {others.length > 0 ? (
            <section className="post__more" aria-labelledby="post-more-title">
              <h2 className="blog-label" id="post-more-title">{copy.more}</h2>
              <ul className="blog-grid">
                {others.map((entry) => (
                  <li key={entry.id}>
                    <ArticleCard article={entry} locale={locale} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <Link className="post__back" href={listHref}>
            <span aria-hidden="true">←</span> {copy.back}
          </Link>
        </footer>
      </article>
    </SiteShell>
  );
}

/** La tarjeta de una entrada en el índice y en «Sigue leyendo». */
export function ArticleCard({
  article,
  locale,
  featured = false,
}: {
  article: Article;
  locale: Locale;
  featured?: boolean;
}) {
  const blog = BLOG_COPY[locale];
  const { prose } = article;
  return (
    <article className={featured ? "blog-card blog-card--featured" : "blog-card"}>
      <img
        {...articleSources(articleImage(article, articleCover(article)))}
        sizes={featured ? "(max-width: 60rem) calc(100vw - 2.5rem), 44rem" : "(max-width: 40rem) calc(100vw - 2.5rem), 24rem"}
        width={1600}
        height={900}
        alt=""
        loading={featured ? "eager" : "lazy"}
        decoding="async"
      />
      <div className="blog-card__text">
        <p className="blog-card__meta">
          <span>{blog.topics[article.topic]}</span>
          <span aria-hidden="true">·</span>
          <span>{blog.minutes(prose.readingMinutes)}</span>
        </p>
        {/* El enlace cubre la tarjeta entera (`::after`), pero su nombre es sólo el título. */}
        <h3>
          <Link href={articlePath(article.id, locale)}>{prose.title}</Link>
        </h3>
        <p className="blog-card__summary">{prose.summary}</p>
        <time className="blog-card__date" dateTime={article.published}>
          {blog.date(article.published)}
        </time>
      </div>
    </article>
  );
}
