import { describe, expect, it } from "vitest";
import { findWorldRoute, isBlogPath, type WorldRoute } from "./world-route";

const routes: WorldRoute[] = [
  { href: "/es/sobre-mi", id: "gargantua", accent: "#ffb45c" },
  { href: "/es/proyectos", id: "endurance", accent: "#f0bc72" },
  { href: "/es/contacto", id: "ranger", accent: "#c58cff" },
];

describe("findWorldRoute (base del contrato de cámara)", () => {
  it("resuelve la ruta exacta de un mundo", () => {
    expect(findWorldRoute("/es/proyectos", routes)?.id).toBe("endurance");
  });

  it("una ruta hija conserva el mundo de su padre", () => {
    expect(findWorldRoute("/es/proyectos/omsta", routes)?.id).toBe("endurance");
    expect(findWorldRoute("/es/contacto/gracias", routes)?.id).toBe("ranger");
  });

  it("no confunde un prefijo de texto con un prefijo de ruta", () => {
    expect(findWorldRoute("/es/proyectosx", routes)).toBeNull();
  });

  it("la home y las páginas legales no pertenecen a ningún mundo", () => {
    expect(findWorldRoute("/es", routes)).toBeNull();
    expect(findWorldRoute("/es/privacidad", routes)).toBeNull();
  });

  it("una barra final no cambia el resultado", () => {
    expect(findWorldRoute("/es/contacto/", routes)?.id).toBe("ranger");
    expect(findWorldRoute("/es/", routes)).toBeNull();
  });

  it("es pura: la misma ruta devuelve siempre lo mismo", () => {
    // G7 en miniatura: sin estado residual entre llamadas, en cualquier orden.
    const first = findWorldRoute("/es/sobre-mi", routes);
    findWorldRoute("/es/contacto/gracias", routes);
    expect(findWorldRoute("/es/sobre-mi", routes)).toEqual(first);
  });
});

describe("isBlogPath (la escena duerme bajo el cielo del blog)", () => {
  it("casa el índice y las entradas en los dos idiomas", () => {
    expect(isBlogPath("/es/blog")).toBe(true);
    expect(isBlogPath("/en/blog/how-i-built-a-black-hole-in-webgl")).toBe(true);
  });

  it("no casa un mundo ni un slug que sólo contenga la palabra", () => {
    expect(isBlogPath("/es")).toBe(false);
    expect(isBlogPath("/es/experimentos")).toBe(false);
    expect(isBlogPath("/es/experimentos/blog")).toBe(false);
  });
});
