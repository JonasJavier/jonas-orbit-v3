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
  /**
   * Reloj del raymarch clavado en un instante, en segundos. `null` es
   * producción: el reloj corre solo.
   *
   * Existe porque el disco de Gargantúa envejece — su enrollado depende del
   * tiempo transcurrido — y el defecto que eso produce tarda MINUTOS en
   * aparecer. Una suite que solo mira el primer cuadro no lo ve nunca: ese es
   * exactamente el agujero por el que se coló el enrollado infinito. Con el
   * reloj clavado, «cómo se ve Gargantúa a las seis horas» es una captura de
   * quince segundos en vez de una espera de seis horas.
   */
  clock: number | null;
  /**
   * Acumulación temporal del raymarch. `true` es producción.
   *
   * Apagarla separa lo que hace el shader en UN cuadro de lo que hace el
   * promediado de ocho muestras encima. Sin esa separación es imposible saber
   * si una banda del disco la dibuja el material o la deposita el acumulador.
   */
  accumulate: boolean;
  /**
   * Las tres capas de atmósfera del Observatorio. Las tres `true` es
   * producción.
   *
   * Existe por el mismo motivo que `bloom`: una atmósfera bien hecha es
   * INVISIBLE por definición —el encargo pedía «tan sutil que probablemente
   * sólo notes su ausencia al apagarlo»— y una cosa que sólo se nota al
   * quitarla no se puede juzgar sin poder quitarla.
   *
   * Y va capa a capa, no como un nivel de 0 a 3, porque la pregunta que se
   * hace sobre un fondo no es «cuánto» sino «cuál de las tres está haciendo el
   * trabajo»: el campo estelar, la variación del negro o las marcas del borde.
   */
  atmosphere: {
    stars: boolean;
    halo: boolean;
    marks: boolean;
  };
  /**
   * Modos de diagnóstico del disco de Gargantúa. Los tres `false` es
   * producción, y aquí la polaridad es la contraria a la de `atmosphere`:
   * un modo hay que ENCENDERLO con un `true` literal, porque cada uno quita
   * una parte de la imagen —no la deja sin halo, la deja sin color o sin
   * media óptica— y nadie puede caer en eso por un JSON a medias.
   *
   * Existen porque «los dos lados no están hechos del mismo material» no se
   * puede decidir sobre la imagen final: allí el beaming clipa un lado a
   * blanco y apaga el otro, y el ojo compara valor donde quería comparar
   * estructura. Con `density` el disco sale en gris de DENSIDAD —sin rampa
   * térmica, sin beaming, sin Doppler, sin perfil radial de energía—, y con
   * `direct` / `lensed` se aísla la imagen directa o la doblada por el
   * agujero, que es la otra pregunta: si un rasgo lo pone el material o lo
   * pone la geometría. Se combinan (`density` + `direct` es el material de
   * la imagen directa, a secas). Nacen en el pase de gramática común
   * (2026-09-20) y se leen en `uDiag`.
   */
  diagnostic: {
    density: boolean;
    direct: boolean;
    lensed: boolean;
  };
}

/** Lo que ve todo el mundo salvo quien escriba la clave a mano. */
export const FULL_VISUAL_BENCH: VisualBench = {
  bloom: 1,
  emission: 1,
  clock: null,
  accumulate: true,
  atmosphere: { stars: true, halo: true, marks: true },
  diagnostic: { density: false, direct: false, lensed: false },
};

function factor(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(1, Math.max(0, value));
}

/**
 * El reloj NO se clampa a [0, 1] como los factores: es un instante en segundos
 * y su rango útil llega a las seis horas. Solo se rechaza lo que no es un
 * número finito no negativo.
 */
function clock(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0) return null;
  return value;
}

/** Solo un `false` literal apaga la acumulación. Cualquier otra cosa: producción. */
function flag(value: unknown): boolean {
  return value === false ? false : true;
}

/**
 * Las tres capas de atmósfera, con la misma regla que `flag`: sólo un `false`
 * literal apaga una.
 *
 * Que el defecto sea «todas encendidas» no es comodidad, es la condición que
 * mantiene honesto al banco entero. Los factores se clampan a [0,1] con 1 =
 * producción, así que el banco sólo puede RESTAR y es matemáticamente incapaz
 * de halagar nada. Si aquí el defecto fuera «sin atmósfera», este campo pasaría
 * a ser el que ENCIENDE la versión bonita para la captura, y entonces las
 * capturas dejarían de ser evidencia de lo que recibe el visitante.
 */
function layers(value: unknown): VisualBench["atmosphere"] {
  if (typeof value !== "object" || value === null) {
    return FULL_VISUAL_BENCH.atmosphere;
  }
  const source = value as Record<string, unknown>;
  return {
    stars: flag(source.estrellas),
    halo: flag(source.halo),
    marks: flag(source.marcas),
  };
}

/** Sólo un `true` literal enciende un modo de diagnóstico. Lo demás: producción. */
function onlyTrue(value: unknown): boolean {
  return value === true;
}

/** Los tres modos, cada uno por su nombre; cualquier otra forma es producción. */
function diagnostic(value: unknown): VisualBench["diagnostic"] {
  if (typeof value !== "object" || value === null) {
    return FULL_VISUAL_BENCH.diagnostic;
  }
  const source = value as Record<string, unknown>;
  return {
    density: onlyTrue(source.densidad),
    direct: onlyTrue(source.directo),
    lensed: onlyTrue(source.lensado),
  };
}

/**
 * Los modos de diagnóstico, empaquetados para el uniforme `uDiag` del
 * raymarch: bit 1 densidad, bit 2 sólo directa, bit 4 sólo lensada. Un solo
 * float porque el fragmento los decodifica con `mod` —GLSL ES 1.0 no tiene
 * operadores de bits— y porque tres uniformes para un banco serían tres
 * sitios que mantener en dos escenas.
 */
export function diagnosticCode(bench: VisualBench): number {
  const { density, direct, lensed } = bench.diagnostic;
  return (density ? 1 : 0) + (direct ? 2 : 0) + (lensed ? 4 : 0);
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
    clock: clock(source.reloj),
    accumulate: flag(source.acumular),
    atmosphere: layers(source.atmosfera),
    diagnostic: diagnostic(source.diagnostico),
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
