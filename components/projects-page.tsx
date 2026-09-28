import Link from "next/link";
import type { Locale } from "@/content/site.data";
import { tableProject } from "@/lib/engineering-table";
import type { Project } from "@/lib/projects";
import { getWorldNeighbours, getWorldPath, type World } from "@/lib/worlds";
import { EngineeringTable } from "./engineering-table";
import { StructuredData } from "./structured-data";
import "./projects-page.css";

/**
 * LA MESA DE INGENIERÍA — `/es/proyectos` (docs/design/endurance-proyectos.md).
 *
 * Deja de ser la ficha genérica del mundo y pasa a ser el instrumento para
 * elegir cuánto profundizar en un proyecto: el mismo objeto —sus capturas—
 * leído como producto, como decisiones de experiencia y como sistema. El caso
 * completo (`/es/proyectos/[slug]`) es la profundidad entera.
 *
 * Cuatro capas, de atrás hacia delante: la sala, la mesa, las pantallas y la
 * lectura. Y nada de esto es WebGL en la página: la sala es un render
 * horneado a imagen, la mesa es un plano en perspectiva y las líneas son SVG.
 * La escena persistente duerme detrás porque la sala es opaca a todo el ancho.
 */

/**
 * LA SALA: la bahía de ingeniería de la Endurance, a oscuras.
 *
 * Es un render 3D procedural horneado a imagen por
 * `tools/render-projects-room.mjs` (origen y lo que NO contiene en
 * `assets/proyectos/FUENTES.md`), con copias WebP de
 * `tools/prepare-projects.mjs`. Decorado: `aria-hidden` y `alt` vacío, sin
 * texto, sin interfaz, sin pantallas, sin figura y sin mesa —la mesa es la
 * de la página—. El velo de encima apaga la izquierda y el pie, donde se lee.
 */
const ROOM = (
  // Peldaños ya preparados: el optimizador de Next no elige entre archivos que existen.
  // eslint-disable-next-line @next/next/no-img-element
  <img
    alt=""
    className="projects-room__photo"
    decoding="async"
    height={1440}
    sizes="100vw"
    src="/images/proyectos/sala-1920.webp"
    srcSet={[960, 1440, 1920, 2560].map((width) => `/images/proyectos/sala-${width}.webp ${width}w`).join(", ")}
    width={2560}
  />
);

function ProjectsRoom() {
  return (
    <div aria-hidden="true" className="projects-room">
      {ROOM}
      <div className="projects-room__veil" />
    </div>
  );
}

export function ProjectsPage({
  world,
  locale,
  projects,
}: {
  world: World;
  locale: Locale;
  projects: Project[];
}) {
  const { prose } = world;
  const { previous, next } = getWorldNeighbours(world, locale);
  const projectsHref = getWorldPath(world, locale);
  const table = projects.map((project) => tableProject(project, projectsHref));

  return (
    <article
      className="projects-page"
      style={
        {
          "--world-accent": world.accent,
          "--world-secondary": world.secondary,
        } as React.CSSProperties
      }
    >
      <StructuredData
        locale={locale}
        breadcrumb={[{ path: projectsHref, name: prose.title }]}
      />

      <ProjectsRoom />

      <EngineeringTable
        head={{
          kicker: `${world.cosmicName} / Mesa de ingeniería`,
          title: prose.shortLabel,
        }}
        projects={table}
      />

      {/*
        La prosa del mundo baja al pie, detrás de la mesa: a la mesa se viene
        a desplegar un proyecto, no a leer una presentación. Sigue entera en
        el HTML servido (regla 7).
      */}
      <div className="projects-page__foot">
        <p className="projects-page__closing">{prose.closing}</p>
        <p className="projects-page__intro">{prose.introduction}</p>
        <dl className="projects-page__facts">
          {prose.facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <nav aria-label="Destinos contiguos" className="projects-neighbours">
        {previous ? (
          <Link href={getWorldPath(previous, locale)} rel="prev">
            <span aria-hidden="true">←</span>
            <span>
              <small>
                Destino {String(previous.order).padStart(2, "0")} ·{" "}
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
                Destino {String(next.order).padStart(2, "0")} · {next.cosmicName}
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
