import type { CSSProperties, ReactNode } from "react";
import { sampleTesseract, TESSERACT_FACETS, TESSERACT_PATH } from "@/lib/tesseract";
import type { WorldNavItem } from "@/lib/worlds";
import styles from "./flat-world-body.module.css";

type FlatWorld = Pick<
  WorldNavItem,
  "id" | "visual" | "accent" | "secondary"
>;

/**
 * Los cuatro brazos de la Endurance, y sus tres módulos cada uno.
 *
 * Espeja la arquitectura del modelo 3D (`enduranceModel`): un módulo principal
 * en el eje del brazo, dos satélites a 22° y riel desnudo entre grupos. Doce
 * módulos repartidos cada 30° —que es lo que había aquí— era justo la lectura
 * de «nube de cubos» que el rediseño retiró.
 */
const ENDURANCE_GROUPS = [0, 90, 180, 270] as const;
const ENDURANCE_SLOT_SPREAD = 22;
const ENDURANCE_MODULES = ENDURANCE_GROUPS.flatMap((group) => [
  { angle: group - ENDURANCE_SLOT_SPREAD, primary: false },
  { angle: group, primary: true },
  { angle: group + ENDURANCE_SLOT_SPREAD, primary: false },
]);

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


/**
 * Endurance en `flat`, con la MISMA arquitectura que el modelo 3D.
 *
 * No es una ilustración libre: si el frame estático dibujara doce módulos
 * iguales cada 30° y la escena WebGL cuatro grupos de tres con cuatro brazos,
 * el mismo destino contaría dos cosas distintas según el equipo del visitante
 * —y en un equipo con movimiento reducido, ÉSTA es la única versión que se ve.
 * El orden de lectura es el mismo: núcleo, rieles, brazos, grupos, secundarios.
 */
function Endurance() {
  return (
    <svg viewBox="0 0 150 150" focusable="false">
      <defs>
        <linearGradient id="flat-endurance-hull" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ffffff" />
          <stop offset="0.34" stopColor="#c9cdd0" />
          <stop offset="0.72" stopColor="#777d83" />
          <stop offset="1" stopColor="#272d33" />
        </linearGradient>
        <linearGradient id="flat-endurance-blanket" x1="0" y1="0" x2="0.7" y2="1">
          <stop stopColor="#b5bbc0" />
          <stop offset="0.55" stopColor="#7d858b" />
          <stop offset="1" stopColor="#2c3238" />
        </linearGradient>
        <radialGradient id="flat-endurance-hub">
          <stop stopColor="#e9edf0" />
          <stop offset="0.58" stopColor="#70777e" />
          <stop offset="1" stopColor="#12171c" />
        </radialGradient>
      </defs>
      <g transform="rotate(-18 75 75)">
        {/* Estructura primaria: dos rieles continuos cierran la circunferencia
            entera, también donde no hay módulos. */}
        <circle cx="75" cy="75" r="48" fill="none" stroke="#8d99a1" strokeOpacity="0.6" strokeWidth="1.8" />
        <circle cx="75" cy="75" r="56" fill="none" stroke="#8d99a1" strokeOpacity="0.6" strokeWidth="1.8" />

        {ENDURANCE_GROUPS.map((angle) => (
          <g key={`bay-${angle}`} transform={`rotate(${angle} 75 75)`}>
            {/* Radiador en el plano del anillo, alineado con el brazo. */}
            <g data-flat-part="radiator">
              <rect x="64" y="4" width="22" height="14" rx="1" fill="#161d24" stroke="#5d686f" strokeOpacity="0.8" strokeWidth="0.8" />
              <path d="M68 5v12M72 5v12M76 5v12M80 5v12" stroke="#3d4750" strokeWidth="0.7" />
            </g>
            {/* Brazo: dos cordones, travesaños y diagonales alternas. */}
            <g data-flat-part="arm" fill="none">
              <path d="M71 58V27M79 58V27" stroke="#ccd3d7" strokeWidth="2.6" />
              <path d="M71 55h8M71 47h8M71 39h8M71 31h8" stroke="#78838b" strokeWidth="1.1" />
              <path d="m71 55 8-8M79 47l-8-8M71 39l8-8" stroke="#78838b" strokeWidth="0.9" />
            </g>
          </g>
        ))}

        {ENDURANCE_MODULES.map(({ angle, primary }) => (
          <g
            data-flat-part="module"
            data-flat-module={primary ? "primary" : "satellite"}
            key={angle}
            transform={`rotate(${angle} 75 75)`}
          >
            <rect
              x={primary ? 62 : 65.5}
              y={primary ? 14 : 17}
              width={primary ? 26 : 19}
              height={primary ? 18 : 14}
              rx="2.5"
              fill={primary ? "url(#flat-endurance-hull)" : "url(#flat-endurance-blanket)"}
              stroke="#f4f1e8"
              strokeOpacity={primary ? 0.6 : 0.34}
            />
            <path
              d={primary ? "M68 15v16M75 15v16M82 15v16" : "M70 18v12M76 18v12M81 18v12"}
              stroke="#333a40"
              strokeOpacity="0.5"
              strokeWidth="0.8"
            />
            {primary ? (
              <>
                <rect x="70" y="30" width="10" height="3.2" rx="0.8" fill="var(--flat-accent)" opacity="0.8" />
                <circle cx="75" cy="38" r="1.5" fill="var(--flat-secondary)" />
              </>
            ) : null}
          </g>
        ))}

        {/* Naves atracadas: dos Ranger y dos Lander junto a los módulos
            principales. Van a un lado del brazo, no encima: en planta, una
            nave centrada sobre el brazo se lee como una pieza más de la
            celosía y deja de contar la escala, que es lo único que aporta. */}
        <g data-flat-part="docked-craft" fill="#c8cfd3" stroke="#151a1e" strokeWidth="0.7">
          {ENDURANCE_GROUPS.map((angle, index) => (
            <g key={angle} transform={`rotate(${angle} 75 75)`}>
              {index % 2 === 0 ? (
                <path d="m92 32-8 6 8 5 8-5Z" />
              ) : (
                <rect x="85" y="32" width="13" height="10" rx="2" />
              )}
            </g>
          ))}
        </g>

        {/* Núcleo: barril axial visto de frente, con su collar de atraque y las
            cuatro campanas del bloque de popa asomando alrededor. */}
        <g data-flat-part="engine-bank" fill="#080d11" stroke="#c2c9cd" strokeWidth="0.8">
          <circle cx="62" cy="62" r="3.4" />
          <circle cx="88" cy="62" r="3.4" />
          <circle cx="88" cy="88" r="3.4" />
          <circle cx="62" cy="88" r="3.4" />
        </g>
        <circle cx="75" cy="75" r="16" fill="url(#flat-endurance-hub)" stroke="#e8ecee" strokeOpacity="0.72" />
        <circle cx="75" cy="75" r="9.5" fill="none" stroke="#0d1216" strokeOpacity="0.65" strokeWidth="1.4" />
        <circle cx="75" cy="75" r="5" fill="#090d11" stroke="var(--flat-secondary)" strokeOpacity="0.5" />
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

const DRAWINGS: Partial<Record<WorldNavItem["visual"], () => ReactNode>> = {
  tesseract: Tesseract,
  water: Miller,
  ship: Endurance,
  desert: Edmunds,
  beacon: Ranger,
};

/**
 * Representación estática de un destino para el perfil `flat`.
 *
 * Vive dentro del mismo slot DOM que el proxy interactivo, por lo que hereda
 * posición y target sin inventar otro mapa. Gargantúa se omite porque ya la
 * pinta SiteBackdrop. La capa completa es decorativa y no recibe puntero.
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
