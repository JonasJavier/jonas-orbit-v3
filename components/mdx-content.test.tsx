import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getProject } from "@/lib/projects";
import { MDXContent } from "./mdx-content";

describe("MDXContent", () => {
  it("renderiza el cuerpo compilado por Velite con estructura semántica", () => {
    const project = getProject("omsta", "es");
    render(<MDXContent code={project.prose.body} />);

    expect(
      screen.getByRole("heading", { level: 2, name: "1. Contexto" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "17. Enlaces y siguiente paso",
      }),
    ).toBeInTheDocument();
  });
});
