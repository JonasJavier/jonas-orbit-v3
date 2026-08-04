import { projectProse } from "@velite";
import {
  F1A_PROJECT_IDS,
  projectsData,
  type ProjectId,
  type ProjectStructuralData,
} from "@/content/projects.data";
import type { Locale } from "@/content/site.data";

type ProjectProse = (typeof projectProse)[number];

export interface Project extends ProjectStructuralData {
  id: ProjectId;
  prose: ProjectProse;
}

const f1aProjectIds = new Set<ProjectId>(F1A_PROJECT_IDS);

/** Compone estructura y prosa usando ProjectId como identidad canónica. */
export function getProject(id: ProjectId, locale: Locale): Project {
  const prose = projectProse.find(
    (entry) => entry.id === id && entry.locale === locale,
  );

  if (!prose) {
    throw new Error(`No hay prosa para el proyecto "${id}" en "${locale}".`);
  }

  return { id, ...projectsData[id], prose };
}

/** Proyectos publicables en F1A, en el orden editorial aprobado. */
export function getF1AProjects(locale: Locale): Project[] {
  return projectProse
    .filter(
      (entry) =>
        entry.locale === locale && f1aProjectIds.has(entry.id as ProjectId),
    )
    .map((entry) => getProject(entry.id as ProjectId, locale))
    .sort((a, b) => a.order - b.order);
}

/** Resuelve una URL pública de F1A sin usar el slug como clave estructural. */
export function getF1AProjectBySlug(
  slug: string,
  locale: Locale,
): Project | undefined {
  return getF1AProjects(locale).find((project) => project.prose.slug === slug);
}
