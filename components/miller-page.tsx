import Link from "next/link";
import type { Locale } from "@/content/site.data";
import { getWorldNeighbours, getWorldPath, type World } from "@/lib/worlds";
import { StructuredData } from "./structured-data";
import { MillerCertificates } from "./miller-certificates";
import { MillerCvDownload } from "./miller-cv-download";
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

export function MillerPage({ world, locale }: { world: World; locale: Locale }) {
  const { prose } = world;
  const { education } = prose;
  const { previous, next } = getWorldNeighbours(world, locale);
  if (!education) return null;
  const inProgress = education.inProgress ?? [];
  return (
    <MillerWater>
      <StructuredData locale={locale} breadcrumb={{ path: getWorldPath(world, locale), name: prose.title }} />
      <header className="miller-hero" id="panorama">
        <MillerOcean />
        <div className="miller-viewport-frame" aria-hidden="true"><i /><i /><i /><i /></div>
        <div className="miller-hero__content">
          <p className="miller-eyebrow"><span className="miller-status" aria-hidden="true" /> DESTINO 02 <span>/</span> MILLER</p>
          <p className="miller-hero__coordinate" aria-hidden="true">UN OCÉANO DE POSIBILIDADES</p>
          <h1>{prose.title}<span>{education.heroLine}</span></h1>
          <p className="miller-hero__intro">{prose.introduction}</p>
          <div className="miller-hero__actions">
            <a href="#trayectoria" className="miller-button">Ver mi recorrido <span aria-hidden="true">↓</span></a>
            <a href="#certificados" className="miller-text-link">Ver certificados <span aria-hidden="true">↗</span></a>
            <MillerCvDownload />
          </div>
        </div>
        <a href="#trayectoria" className="miller-hero__descend"><span>Descender</span><i aria-hidden="true">↓</i></a>
      </header>

      <section className="miller-philosophy" data-water-section aria-labelledby="miller-philosophy-title">
        <CurrentLines />
        <div className="miller-section-label"><span>01 / CÓMO APRENDO</span><span aria-hidden="true">≈</span></div>
        <div className="miller-philosophy__copy">
          <h2 id="miller-philosophy-title">Siempre hay algo<br />más <em>por descubrir.</em></h2>
          <p>{education.philosophy}</p>
        </div>
        <dl className="miller-facts">{prose.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
      </section>

      <section id="trayectoria" className="miller-journey" data-water-section aria-labelledby="miller-journey-title">
        <div className="miller-section-heading"><p className="miller-eyebrow">02 / MI RECORRIDO</p><h2 id="miller-journey-title">Distintas aguas.<br /><em>Una misma curiosidad.</em></h2><p>Código, estrategia, lenguaje visual e idiomas. Disciplinas que se cruzan en mi forma de resolver problemas y construir productos.</p></div>
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
              <p className="miller-eyebrow"><span className="miller-status" aria-hidden="true" /> AHORA / EN CURSO</p>
              <h3 id="miller-now-title">Lo que estoy aprendiendo <em>ahora mismo.</em></h3>
              <p>Frentes abiertos hoy. Ninguno tiene todavía documento en la bitácora: cuando lo tenga, aparecerá abajo con los demás.</p>
            </div>
            <ol className="miller-now__list" aria-label="Aprendizaje en curso">
              {inProgress.map((course, index) => (
                <li key={course.id} className="miller-now__item">
                  <div className="miller-now__marker" aria-hidden="true"><span>{String(index + 1).padStart(2, "0")}</span><i /></div>
                  <div className="miller-now__course">
                    <span className="miller-now__area">{course.area === "code" ? "CÓDIGO" : "IDIOMAS"}</span>
                    <h4>{course.title}</h4>
                    {course.issuer ? <p className="miller-now__issuer">{course.issuer}</p> : null}
                  </div>
                  <p className="miller-now__detail">{course.detail}</p>
                  <span className="miller-now__badge"><i aria-hidden="true" />En curso</span>
                </li>
              ))}
            </ol>
            <aside className="miller-origin">
              <span className="miller-origin__year">2022</span>
              <div><span className="miller-eyebrow">EL PUNTO DE PARTIDA</span><h3>{prose.panels[4].title}</h3></div>
              <p>{prose.panels[4].description}</p>
            </aside>
          </section>
        ) : null}
      </section>

      <section id="certificados" className="miller-proof" data-water-section aria-labelledby="miller-proof-title">
        <div className="miller-archive-tide" aria-hidden="true"><CurrentLines surface /></div>
        <div className="miller-section-heading miller-section-heading--archive"><div><p className="miller-eyebrow">03 / BITÁCORA DE APRENDIZAJE</p><h2 id="miller-proof-title">Lo aprendido<br /><em>deja huella.</em></h2></div><p>Una selección de cursos, programas y credenciales que documentan mi recorrido. Cuando existe evidencia disponible, puedes consultarla aquí.</p></div>
        <MillerCertificates certificates={education.certificates} />
      </section>

      <section className="miller-horizon" aria-labelledby="miller-horizon-title"><p className="miller-eyebrow">EL VIAJE CONTINÚA</p><h2 id="miller-horizon-title">La próxima ola<br /><em>es lo que construyo.</em></h2><p>{prose.closing}</p>{next ? <Link href={getWorldPath(next, locale)} className="miller-button">Explorar mis proyectos <span aria-hidden="true">→</span></Link> : null}</section>
      <nav className="miller-neighbours" aria-label="Destinos contiguos">
        {previous ? <Link href={getWorldPath(previous, locale)} rel="prev"><small>← {previous.cosmicName}</small><span>{previous.prose.title}</span></Link> : null}
        {next ? <Link href={getWorldPath(next, locale)} rel="next"><small>{next.cosmicName} →</small><span>{next.prose.title}</span></Link> : null}
      </nav>
    </MillerWater>
  );
}
