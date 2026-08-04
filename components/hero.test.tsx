import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hero } from "./hero";

describe("Hero", () => {
  it("mantiene la propuesta y los tres CTAs contractuales estables", () => {
    render(<Hero />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Jonás Javier EncarnaciónSistemas sólidos/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver proyectos" })).toHaveAttribute(
      "href",
      "#proyectos",
    );
    expect(
      screen.getByRole("link", { name: "Trabajemos juntos" }),
    ).toHaveAttribute("href", "#contacto");
    expect(screen.getByRole("link", { name: /Descargar CV/ })).toHaveAttribute(
      "href",
      "/cv/jonas-javier-cv-es.pdf",
    );
  });
});
