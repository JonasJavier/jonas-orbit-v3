"use client";

/* Los peldaños WebP los prepara tools/prepare-projects.mjs y se sirven tal
   cual con `srcset`: el optimizador de Next no sabe elegir entre archivos que
   ya existen a cada ancho. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import type { ArchitectureLane } from "@/content/projects.data";
import { useMotionEnabled } from "@/lib/effects-mode";
import {
  DIAGRAM_BOX,
  initialNode,
  NODE_HALF_WIDTH,
  NODE_ROW_FILL,
  projectFromHash,
  ringOffset,
  ringPose,
  statusReadout,
  TABLE_LAYERS,
  type ScreenPose,
  type TableLayer,
  type TableNode,
  type TableProject,
  type TableScreen,
} from "@/lib/engineering-table";

/**
 * LA MESA DE INGENIERÍA — `/es/proyectos`, segundo pase
 * (`docs/design/endurance-proyectos.md` §16).
 *
 * Un proyecto se lee a tres profundidades sobre la misma mesa, y cada capa
 * cambia lo que se proyecta, no la página:
 *
 * - RESULTADO: tres pantallas en arco —teléfono, destacada, siguiente—.
 * - DISEÑO: todas las pantallas en un carrete; la elegida delante y su nota,
 *   una sola línea, debajo.
 * - INGENIERÍA: las pantallas vuelven a la mesa y se levanta el sistema: el
 *   esquema por carriles y el inspector del módulo elegido (su capa, su
 *   decisión y sus conexiones).
 *
 * La lectura de la izquierda no cambia con la capa: nombre, qué es, estado y
 * la salida al caso completo. Todo el texto largo vive en el caso.
 *
 * Sin JavaScript no hay mesa que perder: cada proyecto es una `<section id>`,
 * `:target` elige el proyecto y una ficha estática (sólo con `scripting:
 * none`) lista las pantallas con su nota y el sistema con sus decisiones.
 */

const LAYER_LABEL: Record<TableLayer, string> = {
  resultado: "Resultado",
  diseno: "Diseño",
  ingenieria: "Ingeniería",
};

const LANE_LABEL: Record<ArchitectureLane, string> = {
  cliente: "Cliente",
  servicio: "Servicio",
  datos: "Datos",
  infraestructura: "Infraestructura",
};

/** Cuánto dura el cruce entre proyectos: el saliente se apaga en la mesa. */
const SWITCH_MS = 450;

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

/* ── Glifos técnicos ────────────────────────────────────────────────────── */

function LaneGlyph({ lane, className = "holo-glyph" }: { lane: ArchitectureLane; className?: string }) {
  const common = { "aria-hidden": true, focusable: "false", viewBox: "0 0 20 20", className } as const;
  switch (lane) {
    case "cliente":
      return (
        <svg {...common}>
          <rect x="2.5" y="4" width="15" height="12" rx="1.5" />
          <path d="M2.5 7.5h15" />
        </svg>
      );
    case "servicio":
      return (
        <svg {...common}>
          <path d="M10 2.8 16.3 6.4v7.2L10 17.2 3.7 13.6V6.4Z" />
          <circle cx="10" cy="10" r="2.4" />
        </svg>
      );
    case "datos":
      return (
        <svg {...common}>
          <ellipse cx="10" cy="5" rx="6.5" ry="2.4" />
          <path d="M3.5 5v10c0 1.3 2.9 2.4 6.5 2.4s6.5-1.1 6.5-2.4V5M3.5 10c0 1.3 2.9 2.4 6.5 2.4s6.5-1.1 6.5-2.4" />
        </svg>
      );
    case "infraestructura":
      return (
        <svg {...common}>
          <path d="M6 15.5a3.6 3.6 0 0 1-.5-7.2 4.8 4.8 0 0 1 9.2-.9A3.2 3.2 0 0 1 14.5 15.5Z" />
          <path d="M7.5 15.5v2M12.5 15.5v2" />
        </svg>
      );
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
  front,
  operable,
  onPick,
}: {
  screen: TableScreen;
  projectId: string;
  eager: boolean;
  ring: number;
  front: boolean;
  operable: boolean;
  onPick: () => void;
}) {
  const noteId = `${projectId}-screen-${screen.index}-note`;
  const style = {
    "--i": screen.index,
    "--ar": screen.sources.width / screen.sources.height,
    ...poseVars("r", screen.poses.resultado),
    ...poseVars("d", ringPose(ring, screen.frame)),
    ...poseVars("i", screen.poses.ingenieria),
  } as CSSProperties;
  return (
    <figure
      className="holo-screen"
      data-frame={screen.frame}
      data-slot={screen.slot ?? "none"}
      data-front={front ? "true" : undefined}
      data-far={Math.abs(ring) > 2 ? "true" : undefined}
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
          aria-describedby={noteId}
          aria-label={screen.alt}
          inert={!operable}
          onClick={onPick}
          tabIndex={front ? 0 : -1}
        />
      </div>
      <figcaption className="visually-hidden" id={noteId}>
        {screen.caption}
      </figcaption>
      <span aria-hidden="true" className="holo-screen__tether" />
    </figure>
  );
}

/* ── El esquema ────────────────────────────────────────────────────────── */

/**
 * La caja de un nodo en porcentajes del esquema: tan ancha como la caja que se
 * ve y tan alta como su fila entera, que es el blanco del puntero. La caja
 * visible (`NODE_ROW_FILL` de la fila) la centra el CSS dentro.
 */
function nodeBox(node: TableNode, rows: number): CSSProperties {
  const col = DIAGRAM_BOX / 4;
  const rowHeight = DIAGRAM_BOX / rows;
  const cx = col * (node.col + 0.5);
  const top = rowHeight * node.row;
  return {
    left: `${((cx - NODE_HALF_WIDTH) / DIAGRAM_BOX) * 100}%`,
    top: `${(top / DIAGRAM_BOX) * 100}%`,
    width: `${((NODE_HALF_WIDTH * 2) / DIAGRAM_BOX) * 100}%`,
    height: `${(rowHeight / DIAGRAM_BOX) * 100}%`,
    "--fill": `${NODE_ROW_FILL * 100}%`,
  } as CSSProperties;
}

function Diagram({
  project,
  focus,
  chosen,
  operable,
  onHover,
  onPick,
}: {
  project: TableProject;
  /** El nodo que se mira: el apuntado o, si no hay, el elegido. */
  focus: string | null;
  /** El nodo elegido (clic, foco o el de entrada): el único tabulable. */
  chosen: string | null;
  operable: boolean;
  onHover: (id: string | null) => void;
  onPick: (id: string) => void;
}) {
  const { architecture } = project;
  const linked = new Set<string>();
  for (const edge of architecture.edges) {
    if (edge.from === focus) linked.add(edge.to);
    if (edge.to === focus) linked.add(edge.from);
  }

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(event.key)) return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>(".holo-node__box"));
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    event.preventDefault();
    const step = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
    const target =
      event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + step + buttons.length) % buttons.length;
    buttons[target]?.focus();
  }

  return (
    <div
      className="holo-card holo-diagram"
      data-focus={focus ?? undefined}
      style={{ "--rows": architecture.rows } as CSSProperties}
    >
      <p className="holo-card__bar">
        <span>Arquitectura</span>
        <span className="holo-card__meta">
          {pad(project.counts.modules)} módulos · {pad(project.counts.connections)} conexiones
        </span>
      </p>
      <div
        aria-label={`Sistema de ${project.name}`}
        className="holo-diagram__field"
        onKeyDown={onKey}
        onPointerLeave={() => onHover(null)}
        role="group"
      >
        <svg
          aria-hidden="true"
          className="holo-diagram__lines"
          focusable="false"
          preserveAspectRatio="none"
          viewBox={`0 0 ${DIAGRAM_BOX} ${DIAGRAM_BOX}`}
        >
          {architecture.edges.map((edge) => (
            <path
              key={`${edge.from}-${edge.to}`}
              className="holo-line"
              d={edge.d}
              data-on={focus && (edge.from === focus || edge.to === focus) ? "true" : undefined}
              data-shape={edge.shape}
              pathLength={1}
            />
          ))}
        </svg>
        {/*
          Un carril por grupo: en escritorio el grupo no existe para la caja
          (`display: contents`) y cada nodo cae en su sitio del esquema; en
          móvil el grupo es una fila con su rótulo y los nodos en columna.
        */}
        {architecture.lanes.map(({ lane }, col) => (
          <div key={lane} className="holo-lane" data-lane={lane} style={{ "--col": col } as CSSProperties}>
            <p aria-hidden="true" className="holo-lane__title">
              {LANE_LABEL[lane]}
            </p>
            {architecture.nodes
              .filter((node) => node.lane === lane)
              .map((node) => {
                const decisionId = node.decision ? `${project.id}-node-${node.id}-decision` : undefined;
                const selected = node.id === focus;
                const isChosen = node.id === chosen;
                return (
                  <div
                    key={node.id}
                    className="holo-node"
                    data-has-decision={node.decision ? "true" : undefined}
                    data-lane={node.lane}
                    data-linked={linked.has(node.id) ? "true" : undefined}
                    data-node-id={node.id}
                    data-selected={selected ? "true" : undefined}
                    style={nodeBox(node, architecture.rows)}
                  >
                    <button
                      type="button"
                      className="holo-node__box"
                      aria-describedby={decisionId}
                      aria-pressed={isChosen}
                      inert={!operable}
                      onClick={() => onPick(node.id)}
                      onFocus={() => {
                        // El teclado manda sobre un puntero en reposo: si el
                        // ratón se quedó encima de otro nodo, el foco gana.
                        onHover(null);
                        onPick(node.id);
                      }}
                      onPointerEnter={() => onHover(node.id)}
                      tabIndex={isChosen ? 0 : -1}
                    >
                      {/* El botón es la fila entera —el blanco— y la caja que
                          se ve ocupa sólo su centro. */}
                      <span className="holo-node__chip">
                        {node.thumb ? (
                          <img
                            alt=""
                            className="holo-node__thumb"
                            data-frame={node.frame ?? undefined}
                            decoding="async"
                            loading="lazy"
                            src={node.thumb}
                          />
                        ) : (
                          <LaneGlyph lane={node.lane} />
                        )}
                        <span className="holo-node__label">{node.label}</span>
                        {node.decision ? <span aria-hidden="true" className="holo-node__mark" /> : null}
                      </span>
                    </button>
                    {node.decision ? (
                      <p className="holo-node__decision" id={decisionId}>
                        {node.decision}
                      </p>
                    ) : null}
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── El inspector del módulo elegido ───────────────────────────────────── */

/**
 * El inspector del módulo elegido: en qué capa del sistema vive —las cuatro
 * placas, de la infraestructura abajo al cliente arriba, con la suya
 * encendida—, qué se decidió en él y con qué se conecta.
 */
function Inspector({ project, node }: { project: TableProject; node: TableNode | undefined }) {
  const decision = node?.decision ?? (project.architecture.derived ? project.decision : null);
  const plates = [...project.architecture.lanes].reverse();
  return (
    <section aria-label="Inspector del módulo" className="holo-card holo-inspector">
      <p className="holo-card__bar">
        <span>Inspector</span>
        <span className="holo-card__meta">{pad(project.counts.decisions)} decisiones</span>
      </p>
      {node ? (
        <div className="holo-inspector__body" key={node.id}>
          <div className="holo-inspector__head">
            <span aria-hidden="true" className="holo-stack">
              {plates.map(({ lane, count }, index) => (
                <span
                  key={lane}
                  className="holo-plate"
                  data-empty={count === 0 ? "true" : undefined}
                  data-on={lane === node.lane ? "true" : undefined}
                  style={{ "--k": index } as CSSProperties}
                />
              ))}
            </span>
            <div>
              <p className="holo-inspector__lane" data-lane={node.lane}>
                {LANE_LABEL[node.lane]}
              </p>
              <h3 className="holo-inspector__title">{node.label}</h3>
            </div>
          </div>
          {decision ? (
            <blockquote className="holo-inspector__decision">
              <p>{decision}</p>
            </blockquote>
          ) : null}
          <dl className="holo-inspector__links">
            {node.inputs.length > 0 ? (
              <div>
                <dt>Recibe de</dt>
                <dd>{node.inputs.join(" · ")}</dd>
              </div>
            ) : null}
            {node.outputs.length > 0 ? (
              <div>
                <dt>Entrega a</dt>
                <dd>{node.outputs.join(" · ")}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}
    </section>
  );
}

/* ── La mesa física ────────────────────────────────────────────────────── */

/**
 * El plano de la Endurance grabado en el cristal: el anillo de doce módulos,
 * los cuatro brazos y el núcleo, en trazo fino. Es la mesa de la nave, no un
 * dato: no dice nada del proyecto.
 */
function EnduranceEtching() {
  const modules = Array.from({ length: 12 }, (_, index) => index * 30);
  return (
    <svg aria-hidden="true" className="console__etching" focusable="false" viewBox="-120 -120 240 240">
      <circle r="92" className="console__etching-orbit" />
      <circle r="70" className="console__etching-orbit" />
      {modules.map((angle) => (
        <g key={angle} transform={`rotate(${angle})`}>
          <rect x="-15" y="-96" width="30" height="22" rx="3" />
          <path d="M-5 -74v-4M5 -74v-4" />
        </g>
      ))}
      {[45, 135, 225, 315].map((angle) => (
        <path key={angle} d="M0 -16V-70" transform={`rotate(${angle})`} />
      ))}
      <circle r="16" />
      <circle r="7" />
    </svg>
  );
}

const QUADRANTS: { lane: ArchitectureLane; place: string }[] = [
  { lane: "cliente", place: "nw" },
  { lane: "servicio", place: "sw" },
  { lane: "datos", place: "ne" },
  { lane: "infraestructura", place: "se" },
];

function Console({ project, layer }: { project: TableProject; layer: TableLayer }) {
  const counts = new Map(project.architecture.lanes.map(({ lane, count }) => [lane, count]));
  return (
    <div aria-hidden="true" className="console">
      <div className="console__body">
        <div className="console__top">
          <div className="console__glass">
            <div className="console__grid" />
            <div className="console__pool" />
            <EnduranceEtching />
            {QUADRANTS.map(({ lane, place }) => (
              <p key={lane} className="console__quadrant" data-place={place}>
                <span>{LANE_LABEL[lane]}</span>
                <small>{pad(counts.get(lane) ?? 0)} módulos</small>
              </p>
            ))}
            <p className="console__plate">
              <b>{project.name}</b>
              <span>
                {pad(project.order)} · {LAYER_LABEL[layer]}
              </span>
            </p>
            <p className="console__spec">{project.technologies.join("  ·  ")}</p>
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

/* ── La mesa ───────────────────────────────────────────────────────────── */

export function EngineeringTable({
  projects,
  head,
}: {
  projects: TableProject[];
  /** Kicker y título de la página: el destino, no el proyecto. */
  head: { kicker: string; title: string; motto: string };
}) {
  const rootRef = useRef<HTMLDivElement>(null);
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
  const project = enhanced ? (projectFromHash(hash, projects) ?? projects[0]).id : null;
  const current = projects.find((entry) => entry.id === project) ?? projects[0];

  const [leaving, setLeaving] = useState<string | null>(null);
  const [layer, setLayer] = useState<TableLayer>("resultado");
  // Lo que se mira dentro del proyecto: la pantalla del tambor y el módulo del
  // inspector. Pertenecen al proyecto y se olvidan al cambiarlo.
  const [view, setView] = useState<{ project: string | null; front: number; picked: string | null }>({
    project: null,
    front: 0,
    picked: null,
  });
  const [hovered, setHovered] = useState<string | null>(null);
  const front = view.project === current.id ? view.front : 0;
  const picked = view.project === current.id ? view.picked : null;

  const switchProject = useCallback(
    (id: string) => {
      if (id === project || !project) return;
      setLeaving(running ? project : null);
      setHovered(null);
      setView({ project: id, front: 0, picked: null });
      window.history.replaceState(window.history.state, "", `#${id}`);
      window.dispatchEvent(new Event(HASH_EVENT));
    },
    [project, running],
  );

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => setLeaving(null), SWITCH_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  function chooseLayer(next: TableLayer) {
    setLayer(next);
    setHovered(null);
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

  const setFront = (value: number) => {
    const total = current.screens.length;
    setView({ project: current.id, front: ((value % total) + total) % total, picked });
  };
  const pick = (id: string) => setView({ project: current.id, front, picked: id });

  // El tambor gira con las flechas cuando el foco está dentro.
  function onRingKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = front + (event.key === "ArrowRight" ? 1 : -1);
    setFront(next);
    const total = current.screens.length;
    const index = ((next % total) + total) % total;
    // El foco viaja con la pantalla elegida, que es la única en el orden de tabulación.
    requestAnimationFrame(() =>
      rootRef.current
        ?.querySelector<HTMLButtonElement>(`#${current.id} .holo-screen:nth-of-type(${index + 1}) .holo-screen__pick`)
        ?.focus(),
    );
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

  const frontScreen = current.screens[front];
  const chosenId = picked ?? initialNode(current.architecture);
  const focusId = hovered ?? chosenId;
  const focusNode = current.architecture.nodes.find((node) => node.id === focusId);
  const announcement =
    layer === "ingenieria"
      ? `${current.name} · Ingeniería · ${current.counts.modules} módulos`
      : layer === "diseno"
        ? `${current.name} · Diseño · pantalla ${front + 1} de ${current.counts.screens}: ${frontScreen?.caption ?? ""}`
        : `${current.name} · Resultado`;

  return (
    <div
      ref={rootRef}
      className="table"
      data-boot={enhanced && running ? "on" : "off"}
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

      <p aria-hidden="true" className="table-motto">
        {head.motto}
      </p>

      <div aria-label="Profundidad de lectura" className="table-tabs" onKeyDown={onTabKey} role="tablist">
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
            {LAYER_LABEL[entry]}
          </button>
        ))}
      </div>

      <div className="console-wrap">
        <Console layer={layer} project={current} />
      </div>

      {projects.map((entry, projectIndex) => {
        const isActive = enhanced ? entry.id === project : undefined;
        const state = !enhanced ? undefined : isActive ? "active" : entry.id === leaving ? "leaving" : "hidden";
        const demo = entry.links.find((link) => link.kind === "demo");
        const repository = entry.links.find((link) => link.kind === "repository");
        const entryFront = entry.id === current.id ? front : 0;
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
              <h2 className="table-read__title" id={`${entry.id}-title`}>
                {entry.name}
              </h2>
              <p className="table-read__descriptor">{entry.descriptor}</p>
              <p className="table-read__status">
                <span aria-hidden="true" className="table-led" data-state={entry.status} />
                <span title={entry.statusLabel}>{statusReadout(entry.status)}</span>
              </p>
              {/* En escritorio el stack va grabado en la mesa; aquí lo lee el
                  lector de pantalla, y en móvil, donde no hay mesa, todos. */}
              <ul aria-label="Tecnologías" className="table-read__stack">
                {entry.technologies.map((technology) => (
                  <li key={technology}>{technology}</li>
                ))}
              </ul>
              <div className="table-read__actions">
                <Link className="table-cta" href={entry.href}>
                  Explorar proyecto <span aria-hidden="true">→</span>
                </Link>
                {demo ? (
                  <a className="table-cta table-cta--site" href={demo.href} rel="noopener noreferrer" target="_blank">
                    {demo.label} <span aria-hidden="true">↗</span>
                  </a>
                ) : null}
                {repository ? (
                  <a className="table-read__code" href={repository.href} rel="noopener noreferrer" target="_blank">
                    Código <span aria-hidden="true">↗</span>
                  </a>
                ) : null}
              </div>
            </div>

            <dl className="table-readout">
              <div>
                <dt>Pantallas</dt>
                <dd>{pad(entry.counts.screens)}</dd>
              </div>
              <div>
                <dt>Módulos</dt>
                <dd>{pad(entry.counts.modules)}</dd>
              </div>
              <div>
                <dt>Decisiones</dt>
                <dd>{pad(entry.counts.decisions)}</dd>
              </div>
            </dl>

            <div
              aria-labelledby={`table-tab-${layer}`}
              className="table-scene"
              id={`${entry.id}-stage`}
              role={enhanced ? "tabpanel" : undefined}
            >
              <div className="holo">
                <span aria-hidden="true" className="holo-beam" />
                <div
                  aria-label={`Pantallas de ${entry.name}`}
                  className="holo-screens"
                  onKeyDown={onRingKey}
                  role="group"
                >
                  {entry.screens.map((screen) => {
                    const ring = ringOffset(screen.index, entryFront, entry.screens.length);
                    return (
                      <Screen
                        key={screen.src}
                        eager={projectIndex === 0 && screen.featured}
                        front={ring === 0}
                        onPick={() => setFront(screen.index)}
                        operable={operable("diseno")}
                        projectId={entry.id}
                        ring={ring}
                        screen={screen}
                      />
                    );
                  })}
                </div>

                <Inspector
                  node={entry.id === current.id ? focusNode : undefined}
                  project={entry}
                />
                <Diagram
                  chosen={entry.id === current.id ? chosenId : initialNode(entry.architecture)}
                  focus={entry.id === current.id ? focusId : null}
                  onHover={setHovered}
                  onPick={pick}
                  operable={operable("ingenieria")}
                  project={entry}
                />
              </div>

              <div className="holo-note" inert={!operable("diseno")}>
                <button
                  aria-label="Pantalla anterior"
                  className="holo-note__step"
                  onClick={() => setFront(entryFront - 1)}
                  type="button"
                >
                  <span aria-hidden="true">←</span>
                </button>
                <p aria-hidden="true" className="holo-note__text">
                  <span className="holo-note__index">
                    {pad(entryFront + 1)} / {pad(entry.screens.length)}
                  </span>
                  {entry.screens[entryFront]?.caption}
                </p>
                <button
                  aria-label="Pantalla siguiente"
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
              <h3>Pantallas</h3>
              <ol>
                {entry.screens.map((screen) => (
                  <li key={screen.src}>{screen.caption}</li>
                ))}
              </ol>
              <h3>Sistema</h3>
              <dl>
                {entry.architecture.nodes.map((node) => (
                  <div key={node.id}>
                    <dt>
                      {node.label} <small>· {LANE_LABEL[node.lane]}</small>
                    </dt>
                    {node.decision ? <dd>{node.decision}</dd> : null}
                  </div>
                ))}
              </dl>
            </div>
          </section>
        );
      })}

      <nav aria-label="Proyectos" className="table-dock">
        <p aria-hidden="true" className="table-dock__count">
          <span>{pad(current.order)}</span> / {pad(projects.length)}
        </p>
        <ul>
          {projects.map((entry) => (
            <li key={entry.id}>
              <a
                aria-current={enhanced && entry.id === project ? "true" : undefined}
                className="table-dock__item"
                href={`#${entry.id}`}
                onClick={(event) => {
                  event.preventDefault();
                  switchProject(entry.id);
                }}
                onFocus={() => prefetch(entry)}
                onPointerEnter={() => prefetch(entry)}
              >
                <span className="visually-hidden">{entry.title}</span>
                <span aria-hidden="true">{entry.name}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <p aria-live="polite" className="visually-hidden">
        {enhanced ? announcement : ""}
      </p>
    </div>
  );
}
