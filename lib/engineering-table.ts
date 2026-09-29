import projectsMedia from "@/content/projects-media.json";
import {
  ARCHITECTURE_LANES,
  type ArchitectureLane,
  type ProjectId,
  type ProjectStructuralData,
} from "@/content/projects.data";
import type { Locale } from "@/content/site.data";
import type { Project } from "@/lib/projects";

/**
 * LA MESA DE INGENIERÍA — la parte pura.
 *
 * Todo lo que la página necesita para disponer un proyecto sobre la mesa se
 * deriva aquí de los DATOS del proyecto, sin DOM y sin React: qué pantallas
 * hay y dónde va cada una en cada capa, cómo se dibuja el esquema de su
 * sistema y qué cifras enseña. `docs/design/endurance-proyectos.md` §5, §6,
 * §16 (segundo pase) y §17 (tercer pase: Producto, decisiones y rutas).
 *
 * El motivo de que sea una función y no una tabla es P2: si las poses fueran
 * números escritos por proyecto, el sexto proyecto llegaría sin mesa. Aquí
 * llega con la misma que los otros cinco.
 */

/**
 * Las tres profundidades. La primera se llamaba «Resultado» y enseñaba el
 * producto terminado, no un resultado: §17 la llama por lo que es y reserva
 * los resultados para el caso completo, donde hay texto para sostenerlos.
 */
export type TableLayer = "producto" | "diseno" | "ingenieria";
export const TABLE_LAYERS: readonly TableLayer[] = [
  "producto",
  "diseno",
  "ingenieria",
];

export type ScreenFrame = "desktop" | "mobile";

/**
 * Una pose sobre la mesa. `x` y `z` son fracciones del ANCHO del escenario e
 * `y` de su alto —el centro en 0—, para que la misma pose valga en cualquier
 * ventana; el CSS las convierte con unidades de contenedor.
 */
export interface ScreenPose {
  x: number;
  y: number;
  z: number;
  /** Giro alrededor del eje vertical, en grados. */
  ry: number;
  /** Escala respecto del ancho de reposo de la pantalla. */
  s: number;
  /** Opacidad. */
  o: number;
}

export interface ScreenSources {
  /** El archivo que se sirve si el navegador no elige del `srcset`. */
  src: string;
  /** Peldaños WebP medidos por `tools/prepare-projects.mjs`; vacío sin ellos. */
  srcSet: string;
  /** El peldaño más pequeño: la miniatura de un nodo del esquema. */
  thumb: string;
  width: number;
  height: number;
  /**
   * Luma media medida de la captura (0-1), o `null` sin manifiesto. La mesa
   * expone cada pantalla con ella: una interfaz blanca se apaga un poco.
   */
  luma: number | null;
}

/**
 * Dónde cae una pantalla en Producto: el centro es la destacada, a su
 * izquierda el teléfono y a su derecha la siguiente de escritorio. Las demás
 * esperan dentro de la mesa hasta que Diseño las levanta.
 */
type ResultSlot = "main" | "left" | "right" | null;

export interface TableScreen {
  src: string;
  alt: string;
  caption: string;
  frame: ScreenFrame;
  featured: boolean;
  /** Orden de lectura: la destacada es 0 y la galería sigue. */
  index: number;
  slot: ResultSlot;
  /** El nodo del sistema que la pantalla representa, si lo hay. */
  nodeId: string | null;
  /** El módulo del producto que enseña («Reservas»), si la ficha los declara. */
  module: string | null;
  /**
   * ¿La mesa la levanta alguna vez? Sólo las tres de Producto y las del
   * carrete de Diseño; las demás son del caso completo. Un proyecto con
   * sesenta capturas no puede montar sesenta pantallas invisibles en la mesa:
   * cada una pediría su imagen aunque nunca se viera.
   */
  onTable: boolean;
  sources: ScreenSources;
  poses: Record<"producto" | "ingenieria", ScreenPose>;
}

/**
 * Un paso del carrete de Diseño: la pantalla que se pone delante y lo que la
 * mesa dice de ella. Con decisiones de diseño declaradas, el carrete recorre
 * ESAS pantallas y dice problema y decisión; sin ellas, recorre todas con su
 * pie de foto, como antes (§17).
 */
export interface TableReelStep {
  /** Índice de la pantalla en `screens`. */
  screen: number;
  /** El problema de experiencia, o `null` cuando el paso es sólo un pie. */
  problem: string | null;
  /** La decisión, o el pie de la captura si no hay decisión declarada. */
  note: string;
}

export interface TableNode {
  id: string;
  label: string;
  lane: ArchitectureLane;
  screen: string | null;
  /** La miniatura de su pantalla, ya resuelta al peldaño más pequeño. */
  thumb: string | null;
  frame: ScreenFrame | null;
  decision: string | null;
  /** Con qué está hecho el módulo; vacío si la ficha no lo dice. */
  tech: string[];
  /** Columna (el carril) y fila del esquema; la fila puede ser media. */
  col: number;
  row: number;
  /** Rótulos de los nodos que llegan a él y a los que llega. */
  inputs: string[];
  outputs: string[];
}

type EdgeShape = "cross" | "adjacent" | "arc";

export interface TableEdge {
  from: string;
  to: string;
  shape: EdgeShape;
  /** Trazado en las coordenadas del esquema (`DIAGRAM_BOX`). */
  d: string;
}

export interface TableArchitecture {
  /** Filas del esquema: las del carril más poblado. */
  rows: number;
  /**
   * Columnas del esquema: sólo los carriles que el sistema ocupa (§17). Un
   * sistema pequeño dibuja un esquema pequeño —Izak's Photos no tiene datos
   * propios y no se le pinta una columna vacía.
   */
  cols: number;
  nodes: TableNode[];
  edges: TableEdge[];
  /** Los carriles ocupados, en el orden fijo de los carriles, con su cuenta. */
  lanes: { lane: ArchitectureLane; count: number }[];
  /**
   * `true` cuando la ficha no declara `architecture` y el esquema se
   * construyó solo con stack + decisión (§6). Un sistema derivado no lleva
   * aristas: no se finge un flujo que el texto no describe.
   */
  derived: boolean;
}

interface TableLink {
  label: string;
  href: string;
  kind: "repository" | "demo" | "contact";
}

/**
 * Un proyecto listo para la mesa: sólo lo que la página pinta. Es un objeto
 * serializable a propósito —sin el cuerpo MDX compilado— porque cruza al
 * componente cliente.
 */
export interface TableScope {
  value: string;
  label: string;
}

/** Un grupo del stack completo («Backend»: Django 5.2, Gunicorn 23…). */
interface TableStackGroup {
  group: string;
  items: string[];
}

/** Un módulo del recorrido del caso y sus pantallas (índices de `screens`). */
interface TableTourStop {
  /** Ancla estable del módulo en el caso (`modulo-panel-y-reservas`). */
  id: string;
  module: string;
  screens: number[];
}

export interface TableProject {
  id: ProjectId;
  slug: string;
  /** El caso completo, ya localizado. */
  href: string;
  order: number;
  kind: ProjectStructuralData["kind"];
  status: ProjectStructuralData["status"];
  statusLabel: string;
  title: string;
  /**
   * El nombre a secas: la parte del título antes del guion largo («OMSTA —
   * ERP para…» → «OMSTA»). No es un campo nuevo porque no es contenido nuevo:
   * es el mismo título, cortado donde su autor puso la raya.
   */
  name: string;
  /**
   * La línea que dice qué es: lo que el título lleva tras la raya o, si no la
   * lleva, la antetitular de la ficha («Red social full-stack»). Otra vez el
   * texto del autor, no uno nuevo.
   */
  descriptor: string;
  /** La decisión de la ficha: lo que lee un esquema derivado. */
  decision: string;
  technologies: string[];
  /** El stack completo por grupos; vacío si la ficha sólo trae la cabecera. */
  stack: TableStackGroup[];
  links: TableLink[];
  screens: TableScreen[];
  /**
   * Las pantallas por módulo, en el orden en que la ficha los presenta; vacío
   * si las capturas no declaran módulo (entonces el caso las enseña juntas).
   */
  tour: TableTourStop[];
  /** El recorrido de Diseño: decisiones declaradas o, sin ellas, las capturas. */
  reel: TableReelStep[];
  /** ¿El carrete dice decisiones (problema → decisión) o sólo pies de foto? */
  reelKind: "decisions" | "captions";
  /** Alcance: tres cifras que afirma el caso (vacío si la ficha no lo declara). */
  scope: TableScope[];
  architecture: TableArchitecture;
  counts: { screens: number; modules: number; connections: number; decisions: number };
}

/* ── Capturas ──────────────────────────────────────────────────────────── */

type MediaManifest = Record<string, { width: number; height: number; steps: number[]; luma?: number }>;
const media = projectsMedia as MediaManifest;

/**
 * Dimensiones de reposo cuando una captura no está en el manifiesto (una
 * ficha nueva antes de correr el preparador, o un fixture de test): la
 * proporción de las capturas reales de cada aparato, para que el marco no
 * salte al cargar.
 */
const FALLBACK_SIZE: Record<ScreenFrame, { width: number; height: number }> = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

export function screenSources(src: string, frame: ScreenFrame): ScreenSources {
  const entry = media[src];
  if (!entry || entry.steps.length === 0) {
    return { src, srcSet: "", thumb: src, ...FALLBACK_SIZE[frame], luma: entry?.luma ?? null };
  }
  const base = src.replace(/\.png$/, "");
  const largest = entry.steps[entry.steps.length - 1];
  return {
    src: `${base}-${largest}.webp`,
    srcSet: entry.steps.map((step) => `${base}-${step}.webp ${step}w`).join(", "),
    thumb: `${base}-${entry.steps[0]}.webp`,
    width: entry.width,
    height: entry.height,
    luma: entry.luma ?? null,
  };
}

/* ── Arquitectura ──────────────────────────────────────────────────────── */

/**
 * Carril de una tecnología cuando la ficha no declara arquitectura. Es la
 * tabla fija del §6, y es lo único que la página «sabe» de un stack: nada de
 * lo que salga de aquí afirma un flujo, sólo una columna.
 */
export function laneForTechnology(technology: string): ArchitectureLane {
  const name = technology.toLowerCase();
  const matches = (...needles: string[]) => needles.some((needle) => name.includes(needle));
  if (matches("react", "vite", "typescript", "javascript", "next", "css", "html", "tailwind")) return "cliente";
  if (matches("postgres", "redis", "sqlite", "mysql", "mongo")) return "datos";
  // Lo que el sistema usa de fuera —un canal, una pasarela, una API ajena—
  // no es lo que lo sostiene (§17).
  if (matches("whatsapp", "stripe", "paypal", "twilio", "sendgrid", "openai", "google maps")) return "integraciones";
  if (matches("railway", "cloudflare", "vercel", "docker", "nginx", "aws")) return "infraestructura";
  return "servicio";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * El esquema se dibuja en una caja de 1000 × 1000 que el SVG estira al panel
 * (`preserveAspectRatio="none"` y trazo que no escala): las cajas HTML se
 * colocan con los mismos números en porcentaje, así que líneas y cajas
 * coinciden a cualquier tamaño sin medir el DOM.
 */
export const DIAGRAM_BOX = 1000;
/** Ancho de columna del esquema: tantas columnas como carriles ocupados. */
export function columnWidth(cols: number): number {
  return DIAGRAM_BOX / Math.max(1, cols);
}
/** Media caja de nodo, en unidades del esquema: el 80 % de su columna. */
export function nodeHalfWidth(cols: number): number {
  return columnWidth(cols) * 0.4;
}
/** Alto de caja como fracción de su fila. */
export const NODE_ROW_FILL = 0.7;

/**
 * Orden dentro de un carril: el del MDX, salvo que las cadenas internas
 * (reservas → facturación → pagos…) quedan seguidas, para que cada eslabón
 * sea un conector corto y no un arco que cruza medio carril.
 */
function laneOrder(
  ids: readonly string[],
  internal: readonly { from: string; to: string }[],
): string[] {
  const incoming = new Set(internal.map((edge) => edge.to));
  const next = new Map<string, string[]>();
  for (const edge of internal) next.set(edge.from, [...(next.get(edge.from) ?? []), edge.to]);

  const order: string[] = [];
  const seen = new Set<string>();
  const follow = (id: string) => {
    let current: string | undefined = id;
    while (current && !seen.has(current)) {
      seen.add(current);
      order.push(current);
      current = (next.get(current) ?? []).find((candidate) => !seen.has(candidate));
    }
  };
  for (const id of ids) if (!incoming.has(id)) follow(id);
  for (const id of ids) follow(id);
  return order;
}

const round = (value: number) => Math.round(value * 10) / 10;

function nodeCenter(node: Pick<TableNode, "col" | "row">, rows: number, cols: number) {
  return { x: columnWidth(cols) * (node.col + 0.5), y: (DIAGRAM_BOX / rows) * (node.row + 0.5) };
}

/**
 * Una polilínea ortogonal con las esquinas redondeadas: la forma de los
 * conectores que rodean cajas. Los puntos repetidos o alineados se quitan, y
 * cada esquina toma el radio que le dejan sus dos tramos.
 */
function roundedPath(points: { x: number; y: number }[], radius: number): string {
  const clean = points.filter((point, index) => {
    const previous = points[index - 1];
    return !previous || previous.x !== point.x || previous.y !== point.y;
  });
  const corners = clean.filter((point, index) => {
    const previous = clean[index - 1];
    const next = clean[index + 1];
    if (!previous || !next) return true;
    return !((previous.x === point.x && point.x === next.x) || (previous.y === point.y && point.y === next.y));
  });
  let d = `M${round(corners[0].x)} ${round(corners[0].y)}`;
  for (let index = 1; index < corners.length - 1; index++) {
    const previous = corners[index - 1];
    const point = corners[index];
    const next = corners[index + 1];
    const into = Math.hypot(point.x - previous.x, point.y - previous.y);
    const out = Math.hypot(next.x - point.x, next.y - point.y);
    const r = Math.min(radius, into / 2, out / 2);
    const before = { x: point.x - ((point.x - previous.x) / into) * r, y: point.y - ((point.y - previous.y) / into) * r };
    const after = { x: point.x + ((next.x - point.x) / out) * r, y: point.y + ((next.y - point.y) / out) * r };
    d += `L${round(before.x)} ${round(before.y)}Q${round(point.x)} ${round(point.y)} ${round(after.x)} ${round(after.y)}`;
  }
  const last = corners[corners.length - 1];
  return `${d}L${round(last.x)} ${round(last.y)}`;
}

/**
 * La altura libre más cercana a `near` para cruzar los carriles `cols`: una
 * y que ninguna caja de esos carriles tapa. Los candidatos son las medias
 * filas —las cajas ocupan el centro de la suya, y un carril corto va centrado
 * media fila—, y los dos cantos del esquema siempre están libres.
 */
function freeHeight(nodes: readonly TableNode[], cols: readonly number[], rows: number, near: number): number {
  const rowHeight = DIAGRAM_BOX / rows;
  const half = (rowHeight * NODE_ROW_FILL) / 2;
  const blockers = nodes.filter((node) => cols.includes(node.col)).map((node) => (node.row + 0.5) * rowHeight);
  const candidates = Array.from({ length: rows * 2 + 1 }, (_, k) => (k * rowHeight) / 2);
  const free = candidates.filter((y) => blockers.every((center) => Math.abs(y - center) > half + 2));
  return free.sort((left, right) => Math.abs(left - near) - Math.abs(right - near))[0] ?? 0;
}

/**
 * El trazado de una arista.
 *
 * - Entre carriles vecinos, una curva que sale por el canto de una caja y
 *   entra por el de la otra; se dobla en el primer tercio del hueco, cerca
 *   de la caja de la IZQUIERDA, porque el tercio derecho es de los corchetes.
 * - Entre carriles que no se tocan, si en medio hay cajas, un conector que
 *   las RODEA: sale al hueco, corre por una media fila libre y entra por el
 *   hueco de antes del destino. Una curva recta las atravesaría y el esquema
 *   diría conexiones que el MDX no declara (carrito → WhatsApp pasaba por
 *   Administración y PostgreSQL).
 * - Dentro de un carril, un conector vertical entre vecinas o un corchete por
 *   la izquierda que salta filas, más afuera cuanto más largo.
 */
function edgePath(
  from: TableNode,
  to: TableNode,
  rows: number,
  cols: number,
  arcDepth: number,
  nodes: readonly TableNode[],
): { shape: EdgeShape; d: string } {
  const COL = columnWidth(cols);
  const NODE_HALF_WIDTH = nodeHalfWidth(cols);
  const a = nodeCenter(from, rows, cols);
  const b = nodeCenter(to, rows, cols);
  const halfHeight = ((DIAGRAM_BOX / rows) * NODE_ROW_FILL) / 2;

  if (from.col !== to.col) {
    const forward = to.col > from.col;
    const x1 = a.x + (forward ? NODE_HALF_WIDTH : -NODE_HALF_WIDTH);
    const x2 = b.x + (forward ? -NODE_HALF_WIDTH : NODE_HALF_WIDTH);
    const low = Math.min(from.col, to.col);
    const high = Math.max(from.col, to.col);
    const between = Array.from({ length: high - low - 1 }, (_, k) => low + 1 + k).filter((col) =>
      nodes.some((node) => node.col === col),
    );
    if (between.length > 0) {
      const y = freeHeight(nodes, between, rows, (a.y + b.y) / 2);
      // Los dos huecos: el que sigue a la caja de origen y el que precede a
      // la de destino, cada uno en su mitad.
      const gap1 = forward ? COL * (from.col + 1) : COL * from.col;
      const gap2 = forward ? COL * to.col : COL * (to.col + 1);
      return {
        shape: "cross",
        d: roundedPath(
          [
            { x: x1, y: a.y },
            { x: gap1, y: a.y },
            { x: gap1, y },
            { x: gap2, y },
            { x: gap2, y: b.y },
            { x: x2, y: b.y },
          ],
          10,
        ),
      };
    }
    const mid = x1 + (x2 - x1) * (forward ? 0.35 : 0.65);
    return {
      shape: "cross",
      d: `M${round(x1)} ${round(a.y)}C${round(mid)} ${round(a.y)} ${round(mid)} ${round(b.y)} ${round(x2)} ${round(b.y)}`,
    };
  }

  const down = b.y > a.y;
  if (Math.abs(from.row - to.row) <= 1) {
    const y1 = a.y + (down ? halfHeight : -halfHeight);
    const y2 = b.y + (down ? -halfHeight : halfHeight);
    return { shape: "adjacent", d: `M${round(a.x)} ${round(y1)}V${round(y2)}` };
  }

  // Pegado al canto de su carril y nunca más allá de 20 unidades: el resto
  // del hueco es de las curvas y los rodeos.
  const edge = a.x - NODE_HALF_WIDTH;
  const out = Math.max(edge - 20, edge - 6 - arcDepth * 6);
  const r = Math.min(8, Math.abs(b.y - a.y) / 3);
  const turn = down ? r : -r;
  return {
    shape: "arc",
    d: [
      `M${round(edge)} ${round(a.y)}`,
      `H${round(out + Math.min(r, edge - out))}`,
      `Q${round(out)} ${round(a.y)} ${round(out)} ${round(a.y + turn)}`,
      `V${round(b.y - turn)}`,
      `Q${round(out)} ${round(b.y)} ${round(out + Math.min(r, edge - out))} ${round(b.y)}`,
      `H${round(edge)}`,
    ].join(""),
  };
}

type Prose = Project["prose"];
type DraftNode = Omit<TableNode, "col" | "row" | "inputs" | "outputs">;

function layout(drafts: readonly DraftNode[], declaredEdges: readonly { from: string; to: string }[]) {
  const laneOf = new Map(drafts.map((node) => [node.id, node.lane]));
  const edges = declaredEdges.filter((edge) => laneOf.has(edge.from) && laneOf.has(edge.to));

  // Sólo los carriles que el sistema ocupa: el esquema tiene el ancho de lo
  // que hay, no el de la taxonomía entera (§17).
  const activeLanes = ARCHITECTURE_LANES.filter((lane) => drafts.some((node) => node.lane === lane));
  const perLane = activeLanes.map((lane) => {
    const ids = drafts.filter((node) => node.lane === lane).map((node) => node.id);
    const internal = edges.filter((edge) => laneOf.get(edge.from) === lane && laneOf.get(edge.to) === lane);
    return laneOrder(ids, internal);
  });
  const rows = Math.max(1, ...perLane.map((ids) => ids.length));
  const cols = Math.max(1, activeLanes.length);

  const byId = new Map(drafts.map((node) => [node.id, node]));
  const labelOf = (id: string) => byId.get(id)?.label ?? id;
  const nodes: TableNode[] = perLane.flatMap((ids, col) =>
    ids.map((id, rank) => ({
      ...(byId.get(id) as DraftNode),
      col,
      // Un carril corto se centra en el alto del más poblado.
      row: rank + (rows - ids.length) / 2,
      inputs: edges.filter((edge) => edge.to === id).map((edge) => labelOf(edge.from)),
      outputs: edges.filter((edge) => edge.from === id).map((edge) => labelOf(edge.to)),
    })),
  );

  const placed = new Map(nodes.map((node) => [node.id, node]));
  // Los corchetes de cada carril, del más corto al más largo: el largo va fuera.
  const arcs = edges
    .filter((edge) => {
      const from = placed.get(edge.from) as TableNode;
      const to = placed.get(edge.to) as TableNode;
      return from.col === to.col && Math.abs(from.row - to.row) > 1;
    })
    .sort((left, right) => {
      const span = (edge: { from: string; to: string }) =>
        Math.abs((placed.get(edge.from) as TableNode).row - (placed.get(edge.to) as TableNode).row);
      return span(left) - span(right);
    });
  const depth = new Map<string, number>();
  const perCol = new Map<number, number>();
  for (const edge of arcs) {
    const col = (placed.get(edge.from) as TableNode).col;
    const k = perCol.get(col) ?? 0;
    perCol.set(col, k + 1);
    depth.set(`${edge.from}>${edge.to}`, k);
  }

  return {
    rows,
    cols,
    nodes,
    edges: edges.map((edge) => ({
      from: edge.from,
      to: edge.to,
      ...edgePath(
        placed.get(edge.from) as TableNode,
        placed.get(edge.to) as TableNode,
        rows,
        cols,
        depth.get(`${edge.from}>${edge.to}`) ?? 0,
        nodes,
      ),
    })),
    lanes: activeLanes.map((lane, index) => ({ lane, count: perLane[index].length })),
  };
}

/**
 * LA RUTA de un nodo (§17): todo lo que llega a él y todo lo que sale de él,
 * siguiendo las aristas del MDX en su sentido. Elegir «Pagos y cobros»
 * enciende el camino entero —reservas y facturación antes; contabilidad,
 * ledger, reportes y PostgreSQL después— y el resto del sistema se apaga: se
 * lee la arquitectura, no sólo se ve.
 *
 * Una arista entra en la ruta sólo si va por ella: de un antecesor hacia el
 * nodo o de él hacia un sucesor. Un atajo que salta el nodo (un antecesor que
 * escribe directo en un sucesor) no pasa por él y no se enciende.
 */
export interface NodePath {
  upstream: ReadonlySet<string>;
  downstream: ReadonlySet<string>;
  /** Aristas de la ruta, con la clave `desde>hasta`. */
  edges: ReadonlySet<string>;
}

export const edgeKey = (edge: { from: string; to: string }) => `${edge.from}>${edge.to}`;

export function nodePath(
  edges: readonly { from: string; to: string }[],
  id: string | null,
): NodePath {
  if (!id) return { upstream: new Set(), downstream: new Set(), edges: new Set() };
  const closure = (forward: boolean) => {
    const seen = new Set<string>();
    const queue = [id];
    while (queue.length > 0) {
      const current = queue.shift() as string;
      for (const edge of edges) {
        const [from, to] = forward ? [edge.from, edge.to] : [edge.to, edge.from];
        if (from === current && to !== id && !seen.has(to)) {
          seen.add(to);
          queue.push(to);
        }
      }
    }
    return seen;
  };
  const downstream = closure(true);
  const upstream = closure(false);
  const onPath = new Set<string>();
  for (const edge of edges) {
    const intoFocus = (edge.to === id || upstream.has(edge.to)) && upstream.has(edge.from);
    const outOfFocus = (edge.from === id || downstream.has(edge.from)) && downstream.has(edge.to);
    if (intoFocus || outOfFocus) onPath.add(edgeKey(edge));
  }
  return { upstream, downstream, edges: onPath };
}

export function tableArchitecture(prose: Prose): TableArchitecture {
  const declared = prose.architecture;
  if (declared) {
    const images = [prose.featuredImage, ...(prose.gallery ?? [])];
    const frames = new Map<string, ScreenFrame>(images.map((image) => [image.src, image.frame ?? "desktop"]));
    const drafts: DraftNode[] = declared.nodes.map((node) => {
      const frame = node.screen ? (frames.get(node.screen) ?? "desktop") : null;
      return {
        id: node.id,
        label: node.label,
        lane: node.lane,
        screen: node.screen ?? null,
        thumb: node.screen && frame ? screenSources(node.screen, frame).thumb : null,
        frame,
        decision: node.decision ?? null,
        tech: [...(node.tech ?? [])],
      };
    });
    return {
      ...layout(drafts, declared.edges.map(([from, to]) => ({ from, to }))),
      derived: false,
    };
  }

  /*
    Stack + decisión: un nodo por tecnología en su carril, sin aristas y con
    la decisión de la ficha como único rótulo del sistema (§6). Es honesto
    porque no afirma nada que la ficha no diga; el día que la ficha declare
    su arquitectura, esta rama deja de usarse sin tocar la página.
  */
  const seen = new Set<string>();
  const drafts = prose.technologies.flatMap((technology): DraftNode[] => {
    const id = slugify(technology);
    if (!id || seen.has(id)) return [];
    seen.add(id);
    return [
      { id, label: technology, lane: laneForTechnology(technology), screen: null, thumb: null, frame: null, decision: null, tech: [] },
    ];
  });
  return { ...layout(drafts, []), derived: true };
}

/* ── Poses ─────────────────────────────────────────────────────────────── */

/**
 * PRODUCTO. Tres pantallas en arco sobre la mesa, como en el boceto: la
 * destacada al centro y de frente, el teléfono a su izquierda y la siguiente
 * de escritorio a su derecha, las dos giradas hacia quien mira. Sin teléfono,
 * la izquierda la ocupa otra de escritorio, más pequeña y más atrás.
 */
const RESULT_POSES: Record<Exclude<ResultSlot, null>, Record<ScreenFrame, ScreenPose>> = {
  main: {
    desktop: { x: 0.035, y: -0.03, z: 0, ry: 0, s: 1, o: 1 },
    mobile: { x: 0.035, y: -0.03, z: 0, ry: 0, s: 1, o: 1 },
  },
  left: {
    mobile: { x: -0.225, y: 0.04, z: 0.02, ry: 16, s: 1, o: 1 },
    desktop: { x: -0.25, y: 0.02, z: -0.08, ry: 20, s: 0.5, o: 0.92 },
  },
  right: {
    desktop: { x: 0.33, y: 0.03, z: -0.06, ry: -20, s: 0.56, o: 0.92 },
    mobile: { x: 0.3, y: 0.04, z: 0.02, ry: -16, s: 1, o: 1 },
  },
};

/** Una pantalla sin sitio espera dentro de la mesa, bajo la destacada. */
const RESTING_POSE: ScreenPose = { x: 0.035, y: 0.42, z: -0.12, ry: 0, s: 0.42, o: 0 };

/**
 * DISEÑO. Un carrete: la elegida delante y de frente; las demás, a los dos
 * lados, retiradas y giradas hacia dentro como las hojas de un libro abierto,
 * cada una un paso más afuera. `rel` es la distancia a la elegida, ya dada la
 * vuelta por el lado corto; a partir de tres puestos la pantalla se apaga.
 *
 * Las laterales se retiran lo bastante para que su canto interior —que el
 * giro adelanta— quede siempre DETRÁS de la elegida: con un tambor de radio
 * corto las vecinas la atravesaban.
 */
export const REEL_CENTER = 0.07;
const REEL_ANGLE = 52;
const REEL_STEPS = [0, 0.215, 0.28, 0.34];
const REEL_DEPTH = [0, -0.13, -0.16, -0.2];

export function ringPose(rel: number, frame: ScreenFrame): ScreenPose {
  const distance = Math.min(3, Math.abs(rel));
  const side = Math.sign(rel);
  const scale = distance === 0 ? 0.84 : distance === 1 ? 0.7 : 0.64;
  return {
    x: Math.round((REEL_CENTER + side * REEL_STEPS[distance]) * 1000) / 1000,
    y: -0.02,
    z: REEL_DEPTH[distance],
    ry: side * (distance === 0 ? 0 : REEL_ANGLE),
    // El teléfono ya es estrecho: no encoge tanto fuera del frente.
    s: frame === "mobile" ? Math.min(1, scale + 0.16) : scale,
    o: distance <= 1 ? 1 : distance === 2 ? 0.45 : 0,
  };
}

/**
 * La distancia de la pantalla `index` a la elegida `front` en un tambor de
 * `total`, por el lado más corto: con ocho, la séptima está a −1 de la
 * primera, no a +7.
 */
export function ringOffset(index: number, front: number, total: number): number {
  let rel = (((index - front) % total) + total) % total;
  if (rel > total / 2) rel -= total;
  return rel;
}

/**
 * INGENIERÍA. Las pantallas vuelven a la mesa —se hunden y se apagan— y lo
 * que se levanta en su sitio es el sistema: el esquema, el inspector y las
 * capas. Cada una se hunde bajo su propio puesto, no todas en el centro.
 */
function engineeringPose(result: ScreenPose): ScreenPose {
  return { x: result.x, y: 0.44, z: result.z - 0.06, ry: 0, s: result.s * 0.55, o: 0 };
}

export function tableScreens(prose: Prose, architecture: TableArchitecture): TableScreen[] {
  const images = [
    { ...prose.featuredImage, featured: true },
    ...(prose.gallery ?? []).map((image) => ({ ...image, featured: false })),
  ];
  const nodeByScreen = new Map(
    architecture.nodes.filter((node) => node.screen).map((node) => [node.screen as string, node]),
  );

  // Puestos de Producto: primero el teléfono a la izquierda y la siguiente de
  // escritorio a la derecha; sin teléfono, dos de escritorio.
  const frameOf = (image: (typeof images)[number]): ScreenFrame => image.frame ?? "desktop";
  const rest = images.slice(1);
  const phone = rest.find((image) => frameOf(image) === "mobile");
  const desktops = rest.filter((image) => frameOf(image) === "desktop");
  const right = desktops[0];
  const left = phone ?? desktops[1];
  const slotOf = (image: (typeof images)[number]): ResultSlot =>
    image.featured ? "main" : image === left ? "left" : image === right ? "right" : null;

  return images.map((image, index) => {
    const frame = frameOf(image);
    const slot = slotOf(image);
    const producto = slot ? RESULT_POSES[slot][frame] : RESTING_POSE;
    return {
      src: image.src,
      alt: image.alt,
      caption: image.caption,
      frame,
      featured: image.featured,
      index,
      slot,
      nodeId: nodeByScreen.get(image.src)?.id ?? null,
      module: image.module?.trim() || null,
      // Producto la levanta si tiene puesto; el carrete de Diseño lo decide
      // `tableProject`, que es quien conoce el carrete.
      onTable: slot !== null,
      sources: screenSources(image.src, frame),
      poses: { producto, ingenieria: engineeringPose(producto) },
    };
  });
}

/**
 * El carrete de Diseño. Con `designDecisions`, un paso por decisión y en su
 * orden (la pantalla es la que la resuelve); sin ellas, un paso por captura
 * con su pie. Una decisión que señalase una pantalla ajena la rechaza antes
 * el validador del contenido; aquí se descarta sin romper la mesa.
 */
export function tableReel(
  prose: Prose,
  screens: readonly TableScreen[],
): { reel: TableReelStep[]; kind: "decisions" | "captions" } {
  const bySrc = new Map(screens.map((screen) => [screen.src, screen.index]));
  const decisions = (prose.designDecisions ?? []).flatMap((entry) => {
    const screen = bySrc.get(entry.screen);
    return screen === undefined ? [] : [{ screen, problem: entry.problem, note: entry.decision }];
  });
  if (decisions.length > 0) return { reel: decisions, kind: "decisions" };
  return {
    reel: screens.map((screen) => ({ screen: screen.index, problem: null, note: screen.caption })),
    kind: "captions",
  };
}

/**
 * El recorrido del caso: las pantallas por módulo, cada módulo donde aparece
 * por primera vez en la ficha y sus pantallas en el orden de la ficha. Sin
 * módulos declarados, vacío: el caso las enseña juntas, como antes.
 */
function tableTour(screens: readonly TableScreen[]): TableTourStop[] {
  const stops: TableTourStop[] = [];
  for (const screen of screens) {
    if (!screen.module) continue;
    const stop = stops.find((entry) => entry.module === screen.module);
    if (stop) stop.screens.push(screen.index);
    else stops.push({ id: `modulo-${slugify(screen.module)}`, module: screen.module, screens: [screen.index] });
  }
  return stops;
}

/* ── El proyecto entero ────────────────────────────────────────────────── */

export function tableProject(project: Project, projectsHref: string): TableProject {
  const { prose } = project;
  const architecture = tableArchitecture(prose);
  const drafted = tableScreens(prose, architecture);
  const { reel, kind } = tableReel(prose, drafted);
  const inReel = new Set(reel.map((step) => step.screen));
  const screens = drafted.map((screen) => ({ ...screen, onTable: screen.onTable || inReel.has(screen.index) }));
  const [name, tail] = prose.title.split(/\s+—\s+/);
  return {
    id: project.id,
    slug: prose.slug,
    href: `${projectsHref}/${prose.slug}`,
    order: project.order,
    kind: project.kind,
    status: project.status,
    statusLabel: prose.statusLabel,
    title: prose.title,
    name: name.trim(),
    descriptor: (tail ?? prose.eyebrow).trim(),
    decision: prose.decision,
    technologies: [...prose.technologies],
    stack: (prose.stack ?? []).map((entry) => ({ group: entry.group, items: [...entry.items] })),
    links: (prose.links ?? []).map((link) => ({ ...link })),
    screens,
    tour: tableTour(screens),
    reel,
    reelKind: kind,
    scope: (prose.scope ?? []).map((entry) => ({ ...entry })),
    architecture,
    counts: {
      screens: screens.length,
      modules: architecture.nodes.length,
      connections: architecture.edges.length,
      decisions: architecture.nodes.filter((node) => node.decision).length,
    },
  };
}

/**
 * Lectura del estado como la pinta la columna de lectura. Es una traducción
 * de la identidad estructural, no un texto nuevo: `statusLabel` sigue siendo
 * el nombre accesible y completo.
 */
export function statusReadout(status: ProjectStructuralData["status"], locale: Locale = "es"): string {
  const es = locale === "es";
  switch (status) {
    case "production":
      return es ? "En producción" : "In production";
    case "ready-for-production":
      return es ? "Listo para producción" : "Ready for production";
    case "in-development":
      return es ? "En desarrollo" : "In development";
  }
}

/** El proyecto que pide un hash (`#omsta`), o `null` si no es uno de la mesa. */
export function projectFromHash(
  hash: string,
  projects: readonly TableProject[],
): TableProject | null {
  const id = hash.replace(/^#/, "");
  return projects.find((project) => project.id === id) ?? null;
}

/** El nodo que el inspector enseña al entrar: el primero con decisión. */
export function initialNode(architecture: TableArchitecture): string | null {
  return (architecture.nodes.find((node) => node.decision) ?? architecture.nodes[0])?.id ?? null;
}

/* ── El anillo de la mesa ──────────────────────────────────────────────── */

/**
 * EL MAPA GLOBAL DEL SISTEMA grabado en la mesa (§17): un anillo con UN
 * segmento por módulo, agrupados en arcos por carril ocupado —con un hueco
 * entre arcos— y, por fuera de cada arco, su filo: la línea que se enciende
 * con el carril. Sustituye al plano de doce módulos de la Endurance, que era
 * la nave y no decía nada del proyecto: ahora el anillo es el sistema entero
 * de un vistazo, y el esquema de encima, su detalle.
 *
 * Los rótulos no van alrededor: repetían las cabeceras del esquema que está
 * justo encima y, en escorzo, se leían diminutos. La mesa pinta en el centro
 * sólo el carril encendido y su cifra; aquí basta la geometría.
 *
 * Coordenadas en unidades del SVG, centro en 0 y ángulos en grados con el
 * convenio del SVG (0° a la derecha, crecen en el sentido de las agujas). El
 * anillo empieza al fondo (−90°), como una esfera de reloj, y los carriles
 * siguen el orden del esquema.
 */
interface RingSegment {
  id: string;
  lane: ArchitectureLane;
  /** Sector anular, listo para `<path d>`. */
  d: string;
}

interface RingArc {
  lane: ArchitectureLane;
  count: number;
  /** El filo del carril, por fuera de sus segmentos: un arco sin relleno. */
  d: string;
}

interface SystemRing {
  segments: RingSegment[];
  arcs: RingArc[];
}

export const RING_RADIUS = 100;
const RING_WIDTH = 16;
/** Hueco entre carriles y entre módulos de un mismo carril, en grados. */
const RING_LANE_GAP = 11;
const RING_SEGMENT_GAP = 2.4;
/** El filo de cada carril, separado del anillo. */
const RING_EDGE = RING_RADIUS + 8;

const rad = (angle: number) => (angle * Math.PI) / 180;

function polar(radius: number, angle: number) {
  return { x: round(radius * Math.cos(rad(angle))), y: round(radius * Math.sin(rad(angle))) };
}

/** Un sector anular de `from` a `to` grados, en el sentido de las agujas. */
function annularSector(inner: number, outer: number, from: number, to: number): string {
  const large = to - from > 180 ? 1 : 0;
  const a = polar(outer, from);
  const b = polar(outer, to);
  const c = polar(inner, to);
  const e = polar(inner, from);
  return `M${a.x} ${a.y}A${outer} ${outer} 0 ${large} 1 ${b.x} ${b.y}L${c.x} ${c.y}A${inner} ${inner} 0 ${large} 0 ${e.x} ${e.y}Z`;
}

/** Un arco de circunferencia de `from` a `to` grados, sin cerrar. */
function arcLine(radius: number, from: number, to: number): string {
  const a = polar(radius, from);
  const b = polar(radius, to);
  return `M${a.x} ${a.y}A${radius} ${radius} 0 ${to - from > 180 ? 1 : 0} 1 ${b.x} ${b.y}`;
}

export function systemRing(architecture: TableArchitecture): SystemRing {
  const { lanes, nodes } = architecture;
  const total = nodes.length;
  if (total === 0) return { segments: [], arcs: [] };
  const several = lanes.length > 1;
  const step = (360 - (several ? lanes.length * RING_LANE_GAP : 0)) / total;
  const segments: RingSegment[] = [];
  const arcs: RingArc[] = [];
  // El hueco del primer carril, centrado al fondo: el anillo queda simétrico.
  let angle = several ? -90 + RING_LANE_GAP / 2 : -90;
  // Un anillo de un solo módulo es un círculo: sin hueco que lo parta.
  const half = total > 1 ? RING_SEGMENT_GAP / 2 : 0;
  for (const { lane, count } of lanes) {
    const start = angle;
    // Dentro del carril, en el orden en que el esquema lo lee (de arriba abajo).
    const members = nodes.filter((node) => node.lane === lane).sort((left, right) => left.row - right.row);
    for (const node of members) {
      segments.push({
        id: node.id,
        lane,
        d:
          total > 1
            ? annularSector(RING_RADIUS - RING_WIDTH, RING_RADIUS, angle + half, angle + step - half)
            : annularSector(RING_RADIUS - RING_WIDTH, RING_RADIUS, angle, angle + 359.9),
      });
      angle += step;
    }
    arcs.push({ lane, count, d: arcLine(RING_EDGE, start + half, Math.min(angle - half, start + 359.9)) });
    if (several) angle += RING_LANE_GAP;
  }
  return { segments, arcs };
}
