import type { CSSProperties, ReactNode } from "react";
import { sampleTesseract, TESSERACT_FACETS, TESSERACT_PATH } from "@/lib/tesseract";
import type { WorldNavItem } from "@/lib/worlds";
import styles from "./flat-world-body.module.css";

type FlatWorld = Pick<
  WorldNavItem,
  "id" | "visual" | "accent" | "secondary"
>;

/** Dieciséis módulos y dos tubos de acoplamiento, como en el modelo 3D. */
const ENDURANCE_MODULES = Array.from({ length: 16 }, (_, index) => ({
  angle: index * 22.5,
  primary: index % 4 === 0,
}));

/** El hipercubo de cristal, congelado: la misma topología que WebGL y su
 *  misma pose inicial, sin una sola animación. En un equipo con movimiento
 *  reducido este dibujo es el ÚNICO Tesseracto que se ve. */
function Tesseract() {
  const vertices = new Float32Array(48), cells = new Float32Array(16);
  sampleTesseract(0, vertices, cells);
  const points = Array.from({ length: 16 }, (_, i) => {
    const x = vertices[i * 3], y = vertices[i * 3 + 1], z = vertices[i * 3 + 2];
    return [70 + (x * 0.92 + z * 0.38) * 35, 70 + (-y * 0.92 + z * 0.30 - x * 0.13) * 35];
  });
  const line = (a: number, b: number) => "M" + points[a].join(" ") + "L" + points[b].join(" ");
  /* La misma jerarquía de la cuarta dimensión que en WebGL, y por el mismo
     motivo: con las treinta y dos aristas al mismo grosor esto es una jaula
     plana. Aquí no hay shader, así que el reparto viaja en el ancho de trazo
     y en la opacidad, que es exactamente lo que haría alguien dibujándolo. */
  const cell = (a: number, b: number) => (cells[a] + cells[b]) * 0.5;
  return <svg viewBox="0 0 140 140" focusable="false">
    <defs>
      <linearGradient id="flat-tesseract-crystal" x1="0" y1="1" x2="1" y2="0">
        <stop stopColor="#725bdd" /><stop offset="0.5" stopColor="#82d6ee" /><stop offset="1" stopColor="#d9faff" />
      </linearGradient>
    </defs>
    <g strokeLinejoin="round" fill="none">
      {TESSERACT_FACETS.map((face, i) => <path key={i} data-flat-part="crystal-facet"
        d={"M" + face.map((v) => points[v].join(" ")).join("L") + "Z"}
        fill={i % 2 ? "#98d8ef" : "#7966cd"}
        fillOpacity={0.05 + cell(face[0], face[2]) * 0.07} />)}
      {TESSERACT_PATH.map(([a, b], i) => <path key={i} data-flat-part="crystal-edge"
        d={line(a, b)} stroke="url(#flat-tesseract-crystal)"
        strokeOpacity={(0.34 + cell(a, b) * 0.52).toFixed(3)}
        strokeWidth={(0.72 + cell(a, b) * 1.25).toFixed(3)} />)}
      {TESSERACT_PATH.slice(0, 11).map(([a, b], i) => <path key={i} data-flat-part="drawing-light"
        d={line(a, b)} stroke={i > 8 ? "#efffff" : "#77dffa"}
        strokeWidth={(0.75 + i * 0.055).toFixed(3)} strokeOpacity={(0.26 + i * 0.068).toFixed(3)} />)}
    </g>
  </svg>;
}

function Miller() {
  return (
    <svg viewBox="0 0 120 120" focusable="false">
      <defs>
        <radialGradient id="flat-miller-ocean" cx="77%" cy="72%" r="91%">
          <stop stopColor="#91a8b0" /><stop offset="0.25" stopColor="#425f74" />
          <stop offset="0.57" stopColor="#1d334a" /><stop offset="0.84" stopColor="#080e1b" />
          <stop offset="1" stopColor="#04070e" />
        </radialGradient>
        <radialGradient id="flat-miller-night" cx="82%" cy="80%" r="93%">
          <stop offset="0.3" stopColor="#020713" stopOpacity="0" />
          <stop offset="0.8" stopColor="#020713" stopOpacity="0.62" />
          <stop offset="1" stopColor="#020713" stopOpacity="0.92" />
        </radialGradient>
        <clipPath id="flat-miller-disc"><circle cx="60" cy="60" r="45" /></clipPath>
        <filter id="flat-miller-currents" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.026 0.095" numOctaves="2" seed="8" result="current" />
          <feDisplacementMap in="SourceGraphic" in2="current" scale="5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <circle data-flat-part="planet" cx="60" cy="60" r="45" fill="url(#flat-miller-ocean)" />
      <g clipPath="url(#flat-miller-disc)">
        <g data-flat-part="ocean" fill="none" filter="url(#flat-miller-currents)" transform="rotate(-18 60 60)">
          {[31, 40, 49, 57, 65, 72, 79, 85, 92].map((y, i) => <path key={y} d={`M8 ${y} Q38 ${y + 8} 61 ${y + 2} T114 ${y - 2}`} stroke={i % 3 === 0 ? "#b1c8cd" : "#557e96"} strokeWidth={i % 3 === 0 ? 1.3 : 2.4} opacity={0.16 + i * 0.024} />)}
          <path d="M65 78Q78 84 101 76" stroke="#ebe1c6" strokeWidth="2.6" opacity="0.65" />
          <path d="M71 81Q83 84 101 79" stroke="#f5edda" strokeWidth="0.8" opacity="0.7" />
        </g>
        <circle cx="60" cy="60" r="45" fill="url(#flat-miller-night)" />
      </g>
      <path d="M97 36A45 45 0 0 1 51 104" fill="none" stroke="#b7c3c2" strokeWidth="0.85" opacity="0.7" />
      <path d="M30 26A45 45 0 0 0 17 73" fill="none" stroke="#3c567d" strokeWidth="0.65" opacity="0.48" />
    </svg>
  );
}


/** Esquema del mismo anillo modular para la versión sin WebGL. */
function Endurance() {
  return (
    <svg viewBox="0 0 150 150" focusable="false">
      <defs>
        <linearGradient id="flat-endurance-hull" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#f2f1e8" /><stop offset="0.6" stopColor="#b8c0c3" />
          <stop offset="1" stopColor="#53616b" />
        </linearGradient>
      </defs>
      <g transform="rotate(-18 75 75)">
        {ENDURANCE_MODULES.map(({ angle }) => (
          <g key={angle} transform={`rotate(${angle + 11.25} 75 75)`} data-flat-part="connector">
            <path d="M63.5 23H86.5" stroke="#36424a" strokeWidth="3.8" />
            <path d="M72 23H73.5M76.5 23H78" stroke="#c5cece" strokeWidth="5.4" />
          </g>
        ))}
        {[0, 180].map((angle) => (
          <g key={angle} transform={`rotate(${angle} 75 75)`} data-flat-part="arm">
            <path d="M75 29V65" stroke="#bac6ca" strokeWidth="4.3" />
            <path d="M72 34H78M72 47H78M72 59H78" stroke="#68747b" strokeWidth="2" />
          </g>
        ))}
        {ENDURANCE_MODULES.map(({ angle, primary }) => (
          <g key={angle} transform={`rotate(${angle} 75 75)`}
            data-flat-part="module" data-flat-module={primary ? "primary" : "satellite"}>
            <rect x={primary ? 68.4 : 69} y={primary ? 13.5 : 14.5}
              width={primary ? 13.2 : 12} height={primary ? 15 : 13.5}
              rx="0.8" fill="url(#flat-endurance-hull)" stroke="#dde1dd" strokeWidth="0.45" />
            <g data-flat-part="thermal-panel">
              <rect x="70.8" y="15.5" width="8.4" height="8.5" fill="#303f49" stroke="#e4e6db" strokeWidth="0.5" />
              <path d="M71 18h8M71 20h8M71 22h8" stroke="#76898e" strokeWidth="0.5" />
              <path d="M75 15.5v8.5" stroke="#c4cdcc" strokeWidth="0.5" />
            </g>
            <path d="M71 26h1M74 26h1M77 26h1" stroke="#28343d" strokeWidth="1.2" />
          </g>
        ))}
        <g data-flat-part="engine-bank" fill="#11191d" stroke="#a9b6be" strokeWidth="0.7">
          {[[-4, -4], [-4, 4], [4, -4], [4, 4]].map(([x, y]) =>
            <circle key={`${x}/${y}`} cx={75 + x} cy={75 + y} r="3" />)}
        </g>
        <circle cx="75" cy="75" r="10.3" fill="url(#flat-endurance-hull)" stroke="#89999e" strokeWidth="1.2" />
        <circle data-flat-part="docking-cavity" cx="75" cy="75" r="6.5"
          fill="#121b20" stroke="#e4e6dd" strokeWidth="1.6" />
        {[0, 180].map((angle) => (
          <g key={angle} transform={`rotate(${angle} 75 75)`} data-flat-part="docked-craft">
            <path d="M85 73h7v4h-7Z" fill="#35434b" />
            <path d="M109 75 89 67 90 83Z" fill="url(#flat-endurance-hull)" stroke="#283740" strokeWidth="0.7" />
            <path d="M105 74 96 72 96 78 105 76Z" fill="#152830" />
            <path d="M101 73v4" stroke="#c4cecc" strokeWidth="0.7" />
          </g>
        ))}
      </g>
    </svg>
  );
}

function Edmunds() {
  return (
    <svg viewBox="0 0 120 120" focusable="false">
      <defs>
        <radialGradient id="flat-edmunds-terrain" cx="80%" cy="25%" r="85%">
          <stop stopColor="#c5a075" /><stop offset="0.30" stopColor="#876044" />
          <stop offset="0.67" stopColor="#3e2c26" /><stop offset="1" stopColor="#080b10" />
        </radialGradient>
        <linearGradient id="flat-edmunds-night" x1="1" y1="0.3" x2="0" y2="0.65">
          <stop offset="0.35" stopColor="#06090f" stopOpacity="0" />
          <stop offset="0.72" stopColor="#06090f" stopOpacity="0.7" />
          <stop offset="1" stopColor="#06090f" stopOpacity="0.97" />
        </linearGradient>
        <clipPath id="flat-edmunds-disc"><circle cx="60" cy="60" r="45" /></clipPath>
        <filter id="flat-edmunds-rock" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" seed="21" result="rock" />
          <feDisplacementMap in="SourceGraphic" in2="rock" scale="11" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <circle data-flat-part="planet" cx="60" cy="60" r="45" fill="url(#flat-edmunds-terrain)" />
      <g clipPath="url(#flat-edmunds-disc)">
        <g data-flat-part="terrain" filter="url(#flat-edmunds-rock)">
          <path d="M45 13 79 20 87 34 73 53 91 67 77 84 59 75 52 53 32 41Z" fill="#c4a17a" opacity="0.49" />
          <path d="M67 16 60 35 70 45 53 61 62 80 43 101 26 70 31 28Z" fill="#392c25" opacity="0.8" />
          <path d="M89 48 107 59 108 83 85 100 69 84 77 67Z" fill="#ab794e" opacity="0.52" />
          <path d="M55 26 76 31 83 41 76 49 67 41Z" fill="#d8b98d" opacity="0.65" />
          <path d="M53 70 68 62 80 42M66 88 80 69 91 59M43 47 59 34" fill="none" stroke="#dbb386" strokeWidth="1.2" opacity="0.5" />
          <path d="M50 73 65 64 77 41M63 89 77 70 89 59" fill="none" stroke="#291f1c" strokeWidth="1.8" opacity="0.72" />
        </g>
        <circle cx="60" cy="60" r="45" fill="url(#flat-edmunds-night)" />
      </g>
      <path d="M67 15A45 45 0 0 1 96 87" fill="none" stroke="#d4b490" strokeWidth="0.9" opacity="0.7" />
    </svg>
  );
}


/**
 * Ranger en `flat`: la misma nave que el modelo 3D, en planta.
 *
 * La versión anterior era el lifting body sin proa que la escena ya no usa. Se
 * dibuja en planta y no en tres cuartos porque en un glifo de 160 px la planta
 * es la lectura más clara que existe de una nave: flecha, góndolas y cabina de
 * un vistazo. La identidad —proa facetada, ala en flecha con borde de ataque
 * marcado, dos góndolas con tobera, deriva en V— es la del modelo.
 */
function Ranger() {
  return (
    <svg viewBox="0 0 160 90" focusable="false">
      <defs>
        <linearGradient id="flat-ranger-hull" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop stopColor="#ffffff" />
          <stop offset="0.46" stopColor="#c3c9cd" />
          <stop offset="0.78" stopColor="#626b72" />
          <stop offset="1" stopColor="#1a2025" />
        </linearGradient>
        <linearGradient id="flat-ranger-wing" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop stopColor="#9aa3aa" />
          <stop offset="0.6" stopColor="#5e666d" />
          <stop offset="1" stopColor="#232a30" />
        </linearGradient>
        <linearGradient id="flat-ranger-canopy" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop stopColor="#b9e4ed" />
          <stop offset="0.38" stopColor="#4e7888" />
          <stop offset="1" stopColor="#111b22" />
        </linearGradient>
      </defs>
      <g transform="rotate(-4 80 45)">
        {/* Alas en flecha, con el larguero oscuro del borde de ataque. */}
        <g data-flat-part="wing">
          <path d="M74 30 13 62l7 9 52 3Z" fill="url(#flat-ranger-wing)" stroke="#dfe6ea" strokeOpacity="0.4" strokeWidth="0.8" />
          <path d="M86 30l61 32-7 9-52 3Z" fill="url(#flat-ranger-wing)" stroke="#dfe6ea" strokeOpacity="0.4" strokeWidth="0.8" />
          <path d="M74 30 13 62M86 30l61 32" stroke="#0d1216" strokeOpacity="0.85" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M62 44 32 60M98 44l30 16" stroke="#2b333a" strokeOpacity="0.55" strokeWidth="0.9" />
          <rect x="12" y="58" width="10" height="6" rx="2" fill="#aab2b8" stroke="#151a1e" strokeWidth="0.6" />
          <rect x="138" y="58" width="10" height="6" rx="2" fill="#aab2b8" stroke="#151a1e" strokeWidth="0.6" />
        </g>

        {/* Deriva en V: dos planos inclinados, no dos aletas verticales. */}
        <g data-flat-part="tail" fill="#767f86" stroke="#161c21" strokeWidth="0.7">
          <path d="m74 56-12 18 7 2 8-14Z" />
          <path d="m86 56 12 18-7 2-8-14Z" />
        </g>

        {/* Góndolas con anillo y tobera oscura. */}
        <g data-flat-part="engines">
          <rect x="63" y="52" width="12" height="26" rx="5" fill="url(#flat-ranger-hull)" stroke="#e6ebee" strokeOpacity="0.45" strokeWidth="0.7" />
          <rect x="85" y="52" width="12" height="26" rx="5" fill="url(#flat-ranger-hull)" stroke="#e6ebee" strokeOpacity="0.45" strokeWidth="0.7" />
          <path d="M63 62h12M85 62h12" stroke="#39424a" strokeWidth="0.9" />
          <ellipse cx="69" cy="78" rx="6.4" ry="3" fill="#05080b" stroke="#b7c1c7" strokeWidth="0.8" />
          <ellipse cx="91" cy="78" rx="6.4" ry="3" fill="#05080b" stroke="#b7c1c7" strokeWidth="0.8" />
          <ellipse cx="69" cy="78" rx="2.6" ry="1.2" fill="var(--flat-accent)" opacity="0.75" />
          <ellipse cx="91" cy="78" rx="2.6" ry="1.2" fill="var(--flat-accent)" opacity="0.75" />
        </g>

        {/* Fuselaje y proa facetada. */}
        <path
          data-flat-part="fuselage"
          d="M80 5 89 24l2 40-4 12H73l-4-12 2-40Z"
          fill="url(#flat-ranger-hull)"
          stroke="#eef2f3"
          strokeOpacity="0.72"
        />
        <path d="M80 5v71" stroke="#2f373d" strokeOpacity="0.45" strokeWidth="0.8" />
        <path data-flat-part="keel" d="M73 40h14l-1 26H74Z" fill="#0a0f14" opacity="0.55" />
        <path
          data-flat-part="cockpit"
          d="M80 15l6 8-1 12h-10l-1-12Z"
          fill="url(#flat-ranger-canopy)"
          stroke="#d9eef2"
          strokeOpacity="0.75"
        />
        <path d="M80 16v19" stroke="#dceff3" strokeOpacity="0.5" strokeWidth="0.7" />
        <path
          data-flat-part="service-panels"
          d="M71 44h6v7h-6zm12 0h6v7h-6z"
          fill="#a95f31"
          fillOpacity="0.85"
          stroke="#f0b17c"
          strokeOpacity="0.45"
          strokeWidth="0.55"
        />

        <g data-flat-part="beacon" fill="var(--flat-accent)">
          <circle cx="17" cy="61" r="2" />
          <circle cx="143" cy="61" r="2" />
          <circle cx="80" cy="7" r="1.6" />
        </g>
      </g>
    </svg>
  );
}

/**
 * GARGANTÚA SIN GPU, y por qué hacía falta.
 *
 * Este componente cubría cinco de los seis visuales y devolvía `null` para el
 * sexto, con el argumento de que «ya la pinta SiteBackdrop». Era cierto en el
 * System Map y dejó de serlo al montar el Observatorio: la cara servida de
 * `/es/experimentos/observatorio/gargantua` usa esta misma figura como esquema
 * del espécimen, así que sin dibujo la ruta salía sin cuerpo justo para quien
 * no tiene JavaScript ni equipo — que es a quien O7 y O8 protegen.
 *
 * ── Qué se dibuja, y qué NO se intenta dibujar ──────────────────────────────
 *
 * No es una miniatura del raymarch. Un agujero negro sin integrador no tiene
 * arcos lensados ni anillo de fotones, y fingirlos con elipses habría sido
 * exactamente el dato inventado que este proyecto persigue. Lo que se dibuja
 * son las tres cosas que SÍ son ciertas sin integrar nada:
 *
 *  · **La sombra**, un disco negro. Su radio sale de la geometría real —el
 *    parámetro de impacto crítico, √27/2 · rs ≈ 2.6 rs— y no de lo que quede
 *    bien: es la misma cifra que `placement.size` publica para el blanco de
 *    clic del mapa.
 *  · **El disco de acreción visto de canto**, con el borde interior y el
 *    exterior en su proporción real (1.58 y 17 rs). Por eso la elipse es tan
 *    ancha comparada con la sombra: ésa ES la relación.
 *  · **El reparto de luz entre los dos lados**, que es lo único que el ojo
 *    identifica de inmediato. El lado que se acerca llega crema y el que se
 *    aleja, cobre apagado — la asimetría del §14 duodecies punto 5, dicha con
 *    un degradado en vez de con un beaming.
 *
 * El arco que cruza por encima de la sombra se dibuja porque es la lectura
 * central de la composición aprobada —la cara lejana del disco doblada por la
 * gravedad— y se dibuja como lo que es: la continuación de la misma elipse,
 * no una segunda figura.
 */
function Gargantua() {
  /*
    Las proporciones, todas derivadas de la geometría y ninguna elegida:
    sombra 2.6 rs, disco de 1.58 a 17 rs. A 3.5 px por rs la sombra mide 9.1 de
    radio y el disco llega a 59.5, que es lo que hace que quepa en 140.
  */
  const PX = 3.5;
  const shadow = 2.598 * PX;
  const outer = 17 * PX;
  const inner = 1.58 * PX;
  // Canto: el semieje menor es el mayor por el seno de la elevación de la pose
  // aprobada, 9°. El mismo aplanamiento de 6.39 : 1 que fija `scene-poses.ts`.
  const squash = Math.sin((9 * Math.PI) / 180);
  return (
    <svg viewBox="0 0 140 140" focusable="false">
      <defs>
        <linearGradient id="flat-gargantua-disk" x1="0" y1="0" x2="1" y2="0">
          {/* Izquierda el lado que se acerca: más luz, más densidad y más
              crema. Derecha el que se aleja: cobre y apagado. */}
          <stop stopColor="#fff4e2" stopOpacity="0.95" />
          <stop offset="0.42" stopColor="#f3c489" stopOpacity="0.78" />
          <stop offset="1" stopColor="#9e5a26" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <g data-flat-part="disk" fill="none" stroke="url(#flat-gargantua-disk)">
        {/* Tres trazos entre el borde interior y el exterior: el disco no es
            una línea, es una extensión radial con estructura. */}
        {[0.34, 0.62, 0.92].map((t, i) => {
          const rx = inner + (outer - inner) * t;
          return (
            <ellipse
              key={t}
              cx="70"
              cy="70"
              rx={rx.toFixed(2)}
              ry={Math.max(1.4, rx * squash).toFixed(2)}
              strokeWidth={(3.4 - i * 0.7).toFixed(2)}
              strokeOpacity={(0.8 - i * 0.2).toFixed(2)}
            />
          );
        })}
      </g>
      {/* El arco de la cara lejana, doblado por encima de la sombra. Es la
          MISMA elipse vista por detrás: media vuelta, no otra figura. */}
      <path
        data-flat-part="lensed"
        d={`M ${70 - outer * 0.52} 70 A ${outer * 0.52} ${shadow * 1.5} 0 0 1 ${70 + outer * 0.52} 70`}
        fill="none"
        stroke="url(#flat-gargantua-disk)"
        strokeWidth="2.6"
        strokeOpacity="0.62"
      />
      {/* Y la sombra encima de todo: es lo único que no deja pasar nada. */}
      <circle
        cx="70"
        cy="70"
        data-flat-part="shadow"
        fill="#000"
        r={shadow.toFixed(2)}
      />
    </svg>
  );
}

const DRAWINGS: Partial<Record<WorldNavItem["visual"], () => ReactNode>> = {
  tesseract: Tesseract,
  water: Miller,
  ship: Endurance,
  desert: Edmunds,
  beacon: Ranger,
  "black-hole": Gargantua,
};

/**
 * Representación estática de un destino para el perfil `flat`.
 *
 * Vive dentro del mismo slot DOM que el proxy interactivo, por lo que hereda
 * posición y target sin inventar otro mapa. La capa completa es decorativa y no
 * recibe puntero.
 *
 * Los seis están dibujados desde que el Observatorio monta a Gargantúa: en el
 * System Map su figura la pone `SiteBackdrop`, pero la cara servida del
 * laboratorio usa ESTE componente como esquema del espécimen, y ahí no hay
 * nadie más que la dibuje.
 */
export function FlatWorldBody({ world }: { world: FlatWorld }) {
  const Drawing = DRAWINGS[world.visual];
  if (!Drawing) return null;

  return (
    <span
      aria-hidden="true"
      className={`${styles.body} ${styles[world.visual]}`}
      data-flat-visual={world.visual}
      data-flat-world={world.id}
      style={
        {
          "--flat-accent": world.accent,
          "--flat-secondary": world.secondary,
        } as CSSProperties
      }
    >
      <Drawing />
    </span>
  );
}
