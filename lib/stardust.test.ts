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
      spawnStardust(pool, 100, 100, 1.5, 0, 16, fixedRandom(0.4));
    }

    expect(pool.capacity).toBe(8);
    expect(pool.activeCount).toBe(8);
    expect(pool.x).toHaveLength(8);
  });

  it("responde a la distancia recorrida con 1–14 motas y un techo explícito", () => {
    const pool = createStardustPool(30);

    // Puntero prácticamente quieto: no hay gesto que acompañar.
    expect(spawnStardust(pool, 0, 0, 0.01, 0, 16, fixedRandom(0.5))).toBe(0);
    // Movimiento mínimo: una mota, no un chorro.
    expect(spawnStardust(pool, 0, 0, 0.03, 0, 16, fixedRandom(0.5))).toBe(1);
    // Barrido violento: el techo, y el tramo sembrado se corta por su tope.
    expect(spawnStardust(pool, 0, 0, 20, 0, 16, fixedRandom(0.5))).toBe(14);
  });

  it("una pausa larga no dibuja una raya que el gesto nunca recorrió", () => {
    // Puntero que vuelve a la ventana tras dos segundos fuera: el tramo entre
    // muestras es enorme, pero lo que se siembra está acotado.
    const pool = createStardustPool(30);
    expect(spawnStardust(pool, 900, 400, 0.9, 0, 2_000, fixedRandom(0.5))).toBe(
      10,
    );

    let furthest = 900;
    for (let index = 0; index < pool.capacity; index += 1) {
      if (pool.active[index]) furthest = Math.min(furthest, pool.x[index]);
    }

    expect(900 - furthest).toBeLessThanOrEqual(64 * 0.9 + 6);
  });

  it("siembra la estela sobre el tramo ya recorrido, no en un punto", () => {
    // Emitir todas las motas en la posición actual deja huecos en cuanto el
    // puntero corre; lo que se comprueba aquí es que ocupan el tramo entero.
    const pool = createStardustPool(30);
    const count = spawnStardust(pool, 400, 200, 1.2, 0, 16, fixedRandom(0.5));
    expect(count).toBeGreaterThan(1);

    const xs: number[] = [];
    for (let index = 0; index < pool.capacity; index += 1) {
      if (pool.active[index]) xs.push(pool.x[index]);
    }

    expect(xs).toHaveLength(count);
    // Nada por delante del puntero, y el tramo de ~19 px queda cubierto.
    expect(Math.max(...xs)).toBeLessThanOrEqual(400);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(10);
  });

  it("mantiene las vidas dentro del rango declarado y libera todo el pool", () => {
    const pool = createStardustPool(12);
    spawnStardust(pool, 20, 20, 1, 0, 16, fixedRandom(0.35));

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
