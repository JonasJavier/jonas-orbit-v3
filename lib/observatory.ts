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
   * Azimut de la cámara ALREDEDOR DEL EJE DE LUZ, en grados.
   *
   * Se llamaba `keyRoll` y estaba mal en el nombre y en la descripción: no es
   * un roll alrededor del eje de mirada, y no sitúa la luz «a la derecha del
   * cuadro». Medido: con `keyAngle 90` y azimut 0 la luz cae completamente a la
   * IZQUIERDA (componente de pantalla −1.0).
   *
   * Lo que este número controla es por dónde rodea la cámara al eje que une el
   * espécimen con la luz. Dónde acaba la luz EN PANTALLA depende además del
   * `up` de la cámara, así que se calcula aparte: ver `keyScreenDirection`.
   *
   * ⏳ Pendiente de calibración visual.
   */
  keyAzimuth: number;
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
    keyAzimuth: 70,
    environment: 0.06,
    rim: 0.12,
    instruments: ["bloom", "material", "datos"],
  },
  /* Tres cuartos: es donde separan las facetas y las cavidades del aluminio.
     De frente se aplana en una silueta y a 90° se parte en dos mitades. */
  endurance: {
    keyAngle: 55,
    keyAzimuth: 35,
    environment: 0.04,
    rim: 0,
    instruments: ["bloom", "material", "datos"],
  },
  /* Lateral pura: la identidad de la Ranger es el reparto ámbar hacia la luz y
     azul de campo estelar en la espalda. Ese reparto no existe si la luz no
     está claramente a un lado.

     Su azimut se queda en 0 y NO puede subir a 90 sin más: con `keyAngle 90`
     ése es exactamente el valor que alinea la mirada con el eje +Y del mundo y
     degenera la base de cámara. `observationPlacement` lo salva con un eje de
     reserva, pero conviene saberlo antes de calibrar este cuerpo. */
  ranger: {
    keyAngle: 90,
    keyAzimuth: 0,
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
    keyAzimuth: 20,
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
    keyAzimuth: 10,
    environment: 0.04,
    rim: 0,
    instruments: ["bloom", "datos"],
  },
};

/**
 * A cuántos radios del cuerpo se pone el origen del mundo.
 *
 * Gobierna cuán PARALELA llega la luz al espécimen. Tiene que parecerse a lo
 * que hace el System Map o el material se comporta de otra manera: allí la
 * razón `orbitRadius / radio del cuerpo` va de ~6 (Endurance, 25 rs) a ~13
 * (Tesseracto, 32 rs), y diez queda dentro de esa banda.
 *
 * Y tiene un suelo duro: debe superar la distancia de encuadre, o con
 * `keyAngle` pequeño la cámara cruzaría el origen y se metería entre la luz y
 * el espécimen. A 40° de campo el encuadre ronda 2.9 radios, así que diez
 * sobra con holgura.
 *
 * ⏳ **No es una decisión visual, es una inicialización.** «Está dentro del
 * rango» no implica «el material se verá igual»: la Endurance vive cerca de 6
 * radios y es una estructura grande, así que la divergencia de la luz a 10
 * radios puede leerse distinta. Antes de congelar este número hay que comparar
 * el System Map original contra el Observatorio a 6, 10 y 13 radios sobre al
 * menos dos cuerpos, y juzgar cuál conserva el carácter.
 */
export const ORIGIN_DISTANCE_RADII = 10;

/**
 * Qué está verificado y qué no, dicho en el código y no sólo en un documento.
 *
 * **CONTRATO VERIFICADO ✅** — los tests demuestran que si un preset dice 55°,
 * la geometría produce exactamente 55°; que ningún preset puede escribir un
 * parámetro de material; que la luz llega tan paralela como en el mapa; y que
 * la base de cámara nunca degenera.
 *
 * **CALIBRACIÓN VISUAL ⏳** — los tests NO dicen que 55° sea el ángulo correcto
 * para la Endurance. Estos valores son puntos de partida técnicamente válidos,
 * no dirección de arte aprobada. Cuando se monte el primer espécimen puede
 * resultar que 55 deba ser 47, o que Miller funcione mejor a 18. Eso no sería
 * un fallo de la arquitectura: sería el pase visual haciendo su trabajo.
 *
 * Esta lista se vacía a medida que Jonás aprueba cada palanca sobre una
 * captura. Mientras tenga entradas, nadie puede dar los valores por buenos
 * porque la suite esté verde.
 */
export const PENDING_VISUAL_CALIBRATION = [
  "keyAngle",
  "keyAzimuth",
  "environment",
  "rim",
  "ORIGIN_DISTANCE_RADII",
] as const;

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
  /**
   * Vertical de la cámara. Con `body` y `camera` completa el encuadre.
   *
   * Sin esto el contrato estaba a medias: `keyAzimuth` decide por dónde rodea
   * la cámara, pero dónde acaba la luz EN PANTALLA no queda determinado hasta
   * que se fija el `up`. Aquí se deriva del eje +Y del mundo, con salvaguarda
   * cuando la mirada se alinea con él (ver `observationPlacement`).
   */
  up: Vec3;
  /** Qué escribir en `uLightIntensity`. */
  lightIntensity: number;
  /** El preset del que sale todo esto. */
  preset: ObservationPreset;
}

const DEG = Math.PI / 180;
const WORLD_UP: Vec3 = [0, 1, 0];
/** Eje de reserva cuando la mirada se alinea con `WORLD_UP` y el producto
 *  vectorial colapsa. No es hipotético: `keyAngle 90` con `keyAzimuth 90` lo
 *  produce exacto, y la Ranger ya está en `keyAngle 90`. */
const FALLBACK_UP: Vec3 = [0, 0, 1];
const DEGENERATE = 1e-4;

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalise(v: Vec3): Vec3 {
  const n = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / n, v[1] / n, v[2] / n];
}

/**
 * La base de cámara a partir de la mirada: derecha y vertical.
 *
 * El `up` es el eje +Y del mundo con la componente paralela a la mirada
 * retirada. Cuando la mirada se alinea con +Y ese vector se anula, y **no es un
 * caso de laboratorio**: `keyAngle 90` con `keyAzimuth 90` lo produce exacto, y
 * la Ranger ya está en `keyAngle 90`. Ahí se cambia a un eje de reserva antes
 * de dividir por cero.
 *
 * Vive fuera de `observationPlacement` para poder alcanzar esa rama desde un
 * test: por la ruta normal ningún preset la toca hoy, y una salvaguarda que no
 * se puede ejercitar es una salvaguarda que nadie sabe si funciona.
 */
export function cameraBasis(forward: Vec3): { right: Vec3; up: Vec3 } {
  const look = normalise(forward);
  const reference =
    Math.abs(dot(look, WORLD_UP)) > 1 - DEGENERATE ? FALLBACK_UP : WORLD_UP;
  const right = normalise(cross(look, reference));
  return { right, up: cross(right, look) };
}

/**
 * Convierte un preset en posiciones de mundo.
 *
 * La construcción, que es toda la idea del módulo:
 *
 * 1. El espécimen va en `B = (0, 0, -D)`, así que la luz le llega desde
 *    `L = normalize(-B) = (0, 0, 1)`.
 * 2. La cámara se coloca en la dirección `V` que forma `keyAngle` con `L`,
 *    girada `keyAzimuth` alrededor del eje de luz.
 * 3. `C = B + V · encuadre`, y el `up` sale del eje +Y del mundo proyectado
 *    perpendicular a la mirada, con eje de reserva si degenera.
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
  const r = preset.keyAzimuth * DEG;
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

  // La mirada va de la cámara al espécimen, o sea `-view`.
  const { up } = cameraBasis([-view[0], -view[1], -view[2]]);

  return {
    body,
    camera,
    up,
    lightIntensity: observationLightIntensity(
      worldsData[id].placement.orbitRadius,
    ),
    preset,
  };
}

/**
 * Dónde cae la luz EN PANTALLA, como componentes derecha / arriba en `[-1, 1]`.
 *
 * Existe porque `keyAzimuth` no responde la pregunta que un humano quiere hacer
 * —«quiero la luz arriba a la derecha»— y fingir que sí la respondía fue el
 * error de la primera versión. Aquí la relación queda a la vista y medible: si
 * al calibrar se pide una posición de pantalla concreta, se ajusta `keyAzimuth`
 * hasta que estos dos números digan lo que se busca.
 *
 * `right: -1` es luz completamente a la izquierda; `up: +1`, completamente
 * arriba. Los dos a la vez cerca de cero significa que la luz está casi en el
 * eje de cámara, de frente o de espaldas según `keyAngle`.
 */
export function keyScreenDirection(placement: ObservationPlacement): {
  right: number;
  up: number;
} {
  const { body, camera, up } = placement;
  const forward = normalise([
    body[0] - camera[0],
    body[1] - camera[1],
    body[2] - camera[2],
  ]);
  const toLight = normalise([-body[0], -body[1], -body[2]]);
  return {
    right: dot(toLight, normalise(cross(forward, up))),
    up: dot(toLight, up),
  };
}
