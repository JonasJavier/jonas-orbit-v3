import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hero } from "./hero";

describe("Hero — el mínimo que la regla 7 no negocia", () => {
  it("sirve nombre, rol y propuesta en el HTML aunque no se vean", () => {
    render(<Hero projectsHref="/es/proyectos" contactHref="/es/contacto" />);

    const title = screen.getByRole("heading", { level: 1 });
    expect(title).toHaveTextContent(/Jonás Javier Encarnación/);
    // Rol y propuesta se ocultaron a la vista para no competir con la escena,
    // pero siguen EN EL DOCUMENTO: es lo que leen un lector de pantalla y
    // Googlebot. Si alguien los borrara de verdad, este test lo pillaría.
    expect(title).toHaveTextContent(/desarrollador full-stack y creador visual/);
    expect(title).toHaveTextContent(/No separo creatividad y tecnología/);
  });

  it("los tres accesos contractuales apuntan a rutas reales", () => {
    render(<Hero projectsHref="/es/proyectos" contactHref="/es/contacto" />);

    // Si volvieran a ser anclas, la home habría recuperado en silencio el
    // scroll narrativo que el pivote retiró.
    expect(screen.getByRole("link", { name: "Proyectos" })).toHaveAttribute(
      "href",
      "/es/proyectos",
    );
    expect(screen.getByRole("link", { name: "Contacto" })).toHaveAttribute(
      "href",
      "/es/contacto",
    );
    const cv = screen.getByRole("link", { name: /CV/ });
    expect(cv).toHaveAttribute("href", "/cv/jonas-javier-cv-es.pdf");
    expect(cv).toHaveAttribute("download");
  });
});
