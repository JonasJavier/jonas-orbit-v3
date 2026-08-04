import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Project } from "@/lib/projects";
import { getProject } from "@/lib/projects";
import { getWorlds } from "@/lib/worlds";
import { ProjectCase } from "./project-case";

describe("ProjectCase", () => {
  it("mantiene un estado digno cuando la galería opcional no existe", () => {
    const source = getProject("network", "es");
    const project: Project = {
      ...source,
      prose: { ...source.prose, gallery: undefined },
    };

    render(<ProjectCase project={project} locale="es" worlds={getWorlds("es")} />);

    expect(
      screen.getByRole("heading", { level: 1, name: project.prose.title }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 2, name: "Dentro del sistema." }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "¿Tienes un sistema difícil de ordenar?",
      }),
    ).toBeInTheDocument();
  });
});
