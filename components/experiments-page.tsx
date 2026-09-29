/* Copias responsivas preparadas por tools/prepare-experiments.mjs: la sala es
   un archivo fijo servido tal cual, sin pasar por el optimizador. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Locale } from "@/content/site.data";
import { defineCopy } from "@/lib/i18n";
import { observatoryCatalog } from "@/lib/observatory-catalog";
import { WORLD_COPY } from "@/lib/world-copy";
import { getWorldNeighbours, getWorldPath, type World } from "@/lib/worlds";
import { ExperimentsIndex } from "./experiments-index";
import { StructuredData } from "./structured-data";
import "./experiments-page.css";

/**
 * LA RECEPCIÓN DEL LABORATORIO — `/es/experimentos`.
 *
 * Deja de ser la ficha editorial de la sección y pasa a ser el sitio al que se
 * llega antes de operar un instrumento. Dos capas y ninguna más:
 *
 *   1. El vestíbulo. Arquitectura, ventanal y escala. No lleva ni un dato.
 *   2. El índice de especímenes. Lleva todos.
 *
 * La primera no compite con la segunda: es negro, silencio y una sola curva de
 * luz. Vale por la ESCALA, no por sus objetos, así que aquí no hay estación,
 * ni nave, ni un segundo agujero negro. Hay una sala, y alguien de pie en ella.
 *
 * Y nada de esto es WebGL. El §4 lo prohíbe por una razón medida: un segundo
 * contexto en la recepción destruiría el motivo de partir la experiencia en
 * dos. Una imagen fija hace el trabajo y no le quita a la página el derecho a
 * ser genuinamente ligera.
 */

/**
 * EL VESTÍBULO.
 *
 * Una fotografía, y ninguna capa más que las que la integran en la página.
 * Sustituye al dibujo vectorial que ocupaba este sitio: la sala pedía escala
 * —piedra, reflejo, distancia— y eso es lo que un SVG de tres degradados no
 * sabe fingir. Lo que se conserva del dibujo es su disciplina: aquí no hay ni
 * un dato, ni una lectura, ni un rótulo. Sólo el sitio.
 *
 * Sigue sin ser WebGL, que es lo que el §4 protege. Son 132 KB de WebP y ni un
 * contexto de dibujo: la recepción conserva el derecho a ser ligera.
 *
 * VA ESPEJADA. No es un capricho de composición: medida la fotografía, su arco
 * luminoso sube de abajo-izquierda a arriba-derecha, y su parte más brillante
 * —la jamba encendida del ventanal, el 87 % del ancho— cae exactamente donde
 * tiene que ir el catálogo. Espejada, el arco DESCIENDE hacia el texto y se
 * apaga debajo, y lo que queda bajo las filas es la pared oscura del otro
 * extremo. La imagen no lleva texto ni retrata un lugar real, así que
 * reflejarla no miente sobre nada.
 */
function ExperimentsHall() {
  return (
    <div aria-hidden="true" className="experiments-hall">
      {/*
        El marco existe por una razón medida: el canto de la fotografía cae
        donde diga su proporción, no donde esté la ventana, y un degradado en
        porcentaje del VIEWPORT no sabe encontrarlo. Dentro del marco, el 100 %
        es la imagen, y ahí el desvanecido dura un tercio del ancho.
      */}
      <div className="experiments-hall__frame">
        <img
          alt=""
          className="experiments-hall__photo"
          decoding="async"
          height={1536}
          sizes="(max-width: 63.99rem) 100vw, 63vw"
          src="/images/experimentos/observatorio-1024.webp"
          srcSet={[480, 720, 1024]
            .map((w) => `/images/experimentos/observatorio-${w}.webp ${w}w`)
            .join(", ")}
          width={1024}
        />
        <div className="experiments-hall__vignette" />
      </div>

      {/* El suelo sigue. La sala no termina en el canto de la foto: su reflejo
          se derrama por todo el pie de la página y se apaga. Es una capa plana
          y es lo único que hay a la derecha aparte del negro. */}
      <div className="experiments-hall__spill" />
    </div>
  );
}

const COPY = defineCopy({
  es: { edge: "Algunas cosas merecen una mirada más larga", state: "Observatorio experimental", mounted: "montados" },
  en: { edge: "Some things deserve a longer look", state: "Experimental observatory", mounted: "mounted" },
});

export function ExperimentsPage({
  world,
  locale,
}: {
  world: World;
  locale: Locale;
}) {
  const { prose } = world;
  const copy = COPY[locale];
  const shared = WORLD_COPY[locale];
  const { previous, next } = getWorldNeighbours(world, locale);
  const specimens = observatoryCatalog(locale);
  const mounted = specimens.filter((entry) => entry.href).length;

  return (
    <article
      className="experiments-page"
      style={
        {
          "--world-accent": world.accent,
          "--world-secondary": world.secondary,
        } as React.CSSProperties
      }
    >
      <StructuredData
        locale={locale}
        breadcrumb={[{ path: getWorldPath(world, locale), name: prose.title }]}
      />

      <ExperimentsHall />

      {/*
        El rótulo vertical. Es la única frase de la página que no informa de
        nada, y por eso va en el canto: dice a qué se viene antes de que haya
        nada que leer. Sale del cierre escrito del mundo, no de un eslogan
        inventado para la ocasión.
      */}
      <p aria-hidden="true" className="experiments-page__edge">
        {copy.edge}
      </p>

      <div className="experiments-page__inner">
        {/*
          La cabecera es una LECTURA, no una portada. Antes iba destino, título
          enorme, subtítulo y un párrafo, que es la gramática de cualquier otra
          sección del portafolio; aquí el sitio tiene que explicarse por su
          funcionamiento. Quedan tres líneas y la última ya es un estado del
          laboratorio, con la cifra contada del catálogo y no escrita a mano.

          La introducción del mundo no se pierde: baja al pie, después del
          índice, donde se lee a quien quiera leerla. Sigue entera en el HTML
          servido, que es lo que pide la regla 7.
        */}
        <header className="experiments-head">
          <p className="experiments-head__kicker">
            {shared.destination} {String(world.order).padStart(2, "0")}
            <span aria-hidden="true" className="experiments-head__sep">
              /
            </span>
            {world.cosmicName}
          </p>
          <h1 className="experiments-head__title">{prose.title}</h1>
          <p className="experiments-head__state">
            {copy.state}
            <span aria-hidden="true" className="experiments-head__sep">
              ·
            </span>
            <span className="experiments-head__count">
              {String(mounted).padStart(2, "0")} /{" "}
              {String(specimens.length).padStart(2, "0")}
            </span>{" "}
            {copy.mounted}
          </p>
        </header>

        <ExperimentsIndex specimens={specimens} />

        {/*
          El pie: una frase y su eco, nada más (2026-09-23). Antes llevaba
          divisa, párrafo, tres hechos y cierre, cuatro voces en mono gris que
          el dueño no reconocía. El cierre del mundo es la frase; la
          introducción, su explicación en una línea. Los hechos siguen en el
          MDX para las demás lecturas del mundo.
        */}
        <div className="experiments-page__foot">
          <p className="experiments-page__closing">{prose.closing}</p>
          <p className="experiments-page__intro">{prose.introduction}</p>
        </div>

        <nav aria-label={shared.neighbours} className="experiments-neighbours">
          {previous ? (
            <Link href={getWorldPath(previous, locale)} rel="prev">
              <span aria-hidden="true">←</span>
              <span>
                <small>
                  {shared.destination} {String(previous.order).padStart(2, "0")} ·{" "}
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
                  {shared.destination} {String(next.order).padStart(2, "0")} ·{" "}
                  {next.cosmicName}
                </small>
                {next.prose.title}
              </span>
              <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </div>
    </article>
  );
}
