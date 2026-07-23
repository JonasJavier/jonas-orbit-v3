import { describe, expect, it } from "vitest";
import { WORLD_IDS, worldsData } from "./worlds.data";

describe("worlds.data (estructura canónica)", () => {
  it("define exactamente 7 mundos, todos con datos estructurales", () => {
    expect(WORLD_IDS).toHaveLength(7);
    for (const id of WORLD_IDS) {
      expect(worldsData[id]).toBeDefined();
    }
  });

  it("los ids son únicos", () => {
    expect(new Set(WORLD_IDS).size).toBe(WORLD_IDS.length);
  });

  it("el orden narrativo es 1..7 sin repetir", () => {
    const orders = WORLD_IDS.map((id) => worldsData[id].order).sort(
      (a, b) => a - b,
    );
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("los colores son hex válidos", () => {
    const hex = /^#[0-9a-f]{6}$/i;
    for (const id of WORLD_IDS) {
      expect(worldsData[id].accent).toMatch(hex);
      expect(worldsData[id].secondary).toMatch(hex);
    }
  });

  it("las órbitas tienen dimensiones positivas", () => {
    for (const id of WORLD_IDS) {
      const { orbit } = worldsData[id];
      expect(orbit.size).toBeGreaterThan(0);
      expect(orbit.duration).toBeGreaterThan(0);
      expect(orbit.planetSize).toBeGreaterThan(0);
    }
  });
});
