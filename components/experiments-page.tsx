import Link from "next/link";
import type { Locale } from "@/content/site.data";
import { observatoryCatalog } from "@/lib/observatory-catalog";
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
 * luz. La referencia que la ordena —un vestíbulo enorme abierto al espacio, una
 * figura diminuta delante— vale por la ESCALA, no por sus objetos, así que aquí
 * no hay estación, ni nave, ni un segundo agujero negro. Hay una sala.
 *
 * Y nada de esto es WebGL. El §4 lo prohíbe por una razón medida: un segundo
 * contexto en la recepción destruiría el motivo de partir la experiencia en
 * dos. Un SVG de unos pocos kilobytes hace el trabajo y no le quita a la
 * página el derecho a ser genuinamente ligera.
 */

/**
 * El campo de estrellas, sembrado de forma DETERMINISTA.
 *
 * Un generador congruencial con semilla fija: el mismo cielo en cada carga, en
 * cada máquina y en cada captura. `Math.random()` daría un cielo distinto en el
 * servidor y en el cliente, que además de ser un desajuste de hidratación haría
 * imposible comparar dos capturas del pase visual.
 */
function starField(count: number) {
  let seed = 20260917;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  return Array.from({ length: count }, (_, i) => {
    const r = next();
    return {
      key: i,
      x: 150 + next() * 470,
      y: -20 + next() * 800,
      // Magnitudes: muchas débiles y unas pocas claras, como en el cielo del
      // observatorio de la cabecera. Un campo de puntos iguales se lee como
      // una textura, no como un cielo.
      radius: 0.5 + r * r * 2.1,
      opacity: 0.18 + r * 0.62,
    };
  });
}

const STARS = starField(90);

/**
 * El vestíbulo.
 *
 * Un solo `<svg>` `aria-hidden` con todo dentro: cielo, limbo, suelo y figura.
 * Va en un `viewBox` apaisado con `xMinYMid slice`, así que al estrechar la
 * ventana se recorta por la DERECHA —donde sólo hay pared— y el ventanal nunca
 * desaparece.
 */
function ExperimentsHall() {
  return (
    <div aria-hidden="true" className="experiments-hall">
      <svg
        className="experiments-hall__svg"
        preserveAspectRatio="xMinYMid slice"
        viewBox="0 0 1600 900"
      >
        <defs>
          <clipPath id="hall-window">
            {/*
              El ventanal: un rectángulo altísimo con una sola esquina curva
              abajo a la izquierda. Esa curva es toda la arquitectura que hay
              —una línea que el ojo sigue hasta el suelo— y es lo que evita que
              esto se lea como una foto pegada en un rectángulo.
            */}
            <path d="M 620 -20 L 620 700 Q 620 792 528 792 L 300 792 Q 150 792 150 640 L 150 -20 Z" />
          </clipPath>

          <radialGradient cx="42%" cy="34%" id="hall-sky" r="78%">
            <stop offset="0%" stopColor="#0b1120" />
            <stop offset="62%" stopColor="#05070e" />
            <stop offset="100%" stopColor="#010205" />
          </radialGradient>

          {/* La banda lechosa vive al filo de lo perceptible: en la primera
              captura a 2× pesaba como una mancha gris y la referencia no tiene
              manchas, tiene vacío. */}
          <linearGradient id="hall-band" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#f2c879" stopOpacity="0" />
            <stop offset="45%" stopColor="#bda081" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#7fe5ff" stopOpacity="0.03" />
          </linearGradient>

          <radialGradient cx="72%" cy="66%" id="hall-planet" r="62%">
            <stop offset="0%" stopColor="#10151f" />
            <stop offset="70%" stopColor="#05070c" />
            <stop offset="100%" stopColor="#020308" />
          </radialGradient>

          <linearGradient id="hall-limb" x1="0.1" x2="0.9" y1="0" y2="1">
            <stop offset="0%" stopColor="#ffe6b4" />
            <stop offset="38%" stopColor="#f2c879" />
            <stop offset="78%" stopColor="#8a6a38" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f2c879" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="hall-jamb" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#f2c879" stopOpacity="0" />
            <stop offset="55%" stopColor="#f2c879" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#f2c879" stopOpacity="0.55" />
          </linearGradient>

          <linearGradient id="hall-floor" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#070a12" />
            <stop offset="100%" stopColor="#010204" />
          </linearGradient>

          <filter id="hall-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
          <filter id="hall-soft" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter id="hall-mirror" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="11" />
          </filter>
        </defs>

        {/* La pared. Todo lo que no es ventanal es esto. */}
        <rect fill="#020308" height="900" width="1600" x="0" y="0" />

        <g clipPath="url(#hall-window)">
          <rect fill="url(#hall-sky)" height="820" width="480" x="150" y="-20" />

          {/* La banda lechosa, muy por debajo del umbral de «decoración». */}
          <ellipse
            cx="380"
            cy="230"
            fill="url(#hall-band)"
            rx="300"
            ry="74"
            transform="rotate(-34 380 230)"
          />

          {STARS.map((star) => (
            <circle
              cx={star.x}
              cy={star.y}
              fill="#dce8ff"
              key={star.key}
              opacity={star.opacity}
              r={star.radius}
            />
          ))}

          {/*
            El cuerpo y su limbo. El centro cae muy fuera del ventanal, así que
            lo que entra es un arco largo y casi recto: la curva de un mundo
            visto de cerca, que es de donde sale la escala. El relleno es más
            oscuro que el cielo — un planeta a contraluz es un agujero con un
            filo, no una esfera iluminada.
          */}
          <circle cx="1571" cy="931" fill="url(#hall-planet)" r="1250" />
          <circle
            cx="1571"
            cy="931"
            fill="none"
            filter="url(#hall-glow)"
            opacity="0.5"
            r="1250"
            stroke="url(#hall-limb)"
            strokeWidth="22"
          />
          <circle
            cx="1571"
            cy="931"
            fill="none"
            r="1250"
            stroke="url(#hall-limb)"
            strokeWidth="2.6"
          />

          {/* El cuerpo eclipsado: el único objeto identificable del cuadro. */}
          <g>
            <circle
              cx="452"
              cy="196"
              fill="none"
              filter="url(#hall-soft)"
              opacity="0.7"
              r="27"
              stroke="#ffe6b4"
              strokeWidth="4"
            />
            <circle cx="452" cy="196" fill="#010205" r="26" />
            <circle
              cx="452"
              cy="196"
              fill="none"
              r="26.8"
              stroke="#ffe9c2"
              strokeWidth="1.1"
            />
          </g>
        </g>

        {/*
          Los cantos de la arquitectura. Dos jambas y la curva del ventanal,
          encendidas de abajo arriba: la luz cae del suelo pulido, no de una
          lámpara. Son tres líneas de un píxel y hacen todo el trabajo que en la
          referencia hace un decorado entero.
        */}
        <path
          d="M 150 -20 L 150 640 Q 150 792 300 792 L 528 792 Q 620 792 620 700 L 620 -20"
          fill="none"
          opacity="0.9"
          stroke="url(#hall-jamb)"
          strokeWidth="1.6"
        />

        {/* El suelo, y el encuentro con la pared. */}
        <rect fill="url(#hall-floor)" height="140" width="1600" x="0" y="760" />
        <path
          d="M 0 792 L 1600 792"
          opacity="0.28"
          stroke="#f2c879"
          strokeWidth="0.8"
        />

        {/*
          La luz que entra. Un haz tumbado sobre la piedra y su reflejo: es lo
          que hace que el ventanal ILUMINE la sala en vez de quedarse detrás del
          cristal como una lámina. Dos formas desenfocadas, ningún volumen.
        */}
        <path
          d="M 210 796 L 640 796 L 900 900 L 60 900 Z"
          fill="#f2c879"
          filter="url(#hall-mirror)"
          opacity="0.07"
        />
        <ellipse
          cx="404"
          cy="826"
          fill="#f2c879"
          filter="url(#hall-mirror)"
          opacity="0.17"
          rx="238"
          ry="26"
        />

        {/*
          LA FIGURA.

          Mide 54 de 900 —un 6 % del alto— delante de un ventanal de 800. Ésa
          proporción es todo el argumento: sin ella la sala podría medir cuatro
          metros. Es una silueta geométrica y no una ilustración, porque en
          Jonas Orbit no hay gente dibujada en ninguna parte y una figura con
          rasgos convertiría la recepción en una lámina.
        */}
        <g opacity="0.92" transform="translate(357 792) scale(1.5) translate(-357 -792)">
          <ellipse cx="357" cy="793" fill="#000" opacity="0.5" rx="16" ry="3" />
          <path
            d="M 357 739 a 5.4 5.4 0 1 1 0.1 0 Z M 348.4 752 q 8.6 -4.4 17.2 0 l 2.6 21 -4.8 1.4 1.2 17.6 -6.4 0 -1.2 -13 -1.2 13 -6.4 0 1.2 -17.6 -4.8 -1.4 Z"
            fill="#04060b"
          />
          <path
            d="M 366 752 q 2.4 1 2.6 2.4 l 2 18 -3 0.8 Z"
            fill="#f2c879"
            opacity="0.4"
          />
          {/* Su reflejo, invertido y apagado. */}
          <path
            d="M 348.4 834 q 8.6 4.4 17.2 0 l 2.6 -21 -4.8 -1.4 1.2 -17.6 -6.4 0 -1.2 13 -1.2 -13 -6.4 0 1.2 17.6 -4.8 1.4 Z"
            fill="#0a0e16"
            filter="url(#hall-soft)"
            opacity="0.55"
          />
        </g>
      </svg>

      {/* La viñeta y el degradado del pie viven en CSS: son dos capas planas y
          no tienen por qué pagar un nodo de SVG. */}
      <div className="experiments-hall__vignette" />
    </div>
  );
}

export function ExperimentsPage({
  world,
  locale,
}: {
  world: World;
  locale: Locale;
}) {
  const { prose } = world;
  const { previous, next } = getWorldNeighbours(world, locale);
  const specimens = observatoryCatalog(locale);

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
        breadcrumb={{ path: getWorldPath(world, locale), name: prose.title }}
      />

      <ExperimentsHall />

      {/*
        El rótulo vertical. Es la única frase de la página que no informa de
        nada, y por eso va en el canto: dice a qué se viene antes de que haya
        nada que leer. Sale del cierre escrito del mundo, no de un eslogan
        inventado para la ocasión.
      */}
      <p aria-hidden="true" className="experiments-page__edge">
        Algunas cosas merecen una mirada más larga
      </p>

      <div className="experiments-page__inner">
        <header className="experiments-head">
          <p className="experiments-head__kicker">
            Destino {String(world.order).padStart(2, "0")}
            <span aria-hidden="true" className="experiments-head__sep">
              /
            </span>
            {world.cosmicName}
          </p>
          <h1 className="experiments-head__title">{prose.title}</h1>
          <p className="experiments-head__eyebrow">{prose.eyebrow}</p>
          <p className="experiments-head__intro">{prose.introduction}</p>
        </header>

        <ExperimentsIndex specimens={specimens} />

        {/*
          El laboratorio dice en qué consiste observar aquí, y lo dice una vez.
          Tres hechos del MDX, sin caja ni icono: la densidad que la recepción
          se puede permitir está toda en el índice.
        */}
        <dl className="experiments-facts">
          {prose.facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>

        <p className="experiments-page__closing">
          <span aria-hidden="true">{"//"}</span> {prose.closing}
        </p>

        <nav aria-label="Destinos contiguos" className="experiments-neighbours">
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
                  Destino {String(next.order).padStart(2, "0")} ·{" "}
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
