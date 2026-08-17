import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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

  it("cada destino se anuncia con una sola palabra", () => {
    // Con la ficha contando dentro del nombre, un lector de pantalla anunciaba
    // cada destino con cuatro frases seguidas: justo el ruido que la home se
    // quitó de encima. El texto sigue en el documento para Googlebot.
    render(<SystemMap worlds={worlds} />);

    for (const world of worlds) {
      // Anclado a los extremos: `getByRole` normaliza el nombre, así que esto
      // exige que el nombre sea EXACTAMENTE el rótulo y nada más.
      const link = screen.getByRole("link", {
        name: new RegExp(`^${world.shortLabel}$`),
      });
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
