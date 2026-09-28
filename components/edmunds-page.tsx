import Link from "next/link";
import type { Locale } from "@/content/site.data";
import { getWorldNeighbours, getWorldPath, type World } from "@/lib/worlds";
import { StructuredData } from "./structured-data";
import { EdmundsGallery } from "./edmunds-gallery";
import "./edmunds-page.css";

/** Edmunds: a short heading that breathes, then the deck alone on a full
 * viewport. The prose that follows is deliberately brief. */
export function EdmundsPage({ world, locale }: { world: World; locale: Locale }) {
  const { prose } = world;
  const creativity = prose.creativity;
  const { previous, next } = getWorldNeighbours(world, locale);
  if (!creativity) return null;
  return (
    <article className="edmunds-page">
      <StructuredData locale={locale} breadcrumb={[{ path: getWorldPath(world, locale), name: prose.title }]} />
      <header className="edmunds-intro">
        <div className="edmunds-intro__title">
          <p className="edmunds-eyebrow"><span className="edmunds-intro__dot" aria-hidden="true" /> DESTINO 04 <span>/</span> EDMUNDS</p>
          <h1>{prose.title}</h1>
          <p className="edmunds-intro__tagline">{creativity.heroLine}</p>
        </div>
        <div className="edmunds-intro__copy">
          <p>{prose.introduction}</p>
          <a href="#galeria" className="edmunds-intro__cta">Entrar en la galería <span aria-hidden="true">↓</span></a>
        </div>
      </header>
      <EdmundsGallery artworks={creativity.artworks} collections={creativity.collections} />
      <section className="edmunds-statement" id="mirada" aria-labelledby="edmunds-statement-title">
        <div className="edmunds-statement__lead">
          <p className="edmunds-eyebrow">FUERA DEL CÓDIGO</p>
          <h2 id="edmunds-statement-title">También soy<br /><em>lo que me detengo<br />a mirar.</em></h2>
          <dl className="edmunds-facts">{prose.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
        </div>
        <div className="edmunds-statement__copy"><p>{creativity.statement}</p><p>{creativity.note}</p><span className="edmunds-signature">Jonás.</span></div>
      </section>
      <section className="edmunds-colophon" aria-label="Sobre este archivo"><span className="edmunds-eyebrow">UN ARCHIVO ABIERTO</span><p>{prose.closing}</p><span className="edmunds-colophon__mark" aria-hidden="true">✳</span></section>
      <nav className="edmunds-neighbours" aria-label="Destinos contiguos">
        {previous ? <Link href={getWorldPath(previous, locale)} rel="prev"><small>← {previous.cosmicName}</small><span>{previous.prose.title}</span></Link> : null}
        {next ? <Link href={getWorldPath(next, locale)} rel="next"><small>{next.cosmicName} →</small><span>{next.prose.title}</span></Link> : null}
      </nav>
    </article>
  );
}
