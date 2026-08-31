import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/*
  El raíl navega a través de `useWorldNavigation`, la costura que aísla al Hero
  de CÓMO se viaja a un mundo (hoy rutas, mañana scroll). Eso arrastra
  `useRouter`, que no existe fuera del App Router: aquí se sustituye por un
  doble. Lo que este archivo comprueba es el contrato del MARCADO, no el viaje.
*/
const routerPush = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush, replace: vi.fn(), prefetch: vi.fn() }),
}));
import { getWorldNavItems } from "@/lib/worlds";
import { SystemMap } from "./system-map";

const worlds = getWorldNavItems("es");
const MAP_LABEL = "Destinos del Sistema Gargantúa";

describe("SystemMap — el contrato entre el HTML y la escena", () => {
  beforeEach(() => {
    routerPush.mockClear();
  });

  it("expone la marca mínima y un TARGET en reposo sin copy personal", () => {
    const { container } = render(<SystemMap worlds={worlds} />);

    expect(container.querySelector(".hud__system")).toHaveTextContent(
      /Jonas Orbit/i,
    );
    const target = container.querySelector(".hud__target");
    expect(target).toHaveAttribute("data-target-state", "idle");
    expect(target).toHaveTextContent(/Navigation/i);
    expect(target).toHaveTextContent(/Select destination/i);
    expect(container).not.toHaveTextContent(/Jonás Javier Encarnación/i);
    expect(container).not.toHaveTextContent(/ingeniería y diseño orbitan juntos/i);
  });

  it("sirve los 7 destinos como enlaces reales", () => {
    const { container } = render(<SystemMap worlds={worlds} />);

    const map = screen.getByRole("navigation", { name: MAP_LABEL });
    const links = within(map).getAllByRole("link");
    expect(links).toHaveLength(7);
    expect(container.querySelectorAll(".system-map__hit-target")).toHaveLength(
      7,
    );

    for (const world of worlds) {
      const link = links.find(
        (candidate) => candidate.getAttribute("href") === world.href,
      );
      expect(link, `falta el enlace a ${world.href}`).toBeDefined();
      // El rótulo visible es una palabra, pero el enlace lleva además el nombre
      // cósmico y el resumen en el documento: eso es lo que indexa Googlebot.
      // El título largo vive en la página del destino, no aquí.
      expect(link).toHaveTextContent(world.shortLabel);
      expect(link).toHaveTextContent(world.cosmicName);
      expect(link).toHaveTextContent(world.summary);
    }
  });

  it("cada destino se anuncia con su nombre cósmico y su función", () => {
    /*
      El nombre accesible pasó de «Desarrollo» a «Miller Desarrollo».

      La etiqueta visible ahora tiene dos líneas: el nombre del cuerpo manda y
      la función va debajo. Los dos entran en el nombre accesible, y eso es
      deliberado por dos motivos: es más informativo que cualquiera de los dos
      por separado, y cumple «Label in Name» (WCAG 2.5.3) — todo lo que se ve
      forma parte de lo que se anuncia.

      Lo que este test sigue vigilando es lo de antes: que el resumen NO se
      cuele en el nombre. Con él dentro, cada destino se anunciaba con una frase
      entera de más, que es justo el ruido del que la home se quitó de encima.
    */
    render(<SystemMap worlds={worlds} />);

    for (const world of worlds) {
      const esperado = new RegExp(
        "^" + world.cosmicName + " " + world.shortLabel + "$",
        "i",
      );
      const link = screen.getByRole("link", { name: esperado });
      expect(link).toHaveAttribute("href", world.href);
    }
  });

  it("el orden del DOM es el narrativo, no el espacial", () => {
    // Quien tabula recorre la historia de principio a fin; la posición la ponen
    // el CSS y, cuando existe, la escena. El orden es real aunque ya no se
    // imprima delante de cada destino.
    render(<SystemMap worlds={worlds} />);
    const map = screen.getByRole("navigation", { name: MAP_LABEL });
    const hrefs = within(map)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(worlds.map((world) => world.href));
  });

  it("cada destino lleva un proxy dedicado centrado en el radio de la escena", () => {
    // Es el contrato con G2: la escena NO crea nodos, solo escribe --map-x y
    // --map-y sobre estos. Si el atributo desapareciera, los cuerpos 3D
    // quedarían mudos y sin blanco de clic — y ningún test de la escena lo
    // notaría, porque la escena seguiría dibujando igual.
    const { container } = render(<SystemMap worlds={worlds} />);

    for (const world of worlds) {
      const proxy = container.querySelector<HTMLElement>(
        `[data-system-body="${world.id}"]`,
      );
      expect(
        proxy,
        `falta data-system-body="${world.id}"`,
      ).not.toBeNull();
      expect(proxy).toHaveClass("system-map__hit-target");
      expect(proxy).toHaveAttribute("data-hitbox-proxy", world.id);
      expect(proxy).toHaveAttribute("aria-hidden", "true");
      expect(proxy).toHaveAttribute("tabindex", "-1");

      const slot = proxy?.closest<HTMLElement>(".system-map__slot");
      const scale = Number(slot?.style.getPropertyValue("--hitbox-scale"));
      const fallbackRadius = Number.parseFloat(
        slot?.style.getPropertyValue("--map-fallback-radius") ?? "0",
      );
      expect(scale).toBeGreaterThanOrEqual(1.1);
      expect(scale).toBeLessThanOrEqual(1.35);
      expect(fallbackRadius).toBeGreaterThanOrEqual(22);
      expect(slot?.style.getPropertyValue("--hitbox-min")).toBe("44px");
      expect(slot?.querySelector(".system-map__body")).not.toContainElement(
        proxy,
      );
    }

    const slots = container.querySelectorAll<HTMLElement>(".system-map__slot");
    expect(slots).toHaveLength(7);
    // Sin escena, la posición la trae el servidor en % y el mapa funciona igual.
    for (const slot of slots) {
      expect(slot.style.getPropertyValue("--map-x")).toMatch(/%$/);
      expect(slot.style.getPropertyValue("--map-y")).toMatch(/%$/);
    }
  });

  it("todo el volumen conceptual —centro y cuatro bordes— adquiere target", () => {
    const { container } = render(<SystemMap worlds={worlds} />);
    const samplePoints = [
      { clientX: 50, clientY: 50 },
      { clientX: 0, clientY: 50 },
      { clientX: 100, clientY: 50 },
      { clientX: 50, clientY: 0 },
      { clientX: 50, clientY: 100 },
    ];

    for (const world of worlds) {
      const proxy = container.querySelector<HTMLElement>(
        `[data-hitbox-proxy="${world.id}"]`,
      );
      expect(proxy).not.toBeNull();

      for (const point of samplePoints) {
        fireEvent.pointerEnter(proxy as HTMLElement, point);
        expect(proxy).toHaveAttribute("data-target-state", "target");
        expect(container.querySelector(".hud__target")).toHaveTextContent(
          world.cosmicName,
        );
        fireEvent.pointerLeave(proxy as HTMLElement, point);
        expect(proxy).toHaveAttribute("data-target-state", "idle");
      }
    }
  });

  it("Gargantúa es el nodo central del sistema", () => {
    const { container } = render(<SystemMap worlds={worlds} />);
    const centres = container.querySelectorAll('[data-centre="true"]');
    expect(centres).toHaveLength(1);
    expect(centres[0].querySelector('[data-world="gargantua"]')).not.toBeNull();
  });

  it("hover despierta HUD, raíl y brackets sólo para el destino apuntado", () => {
    const { container } = render(<SystemMap worlds={worlds} />);
    const map = screen.getByRole("navigation", { name: MAP_LABEL });
    const endurance = within(map).getByRole("link", {
      name: /^Endurance Proyectos$/i,
    });

    fireEvent.pointerEnter(endurance);

    expect(endurance).toHaveAttribute("data-target-state", "target");
    const target = container.querySelector(".hud__target");
    expect(target).toHaveAttribute("data-target-state", "target");
    expect(target).toHaveTextContent(/Target lock/i);
    // Sin numeración: el NAV TARGET dice a dónde vas y para qué sirve, no en qué
    // posición de una lista está. El orden narrativo vive en el DOM, no pintado.
    expect(target).not.toHaveTextContent(/\d\d/);
    expect(target).toHaveTextContent(/Endurance/i);
    expect(target).toHaveTextContent(/Proyectos/i);
    expect(target).toHaveTextContent(/\[ Enter \]/i);

    const slot = container
      .querySelector('[data-system-body="endurance"]')
      ?.closest(".system-map__slot");
    expect(slot).toHaveAttribute("data-target-state", "target");
    expect(slot?.querySelector(".system-map__target-brackets")).not.toBeNull();

    const activeRailItems = container.querySelectorAll(
      '.nav-rail__item[data-target-state="target"]',
    );
    expect(activeRailItems).toHaveLength(1);

    fireEvent.pointerLeave(endurance);
    expect(endurance).toHaveAttribute("data-target-state", "idle");
    expect(target).toHaveAttribute("data-target-state", "idle");
  });

  it("focus de teclado produce el mismo TARGET sin depender de glow", () => {
    const { container } = render(<SystemMap worlds={worlds} />);
    const cooper = screen.getByRole("link", {
      name: /^Cooper Station Formación$/i,
    });

    fireEvent.focus(cooper);

    expect(cooper).toHaveAttribute("data-active", "true");
    expect(cooper).toHaveAttribute("data-target-state", "target");
    expect(container.querySelector(".hud__target")).toHaveTextContent(
      /Cooper Station/i,
    );
    expect(
      container.querySelector(
        '[data-system-body="cooper-station"][data-target-state="target"]',
      ),
    ).not.toBeNull();

    fireEvent.blur(cooper);
    expect(cooper).not.toHaveAttribute("data-active");
    expect(cooper).toHaveAttribute("data-target-state", "idle");
  });

  it("clic principal bloquea el destino y navega por la abstracción", () => {
    const { container } = render(<SystemMap worlds={worlds} />);
    const endurance = screen.getByRole("link", {
      name: /^Endurance Proyectos$/i,
    });

    fireEvent.click(endurance, { button: 0 });

    expect(routerPush).toHaveBeenCalledTimes(1);
    expect(routerPush).toHaveBeenCalledWith("/es/proyectos");
    expect(endurance).toHaveAttribute("data-target-state", "locked");
    const target = container.querySelector(".hud__target");
    expect(target).toHaveAttribute("data-target-state", "locked");
    expect(target).toHaveTextContent(/Destination locked/i);
    expect(target).not.toHaveTextContent(/\[ Enter \]/i);
  });

  it("un clic modificado conserva el comportamiento nativo del enlace", () => {
    const { container } = render(<SystemMap worlds={worlds} />);
    const endurance = screen.getByRole("link", {
      name: /^Endurance Proyectos$/i,
    });

    // El listener de document corre después del handler React delegado: deja
    // que la implementación vea el Ctrl-clic intacto, pero evita que JSDOM
    // intente abrir otra página una vez comprobado el contrato.
    document.addEventListener("click", (event) => event.preventDefault(), {
      once: true,
    });
    fireEvent.click(endurance, { button: 0, ctrlKey: true });

    expect(routerPush).not.toHaveBeenCalled();
    expect(endurance).toHaveAttribute("href", "/es/proyectos");
    expect(endurance).toHaveAttribute("data-target-state", "idle");
    expect(container.querySelector(".hud__target")).toHaveAttribute(
      "data-target-state",
      "idle",
    );
  });

  it("el proxy visual comparte lock y respeta clicks modificados", () => {
    const { container } = render(<SystemMap worlds={worlds} />);
    const cooperProxy = container.querySelector<HTMLElement>(
      '[data-hitbox-proxy="cooper-station"]',
    );
    expect(cooperProxy).not.toBeNull();

    document.addEventListener("click", (event) => event.preventDefault(), {
      once: true,
    });
    fireEvent.click(cooperProxy as HTMLElement, { button: 0, metaKey: true });
    expect(routerPush).not.toHaveBeenCalled();
    expect(cooperProxy).toHaveAttribute("data-target-state", "idle");

    fireEvent.click(cooperProxy as HTMLElement, { button: 0 });
    expect(routerPush).toHaveBeenCalledWith("/es/formacion");
    expect(cooperProxy).toHaveAttribute("data-target-state", "locked");
    expect(container.querySelector(".hud__target")).toHaveTextContent(
      /Destination locked/i,
    );
  });
});
