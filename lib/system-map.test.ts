import { describe, expect, it } from "vitest";
import { WORLD_IDS, worldsData } from "@/content/worlds.data";
import { MAP_RADIUS_X, MAP_RADIUS_Y, projectPlacement } from "./system-map";

/** El radio más lejano del sistema; normaliza la elipse del mapa plano. */
const MAX_ORBIT = Math.max(
  ...WORLD_IDS.map((id) => worldsData[id].placement.orbitRadius),
);

describe("projectPlacement (proyección del sistema)", () => {
  it("el centro del sistema cae en el centro del cuadro", () => {
    expect(
      projectPlacement({ orbitRadius: 0, phase: 0, inclination: 0, size: 1 }),
    ).toEqual({ x: 50, y: 50 });
  });

  it("achata el sistema: el eje vertical es menor que el horizontal", () => {
    // Es lo que hace que se lea como un disco visto de canto y no como un reloj.
    expect(MAP_RADIUS_Y).toBeLessThan(MAP_RADIUS_X);
  });

  it("la fase 0 apunta a la derecha y la 90 hacia abajo", () => {
    const right = projectPlacement({
      orbitRadius: MAX_ORBIT,
      phase: 0,
      inclination: 0,
      size: 1,
    });
    expect(right.x).toBeCloseTo(50 + MAP_RADIUS_X);
    expect(right.y).toBeCloseTo(50);

    const down = projectPlacement({
      orbitRadius: MAX_ORBIT,
      phase: 90,
      inclination: 0,
      size: 1,
    });
    expect(down.x).toBeCloseTo(50);
    expect(down.y).toBeCloseTo(50 + MAP_RADIUS_Y);
  });

  it("los 6 cuerpos caen dentro del cuadro", () => {
    // Un cuerpo proyectado fuera del 0-100 sería un destino recortado por el
    // borde del mapa: visible en el DOM, inalcanzable con el ratón.
    for (const id of WORLD_IDS) {
      const point = projectPlacement(worldsData[id].placement);
      expect(point.x).toBeGreaterThan(0);
      expect(point.x).toBeLessThan(100);
      expect(point.y).toBeGreaterThan(0);
      expect(point.y).toBeLessThan(100);
    }
  });

  it("no hay dos cuerpos proyectados al mismo punto", () => {
    const points = WORLD_IDS.map((id) => {
      const { x, y } = projectPlacement(worldsData[id].placement);
      return `${x.toFixed(1)}:${y.toFixed(1)}`;
    });
    expect(new Set(points).size).toBe(points.length);
  });
});
