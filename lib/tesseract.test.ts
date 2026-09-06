import { describe, expect, it } from "vitest";
import { sampleTesseract, TESSERACT_PATH } from "./tesseract";

describe("hipercubo que se dibuja", () => {
  it("recorre las 32 aristas sin saltos ni repeticiones, también al reiniciar", () => {
    expect(TESSERACT_PATH).toHaveLength(32);
    const unique = new Set<string>();
    const degrees = Array(16).fill(0);
    TESSERACT_PATH.forEach(([a, b], i) => {
      expect(TESSERACT_PATH[(i + 1) % 32][0]).toBe(b);
      const bit = a ^ b;
      expect(bit & (bit - 1)).toBe(0);
      expect(a).not.toBe(b);
      unique.add([a, b].sort((x, y) => x - y).join("/"));
      degrees[a]++; degrees[b]++;
    });
    expect(unique.size).toBe(32);
    expect(degrees.every((degree) => degree === 4)).toBe(true);
  });

  it("cambia las relaciones internas, conserva centro y volumen y no acumula error", () => {
    const points = new Float32Array(48);
    sampleTesseract(0, points);
    const distance = (a: number, b: number) => Math.hypot(...[0, 1, 2].map((axis) => points[a * 3 + axis] - points[b * 3 + axis]));
    const ratio = distance(0, 1) / distance(8, 9);
    sampleTesseract(6, points);
    expect(Math.abs(distance(0, 1) / distance(8, 9) - ratio)).toBeGreaterThan(0.1);
    const snapshot = points.slice();
    for (const seconds of [0, 6, 18, 60, 120, 3600, 21600]) {
      sampleTesseract(seconds, points);
      expect(Array.from(points).every(Number.isFinite)).toBe(true);
      for (let axis = 0; axis < 3; axis++) {
        let mean = 0;
        for (let i = 0; i < 16; i++) mean += points[i * 3 + axis] / 16;
        expect(Math.abs(mean)).toBeLessThan(0.000001);
      }
      const radii = Array.from({ length: 16 }, (_, i) => Math.hypot(points[i * 3], points[i * 3 + 1], points[i * 3 + 2]));
      expect(Math.max(...radii)).toBeCloseTo(1.5, 5);
    }
    sampleTesseract(6, points);
    expect(points).toEqual(snapshot);
  });
});
