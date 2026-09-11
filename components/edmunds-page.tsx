import Link from "next/link";
import type { Locale } from "@/content/site.data";
import { getWorldNeighbours, getWorldPath, type World } from "@/lib/worlds";
import { StructuredData } from "./structured-data";
import { EdmundsGallery } from "./edmunds-gallery";
import "./edmunds-page.css";

export function EdmundsPage({ world, locale }: { world: World; locale: Locale }) {
  const { prose } = world;
  const creativity = prose.creativity;
  const { previous, next } = getWorldNeighbours(world, locale);
  if (!creativity) return null;
  return (
    <article className="edmunds-page">
      <StructuredData locale={locale} breadcrumb={{ path: getWorldPath(world, locale), name: prose.title }} />
      <header className="edmunds-intro">
        <div className="edmunds-coordinate"><p className="edmunds-eyebrow">DESTINO 04 <span>/</span> EDMUNDS</p><span>ARCHIVO VISUAL · JONÁS</span></div>
        <div className="edmunds-intro__copy"><h1>{prose.title}<em>{creativity.heroLine}</em></h1><div><p>{prose.introduction}</p><a href="#mirada" className="edmunds-text-link">Un poco de mí <span aria-hidden="true">↘</span></a></div></div>
      </header>
      <EdmundsGallery artworks={creativity.artworks} collections={creativity.collections} />
      <section className="edmunds-statement" id="mirada" aria-labelledby="edmunds-statement-title">
        <div><p className="edmunds-eyebrow">FUERA DEL CÓDIGO</p><h2 id="edmunds-statement-title">También soy<br /><em>lo que me detengo<br />a mirar.</em></h2></div>
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
