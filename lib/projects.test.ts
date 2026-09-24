import { describe, expect, it } from "vitest";
import { getF1AProjectBySlug, getF1AProjects, getProject } from "./projects";

describe("projects", () => {
  it("compone estructura y prosa por ProjectId", () => {
    const project = getProject("omsta", "es");

    expect(project.id).toBe("omsta");
    expect(project.kind).toBe("case-study");
    expect(project.prose.slug).toBe("omsta");
  });

  it("publica exactamente los cinco proyectos aprobados, en orden editorial", () => {
    expect(getF1AProjects("es").map((project) => project.id)).toEqual([
      "omsta",
      "izaks-photos",
      "wikiverse",
      "network",
      "delicate",
    ]);
  });

  it("resuelve por slug localizado, nunca por id", () => {
    expect(getF1AProjectBySlug("omsta", "es")?.id).toBe("omsta");
    expect(getF1AProjectBySlug("delicate-4-0", "es")?.id).toBe("delicate");
    expect(getF1AProjectBySlug("delicate", "es")).toBeUndefined();
    expect(getF1AProjectBySlug("desconocido", "es")).toBeUndefined();
  });
});
