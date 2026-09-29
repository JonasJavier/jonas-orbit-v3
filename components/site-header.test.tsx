import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getWorldNavItems } from "@/lib/worlds";
import { SiteHeader } from "./site-header";

const languages = { en: "/en/education", es: "/es/formacion" };

vi.mock("@/lib/effects-mode", () => ({ useMotionEnabled: () => true }));

describe("Cabecera · observatorio", () => {
  it("nombra los seis destinos por su contenido y marca el activo con su acento", () => {
    render(<SiteHeader locale="es" languages={languages} worlds={getWorldNavItems("es")} activeWorldId="miller" />);
    const nav = screen.getByRole("navigation", { name: "Navegación de mundos" });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(6);
    expect(within(nav).getByRole("link", { name: "Formación" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).queryByRole("link", { name: /Miller/ })).toBeNull();
    expect(within(nav).getByRole("link", { name: "Contacto" })).toHaveAttribute("href", "/es/contacto");
    expect(within(nav).getByRole("link", { name: "Formación" }).style.getPropertyValue("--nav-accent")).toBe("#55d9ff");
    expect(within(nav).getByRole("link", { name: "Contacto" }).style.getPropertyValue("--nav-accent")).toBe("#c58cff");
  });

  it("ofrece los dos CV desde un desplegable que no necesita JavaScript, y la vuelta al mapa", () => {
    const { container } = render(<SiteHeader locale="es" languages={languages} worlds={getWorldNavItems("es")} activeWorldId="ranger" />);
    const details = container.querySelector<HTMLDetailsElement>("details.voyage-cv")!;
    expect(details.open).toBe(false);
    expect(details.querySelector("summary")).toHaveAttribute("aria-label", "Descargar CV");
    expect(details.querySelector("summary svg.download-icon")).not.toBeNull();
    const links = within(details).getAllByRole("link", { hidden: true });
    expect(links.map((link) => [link.textContent, link.getAttribute("href"), link.hasAttribute("download")])).toEqual([
      ["Español PDF", "/cv/jonas-javier-cv-es.pdf", true],
      ["English PDF", "/cv/jonas-javier-cv-en-ats.pdf", true],
    ]);
    details.open = true;
    fireEvent.keyDown(document, { key: "Escape" });
    expect(details.open).toBe(false);
    expect(details.querySelector("summary")).toHaveFocus();
    details.open = true;
    fireEvent.pointerDown(document.body);
    expect(details.open).toBe(false);
    expect(screen.getByRole("link", { name: "Volver al mapa" })).toHaveAttribute("href", "/es");
    expect(screen.getByRole("link", { name: "Jonás Orbit, inicio" })).toHaveAttribute("href", "/es");
  });

  it("mide la línea del destino activo antes de pintar y no la finge sin destino", () => {
    const { unmount } = render(<SiteHeader locale="es" languages={languages} worlds={getWorldNavItems("es")} activeWorldId="endurance" />);
    const destinations = document.querySelector<HTMLElement>(".voyage-destinations")!;
    expect(destinations).toHaveAttribute("data-marker", "ready");
    expect(destinations.style.getPropertyValue("--marker-accent")).toBe("#f0bc72");
    unmount();
    render(<SiteHeader locale="es" languages={languages} worlds={getWorldNavItems("es")} />);
    const home = document.querySelector<HTMLElement>(".voyage-destinations")!;
    expect(home.style.getPropertyValue("--marker-w")).toBe("0px");
    expect(home.style.getPropertyValue("--marker-accent")).toBe("var(--voyage-signal)");
  });

  it("monta el observatorio sobre la textura y el menú móvil cierra con Escape", () => {
    render(<SiteHeader locale="es" languages={languages} worlds={getWorldNavItems("es")} activeWorldId="miller" />);
    // jsdom no tiene canvas 2D: el observatorio se queda en silencio y la
    // textura SVG del CSS sigue siendo el cielo. Sin errores.
    expect(document.querySelector(".voyage-sky canvas.voyage-sky__canvas")).not.toBeNull();
    expect(document.querySelector(".voyage-sky__canvas")).not.toHaveAttribute("data-ready");
    const toggle = screen.getByRole("button", { name: "Explorar" });
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Cerrar" })).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("button", { name: "Explorar" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Explorar" })).toHaveFocus();
  });
});
