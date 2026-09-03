import { worldsData, type WorldId } from "@/content/worlds.data";

/**
 * El contrato de cámara del pivote, escrito como código.
 *
 * > La cámara no tiene controlador. Su pose es una **función pura de la ruta
 * > activa**: `cameraPose = f(routeWorldId)`. Nadie más le escribe. Nunca.
 * > — docs/plans/sistema-gargantua.md §3
 *
 * Este módulo es esa función, y está aquí —fuera de la escena, sin three.js,
 * sin DOM— por una razón concreta: así se puede DEMOSTRAR con un test unitario
 * que la misma ruta produce siempre la misma pose y que no existe ningún camino
 * por el que la rueda, un arrastre o el scroll escriban en ella. Si algún día
 * alguien añade `OrbitControls`, tendrá que romper este archivo para hacerlo.
 *
 * Lo único que la escena añade encima es el paralaje de ≤ 2° desde el puntero,
 * que es ADITIVO y no modifica la pose de destino (§3, regla 4).
 */

export interface CameraPose {
  /**
   * Multiplicador sobre la distancia de encuadre.
   *
   * No es una distancia absoluta a propósito. La escena CALCULA cada vez la
   * distancia mínima a la que las siete órbitas caben enteras en el viewport
   * actual, y esto la multiplica. Con un número fijo, un móvil en vertical
   * dejaría medio sistema fuera de cuadro — y un destino fuera de cuadro es un
   * enlace que no existe.
   */
  distanceScale: number;
  /** Elevación sobre el plano del disco, en grados. */
  elevation: number;
  /** Azimut alrededor del sistema, en grados. */
  azimuth: number;
  /**
   * Cuánto se corre la mirada respecto de Gargantúa, como fracción del
   * semiancho del cuadro. Positivo desplaza la mirada a la izquierda, así que
   * **el agujero negro se va hacia la derecha**: es lo que abre el hueco limpio
   * donde vive el texto.
   */
  targetShiftFraction: number;
  /**
   * Corrimiento VERTICAL de la mirada, como fracción del semialto del cuadro.
   * Positivo mira por encima del origen y, por tanto, baja Gargantúa en pantalla.
   */
  targetShiftYFraction: number;
  /** Campo de visión vertical, en grados. */
  fov: number;
  /** Inclinación de la cámara, en radianes. */
  roll: number;
  /** Multiplicador de exposición sobre la base de ACES. */
  exposure: number;
  /** Multiplicador de fuerza del bloom. */
  bloom: number;
  /** Opacidad del canvas: la home lo enseña entero; un mundo lo usa de telón. */
  opacity: number;
  /** Si el sistema sigue en marcha o se congela detrás del contenido. */
  animated: boolean;
}

/** La pose de la home: el sistema entero con Gargantúa centrado y dominante. */
export const SYSTEM_POSE: CameraPose = {
  distanceScale: 1,
  /*
    Elevación sobre el plano del disco. Vuelve a 9°, y el argumento que la había
    subido a 17° estaba midiendo la cosa equivocada.

    Aquel razonamiento era: el disco vive en y = 0, así que su ALTURA en pantalla
    vale su diámetro por el seno de la elevación; a 9° eso son 8.9 % del alto del
    viewport y a 17° un 18.8 %, o sea el doble de agujero negro por el mismo
    precio de encuadre. Todo cierto. Y era la métrica equivocada, porque lo que
    hace que esto se lea como un agujero negro no es cuánta pantalla ocupa el
    disco: es que se distinga el PLANO de acreción de su imagen doblada por la
    gravedad. Engordar la elipse primaria hace justo lo contrario — le da volumen
    propio, y el conjunto pasa a leerse como un remolino visto desde arriba.

    El A/B de 17° / 12° / 9° (mismo viewport, mismo shader, misma fase temporal,
    capturas en docs) lo dejó sin discusión. La elipse proyectada va como
    1/sin(θ), o sea 3.42 : 1 a 17°, 4.81 : 1 a 12° y 6.39 : 1 a 9°: bajar a 9°
    aplana la silueta un 87 %. Y cuesta un 9.4 % de acercamiento —medido sobre el
    diámetro de Miller, que es de tamaño fijo—, porque el sistema ocupa menos alto
    y el encuadre se ajusta. Ése es todo el precio.

    A 9° el alto de la estructura lo pone casi entero el lensado: el arco de la
    cara lejana pasando por encima de la sombra y la imagen secundaria por debajo,
    con la banda primaria fina cruzando el cuadro. Es la lectura que se buscaba.

    Por debajo de 9° no se baja. No por geometría —seguiría aplanando— sino
    porque a partir de ahí se persigue un fotograma concreto de Interstellar a
    costa de la composición propia: esto es Jonás Orbit, no un remake.
  */
  elevation: 9,
  azimuth: 0,
  /*
    Descentrado pequeño, en los dos ejes.

    Este número va por su tercera vida. Primero 0.26, para abrir hueco al bloque
    editorial del hero. Después 0, al desaparecer ese bloque, con el argumento
    de que la simetría hipnotiza. Y la simetría PERFECTA es justo lo que hace
    que la escena se lea como un diagrama: el centro geométrico del visor es el
    único sitio donde un objeto no parece encuadrado por nadie.

    −0.075 deja la sombra a un 3.6 % del ancho a la izquierda y 0.025 la baja un
    4.4 % del alto. Medido, no estimado. El techo práctico está en ~0.2: pasado
    ahí el encuadre tiene que retroceder tanto para compensar que devuelve en
    tamaño de Gargantúa lo que gana en composición.
  */
  targetShiftFraction: -0.075,
  targetShiftYFraction: 0.025,
  /*
    Campo de visión: 35°, no 42°.

    Un teleobjetivo suave, y por dos motivos que apuntan al mismo sitio. El
    primero es de tamaño: cerrar el campo agranda todo lo que hay dentro, así
    que el disco gana otro punto largo de pantalla.

    El segundo importa más y es de MOVIMIENTO. Para encuadrar el mismo sistema
    con menos campo hay que alejar la cámara, y al alejarla se aplana la
    perspectiva: la diferencia de tamaño aparente entre el punto cercano y el
    lejano de una órbita baja de 2.2× a 1.8×. Ese vaivén —un cuerpo hinchándose
    y encogiéndose media vuelta sí y media no— era parte de lo que se veía como
    «los planetas se mueven raro». Un campo cerrado es también, sin más, el
    lenguaje de una cámara de cine.
  */
  fov: 35,
  roll: -0.13,
  exposure: 1,
  bloom: 1,
  opacity: 1,
  animated: true,
};

/**
 * Pose de una página de mundo.
 *
 * Aquí la escena es telón, no protagonista: se atenúa y se CONGELA. Un sistema
 * en movimiento detrás de un texto largo es ilegible y además cuesta lo mismo
 * que la home entera para algo que nadie está mirando.
 *
 * Cada mundo tiene la suya —derivada de su propia órbita, no inventada— para
 * que el viaje de G3 tenga a dónde ir: la transición interpola de esta pose a
 * la siguiente y la escena nunca se recrea.
 */
function worldPose(id: WorldId): CameraPose {
  const { placement } = worldsData[id];
  const phase = (placement.phase * Math.PI) / 180;

  return {
    ...SYSTEM_POSE,
    // Retroceso leve y giro hacia el lado donde está el cuerpo: el sistema se
    // reencuadra sin marear, y dos mundos distintos nunca comparten pose.
    distanceScale: SYSTEM_POSE.distanceScale * 1.12,
    azimuth: SYSTEM_POSE.azimuth + Math.sin(phase) * 9,
    elevation: SYSTEM_POSE.elevation + placement.inclination * 0.18,
    targetShiftFraction: SYSTEM_POSE.targetShiftFraction * 0.62,
    targetShiftYFraction: SYSTEM_POSE.targetShiftYFraction * 0.62,
    exposure: 0.72,
    bloom: 0.8,
    opacity: 0.34,
    animated: false,
  };
}

/**
 * La función del contrato: ruta → pose. Sin estado, sin efectos, sin DOM.
 *
 * `null` es la home (y cualquier ruta que no pertenezca a un mundo, como la
 * página de privacidad).
 */
export function cameraPoseForRoute(worldId: WorldId | null): CameraPose {
  // Siempre un objeto nuevo: quien reciba una pose no puede envenenar la
  // siguiente lectura mutándola, y eso es la mitad de lo que significa "pura".
  return worldId === null ? { ...SYSTEM_POSE } : worldPose(worldId);
}
