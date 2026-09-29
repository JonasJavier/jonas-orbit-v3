import { describe, expect, it } from "vitest";
import {
  createResolutionGovernor,
  SETTLE_FRAMES,
  WINDOW_FRAMES,
} from "./resolution-governor";

/** Alimenta una ventana completa (asentado incluido) a intervalo fijo. */
function run(
  governor: ReturnType<typeof createResolutionGovernor>,
  intervalMs: number,
  start = 0,
): { changed: boolean; end: number } {
  let t = start;
  let changed = false;
  for (let i = 0; i <= SETTLE_FRAMES + WINDOW_FRAMES; i += 1) {
    if (governor.sample(t)) changed = true;
    t += intervalMs;
  }
  return { changed, end: t };
}

describe("resolución adaptable en táctil", () => {
  it("arranca en 1 píxel por punto, lo que ya iba", () => {
    expect(createResolutionGovernor(3).dpr).toBe(1);
  });

  it("sube un escalón por cada ventana holgada hasta el techo", () => {
    const governor = createResolutionGovernor(3);
    let t = 0;
    const seen: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      t = run(governor, 1000 / 60, t).end;
      seen.push(governor.dpr);
    }
    expect(seen).toEqual([1.25, 1.5, 1.75, 1.75, 1.75]);
  });

  it("nunca pasa de la densidad real de la pantalla", () => {
    const governor = createResolutionGovernor(1.5);
    let t = 0;
    for (let i = 0; i < 5; i += 1) t = run(governor, 1000 / 60, t).end;
    expect(governor.dpr).toBe(1.5);
  });

  it("una pantalla de densidad 1 se queda en 1", () => {
    const governor = createResolutionGovernor(1);
    expect(run(governor, 1000 / 60).changed).toBe(false);
    expect(governor.dpr).toBe(1);
  });

  it("si una ventana va lenta baja y ese techo queda cerrado", () => {
    const governor = createResolutionGovernor(3);
    let t = run(governor, 1000 / 60).end;
    t = run(governor, 1000 / 60, t).end;
    expect(governor.dpr).toBe(1.5);

    t = run(governor, 1000 / 30, t).end;
    expect(governor.dpr).toBe(1.25);

    // Aunque vuelva a ir holgado, no reintenta el escalón que falló.
    for (let i = 0; i < 4; i += 1) t = run(governor, 1000 / 60, t).end;
    expect(governor.dpr).toBe(1.25);
  });

  it("entre las dos marcas se queda donde está", () => {
    const governor = createResolutionGovernor(3);
    expect(run(governor, 22).changed).toBe(false);
    expect(governor.dpr).toBe(1);
  });

  it("una pausa no cuenta como fotograma lento", () => {
    const governor = createResolutionGovernor(3);
    let t = run(governor, 1000 / 60).end;
    expect(governor.dpr).toBe(1.25);
    // Pestaña oculta: el siguiente fotograma llega dos segundos después.
    governor.sample(t + 2000);
    t = run(governor, 1000 / 60, t + 2000).end;
    expect(governor.dpr).toBe(1.5);
  });

  it("interrumpir descarta la ventana a medias", () => {
    const governor = createResolutionGovernor(3);
    let t = 0;
    for (let i = 0; i < SETTLE_FRAMES + WINDOW_FRAMES - 5; i += 1) {
      governor.sample(t);
      t += 1000 / 60;
    }
    governor.interrupt();
    for (let i = 0; i < 10; i += 1) {
      expect(governor.sample(t)).toBe(false);
      t += 1000 / 60;
    }
    expect(governor.dpr).toBe(1);
  });
});
