import { describe, expect, it } from "vitest";
import { TESSERACT_PATH } from "./tesseract";
import {
  edgeAxis,
  nearestEdge,
  probeDepth,
  TESSERACT_AXES,
} from "./tesseract-probe";

/**
 * La sonda es geometría pura, así que se demuestra sin escena.
 *
 * Lo que se fija aquí es lo único que la hace publicable: que el eje que dice
 * una arista es una verdad del hipercubo y no una convención de nuestro modelo.
 */

describe("el eje de una arista", () => {
  it("las treinta y dos aristas del circuito corren por un eje real", () => {
    for (const [from, to] of TESSERACT_PATH) {
      const axis = edgeAxis(from, to);
      expect(axis, `${from}→${to}`).toBeGreaterThanOrEqual(0);
      expect(axis, `${from}→${to}`).toBeLessThan(TESSERACT_AXES);
    }
  });

  it("hay ocho aristas por eje, y ocho de ellas atraviesan W", () => {
    /*
      El reparto no se elige: un 4-cubo tiene 2³ aristas por cada uno de sus
      cuatro ejes. Que el circuito euleriano las recorra todas exactamente una
      vez es lo que hace que este conteo salga de los datos y no de una
      constante — y es lo que permite decirle al visitante «esta arista
      atraviesa la cuarta dimensión» sin estar inventando nada.
    */
    const perAxis = [0, 0, 0, 0];
    for (const [from, to] of TESSERACT_PATH) perAxis[edgeAxis(from, to)] += 1;
    expect(perAxis).toEqual([8, 8, 8, 8]);
  });

  it("rechaza un par que no es una arista", () => {
    // Difieren en dos bits: es una diagonal de cara, no una arista.
    expect(edgeAxis(0, 3)).toBe(-1);
    expect(edgeAxis(5, 5)).toBe(-1);
  });
});

describe("la sonda", () => {
  /** Los dieciséis vértices en un sitio conocido: una rejilla de 4 × 4. */
  function grid(): Float32Array {
    const points = new Float32Array(32);
    for (let vertex = 0; vertex < 16; vertex += 1) {
      points[vertex * 2] = (vertex % 4) * 100;
      points[vertex * 2 + 1] = Math.floor(vertex / 4) * 100;
    }
    return points;
  }

  it("encuentra la arista más cercana y dónde cae sobre ella", () => {
    const points = grid();
    const [from, to] = TESSERACT_PATH[0];
    const mid = {
      x: (points[from * 2] + points[to * 2]) / 2,
      y: (points[from * 2 + 1] + points[to * 2 + 1]) / 2,
    };
    const hit = nearestEdge(points, mid.x, mid.y, 40);
    expect(hit).not.toBeNull();
    expect(hit!.distance).toBeLessThan(1);
    // Puede haber otra arista que pase por el mismo punto de la rejilla; lo que
    // se comprueba es que la devuelta pasa de verdad por ahí.
    expect(hit!.t).toBeGreaterThan(0.001);
    expect(hit!.t).toBeLessThan(0.999);
  });

  it("señalar el vacío no devuelve nada", () => {
    /*
      La sonda tiene que poder fallar. Una que siempre acierta acaba
      respondiendo sobre una arista que el visitante no señaló, y entonces la
      lectura es tan falsa como si estuviera tecleada.
    */
    expect(nearestEdge(grid(), 5000, 5000, 40)).toBeNull();
  });

  it("clava el extremo cuando la arista se proyecta a un punto", () => {
    // Mirando a lo largo de una arista, sus dos extremos caen en el mismo píxel
    // y el parámetro deja de existir.
    const points = new Float32Array(32);
    const hit = nearestEdge(points, 0, 0, 10);
    expect(hit).not.toBeNull();
    expect(hit!.t).toBe(0);
  });

  it("la profundidad en W se interpola a lo largo de la arista", () => {
    const cells = new Float32Array(16);
    const [from, to] = TESSERACT_PATH[0];
    cells[from] = 0.2;
    cells[to] = 0.8;
    const base = { edge: 0, from, to, axis: 0, distance: 0 };
    expect(probeDepth(cells, { ...base, t: 0 })).toBeCloseTo(0.2, 6);
    expect(probeDepth(cells, { ...base, t: 1 })).toBeCloseTo(0.8, 6);
    expect(probeDepth(cells, { ...base, t: 0.5 })).toBeCloseTo(0.5, 6);
  });
});
