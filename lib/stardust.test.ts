import { describe, expect, it } from "vitest";
import {
  createStardustPool,
  spawnStardust,
  STARDUST_MAX_LIFETIME_MS,
  STARDUST_MIN_LIFETIME_MS,
  updateStardust,
} from "./stardust";

function fixedRandom(value: number) {
  return () => value;
}

describe("stardust pool", () => {
  it("preasigna buffers tipados y nunca supera su capacidad", () => {
    const pool = createStardustPool(8);

    expect(pool.x).toBeInstanceOf(Float32Array);
    expect(pool.active).toBeInstanceOf(Uint8Array);
    for (let index = 0; index < 12; index += 1) {
      spawnStardust(pool, 100, 100, 1.5, 0, fixedRandom(0.4));
    }

    expect(pool.capacity).toBe(8);
    expect(pool.activeCount).toBe(8);
    expect(pool.x).toHaveLength(8);
  });

  it("responde a velocidad con 1–5 partículas y un techo explícito", () => {
    const pool = createStardustPool(20);

    expect(spawnStardust(pool, 0, 0, 0.01, 0, fixedRandom(0.5))).toBe(0);
    expect(spawnStardust(pool, 0, 0, 0.03, 0, fixedRandom(0.5))).toBe(1);
    expect(spawnStardust(pool, 0, 0, 20, 0, fixedRandom(0.5))).toBe(5);
  });

  it("mantiene vidas entre 320 y 680 ms y libera todo el pool", () => {
    const pool = createStardustPool(12);
    spawnStardust(pool, 20, 20, 1, 0, fixedRandom(0.35));

    for (let index = 0; index < pool.capacity; index += 1) {
      if (!pool.active[index]) continue;
      expect(pool.lifetime[index]).toBeGreaterThanOrEqual(
        STARDUST_MIN_LIFETIME_MS,
      );
      expect(pool.lifetime[index]).toBeLessThanOrEqual(
        STARDUST_MAX_LIFETIME_MS,
      );
    }

    expect(updateStardust(pool, STARDUST_MAX_LIFETIME_MS + 1)).toBe(0);
  });
});
