import { act, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SITE_PROFILE } from "@/content/site.data";
import { SiteFooter } from "./site-footer";
import { FooterSky } from "./footer-sky";

let motion = true;
vi.mock("@/lib/effects-mode", () => ({ useMotionEnabled: () => motion }));
vi.mock("./voyage-sky", () => ({ VoyageSky: ({ running }: { running: boolean }) => <canvas data-testid="sky" data-running={running} /> }));

describe("Footer · cierre del viaje", () => {
  let intersect: (entries: { isIntersecting: boolean }[]) => void;
  const disconnect = vi.fn();
  beforeEach(() => {
    motion = true;
    disconnect.mockClear();
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: typeof intersect) { intersect = callback; }
      observe() {}
      disconnect = disconnect;
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(document, "hidden");
  });

  it("sirve los seis destinos en orden narrativo y los canales sin JavaScript", () => {
    const markup = renderToStaticMarkup(<SiteFooter locale="es" activeWorldId="miller" label="Miller" />);
    const root = document.createElement("div");
    root.innerHTML = markup;
    const nav = within(root).getByRole("navigation", { name: "Destinos del pie" });
    expect(within(nav).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual([
      "/es/sobre-mi", "/es/formacion", "/es/proyectos", "/es/creatividad", "/es/experimentos", "/es/contacto",
    ]);
    expect(within(nav).getByRole("link", { name: /Formación/ })).toHaveAttribute("aria-current", "location");
    expect(within(root).getByRole("link", { name: "Hablemos de tu proyecto" })).toHaveAttribute("href", "/es/contacto");
    expect(within(root).getByRole("link", { name: "Mapa estelar, volver al sistema" })).toHaveAttribute("href", "/es");
    expect(within(root).getByRole("link", { name: "Email" })).toHaveAttribute("href", `mailto:${SITE_PROFILE.email}`);
    expect(within(root).getByRole("link", { name: "Volver arriba" })).toHaveAttribute("href", "#main-content");
    expect(within(root).getByRole("link", { name: "Privacidad" })).toHaveAttribute("href", "/es/privacidad");
  });

  it("en Contacto invita a escribir directamente, sin devolver a la misma página", () => {
    render(<SiteFooter locale="es" activeWorldId="ranger" label="Ranger" />);
    expect(screen.getByRole("link", { name: "Escríbeme directamente" })).toHaveAttribute("href", `mailto:${SITE_PROFILE.email}`);
    expect(screen.queryByRole("link", { name: "Hablemos de tu proyecto" })).toBeNull();
  });

  it("anima sólo a la vista, obedece al interruptor y duerme en segundo plano", () => {
    const { rerender, unmount } = render(<FooterSky />);
    const sky = screen.getByTestId("sky");
    expect(sky).toHaveAttribute("data-running", "false");
    act(() => intersect([{ isIntersecting: true }]));
    expect(sky).toHaveAttribute("data-running", "true");
    motion = false;
    rerender(<FooterSky />);
    expect(sky).toHaveAttribute("data-running", "false");
    motion = true;
    rerender(<FooterSky />);
    expect(sky).toHaveAttribute("data-running", "true");
    act(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(sky).toHaveAttribute("data-running", "false");
    act(() => {
      Reflect.deleteProperty(document, "hidden");
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(sky).toHaveAttribute("data-running", "true");
    act(() => intersect([{ isIntersecting: false }]));
    expect(sky).toHaveAttribute("data-running", "false");
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
