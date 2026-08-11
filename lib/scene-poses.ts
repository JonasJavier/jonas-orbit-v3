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

/** La pose de la home: el sistema entero, Gargantúa en el tercio derecho. */
export const SYSTEM_POSE: CameraPose = {
  distanceScale: 1,
  elevation: 9,
  azimuth: 0,
  targetShiftFraction: 0.26,
  fov: 42,
  roll: -0.11,
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
