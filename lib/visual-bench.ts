/**
 * Banco de pruebas visual: apagar el bloom y los emisivos para juzgar material.
 *
 * ── Qué problema resuelve ───────────────────────────────────────────────────
 *
 * Un objeto puede parecer resuelto y no estarlo. El bloom reparte luz sobre el
 * cielo negro y rellena los huecos de una silueta floja; un canal emisivo
 * dibuja aristas que la geometría no está sosteniendo por sí sola. Con las dos
 * cosas encendidas es imposible saber si lo que se ve es un cuerpo bien
 * construido o un halo tapando un cuerpo que no lo está.
 *
 * La regla del contrato visual —`docs/design/world-visual-language.md`— dice
 * que un cuerpo que pierde su identidad al apagar el glow todavía no está
 * terminado. Esto es lo que permite comprobarlo.
 *
 * ── Por qué NO es «sniffing del auditor» (regla nº5 del repo) ───────────────
 *
 * No se inspecciona nada del entorno: ni user agent, ni tamaño de ventana, ni
 * señales de un headless. Es un valor que hay que ESCRIBIR a mano en el
 * almacenamiento local, igual que `?no3d=1` es un parámetro que hay que
 * escribir en la URL. No se activa solo, no cambia nada para quien visita el
 * sitio y no existe ninguna condición bajo la cual una auditoría lo encienda.
 * Lo usa `tools/shot.mjs`, y ése es todo su alcance.
 *
 * Vive en `lib/` y es puro para poder cubrirlo con Vitest sin DOM: el parser es
 * la parte con casos raros —JSON roto, números fuera de rango, `null`— y es
 * justo la que no puede fallar abierta y dejar la producción sin bloom.
 */

const STORAGE_KEY = "jonas-orbit:banco-visual";

export interface VisualBench {
  /** Multiplicador de la fuerza del bloom. 1 es producción. */
  bloom: number;
  /** Multiplicador de lo que emite luz propia en los cuerpos. 1 es producción. */
  emission: number;
}

/** Lo que ve todo el mundo salvo quien escriba la clave a mano. */
export const FULL_VISUAL_BENCH: VisualBench = { bloom: 1, emission: 1 };

function factor(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(1, Math.max(0, value));
}

/**
 * Parser del valor almacenado.
 *
 * Falla CERRADO hacia producción: cualquier cosa que no sea un objeto con
 * números en rango devuelve el banco completo. Un JSON a medio escribir no
 * puede dejar el sitio real sin bloom.
 */
export function parseVisualBench(raw: string | null): VisualBench {
  if (!raw) return FULL_VISUAL_BENCH;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return FULL_VISUAL_BENCH;
  }
  if (typeof parsed !== "object" || parsed === null) return FULL_VISUAL_BENCH;

  const source = parsed as Record<string, unknown>;
  return {
    bloom: factor(source.bloom) ?? FULL_VISUAL_BENCH.bloom,
    emission: factor(source.emision) ?? FULL_VISUAL_BENCH.emission,
  };
}

/** Lectura única al montar la escena. No se observa: el banco no es reactivo. */
export function readVisualBench(): VisualBench {
  if (typeof window === "undefined") return FULL_VISUAL_BENCH;
  try {
    return parseVisualBench(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // Almacenamiento bloqueado (Safari privado y compañía): producción.
    return FULL_VISUAL_BENCH;
  }
}
