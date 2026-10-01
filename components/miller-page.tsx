import Link from "next/link";
import type { Locale } from "@/content/site.data";
import { defineCopy } from "@/lib/i18n";
import { WORLD_COPY } from "@/lib/world-copy";
import { getWorldNeighbours, getWorldPath, type World } from "@/lib/worlds";
import { StructuredData } from "./structured-data";
import { MillerCertificates } from "./miller-certificates";
import { MillerCvDownload } from "./miller-cv-download";
import { IssuerLogo } from "./miller-issuer-logo";
import { MillerOcean } from "./miller-ocean";
import { MillerWater } from "./miller-water";
import "./miller-page.css";

function CurrentLines({ surface = false }: { surface?: boolean }) {
  const paths = Array.from({ length: surface ? 5 : 13 }, (_, i) => surface
    ? `M-100 ${140 + i * 22} C200 ${90 + i * 26}, 410 ${210 + i * 12}, 730 ${150 + i * 20} S1050 ${120 + i * 19},1300 ${145 + i * 22}`
    : `M-100 ${80 + i * 15} C250 ${-120 + i * 24}, 400 ${430 - i * 10}, 730 ${200 + i * 9} S1050 ${20 + i * 14},1300 ${160 + i * 10}`);
  return (
    <svg className="miller-currents" viewBox="0 0 1200 380" fill="none" aria-hidden="true" preserveAspectRatio="none">
      {paths.map((path, i) => <path key={i} d={path} />)}
      <g className="miller-currents__light">
        {(surface ? [1, 3] : [1, 4, 7, 10]).map((i) => (
          <path key={i} pathLength="1000" d={paths[i]} />
        ))}
      </g>
    </svg>
  );
}

const COPY = defineCopy({
  es: {
    coordinate: "UN OCÉANO DE POSIBILIDADES",
    journey: "Ver mi recorrido",
    certificates: "Ver certificados",
    descend: "Descender",
    howILearn: "01 / CÓMO APRENDO",
    philosophyTitle: ["Siempre hay algo", "más ", "por descubrir."],
    myJourney: "02 / MI RECORRIDO",
    journeyTitle: ["Distintas aguas.", "Una misma curiosidad."],
    journeyLead: "Código, estrategia, lenguaje visual e idiomas. Disciplinas que se cruzan en mi forma de resolver problemas y construir productos.",
    now: "AHORA / EN CURSO",
    nowTitle: ["Lo que estoy aprendiendo ", "ahora mismo."],
    nowLead: "Frentes abiertos hoy. Ninguno tiene todavía documento en la bitácora: cuando lo tenga, aparecerá abajo con los demás.",
    nowList: "Aprendizaje en curso",
    code: "CÓDIGO",
    languages: "IDIOMAS",
    inProgress: "En curso",
    origin: "EL PUNTO DE PARTIDA",
    logbook: "03 / BITÁCORA DE APRENDIZAJE",
    logbookTitle: ["Lo aprendido", "deja huella."],
    logbookLead: "Una selección de cursos, programas y credenciales que documentan mi recorrido. Cuando existe evidencia disponible, puedes consultarla aquí.",
    continues: "EL VIAJE CONTINÚA",
    horizonTitle: ["La próxima ola", "es lo que construyo."],
    projects: "Explorar mis proyectos",
  },
  en: {
    coordinate: "AN OCEAN OF POSSIBILITIES",
    journey: "See my journey",
    certificates: "See certificates",
    descend: "Dive in",
    howILearn: "01 / HOW I LEARN",
    philosophyTitle: ["There’s always", "more ", "to discover."],
    myJourney: "02 / MY JOURNEY",
    journeyTitle: ["Different waters.", "The same curiosity."],
    journeyLead: "Code, strategy, visual language and languages. Disciplines that meet in the way I solve problems and build products.",
    now: "NOW / IN PROGRESS",
    nowTitle: ["What I’m learning ", "right now."],
    nowLead: "What I’m working on today. None of it has a document in the logbook yet: once it does, it’ll show up below with the rest.",
    nowList: "Learning in progress",
    code: "CODE",
    languages: "LANGUAGES",
    inProgress: "In progress",
    origin: "WHERE IT STARTED",
    logbook: "03 / LEARNING LOGBOOK",
    logbookTitle: ["What I learn", "leaves a mark."],
    logbookLead: "A selection of courses, programs and credentials that document my path. Where evidence is available, you can check it here.",
    continues: "THE JOURNEY CONTINUES",
    horizonTitle: ["The next wave", "is what I build."],
    projects: "Explore my projects",
  },
});

export function MillerPage({ world, locale }: { world: World; locale: Locale }) {
  const { prose } = world;
  const { education } = prose;
  const { previous, next } = getWorldNeighbours(world, locale);
  const copy = COPY[locale];
  const shared = WORLD_COPY[locale];
  if (!education) return null;
  const inProgress = education.inProgress ?? [];
  return (
    <MillerWater>
      <StructuredData locale={locale} breadcrumb={[{ path: getWorldPath(world, locale), name: prose.title }]} />
      <header className="miller-hero" id="panorama">
        <MillerOcean />
        <div className="miller-viewport-frame" aria-hidden="true"><i /><i /><i /><i /></div>
        <div className="miller-hero__content">
          <p className="miller-eyebrow"><span className="miller-status" aria-hidden="true" /> {shared.destination.toUpperCase()} {String(world.order).padStart(2, "0")} <span>/</span> {world.cosmicName.toUpperCase()}</p>
          <p className="miller-hero__coordinate" aria-hidden="true">{copy.coordinate}</p>
          <h1>{prose.title}<span>{education.heroLine}</span></h1>
          <p className="miller-hero__intro">{prose.introduction}</p>
          <div className="miller-hero__actions">
            <a href="#trayectoria" className="miller-button">{copy.journey} <span aria-hidden="true">↓</span></a>
            <a href="#certificados" className="miller-text-link">{copy.certificates} <span aria-hidden="true">↗</span></a>
            <MillerCvDownload />
          </div>
        </div>
        <a href="#trayectoria" className="miller-hero__descend"><span>{copy.descend}</span><i aria-hidden="true">↓</i></a>
      </header>

      <section className="miller-philosophy" data-water-section aria-labelledby="miller-philosophy-title">
        <CurrentLines />
        <div className="miller-section-label"><span>{copy.howILearn}</span><span aria-hidden="true">≈</span></div>
        <div className="miller-philosophy__copy">
          <h2 id="miller-philosophy-title">{copy.philosophyTitle[0]}<br />{copy.philosophyTitle[1]}<em>{copy.philosophyTitle[2]}</em></h2>
          <p>{education.philosophy}</p>
        </div>
        <dl className="miller-facts">{prose.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
      </section>

      <section id="trayectoria" className="miller-journey" data-water-section aria-labelledby="miller-journey-title">
        <div className="miller-section-heading"><p className="miller-eyebrow">{copy.myJourney}</p><h2 id="miller-journey-title">{copy.journeyTitle[0]}<br /><em>{copy.journeyTitle[1]}</em></h2><p>{copy.journeyLead}</p></div>
        <div className="miller-studies">
          {prose.panels.slice(0, 3).map((panel, i) => (
            <section className="miller-study" key={panel.title}>
              <div className="miller-study__marker" aria-hidden="true"><span>{String(i + 1).padStart(2, "0")}</span></div>
              <div className="miller-study__heading"><p className="miller-eyebrow">{panel.eyebrow}</p><h3>{panel.title}</h3></div>
              <div className="miller-study__detail"><p>{panel.description}</p><ul>{panel.tags?.map((tag) => <li key={tag}>{tag}</li>)}</ul></div>
            </section>
          ))}
        </div>
        {inProgress.length > 0 ? (
          <section className="miller-now" aria-labelledby="miller-now-title">
            <div className="miller-now__heading">
              <p className="miller-eyebrow"><span className="miller-status" aria-hidden="true" /> {copy.now}</p>
              <h3 id="miller-now-title">{copy.nowTitle[0]}<em>{copy.nowTitle[1]}</em></h3>
              <p>{copy.nowLead}</p>
            </div>
            <ol className="miller-now__list" aria-label={copy.nowList}>
              {inProgress.map((course, index) => (
                <li key={course.id} className="miller-now__item">
                  <div className="miller-now__marker" aria-hidden="true"><span>{String(index + 1).padStart(2, "0")}</span><i /></div>
                  <div className="miller-now__course">
                    <span className="miller-now__area">{course.area === "code" ? copy.code : copy.languages}</span>
                    <h4>{course.title}</h4>
                    {course.issuer ? <p className="miller-now__issuer"><IssuerLogo issuer={course.issuer} /><span>{course.issuer}</span></p> : null}
                  </div>
                  <p className="miller-now__detail">{course.detail}</p>
                  <span className="miller-now__badge"><i aria-hidden="true" />{copy.inProgress}</span>
                </li>
              ))}
            </ol>
            <aside className="miller-origin">
              <span className="miller-origin__year">2022</span>
              <div><span className="miller-eyebrow">{copy.origin}</span><h3>{prose.panels[4].title}</h3></div>
              <p>{prose.panels[4].description}</p>
            </aside>
          </section>
        ) : null}
      </section>

      <section id="certificados" className="miller-proof" data-water-section aria-labelledby="miller-proof-title">
        <div className="miller-archive-tide" aria-hidden="true"><CurrentLines surface /></div>
        <div className="miller-section-heading miller-section-heading--archive"><div><p className="miller-eyebrow">{copy.logbook}</p><h2 id="miller-proof-title">{copy.logbookTitle[0]}<br /><em>{copy.logbookTitle[1]}</em></h2></div><p>{copy.logbookLead}</p></div>
        <MillerCertificates certificates={education.certificates} />
      </section>

      <section className="miller-horizon" aria-labelledby="miller-horizon-title"><p className="miller-eyebrow">{copy.continues}</p><h2 id="miller-horizon-title">{copy.horizonTitle[0]}<br /><em>{copy.horizonTitle[1]}</em></h2><p>{prose.closing}</p>{next ? <Link href={getWorldPath(next, locale)} className="miller-button">{copy.projects} <span aria-hidden="true">→</span></Link> : null}</section>
      <nav className="miller-neighbours" aria-label={shared.neighbours}>
        {previous ? <Link href={getWorldPath(previous, locale)} rel="prev"><small>← {previous.cosmicName}</small><span>{previous.prose.title}</span></Link> : null}
        {next ? <Link href={getWorldPath(next, locale)} rel="next"><small>{next.cosmicName} →</small><span>{next.prose.title}</span></Link> : null}
      </nav>
    </MillerWater>
  );
}
