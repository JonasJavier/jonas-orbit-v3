/* La captura del espécimen ya viene preparada en 800 y 1600 px (`lib/observatory-images.ts`): se sirve tal cual. */
/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { IntentLink as Link } from "@/components/intent-link";
import type { Locale } from "@/content/site.data";
import { getArticles } from "@/lib/articles";
import { observatoryCatalog } from "@/lib/observatory-catalog";
import { specimenImage } from "@/lib/observatory-images";
import { blogLabel } from "@/lib/footer-labels";
import { defineCopy } from "@/lib/i18n";
import { articlePath, blogPath, pageAlternatesMetadata, servicesPath, worldPath } from "@/lib/page-paths";
import { defaultOgImage, siteOpenGraph } from "@/lib/site-metadata";
import { absoluteUrl } from "@/lib/site-url";
import { ArticleCard } from "./article-page";
import { BLOG_COPY } from "./blog-copy";
import { BlogSky } from "./blog-sky";
import { SiteShell } from "./site-shell";
import { StructuredData } from "./structured-data";
import "./blog.css";

const COPY = defineCopy({
  es: {
    seoTitle: "Blog — WebGL, Three.js y desarrollo con Next.js",
    seoDescription:
      "Entradas técnicas completas de Jonás Javier Encarnación sobre WebGL, Three.js, shaders y Next.js: cómo se construyó cada pieza de este portafolio 3D, con código.",
    title: "Lo que aprendo construyendo.",
    lead: "Entradas largas y técnicas sobre cómo se hizo cada pieza de este sitio —shaders, Three.js, Next.js, rendimiento— con el código y las cifras reales, no con resúmenes.",
    latest: "Última entrada",
    all: "Todas las entradas",
    count: (n: number) => (n === 1 ? "1 entrada" : `${n} entradas`),
    ctaTitle: "¿Quieres algo así en tu producto?",
    ctaLead: "Diseño y construyo aplicaciones web y móviles a medida, en remoto o en Santo Domingo.",
    cta: "Ver servicios",
    gateKicker: "Observatorio",
    gateTitle: "Entra a los simuladores",
    gateLead: (n: number) =>
      `${n} simuladores 3D —Gargantúa, planetas y naves de Interstellar— corriendo en tu navegador, en tiempo real.`,
    gateCta: "Entrar a los simuladores",
    gatePick: "O elige uno",
  },
  en: {
    seoTitle: "Blog — WebGL, Three.js and Next.js Development",
    seoDescription:
      "In-depth technical posts by Jonás Javier Encarnación on WebGL, Three.js, shaders and Next.js: how each piece of this 3D portfolio was built, with the code.",
    title: "What I learn building things.",
    lead: "Long, technical posts on how each piece of this site was made —shaders, Three.js, Next.js, performance— with the real code and numbers, not summaries.",
    latest: "Latest post",
    all: "All posts",
    count: (n: number) => (n === 1 ? "1 post" : `${n} posts`),
    ctaTitle: "Want something like this in your product?",
    ctaLead: "I design and build custom web and mobile apps, remotely or in Santo Domingo.",
    cta: "See services",
    gateKicker: "Observatory",
    gateTitle: "Step into the simulators",
    gateLead: (n: number) =>
      `${n} 3D simulators —Gargantua, planets and ships from Interstellar— running in your browser, in real time.`,
    gateCta: "Enter the simulators",
    gatePick: "Or pick one",
  },
});

export function blogMetadata(locale: Locale): Metadata {
  const copy = COPY[locale];
  return {
    title: copy.seoTitle,
    description: copy.seoDescription,
    alternates: pageAlternatesMetadata({ kind: "blog" }, locale),
    openGraph: {
      ...siteOpenGraph(locale),
      title: copy.seoTitle,
      description: copy.seoDescription,
      url: blogPath(locale),
      // Sin tarjeta el índice se compartía sin vista previa.
      images: [defaultOgImage(locale)],
    },
  };
}

/**
 * El blog (`/es/blog`, `/en/blog`): una sección propia, fuera de los seis
 * destinos, con su enlace fijo en la cabecera. La entrada más reciente va
 * destacada y el resto en rejilla; el cierre lleva a Servicios, porque quien
 * lee cómo se hizo algo es quien puede querer que se lo hagan.
 */
export function BlogPage({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  const blog = BLOG_COPY[locale];
  const path = blogPath(locale);
  const [latest, ...rest] = getArticles(locale);
  const specimens = observatoryCatalog(locale).flatMap(({ id, name, href }) => (href ? [{ id, name, href }] : []));
  const gateHref = worldPath("tesseract", locale);

  return (
    <SiteShell locale={locale} page={{ kind: "blog" }} mainClassName="blog-route" footerLabel={blogLabel(locale)}>
      <BlogSky />
      <StructuredData
        locale={locale}
        breadcrumb={[{ path, name: blog.name }]}
        work={{
          "@type": "Blog",
          "@id": `${absoluteUrl(path)}#blog`,
          name: `${blog.name} — Jonás Orbit`,
          description: copy.seoDescription,
          url: absoluteUrl(path),
          blogPost: getArticles(locale).map((article) => ({
            "@id": `${absoluteUrl(articlePath(article.id, locale))}#entrada`,
          })),
        }}
      />

      <div className="blog">
        <div className="blog__top">
          <header className="blog__hero">
            <p className="blog-label">
              {blog.name} · {blog.kicker}
            </p>
            <h1>{copy.title}</h1>
            <p className="blog__lead">{copy.lead}</p>
          </header>

          {/* Lo que el blog explica se puede ver vivo: la puerta va a la altura del título. */}
          <aside className="blog-gate" aria-labelledby="blog-gate-title">
            <Link className="blog-gate__media" href={gateHref} tabIndex={-1} aria-hidden="true">
              <img
                src={specimenImage("gargantua", "1600")}
                srcSet={`${specimenImage("gargantua", "800")} 800w, ${specimenImage("gargantua", "1600")} 1600w`}
                sizes="(max-width: 60rem) calc(100vw - 2.5rem), 32rem"
                width={1600}
                height={900}
                alt=""
                decoding="async"
              />
              <span className="blog-live-badge">
                <span className="blog-live-dot" />
                {blog.live}
              </span>
            </Link>
            <div className="blog-gate__text">
              <p className="blog-label blog-label--warm">{copy.gateKicker}</p>
              <h2 id="blog-gate-title">{copy.gateTitle}</h2>
              <p>{copy.gateLead(specimens.length)}</p>
              <Link className="blog-button blog-button--live" href={gateHref}>
                {copy.gateCta} <span aria-hidden="true">→</span>
              </Link>
              <nav className="blog-gate__pick" aria-label={copy.gatePick}>
                <span className="blog-label blog-label--muted">{copy.gatePick}</span>
                <ul>
                  {specimens.map((entry) => (
                    <li key={entry.id}>
                      <Link href={entry.href}>{entry.name}</Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </aside>
        </div>

        {latest ? (
          <section className="blog__latest" aria-labelledby="blog-latest-title">
            <h2 className="visually-hidden" id="blog-latest-title">{copy.latest}</h2>
            <ArticleCard article={latest} locale={locale} featured />
          </section>
        ) : null}

        {rest.length > 0 ? (
          <section className="blog__list" aria-labelledby="blog-all-title">
            <div className="blog__list-head">
              <h2 className="blog-label" id="blog-all-title">{copy.all}</h2>
              <span className="blog-label blog-label--muted">{copy.count(rest.length + 1)}</span>
            </div>
            <ul className="blog-grid">
              {rest.map((article) => (
                <li key={article.id}>
                  <ArticleCard article={article} locale={locale} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <aside className="blog__cta">
          <div>
            <p className="blog__cta-title">{copy.ctaTitle}</p>
            <p>{copy.ctaLead}</p>
          </div>
          <Link className="blog-button" href={servicesPath(locale)}>
            {copy.cta} <span aria-hidden="true">→</span>
          </Link>
        </aside>
      </div>
    </SiteShell>
  );
}
