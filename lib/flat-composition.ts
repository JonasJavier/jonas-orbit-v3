import type { WorldId } from "@/content/worlds.data";

/**
 * Art-directed atlas coordinates. `wide` y `short` van en % del viewport;
 * `portrait` va en % del ANCHO y del ESCENARIO (ver abajo).
 *
 * ── Por qué hay TRES formatos y no dos ──────────────────────────────────────
 *
 * `wide` servía a la vez a un escritorio de 1080 px de alto y a un móvil en
 * horizontal de 375, y esos dos no son el mismo encuadre: no cambia sólo la
 * proporción, cambia cuánto PESA el raíl dentro del cuadro. A 1080 el raíl
 * ocupa el 7 % del alto; a 375 ocupa el 19 %, y en un formato apaisado corto
 * llega a dos filas. Con una sola tabla, la Ranger —el cuerpo más bajo de la
 * composición— se metía debajo del raíl a 812×375 y lo rozaba por una décima
 * de píxel a 320×568. `e2e/atlas.spec.ts` lo comprueba en los seis formatos.
 *
 * La salida NO es comprimir la composición para que quepa en el peor caso: eso
 * amontona los cuerpos en el centro de las pantallas grandes, que son las que
 * ya funcionaban. Es la misma decisión que ya estaba tomada al separar
 * `portrait` de `wide`, aplicada una vez más.
 *
 * `short` es el apaisado corto —el móvil girado—, y su banda vertical útil son
 * unos 260 px entre el HUD y el raíl. Comparte las X de `wide`, porque a lo
 * ancho ese formato sobra; lo único que hace es subir la columna vertical para
 * que los cinco cuerpos y sus blancos de 44 px vivan dentro de la banda.
 *
 * ── `portrait` es de los DOS renderizadores (2026-09-28) ────────────────────
 *
 * En vertical el atlas plano y la escena 3D componían cada uno a su manera: el
 * plano con porcentajes del viewport, la escena con la elipse de escritorio
 * aplastada. Ninguno sabía que abajo hay un raíl de dos filas y arriba una
 * cabecera, así que la Ranger rozaba el raíl a 320 × 568, la escena dejaba
 * franjas muertas arriba y abajo, y al apagar el movimiento los cuerpos
 * saltaban de sitio. Ahora `portrait` es UNA tabla que leen los dos, y su Y no
 * es del viewport sino del escenario: el alto libre entre `--home-stage-top` y
 * `--home-stage-bottom` (system-map-atlas.css). Si el raíl crece, el sistema se
 * recompone dentro de lo que queda en vez de meterse debajo.
 */
const COMPOSITION = {
  tesseract: { wide: [59, 23], portrait: [72, 9], short: [59, 26] },
  miller: { wide: [29, 29], portrait: [26, 15], short: [29, 26] },
  endurance: { wide: [77, 60], portrait: [73, 73], short: [77, 55] },
  edmunds: { wide: [18, 66], portrait: [21, 70], short: [18, 62] },
  gargantua: { wide: [46, 49], portrait: [50, 42], short: [46, 47] },
  /* 78 → 70 en apaisado corto: es el cuerpo más bajo del atlas y el único que
     llegaba a tocar el raíl. */
  ranger: { wide: [43, 78], portrait: [42, 93], short: [43, 70] },
} as const satisfies Record<
  WorldId,
  {
    wide: readonly [number, number];
    portrait: readonly [number, number];
    short: readonly [number, number];
  }
>;

export function flatCompositionFor(id: WorldId) {
  const { wide, portrait, short } = COMPOSITION[id];
  return {
    wide: { x: wide[0], y: wide[1] },
    portrait: { x: portrait[0], y: portrait[1] },
    short: { x: short[0], y: short[1] },
  };
}
