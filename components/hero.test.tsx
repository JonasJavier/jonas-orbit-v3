import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hero } from "./hero";

describe("Hero — respaldo semántico fuera del plano visual", () => {
  it("conserva identidad y rol en HTML sin recuperar el bloque de presentación", () => {
    const { container } = render(
      <Hero locale="es" projectsHref="/es/proyectos" contactHref="/es/contacto" />,
    );

    const fallback = container.querySelector(".hero-semantic");
    expect(fallback).not.toBeNull();
    expect(fallback).toHaveClass("visually-hidden");
    expect(fallback).toHaveTextContent(/Jonás Javier Encarnación/);
    expect(fallback).toHaveTextContent(/Desarrollador full-stack/);
    expect(fallback).toHaveTextContent(/Diseñador de producto digital/);

    // La propuesta personal fue retirada de la home, también de su respaldo:
    // no debe reaparecer por accidente como copy visible ni semántico.
    expect(fallback).not.toHaveTextContent(/ingeniería y diseño orbitan juntos/i);
  });

  it("mantiene los tres accesos contractuales como enlaces reales", () => {
    const { container } = render(
      <Hero locale="es" projectsHref="/es/proyectos" contactHref="/es/contacto" />,
    );
    const fallback = container.querySelector(".hero-semantic");
    expect(fallback).not.toBeNull();
    const links = fallback?.querySelectorAll("nav a");
    expect(links).toHaveLength(3);

    expect(links?.[0]).toHaveTextContent("Proyectos");
    expect(links?.[0]).toHaveAttribute("href", "/es/proyectos");
    expect(links?.[1]).toHaveTextContent("Contacto");
    expect(links?.[1]).toHaveAttribute("href", "/es/contacto");
    const cv = links?.[2];
    expect(cv).toHaveTextContent("CV");
    expect(cv).toHaveAttribute("href", "/cv/jonas-javier-cv-es.pdf");
    expect(cv).toHaveAttribute("download");
  });
});
