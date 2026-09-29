import Link from "next/link";
import type { Locale } from "@/content/site.data";
import { defineCopy } from "@/lib/i18n";
import { WORLD_COPY } from "@/lib/world-copy";
import { getWorldNeighbours, getWorldPath, type World } from "@/lib/worlds";
import { StructuredData } from "./structured-data";
import { EdmundsGallery } from "./edmunds-gallery";
import "./edmunds-page.css";

const COPY = defineCopy({
  es: {
    enter: "Entrar en la galería",
    beyond: "FUERA DEL CÓDIGO",
    statement: ["También soy", "lo que me detengo", "a mirar."],
    colophon: "Sobre este archivo",
    open: "UN ARCHIVO ABIERTO",
  },
  en: {
    enter: "Step into the gallery",
    beyond: "BEYOND THE CODE",
    statement: ["I’m also", "what I stop", "to look at."],
    colophon: "About this archive",
    open: "AN OPEN ARCHIVE",
  },
});

/** Edmunds: a short heading that breathes, then the deck alone on a full
 * viewport. The prose that follows is deliberately brief. */
export function EdmundsPage({ world, locale }: { world: World; locale: Locale }) {
  const { prose } = world;
  const creativity = prose.creativity;
  const { previous, next } = getWorldNeighbours(world, locale);
  const copy = COPY[locale];
  const shared = WORLD_COPY[locale];
  if (!creativity) return null;
  return (
    <article className="edmunds-page">
      <StructuredData locale={locale} breadcrumb={[{ path: getWorldPath(world, locale), name: prose.title }]} />
      <header className="edmunds-intro">
        <div className="edmunds-intro__title">
          <p className="edmunds-eyebrow"><span className="edmunds-intro__dot" aria-hidden="true" /> {shared.destination.toUpperCase()} {String(world.order).padStart(2, "0")} <span>/</span> {world.cosmicName.toUpperCase()}</p>
          <h1>{prose.title}</h1>
          <p className="edmunds-intro__tagline">{creativity.heroLine}</p>
        </div>
        <div className="edmunds-intro__copy">
          <p>{prose.introduction}</p>
          <a href="#galeria" className="edmunds-intro__cta">{copy.enter} <span aria-hidden="true">↓</span></a>
        </div>
      </header>
      <EdmundsGallery artworks={creativity.artworks} collections={creativity.collections} />
      <section className="edmunds-statement" id="mirada" aria-labelledby="edmunds-statement-title">
        <div className="edmunds-statement__lead">
          <p className="edmunds-eyebrow">{copy.beyond}</p>
          <h2 id="edmunds-statement-title">{copy.statement[0]}<br /><em>{copy.statement[1]}<br />{copy.statement[2]}</em></h2>
          <dl className="edmunds-facts">{prose.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
        </div>
        <div className="edmunds-statement__copy"><p>{creativity.statement}</p><p>{creativity.note}</p><span className="edmunds-signature">Jonás.</span></div>
      </section>
      <section className="edmunds-colophon" aria-label={copy.colophon}><span className="edmunds-eyebrow">{copy.open}</span><p>{prose.closing}</p><span className="edmunds-colophon__mark" aria-hidden="true">✳</span></section>
      <nav className="edmunds-neighbours" aria-label={shared.neighbours}>
        {previous ? <Link href={getWorldPath(previous, locale)} rel="prev"><small>← {previous.cosmicName}</small><span>{previous.prose.title}</span></Link> : null}
        {next ? <Link href={getWorldPath(next, locale)} rel="next"><small>{next.cosmicName} →</small><span>{next.prose.title}</span></Link> : null}
      </nav>
    </article>
  );
}
