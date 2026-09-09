import Link from "next/link";
import type { Locale } from "@/content/site.data";
import { getWorldNeighbours, getWorldPath, type World } from "@/lib/worlds";
import { StructuredData } from "./structured-data";
import { MillerCertificates } from "./miller-certificates";
import { MillerOcean } from "./miller-ocean";
import "./miller-page.css";

function CurrentLines() {
  return (
    <svg className="miller-currents" viewBox="0 0 1200 380" fill="none" aria-hidden="true" preserveAspectRatio="none">
      {Array.from({ length: 13 }, (_, i) => (
        <path key={i} d={`M-100 ${80 + i * 15} C250 ${-120 + i * 24}, 400 ${430 - i * 10}, 730 ${200 + i * 9} S1050 ${20 + i * 14},1300 ${160 + i * 10}`} />
      ))}
    </svg>
  );
}

export function MillerPage({ world, locale }: { world: World; locale: Locale }) {
  const { prose } = world;
  const { education } = prose;
  const { previous, next } = getWorldNeighbours(world, locale);
  if (!education) return null;
  return (
    <article className="miller-page" data-world="miller">
      <StructuredData locale={locale} breadcrumb={{ path: getWorldPath(world, locale), name: prose.title }} />
      <header className="miller-hero" id="panorama">
        <MillerOcean />
        <div className="miller-hero__content">
          <p className="miller-eyebrow"><span className="miller-status" aria-hidden="true" /> DESTINO 02 <span>/</span> MILLER</p>
          <p className="miller-hero__coordinate" aria-hidden="true">UN OCÉANO DE POSIBILIDADES</p>
          <h1>{prose.title}<span>{education.heroLine}</span></h1>
          <p className="miller-hero__intro">{prose.introduction}</p>
          <div className="miller-hero__actions">
            <a href="#trayectoria" className="miller-button">Explorar mi formación <span aria-hidden="true">↓</span></a>
            <a href="#certificados" className="miller-text-link">Ver certificados <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        <div className="miller-hero__foot"><span>APRENDIZAJE EN MOVIMIENTO</span><span aria-hidden="true">01 — DESCENDER ↓</span></div>
      </header>

      <section className="miller-philosophy" aria-labelledby="miller-philosophy-title">
        <CurrentLines />
        <div className="miller-section-label"><span>01 / LA CORRIENTE</span><span aria-hidden="true">≈</span></div>
        <div className="miller-philosophy__copy">
          <h2 id="miller-philosophy-title">Siempre hay algo<br />más <em>por descubrir.</em></h2>
          <p>{education.philosophy}</p>
        </div>
        <dl className="miller-facts">{prose.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
      </section>

      <section id="trayectoria" className="miller-journey" aria-labelledby="miller-journey-title">
        <div className="miller-section-heading"><p className="miller-eyebrow">02 / PUNTOS DE INMERSIÓN</p><h2 id="miller-journey-title">Distintas aguas.<br /><em>Una misma curiosidad.</em></h2><p>Código, estrategia y lenguaje visual. Tres corrientes que se encuentran en mi forma de crear.</p></div>
        <div className="miller-studies">
          {prose.panels.slice(0, 3).map((panel, i) => (
            <section className="miller-study" key={panel.title}>
              <div className="miller-study__marker" aria-hidden="true"><span>{String(i + 1).padStart(2, "0")}</span></div>
              <div className="miller-study__heading"><p className="miller-eyebrow">{panel.eyebrow}</p><h3>{panel.title}</h3></div>
              <div className="miller-study__detail"><p>{panel.description}</p><ul>{panel.tags?.map((tag) => <li key={tag}>{tag}</li>)}</ul></div>
            </section>
          ))}
        </div>
        <aside className="miller-origin"><span className="miller-eyebrow">EL PUNTO DE PARTIDA / 2022</span><h3>{prose.panels[4].title}</h3><p>{prose.panels[4].description}</p></aside>
      </section>

      <section id="certificados" className="miller-proof" aria-labelledby="miller-proof-title">
        <div className="miller-section-heading miller-section-heading--archive"><div><p className="miller-eyebrow">03 / BITÁCORA DE APRENDIZAJE</p><h2 id="miller-proof-title">Lo aprendido<br /><em>deja huella.</em></h2></div><p>Una selección de programas, roles y cursos que forman parte de mi recorrido. Cada documento se puede consultar.</p></div>
        <MillerCertificates certificates={education.certificates} />
      </section>

      <section className="miller-horizon" aria-labelledby="miller-horizon-title"><CurrentLines /><p className="miller-eyebrow">EL VIAJE CONTINÚA</p><h2 id="miller-horizon-title">La próxima ola<br /><em>es lo que construyo.</em></h2><p>{prose.closing}</p>{next ? <Link href={getWorldPath(next, locale)} className="miller-button">Explorar mis proyectos <span aria-hidden="true">→</span></Link> : null}</section>
      <nav className="miller-neighbours" aria-label="Destinos contiguos">
        {previous ? <Link href={getWorldPath(previous, locale)} rel="prev"><small>← {previous.cosmicName}</small><span>{previous.prose.title}</span></Link> : null}
        {next ? <Link href={getWorldPath(next, locale)} rel="next"><small>{next.cosmicName} →</small><span>{next.prose.title}</span></Link> : null}
      </nav>
    </article>
  );
}
