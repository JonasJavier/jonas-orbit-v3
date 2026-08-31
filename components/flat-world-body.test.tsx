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

    expect(container.querySelectorAll('[data-flat-part="module"]')).toHaveLength(
      12,
    );
    expect(container.querySelectorAll('[data-flat-part="spoke"]')).toHaveLength(
      1,
    );
    expect(container.querySelector('[data-flat-part="docked-craft"]')).not.toBeNull();
    expect(container.querySelector('[data-flat-part="engine-bank"]')).not.toBeNull();
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
