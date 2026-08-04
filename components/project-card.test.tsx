import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getProject } from "@/lib/projects";
import { ProjectCard } from "./project-card";

describe("ProjectCard", () => {
  it("expone evidencia, estado y ruta del caso completo", () => {
    const project = getProject("omsta", "es");
    render(<ProjectCard project={project} locale="es" />);

    expect(
      screen.getByRole("img", { name: project.prose.featuredImage.alt }),
    ).toBeInTheDocument();
    expect(screen.getByText(project.prose.statusLabel)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Abrir caso completo" }),
    ).toHaveAttribute("href", "/es/proyectos/omsta");
  });

  it("distingue una ficha breve sin degradarla a placeholder", () => {
    const project = getProject("network", "es");
    render(<ProjectCard project={project} locale="es" />);

    expect(
      screen.getByRole("link", { name: "Abrir ficha de misión" }),
    ).toHaveAttribute("href", "/es/proyectos/network-3-0");
    expect(screen.queryByText(project.prose.problem)).not.toBeInTheDocument();
    expect(screen.getByText(project.prose.summary)).toBeInTheDocument();
  });
});
