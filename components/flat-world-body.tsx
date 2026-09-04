import type { CSSProperties, ReactNode } from "react";
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

/**
 * Tesseracto en `flat`: la misma arquitectura imposible del modelo 3D.
 *
 * Una caja de vigas gruesas con su techo en fuga, y dentro tres marcos
 * anidados que caen hacia un vacío. La luz sube hacia adentro —la caja no
 * emite, el último marco es la brasa— y una arista del marco de delante se
 * parte y continúa desplazada, que es la contradicción que también se ve en la
 * escena. Grafito y tungsteno; nada de cian: este cuerpo no usa el secundario
 * frío de su ficha.
 */
function Tesseract() {
  return (
    <svg viewBox="0 0 120 120" focusable="false">
      <circle cx="60" cy="60" r="20" fill="var(--flat-accent)" opacity="0.06" />
      <g fill="none" strokeLinecap="butt" strokeLinejoin="miter">
        {/* El techo, que se va hacia atrás: es lo que da fondo a la caja. */}
        <path d="M30 24 44 10M96 34 108 21" stroke="#22262b" strokeWidth="4.5" />
        <path d="M44 10 108 21" stroke="#22262b" strokeWidth="4.5" />
        {/* Marco exterior: tres lados enteros. */}
        <path
          data-flat-part="outer-frame"
          d="M30 24 96 34 84 100 18 90Z"
          stroke="#33383e"
          strokeWidth="6"
        />
        {/* La arista partida: se interrumpe y sigue desplazada hacia dentro. */}
        <path d="M30 24 56 28" stroke="#33383e" strokeWidth="6" />
        <path d="M66 34 92 38" stroke="#33383e" strokeWidth="6" />
        {/* Segundo marco: girado unos grados contra la caja, apenas cálido. */}
        <path
          data-flat-part="inner-frame"
          d="M39 38 87 45 79 89 31 82Z"
          stroke="#3b3a36"
          strokeWidth="4"
        />
        {/* Tercer marco: más adentro y ya tibio. */}
        <path
          data-flat-part="inner-frame"
          d="M46 48 79 53 74 82 41 77Z"
          stroke="var(--flat-accent)"
          strokeWidth="3.4"
          opacity="0.42"
        />
        {/* Cuarto marco: el escalón caliente, alrededor del vacío. */}
        <path
          data-flat-part="inner-frame"
          d="M53 57 72 60 69 75 50 72Z"
          stroke="var(--flat-accent)"
          strokeWidth="2.8"
          opacity="0.85"
        />
        {/* El puente que no llega, y su nodo huérfano flotando. */}
        <path d="M46 48 51 55" stroke="#3b3a36" strokeWidth="2.4" />
      </g>
      {/* Vacío central: oscuro de verdad, por donde pasa el fondo. */}
      <circle data-flat-part="core" cx="60.5" cy="66" r="7" fill="#04060a" />
      <circle cx="51" cy="55" r="1.4" fill="var(--flat-accent)" opacity="0.9" />
    </svg>
  );
}

/**
 * Cooper Station en `flat`: la misma megaestructura que el modelo 3D.
 *
 * Como la Endurance, no es una ilustración libre: arco abierto con el hueco
 * abajo, módulos en serie sobre el arco, espina con montantes, dos alas
 * solares, mástil y microventanas cálidas. En un equipo con movimiento
 * reducido este dibujo es la ÚNICA Cooper que se ve; si mostrara el planeta
 * retirado, el mismo destino contaría dos cosas distintas según el equipo.
 */
function CooperStation() {
  return (
    <svg viewBox="0 0 180 110" focusable="false">
      <defs>
        <linearGradient id="flat-cooper-hull" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#f2f4f3" />
          <stop offset="0.55" stopColor="#b9c0c2" />
          <stop offset="1" stopColor="#4c565c" />
        </linearGradient>
        <linearGradient id="flat-cooper-panel" x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#101c2a" />
          <stop offset="0.5" stopColor="#2c4258" />
          <stop offset="1" stopColor="#0d1723" />
        </linearGradient>
      </defs>

      {/* Arco secundario trasero: profundidad sin peso. */}
      <path
        d="M58 32A20 15 0 0 1 86 22"
        fill="none"
        stroke="var(--flat-secondary)"
        strokeOpacity="0.55"
        strokeWidth="2.4"
      />

      {/* Gran arco: 220° abiertos con el hueco abajo a la derecha. */}
      <path
        data-flat-part="arc"
        d="M120.3 72.5A34 34 0 1 0 56.4 74.8"
        fill="none"
        stroke="url(#flat-cooper-hull)"
        strokeWidth="4.6"
        strokeLinecap="round"
      />
      {/* Módulos en serie: el ritmo que vende la escala. */}
      <path
        data-flat-part="module"
        d="M120.3 72.5A34 34 0 1 0 56.4 74.8"
        fill="none"
        stroke="#e8ebe9"
        strokeWidth="8"
        strokeDasharray="10 8.6"
        strokeDashoffset="-4"
        opacity="0.92"
      />
      {/* Microventanas cálidas sobre el arco. */}
      <path
        data-flat-part="windows"
        d="M120.3 72.5A34 34 0 1 0 56.4 74.8"
        fill="none"
        stroke="#ffc27a"
        strokeWidth="1.6"
        strokeDasharray="1.6 17"
        strokeDashoffset="-9"
      />

      {/* Montantes de la espina al arco. */}
      <g data-flat-part="struts" stroke="#8d99a1" strokeWidth="1.6" opacity="0.85">
        <path d="M100 73V31M88 73V29M76 73V31M64 74V38" fill="none" />
      </g>

      {/* Espina y regla clara. */}
      <g data-flat-part="spine">
        <path d="M120 73 57 75" stroke="#222b32" strokeWidth="3.4" />
        <path d="M119 71.4 58 73.2" stroke="#dfe4e2" strokeWidth="1" opacity="0.8" />
      </g>

      {/* Alas solares. */}
      <g data-flat-part="panels">
        <rect x="124" y="69" width="24" height="8" rx="1.5" fill="url(#flat-cooper-panel)" stroke="var(--flat-secondary)" strokeOpacity="0.5" />
        <rect x="32" y="70" width="24" height="8" rx="1.5" fill="url(#flat-cooper-panel)" stroke="var(--flat-secondary)" strokeOpacity="0.5" />
      </g>

      {/* Hub, mástil y baliza. */}
      <circle cx="88" cy="73.6" r="4" fill="url(#flat-cooper-hull)" stroke="#e8ecee" strokeOpacity="0.6" />
      <path data-flat-part="mast" d="M88 70V46" stroke="#aeb7bc" strokeWidth="1.5" />
      <circle data-flat-part="beacon" cx="88" cy="44" r="2" fill="#ffc27a" />
    </svg>
  );
}

function Miller() {
  return (
    <svg viewBox="0 0 120 120" focusable="false">
      <defs>
        <radialGradient id="flat-miller-ocean" cx="30%" cy="22%" r="78%">
          <stop offset="0" stopColor="#dffaff" />
          <stop offset="0.23" stopColor="var(--flat-accent)" />
          <stop offset="0.62" stopColor="#163b5d" />
          <stop offset="1" stopColor="#030812" />
        </radialGradient>
        <clipPath id="flat-miller-disc">
          <circle cx="60" cy="60" r="39" />
        </clipPath>
      </defs>
      <circle cx="60" cy="60" r="42" fill="none" stroke="var(--flat-secondary)" strokeOpacity="0.2" strokeWidth="3" />
      <circle data-flat-part="planet" cx="60" cy="60" r="39" fill="url(#flat-miller-ocean)" />
      <g data-flat-part="ocean" clipPath="url(#flat-miller-disc)" fill="none" strokeLinecap="round">
        <path d="M8 43c18-7 28 9 47 1s33-9 58 1" stroke="#e9fdff" strokeOpacity="0.48" strokeWidth="2.2" />
        <path d="M2 57c22-8 32 8 50 1s38-10 69 1" stroke="#87e8ff" strokeOpacity="0.42" strokeWidth="1.8" />
        <path d="M4 72c20-7 32 7 50 1s36-7 67 1" stroke="#c7f5ff" strokeOpacity="0.27" strokeWidth="1.5" />
        <path d="M14 85c14-5 27 4 43 0s33-5 52 0" stroke="#8dd9ee" strokeOpacity="0.2" />
      </g>
      <path d="M36 31c9-9 21-12 33-9" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity="0.58" strokeWidth="3" />
      <path d="M30 91c20 12 49 10 64-9" fill="none" stroke="var(--flat-accent)" strokeOpacity="0.3" strokeWidth="2" />
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
        <radialGradient id="flat-edmunds-terrain" cx="31%" cy="25%" r="76%">
          <stop offset="0" stopColor="#ffd3a3" />
          <stop offset="0.28" stopColor="var(--flat-secondary)" />
          <stop offset="0.64" stopColor="var(--flat-accent)" />
          <stop offset="1" stopColor="#24100d" />
        </radialGradient>
        <clipPath id="flat-edmunds-disc">
          <circle cx="60" cy="60" r="39" />
        </clipPath>
      </defs>
      <circle cx="60" cy="60" r="42" fill="none" stroke="var(--flat-secondary)" strokeOpacity="0.22" strokeWidth="3" />
      <circle data-flat-part="planet" cx="60" cy="60" r="39" fill="url(#flat-edmunds-terrain)" />
      <g data-flat-part="terrain" clipPath="url(#flat-edmunds-disc)">
        <path d="M17 76c16-18 26-5 39-20s25-7 47-24l17 51-20 24-73-3Z" fill="#4c201a" fillOpacity="0.34" />
        <path d="M22 80c12-9 25-5 35-15s28-10 43-23" fill="none" stroke="#f8b078" strokeOpacity="0.4" strokeWidth="2" />
        <path d="M31 91c18-15 28-3 48-19 8-7 15-8 26-10" fill="none" stroke="#2f1312" strokeOpacity="0.46" strokeWidth="3" />
        <ellipse cx="48" cy="43" rx="9" ry="5" fill="#5a2a22" fillOpacity="0.42" />
        <ellipse cx="76" cy="55" rx="5" ry="3" fill="#2a1110" fillOpacity="0.35" />
        <ellipse cx="52" cy="84" rx="6" ry="3.5" fill="#2a1110" fillOpacity="0.28" />
      </g>
      <path d="M34 32c12-10 26-12 40-7" fill="none" stroke="#fff3d9" strokeLinecap="round" strokeOpacity="0.45" strokeWidth="2.7" />
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
  station: CooperStation,
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
