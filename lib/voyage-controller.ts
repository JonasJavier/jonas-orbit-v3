import type { WorldId } from "@/content/worlds.data";
import { voyageAudio } from "./voyage-audio";
import { voyageTimeline, voyageTintFor, type VoyageMode } from "./voyage";

/**
 * El controlador de la travesía: quién decide CUÁNDO cambia la ruta.
 *
 * ── El principio que lo gobierna ────────────────────────────────────────────
 *
 * «La animación nunca es dueña del router» (§3 del pivote). Aquí eso se
 * traduce en tres decisiones concretas:
 *
 * 1. **La ruta cambia por TEMPORIZADOR, no por fotograma.** El pico de la
 *    distorsión es un instante de la línea de tiempo (`timeline.push`), y se
 *    pide al router con `setTimeout`. Si la escena no llega a dibujar ni un
 *    fotograma —pestaña oculta, GPU saturada, `requestAnimationFrame` parado—
 *    la navegación se completa igual (G10).
 * 2. **Cualquier tecla, clic o gesto corta la travesía** (G9): se enciende la
 *    luz del cruce y se pide la ruta en ese mismo instante.
 * 3. **La llegada tiene tope.** Después de pedir la ruta se espera a que la
 *    página nueva aparezca —lo avisa la capa del layout al cambiar el
 *    pathname— pero como mucho `arriveCap`; pasado eso la luz se retira igual.
 *    Nunca se atrapa al visitante detrás de un fundido.
 *
 * ── Qué publica ─────────────────────────────────────────────────────────────
 *
 * En `<html>`: `data-voyage` (`depart` · `flash` · `arrive`), `data-voyage-mode`
 * (`full` · `short`), `data-voyage-world`, `data-voyage-skipped` y las
 * variables `--voyage-x` / `--voyage-y` (dónde estaba el destino en pantalla,
 * en %) y `--voyage-tint` (su acento). El CSS hace el resto: retira la
 * instrumentación, enciende la luz del cruce sobre el cambio de página y hace
 * emerger la página nueva. La escena WebGL lee el despegue por
 * `readVoyageDeparture()` y muestrea la línea de tiempo por su cuenta.
 *
 * Es un módulo con estado a propósito —un solo viaje a la vez, en toda la
 * pestaña— y sin React: lo usan la costura de navegación, la escena y la capa
 * del layout, que son tres árboles distintos.
 */

type VoyageStatus = "idle" | "depart" | "flash" | "pushed" | "arrive";

export interface VoyageDeparture {
  id: WorldId;
  href: string;
  mode: VoyageMode;
  /** `performance.now()` al activar: el reloj que muestrea la escena. */
  startedAt: number;
}

export interface VoyageState {
  status: VoyageStatus;
  departure: VoyageDeparture | null;
  /** El visitante cortó la travesía con una tecla, un clic o un gesto. */
  skipped: boolean;
}

const IDLE: VoyageState = { status: "idle", departure: null, skipped: false };

const SKIP_EVENTS = ["keydown", "pointerdown", "wheel", "touchstart"] as const;

let state: VoyageState = IDLE;
const listeners = new Set<() => void>();
let timers: number[] = [];
let detachSkip: (() => void) | null = null;
let navigate: ((href: string) => void) | null = null;

function emit() {
  for (const listener of listeners) listener();
}

function later(seconds: number, callback: () => void) {
  timers.push(window.setTimeout(callback, Math.max(0, Math.round(seconds * 1000))));
}

function clearTimers() {
  for (const timer of timers) window.clearTimeout(timer);
  timers = [];
}

function releaseSkip() {
  detachSkip?.();
  detachSkip = null;
}

function applyDom() {
  const root = document.documentElement;
  const { status, departure, skipped } = state;

  if (status === "idle" || departure === null) {
    delete root.dataset.voyage;
    delete root.dataset.voyageMode;
    delete root.dataset.voyageWorld;
    delete root.dataset.voyageSkipped;
    root.style.removeProperty("--voyage-x");
    root.style.removeProperty("--voyage-y");
    root.style.removeProperty("--voyage-tint");
    return;
  }

  // Entre pedir la ruta y verla llegar la luz sigue encendida: para el CSS
  // «pushed» es la misma fase que «flash».
  root.dataset.voyage = status === "pushed" ? "flash" : status;
  root.dataset.voyageMode = departure.mode;
  root.dataset.voyageWorld = departure.id;
  if (skipped) root.dataset.voyageSkipped = "true";
  else delete root.dataset.voyageSkipped;
}

function publish(next: VoyageState) {
  state = next;
  applyDom();
  emit();
}

/**
 * Dónde está el destino en pantalla, en % del viewport. Es el centro de la
 * luz del cruce y el origen del zoom de la versión reducida: si haces clic en
 * Miller abajo a la derecha, la realidad empieza a doblarse hacia Miller.
 */
function measureOrigin(id: WorldId): { x: number; y: number } {
  const node = document.querySelector<HTMLElement>(`[data-system-body="${id}"]`);
  if (!node) return { x: 50, y: 50 };
  const rect = node.getBoundingClientRect();
  const width = window.innerWidth || 1;
  const height = window.innerHeight || 1;
  const clamp = (value: number) => Math.min(100, Math.max(0, value));
  return {
    x: clamp(((rect.left + rect.width / 2) / width) * 100),
    y: clamp(((rect.top + rect.height / 2) / height) * 100),
  };
}

function push() {
  const { departure, status } = state;
  if (!departure || status === "pushed" || status === "arrive") return;
  clearTimers();
  releaseSkip();
  publish({ ...state, status: "pushed" });
  // Por el camino del salto la luz y el pico son el mismo instante y el golpe
  // no ha sonado todavía. `cross()` es idempotente: por el camino normal ya
  // sonó con el fogonazo y aquí no hace nada.
  voyageAudio.cross();
  navigate?.(departure.href);
  // Tope duro de la llegada. Si el router tarda más, la luz se retira igual.
  later(voyageTimeline(departure.mode).arriveCap, arrive);
}

function arrive() {
  const { departure } = state;
  if (!departure) return;
  clearTimers();
  releaseSkip();
  publish({ ...state, status: "arrive" });
  // Un pelo más que el fundido del CSS, para que termine antes de retirar el
  // atributo que lo sostiene.
  later(voyageTimeline(departure.mode).arrive + 0.08, () => publish(IDLE));
}

/** Cualquier tecla, clic o gesto: se cruza ya. */
function skip() {
  if (state.status !== "depart" && state.status !== "flash") return;
  publish({ ...state, skipped: true });
  push();
}

function attachSkip() {
  releaseSkip();
  /*
    Se escucha en captura y en el mismo instante de la activación. No hace
    falta esperar un tick para no leer el clic que arrancó la travesía: el
    `pointerdown` de ese clic ya pasó, y con teclado el `click` sintético se
    despacha DESPUÉS de que el `keydown` de Enter haya terminado, así que un
    listener registrado dentro del clic tampoco lo ve.
  */
  const options: AddEventListenerOptions = { capture: true, passive: true };
  for (const type of SKIP_EVENTS) window.addEventListener(type, skip, options);
  detachSkip = () => {
    for (const type of SKIP_EVENTS) window.removeEventListener(type, skip, options);
  };
}

export interface StartVoyageInput {
  id: WorldId;
  href: string;
  mode: VoyageMode;
  /** Lo que de verdad cambia la ruta. Hoy, `router.push`. */
  navigate(href: string): void;
}

/**
 * Arranca la travesía. Devuelve `false` si ya hay una en curso: el viaje que
 * va, va; no se encadenan ni se sustituyen.
 */
export function startVoyage(input: StartVoyageInput): boolean {
  if (state.status !== "idle") return false;

  const timeline = voyageTimeline(input.mode);
  const departure: VoyageDeparture = {
    id: input.id,
    href: input.href,
    mode: input.mode,
    startedAt: performance.now(),
  };
  navigate = input.navigate;

  const origin = measureOrigin(input.id);
  const root = document.documentElement;
  root.style.setProperty("--voyage-x", `${origin.x.toFixed(2)}%`);
  root.style.setProperty("--voyage-y", `${origin.y.toFixed(2)}%`);
  root.style.setProperty("--voyage-tint", voyageTintFor(input.id).hex);

  publish({ status: "depart", departure, skipped: false });
  // El sonido se arranca DENTRO del gesto que activó el destino: es lo que
  // permite al navegador dejar sonar el audio sin pedir nada más.
  voyageAudio.depart(departure.id, departure.mode);
  attachSkip();
  later(timeline.push - timeline.flashLead, () => {
    if (state.status === "depart") {
      publish({ ...state, status: "flash" });
      voyageAudio.cross();
    }
  });
  later(timeline.push, push);
  return true;
}

/**
 * La capa del layout avisa de que el pathname cambió. Si la travesía estaba
 * esperando su ruta, empieza la llegada; si el cambio vino de otro sitio
 * —botón atrás, otro enlace— la travesía se da por terminada igual, porque
 * su destino ya no es la página que hay en pantalla.
 */
export function markVoyageArrived() {
  if (state.status === "idle") return;
  arrive();
}

/** Corta todo y vuelve al reposo. Lo usa la capa al desmontarse y los tests. */
export function cancelVoyage() {
  clearTimers();
  releaseSkip();
  voyageAudio.stop();
  navigate = null;
  publish(IDLE);
}

export function subscribeVoyage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function readVoyageState(): VoyageState {
  return state;
}

/**
 * Lo que lee la escena: el despegue mientras dura, `null` en cuanto se pide
 * la ruta. Devuelve siempre el MISMO objeto durante un viaje, que es lo que
 * `useSyncExternalStore` necesita para no re-renderizar por nada.
 */
export function readVoyageDeparture(): VoyageDeparture | null {
  return state.status === "depart" || state.status === "flash"
    ? state.departure
    : null;
}
