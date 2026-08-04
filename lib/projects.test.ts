import { describe, expect, it } from "vitest";
import { getF1AProjectBySlug, getF1AProjects, getProject } from "./projects";

describe("projects", () => {
  it("compone estructura y prosa por ProjectId", () => {
    const project = getProject("omsta", "es");

    expect(project.id).toBe("omsta");
    expect(project.kind).toBe("case-study");
    expect(project.prose.slug).toBe("omsta");
  });

  it("publica exactamente los cuatro proyectos aprobados para F1A", () => {
    expect(getF1AProjects("es").map((project) => project.id)).toEqual([
      "omsta",
      "izaks-photos",
      "wikiverse",
      "network",
    ]);
  });

  it("resuelve por slug localizado y excluye el caso de F1B", () => {
    expect(getF1AProjectBySlug("omsta", "es")?.id).toBe("omsta");
    expect(getF1AProjectBySlug("delicate", "es")).toBeUndefined();
    expect(getF1AProjectBySlug("desconocido", "es")).toBeUndefined();
  });
});
