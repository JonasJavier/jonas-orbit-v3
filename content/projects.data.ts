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
] as const satisfies readonly ProjectId[];

export interface ProjectStructuralData {
  order: number;
  phase: "f1a" | "f1b" | "f2a";
  kind: "case-study" | "brief";
  status: "production" | "ready-for-production" | "in-development";
}

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
    phase: "f1b",
    kind: "case-study",
    status: "ready-for-production",
  },
} as const satisfies Record<ProjectId, ProjectStructuralData>;
