import { describe, expect, it } from "vitest";
import { worldsPrefetchReady } from "./world-prefetch";

describe("worldsPrefetchReady (los destinos no se precargan al abrir la página)", () => {
  it("espera mientras la escena se construye y el plazo no ha vencido", () => {
    expect(worldsPrefetchReady({ sceneLive: false, graceOver: false })).toBe(false);
  });

  it("precarga en cuanto la escena dibuja: el cable queda libre", () => {
    expect(worldsPrefetchReady({ sceneLive: true, graceOver: false })).toBe(true);
  });

  it("pasado el plazo de gracia precarga igual, con o sin escena", () => {
    expect(worldsPrefetchReady({ sceneLive: false, graceOver: true })).toBe(true);
    expect(worldsPrefetchReady({ sceneLive: true, graceOver: true })).toBe(true);
  });
});
