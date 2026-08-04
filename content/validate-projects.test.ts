import { describe, expect, it } from "vitest";
import {
  F1A_PROJECT_IDS,
  PROJECT_IDS,
  projectsData,
  type ProjectId,
  type ProjectStructuralData,
} from "./projects.data";
import {
  validateProjectProse,
  type ProjectProseLike,
} from "./validate-projects";

function project(
  id: ProjectId,
  locale: string,
  slug: string = id,
): ProjectProseLike {
  return {
    id,
    locale,
    slug,
    featuredImage: {
      src: `/media/projects/${id}/cover.png`,
      alt: `Captura de ${id}`,
    },
  };
}

function requiredLocale(locale: string): ProjectProseLike[] {
  return F1A_PROJECT_IDS.map((id) => project(id, locale));
}

function validate(
  entries: readonly ProjectProseLike[],
  assetExists: (src: string) => boolean = () => true,
): void {
  validateProjectProse(
    entries,
    ["es"],
    PROJECT_IDS,
    F1A_PROJECT_IDS,
    projectsData,
    assetExists,
  );
}

describe("validateProjectProse", () => {
  it("acepta las cuatro piezas requeridas de F1A", () => {
    expect(() => validate(requiredLocale("es"))).not.toThrow();
  });

  it("falla si falta una ficha requerida en un idioma publicado", () => {
    const entries = requiredLocale("es").filter(
      (entry) => entry.id !== "network",
    );
    expect(() => validate(entries)).toThrow(/network/);
  });

  it("falla si dos archivos comparten proyecto e idioma", () => {
    const entries = [...requiredLocale("es"), project("omsta", "es", "otro")];
    expect(() => validate(entries)).toThrow(/[Pp]royecto duplicado/);
  });

  it("falla si dos proyectos comparten slug e idioma", () => {
    const entries = requiredLocale("es").map((entry) =>
      entry.id === "network" ? { ...entry, slug: "wikiverse" } : entry,
    );
    expect(() => validate(entries)).toThrow(/[Ss]lug de proyecto duplicado/);
  });

  it("falla si una imagen no tiene alt localizado", () => {
    const entries = requiredLocale("es").map((entry) =>
      entry.id === "network"
        ? { ...entry, featuredImage: { ...entry.featuredImage, alt: "" } }
        : entry,
    );
    expect(() => validate(entries)).toThrow(/sin alt/);
  });

  it("falla si una imagen declarada no existe", () => {
    expect(() => validate(requiredLocale("es"), () => false)).toThrow(
      /Asset inexistente/,
    );
  });

  it("falla si dos proyectos comparten orden", () => {
    const broken: Record<ProjectId, ProjectStructuralData> = {
      ...projectsData,
      network: { ...projectsData.network, order: projectsData.wikiverse.order },
    };
    expect(() =>
      validateProjectProse(
        requiredLocale("es"),
        ["es"],
        PROJECT_IDS,
        F1A_PROJECT_IDS,
        broken,
      ),
    ).toThrow(/[Oo]rden de proyecto repetido/);
  });
});
