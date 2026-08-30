import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/*
  El raíl navega a través de `useWorldNavigation`, la costura que aísla al Hero
  de CÓMO se viaja a un mundo (hoy rutas, mañana scroll). Eso arrastra
  `useRouter`, que no existe fuera del App Router: aquí se sustituye por un
  doble. Lo que este archivo comprueba es el contrato del MARCADO, no el viaje.
*/
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
import { getWorldNavItems } from "@/lib/worlds";
import { SystemMap } from "./system-map";

const worlds = getWorldNavItems("es");
const MAP_LABEL = "Destinos del Sistema Gargantúa";

describe("SystemMap — el contrato entre el HTML y la escena", () => {
  it("sirve los 7 destinos como enlaces reales", () => {
    render(<SystemMap worlds={worlds} />);

    const map = screen.getByRole("navigation", { name: MAP_LABEL });
    const links = within(map).getAllByRole("link");
    expect(links).toHaveLength(7);

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
    // Quien tabula recorre la historia 01→07; la posición la ponen el CSS y,
    // cuando existe, la escena.
    render(<SystemMap worlds={worlds} />);
    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(worlds.map((world) => world.href));
  });

  it("cada nodo lleva el gancho que la escena reposiciona", () => {
    // Es el contrato con G2: la escena NO crea nodos, solo escribe --map-x y
    // --map-y sobre estos. Si el atributo desapareciera, los cuerpos 3D
    // quedarían mudos y sin blanco de clic — y ningún test de la escena lo
    // notaría, porque la escena seguiría dibujando igual.
    const { container } = render(<SystemMap worlds={worlds} />);

    for (const world of worlds) {
      expect(
        container.querySelector(`[data-system-body="${world.id}"]`),
        `falta data-system-body="${world.id}"`,
      ).not.toBeNull();
    }

    const slots = container.querySelectorAll<HTMLElement>(".system-map__slot");
    expect(slots).toHaveLength(7);
    // Sin escena, la posición la trae el servidor en % y el mapa funciona igual.
    for (const slot of slots) {
      expect(slot.style.getPropertyValue("--map-x")).toMatch(/%$/);
      expect(slot.style.getPropertyValue("--map-y")).toMatch(/%$/);
    }
  });

  it("Gargantúa es el nodo central del sistema", () => {
    const { container } = render(<SystemMap worlds={worlds} />);
    const centres = container.querySelectorAll('[data-centre="true"]');
    expect(centres).toHaveLength(1);
    expect(centres[0].querySelector('[data-world="gargantua"]')).not.toBeNull();
  });
});
