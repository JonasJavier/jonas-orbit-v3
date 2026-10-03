"use client";

/* Los peldaños WebP los prepara tools/prepare-projects.mjs y se sirven tal
   cual con `srcset`: el optimizador de Next no sabe elegir entre archivos que
   ya existen a cada ancho. */
/* eslint-disable @next/next/no-img-element */
import { IntentLink as Link } from "@/components/intent-link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { useMotionEnabled } from "@/lib/effects-mode";
import { defineCopy } from "@/lib/i18n";
import {
  initialNode,
  nodePath,
  projectFromHash,
  REEL_CENTER,
  RING_RADIUS,
  ringOffset,
  ringPose,
  statusReadout,
  systemRing,
  TABLE_LAYERS,
  type NodePath,
  type ScreenPose,
  type TableLayer,
  type TableProject,
  type TableReelStep,
  type TableScope,
  type TableScreen,
} from "@/lib/engineering-table";
import { useLocale } from "./locale-provider";
import { LANE_LABEL, SystemDiagram, SystemInspector } from "./system-diagram";

/**
 * LA MESA DE INGENIERÍA — `/es/proyectos`, tercer pase
 * (`docs/design/endurance-proyectos.md` §16 y §17).
 *
 * Un proyecto se lee a tres profundidades sobre la misma mesa, y la mesa
 * cambia de FUNCIÓN con la capa —la misma máquina, tres usos—:
 *
 * - PRODUCTO: tres pantallas en arco y, en el cristal, el ALCANCE: tres
 *   cifras que el caso sostiene.
 * - DISEÑO: las pantallas de cada decisión de diseño en un carrete; la
 *   elegida delante y, en la mesa, su problema y su decisión.
 * - INGENIERÍA: las pantallas vuelven a la mesa y se levanta el sistema —el
 *   esquema por carriles y el inspector del módulo elegido—; la mesa se
 *   vuelve el mapa global: un anillo con un segmento por módulo que enciende
 *   la ruta del que está en foco.
 *
 * La lectura de la izquierda no cambia con la capa: nombre, qué es, estado y
 * la salida al caso completo. Todo el texto largo vive en el caso.
 *
 * Sin JavaScript no hay mesa que perder: cada proyecto es una `<section id>`,
 * `:target` elige el proyecto y una ficha estática (sólo con `scripting:
 * none`) lista las pantallas con su nota y el sistema con sus decisiones.
 */

const COPY = defineCopy({
  es: {
    layers: { producto: "Producto", diseno: "Diseño", ingenieria: "Ingeniería" } satisfies Record<TableLayer, string>,
    problem: "Problema",
    decision: "Decisión",
    scope: "Alcance",
    modules: (n: number) => `${n} módulos`,
    step: (kind: "decisions" | "captions"): string => (kind === "decisions" ? "decisión" : "pantalla"),
    of: "de",
    projects: "Proyectos",
    previousProject: "Proyecto anterior",
    nextProject: "Proyecto siguiente",
    changeProject: (name: string, index: number, total: number) => `Cambiar proyecto: ${name}, ${index} de ${total}`,
    depth: "Profundidad de lectura",
    technologies: "Tecnologías",
    explore: "Explorar proyecto",
    code: "Ver código",
    screensOf: (name: string) => `Pantallas de ${name}`,
    previousStep: (kind: "decisions" | "captions"): string => (kind === "decisions" ? "Decisión anterior" : "Pantalla anterior"),
    nextStep: (kind: "decisions" | "captions"): string => (kind === "decisions" ? "Decisión siguiente" : "Pantalla siguiente"),
    designDecisions: "Decisiones de diseño",
    screens: "Pantallas",
    system: "Sistema",
  },
  en: {
    layers: { producto: "Product", diseno: "Design", ingenieria: "Engineering" },
    problem: "Problem",
    decision: "Decision",
    scope: "Scope",
    modules: (n: number) => `${n} modules`,
    step: (kind: "decisions" | "captions"): string => (kind === "decisions" ? "decision" : "screen"),
    of: "of",
    projects: "Projects",
    previousProject: "Previous project",
    nextProject: "Next project",
    changeProject: (name: string, index: number, total: number) => `Change project: ${name}, ${index} of ${total}`,
    depth: "Reading depth",
    technologies: "Technologies",
    explore: "Explore project",
    code: "View code",
    screensOf: (name: string) => `${name} screens`,
    previousStep: (kind: "decisions" | "captions"): string => (kind === "decisions" ? "Previous decision" : "Previous screen"),
    nextStep: (kind: "decisions" | "captions"): string => (kind === "decisions" ? "Next decision" : "Next screen"),
    designDecisions: "Design decisions",
    screens: "Screens",
    system: "System",
  },
});

/** Cuánto dura el cruce entre proyectos: el saliente se apaga en la mesa. */
const SWITCH_MS = 450;
/**
 * La rueda horizontal sobre el muelle: cuánto desplazamiento acumulado es un
 * paso, cuánto descansa después como mínimo y cuánto silencio separa un gesto
 * del siguiente, para que la inercia de un trackpad no se lleve dos proyectos.
 */
const WHEEL_STEP = 60;
const WHEEL_REST_MS = 650;
const WHEEL_QUIET_MS = 240;
/** Lo que tarda en apagarse la vista previa: da tiempo a llevar el puntero a ella. */
const PEEK_LINGER_MS = 160;

/* `replaceState` no dispara `hashchange`: el muelle avisa por su cuenta. */
const HASH_EVENT = "jonas:table-hash";
function subscribeHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  window.addEventListener(HASH_EVENT, callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    window.removeEventListener(HASH_EVENT, callback);
  };
}
const readHash = () => window.location.hash;
const readServerHash = () => null;

const pad = (value: number) => String(value).padStart(2, "0");

/** ¿El foco llegó por teclado? jsdom no conoce `:focus-visible`. */
function focusVisible(element: Element): boolean {
  try {
    return element.matches(":focus-visible");
  } catch {
    return false;
  }
}

/* ── Una pantalla ──────────────────────────────────────────────────────── */

function poseVars(prefix: string, pose: ScreenPose): Record<string, number> {
  return {
    [`--${prefix}-x`]: pose.x,
    [`--${prefix}-y`]: pose.y,
    [`--${prefix}-z`]: pose.z,
    [`--${prefix}-ry`]: pose.ry,
    [`--${prefix}-s`]: pose.s,
    [`--${prefix}-o`]: pose.o,
  };
}

function Screen({
  screen,
  projectId,
  eager,
  ring,
  step,
  front,
  operable,
  onPick,
}: {
  screen: TableScreen;
  projectId: string;
  eager: boolean;
  /** Distancia a la elegida en el carrete, o `null` si no está en él. */
  ring: number | null;
  /** El paso del carrete que enseña esta pantalla, si lo hay. */
  step: TableReelStep | null;
  front: boolean;
  operable: boolean;
  onPick: () => void;
}) {
  const t = COPY[useLocale()];
  const noteId = `${projectId}-screen-${screen.index}-note`;
  const decisionId = `${projectId}-screen-${screen.index}-decision`;
  const style = {
    "--i": screen.index,
    "--ar": screen.sources.width / screen.sources.height,
    // La exposición de la pantalla sale de su luma medida: una interfaz
    // blanca se apaga y deja de irradiar (sin medida, exposición neutra).
    ...(screen.sources.luma === null ? {} : { "--luma": screen.sources.luma }),
    ...poseVars("r", screen.poses.producto),
    ...poseVars("d", ringPose(ring ?? 3, screen.frame)),
    ...poseVars("i", screen.poses.ingenieria),
  } as CSSProperties;
  return (
    <figure
      className="holo-screen"
      data-frame={screen.frame}
      data-screen={screen.index}
      data-slot={screen.slot ?? "none"}
      data-front={front ? "true" : undefined}
      data-far={ring === null || Math.abs(ring) > 2 ? "true" : undefined}
      // La distancia a la elegida: en el teléfono decide quién tapa a quién.
      data-dist={ring === null ? undefined : Math.min(3, Math.abs(ring))}
      style={style}
    >
      {/*
        La imagen no va DENTRO del botón: fuera de Diseño el botón va `inert`,
        y lo inerte se lleva del árbol de accesibilidad todo lo que contiene;
        el `alt` de cada pantalla tiene que leerse en cualquier capa. El botón
        es una lámina encima; cuando opera, él lleva el nombre y la imagen
        calla para no leerse dos veces.
      */}
      <div className="holo-screen__frame">
        <img
          aria-hidden={operable ? true : undefined}
          alt={screen.alt}
          decoding="async"
          fetchPriority={eager ? "high" : undefined}
          height={screen.sources.height}
          loading={eager ? undefined : "lazy"}
          sizes={
            screen.frame === "mobile"
              ? "(max-width: 767px) 44vw, 12vw"
              : "(max-width: 767px) 92vw, (max-width: 1099px) 64vw, 42vw"
          }
          src={screen.sources.src}
          srcSet={screen.sources.srcSet || undefined}
          width={screen.sources.width}
        />
        <span aria-hidden="true" className="holo-screen__glass" />
        <button
          type="button"
          className="holo-screen__pick"
          aria-current={front ? "true" : undefined}
          aria-describedby={step?.problem ? decisionId : noteId}
          aria-label={screen.alt}
          inert={!operable}
          onClick={onPick}
          tabIndex={front ? 0 : -1}
        />
      </div>
      <figcaption className="visually-hidden" id={noteId}>
        {screen.caption}
      </figcaption>
      {/* La decisión que esta pantalla resuelve: lo que la nota de la mesa
          pinta, dicho para quien elige la pantalla con el teclado. */}
      {step?.problem ? (
        <span className="visually-hidden" id={decisionId}>
          {t.problem}: {step.problem} {t.decision}: {step.note}
        </span>
      ) : null}
      <span aria-hidden="true" className="holo-screen__tether" />
    </figure>
  );
}

/* ── Producto: el alcance ──────────────────────────────────────────────── */

/**
 * El ALCANCE, sobre el cristal y de frente, donde Diseño pone su nota: tres
 * cifras que el caso sostiene. Se leen como un instrumento, no como tarjetas.
 * Es texto: sin JavaScript y en móvil se lee igual, bajo las pantallas.
 */
function Scope({ projectId, items }: { projectId: string; items: readonly TableScope[] }) {
  const t = COPY[useLocale()];
  if (items.length === 0) return null;
  // Las tres cifras comparten tamaño, el que deja caber la más larga en su
  // columna: «Markdown» no puede desbordar hacia «OpenAPI».
  const longest = Math.max(3, ...items.map((item) => item.value.length));
  return (
    <div className="holo-scope" style={{ "--vlen": longest } as CSSProperties}>
      <p className="holo-scope__title" id={`${projectId}-scope`}>
        {t.scope}
      </p>
      <dl aria-labelledby={`${projectId}-scope`}>
        {items.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ── La mesa física ────────────────────────────────────────────────────── */

/**
 * Cuánto se estiran en vertical los rótulos grabados: la mesa se ve muy
 * inclinada y un texto plano sobre ella se leería aplastado. Como la pintura
 * de una calzada, se escribe alargado para que, en escorzo, se lea recto.
 */
const ETCH_STRETCH = 1.7;

/**
 * EL MAPA GLOBAL DEL SISTEMA, grabado en el cristal (§17): un segmento por
 * módulo y, por fuera, el filo de cada carril. En Ingeniería sigue al foco
 * del esquema, y las dos lecturas no se pisan: el FILO dice el carril del
 * módulo en foco; el RELLENO, su ruta —el módulo pleno, lo que recibe y
 * entrega a medio tono, sea del carril que sea—. En el centro, como la
 * esfera de un instrumento, el carril encendido y cuántos módulos tiene: los
 * demás rótulos ya están en las cabeceras del esquema. En Producto y Diseño
 * el CSS lo apaga.
 */
function SystemRing({ project, focus, path }: { project: TableProject; focus: string | null; path: NodePath }) {
  // La geometría es del sistema, no del foco: pasar el puntero por el
  // esquema no la recalcula.
  const locale = useLocale();
  const ring = useMemo(() => systemRing(project.architecture), [project.architecture]);
  const focusLane = project.architecture.nodes.find((node) => node.id === focus)?.lane;
  const lit = project.architecture.lanes.find((entry) => entry.lane === focusLane);
  const box = RING_RADIUS + 10;
  return (
    <svg
      aria-hidden="true"
      className="console__ring"
      focusable="false"
      viewBox={`${-box} ${-box} ${box * 2} ${box * 2}`}
    >
      {ring.arcs.map((arc) => (
        <path
          key={arc.lane}
          className="console__lane"
          d={arc.d}
          data-on={arc.lane === focusLane ? "true" : undefined}
        />
      ))}
      {ring.segments.map((segment) => (
        <path
          key={segment.id}
          className="console__seg"
          d={segment.d}
          data-lane-on={segment.lane === focusLane ? "true" : undefined}
          data-state={
            segment.id === focus
              ? "focus"
              : path.upstream.has(segment.id) || path.downstream.has(segment.id)
                ? "path"
                : undefined
          }
        />
      ))}
      {lit ? (
        <text className="console__readout" textAnchor="middle" transform={`scale(1 ${ETCH_STRETCH})`}>
          <tspan className="console__readout-count" x="0" y="-1">
            {pad(lit.count)}
          </tspan>
          <tspan className="console__readout-lane" x="0" y="14">
            {LANE_LABEL[locale][lit.lane]}
          </tspan>
        </text>
      ) : null}
    </svg>
  );
}

function Console({ project, focus, path }: { project: TableProject; focus: string | null; path: NodePath }) {
  return (
    <div aria-hidden="true" className="console">
      <div className="console__body">
        <div className="console__top">
          <div className="console__glass">
            <div className="console__grid" />
            <div className="console__pool" />
            <SystemRing focus={focus} path={path} project={project} />
            {/* El stack grabado: sólo se lee en Ingeniería (el CSS lo apaga
                en las otras capas, donde es ruido). Una pieza por tecnología,
                que no se parte, con su separador delante. */}
            <p className="console__spec">
              {project.technologies.map((technology) => (
                <span key={technology}>{technology}</span>
              ))}
            </p>
          </div>
        </div>
        <div className="console__front">
          <span className="console__slot" />
          <span className="console__slot" />
        </div>
      </div>
    </div>
  );
}

/* ── Iconos de trazo ───────────────────────────────────────────────────── */

function GithubMark() {
  return (
    <svg aria-hidden="true" className="table-read__code-mark" focusable="false" viewBox="0 0 24 24">
      <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
    </svg>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg aria-hidden="true" className="table-dock__chevron" focusable="false" viewBox="0 0 16 16">
      <path d={direction === "left" ? "M10 3.5 5.5 8l4.5 4.5" : "M6 3.5 10.5 8 6 12.5"} />
    </svg>
  );
}

/* ── La mesa ───────────────────────────────────────────────────────────── */

export function EngineeringTable({
  projects,
  head,
}: {
  projects: TableProject[];
  /** Kicker y título de la página: el destino, no el proyecto. */
  head: { kicker: string; title: string };
}) {
  const locale = useLocale();
  const t = COPY[locale];
  const rootRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const running = useMotionEnabled();

  /*
    El proyecto a la vista es el HASH, leído como fuente externa. El servidor
    no sabe qué hash trae la URL, y elegir el primero aquí pintaría OMSTA un
    instante antes de que `#wikiverse` lo sustituyera: la instantánea de
    servidor es `null`, y mientras lo es, el CSS sin `data-enhanced` muestra el
    `:target` —o el primero—, que es exactamente el mismo proyecto que se lee
    en cuanto hay navegador. Cambiar de proyecto es escribir el hash.
  */
  const hash = useSyncExternalStore(subscribeHash, readHash, readServerHash);
  const enhanced = hash !== null;
  /*
    Sólo un hash que NOMBRA un proyecto lo cambia. «Saltar al contenido» y
    «Volver arriba» escriben `#main-content`, y eso no es elegir OMSTA: se
    conserva el último proyecto elegido (patrón de ajustar estado al pintar,
    sin tocar una referencia durante el render).
  */
  const fromHash = enhanced ? (projectFromHash(hash, projects)?.id ?? null) : null;
  const [lastProject, setLastProject] = useState<string | null>(null);
  if (fromHash && fromHash !== lastProject) setLastProject(fromHash);
  const project = enhanced ? (fromHash ?? lastProject ?? projects[0].id) : null;
  const current = projects.find((entry) => entry.id === project) ?? projects[0];
  const currentIndex = projects.indexOf(current);

  const [leaving, setLeaving] = useState<string | null>(null);
  const [layer, setLayer] = useState<TableLayer>("producto");
  // Lo que se mira dentro del proyecto: la pantalla del tambor y el módulo del
  // inspector. Pertenecen al proyecto y se olvidan al cambiarlo.
  const [view, setView] = useState<{ project: string | null; front: number; picked: string | null }>({
    project: null,
    front: 0,
    picked: null,
  });
  const [hovered, setHovered] = useState<string | null>(null);
  // El proyecto que se apunta en el muelle: su vista previa. Se recuerda el
  // último para que la vista previa se apague con su contenido, no vacía.
  const [peek, setPeek] = useState<{ id: string; open: boolean } | null>(null);
  // En el teléfono el muelle se pliega en «01 / 05»: la lista se abre a pedido.
  const [listOpen, setListOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  // La región viva calla hasta el primer cambio real: hidratar no es un
  // cambio. Y si el paso vino de las flechas, el foco ya lleva la nota
  // (`aria-describedby`): anunciarla otra vez la leería dos veces.
  const [spoken, setSpoken] = useState(false);
  const [viaRing, setViaRing] = useState(false);
  const front = view.project === current.id ? view.front : 0;
  const picked = view.project === current.id ? view.picked : null;

  const switchProject = useCallback(
    (id: string) => {
      if (id === project || !project) return;
      setLeaving(running ? project : null);
      setHovered(null);
      setView({ project: id, front: 0, picked: null });
      setSpoken(true);
      window.history.replaceState(window.history.state, "", `#${id}`);
      window.dispatchEvent(new Event(HASH_EVENT));
    },
    [project, running],
  );

  /** El proyecto a `delta` puestos del actual, dando la vuelta. */
  const neighbour = useCallback(
    (delta: number) => projects[(((currentIndex + delta) % projects.length) + projects.length) % projects.length],
    [currentIndex, projects],
  );
  const stepProject = useCallback(
    (delta: number) => {
      const target = neighbour(delta);
      switchProject(target.id);
      return target;
    },
    [neighbour, switchProject],
  );

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => setLeaving(null), SWITCH_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  /*
    Las flechas globales: ← → cambian de proyecto cuando el foco no está en
    ningún sitio (en `body`). Con el foco en el selector de capa, el carrete o
    el esquema, las flechas ya son suyas; en un campo, del texto. Y sólo con
    la mesa a la vista: más abajo, cambiar un proyecto que no se ve sería un
    fantasma.
  */
  useEffect(() => {
    if (!enhanced) return;
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const active = document.activeElement;
      if (active && active !== document.body && active !== document.documentElement) return;
      const box = rootRef.current?.getBoundingClientRect();
      if (box && box.height > 0 && box.bottom < window.innerHeight * 0.5) return;
      event.preventDefault();
      stepProject(event.key === "ArrowRight" ? 1 : -1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enhanced, stepProject]);

  /*
    La rueda HORIZONTAL con el puntero sobre el muelle pasa de proyecto; la
    vertical nunca se toca (es el scroll de la página). El acumulado y el
    descanso viven en una referencia: sobreviven a que el efecto se vuelva a
    suscribir al cambiar de proyecto, que es justo cuando llega la inercia.
    Un gesto es un flujo continuo: mientras sigan llegando eventos, el
    descanso se alarga, y el muelle sólo se rearma tras un silencio. Con un
    descanso fijo, la cola de inercia de un trackpad (más de un segundo)
    pasaba un segundo proyecto.
  */
  const wheel = useRef({ total: 0, last: 0, rest: 0 });
  useEffect(() => {
    const dock = dockRef.current;
    if (!dock || !enhanced) return;
    function onWheel(event: WheelEvent) {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      // En móvil el muelle es una fila que se desplaza sola: su rueda es suya.
      if (window.matchMedia?.("(max-width: 767px)").matches) return;
      event.preventDefault();
      const state = wheel.current;
      const gap = event.timeStamp - state.last;
      state.last = event.timeStamp;
      if (event.timeStamp < state.rest) {
        state.rest = Math.max(state.rest, event.timeStamp + WHEEL_QUIET_MS);
        return;
      }
      if (gap > WHEEL_QUIET_MS) state.total = 0;
      state.total += event.deltaX;
      if (Math.abs(state.total) < WHEEL_STEP) return;
      stepProject(Math.sign(state.total));
      state.total = 0;
      state.rest = event.timeStamp + WHEEL_REST_MS;
    }
    dock.addEventListener("wheel", onWheel, { passive: false });
    return () => dock.removeEventListener("wheel", onWheel);
  }, [enhanced, stepProject]);

  /*
    La lista plegada del teléfono: al abrirse, el foco va al proyecto a la
    vista; Escape la cierra y devuelve el foco al contador, y tocar fuera la
    cierra sin más.
  */
  useEffect(() => {
    if (!listOpen) return;
    listRef.current?.querySelector<HTMLElement>('[aria-current="true"]')?.focus();
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      setListOpen(false);
      toggleRef.current?.focus();
    }
    function onDown(event: globalThis.PointerEvent) {
      if (!dockRef.current?.contains(event.target as Node)) setListOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [listOpen]);

  /* Si la fila del muelle no cabe y se desplaza, el proyecto elegido se trae
     al centro de la fila (su imán también es el centro), sin mover la
     página. */
  useEffect(() => {
    const list = listRef.current;
    if (!list || !enhanced || list.scrollWidth <= list.clientWidth + 1) return;
    const item = list.querySelector<HTMLElement>('[aria-current="true"]');
    if (!item) return;
    list.scrollTo({
      left: item.offsetLeft - (list.clientWidth - item.offsetWidth) / 2,
      behavior: running ? "smooth" : "auto",
    });
  }, [current.id, enhanced, running]);

  function chooseLayer(next: TableLayer) {
    setLayer(next);
    setHovered(null);
    setSpoken(true);
  }

  function onTabKey(event: KeyboardEvent<HTMLDivElement>) {
    const index = TABLE_LAYERS.indexOf(layer);
    let next: number | null = null;
    if (event.key === "ArrowRight") next = (index + 1) % TABLE_LAYERS.length;
    if (event.key === "ArrowLeft") next = (index - 1 + TABLE_LAYERS.length) % TABLE_LAYERS.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = TABLE_LAYERS.length - 1;
    if (next === null) return;
    event.preventDefault();
    const target = TABLE_LAYERS[next];
    chooseLayer(target);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-layer-tab="${target}"]`)?.focus();
  }

  const setFront = (value: number, fromRing = false) => {
    const total = current.reel.length;
    setViaRing(fromRing);
    setSpoken(true);
    setView({ project: current.id, front: ((value % total) + total) % total, picked });
  };
  const pick = (id: string) => setView({ project: current.id, front, picked: id });

  // El tambor gira con las flechas cuando el foco está dentro.
  function onRingKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = front + (event.key === "ArrowRight" ? 1 : -1);
    setFront(next, true);
    const total = current.reel.length;
    const index = current.reel[((next % total) + total) % total].screen;
    // El foco viaja con la pantalla elegida, que es la única en el orden de
    // tabulación. Por su índice y no por su puesto en el DOM: la mesa sólo
    // monta las pantallas que levanta (`onTable`).
    requestAnimationFrame(() =>
      rootRef.current
        ?.querySelector<HTMLButtonElement>(`#${current.id} .holo-screen[data-screen="${index}"] .holo-screen__pick`)
        ?.focus(),
    );
  }

  /*
    El muelle con el teclado: ← → pasan de proyecto y el foco viaja con él
    (el enlace ya existe, no hay que esperar a pintar); Inicio y Fin, al
    primero y al último.
  */
  function onDockKey(event: KeyboardEvent<HTMLUListElement>) {
    let target: TableProject | null = null;
    // Plegado en el teléfono, la lista es vertical: ↑ ↓ también.
    if (event.key === "ArrowRight" || (listOpen && event.key === "ArrowDown")) target = neighbour(1);
    if (event.key === "ArrowLeft" || (listOpen && event.key === "ArrowUp")) target = neighbour(-1);
    if (event.key === "Home") target = projects[0];
    if (event.key === "End") target = projects[projects.length - 1];
    if (!target) return;
    event.preventDefault();
    switchProject(target.id);
    event.currentTarget.querySelector<HTMLAnchorElement>(`a[href="#${target.id}"]`)?.focus();
  }

  // Paralaje de la mesa entera, ≤ 2°, sólo con puntero fino y movimiento.
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const root = rootRef.current;
    if (!root || !running || event.pointerType !== "mouse" || !window.matchMedia("(pointer: fine)").matches) return;
    const rect = root.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
    const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
    // El artículo entero, no sólo la mesa: la sala se desplaza al revés que
    // el holograma, y esa diferencia es la que da profundidad.
    const page = root.closest<HTMLElement>(".projects-page") ?? root;
    page.style.setProperty("--px", x.toFixed(3));
    page.style.setProperty("--py", y.toFixed(3));
  }

  function restPointer() {
    const page = rootRef.current?.closest<HTMLElement>(".projects-page") ?? rootRef.current;
    page?.style.setProperty("--px", "0");
    page?.style.setProperty("--py", "0");
  }

  // Las capturas del proyecto que se apunta en el muelle se piden antes.
  const prefetched = useRef(new Set<string>());
  function prefetch(entry: TableProject) {
    if (prefetched.current.has(entry.id)) return;
    prefetched.current.add(entry.id);
    for (const screen of entry.screens.filter((item) => item.slot)) {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.as = "image";
      link.href = screen.sources.src;
      document.head.append(link);
    }
  }

  /*
    Las miniaturas de la vista previa (el peldaño pequeño, cinco imágenes
    ligeras) se piden en cuanto la mesa se ha asentado: así la vista previa
    nunca espera a la red ni compite con las pantallas grandes de la mesa.
  */
  useEffect(() => {
    if (!enhanced) return;
    const timer = window.setTimeout(() => {
      for (const entry of projects) new Image().src = entry.screens[0].sources.thumb;
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [enhanced, projects]);

  /*
    La vista previa se apaga con un respiro: da tiempo a llevar el puntero
    del enlace a ella sin que desaparezca, y mientras se apunta, se queda.
    Escape la cierra siempre (WCAG 1.4.13).
  */
  const peekTimer = useRef<number | undefined>(undefined);
  const holdPeek = () => window.clearTimeout(peekTimer.current);
  const closePeek = useCallback(() => {
    window.clearTimeout(peekTimer.current);
    setPeek((value) => (value?.open ? { ...value, open: false } : value));
  }, []);
  function releasePeek() {
    window.clearTimeout(peekTimer.current);
    peekTimer.current = window.setTimeout(closePeek, PEEK_LINGER_MS);
  }
  function peekAt(entry: TableProject) {
    holdPeek();
    prefetch(entry);
    setPeek({ id: entry.id, open: true });
  }
  const peekOpen = Boolean(peek?.open);
  useEffect(() => {
    if (!peekOpen) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") closePeek();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closePeek, peekOpen]);
  useEffect(() => () => window.clearTimeout(peekTimer.current), []);

  const frontStep = current.reel[front];
  const chosenId = picked ?? initialNode(current.architecture);
  const focusId = hovered ?? chosenId;
  const focusNode = current.architecture.nodes.find((node) => node.id === focusId);
  const focusPath = nodePath(current.architecture.edges, focusId);
  const peeked = peek ? projects.find((entry) => entry.id === peek.id) : undefined;
  const announcement =
    layer === "ingenieria"
      ? `${current.name} · ${t.layers.ingenieria} · ${t.modules(current.counts.modules)}`
      : layer === "diseno"
        ? `${current.name} · ${t.layers.diseno} · ${t.step(current.reelKind)} ${front + 1} ${t.of} ${
            current.reel.length
          }${viaRing || !frontStep ? "" : `: ${frontStep.note}`}`
        : `${current.name} · ${t.layers.producto}`;

  return (
    <div
      ref={rootRef}
      className="table"
      data-enhanced={enhanced ? "true" : undefined}
      data-layer={layer}
      data-motion={running ? "on" : "off"}
      onPointerLeave={restPointer}
      onPointerMove={onPointerMove}
    >
      <header className="table-head">
        <p className="table-kicker">{head.kicker}</p>
        <h1 className="table-head__title">{head.title}</h1>
      </header>

      {/*
        EL MUELLE: la barra de misión. Sin JavaScript es una lista de enlaces
        `#id` que `:target` resuelve; con él, el activo lleva `aria-current`,
        una luz se desliza bajo él y apuntar otro proyecto lo previsualiza.
        Va en el DOM justo tras la cabecera, aunque en escritorio se pinte al
        pie: el orden de foco y de lectura es elegir proyecto → capa →
        lectura, el mismo que se ve en móvil (chips arriba).
      */}
      <nav
        ref={dockRef}
        aria-label={t.projects}
        className="table-dock"
        data-open={listOpen ? "true" : undefined}
        style={{ "--n": projects.length, "--active": currentIndex } as CSSProperties}
      >
        <button
          aria-label={t.previousProject}
          className="table-dock__step"
          data-dir="prev"
          onClick={() => stepProject(-1)}
          type="button"
        >
          <Chevron direction="left" />
        </button>
        {/* Sólo en el teléfono: el muelle plegado en su posición. */}
        <button
          ref={toggleRef}
          aria-controls="table-dock-list"
          aria-expanded={listOpen}
          aria-label={t.changeProject(current.name, currentIndex + 1, projects.length)}
          className="table-dock__toggle"
          onClick={() => setListOpen((open) => !open)}
          type="button"
        >
          <span aria-hidden="true">
            {pad(currentIndex + 1)} <span className="table-dock__toggle-of">/ {pad(projects.length)}</span>
          </span>
        </button>
        <div className="table-dock__rail">
          <ul ref={listRef} className="table-dock__list" id="table-dock-list" onKeyDown={onDockKey}>
            {projects.map((entry, index) => (
              <li
                key={entry.id}
                data-dist={enhanced ? Math.min(Math.abs(index - currentIndex), 2) : undefined}
              >
                <a
                  aria-current={enhanced && entry.id === project ? "true" : undefined}
                  className="table-dock__item"
                  href={`#${entry.id}`}
                  onBlur={closePeek}
                  onClick={(event) => {
                    event.preventDefault();
                    switchProject(entry.id);
                    if (listOpen) {
                      setListOpen(false);
                      toggleRef.current?.focus();
                    }
                  }}
                  onFocus={(event: FocusEvent<HTMLAnchorElement>) => {
                    prefetch(entry);
                    if (focusVisible(event.currentTarget)) peekAt(entry);
                  }}
                  onPointerEnter={(event) => {
                    prefetch(entry);
                    if (event.pointerType === "mouse") peekAt(entry);
                  }}
                  onPointerLeave={releasePeek}
                >
                  <span className="visually-hidden">{entry.title}</span>
                  <span aria-hidden="true" className="table-dock__index">
                    {pad(index + 1)}
                  </span>
                  <span aria-hidden="true" className="table-dock__name">
                    {entry.name}
                  </span>
                </a>
              </li>
            ))}
          </ul>
          {/* La luz del activo: nace ya en su sitio al hidratar (no viaja
              desde el primero) y después se desliza de uno a otro. */}
          {enhanced ? <span aria-hidden="true" className="table-dock__glow" /> : null}
          {peeked ? (
            <div
              aria-hidden="true"
              className="table-dock__peek"
              data-open={peek?.open && peeked.id !== current.id ? "true" : undefined}
              onPointerEnter={holdPeek}
              onPointerLeave={releasePeek}
              style={
                {
                  "--peek": projects.indexOf(peeked),
                  ...(peeked.screens[0].sources.luma === null ? {} : { "--luma": peeked.screens[0].sources.luma }),
                } as CSSProperties
              }
            >
              <span className="table-dock__peek-shot" data-frame={peeked.screens[0].frame}>
                {/* Una imagen por proyecto (`key`): con la red lenta, mientras
                    llega, se ve el fondo oscuro, nunca la captura de otro. */}
                <img
                  key={peeked.id}
                  alt=""
                  decoding="async"
                  height={peeked.screens[0].sources.height}
                  src={peeked.screens[0].sources.thumb}
                  width={peeked.screens[0].sources.width}
                />
              </span>
              <span className="table-dock__peek-text">
                <span className="table-dock__peek-name">{peeked.name}</span>
                <span className="table-dock__peek-what">{peeked.descriptor}</span>
              </span>
            </div>
          ) : null}
        </div>
        <button
          aria-label={t.nextProject}
          className="table-dock__step"
          data-dir="next"
          onClick={() => stepProject(1)}
          type="button"
        >
          <Chevron direction="right" />
        </button>
      </nav>

      <div aria-label={t.depth} className="table-tabs" onKeyDown={onTabKey} role="tablist">
        {TABLE_LAYERS.map((entry) => (
          <button
            key={entry}
            aria-controls={`${current.id}-stage`}
            aria-selected={layer === entry}
            className="table-tab"
            data-layer-tab={entry}
            id={`table-tab-${entry}`}
            onClick={() => chooseLayer(entry)}
            role="tab"
            tabIndex={layer === entry ? 0 : -1}
            type="button"
          >
            {t.layers[entry]}
          </button>
        ))}
      </div>

      <div className="console-wrap">
        <Console focus={focusId} path={focusPath} project={current} />
      </div>

      {projects.map((entry, projectIndex) => {
        const isActive = enhanced ? entry.id === project : undefined;
        const state = !enhanced ? undefined : isActive ? "active" : entry.id === leaving ? "leaving" : "hidden";
        const demo = entry.links.find((link) => link.kind === "demo");
        const repository = entry.links.find((link) => link.kind === "repository");
        const entryFront = entry.id === current.id ? front : 0;
        const step = entry.reel[entryFront];
        const operable = (target: TableLayer) => Boolean(isActive) && layer === target;
        return (
          <section
            key={entry.id}
            aria-labelledby={`${entry.id}-title`}
            className="table-project"
            data-state={state}
            id={entry.id}
            inert={enhanced && !isActive}
          >
            <div className="table-read">
              <span aria-hidden="true" className="table-read__rule" />
              {/* El tamaño del nombre sale de su longitud: cabe en una línea
                  si razonablemente puede (§17). */}
              <h2
                className="table-read__title"
                id={`${entry.id}-title`}
                style={{ "--len": Math.max(entry.name.length, 5) } as CSSProperties}
              >
                {entry.name}
              </h2>
              <p className="table-read__descriptor">{entry.descriptor}</p>
              <p className="table-read__status">
                <span aria-hidden="true" className="table-led" data-state={entry.status} />
                {/* Se ve la lectura corta; se lee la etiqueta entera del MDX. */}
                <span aria-hidden="true">{statusReadout(entry.status, locale)}</span>
                <span className="visually-hidden">{entry.statusLabel}</span>
              </p>
              {/* En escritorio el stack va grabado en la mesa; aquí lo lee el
                  lector de pantalla, y en móvil, donde no hay mesa, todos. */}
              <ul aria-label={t.technologies} className="table-read__stack">
                {entry.technologies.map((technology) => (
                  <li key={technology}>{technology}</li>
                ))}
              </ul>
              <div className="table-read__actions">
                <Link className="table-cta" href={entry.href}>
                  {t.explore} <span aria-hidden="true">→</span>
                </Link>
                {demo ? (
                  <a className="table-cta table-cta--site" href={demo.href} rel="noopener noreferrer" target="_blank">
                    {demo.label} <span aria-hidden="true">↗</span>
                  </a>
                ) : null}
                {repository ? (
                  <a className="table-read__code" href={repository.href} rel="noopener noreferrer" target="_blank">
                    <GithubMark />
                    <span className="table-read__code-label">{t.code}</span>
                    <span aria-hidden="true" className="table-read__code-out">
                      ↗
                    </span>
                  </a>
                ) : null}
              </div>
            </div>

            <div
              aria-labelledby={`table-tab-${layer}`}
              className="table-scene"
              id={`${entry.id}-stage`}
              role={enhanced ? "tabpanel" : undefined}
              style={
                {
                  // El esquema mide lo que el sistema ocupa: columnas y filas
                  // viajan al escenario para colocar el par esquema+inspector.
                  "--cols": entry.architecture.cols,
                  "--rows": entry.architecture.rows,
                  "--reel-x": REEL_CENTER,
                } as CSSProperties
              }
            >
              {/* Fuera de `.holo` a propósito: dentro del contexto 3D, un
                  hijo que se mezcla o recorta obliga a aplanar el grupo, y
                  entonces ninguna pantalla tiene perspectiva de verdad. El
                  velo de Ingeniería también: sombra detrás de los paneles. */}
              <span aria-hidden="true" className="holo-beam" />
              <span aria-hidden="true" className="holo-shade" />
              <div className="holo">
                <div
                  aria-label={t.screensOf(entry.name)}
                  className="holo-screens"
                  onKeyDown={onRingKey}
                  role="group"
                >
                  {/* Sólo las que la mesa levanta alguna vez (`onTable`): el
                      resto es del caso completo y aquí sería una imagen
                      invisible que igualmente se descarga. */}
                  {entry.screens.filter((screen) => screen.onTable).map((screen) => {
                    const index = entry.reel.findIndex((item) => item.screen === screen.index);
                    const ring = index < 0 ? null : ringOffset(index, entryFront, entry.reel.length);
                    return (
                      <Screen
                        key={screen.src}
                        eager={projectIndex === 0 && screen.featured}
                        front={ring === 0}
                        onPick={() => {
                          if (index >= 0) setFront(index);
                        }}
                        // Fuera del carrete la pantalla no se elige: mientras se
                        // retira (0,6 s) seguía apuntable y un clic saltaba a
                        // la última decisión.
                        operable={operable("diseno") && index >= 0}
                        projectId={entry.id}
                        ring={ring}
                        screen={screen}
                        step={index < 0 ? null : entry.reel[index]}
                      />
                    );
                  })}
                </div>

                <SystemInspector
                  node={entry.id === current.id ? focusNode : undefined}
                  project={entry}
                />
                <SystemDiagram
                  chosen={entry.id === current.id ? chosenId : initialNode(entry.architecture)}
                  focus={entry.id === current.id ? focusId : null}
                  onHover={setHovered}
                  onPick={pick}
                  operable={operable("ingenieria")}
                  project={entry}
                />
              </div>

              <Scope items={entry.scope} projectId={entry.id} />

              {/*
                DISEÑO: la nota del carrete. Con decisiones, una decisión
                legible —problema apagado, decisión brillante—; sin ellas, el
                pie de la pantalla. Callada para el lector de pantalla: la
                pantalla elegida ya la lleva por `aria-describedby`.
              */}
              <div className="holo-note" data-kind={entry.reelKind} inert={!operable("diseno")}>
                <button
                  aria-label={t.previousStep(entry.reelKind)}
                  className="holo-note__step"
                  onClick={() => setFront(entryFront - 1)}
                  type="button"
                >
                  <span aria-hidden="true">←</span>
                </button>
                <div aria-hidden="true" className="holo-note__text">
                  <p className="holo-note__index">
                    {pad(entryFront + 1)} / {pad(entry.reel.length)}
                  </p>
                  {step?.problem ? (
                    <>
                      <p className="holo-note__line" data-part="problem">
                        <span className="holo-note__label">{t.problem}</span>
                        <span className="holo-note__problem">{step.problem}</span>
                      </p>
                      <p className="holo-note__line" data-part="decision">
                        <span className="holo-note__label">{t.decision}</span>
                        <span className="holo-note__decision">{step.note}</span>
                      </p>
                    </>
                  ) : (
                    <p className="holo-note__line" data-part="caption">
                      <span className="holo-note__caption">{step?.note}</span>
                    </p>
                  )}
                </div>
                <button
                  aria-label={t.nextStep(entry.reelKind)}
                  className="holo-note__step"
                  onClick={() => setFront(entryFront + 1)}
                  type="button"
                >
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>

            {/*
              La ficha sin JavaScript: lo que la mesa proyecta, en texto. Sólo
              se pinta con `scripting: none`; con la mesa viva sobraría.
            */}
            <div className="table-fallback">
              {entry.reelKind === "decisions" ? (
                <>
                  <h3>{t.designDecisions}</h3>
                  <ol>
                    {entry.reel.map((step) => (
                      <li key={step.screen}>
                        <span>{t.problem}: {step.problem}</span> <b>{t.decision}: {step.note}</b>
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <>
                  <h3>{t.screens}</h3>
                  <ol>
                    {entry.screens.map((screen) => (
                      <li key={screen.src}>{screen.caption}</li>
                    ))}
                  </ol>
                </>
              )}
              <h3>{t.system}</h3>
              <dl>
                {entry.architecture.nodes.map((node) => (
                  <div key={node.id}>
                    <dt>
                      {node.label} <small>· {LANE_LABEL[locale][node.lane]}</small>
                    </dt>
                    {node.decision ? <dd>{node.decision}</dd> : null}
                  </div>
                ))}
              </dl>
            </div>
          </section>
        );
      })}

      <p aria-live="polite" className="visually-hidden">
        {enhanced && spoken ? announcement : ""}
      </p>
    </div>
  );
}
