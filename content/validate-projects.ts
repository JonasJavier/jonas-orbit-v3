import {
  ARCHITECTURE_LANES,
  type ArchitectureLane,
  type ProjectId,
  type ProjectStructuralData,
} from "./projects.data";

interface ProjectImageLike {
  src: string;
  alt: string;
  frame?: "desktop" | "mobile";
  module?: string;
}

interface ArchitectureNodeLike {
  id: string;
  label: string;
  lane: ArchitectureLane;
  screen?: string;
  decision?: string;
  tech?: readonly string[];
}

interface StackGroupLike {
  group: string;
  items: readonly string[];
}

export interface ArchitectureLike {
  nodes: readonly ArchitectureNodeLike[];
  edges?: readonly (readonly string[])[];
}

export interface DesignDecisionLike {
  screen: string;
  problem: string;
  decision: string;
}

export interface ProjectProseLike {
  id: string;
  slug: string;
  locale: string;
  featuredImage: ProjectImageLike;
  gallery?: readonly ProjectImageLike[];
  architecture?: ArchitectureLike;
  designDecisions?: readonly DesignDecisionLike[];
  stack?: readonly StackGroupLike[];
}

export interface ImageSize {
  width: number;
  height: number;
}

/**
 * Lo que un caso completo tiene que declarar para que la capa Ingeniería de la
 * mesa exista de verdad (`docs/design/endurance-proyectos.md` §6): cuatro
 * nodos son el mínimo para que haya SISTEMA y no una lista de tecnologías, y
 * una decisión es lo que lo convierte en un mapa de criterio.
 */
const CASE_STUDY_MIN_NODES = 4;

export function validateProjectProse(
  entries: readonly ProjectProseLike[],
  publishedLocales: readonly string[],
  projectIds: readonly ProjectId[],
  requiredProjectIds: readonly ProjectId[],
  projectData: Record<ProjectId, ProjectStructuralData>,
  assetExists: (src: string) => boolean = () => true,
  /**
   * Dimensiones medidas de cada captura (las registra el preparador de
   * medios). `null` cuando no se conocen: entonces `frame` no se comprueba,
   * pero sí todo lo demás.
   */
  imageSize: (src: string) => ImageSize | null = () => null,
): void {
  const orderOwner = new Map<number, ProjectId>();
  for (const id of projectIds) {
    const clash = orderOwner.get(projectData[id].order);
    if (clash) {
      throw new Error(
        `[content] Orden de proyecto repetido: "${id}" y "${clash}" comparten order=${projectData[id].order}.`,
      );
    }
    orderOwner.set(projectData[id].order, id);
  }

  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();

  for (const project of entries) {
    const idKey = `${project.locale}/${project.id}`;
    if (seenIds.has(idKey)) {
      throw new Error(
        `[content] Proyecto duplicado: dos archivos para "${idKey}".`,
      );
    }
    seenIds.add(idKey);

    const slugKey = `${project.locale}/${project.slug}`;
    if (seenSlugs.has(slugKey)) {
      throw new Error(
        `[content] Slug de proyecto duplicado: "${project.slug}" en "${project.locale}".`,
      );
    }
    seenSlugs.add(slugKey);

    const images = [project.featuredImage, ...(project.gallery ?? [])];
    for (const image of images) {
      if (!image.src.startsWith("/media/projects/")) {
        throw new Error(
          `[content] Asset fuera de /media/projects/ en "${idKey}": ${image.src}.`,
        );
      }
      if (image.alt.trim().length === 0) {
        throw new Error(`[content] Imagen sin alt en "${idKey}": ${image.src}.`);
      }
      if (!assetExists(image.src)) {
        throw new Error(
          `[content] Captura sin publicar en "${idKey}": ${image.src} (faltan sus WebP en public/; corre tools/prepare-projects.mjs).`,
        );
      }
      /*
        `frame: mobile` es una afirmación sobre el aparato que produjo la
        captura, y una captura de teléfono es más alta que ancha. Se comprueba
        contra las dimensiones MEDIDAS, nunca contra un número escrito a mano.
      */
      if (image.frame === "mobile") {
        const size = imageSize(image.src);
        if (size && size.width >= size.height) {
          throw new Error(
            `[content] "${image.src}" en "${idKey}" declara frame: mobile pero mide ${size.width}×${size.height}: una captura de teléfono es más alta que ancha.`,
          );
        }
      }
    }

    /*
      El recorrido por módulos del caso agrupa TODAS las capturas: una sin
      módulo no tendría grupo y desaparecería del recorrido sin avisar.
    */
    const withModule = images.filter((image) => image.module !== undefined);
    if (withModule.length > 0 && withModule.length < images.length) {
      const orphan = images.find((image) => image.module === undefined);
      throw new Error(
        `[content] "${idKey}" agrupa sus capturas por módulo pero ${orphan?.src} no declara el suyo: o lo llevan todas, o ninguna.`,
      );
    }
    for (const image of withModule) {
      if ((image.module ?? "").trim().length === 0) {
        throw new Error(`[content] Módulo vacío en "${idKey}": ${image.src}.`);
      }
    }

    validateStack(idKey, project.stack);

    validateDesignDecisions(
      idKey,
      project.designDecisions,
      new Set(images.map((image) => image.src)),
    );

    const structural = projectData[project.id as ProjectId];
    validateArchitecture(
      idKey,
      project.architecture,
      structural?.kind === "case-study",
      new Set(images.map((image) => image.src)),
    );
  }

  for (const locale of publishedLocales) {
    const missing = requiredProjectIds.filter(
      (id) => !seenIds.has(`${locale}/${id}`),
    );
    if (missing.length > 0) {
      throw new Error(
        `[content] El idioma publicado "${locale}" no tiene los proyectos F1A requeridos: ${missing.join(", ")}.`,
      );
    }
  }
}

/**
 * El stack completo: grupos con nombre, sin repetirse, y ninguna tecnología
 * dos veces (en dos grupos se leería como dos piezas distintas).
 */
function validateStack(idKey: string, stack: readonly StackGroupLike[] | undefined): void {
  const groups = new Set<string>();
  const items = new Set<string>();
  for (const entry of stack ?? []) {
    const group = entry.group.trim();
    if (group.length === 0) {
      throw new Error(`[content] Grupo de stack sin nombre en "${idKey}".`);
    }
    if (groups.has(group)) {
      throw new Error(`[content] Grupo de stack repetido en "${idKey}": "${group}".`);
    }
    groups.add(group);
    for (const raw of entry.items) {
      const item = raw.trim();
      if (item.length === 0) {
        throw new Error(`[content] Tecnología vacía en el grupo "${group}" de "${idKey}".`);
      }
      if (items.has(item)) {
        throw new Error(`[content] Tecnología repetida en el stack de "${idKey}": "${item}".`);
      }
      items.add(item);
    }
  }
}

/**
 * §17. Una decisión de diseño enseña la pantalla que la resuelve: si esa
 * pantalla no es del proyecto, la capa Diseño de la mesa pintaría una
 * decisión sobre otra cosa. Y una pantalla lleva a lo sumo una decisión: el
 * carrete de Diseño las recorre de una en una.
 */
function validateDesignDecisions(
  idKey: string,
  decisions: readonly DesignDecisionLike[] | undefined,
  screensOnTable: ReadonlySet<string>,
): void {
  const seen = new Set<string>();
  for (const entry of decisions ?? []) {
    if (!screensOnTable.has(entry.screen)) {
      throw new Error(
        `[content] Una decisión de diseño de "${idKey}" señala una pantalla que no es del proyecto: ${entry.screen}.`,
      );
    }
    if (seen.has(entry.screen)) {
      throw new Error(
        `[content] Dos decisiones de diseño de "${idKey}" comparten pantalla: ${entry.screen}.`,
      );
    }
    seen.add(entry.screen);
    if (entry.problem.trim().length === 0 || entry.decision.trim().length === 0) {
      throw new Error(
        `[content] Decisión de diseño incompleta en "${idKey}" (${entry.screen}): hacen falta problema y decisión.`,
      );
    }
  }
}

/**
 * P1. Un esquema que dibuje cajas huérfanas, líneas a ningún sitio o pantallas
 * que no están en la mesa sería exactamente el diagrama inventado que la regla
 * 8 prohíbe; aquí es un error de build y no una sorpresa en pantalla.
 */
function validateArchitecture(
  idKey: string,
  architecture: ArchitectureLike | undefined,
  isCaseStudy: boolean,
  screensOnTable: ReadonlySet<string>,
): void {
  if (!architecture) {
    if (isCaseStudy) {
      throw new Error(
        `[content] El caso completo "${idKey}" no declara "architecture": la capa Ingeniería de la mesa no puede inventarla.`,
      );
    }
    return;
  }

  const ids = new Set<string>();
  let decisions = 0;
  for (const node of architecture.nodes) {
    if (ids.has(node.id)) {
      throw new Error(
        `[content] Nodo de arquitectura repetido en "${idKey}": "${node.id}".`,
      );
    }
    ids.add(node.id);
    if (!ARCHITECTURE_LANES.includes(node.lane)) {
      throw new Error(
        `[content] Carril desconocido en "${idKey}": "${node.lane}" (nodo "${node.id}"). Válidos: ${ARCHITECTURE_LANES.join(", ")}.`,
      );
    }
    if (node.label.trim().length === 0) {
      throw new Error(
        `[content] Nodo sin rótulo en "${idKey}": "${node.id}".`,
      );
    }
    if (node.screen !== undefined && !screensOnTable.has(node.screen)) {
      throw new Error(
        `[content] El nodo "${node.id}" de "${idKey}" señala una pantalla que no está en la mesa: ${node.screen}. Una pantalla no puede ser nodo de un sistema si no está en la destacada o en la galería.`,
      );
    }
    if (node.decision && node.decision.trim().length > 0) decisions++;
    if (node.tech?.some((item) => item.trim().length === 0)) {
      throw new Error(
        `[content] Tecnología vacía en el nodo "${node.id}" de "${idKey}".`,
      );
    }
  }

  const screenOwners = new Map<string, string>();
  for (const node of architecture.nodes) {
    if (node.screen === undefined) continue;
    const owner = screenOwners.get(node.screen);
    if (owner) {
      throw new Error(
        `[content] Dos nodos de "${idKey}" ("${owner}" y "${node.id}") reclaman la misma pantalla: ${node.screen}.`,
      );
    }
    screenOwners.set(node.screen, node.id);
  }

  for (const edge of architecture.edges ?? []) {
    const [from, to] = edge;
    if (edge.length !== 2 || !from || !to) {
      throw new Error(
        `[content] Arista mal formada en "${idKey}": ${JSON.stringify(edge)}.`,
      );
    }
    if (from === to) {
      throw new Error(
        `[content] Arista de un nodo a sí mismo en "${idKey}": "${from}".`,
      );
    }
    for (const end of [from, to]) {
      if (!ids.has(end)) {
        throw new Error(
          `[content] Arista a un nodo inexistente en "${idKey}": "${from}" → "${to}" ("${end}" no está declarado).`,
        );
      }
    }
  }

  if (isCaseStudy) {
    if (architecture.nodes.length < CASE_STUDY_MIN_NODES) {
      throw new Error(
        `[content] El caso completo "${idKey}" declara ${architecture.nodes.length} nodos; hacen falta al menos ${CASE_STUDY_MIN_NODES} para que haya un sistema que desplegar.`,
      );
    }
    if (decisions === 0) {
      throw new Error(
        `[content] El caso completo "${idKey}" no pega ninguna decisión a sus nodos: sin decisiones el esquema es un diagrama de stack, no un mapa de criterio.`,
      );
    }
  }
}
