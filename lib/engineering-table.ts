import projectsMedia from "@/content/projects-media.json";
import {
  ARCHITECTURE_LANES,
  type ArchitectureLane,
  type ProjectId,
  type ProjectStructuralData,
} from "@/content/projects.data";
import type { Project } from "@/lib/projects";

/**
 * LA MESA DE INGENIERÍA — la parte pura.
 *
 * Todo lo que la página necesita para disponer un proyecto sobre la mesa se
 * deriva aquí de los DATOS del proyecto, sin DOM y sin React: qué pantallas
 * hay y dónde va cada una en cada capa, cómo se dibuja el esquema de su
 * sistema y qué cifras enseña. `docs/design/endurance-proyectos.md` §5, §6 y
 * §16 (segundo pase).
 *
 * El motivo de que sea una función y no una tabla es P2: si las poses fueran
 * números escritos por proyecto, el sexto proyecto llegaría sin mesa. Aquí
 * llega con la misma que los otros cinco.
 */

export type TableLayer = "resultado" | "diseno" | "ingenieria";
export const TABLE_LAYERS: readonly TableLayer[] = [
  "resultado",
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
}

/**
 * Dónde cae una pantalla en Resultado: el centro es la destacada, a su
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
  sources: ScreenSources;
  poses: Record<"resultado" | "ingenieria", ScreenPose>;
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
  nodes: TableNode[];
  edges: TableEdge[];
  /** Cuántos nodos lleva cada carril, en el orden fijo de los carriles. */
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
  links: TableLink[];
  screens: TableScreen[];
  architecture: TableArchitecture;
  counts: { screens: number; modules: number; connections: number; decisions: number };
}

/* ── Capturas ──────────────────────────────────────────────────────────── */

type MediaManifest = Record<string, { width: number; height: number; steps: number[] }>;
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
    return { src, srcSet: "", thumb: src, ...FALLBACK_SIZE[frame] };
  }
  const base = src.replace(/\.png$/, "");
  const largest = entry.steps[entry.steps.length - 1];
  return {
    src: `${base}-${largest}.webp`,
    srcSet: entry.steps.map((step) => `${base}-${step}.webp ${step}w`).join(", "),
    thumb: `${base}-${entry.steps[0]}.webp`,
    width: entry.width,
    height: entry.height,
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
  if (matches("railway", "whatsapp", "cloudflare", "vercel", "docker", "nginx", "aws")) return "infraestructura";
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
/** Ancho de columna: cuatro carriles. */
const COL = DIAGRAM_BOX / ARCHITECTURE_LANES.length;
/** Media caja de nodo, en unidades del esquema: el 80 % de la columna. */
export const NODE_HALF_WIDTH = COL * 0.4;
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

function nodeCenter(node: Pick<TableNode, "col" | "row">, rows: number) {
  return { x: COL * (node.col + 0.5), y: (DIAGRAM_BOX / rows) * (node.row + 0.5) };
}

/**
 * El trazado de una arista. Entre carriles, una curva que sale por el canto
 * de una caja y entra por el de la otra; dentro de un carril, un conector
 * vertical entre vecinas o un corchete por la izquierda que salta filas, más
 * afuera cuanto más largo, para que dos corchetes nunca se monten.
 */
function edgePath(
  from: TableNode,
  to: TableNode,
  rows: number,
  arcDepth: number,
): { shape: EdgeShape; d: string } {
  const a = nodeCenter(from, rows);
  const b = nodeCenter(to, rows);
  const halfHeight = ((DIAGRAM_BOX / rows) * NODE_ROW_FILL) / 2;

  if (from.col !== to.col) {
    const forward = to.col > from.col;
    const x1 = a.x + (forward ? NODE_HALF_WIDTH : -NODE_HALF_WIDTH);
    const x2 = b.x + (forward ? -NODE_HALF_WIDTH : NODE_HALF_WIDTH);
    const mid = (x1 + x2) / 2;
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

  const edge = a.x - NODE_HALF_WIDTH;
  const out = edge - 14 - arcDepth * 10;
  const r = Math.min(12, Math.abs(b.y - a.y) / 3);
  const turn = down ? r : -r;
  return {
    shape: "arc",
    d: [
      `M${round(edge)} ${round(a.y)}`,
      `H${round(out + r)}`,
      `Q${round(out)} ${round(a.y)} ${round(out)} ${round(a.y + turn)}`,
      `V${round(b.y - turn)}`,
      `Q${round(out)} ${round(b.y)} ${round(out + r)} ${round(b.y)}`,
      `H${round(edge)}`,
    ].join(""),
  };
}

type Prose = Project["prose"];
type DraftNode = Omit<TableNode, "col" | "row" | "inputs" | "outputs">;

function layout(drafts: readonly DraftNode[], declaredEdges: readonly { from: string; to: string }[]) {
  const laneOf = new Map(drafts.map((node) => [node.id, node.lane]));
  const edges = declaredEdges.filter((edge) => laneOf.has(edge.from) && laneOf.has(edge.to));

  const perLane = ARCHITECTURE_LANES.map((lane) => {
    const ids = drafts.filter((node) => node.lane === lane).map((node) => node.id);
    const internal = edges.filter((edge) => laneOf.get(edge.from) === lane && laneOf.get(edge.to) === lane);
    return laneOrder(ids, internal);
  });
  const rows = Math.max(1, ...perLane.map((ids) => ids.length));

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
    nodes,
    edges: edges.map((edge) => ({
      from: edge.from,
      to: edge.to,
      ...edgePath(
        placed.get(edge.from) as TableNode,
        placed.get(edge.to) as TableNode,
        rows,
        depth.get(`${edge.from}>${edge.to}`) ?? 0,
      ),
    })),
    lanes: ARCHITECTURE_LANES.map((lane, index) => ({ lane, count: perLane[index].length })),
  };
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
    return [{ id, label: technology, lane: laneForTechnology(technology), screen: null, thumb: null, frame: null, decision: null }];
  });
  return { ...layout(drafts, []), derived: true };
}

/* ── Poses ─────────────────────────────────────────────────────────────── */

/**
 * RESULTADO. Tres pantallas en arco sobre la mesa, como en el boceto: la
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
const REEL_CENTER = 0.07;
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

  // Puestos de Resultado: primero el teléfono a la izquierda y la siguiente de
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
    const resultado = slot ? RESULT_POSES[slot][frame] : RESTING_POSE;
    return {
      src: image.src,
      alt: image.alt,
      caption: image.caption,
      frame,
      featured: image.featured,
      index,
      slot,
      nodeId: nodeByScreen.get(image.src)?.id ?? null,
      sources: screenSources(image.src, frame),
      poses: { resultado, ingenieria: engineeringPose(resultado) },
    };
  });
}

/* ── El proyecto entero ────────────────────────────────────────────────── */

export function tableProject(project: Project, projectsHref: string): TableProject {
  const { prose } = project;
  const architecture = tableArchitecture(prose);
  const screens = tableScreens(prose, architecture);
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
    links: (prose.links ?? []).map((link) => ({ ...link })),
    screens,
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
export function statusReadout(status: ProjectStructuralData["status"]): string {
  switch (status) {
    case "production":
      return "En producción";
    case "ready-for-production":
      return "Listo para producción";
    case "in-development":
      return "En desarrollo";
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
