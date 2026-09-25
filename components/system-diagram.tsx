"use client";

/* Las miniaturas de los nodos son peldaños WebP ya preparados
   (tools/prepare-projects.mjs): el optimizador de Next no elige entre
   archivos que existen. */
/* eslint-disable @next/next/no-img-element */
import { useState, type CSSProperties, type KeyboardEvent } from "react";
import type { ArchitectureLane } from "@/content/projects.data";
import {
  DIAGRAM_BOX,
  edgeKey,
  initialNode,
  NODE_ROW_FILL,
  nodeHalfWidth,
  nodePath,
  type TableNode,
  type TableProject,
} from "@/lib/engineering-table";
import "./system-diagram.css";

/**
 * EL SISTEMA DE UN PROYECTO — el esquema por carriles y el inspector del
 * módulo elegido (`docs/design/endurance-proyectos.md` §16.3 y §17).
 *
 * Lo comparten la capa Ingeniería de la mesa (`engineering-table.tsx`, que
 * gobierna el foco porque el anillo de la mesa lo refleja) y la sección
 * «Sistema» del caso completo (`SystemExplorer`, que lo gobierna solo).
 *
 * Elegir o apuntar un nodo enciende su RUTA —lo que llega a él y lo que sale
 * de él, siguiendo las aristas del MDX— y apaga el resto: se lee la
 * arquitectura, no sólo se ve.
 */

export const LANE_LABEL: Record<ArchitectureLane, string> = {
  cliente: "Cliente",
  servicio: "Servicio",
  datos: "Datos",
  infraestructura: "Infraestructura",
  integraciones: "Integraciones",
};

const pad = (value: number) => String(value).padStart(2, "0");

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
    case "integraciones":
      // Un enchufe: lo que se conecta desde fuera.
      return (
        <svg {...common}>
          <path d="M7.2 2.8v3.6M12.8 2.8v3.6" />
          <path d="M5 6.4h10v2.8a5 5 0 0 1-10 0Z" />
          <path d="M10 14.2v3" />
        </svg>
      );
  }
}

/**
 * La caja de un nodo en porcentajes del esquema: tan ancha como la caja que se
 * ve y tan alta como su fila entera, que es el blanco del puntero. La caja
 * visible (`NODE_ROW_FILL` de la fila) la centra el CSS dentro.
 */
function nodeBox(node: TableNode, rows: number, cols: number): CSSProperties {
  const half = nodeHalfWidth(cols);
  const col = DIAGRAM_BOX / cols;
  const rowHeight = DIAGRAM_BOX / rows;
  const cx = col * (node.col + 0.5);
  const top = rowHeight * node.row;
  return {
    left: `${((cx - half) / DIAGRAM_BOX) * 100}%`,
    top: `${(top / DIAGRAM_BOX) * 100}%`,
    width: `${((half * 2) / DIAGRAM_BOX) * 100}%`,
    height: `${(rowHeight / DIAGRAM_BOX) * 100}%`,
    "--fill": `${NODE_ROW_FILL * 100}%`,
  } as CSSProperties;
}

/* ── El esquema ────────────────────────────────────────────────────────── */

export function SystemDiagram({
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
  const path = nodePath(architecture.edges, focus);

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
      style={{ "--rows": architecture.rows, "--cols": architecture.cols } as CSSProperties}
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
          {architecture.edges.map((edge) => {
            const key = edgeKey(edge);
            const on = path.edges.has(key);
            // Aguas abajo (lo que el nodo entrega) corre; aguas arriba (lo que
            // recibe) se enciende quieto.
            const downstream = on && (edge.from === focus || path.downstream.has(edge.from));
            return (
              <path
                key={key}
                className="holo-line"
                d={edge.d}
                data-dir={on ? (downstream ? "down" : "up") : undefined}
                data-on={on ? "true" : undefined}
                data-shape={edge.shape}
                pathLength={1}
              />
            );
          })}
        </svg>
        {/*
          Un carril por grupo: en escritorio el grupo no existe para la caja
          (`display: contents`) y cada nodo cae en su sitio del esquema; en
          móvil el grupo es una fila con su rótulo y los nodos en columna.
        */}
        {architecture.lanes.map(({ lane }, col) => (
          <div
            key={lane}
            aria-label={LANE_LABEL[lane]}
            className="holo-lane"
            data-lane={lane}
            role="group"
            style={{ "--col": col } as CSSProperties}
          >
            <p aria-hidden="true" className="holo-lane__title">
              {LANE_LABEL[lane]}
            </p>
            {architecture.nodes
              .filter((node) => node.lane === lane)
              .map((node) => {
                const decisionId = node.decision ? `${project.id}-node-${node.id}-decision` : undefined;
                const selected = node.id === focus;
                const isChosen = node.id === chosen;
                const onPath = path.upstream.has(node.id) ? "up" : path.downstream.has(node.id) ? "down" : undefined;
                return (
                  <div
                    key={node.id}
                    className="holo-node"
                    data-has-decision={node.decision ? "true" : undefined}
                    data-lane={node.lane}
                    data-node-id={node.id}
                    data-path={onPath}
                    data-selected={selected ? "true" : undefined}
                    style={nodeBox(node, architecture.rows, architecture.cols)}
                  >
                    <button
                      type="button"
                      className="holo-node__box"
                      aria-current={isChosen ? "true" : undefined}
                      aria-describedby={decisionId}
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
 * En qué capa del sistema vive el módulo —una placa por carril ocupado, de
 * abajo arriba, con la suya encendida—, qué se decidió en él y con qué se
 * conecta.
 */
export function SystemInspector({ project, node }: { project: TableProject; node: TableNode | undefined }) {
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
            <span aria-hidden="true" className="holo-stack" style={{ "--plates": plates.length } as CSSProperties}>
              {plates.map(({ lane }, index) => (
                <span
                  key={lane}
                  className="holo-plate"
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

/* ── El sistema por su cuenta: el del caso completo ────────────────────── */

/**
 * Esquema + inspector con su propio foco, para una página que no es la mesa
 * (la sección «Sistema» del caso completo). Mismo comportamiento: apuntar
 * enciende la ruta, clic o foco eligen, y el inspector sigue al elegido.
 */
export function SystemExplorer({ project, className }: { project: TableProject; className?: string }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const chosen = picked ?? initialNode(project.architecture);
  const focus = hovered ?? chosen;
  const node = project.architecture.nodes.find((entry) => entry.id === focus);
  return (
    <div className={className ? `system-explorer ${className}` : "system-explorer"}>
      <SystemDiagram chosen={chosen} focus={focus} onHover={setHovered} onPick={setPicked} operable project={project} />
      <SystemInspector node={node} project={project} />
    </div>
  );
}
