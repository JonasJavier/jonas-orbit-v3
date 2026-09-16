import { worldsData, type WorldId } from "@/content/worlds.data";

/**
 * Los presets de observación del Observatorio, y la matemática que los convierte
 * en posiciones de mundo.
 *
 * > El Observatorio puede cambiar las condiciones de observación, pero no puede
 * > alterar la identidad material del objeto para hacerlo funcionar.
 * > — docs/design/tesseract-experimentos.md §6
 *
 * Este módulo es esa regla escrita como dato. Está aquí —fuera de la escena, sin
 * three.js, sin DOM— por el mismo motivo que `scene-poses.ts`: así se puede
 * DEMOSTRAR con un test unitario que ningún preset toca un parámetro de material
 * y que el ángulo de luz que promete cada uno es el que sale de la geometría.
 *
 * ── Por qué el espécimen NO va en el origen ─────────────────────────────────
 *
 * El acoplamiento que decide todo este módulo no es un uniform, es una línea de
 * shader. No existe dirección de luz configurable: la luz ES el origen del
 * mundo.
 *
 *     vec3 toLight = normalize(-vPositionW);   // bodies.ts, fragment
 *     vec3 toLightW = normalize(-world.xyz);   // bodies.ts, vertex
 *
 * Consecuencia dura y nada obvia: un cuerpo centrado en el origen queda A
 * OSCURAS. Para una esfera en el origen, `toLight = -normal` y `ndl = -1` en
 * todo el disco. `uLightIntensity` no lo arregla — multiplica una clave que no
 * llega.
 *
 * Así que el espécimen se coloca A DISTANCIA del origen, y **la dirección en la
 * que se coloca es el ángulo de luz**. Eso es exactamente lo que el §6 pide sin
 * gastar ni un uniform ni una línea de shader: no se añade una lámpara, se
 * elige dónde sentarse respecto de la única que hay. El espécimen aparece
 * centrado EN PANTALLA porque lo encuadra la cámara, no porque esté en el
 * origen del mundo.
 *
 * La alternativa «limpia» —añadir un uniform de dirección al fragment
 * compartido— es la cara: ese shader lo comparten los cinco cuerpos del System
 * Map y habría que demostrar que el valor por defecto reproduce `-vPositionW`
 * bit a bit. No se hace.
 */

/** Un punto o una dirección en el mundo. Tupla y no `THREE.Vector3` a propósito:
 *  este módulo no conoce three.js y así el test no necesita una escena. */
export type Vec3 = readonly [number, number, number];

/**
 * Los instrumentos de `INSPECCIONAR` que tienen sentido sobre un espécimen.
 *
 * `ESTRUCTURA` (alambre / normales) NO está aquí: sale de la V1 como deuda
 * V1.1 porque es el único que exige construir un sistema entero desde cero.
 */
export type ObservationInstrument = "bloom" | "material" | "datos";

export interface ObservationPreset {
  /**
   * Ángulo entre la luz y la mirada, en grados, medido EN EL ESPÉCIMEN.
   *
   * 0° = la luz llega por detrás de la cámara (frontal, plana).
   * 90° = luz lateral: el terminador cruza el centro.
   * 180° = contraluz: el espécimen se recorta contra su propio filo.
   *
   * No es gusto: es qué revela cada material. Ver la tabla de abajo.
   */
  keyAngle: number;
  /**
   * Dónde cae la luz alrededor del eje de mirada, en grados.
   * 0° la sitúa a la derecha del cuadro; 90°, por encima.
   */
  keyRoll: number;
  /**
   * Ambiente de campo estelar, 0-1. Es AMBIENTE, no un *fill*: no tiene
   * dirección y no puede levantar el terminador.
   *
   * Existe porque la cara noche funciona en el System Map gracias a que el
   * cuadro está lleno —disco, estrellas, cinco vecinos—. Sola contra negro, un
   * cuerpo al 60 % apagado se lee como un objeto roto.
   */
  environment: number;
  /**
   * Filo frío de separación de silueta, 0-1. `0` en casi todos.
   *
   * Excepción declarada: el Tesseracto es cristal casi negro y salió del
   * material común. Si su rim llega a leerse como una luz, está mal calibrado:
   * su único trabajo es que la silueta no se pierda contra el fondo.
   */
  rim: number;
  /** Qué instrumentos se ofrecen. El laboratorio adapta sus instrumentos a la
   *  muestra; no fuerza a los seis a tener los mismos botones. */
  instruments: readonly ObservationInstrument[];
}

/**
 * La tabla del §6, y el motivo de cada ángulo.
 *
 * Gargantúa NO está aquí, y su ausencia es la misma que la de `createBody`, que
 * devuelve `null` para ella: no tiene malla y no recibe ninguna luz añadida. Se
 * observa por VISTAS CURADAS, que son otro contrato (§7) — órbita libre queda
 * descartada en V1 porque el raymarch acumula en el tiempo y esa acumulación
 * sólo vale con la cámara quieta.
 */
export const OBSERVATION_PRESETS: Record<
  Exclude<WorldId, "gargantua">,
  ObservationPreset
> = {
  /* Contraluz: la jerarquía por profundidad en W —celda cercana gruesa y clara,
     lejana fina y apagada— sólo se separa cuando la luz viene de detrás. Y es
     el único que lleva rim, por lo dicho arriba. */
  tesseract: {
    keyAngle: 145,
    keyRoll: 70,
    environment: 0.06,
    rim: 0.12,
    instruments: ["bloom", "material", "datos"],
  },
  /* Tres cuartos: es donde separan las facetas y las cavidades del aluminio.
     De frente se aplana en una silueta y a 90° se parte en dos mitades. */
  endurance: {
    keyAngle: 55,
    keyRoll: 35,
    environment: 0.04,
    rim: 0,
    instruments: ["bloom", "material", "datos"],
  },
  /* Lateral pura, roll 0: la identidad de la Ranger es el reparto ámbar hacia
     la luz y azul de campo estelar en la espalda. Ese reparto no existe si la
     luz no está claramente a un lado. */
  ranger: {
    keyAngle: 90,
    keyRoll: 0,
    environment: 0.04,
    rim: 0,
    instruments: ["bloom", "material", "datos"],
  },
  /* Casi frontal: el camino de luz sobre el agua y la cresta con espuma son
     reflejos, y un reflejo sólo vuelve a la cámara cuando la fuente está cerca
     de su eje. A 90° Miller es un planeta azul cualquiera.

     Sin `material`: verificado en el shader, `emissive` sólo se escribe dentro
     de la rama `uKind == 8`, así que apagar la emisión no cambiaría UN SOLO
     píxel de Miller. Un botón que no hace nada es peor que un botón ausente. */
  miller: {
    keyAngle: 25,
    keyRoll: 20,
    environment: 0.04,
    rim: 0,
    instruments: ["bloom", "datos"],
  },
  /* Rasante: Edmunds se define por PENDIENTE y no por altura, así que la luz
     casi tangente es literalmente el instrumento correcto para ese campo — es
     la que convierte una pendiente en una sombra larga.

     Sin `material`, por lo mismo que Miller. */
  edmunds: {
    keyAngle: 82,
    keyRoll: 10,
    environment: 0.04,
    rim: 0,
    instruments: ["bloom", "datos"],
  },
};

/**
 * A cuántos radios del cuerpo se pone el origen del mundo.
 *
 * No es un número libre: gobierna cuán PARALELA llega la luz al espécimen, y
 * tiene que parecerse a lo que hace el System Map o el material se comporta de
 * otra manera. Allí la razón `orbitRadius / radio del cuerpo` va de ~6
 * (Endurance, 25 rs) a ~13 (Tesseracto, 32 rs). Diez queda dentro de esa banda.
 *
 * Y tiene un suelo duro: debe superar la distancia de encuadre, o con
 * `keyAngle` pequeño la cámara cruzaría el origen y se metería entre la luz y
 * el espécimen. A 40° de campo el encuadre ronda 2.9 radios, así que diez
 * sobra con holgura.
 */
export const ORIGIN_DISTANCE_RADII = 10;

/**
 * La intensidad de clave del espécimen, con la MISMA ley que el System Map.
 *
 * Se copia a propósito en vez de elegir un valor bonito para el visor: es parte
 * de la identidad del cuerpo —«a qué distancia del disco vive»— y cambiarla
 * sería alterar cómo se ve el material, que es justo lo que el §6 prohíbe.
 */
export function observationLightIntensity(orbitRadius: number): number {
  return Math.min(1.66, Math.max(1.08, (25 / Math.max(orbitRadius, 1)) * 1.36));
}

export interface ObservationPlacement {
  /** Dónde va el espécimen en el mundo. Nunca el origen. */
  body: Vec3;
  /** Dónde va la cámara. Mira al espécimen. */
  camera: Vec3;
  /** Qué escribir en `uLightIntensity`. */
  lightIntensity: number;
  /** El preset del que sale todo esto. */
  preset: ObservationPreset;
}

const DEG = Math.PI / 180;

/**
 * Convierte un preset en posiciones de mundo.
 *
 * La construcción, que es toda la idea del módulo:
 *
 * 1. El espécimen va en `B = (0, 0, -D)`, así que la luz le llega desde
 *    `L = normalize(-B) = (0, 0, 1)`.
 * 2. La cámara se coloca en la dirección `V` que forma `keyAngle` con `L`,
 *    girada `keyRoll` alrededor del eje de mirada.
 * 3. `C = B + V · encuadre`.
 *
 * Por construcción, el ángulo entre «hacia la luz» y «hacia la cámara» medido
 * en el espécimen es EXACTAMENTE `keyAngle`. Eso es lo que hace que la columna
 * `KEY` de la tabla sea un dato y no una descripción literaria — y lo que el
 * test comprueba.
 *
 * @param radius     radio del modelo ya construido (`SceneBody.radius`).
 * @param framing    distancia de encuadre, que decide la página según su campo
 *                   de visión y su viewport.
 */
export function observationPlacement(
  id: Exclude<WorldId, "gargantua">,
  radius: number,
  framing: number,
): ObservationPlacement {
  const preset = OBSERVATION_PRESETS[id];
  const originDistance = radius * ORIGIN_DISTANCE_RADII;

  const body: Vec3 = [0, 0, -originDistance];

  const a = preset.keyAngle * DEG;
  const r = preset.keyRoll * DEG;
  const view: Vec3 = [
    Math.sin(a) * Math.cos(r),
    Math.sin(a) * Math.sin(r),
    Math.cos(a),
  ];

  const camera: Vec3 = [
    body[0] + view[0] * framing,
    body[1] + view[1] * framing,
    body[2] + view[2] * framing,
  ];

  return {
    body,
    camera,
    lightIntensity: observationLightIntensity(
      worldsData[id].placement.orbitRadius,
    ),
    preset,
  };
}
