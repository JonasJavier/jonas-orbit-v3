/** Identidad estructural y neutral al idioma de los proyectos reales. */
export const PROJECT_IDS = [
  "omsta",
  "izaks-photos",
  "wikiverse",
  "network",
  "delicate",
] as const;

export type ProjectId = (typeof PROJECT_IDS)[number];

export const F1A_PROJECT_IDS = [
  "omsta",
  "izaks-photos",
  "wikiverse",
  "network",
  // Adelantado de F1B por decisión del dueño (2026-09-23), antes de la mesa.
  "delicate",
] as const satisfies readonly ProjectId[];

export interface ProjectStructuralData {
  order: number;
  phase: "f1a" | "f1b" | "f2a";
  kind: "case-study" | "brief";
  status: "production" | "ready-for-production" | "in-development";
}

/**
 * Los cuatro carriles del esquema de Ingeniería de la mesa
 * (`docs/design/endurance-proyectos.md` §5 y §6), de izquierda a derecha.
 *
 * Son IDENTIDAD, no texto: el rótulo visible de cada carril lo pone la página.
 * Es el flujo real de todos los proyectos del inventario —React o plantillas
 * de Django, DRF o servicios, PostgreSQL/Redis, Railway/WhatsApp— y por eso es
 * un conjunto fijo que Velite valida, no una lista por proyecto.
 */
export const ARCHITECTURE_LANES = [
  "cliente",
  "servicio",
  "datos",
  "infraestructura",
] as const;

export type ArchitectureLane = (typeof ARCHITECTURE_LANES)[number];

export const projectsData = {
  omsta: {
    order: 1,
    phase: "f1a",
    kind: "case-study",
    status: "production",
  },
  "izaks-photos": {
    order: 2,
    phase: "f1a",
    kind: "brief",
    status: "ready-for-production",
  },
  wikiverse: {
    order: 3,
    phase: "f1a",
    kind: "brief",
    status: "ready-for-production",
  },
  network: {
    order: 4,
    phase: "f1a",
    kind: "brief",
    status: "ready-for-production",
  },
  delicate: {
    order: 5,
    phase: "f1a",
    kind: "case-study",
    status: "ready-for-production",
  },
} as const satisfies Record<ProjectId, ProjectStructuralData>;
