import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hero } from "./hero";

describe("Hero — el mínimo que la regla 7 no negocia", () => {
  it("sirve nombre, rol y propuesta A LA VISTA", () => {
    const { container } = render(
      <Hero projectsHref="/es/proyectos" contactHref="/es/contacto" />,
    );

    const title = screen.getByRole("heading", { level: 1 });
    expect(title).toHaveTextContent(/Jonás Javier Encarnación/);

    /*
      Rol y propuesta VUELVEN A VERSE, y por eso este test cambió de forma.

      Estaban escondidos en texto para lectores de pantalla dentro del propio
      <h1>: cumplía la regla 7 —el HTML servido los contenía— pero fallaba en lo
      humano, porque alguien podía mirar la escena diez segundos sin enterarse
      de a qué se dedica Jonás. Ahora son dos párrafos visibles, así que ya no
      se comprueba que estén DENTRO del titular sino que estén EN LA PÁGINA.

      Lo que el test protege sigue siendo lo mismo: que el HTML servido diga
      quién es y qué hace, sin depender de JavaScript.
    */
    expect(container).toHaveTextContent(/Desarrollador full-stack/);
    expect(container).toHaveTextContent(/Diseñador de producto digital/);
    expect(container).toHaveTextContent(
      /ingeniería y diseño orbitan juntos/,
    );
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
