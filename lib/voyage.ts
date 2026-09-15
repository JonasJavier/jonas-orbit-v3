import { worldsData, type WorldId } from "@/content/worlds.data";

/**
 * La travesía espacio-temporal: la transición de viaje entre el System Map y
 * un destino, escrita como NÚMEROS puros.
 *
 * ── Qué es ─────────────────────────────────────────────────────────────────
 *
 * No es un túnel de hiperespacio con líneas blancas que salen hacia atrás. Es
 * una travesía cinematográfica en cuatro fases (petición del dueño,
 * 2026-09-14): el objetivo se BLOQUEA y la cámara se orienta hacia su centro;
 * la cámara ACELERA hacia él con easing exponencial mientras el campo se abre
 * y las estrellas empiezan a estirarse; justo antes de «chocar» la geometría
 * del espacio se DOBLA alrededor del observador —lente gravitacional, imagen
 * duplicada, arcos de luz, aberración cromática mínima—; y al máximo de la
 * distorsión hay una compresión luminosa breve, la ruta cambia y la página
 * nueva EMERGE al otro lado.
 *
 * ── Por qué está aquí, sin three.js ni DOM ──────────────────────────────────
 *
 * Por lo mismo que `scene-poses.ts`: para que el reloj de la transición se
 * pueda DEMOSTRAR con un test unitario. Las duraciones, el instante en que el
 * router cambia de página y la forma de cada curva son un contrato —«más de
 * 3 s se siente como una animación que hay que esperar cada vez que navegas»—
 * y un contrato que sólo existe dentro de un bucle de render no se puede
 * comprobar sin GPU.
 *
 * La escena muestrea `sampleVoyage(t)` cada fotograma y de ahí saca cámara,
 * uniformes del shader y atenuación de los cuerpos. El controlador del DOM
 * (`voyage-controller.ts`) usa la misma línea de tiempo para decidir CUÁNDO
 * navega el router, con temporizadores que no dependen de que la animación
 * llegue a dibujarse: la animación nunca es dueña del router (§3 del pivote).
 */

export type VoyageMode = "full" | "short";

type VoyagePhase = "lock" | "approach" | "warp" | "breakthrough";

/** Instantes de la travesía, en segundos desde la activación. */
export interface VoyageTimeline {
  /** Fin del bloqueo de objetivo: la cámara ya apunta al centro del cuerpo. */
  lock: number;
  /** Fin de la aceleración: el cuerpo ocupa gran parte del cuadro. */
  approach: number;
  /** Arranque de la distorsión del espacio-tiempo. */
  warpStart: number;
  /**
   * El pico. Aquí la escena anterior ya no se reconoce y el router cambia de
   * página. Es el ÚNICO instante que el controlador necesita de la escena, y
   * lo cumple con un temporizador, no con un fotograma.
   */
  push: number;
  /** Cuánto antes del pico se enciende la compresión luminosa. */
  flashLead: number;
  /** Duración de la llegada: la luz se retira y la página nueva emerge. */
  arrive: number;
  /**
   * Tope de espera al router después de pedirle la ruta. Si la página nueva
   * no ha llegado en este tiempo, la luz se retira igual: nunca se atrapa al
   * visitante detrás de un fundido.
   */
  arriveCap: number;
}

/**
 * La travesía completa: 2,6 s en total, dentro de los 2,2–2,8 que pidió el
 * dueño. Los cortes siguen sus cuatro fases —0–0,4 · 0,4–1,1 · 1,1–2,0 ·
 * 2,0–2,6— con dos matices deliberados: la aceleración sigue creciendo hasta
 * 1,35 s porque el cuerpo tiene que llegar a llenar el cuadro ANTES de que la
 * distorsión lo haga irreconocible, y la distorsión arranca en 1,05 s para
 * solapar medio cuarto de segundo con el zoom, que es lo que evita que se
 * lean como dos animaciones pegadas.
 */
export const VOYAGE_FULL: VoyageTimeline = {
  lock: 0.4,
  approach: 1.35,
  warpStart: 1.05,
  push: 2.05,
  flashLead: 0.2,
  arrive: 0.55,
  arriveCap: 1.4,
};

/**
 * La versión reducida, para cuando no hay escena viva (movimiento apagado,
 * perfil ligero, reduced-motion sin activación, equipo sin WebGL2): un zoom
 * leve hacia el objetivo, un fundido rápido y la ruta. Medio segundo en
 * total. Es lo que da sentido real al interruptor de movimiento: quien lo
 * apaga no ve los 2,6 s, pero tampoco un corte seco.
 */
export const VOYAGE_SHORT: VoyageTimeline = {
  lock: 0.12,
  approach: 0.3,
  warpStart: 0.3,
  push: 0.3,
  flashLead: 0.14,
  arrive: 0.22,
  arriveCap: 1.4,
};

export function voyageTimeline(mode: VoyageMode): VoyageTimeline {
  return mode === "full" ? VOYAGE_FULL : VOYAGE_SHORT;
}

/** Lo que la escena lee cada fotograma. Todo va de 0 a 1 y nunca retrocede. */
export interface VoyageSample {
  /** Segundos desde la activación. */
  t: number;
  /** Fracción del despegue recorrida (0 al activar, 1 en el pico). */
  progress: number;
  phase: VoyagePhase;
  /** Bloqueo de objetivo: orienta la cámara, enciende el cuerpo, atenúa el resto. */
  lock: number;
  /** Aceleración: dolly hacia el cuerpo, apertura del campo, estelas radiales. */
  approach: number;
  /** Distorsión del espacio-tiempo alrededor del objetivo. */
  warp: number;
  /** Compresión luminosa justo antes de cruzar. */
  flash: number;
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function easeOutCubic(u: number): number {
  const inv = 1 - u;
  return 1 - inv * inv * inv;
}

function smoothstep(u: number): number {
  return u * u * (3 - 2 * u);
}

/**
 * Aceleración: lenta al arrancar y explosiva al final. No es lineal a
 * propósito —una cámara que se acerca a velocidad constante se lee como un
 * zoom de interfaz, no como una caída— y la potencia 2,6 deja el 47 % del
 * recorrido para el último cuarto del tiempo.
 */
function easeInPower(u: number): number {
  return Math.pow(u, 2.6);
}

export function sampleVoyage(
  t: number,
  timeline: VoyageTimeline = VOYAGE_FULL,
): VoyageSample {
  const time = Math.max(0, t);
  const lock = easeOutCubic(clamp01(time / timeline.lock));
  const approach = easeInPower(
    clamp01((time - timeline.lock) / (timeline.approach - timeline.lock)),
  );
  const warp = smoothstep(
    clamp01((time - timeline.warpStart) / (timeline.push - timeline.warpStart)),
  );
  const flashStart = timeline.push - timeline.flashLead;
  const flash = smoothstep(clamp01((time - flashStart) / timeline.flashLead));

  const phase: VoyagePhase =
    time >= flashStart
      ? "breakthrough"
      : time >= timeline.warpStart
        ? "warp"
        : time >= timeline.lock
          ? "approach"
          : "lock";

  return {
    t: time,
    progress: clamp01(time / timeline.push),
    phase,
    lock,
    approach,
    warp,
    flash,
  };
}

/**
 * Cada mundo deja su huella al final de la travesía.
 *
 * La base es siempre la misma —zoom → distorsión → cruce— por consistencia; lo
 * que cambia es el carácter de la distorsión justo antes de llegar. Son
 * multiplicadores del shader, no efectos distintos: un solo material, un solo
 * paso, cuatro números.
 */
export interface VoyageFlavour {
  /** Cuánta lente gravitacional (radio del anillo de Einstein y masa). */
  lens: number;
  /** Ondas de refracción: torsión y oleaje del espacio, como agua. */
  liquid: number;
  /** Las estelas se cuantizan a 90°: estrellas que se vuelven retícula. */
  grid: number;
  /** Cuánto se cierra el negro sobre los laterales. */
  dark: number;
}

export const VOYAGE_FLAVOURS: Readonly<Record<WorldId, VoyageFlavour>> = {
  // Lente muchísimo más fuerte y negro dominante: la luz se curva y el resto
  // del cuadro se apaga. Es un agujero negro; el destino es la propia sombra.
  gargantua: { lens: 1, liquid: 0, grid: 0, dark: 1 },
  // Tonos fríos y distorsión LÍQUIDA: el espacio ondula como agua antes de
  // llegar al océano.
  miller: { lens: 0.35, liquid: 1, grid: 0, dark: 0 },
  // Nave: arcos de luz marfil, poca lente, sin agua.
  endurance: { lens: 0.4, liquid: 0, grid: 0, dark: 0.1 },
  // Mundo mineral: algo de polvo en las ondas y un cierre cálido.
  edmunds: { lens: 0.45, liquid: 0.15, grid: 0, dark: 0.2 },
  // Las estrellas se convierten en líneas ortogonales: transición geométrica.
  tesseract: { lens: 0.3, liquid: 0, grid: 1, dark: 0.15 },
  // Baliza: cian y violeta, ondas suaves, sin negro.
  ranger: { lens: 0.4, liquid: 0.2, grid: 0, dark: 0 },
};

export function voyageFlavourFor(id: WorldId): VoyageFlavour {
  return VOYAGE_FLAVOURS[id];
}

/** Acento del destino, en hex para el CSS y en RGB lineal para el shader. */
export interface VoyageTint {
  hex: string;
  linear: readonly [number, number, number];
}

function srgbToLinear(channel: number): number {
  return channel <= 0.04045
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}

export function voyageTintFor(id: WorldId): VoyageTint {
  const hex = worldsData[id].accent;
  const value = Number.parseInt(hex.slice(1), 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;
  return {
    hex,
    linear: [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)],
  };
}
