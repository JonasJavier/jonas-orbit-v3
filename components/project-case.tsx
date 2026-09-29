/* Las capturas son peldaños WebP ya preparados (tools/prepare-projects.mjs),
   como en la mesa: el optimizador de Next no elige entre archivos que existen. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { preload } from "react-dom";
import type { Locale } from "@/content/site.data";
import { caseOutline, nodeText, type CaseHeading, type CaseOutline } from "@/lib/case-outline";
import { tableProject, type TableProject, type TableScreen } from "@/lib/engineering-table";
import { defineCopy } from "@/lib/i18n";
import type { Project } from "@/lib/projects";
import { MDXContent } from "./mdx-content";
import { CaseBackLink, CaseFold, CaseLocalNav, CaseReadingIndex } from "./project-case-nav";
import { CaseViewer } from "./project-case-screens";
import { SystemExplorer } from "./system-diagram";
import "./project-case.css";

/**
 * EL CASO COMPLETO — `/es/proyectos/[slug]` (docs/design/endurance-proyectos.md §17).
 *
 * La mesa enseña un proyecto en tres profundidades; aquí se cuenta entero. El
 * orden responde a una sola pregunta —la de quien tiene treinta segundos—:
 * qué problema había, qué decidió Jonás, qué construyó y qué se puede
 * comprobar. Después, quien quiera, lee el caso entero con calma.
 *
 * Todo sale de la ficha MDX del proyecto y de `tableProject`, la misma
 * derivación que usa la mesa: pantallas con su luma medida, decisiones de
 * diseño, alcance y arquitectura. Aquí no se escribe contenido; sólo rótulos.
 *
 * La escena persistente duerme en esta ruta (`gargantua-system.tsx`): el
 * caso tiene su fondo propio, el vacío de Endurance con la sala de la mesa
 * velada arriba. Nada de planetas pasando por detrás del texto.
 */

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * «Django 5.2» → nombre y versión, para que la versión se lea como dato
 * técnico (mono, apagada) y el nombre como lo que es. Sólo se separa una
 * versión al final que empieza por cifra; «OpenAPI 3.0» se separa,
 * «Google Places API» no.
 */
function splitVersion(item: string): { name: string; version: string | null } {
  const match = /^(.+?)\s+(\d[\w.]*)$/.exec(item.trim());
  return match ? { name: match[1], version: match[2] } : { name: item, version: null };
}

/**
 * La destacada: todo el ancho bajo 1100 px; encima, su columna (~50 % a
 * 1440, ~52 % a 1920 contando lo que sangra hacia el canto), con techo en
 * los ~1000 px que llega a medir.
 */
const HERO_SIZES = "(max-width: 1099px) 100vw, min(56vw, 1000px)";

/** Los ids de sección que usa la página: un apartado del MDX nunca los pisa. */
const SECTION_IDS = ["resumen", "decisiones", "sistema", "tecnologias", "resultados", "pantallas", "caso"] as const;
type SectionId = (typeof SECTION_IDS)[number];

/** El cuerpo de la lectura larga: el índice sabe por él cuándo acaba. */
const BODY_ID = "caso-cuerpo";

const COPY = defineCopy({
  es: {
    sections: {
      resumen: "Resumen",
      decisiones: "Decisiones",
      sistema: "Sistema",
      tecnologias: "Tecnologías",
      resultados: "Resultados",
      pantallas: "Pantallas",
      caso: "Caso completo",
    } satisfies Record<SectionId, string>,
    projects: "Proyectos",
    caseStudy: "Caso de estudio",
    brief: "Ficha",
    newTab: " (se abre en otra pestaña)",
    seeDecisions: "Ver las decisiones",
    seeProduct: "Ver el producto",
    seeCode: "Ver código",
    onGitHub: " en GitHub (se abre en otra pestaña)",
    seeSystem: "Ver el sistema",
    role: "Mi papel",
    stack: "Stack",
    status: "Estado",
    scope: "Alcance",
    challenge: "El reto",
    built: "Lo que construí",
    decision: "Decisión técnica clave",
    designDecisions: "Decisiones de diseño",
    productTour: "El producto, pantalla a pantalla",
    problem: "Problema",
    choice: "Decisión",
    system: "Sistema",
    wide: "Elige un módulo: se enciende su ruta.",
    narrow: "Elige un módulo: debajo, su decisión.",
    technologies: "Tecnologías",
    stackLead: (tools: number, areas: number) => `${tools} herramientas en ${areas} áreas. En el sistema, cada módulo dice las suyas.`,
    results: "Resultados verificables",
    tour: "Recorrido por módulos",
    tourLead: (screens: number, modules: number) => `${screens} pantallas en ${modules} módulos.`,
    modules: "Módulos",
    screens: (n: number): string => (n === 1 ? "pantalla" : "pantallas"),
    moreScreens: "Más pantallas",
    minutes: (n: number) => `${n} min de lectura`,
    fullCase: "El caso completo",
    keepReading: "Seguir leyendo",
    otherProjects: "Otros proyectos",
    contactTitle: "¿Tienes un sistema difícil de ordenar?",
    contactBody: "Puedo ayudarte a convertir procesos complejos en un producto claro, mantenible y listo para operar.",
    contactCta: "Trabajemos juntos",
    previous: "Anterior",
    next: "Siguiente",
  },
  en: {
    sections: {
      resumen: "Overview",
      decisiones: "Decisions",
      sistema: "System",
      tecnologias: "Technologies",
      resultados: "Results",
      pantallas: "Screens",
      caso: "Full case",
    },
    projects: "Projects",
    caseStudy: "Case study",
    brief: "Brief",
    newTab: " (opens in a new tab)",
    seeDecisions: "See the decisions",
    seeProduct: "See the product",
    seeCode: "View code",
    onGitHub: " on GitHub (opens in a new tab)",
    seeSystem: "See the system",
    role: "My role",
    stack: "Stack",
    status: "Status",
    scope: "Scope",
    challenge: "The challenge",
    built: "What I built",
    decision: "Key technical decision",
    designDecisions: "Design decisions",
    productTour: "The product, screen by screen",
    problem: "Problem",
    choice: "Decision",
    system: "System",
    wide: "Pick a module: its path lights up.",
    narrow: "Pick a module: its decision appears below.",
    technologies: "Technologies",
    stackLead: (tools: number, areas: number) => `${tools} tools across ${areas} areas. In the system, each module lists its own.`,
    results: "Verifiable results",
    tour: "Tour by module",
    tourLead: (screens: number, modules: number) => `${screens} screens across ${modules} modules.`,
    modules: "Modules",
    screens: (n: number): string => (n === 1 ? "screen" : "screens"),
    moreScreens: "More screens",
    minutes: (n: number) => `${n} min read`,
    fullCase: "The full case",
    keepReading: "Keep reading",
    otherProjects: "Other projects",
    contactTitle: "Got a system that’s hard to tame?",
    contactBody: "I can help you turn complex processes into a clear, maintainable product that’s ready to run.",
    contactCta: "Let’s work together",
    previous: "Previous",
    next: "Next",
  },
});

/* ── Piezas ─────────────────────────────────────────────────────────────── */

function GitHubMark() {
  return (
    <svg aria-hidden="true" className="case-icon" focusable="false" viewBox="0 0 24 24">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function CheckMark() {
  return (
    <svg aria-hidden="true" className="case-check" focusable="false" viewBox="0 0 16 16">
      <path d="M3.2 8.6 6.4 11.6 12.8 4.6" />
    </svg>
  );
}

/**
 * Una captura en su aparato: un navegador sobrio (tres puntos, sin barra de
 * direcciones inventada) o un teléfono. Se expone con su luma medida —una
 * interfaz blanca se apaga un poco y no irradia— y su proporción queda
 * reservada por `width`/`height`: el marco nunca está vacío mientras carga.
 *
 * El aparato entero es un enlace a su captura grande (`data-case-shot`): sin
 * JavaScript abre el archivo; con él, el visor (`CaseViewer`), que recorre
 * todas las pantallas del proyecto desde la que se eligió.
 */
function ScreenFrame({
  screen,
  sizes,
  priority = "lazy",
}: {
  screen: TableScreen;
  sizes: string;
  /**
   * `high`: la destacada, el LCP. `low`: el teléfono del primer pantallazo,
   * que se ve al entrar pero no debe competir con ella. `lazy`: el resto.
   */
  priority?: "high" | "low" | "lazy";
}) {
  const { sources } = screen;
  return (
    <a
      className="case-frame"
      data-case-shot={screen.index}
      data-frame={screen.frame}
      href={sources.src}
      style={{ "--luma": sources.luma ?? 0.5 } as CSSProperties}
    >
      {screen.frame === "desktop" ? (
        <span aria-hidden="true" className="case-frame__bar">
          <i />
          <i />
          <i />
          {/* El mando de «ampliar» de la ventana: dice que el aparato se abre. */}
          <svg className="case-frame__expand" focusable="false" viewBox="0 0 16 16">
            <path d="M9.5 2.5h4v4M13.5 2.5 9 7M6.5 13.5h-4v-4M2.5 13.5 7 9" />
          </svg>
        </span>
      ) : null}
      <img
        alt={screen.alt}
        className="case-frame__img"
        decoding="async"
        fetchPriority={priority === "lazy" ? undefined : priority}
        height={sources.height}
        loading={priority === "lazy" ? "lazy" : "eager"}
        sizes={sizes}
        src={sources.src}
        srcSet={sources.srcSet || undefined}
        width={sources.width}
      />
      <span aria-hidden="true" className="case-frame__glass" />
    </a>
  );
}

/**
 * Cada `h2` del MDX, con su ancla estable y su numeral. Baja a `h3`: dentro
 * de la página los apartados cuelgan de «El caso completo», que es el `h2`.
 *
 * Dos apartados pueden llamarse igual («Notas», «Notas»): cada aparición toma
 * el SIGUIENTE ancla de ese texto, en el orden del esquema, que es el orden
 * en que MDX los pinta. La cuenta da la vuelta, así que un segundo pintado
 * del árbol entero (el doble render de desarrollo) vuelve a empezar igual.
 */
function outlineHeading(outline: CaseOutline) {
  const byText = new Map<string, (CaseHeading & { index: number })[]>();
  outline.headings.forEach((heading, index) => {
    byText.set(heading.text, [...(byText.get(heading.text) ?? []), { ...heading, index }]);
  });
  const seen = new Map<string, number>();
  return function CaseChapter({ children }: { children?: ReactNode }) {
    const text = nodeText(children).trim();
    const same = byText.get(text);
    const occurrence = seen.get(text) ?? 0;
    seen.set(text, occurrence + 1);
    const heading = same?.[occurrence % same.length];
    if (!heading) return <h3 className="case-chapter">{children}</h3>;
    return (
      <h3 className="case-chapter" id={heading.id}>
        <span aria-hidden="true" className="case-chapter__num">
          {pad(heading.index + 1)}
        </span>
        {heading.label}
      </h3>
    );
  };
}

/* ── La página ──────────────────────────────────────────────────────────── */

export function ProjectCase({
  project,
  projects,
  projectsHref,
  contactHref,
}: {
  project: Project;
  /** Los proyectos de la mesa, en su orden: dan el índice y los vecinos. */
  projects: readonly Project[];
  /** Índice de proyectos (Endurance) y contacto (Ranger), ya resueltos. */
  projectsHref: string;
  contactHref: string;
}) {
  const { prose } = project;
  const locale = prose.locale as Locale;
  const t = COPY[locale];
  const entry = tableProject(project, projectsHref);
  const outline = caseOutline(prose.body, [...SECTION_IDS, BODY_ID, ...entry.tour.map((stop) => stop.id)]);
  const isCaseStudy = project.kind === "case-study";
  // El título lleva raya («OMSTA — ERP para…»): el `h1` conserva el título
  // entero como nombre accesible y lo pinta en dos piezas.
  const titled = /\s+—\s+/.test(prose.title);

  const featured = entry.screens[0];
  // El teléfono acompaña a la destacada: nunca es ella misma (una destacada
  // de teléfono se pintaría dos veces).
  const phone = entry.screens.find((screen) => !screen.featured && screen.frame === "mobile");
  const demo = entry.links.find((link) => link.kind === "demo");
  const repository = entry.links.find((link) => link.kind === "repository");

  // La destacada es el LCP: se pide antes de que el navegador llegue a ella.
  preload(featured.sources.src, {
    as: "image",
    fetchPriority: "high",
    imageSizes: HERO_SIZES,
    imageSrcSet: featured.sources.srcSet || undefined,
  });

  const position = projects.findIndex((candidate) => candidate.id === project.id);
  const neighbours =
    projects.length > 1 && position >= 0
      ? {
          previous: tableProject(projects[(position - 1 + projects.length) % projects.length], projectsHref),
          next: tableProject(projects[(position + 1) % projects.length], projectsHref),
        }
      : null;

  // Sin módulos, cada pantalla se enseña una vez: la rejilla del final sólo
  // lleva las que no salieron ya en el primer pantallazo ni en las
  // decisiones. Con módulos, el final es un RECORRIDO del producto y cada
  // módulo va entero —un módulo al que le faltasen sus mejores pantallas
  // porque ya salieron arriba se leería incompleto—. El visor, que abre
  // cualquiera, las recorre todas en el orden de la ficha. Una sola captura
  // no es un recorrido: ya salió arriba.
  const touring = entry.tour.length > 0 && entry.screens.length > 1;
  const shownAbove = new Set([featured.index, phone?.index, ...entry.reel.map((step) => step.screen)]);
  const moreScreens = touring ? entry.screens : entry.screens.filter((screen) => !shownAbove.has(screen.index));
  const stackCount = entry.stack.reduce((sum, group) => sum + group.items.length, 0);

  const sections: SectionId[] = [
    "resumen",
    "decisiones",
    "sistema",
    ...(entry.stack.length > 0 ? (["tecnologias"] as const) : []),
    ...(prose.highlights.length > 0 ? (["resultados"] as const) : []),
    ...(moreScreens.length > 0 ? (["pantallas"] as const) : []),
    ...(outline.headings.length > 0 ? (["caso"] as const) : []),
  ];

  const decisionsTotal = entry.reel.length;
  // Las cifras del alcance miden lo mismo en toda la fila: el cuerpo sale de
  // la más larga («2» cabe enorme; «Markdown» no puede gritar a su lado).
  const scopeLength = Math.max(1, ...entry.scope.map((item) => item.value.length));

  return (
    <article className="case" id="top" style={{ "--len": entry.name.length } as CSSProperties}>
      <CaseSala />

      <CaseLocalNav
        label={locale === "es" ? "Secciones del caso" : "Case sections"}
        heroId="case-hero"
        name={entry.name}
        sections={sections.map((id) => ({ id, label: t.sections[id] }))}
      />

      {/* ── Primer pantallazo ─────────────────────────────────────────── */}
      <header className="case-hero" id="case-hero">
        <div className="case-hero__copy">
          <div className="case-hero__trail">
            <CaseBackLink href={`${projectsHref}#${entry.id}`}>
              <span aria-hidden="true">←</span> {t.projects}
            </CaseBackLink>
            <p className="case-hero__index">
              <span className="case-hero__count">
                {pad(project.order)} / {pad(projects.length)}
              </span>
              <span aria-hidden="true"> · </span>
              <span>{isCaseStudy ? t.caseStudy : t.brief}</span>
            </p>
          </div>

          <h1 className="case-title">
            <span className="case-title__name">{entry.name}</span>
            {titled ? (
              <>
                {/* Los espacios van fuera del separador oculto: dentro, el
                    cálculo del nombre accesible los recorta. */}{" "}
                <span className="visually-hidden">—</span>{" "}
                <span className="case-title__descriptor">{entry.descriptor}</span>
              </>
            ) : null}
          </h1>
          {titled ? null : <p className="case-title__descriptor">{entry.descriptor}</p>}

          <p className="case-hero__summary">{prose.summary}</p>

          {/* Una salida clara siempre: el producto vivo si está publicado;
              si no, lo que responde «¿diseñó esto?», las decisiones. */}
          <div className="case-hero__actions">
            {demo ? (
              <a className="case-action case-action--site" href={demo.href} rel="noopener noreferrer" target="_blank">
                {demo.label} <span aria-hidden="true">↗</span>
                <span className="visually-hidden">{t.newTab}</span>
              </a>
            ) : (
              <a className="case-action" href="#decisiones">
                {entry.reelKind === "decisions" ? t.seeDecisions : t.seeProduct}{" "}
                <span aria-hidden="true">↓</span>
              </a>
            )}
            {repository ? (
              <a className="case-code" href={repository.href} rel="noopener noreferrer" target="_blank">
                <GitHubMark />
                {t.seeCode} <span aria-hidden="true">↗</span>
                <span className="visually-hidden">{t.onGitHub}</span>
              </a>
            ) : null}
            <a className="case-anchor" href="#sistema">
              {t.seeSystem} <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>

        <div className="case-hero__stage" data-phone={phone ? "true" : undefined}>
          <ScreenFrame priority="high" screen={featured} sizes={HERO_SIZES} />
          {phone ? (
            <span className="case-hero__phone">
              <ScreenFrame priority="low" screen={phone} sizes="(max-width: 767px) 25vw, 220px" />
            </span>
          ) : null}
        </div>

        <dl className="case-facts">
          <div>
            <dt>{t.role}</dt>
            <dd>{prose.role}</dd>
          </div>
          <div>
            <dt>{t.stack}</dt>
            <dd>{prose.technologies.join(" · ")}</dd>
          </div>
          {/* El estado se lee una sola vez en el primer pantallazo: el LED
              y la etiqueta entera, aquí, junto a quién y con qué. */}
          <div>
            <dt>{t.status}</dt>
            <dd className="case-status">
              <span aria-hidden="true" className="case-led" data-state={project.status} />
              {prose.statusLabel}
            </dd>
          </div>
        </dl>
      </header>

      {/* ── Resumen: alcance y reto ───────────────────────────────────── */}
      <div className="case-summary" id="resumen">
        {entry.scope.length > 0 ? (
          <section aria-labelledby="case-scope-title" className="case-scope case-reveal">
            <h2 className="case-kicker" id="case-scope-title">
              {t.scope}
            </h2>
            <ul
              data-words={scopeLength > 4 ? "true" : undefined}
              style={{ "--vlen": scopeLength } as CSSProperties}
            >
              {entry.scope.map((item) => (
                <li key={item.label}>
                  <span className="case-scope__value">{item.value}</span>
                  <span className="case-scope__label">{item.label}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="case-brief-title" className="case-brief case-reveal">
          <div className="case-brief__problem">
            <h2 className="case-kicker" id="case-brief-title">
              {t.challenge}
            </h2>
            <p className="case-brief__statement">{prose.problem}</p>
          </div>
          <dl className="case-brief__answer">
            <div>
              <dt>{t.built}</dt>
              <dd>{prose.contribution}</dd>
            </div>
            <div data-tone="decision">
              <dt>{t.decision}</dt>
              <dd>{prose.decision}</dd>
            </div>
          </dl>
        </section>
      </div>

      {/* ── Decisiones de diseño: la sección estrella ─────────────────── */}
      <section aria-labelledby="decisiones-title" className="case-section case-decisions" id="decisiones">
        {/* Sin antetítulo: cuántas son ya lo dice el índice de cada una. */}
        <header className="case-section__head case-reveal">
          <h2 className="case-h2" id="decisiones-title">
            {entry.reelKind === "decisions" ? t.designDecisions : t.productTour}
          </h2>
        </header>
        <ol className="case-decisions__list">
          {entry.reel.map((step, index) => {
            const screen = entry.screens[step.screen];
            return (
              <li key={`${step.screen}-${index}`} className="case-decision" data-frame={screen.frame}>
                <figure className="case-decision__screen case-reveal">
                  <ScreenFrame
                    screen={screen}
                    sizes={screen.frame === "mobile" ? "(max-width: 767px) 60vw, 300px" : "(max-width: 1099px) 100vw, 60vw"}
                  />
                </figure>
                <div className="case-decision__text case-reveal">
                  <p aria-hidden="true" className="case-decision__index">
                    {pad(index + 1)} <span>/ {pad(decisionsTotal)}</span>
                  </p>
                  {step.problem ? (
                    <dl>
                      <div className="case-decision__problem">
                        <dt>{t.problem}</dt>
                        <dd>{step.problem}</dd>
                      </div>
                      <div className="case-decision__choice">
                        <dt>{t.choice}</dt>
                        <dd>{step.note}</dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="case-decision__caption">{step.note}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ── Sistema ───────────────────────────────────────────────────── */}
      <section
        aria-labelledby="sistema-title"
        className="case-section case-system"
        id="sistema"
        style={{ "--cols": entry.architecture.cols } as CSSProperties}
      >
        {/* Las cifras del sistema ya las dice la barra del esquema: aquí sólo
            el título y cómo se usa. La guía dice lo que pasa en cada forma
            del esquema: en el teléfono no hay líneas, la decisión sale debajo
            (la otra frase queda en `display: none`: nadie la oye dos veces). */}
        <header className="case-section__head case-section__head--row case-reveal">
          <h2 className="case-h2" id="sistema-title">
            {t.system}
          </h2>
          <p className="case-section__lead">
            <span className="case-lead--wide">{t.wide}</span>
            <span className="case-lead--narrow">{t.narrow}</span>
          </p>
        </header>
        <SystemExplorer className="case-system__explorer" project={entry} />
      </section>

      {/* ── Tecnologías: el stack entero, por áreas ───────────────────── */}
      {entry.stack.length > 0 ? (
        <section aria-labelledby="tecnologias-title" className="case-section case-stack" id="tecnologias">
          <header className="case-section__head case-section__head--row case-reveal">
            <h2 className="case-h2" id="tecnologias-title">
              {t.technologies}
            </h2>
            <p className="case-section__lead">{t.stackLead(stackCount, entry.stack.length)}</p>
          </header>
          <div className="case-stack__grid">
            {entry.stack.map((group, index) => (
              <section
                key={group.group}
                aria-labelledby={`case-stack-${index}`}
                className="case-stack__group case-reveal"
              >
                <h3 className="case-stack__title" id={`case-stack-${index}`}>
                  {group.group}
                  <span aria-hidden="true" className="case-stack__count">
                    {pad(group.items.length)}
                  </span>
                </h3>
                <ul>
                  {group.items.map((item) => {
                    const { name, version } = splitVersion(item);
                    return (
                      <li key={item}>
                        <span className="case-stack__name">{name}</span>
                        {version ? <span className="case-stack__version"> {version}</span> : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Resultados verificables ───────────────────────────────────── */}
      {prose.highlights.length > 0 ? (
        <section aria-labelledby="resultados-title" className="case-section case-results" id="resultados">
          <header className="case-section__head case-reveal">
            <h2 className="case-h2" id="resultados-title">
              {t.results}
            </h2>
          </header>
          <ul className="case-results__list case-reveal">
            {prose.highlights.map((highlight) => (
              <li key={highlight}>
                <CheckMark />
                {highlight}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── Pantallas: el recorrido por módulos o las que faltaban ─────── */}
      {touring ? (
        <section aria-labelledby="pantallas-title" className="case-section case-screens case-tour" id="pantallas">
          <header className="case-section__head case-section__head--row case-reveal">
            <h2 className="case-h2" id="pantallas-title">
              {t.tour}
            </h2>
            <p className="case-section__lead">{t.tourLead(entry.screens.length, entry.tour.length)}</p>
          </header>
          <nav aria-label={t.modules} className="case-tour__index case-reveal">
            <ol>
              {entry.tour.map((stop, index) => (
                <li key={stop.id}>
                  <a href={`#${stop.id}`}>
                    <span aria-hidden="true" className="case-tour__num">
                      {pad(index + 1)}
                    </span>
                    {stop.module}
                    <span className="case-tour__count">
                      <span className="visually-hidden">, </span>
                      {stop.screens.length}
                      <span className="visually-hidden"> {t.screens(stop.screens.length)}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          {entry.tour.map((stop, index) => (
            <section key={stop.id} aria-labelledby={`${stop.id}-title`} className="case-tour__stop" id={stop.id}>
              <h3 className="case-tour__title case-reveal" id={`${stop.id}-title`}>
                <span aria-hidden="true" className="case-tour__num">
                  {pad(index + 1)}
                </span>
                {stop.module}
                <span className="case-tour__count">
                  {stop.screens.length} {t.screens(stop.screens.length)}
                </span>
              </h3>
              <CaseShots screens={stop.screens.map((screen) => entry.screens[screen])} />
            </section>
          ))}
        </section>
      ) : moreScreens.length > 0 ? (
        <section aria-labelledby="pantallas-title" className="case-section case-screens" id="pantallas">
          <header className="case-section__head case-reveal">
            <h2 className="case-h2" id="pantallas-title">
              {t.moreScreens}
            </h2>
          </header>
          <CaseShots screens={moreScreens} />
        </section>
      ) : null}
      <CaseViewer name={entry.name} screens={entry.screens} />

      {/* ── El caso completo ──────────────────────────────────────────── */}
      {outline.headings.length > 0 ? (
        <section aria-labelledby="caso-title" className="case-section case-longread" id="caso">
          <header className="case-section__head case-reveal">
            <p className="case-kicker">{t.minutes(outline.minutes)}</p>
            <h2 className="case-h2" id="caso-title">
              {t.fullCase}
            </h2>
          </header>
          <div className="case-longread__grid">
            <CaseReadingIndex endId={BODY_ID} headings={outline.headings} label={locale === "es" ? "Índice del caso" : "Case contents"} />
            <CaseFold bodyId={BODY_ID} label={t.keepReading}>
              <div className="case-longread__body" id={BODY_ID}>
                <MDXContent code={prose.body} components={{ h2: outlineHeading(outline) }} />
              </div>
            </CaseFold>
          </div>
        </section>
      ) : null}

      {/* ── Cierre ────────────────────────────────────────────────────── */}
      <footer className="case-close">
        {neighbours ? (
          <nav aria-label={t.otherProjects} className="case-neighbours">
            <CaseNeighbour direction="previous" entry={neighbours.previous} total={projects.length} label={t.previous} />
            <CaseNeighbour direction="next" entry={neighbours.next} total={projects.length} label={t.next} />
          </nav>
        ) : null}

        {/* Una banda compacta, no un segundo final: el pie del sitio trae
            debajo su propia invitación. */}
        <aside aria-labelledby="case-contact-title" className="case-contact case-reveal">
          <div className="case-contact__text">
            <h2 className="case-contact__title" id="case-contact-title">
              {t.contactTitle}
            </h2>
            <p>{t.contactBody}</p>
          </div>
          <Link className="case-action" href={contactHref}>
            {t.contactCta} <span aria-hidden="true">→</span>
          </Link>
        </aside>
      </footer>
    </article>
  );
}

/**
 * La sala de la mesa, arriba del todo y muy velada: el caso sale de la misma
 * bahía de la Endurance y funde enseguida con el vacío. Decorado sin texto.
 */
function CaseSala() {
  return (
    <div aria-hidden="true" className="case-sala">
      <img
        alt=""
        className="case-sala__photo"
        decoding="async"
        // Decorado muy velado: nunca compite con la destacada por la red.
        fetchPriority="low"
        height={1440}
        sizes="100vw"
        src="/images/proyectos/sala-1920.webp"
        srcSet={[960, 1440, 1920, 2560].map((width) => `/images/proyectos/sala-${width}.webp ${width}w`).join(", ")}
        width={2560}
      />
    </div>
  );
}

/**
 * Las pantallas que no salieron antes, en filas justificadas (en el teléfono,
 * una tira que se desliza). Cada una reserva su proporción desde el servidor
 * (`--ar`): no hay marcos vacíos mientras cargan. Aquí el pie sí se lee: de
 * estas pantallas no ha hablado nadie todavía.
 */
function CaseShots({ screens }: { screens: readonly TableScreen[] }) {
  return (
    <ul className="case-shots" data-shot-group="">
      {screens.map((screen) => (
        <li
          key={screen.sources.src}
          className="case-shot case-reveal"
          data-frame={screen.frame}
          style={
            {
              "--ar": screen.sources.width / screen.sources.height,
              "--luma": screen.sources.luma ?? 0.5,
            } as CSSProperties
          }
        >
          <a className="case-shot__link" data-case-shot={screen.index} href={screen.sources.src}>
            <img
              alt={screen.alt}
              decoding="async"
              height={screen.sources.height}
              loading="lazy"
              sizes={screen.frame === "mobile" ? "(max-width: 767px) 30vw, 180px" : "(max-width: 767px) 80vw, 34vw"}
              src={screen.sources.src}
              srcSet={screen.sources.srcSet || undefined}
              width={screen.sources.width}
            />
          </a>
          <p className="case-shot__caption">{screen.caption}</p>
        </li>
      ))}
    </ul>
  );
}

function CaseNeighbour({
  entry,
  direction,
  total,
  label,
}: {
  entry: TableProject;
  direction: "previous" | "next";
  total: number;
  /** «Anterior» o «Siguiente», en el idioma de la página. */
  label: string;
}) {
  const screen = entry.screens[0];
  return (
    <Link className="case-neighbour" data-direction={direction} href={entry.href}>
      <span className="case-neighbour__thumb" style={{ "--luma": screen.sources.luma ?? 0.5 } as CSSProperties}>
        <img
          alt=""
          decoding="async"
          height={screen.sources.height}
          loading="lazy"
          src={screen.sources.thumb}
          width={screen.sources.width}
        />
      </span>
      <span className="case-neighbour__text">
        <span className="case-neighbour__dir">
          {direction === "previous" ? (
            <>
              <span aria-hidden="true">←</span> {label}
            </>
          ) : (
            <>
              {label} <span aria-hidden="true">→</span>
            </>
          )}
          <span aria-hidden="true" className="case-neighbour__count">
            {pad(entry.order)} / {pad(total)}
          </span>
        </span>
        <span className="case-neighbour__name">{entry.name}</span>
        <span className="case-neighbour__descriptor">{entry.descriptor}</span>
      </span>
    </Link>
  );
}
