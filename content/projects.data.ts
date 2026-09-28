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
 * Los carriles del esquema de Ingeniería de la mesa
 * (`docs/design/endurance-proyectos.md` §5, §6 y §17), de izquierda a derecha.
 *
 * Son IDENTIDAD, no texto: el rótulo visible de cada carril lo pone la página.
 * Es el flujo real de todos los proyectos del inventario —React o plantillas
 * de Django, DRF o servicios, PostgreSQL/Redis, Railway— y por eso es un
 * conjunto fijo que Velite valida, no una lista por proyecto.
 *
 * `integraciones` (§17) separa lo que el sistema USA de fuera —un canal como
 * WhatsApp, una pasarela, una API de terceros— de lo que lo SOSTIENE: Railway
 * es infraestructura; WhatsApp no. Un proyecto sólo dibuja los carriles que
 * ocupa.
 */
export const ARCHITECTURE_LANES = [
  "cliente",
  "servicio",
  "datos",
  "infraestructura",
  "integraciones",
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
    // Caso completo desde el kit de 2026-09-26
    // (`portfolio-content/izaks-photos-2026/`): en línea en Railway; el
    // estudio es de demostración.
    kind: "case-study",
    status: "production",
  },
  wikiverse: {
    order: 3,
    phase: "f1a",
    // Caso completo desde el kit de 2026-09-28
    // (`portfolio-content/wikiverse-2026/`): en producción en
    // wikiverse.jonasjavier.dev (Railway, dominio propio).
    kind: "case-study",
    status: "production",
  },
  network: {
    order: 4,
    phase: "f1a",
    // Caso completo y desplegado desde el kit de 2026-09-26
    // (`portfolio-content/network-2026/`): web y API en Railway, demo pública.
    kind: "case-study",
    status: "production",
  },
  delicate: {
    order: 5,
    phase: "f1a",
    // Rehecho desde el kit de 2026-09-26 (`portfolio-content/delicate-2026/`):
    // en línea en delicate.jonasjavier.dev (Railway, dominio propio).
    kind: "case-study",
    status: "production",
  },
} as const satisfies Record<ProjectId, ProjectStructuralData>;
