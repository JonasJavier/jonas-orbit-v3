/* Copias WebP preparadas a mano (800 y 1600 px, 16:9): se sirven tal cual, sin
   pasar por el optimizador, como la sala de Experimentos. */
/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { IntentLink as Link } from "@/components/intent-link";
import type { ComponentType } from "react";
import { SITE_PROFILE, type Locale } from "@/content/site.data";
import type { WorldId } from "@/content/worlds.data";
import { articleCover, articleImage, getArticles, type Article } from "@/lib/articles";
import { blogLabel } from "@/lib/footer-labels";
import { defineCopy } from "@/lib/i18n";
import { specimenImage } from "@/lib/observatory-images";
import { articlePath, blogPath, observatoryPath, pageAlternatesMetadata, servicesPath, worldPath } from "@/lib/page-paths";
import { siteOpenGraph } from "@/lib/site-metadata";
import { absoluteUrl } from "@/lib/site-url";
import { getWorld } from "@/lib/worlds";
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
    enter: "Entrar al simulador",
    enterNamed: (name: string) => `Entrar al simulador de ${name}`,
    openLead: "Lo que lees está vivo en el Observatorio: míralo a pantalla completa y en modo Estudio.",
    endTitle: (name: string) => `Ahora míralo en vivo: ${name}`,
    endLead:
      "Todo lo que acabas de leer corre en tu navegador, en tiempo real. Entra al Observatorio y míralo a pantalla completa, en modo Observar o Estudio.",
    gateTitle: "Entra a los simuladores",
    gateLead: "Gargantúa, planetas y naves de Interstellar en 3D, corriendo en tu navegador, en tiempo real. Están en el Observatorio.",
    gateCta: "Entrar a los simuladores",
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
    enter: "Enter the simulator",
    enterNamed: (name: string) => `Enter the ${name} simulator`,
    openLead: "What you’re reading about is live in the Observatory: see it full screen, in Study mode.",
    endTitle: (name: string) => `Now see it live: ${name}`,
    endLead:
      "Everything you just read runs in your browser, in real time. Step into the Observatory and see it full screen, in Observe or Study mode.",
    gateTitle: "Step into the simulators",
    gateLead: "Gargantua, planets and ships from Interstellar in 3D, running in your browser, in real time. They live in the Observatory.",
    gateCta: "Enter the simulators",
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

/** La captura real del espécimen (`lib/observatory-images.ts`), 16:9 como las del blog. */
const specimenSources = (id: WorldId) => ({
  src: specimenImage(id, "1600"),
  srcSet: `${specimenImage(id, "800")} 800w, ${specimenImage(id, "1600")} 1600w`,
  thumb: specimenImage(id, "800"),
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
      // JPG y no el WebP de 1600: LinkedIn no pinta tarjetas WebP
      // (`tools/prepare-article-og.mjs`). El WebP sigue en el sitemap de imágenes.
      images: [{ url: `${articleImage(article, articleCover(article))}-og.jpg`, width: 1200, height: 630, type: "image/jpeg", alt: prose.coverAlt }],
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
  const specimen = article.specimen
    ? {
        href: observatoryPath(article.specimen, locale),
        name: getWorld(article.specimen, locale).cosmicName,
        ...specimenSources(article.specimen),
      }
    : null;
  const cover = articleSources(articleImage(article, articleCover(article)));
  // El cierre: el simulador de la entrada o, si no habla de uno, el Observatorio entero.
  const gate = specimen
    ? { ...specimen, title: copy.endTitle(specimen.name), lead: copy.endLead, cta: copy.enterNamed(specimen.name) }
    : {
        href: worldPath("tesseract", locale),
        ...specimenSources("gargantua"),
        title: copy.gateTitle,
        lead: copy.gateLead,
        cta: copy.gateCta,
      };
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
          ...(specimen ? { about: { "@id": `${absoluteUrl(specimen.href)}#especimen` } } : {}),
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
          {specimen ? (
            <Link className="blog-button blog-button--live post__enter" href={specimen.href}>
              <span className="blog-live-dot" aria-hidden="true" />
              {copy.enterNamed(specimen.name)}
              <span aria-hidden="true">→</span>
            </Link>
          ) : null}
        </header>

        <figure className={specimen ? "post__cover post__cover--live" : "post__cover"}>
          {specimen ? (
            // La portada es una captura del propio simulador: es su puerta.
            <Link href={specimen.href} aria-label={copy.enterNamed(specimen.name)}>
              <img
                {...cover}
                sizes="(max-width: 76rem) calc(100vw - 2.5rem), 72rem"
                width={1600}
                height={900}
                alt={prose.coverAlt}
                fetchPriority="high"
                decoding="async"
              />
              <span className="post__play" aria-hidden="true">
                <span className="post__play-button">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M8 5.5v13l10.5-6.5z" />
                  </svg>
                </span>
                <span className="post__play-label">
                  <span className="blog-live-dot" />
                  {copy.enter}
                </span>
              </span>
            </Link>
          ) : (
            <img
              {...cover}
              sizes="(max-width: 76rem) calc(100vw - 2.5rem), 72rem"
              width={1600}
              height={900}
              alt={prose.coverAlt}
              fetchPriority="high"
              decoding="async"
            />
          )}
        </figure>

        <div className="post__layout">
          <aside className="post__aside">
            {specimen ? (
              <Link className="post__live" href={specimen.href}>
                <span className="post__live-media">
                  <img src={specimen.thumb} width={800} height={450} alt="" loading="lazy" decoding="async" />
                  <span className="blog-live-badge">
                    <span className="blog-live-dot" aria-hidden="true" />
                    {blog.live}
                  </span>
                </span>
                <span className="post__live-text">
                  <span className="post__live-name">{specimen.name}</span>
                  <span>{copy.openLead}</span>
                  <span className="post__live-cta">
                    {copy.enter} <span aria-hidden="true">→</span>
                  </span>
                </span>
              </Link>
            ) : null}
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
          </aside>

          <div className="post__body">
            <MDXContent code={prose.body} components={{ Figure: figureFor(article) as ComponentType }} />
          </div>
        </div>

        <footer className="post__end">
          <section className="post__gate" aria-labelledby="post-gate-title">
            <img
              src={gate.src}
              srcSet={gate.srcSet}
              sizes="(max-width: 76rem) 100vw, 76rem"
              width={1600}
              height={900}
              alt=""
              loading="lazy"
              decoding="async"
            />
            <div className="post__gate-text">
              <p className="blog-live-badge">
                <span className="blog-live-dot" aria-hidden="true" />
                {blog.live}
              </p>
              <h2 id="post-gate-title">{gate.title}</h2>
              <p>{gate.lead}</p>
              <Link className="blog-button blog-button--live" href={gate.href}>
                {gate.cta} <span aria-hidden="true">→</span>
              </Link>
            </div>
          </section>

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
      <div className="blog-card__media">
        <img
          {...articleSources(articleImage(article, articleCover(article)))}
          sizes={featured ? "(max-width: 60rem) calc(100vw - 2.5rem), 44rem" : "(max-width: 40rem) calc(100vw - 2.5rem), 24rem"}
          width={1600}
          height={900}
          alt=""
          loading={featured ? "eager" : "lazy"}
          decoding="async"
        />
        {article.specimen ? (
          <span className="blog-live-badge">
            <span className="blog-live-dot" aria-hidden="true" />
            {blog.simulator}
          </span>
        ) : null}
      </div>
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
        <p className="blog-card__foot">
          <time dateTime={article.published}>{blog.date(article.published)}</time>
          <span className="blog-card__read" aria-hidden="true">
            {blog.read} →
          </span>
        </p>
      </div>
    </article>
  );
}
