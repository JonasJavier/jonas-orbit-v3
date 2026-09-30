/**
 * Resolución adaptable del nivel `orbit` en pantallas táctiles.
 *
 * El teléfono dibujaba la escena a 1 píxel por punto CSS sobre pantallas de
 * 2,6-3: el navegador la estiraba casi el triple y Gargantúa, Miller y la
 * Endurance se veían blandos (Jonás, 2026-09-29). Subirla a ciegas no vale: el
 * raymarch cuesta por píxel y un teléfono modesto que va justo a 1,0 se
 * atascaría.
 *
 * Así que se PRUEBA: arranca en 1,0, que es lo que ya iba, y sube un escalón
 * cada vez que una ventana de fotogramas llega holgada a la frecuencia de la
 * pantalla. Si una ventana va lenta, baja un escalón y ese techo queda
 * cerrado para el resto de la visita: sin vaivén, que cada cambio de
 * resolución reinicia la acumulación y se ve como un parpadeo de grano.
 *
 * El reloj es el intervalo entre `requestAnimationFrame` consecutivos, no un
 * temporizador de GPU (casi ningún móvil expone `EXT_disjoint_timer_query`).
 * Por eso sólo se sabe que hay margen cuando se llega a la frecuencia de
 * refresco; por encima de ella la única forma de saberlo es probar.
 *
 * «Holgada» es relativo al propio teléfono, no a 60 fps: la vara es el ritmo
 * más rápido que ha sostenido en la visita (`pace`). Con una vara fija de
 * 18,5 ms, un teléfono de 90-120 Hz que ya iba a la mitad de su pantalla
 * contaba como holgado y subía hasta 1,75 con la GPU al límite: los toques
 * tardaban en entrar (Jonás, 2026-09-29). Ahora un escalón que no sostiene
 * ese ritmo se deshace y queda cerrado, y el techo es 1,5.
 */

/** Escalones de densidad que se prueban, del conocido al más fino. */
const TOUCH_DPR_STEPS = [1, 1.25, 1.5] as const;

/** Fotogramas por ventana de medida: ~0,75 s a 60 Hz. */
export const WINDOW_FRAMES = 45;
/** Fotogramas que se descartan tras arrancar o cambiar de resolución. */
export const SETTLE_FRAMES = 30;
/** Percentil 75 por debajo del cual la ventana va holgada (≥ ~54 fps). */
const FAST_MS = 18.5;
/** Percentil 75 por encima del cual va lenta (≤ ~38 fps). */
const SLOW_MS = 26;
/** Cuánto puede alejarse una ventana del mejor ritmo y seguir contando como
 * sostenido: a 120 Hz, 8,3 → 9,6 ms; a 60 Hz, 16,7 → 19,2 ms. */
const PACE_TOLERANCE = 1.15;
/** Un hueco así no es un fotograma lento: es una pestaña en pausa o un GC. */
const GAP_MS = 250;

interface ResolutionGovernor {
  /** Densidad de píxeles que debe usar la escena ahora. */
  readonly dpr: number;
  /**
   * Un fotograma dibujado en condiciones medibles. Devuelve `true` si la
   * densidad cambió y la escena tiene que redimensionar sus búferes.
   */
  sample(timestamp: number): boolean;
  /** Algo interrumpió la serie (pausa, travesía, pose congelada). */
  interrupt(): void;
}

/**
 * @param deviceRatio `window.devicePixelRatio`: ningún escalón lo supera, que
 * dibujar más píxeles de los que tiene la pantalla es gasto sin ganancia.
 */
export function createResolutionGovernor(deviceRatio: number): ResolutionGovernor {
  const steps = TOUCH_DPR_STEPS.filter(
    (step, index) => index === 0 || step <= deviceRatio + 1e-3,
  );
  let index = 0;
  let ceiling = steps.length - 1;
  let settle = SETTLE_FRAMES;
  /** El ritmo más rápido sostenido en la visita: la vara de «holgada». */
  let pace = Number.POSITIVE_INFINITY;
  let last: number | null = null;
  const intervals: number[] = [];

  function restart() {
    last = null;
    settle = SETTLE_FRAMES;
    intervals.length = 0;
  }

  return {
    get dpr() {
      return steps[index];
    },
    interrupt: restart,
    sample(timestamp) {
      const previous = last;
      last = timestamp;
      if (previous === null) return false;
      const interval = timestamp - previous;
      if (interval <= 0 || interval > GAP_MS) {
        restart();
        last = timestamp;
        return false;
      }
      if (settle > 0) {
        settle -= 1;
        return false;
      }
      intervals.push(interval);
      if (intervals.length < WINDOW_FRAMES) return false;

      const sorted = [...intervals].sort((a, b) => a - b);
      const p75 = sorted[Math.floor(sorted.length * 0.75)];
      intervals.length = 0;
      pace = Math.min(pace, p75);
      const held = p75 <= pace * PACE_TOLERANCE;

      if (index > 0 && (p75 >= SLOW_MS || !held)) {
        index -= 1;
        ceiling = index;
        restart();
        return true;
      }
      if (held && p75 <= FAST_MS && index < ceiling) {
        index += 1;
        restart();
        return true;
      }
      return false;
    },
  };
}
