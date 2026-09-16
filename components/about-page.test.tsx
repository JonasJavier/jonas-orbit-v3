import { existsSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getWorld } from "@/lib/worlds";
import photos from "@/content/about-photos.data.json";
import { AboutPage } from "./about-page";

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value: vi.fn(),
  });
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe("Sobre mí · constelación personal", () => {
  it("sirve las seis historias y sus destinos sin esperar una interacción", () => {
    const { container } = render(
      <AboutPage world={getWorld("gargantua", "es")} locale="es" />,
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Mi pequeño universo",
    );
    const index = screen.getByRole("navigation", {
      name: "Explora las seis constelaciones",
    });
    const links = within(index).getAllByRole("link");
    expect(links).toHaveLength(6);
    for (const link of links)
      expect(
        container.querySelector(link.getAttribute("href")!),
      ).toBeInTheDocument();
    expect(
      within(index).getByRole("img", { name: "Jonás junto al mar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Mi fe también ocupa un lugar importante/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Predicar desde joven/)).toBeInTheDocument();
    expect(
      screen.getByText(/cumpliendo metas y sueños juntos/),
    ).toBeInTheDocument();
    expect(container).not.toHaveTextContent(
      /consumismo|materialismo|persona enferma|granjas|cabaña/,
    );
    expect(
      within(
        screen.getByRole("navigation", { name: "Destinos contiguos" }),
      ).getByRole("link"),
    ).toHaveAttribute("href", "/es/formacion");
  });

  it("las fotos conservan enlaces utilizables sin JavaScript y formatos presentes", () => {
    const { container } = render(
      <AboutPage world={getWorld("gargantua", "es")} locale="es" />,
    );
    const links =
      container.querySelectorAll<HTMLAnchorElement>("a[data-photo]");
    expect(links).toHaveLength(15);
    expect(
      container.querySelector(
        'img[src*="F13-"], img[src*="E03-"], img[src*="F42-"]',
      ),
    ).not.toBeInTheDocument();
    expect(container.querySelector("#mis-raices img")).toHaveAttribute(
      "src",
      expect.stringContaining("F23-"),
    );
    for (const id of ["F02", "F16", "F11", "F34", "F15", "F20", "F07"]) {
      expect(
        container.querySelector(`a[data-photo="${id}"]`),
      ).toBeInTheDocument();
    }
    for (const link of links)
      expect(
        existsSync(join(process.cwd(), "public", link.getAttribute("href")!)),
      ).toBe(true);
    for (const [id, photo] of Object.entries(photos)) {
      for (const width of photo.widths)
        expect(
          existsSync(
            join(process.cwd(), `public/images/sobre-mi/${id}-${width}.webp`),
          ),
        ).toBe(true);
    }
    expect(container.querySelector("audio")).not.toBeInTheDocument();
    expect(container.querySelectorAll("details")).toHaveLength(0);
  });
});
