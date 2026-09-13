import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getWorldNavItems } from "@/lib/worlds";
import { SiteHeader } from "./site-header";

vi.mock("@/lib/use-prefers-reduced-motion", () => ({ usePrefersReducedMotion: () => false }));
vi.mock("@/lib/effects-mode", () => ({ useLightEffectsMode: () => false }));

describe("Cabecera · instrumento de a bordo", () => {
  it("nombra cada destino por su contenido y guarda índice y cuerpo como letra pequeña", () => {
    render(<SiteHeader locale="es" worlds={getWorldNavItems("es")} activeWorldId="miller" />);
    const nav = screen.getByRole("navigation", { name: "Navegación de mundos" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Sobre mí01 · Gargantúa",
      "Formación02 · Miller",
      "Proyectos03 · Endurance",
      "Creatividad04 · Edmunds",
      "Experimentos05 · Tesseracto",
      "Contacto06 · Ranger",
    ]);
    // La letra pequeña no entra en el nombre accesible: el enlace sigue siendo «Formación».
    expect(within(nav).getByRole("link", { name: "Formación" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).queryByRole("link", { name: /Miller/ })).toBeNull();
    expect(within(nav).getByRole("link", { name: "Contacto" })).toHaveAttribute("href", "/es/contacto");
    expect(within(nav).getByRole("link", { name: "Formación" }).style.getPropertyValue("--nav-accent")).toBe("#55d9ff");
  });

  it("ofrece el CV como descarga y la vuelta al mapa", () => {
    render(<SiteHeader locale="es" worlds={getWorldNavItems("es")} activeWorldId="ranger" />);
    const cv = screen.getByRole("link", { name: "Descargar CV (PDF)" });
    expect(cv).toHaveAttribute("href", "/cv/jonas-javier-cv-es.pdf");
    expect(cv).toHaveAttribute("download");
    expect(cv.querySelector("svg.download-icon")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Volver al mapa" })).toHaveAttribute("href", "/es");
    expect(screen.getByRole("link", { name: "Jonás Orbit, inicio" })).toHaveAttribute("href", "/es");
  });

  it("mide la línea del destino activo antes de pintar y no la finge sin destino", () => {
    const { unmount } = render(<SiteHeader locale="es" worlds={getWorldNavItems("es")} activeWorldId="endurance" />);
    const destinations = document.querySelector<HTMLElement>(".voyage-destinations")!;
    expect(destinations).toHaveAttribute("data-marker", "ready");
    expect(destinations.style.getPropertyValue("--marker-accent")).toBe("#f0bc72");
    unmount();
    render(<SiteHeader locale="es" worlds={getWorldNavItems("es")} />);
    const home = document.querySelector<HTMLElement>(".voyage-destinations")!;
    expect(home.style.getPropertyValue("--marker-w")).toBe("0px");
    expect(home.style.getPropertyValue("--marker-accent")).toBe("var(--voyage-signal)");
  });

  it("el menú móvil abre, cierra con Escape y devuelve el foco", () => {
    render(<SiteHeader locale="es" worlds={getWorldNavItems("es")} activeWorldId="miller" />);
    const toggle = screen.getByRole("button", { name: "Explorar" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Cerrar" })).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("button", { name: "Explorar" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Explorar" })).toHaveFocus();
  });
});
