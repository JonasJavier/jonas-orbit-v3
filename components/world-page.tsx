import Link from "next/link";
import type { Locale } from "@/content/site.data";
import { getWorldNeighbours, getWorldPath, type World } from "@/lib/worlds";
import { StructuredData } from "./structured-data";
import { WorldGlyph } from "./world-glyph";

/**
 * Cuerpo de una página de mundo.
 *
 * Sustituye a `WorldSection`: lo que era una sección con ancla dentro de un
 * scroll infinito es ahora una página con su propio `<h1>`, su metadata y su
 * OG (§2 del pivote). El contenido editorial no cambia — cambia dónde vive.
 *
 * El pie de destinos vecinos es lo que reemplaza al scroll continuo: en F1A se
 * pasaba al siguiente mundo dejando caer la rueda; aquí hay que ofrecer la
 * salida explícitamente o cada mundo se convierte en un callejón sin salida.
 */
export function WorldPage({
  world,
  locale,
  children,
  showPanels = true,
}: {
  world: World;
  locale: Locale;
  children?: React.ReactNode;
  showPanels?: boolean;
}) {
  const { prose } = world;
  const { previous, next } = getWorldNeighbours(world, locale);

  return (
    <article
      className="world-page"
      data-world={world.id}
      style={
        {
          "--world-accent": world.accent,
          "--world-secondary": world.secondary,
        } as React.CSSProperties
      }
    >
      <StructuredData
        locale={locale}
        breadcrumb={{
          path: getWorldPath(world, locale),
          name: prose.title,
        }}
      />
      <div className="world-page__atmosphere" aria-hidden="true" />

      <header className="world-page__masthead">
        <div>
          <p className="section-kicker">
            DESTINO {String(world.order).padStart(2, "0")} / {world.cosmicName}
          </p>
          <p className="world-page__eyebrow">{prose.eyebrow}</p>
          <h1>{prose.title}</h1>
          <p className="world-page__intro">{prose.introduction}</p>
        </div>
        <WorldGlyph
          visual={world.visual}
          accent={world.accent}
          secondary={world.secondary}
        />
      </header>

      <dl className="fact-grid">
        {prose.facts.map((fact) => (
          <div key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>

      {children}

      {showPanels ? (
        <ul className="panel-grid">
          {prose.panels.map((panel, index) => (
            <li key={panel.title}>
              <span className="panel-grid__index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="panel-grid__eyebrow">{panel.eyebrow}</p>
              <h2>{panel.title}</h2>
              <p>{panel.description}</p>
              {panel.tags && panel.tags.length > 0 ? (
                <ul className="tag-list">
                  {panel.tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="world-page__closing">
        <span aria-hidden="true">{"//"}</span> {prose.closing}
      </p>

      <nav className="world-page__neighbours" aria-label="Destinos contiguos">
        {previous ? (
          <Link href={getWorldPath(previous, locale)} rel="prev">
            <span aria-hidden="true">←</span>
            <span>
              <small>
                DESTINO {String(previous.order).padStart(2, "0")} ·{" "}
                {previous.cosmicName}
              </small>
              {previous.prose.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={getWorldPath(next, locale)} rel="next">
            <span>
              <small>
                DESTINO {String(next.order).padStart(2, "0")} · {next.cosmicName}
              </small>
              {next.prose.title}
            </span>
            <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
