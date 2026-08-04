import { describe, expect, it } from "vitest";
import { createStarPoints } from "./starfield";

describe("starfield 2D diferido", () => {
  it("genera el mismo cielo para el mismo viewport", () => {
    expect(createStarPoints(1_440, 900)).toEqual(
      createStarPoints(1_440, 900),
    );
  });

  it("mantiene una densidad acotada desde móvil hasta escritorio", () => {
    expect(createStarPoints(320, 568)).toHaveLength(72);
    expect(createStarPoints(2_560, 1_440)).toHaveLength(190);
  });
});
