import { describe, expect, it } from "vitest";
import { createStarPoints } from "./starfield";

describe("starfield 2D por capas", () => {
  it("genera el mismo cielo para el mismo viewport", () => {
    expect(createStarPoints(1_440, 900)).toEqual(
      createStarPoints(1_440, 900),
    );
  });

  it("aumenta mucho la densidad sin convertir polvo cercano en nieve", () => {
    const desktop = createStarPoints(1_440, 900);
    const far = desktop.filter((star) => star.layer === "far");
    const mid = desktop.filter((star) => star.layer === "mid");
    const near = desktop.filter((star) => star.layer === "near");

    expect(desktop).toHaveLength(2_044);
    expect(far).toHaveLength(1_662);
    expect(mid).toHaveLength(332);
    expect(near).toHaveLength(50);
    expect(far.length).toBeGreaterThan(mid.length * 4);
    expect(near.length).toBeLessThan(far.length / 25);
  });

  it("mantiene presupuestos acotados desde móvil hasta escritorio grande", () => {
    expect(createStarPoints(320, 568)).toHaveLength(808);
    expect(createStarPoints(2_560, 1_440)).toHaveLength(3_186);
  });

  it("mantiene FAR diminuto/estático y limita los puntos grandes a NEAR", () => {
    const stars = createStarPoints(1_440, 900);
    const far = stars.filter((star) => star.layer === "far");
    const near = stars.filter((star) => star.layer === "near");

    expect(far.every((star) => star.radius <= 0.52 && star.depth === 0)).toBe(
      true,
    );
    expect(near.every((star) => star.radius >= 0.72)).toBe(true);
  });

  it("reduce luminancia de estrellas detrás del disco de Gargantua", () => {
    const stars = createStarPoints(1_440, 900);
    const central = stars.filter((star) => star.occlusion === 0.24);
    const outer = stars.filter((star) => star.occlusion === 1);

    expect(central.length).toBeGreaterThan(0);
    expect(outer.length).toBeGreaterThan(central.length);
    expect(Math.max(...central.map((star) => star.occlusion))).toBeLessThan(
      Math.min(...outer.map((star) => star.occlusion)),
    );
  });
});
