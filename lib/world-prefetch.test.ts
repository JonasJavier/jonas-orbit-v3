import { describe, expect, it } from "vitest";
import { worldsPrefetchReady } from "./world-prefetch";

describe("worldsPrefetchReady (la home no precarga hasta que la escena dibuja)", () => {
  it("espera mientras la escena se decide o se construye", () => {
    expect(worldsPrefetchReady({ sceneLive: false, idle: false, level: undefined, graceOver: false })).toBe(false);
    expect(worldsPrefetchReady({ sceneLive: false, idle: true, level: undefined, graceOver: false })).toBe(false);
    expect(worldsPrefetchReady({ sceneLive: false, idle: true, level: "deep", graceOver: false })).toBe(false);
  });

  it("precarga en cuanto la escena dibuja, aunque la página no esté ociosa", () => {
    expect(worldsPrefetchReady({ sceneLive: true, idle: false, level: "deep", graceOver: false })).toBe(true);
  });

  it("sin escena que esperar basta el ocio tras la carga", () => {
    expect(worldsPrefetchReady({ sceneLive: false, idle: true, level: "flat", graceOver: false })).toBe(true);
    expect(worldsPrefetchReady({ sceneLive: false, idle: false, level: "flat", graceOver: false })).toBe(false);
  });

  it("pasado el plazo de gracia precarga igual: la travesía no espera a la red", () => {
    expect(worldsPrefetchReady({ sceneLive: false, idle: true, level: "deep", graceOver: true })).toBe(true);
  });
});
