import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/content/site.data";
import type { Project } from "@/lib/projects";
import type { World } from "@/lib/worlds";
import { MDXContent } from "./mdx-content";
import { SiteHeader } from "./site-header";

export function ProjectCase({
  project,
  locale,
  worlds,
}: {
  project: Project;
  locale: Locale;
  worlds: World[];
}) {
  const isCaseStudy = project.kind === "case-study";
  const gallery = project.prose.gallery ?? [];

  return (
    <>
      <a className="skip-link" href="#project-content">
        Saltar al caso
      </a>
      <div className="space-backdrop" aria-hidden="true">
        <span className="space-backdrop__stars" />
        <span className="space-backdrop__haze" />
        <span className="space-backdrop__grid" />
      </div>
      <SiteHeader locale={locale} worlds={worlds} />

      <main id="project-content" className="case-page">
        <nav className="case-breadcrumb" aria-label="Migas de pan">
          <Link href={`/${locale}`}>Jonás Orbit</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/${locale}#proyectos`}>Proyectos</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{project.prose.title}</span>
        </nav>

        <header className="case-hero">
          <div className="case-hero__copy">
            <p className="section-kicker">
              ARCHIVO {String(project.order).padStart(2, "0")} / {isCaseStudy ? "CASO COMPLETO" : "FICHA DE MISIÓN"}
            </p>
            <div className="case-status">
              <span aria-hidden="true" /> {project.prose.statusLabel}
            </div>
            <h1>{project.prose.title}</h1>
            <p className="case-hero__summary">{project.prose.summary}</p>
            <ul className="tag-list" aria-label="Tecnologías del proyecto">
              {project.prose.technologies.map((technology) => (
                <li key={technology}>{technology}</li>
              ))}
            </ul>
          </div>

          <figure className="case-hero__media">
            <div className="case-hero__image">
              <Image
                src={project.prose.featuredImage.src}
                alt={project.prose.featuredImage.alt}
                fill
                sizes="(max-width: 900px) 100vw, 55vw"
                preload
              />
              <span className="project-card__scanline" aria-hidden="true" />
            </div>
            <figcaption>{project.prose.featuredImage.caption}</figcaption>
          </figure>
        </header>

        <section className="case-overview" aria-labelledby="case-overview-title">
          <div className="case-overview__heading">
            <p className="section-kicker">LECTURA RÁPIDA / 60 SEGUNDOS</p>
            <h2 id="case-overview-title">La misión, sin ruido.</h2>
          </div>
          <dl>
            <div>
              <dt>Mi función</dt>
              <dd>{project.prose.role}</dd>
            </div>
            <div>
              <dt>El problema</dt>
              <dd>{project.prose.problem}</dd>
            </div>
            <div>
              <dt>Mi contribución</dt>
              <dd>{project.prose.contribution}</dd>
            </div>
            <div>
              <dt>Decisión clave</dt>
              <dd>{project.prose.decision}</dd>
            </div>
          </dl>
        </section>

        <section className="case-highlights" aria-labelledby="case-highlights-title">
          <div>
            <p className="section-kicker">SEÑALES VERIFICABLES</p>
            <h2 id="case-highlights-title">Qué demuestra.</h2>
          </div>
          <ul>
            {project.prose.highlights.map((highlight, index) => (
              <li key={highlight}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {highlight}
              </li>
            ))}
          </ul>
        </section>

        <article className="case-narrative" aria-label={`Historia de ${project.prose.title}`}>
          <MDXContent code={project.prose.body} />
        </article>

        {gallery.length > 0 ? (
          <section className="case-gallery" aria-labelledby="case-gallery-title">
            <div className="case-gallery__heading">
              <div>
                <p className="section-kicker">TELEMETRÍA VISUAL / DATOS SINTÉTICOS</p>
                <h2 id="case-gallery-title">Dentro del sistema.</h2>
              </div>
              <p>{gallery.length} capturas seleccionadas y revisadas para publicación.</p>
            </div>
            <div className="case-gallery__grid">
              {gallery.map((image, index) => (
                <figure key={image.src}>
                  <div className="case-gallery__image">
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      sizes="(max-width: 700px) 100vw, 50vw"
                    />
                  </div>
                  <figcaption>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {image.caption}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        <aside className="case-cta" aria-labelledby="case-cta-title">
          <p className="section-kicker">PRÓXIMA TRANSMISIÓN</p>
          <h2 id="case-cta-title">¿Tienes un sistema difícil de ordenar?</h2>
          <p>
            Puedo ayudarte a convertir procesos complejos en un producto claro,
            mantenible y listo para operar.
          </p>
          <div className="case-cta__actions">
            <Link className="button button--primary" href={`/${locale}#contacto`}>
              Trabajemos juntos <span aria-hidden="true">→</span>
            </Link>
            <Link className="text-link" href={`/${locale}#proyectos`}>
              Ver otros proyectos
            </Link>
          </div>
        </aside>
      </main>

      <footer className="site-footer">
        <p>JONÁS ORBIT · ARCHIVO DE MISIÓN {String(project.order).padStart(2, "0")}</p>
        <Link href={`/${locale}`}>Regresar a la órbita ↑</Link>
      </footer>
    </>
  );
}
