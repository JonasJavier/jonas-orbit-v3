import { describe, expect, it } from "vitest";
import { MOSAIC_SCALES, mosaicRows, type MosaicScale } from "./mosaic-rows";

const scale = (over: Partial<MosaicScale> = {}): MosaicScale => ({ key: "t", target: 4, maxPerRow: 5, maxRatio: 5.6, minSolo: 2.4, ...over });
/** Las filas que salen de una lista de cortes. */
const rowsOf = (ratios: number[], cuts: number[]) => {
  const edges = [0, ...cuts, ratios.length];
  return edges.slice(0, -1).map((start, index) => ratios.slice(start, edges[index + 1]));
};

describe("mosaicRows", () => {
  it("no corta lo que ya es una fila", () => {
    expect(mosaicRows([], scale())).toEqual([]);
    expect(mosaicRows([0.75], scale())).toEqual([]);
    expect(mosaicRows([1.5, 1.5, 1], scale())).toEqual([]);
  });

  it("conserva el orden de la curaduría y reparte todas las obras", () => {
    const ratios = [1.33, 0.75, 1.33, 0.56, 1.78, 0.75, 1.33, 1.33, 0.63, 1.5, 0.75, 1.33];
    const cuts = mosaicRows(ratios, scale());
    expect(cuts).toEqual([...cuts].sort((a, b) => a - b));
    expect(new Set(cuts).size).toBe(cuts.length);
    expect(cuts.every((cut) => cut > 0 && cut < ratios.length)).toBe(true);
    expect(rowsOf(ratios, cuts).flat()).toEqual(ratios);
  });

  it("deja cada fila cerca del objetivo, incluida la última: no hay resto", () => {
    const ratios = Array.from({ length: 17 }, (_, index) => (index % 3 === 0 ? 0.75 : 1.33));
    const sums = rowsOf(ratios, mosaicRows(ratios, scale())).map((row) => row.reduce((total, r) => total + r, 0));
    for (const sum of sums) expect(Math.abs(sum - 4)).toBeLessThan(1.1);
  });

  it("respeta el tope de obras por fila", () => {
    const ratios = Array.from({ length: 12 }, () => 0.56);
    const rows = rowsOf(ratios, mosaicRows(ratios, scale({ maxPerRow: 3 })));
    for (const row of rows) expect(row.length).toBeLessThanOrEqual(3);
  });

  it("no achata una fila ni deja sola a una obra estrecha", () => {
    const phone = scale({ target: 1.25, maxPerRow: 2, maxRatio: 1.75, minSolo: 0.5 });
    // Una panorámica junto a un cartel vertical mide 1.90: por encima del tope,
    // así que cada una va en su fila en vez de dejar el cartel en una astilla.
    expect(rowsOf([1.34, 0.56], mosaicRows([1.34, 0.56], phone))).toEqual([[1.34], [0.56]]);
    // Y dos carteles siguen yendo juntos, que es lo que los mantiene anchos.
    expect(rowsOf([0.56, 0.56], mosaicRows([0.56, 0.56], phone))).toEqual([[0.56, 0.56]]);
    const tall = scale({ target: 4, maxPerRow: 5, maxRatio: 5.6, minSolo: 2.4 });
    for (const row of rowsOf([0.56, 1.33, 1.33, 1.33, 0.56], mosaicRows([0.56, 1.33, 1.33, 1.33, 0.56], tall))) expect(row.length).toBeGreaterThan(1);
  });

  it("las cinco bandas van de más ancha a más estrecha", () => {
    const keys = MOSAIC_SCALES.map((item) => item.key);
    expect(keys).toEqual(["xl", "lg", "md", "sm", "xs"]);
    for (let index = 1; index < MOSAIC_SCALES.length; index += 1) {
      expect(MOSAIC_SCALES[index].target).toBeLessThan(MOSAIC_SCALES[index - 1].target);
      expect(MOSAIC_SCALES[index].maxPerRow).toBeLessThanOrEqual(MOSAIC_SCALES[index - 1].maxPerRow);
      expect(MOSAIC_SCALES[index].maxRatio).toBeGreaterThan(MOSAIC_SCALES[index].target);
    }
  });
});
