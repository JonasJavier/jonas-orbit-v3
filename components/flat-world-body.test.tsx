import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getWorldNavItems } from "@/lib/worlds";
import { FlatWorldBody } from "./flat-world-body";

const worlds = getWorldNavItems("es");

describe("FlatWorldBody", () => {
  it("dibuja los seis destinos periféricos y deja Gargantúa al backdrop", () => {
    for (const world of worlds) {
      const { container, unmount } = render(<FlatWorldBody world={world} />);
      const body = container.querySelector(`[data-flat-world="${world.id}"]`);

      if (world.id === "gargantua") {
        expect(body).toBeNull();
      } else {
        expect(body).not.toBeNull();
        expect(body).toHaveAttribute("aria-hidden", "true");
        expect(body?.querySelector("svg")).not.toBeNull();
        expect(body).toHaveStyle({
          "--flat-accent": world.accent,
          "--flat-secondary": world.secondary,
        });
      }

      unmount();
    }
  });

  it("mantiene la arquitectura legible de Endurance en el frame estático", () => {
    const endurance = worlds.find((world) => world.id === "endurance");
    expect(endurance).toBeDefined();

    const { container } = render(
      <FlatWorldBody world={endurance as NonNullable<typeof endurance>} />,
    );

    /*
      La misma arquitectura que el modelo 3D, y por el mismo motivo que allí:
      cuatro brazos, cuatro grupos de tres módulos —uno principal y dos
      satélites— y cuatro radiadores. En un equipo con movimiento reducido este
      dibujo es la ÚNICA Endurance que se ve; si divergiera del modelo, el
      mismo destino contaría dos cosas distintas según el equipo del visitante.
    */
    expect(container.querySelectorAll('[data-flat-part="module"]')).toHaveLength(
      12,
    );
    expect(
      container.querySelectorAll('[data-flat-module="primary"]'),
    ).toHaveLength(4);
    expect(container.querySelectorAll('[data-flat-part="arm"]')).toHaveLength(4);
    expect(
      container.querySelectorAll('[data-flat-part="radiator"]'),
    ).toHaveLength(4);
    expect(container.querySelector('[data-flat-part="docked-craft"]')).not.toBeNull();
    expect(container.querySelector('[data-flat-part="engine-bank"]')).not.toBeNull();
  });

  it("dibuja la Ranger con proa, cabina y toberas, no una mancha", () => {
    const ranger = worlds.find((world) => world.id === "ranger");
    expect(ranger).toBeDefined();

    const { container } = render(
      <FlatWorldBody world={ranger as NonNullable<typeof ranger>} />,
    );

    // Las cuatro piezas que la hacen reconocible como nave y no como icono.
    for (const part of ["fuselage", "cockpit", "wing", "engines"]) {
      expect(
        container.querySelector(`[data-flat-part="${part}"]`),
        part,
      ).not.toBeNull();
    }
  });

  it("es puramente decorativo y no introduce movimiento ni copy duplicado", () => {
    const { container } = render(
      <>
        {worlds.map((world) => (
          <FlatWorldBody key={world.id} world={world} />
        ))}
      </>,
    );

    expect(container.querySelector("animate, animateMotion, animateTransform")).toBeNull();
    expect(container.querySelectorAll("a, button")).toHaveLength(0);
    expect(container).toHaveTextContent("");
  });
});
