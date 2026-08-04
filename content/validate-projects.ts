import type { ProjectId, ProjectStructuralData } from "./projects.data";

interface ProjectImageLike {
  src: string;
  alt: string;
}

export interface ProjectProseLike {
  id: string;
  slug: string;
  locale: string;
  featuredImage: ProjectImageLike;
  gallery?: readonly ProjectImageLike[];
}

export function validateProjectProse(
  entries: readonly ProjectProseLike[],
  publishedLocales: readonly string[],
  projectIds: readonly ProjectId[],
  requiredProjectIds: readonly ProjectId[],
  projectData: Record<ProjectId, ProjectStructuralData>,
  assetExists: (src: string) => boolean = () => true,
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
          `[content] Asset inexistente en "${idKey}": public${image.src}.`,
        );
      }
    }
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
