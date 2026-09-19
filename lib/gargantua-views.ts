import { GARGANTUA_RS } from "@/components/scene/gargantua-shaders";
import type { Vec3 } from "./observatory";

/**
 * LAS CUATRO VISTAS DE GARGANTÚA, y la geometría que las convierte en cámara.
 *
 * > Gargantúa no recibe ninguna luz añadida. Nada. En ninguna vista.
 * > — docs/design/tesseract-experimentos.md §6
 *
 * Este módulo es a Gargantúa lo que `observatory.ts` es a los cinco sólidos, y
 * la diferencia entre los dos ES el espécimen:
 *
 *  · Para un sólido, una vista se declara con `keyAngle` y `keyAzimuth` porque
 *    la única variable de observación que existe es dónde te sientas respecto
 *    de la lámpara, y la lámpara es el origen del mundo. El espécimen se MUEVE
 *    alrededor del origen; la cámara lo sigue.
 *  · Aquí el espécimen ES el origen, y no se mueve nunca. La luz tampoco se
 *    puede tocar, porque la luz es el propio disco. Lo único que queda es dónde
 *    se pone la cámara y con qué objetivo — y eso son seis números, no dos.
 *
 * Por eso `observationPlacement` no sirve y no se fuerza: aplicarle a un
 * agujero negro el contrato de los sólidos exigiría fingir que tiene una
 * posición y una clave. El §5 lo dice como principio —«el laboratorio adapta
 * sus instrumentos a la muestra»— y esto es lo mismo un nivel más abajo: adapta
 * también su contrato de observación.
 *
 * ── Por qué no hay órbita libre, dicho una vez ──────────────────────────────
 *
 * El §7 lo cierra y este pase no lo reabre. El argumento no es de rendimiento:
 * durante el arrastre se perdería el supermuestreo sobre ocho posiciones de
 * Halton que paga el acabado, y —sobre todo— **una órbita libre garantiza que
 * alguien acabará mirando el pase visual final desde un ángulo que nadie
 * encuadró**. Cuatro vistas curadas no son un peldaño hacia la órbita: son el
 * contrato.
 *
 * Consecuencia directa en el código: aquí no hay estado de cámara. Una vista se
 * resuelve entera desde su declaración y el aspecto del viewport, y no existe
 * ninguna función que acepte un incremento.
 */

/**
 * ── CÓMO SE CALIBRAN ESTOS CUATRO PARES ─────────────────────────────────────
 *
 * Distancia y campo no se eligen a ojo, y la primera versión demuestra por qué:
 * salió de estimar «más cerca para la lente, más cerca aún para la sombra» y
 * las dos vistas de detalle acabaron siendo una pared de crema sin objeto
 * dentro. El error estaba en olvidar el tamaño del disco — diecisiete radios
 * contra los 2.6 de la sombra— y en suponer que acercarse agranda lo que
 * interesa sin sacar de cuadro todo lo demás.
 *
 * Lo que decide un par es esta aritmética, verificada contra captura:
 *
 *   · **La sombra** es el disco de parámetro de impacto crítico, 2.598 rs, así
 *     que ocupa `2.598 / (d · tan(fov/2))` del ALTO del cuadro.
 *   · **El disco** llega a 17 rs, así que ocupa `17 / (d · tan(fov/2) · aspecto)`
 *     del SEMIANCHO.
 *
 * Con eso, los cuatro pares dicen en una línea qué clase de vista son:
 *
 *   | vista           | d / fov | sombra  | disco   |
 *   | --------------- | ------- | ------- | ------- |
 *   | Cinematográfica | 42 / 35 | 19.6 %  | 80.2 %  |
 *   | Lente           | 40 / 20 | 36.8 %  | 150.6 % |
 *   | Disco           | 46 / 32 | 19.7 %  | 80.6 %  |
 *   | Sombra          | 34 / 15 | 58.0 %  | 237.4 % |
 *
 * Las dos de conjunto encuadran el disco entero en el 80 % del semiancho, que
 * es el aire que pide el §5. Las dos de detalle lo sacan de cuadro A PROPÓSITO
 * —pasan del 100 %— porque lo que estudian vive dentro de los primeros radios y
 * enseñar los diecisiete enteros dejaría el anillo de fotones en treinta
 * píxeles.
 *
 * Y la separación entre esas dos costó una ronda de capturas. Con `SOMBRA` a
 * 38 / 18 las dos daban la misma imagen —un negro con su arco— y dos vistas que
 * enseñan lo mismo son una vista y un rótulo de más. La diferencia no podía
 * venir de la elevación, porque las dos viven cerca del suelo de 9°, así que
 * viene del ENCUADRE: `LENTE` deja sitio alrededor del negro, que es donde vive
 * lo que estudia —el anillo y la imagen doblada—, y `SOMBRA` lo llena hasta que
 * el vacío ocupa el 58 % del alto y no queda nada más que mirar. Una enseña la
 * estructura ALREDEDOR del agujero; la otra, el agujero.
 *
 * Y eso NO contradice la regla de `observation-views.ts` —una vista puede
 * alejarse, nunca acercarse—, que nació de otro problema: la silueta del
 * Tesseracto respira treinta y un puntos con su reconfiguración 4D, así que
 * ninguna vista cerrada puede garantizar que la figura quepa. Gargantúa no
 * respira: su geometría es fija y lo que entra en cuadro es exactamente lo que
 * dice esta tabla, hoy y dentro de un año.
 */

/** Grados a radianes. */
const DEG = Math.PI / 180;
const WORLD_UP: Vec3 = [0, 1, 0];

/**
 * El aspecto para el que están declaradas las distancias.
 *
 * Las distancias de abajo se eligieron sobre capturas a 1440 × 900, y el disco
 * es una figura ANCHA: lo que decide si cabe es el ancho del cuadro, no el
 * alto. En un viewport más estrecho hay que retroceder en la misma proporción o
 * el disco se sale por los lados — que es exactamente lo que pasa en un móvil
 * en vertical, donde el aspecto cae a 0.46.
 */
const REFERENCE_ASPECT = 1.6;

export interface GargantuaView {
  /** Clave estable. Va al DOM y a las pruebas, nunca a la pantalla. */
  id: string;
  /** Lo que se lee en el mando. */
  label: string;
  /**
   * Qué propiedad del objeto revela esta cámara.
   *
   * Misma regla que las vistas de los sólidos: cada frase se puede rastrear
   * hasta una decisión documentada del pase visual de Gargantúa. Si alguna deja
   * de ser cierta al tocar el shader, se reescribe o se retira la vista.
   */
  study: string;
  /** Elevación sobre el plano del disco, en grados. */
  elevation: number;
  /** Azimut alrededor del eje del sistema, en grados. */
  azimuth: number;
  /** Distancia al agujero, en radios de Schwarzschild. */
  distance: number;
  /** Campo de visión vertical, en grados. */
  fov: number;
  /** Inclinación de la cámara alrededor del eje de mirada, en radianes. */
  roll: number;
  /** Corrimiento de la mirada, en fracciones del semiancho del cuadro. */
  shiftX: number;
  /** Ídem en vertical, sobre el semialto. */
  shiftY: number;
}

/**
 * Suelo de elevación, y no se baja de aquí.
 *
 * El A/B de 17° / 12° / 9° que fijó la pose de la home dejó escrito el motivo
 * en `scene-poses.ts`: por debajo de 9° se sigue aplanando la elipse, pero se
 * persigue un fotograma concreto de Interstellar a costa de la composición
 * propia. Las cuatro vistas se quedan dentro de esa banda medida, y un test lo
 * comprueba — es la clase de límite que una vista nueva rompe sin querer.
 */
export const ELEVATION_FLOOR = 9;
export const ELEVATION_CEILING = 17;

/**
 * Las cuatro. Cada una estudia una propiedad distinta: eso es más laboratorio,
 * no menos.
 */
export const GARGANTUA_VIEWS: readonly GargantuaView[] = [
  {
    id: "cinematografica",
    label: "Cinematográfica",
    /*
      La composición aprobada, con los números de la pose de la home: 9° de
      elevación, 35° de campo y el roll y el corrimiento que la sacan de la
      simetría perfecta. Lo único que NO se hereda es la distancia — allí la
      fija el encuadre de los seis cuerpos, y aquí sólo hay uno.

      Esos cinco números están duplicados respecto de `SYSTEM_POSE`, y la
      duplicación es deliberada: el §2 prohíbe que el Observatorio importe el
      contrato de cámara, y saltárselo convertiría este visor en un controlador
      sobre la escena persistente. Lo que impide que deriven es un test que lee
      los dos archivos y los compara — puede hacerlo porque una prueba sí puede
      conocer las dos orillas.
    */
    elevation: 9,
    azimuth: 0,
    distance: 42,
    fov: 35,
    roll: -0.13,
    shiftX: -0.075,
    shiftY: 0.025,
    study:
      "La composición aprobada: la elipse aplanada, el arco de la cara lejana pasando por encima de la sombra y la imagen secundaria por debajo.",
  },
  {
    id: "lente",
    label: "Lente",
    /*
      Elevación en el suelo de la banda y campo cerrado: a 9° el alto de la
      estructura lo pone casi entero el lensado, así que acercarse con
      teleobjetivo deja el anillo de fotones y la imagen doblada llenando el
      cuadro sin cambiar la geometría que los produce.

      Sin roll y sin corrimiento: lo que se estudia aquí es una figura
      concéntrica, y descentrarla sólo añadiría ruido a la lectura.
    */
    elevation: 9,
    azimuth: 0,
    distance: 40,
    fov: 20,
    roll: 0,
    shiftX: 0,
    shiftY: 0,
    study:
      "El anillo de fotones y la imagen duplicada. Los rayos que rodean el agujero vuelven a cruzar el plano del disco y traen su cara lejana por arriba y por abajo.",
  },
  {
    id: "disco",
    label: "Disco",
    /*
      El techo de la banda. La elipse proyectada va como 1/sin(θ): 6.39 : 1 a 9°
      y 3.42 : 1 a 17°, así que subir abre el plano de acreción y deja ver su
      estructura interna — el carácter por sectores, el calibre de los
      filamentos, los nudos y los pozos del §14 duodecies punto 2 y 3.

      Y es la vista donde la asimetría Doppler se lee entera: el lado que se
      acerca contra el que se aleja, que en la imagen final van a 2.15 : 1.
    */
    elevation: 17,
    azimuth: 0,
    distance: 46,
    fov: 32,
    roll: -0.13,
    shiftX: 0,
    shiftY: 0.02,
    study:
      "La estructura interna de las bandas y la asimetría entre los dos lados: el que se acerca llega con más luz, más densidad y más crema; el que se aleja, apagado y de cobre.",
  },
  {
    id: "sombra",
    label: "Sombra",
    /*
      Teleobjetivo sobre el disco de parámetro de impacto crítico. Es la vista
      donde el interruptor de `BLOOM` cuenta la historia del §14 undecies —el
      halo no puede encender lo que estaba apagado— porque es la única donde el
      negro ocupa bastante cuadro como para que su relleno sea visible.

      Elevación a mitad de banda: a 9° el arco inferior tapa parte del borde de
      abajo y a 17° la sombra se hunde en la masa del disco.
    */
    elevation: 12,
    azimuth: 0,
    distance: 34,
    fov: 15,
    roll: 0,
    shiftX: 0,
    shiftY: 0,
    study:
      "El negro real y su borde. Dentro del parámetro de impacto crítico no escapa nada, y el filo que lo separa del disco es lo que dice que ahí hay un agujero y no una lámpara.",
  },
];

/** La base de cámara que consume el raymarch: cuatro vectores y un campo. */
export interface GargantuaFraming {
  position: Vec3;
  right: Vec3;
  up: Vec3;
  forward: Vec3;
  /** `tan(fov / 2)`, que es lo que el shader pide y no el ángulo. */
  tanHalfFov: number;
  /** Radio de la cáscara del cielo, atado a la distancia como en el mapa. */
  skyRadius: number;
  /** Distancia real a la sombra, en radios de Schwarzschild. */
  radii: number;
}

function normalise(v: Vec3): Vec3 {
  const n = Math.hypot(v[0], v[1], v[2]);
  return n === 0 ? [0, 0, 1] : [v[0] / n, v[1] / n, v[2] / n];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

/**
 * Qué fracción del ALTO no puede bajar la sombra, pase lo que pase.
 *
 * Es el suelo que convierte el retroceso en una corrección y no en una huida.
 * Por debajo de esto Gargantúa deja de ser un espécimen y pasa a ser una mancha
 * en medio de un cielo — que es literalmente lo que salió en la primera captura
 * a 375 px, con la cámara a 145 radios.
 */
const SHADOW_FLOOR = 0.12;

/**
 * Cuánto hay que retroceder para que el disco quepa a lo ancho, CON UN TOPE.
 *
 * El disco es una figura ancha y plana, así que en un viewport estrecho lo que
 * se sale son los lados. Mantener constante el semiancho del cuadro
 * —`d · tan(fov/2) · aspecto`— es mantener constante cuánto disco entra, y eso
 * pide `d ∝ 1/aspecto`.
 *
 * ── Y ese retroceso, solo, es un desastre en un teléfono ────────────────────
 *
 * Medido: a 375 × 812 el aspecto cae a 0.46 y la regla lleva la cámara de 42 a
 * **145 radios**. El disco cabe entero, sí, y el espécimen queda en un borrón
 * de cien píxeles en medio del cuadro. Cumplir la regla al pie de la letra
 * produjo exactamente lo que el §5 prohíbe.
 *
 * El error era tratar «que quepa el disco» como la restricción que manda. En un
 * teléfono en vertical no se puede tener las dos cosas —treinta y cuatro radios
 * de ancho y una sombra legible— y de las dos, la que hace que esto sea una
 * muestra y no un fondo de pantalla es la segunda. Así que el retroceso se topa
 * en cuanto la sombra baja del suelo: el disco se sale por los lados, que es lo
 * que hace cualquier fotografía de algo más ancho que su encuadre.
 *
 * Y sólo actúa hacia atrás. En una ventana MÁS ancha que la de referencia el
 * disco ya cabe, y acercarse porque sobra sitio a los lados lo sacaría por
 * arriba y por abajo.
 */
export function distanceForAspect(
  view: Pick<GargantuaView, "distance" | "fov">,
  aspect: number,
): number {
  if (!Number.isFinite(aspect) || aspect <= 0) return view.distance;
  if (aspect >= REFERENCE_ASPECT) return view.distance;

  const retreat = view.distance * (REFERENCE_ASPECT / aspect);
  // La sombra ocupa `2.598 / (d · tan(fov/2))` del alto, así que su suelo fija
  // la distancia máxima directamente. Sin aproximaciones y sin un factor a ojo.
  const ceiling = 2.598 / (SHADOW_FLOOR * Math.tan(view.fov * 0.5 * DEG));
  return Math.min(retreat, ceiling);
}

/**
 * Convierte una vista en la base de cámara que quiere el raymarch.
 *
 * La construcción copia EXACTAMENTE la del System Map —posición esférica, base
 * mirando al origen, corrimiento de la mirada medido sobre esa base, base
 * definitiva recalculada desde la mirada corrida y roll aplicado al final— y la
 * copia a propósito: es lo que hace que la vista `CINEMATOGRÁFICA`, con los
 * números de la pose de la home, produzca la misma geometría de luz que la
 * portada y no una parecida.
 *
 * @param aspect ancho / alto del lienzo.
 */
export function gargantuaFraming(
  view: GargantuaView,
  aspect: number,
): GargantuaFraming {
  const elevation = view.elevation * DEG;
  const azimuth = view.azimuth * DEG;
  const radii = distanceForAspect(view, aspect);
  const span = radii * GARGANTUA_RS;

  const position: Vec3 = [
    Math.cos(elevation) * Math.sin(azimuth) * span,
    Math.sin(elevation) * span,
    Math.cos(elevation) * Math.cos(azimuth) * span,
  ];

  // Base mirando al origen, para saber hacia dónde correr la mirada.
  const look = normalise([-position[0], -position[1], -position[2]]);
  const baseRight = normalise(cross(look, WORLD_UP));
  const baseUp = normalise(cross(baseRight, look));

  const tanHalfFov = Math.tan(view.fov * 0.5 * DEG);
  const halfWidth = span * tanHalfFov * Math.max(aspect, 0.2);
  const halfHeight = span * tanHalfFov;

  // Mirar a la IZQUIERDA del agujero lo empuja a la derecha del cuadro.
  const target: Vec3 = [
    baseRight[0] * -halfWidth * view.shiftX + baseUp[0] * halfHeight * view.shiftY,
    baseRight[1] * -halfWidth * view.shiftX + baseUp[1] * halfHeight * view.shiftY,
    baseRight[2] * -halfWidth * view.shiftX + baseUp[2] * halfHeight * view.shiftY,
  ];

  const forward = normalise([
    target[0] - position[0],
    target[1] - position[1],
    target[2] - position[2],
  ]);
  const right = normalise(cross(forward, WORLD_UP));
  const up = normalise(cross(right, forward));

  const cos = Math.cos(view.roll);
  const sin = Math.sin(view.roll);
  const rolledRight: Vec3 = [
    right[0] * cos + up[0] * sin,
    right[1] * cos + up[1] * sin,
    right[2] * cos + up[2] * sin,
  ];
  const rolledUp: Vec3 = [
    up[0] * cos - right[0] * sin,
    up[1] * cos - right[1] * sin,
    up[2] * cos - right[2] * sin,
  ];

  return {
    position,
    right: rolledRight,
    up: rolledUp,
    forward,
    tanHalfFov,
    skyRadius: Math.max(60, span * 1.5),
    radii,
  };
}

/**
 * LO QUE SE PUEDE MEDIR DE ESTA OBSERVACIÓN, y nada más.
 *
 * Tres números, los tres derivados de la cámara que se está dibujando. **No hay
 * `CLAVE`**, y su ausencia es el contrato: el ángulo de clave mide la
 * separación entre la luz y la mirada, y aquí la luz es el propio objeto. Un
 * cero en esa casilla no sería un dato neutro, sería una medición falsa — la
 * misma razón por la que `LUZ` y `MATERIAL` tampoco aparecen.
 *
 * `distance` va en RADIOS DE SCHWARZSCHILD porque es la única unidad que
 * significa algo alrededor de un agujero negro: la sombra vive a 2.6 rs y el
 * disco llega a 17, así que «a 42 rs» sitúa al observador de verdad.
 */
export interface GargantuaTelemetry {
  azimuth: number;
  elevation: number;
  /** Distancia a la sombra, en radios de Schwarzschild. */
  distance: number;
  /** Campo de visión de esta vista, en grados. */
  fov: number;
}

export function gargantuaTelemetry(
  view: GargantuaView,
  aspect: number,
): GargantuaTelemetry {
  return {
    azimuth: (view.azimuth + 360) % 360,
    elevation: view.elevation,
    distance: distanceForAspect(view, aspect),
    fov: view.fov,
  };
}

/**
 * Los radios del disco EN RADIOS DE SCHWARZSCHILD, que es la unidad en la que
 * significan algo.
 *
 * `DISK_OUTER` vale 23.8 en unidades del integrador y no dice nada. «17 rs»
 * dice que el disco llega a diecisiete veces el horizonte, y ésa es una
 * afirmación que se puede comprobar contra cualquier libro. Es la misma regla
 * del §8 que gobierna el resto de la ficha: lo que se presenta como medido, se
 * mide — y también se presenta en la unidad correcta.
 */
export function diskRadiiInRs(inner: number, outer: number) {
  return { inner: inner / GARGANTUA_RS, outer: outer / GARGANTUA_RS };
}
