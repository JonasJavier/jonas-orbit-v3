import type { WorldId } from "@/content/worlds.data";
import type { Vector3 } from "three";

/**
 * Capas de profundidad exclusivas de la escena WebGL, en rs sobre el eje de
 * vista. Positivo acerca el cuerpo; negativo lo envía al fondo.
 *
 * No forma parte de `placement`: el mapa 2D conserva exactamente su
 * composición aprobada mientras la perspectiva 3D gana planos reconocibles.
 */
const BODY_DEPTH_LAYER: Readonly<
  Record<Exclude<WorldId, "gargantua">, number>
> = {
  /*
    Rango ampliado de [-3, +5] a [-6, +7] (2026-09-01).

    Con Gargantúa ocupando casi la mitad del cuadro, los destinos ya no pueden
    estar todos a la misma profundidad: leídos así se convierten en iconos
    repartidos alrededor de un centro. Separarlos en el eje de vista es lo que
    los hace pertenecer a un ESPACIO y no a una circunferencia — el paralaje del
    puntero los mueve a velocidades distintas y unos pasan por delante de otros.

    No es escala: mover un cuerpo sobre su propio rayo cámara→cuerpo conserva su
    posición en pantalla y solo cambia su tamaño aparente y su orden en z.
  */
  tesseract: -6,
  miller: 0,
  endurance: 4,
  edmunds: 2,
  // Sigue siendo el cuerpo más adelantado —es la nave pequeña y necesita el
  // plano cercano—, y ahora que la Endurance está tres radios más lejos puede
  // avanzar hasta +7 sin comérsela.
  ranger: 7,
};

export function bodyDepthLayerFor(id: WorldId): number {
  return id === "gargantua" ? 0 : BODY_DEPTH_LAYER[id];
}

/**
 * Desplaza un cuerpo sobre su propio rayo cámara→cuerpo.
 *
 * Mover todos los cuerpos en paralelo al eje de vista conserva x/y en espacio
 * de cámara, pero no en perspectiva: al cambiar z también cambia la división
 * proyectiva y el layout se abre o se cierra. Sobre el rayo individual, en
 * cambio, x/z e y/z permanecen idénticos. Un valor positivo acerca el cuerpo;
 * uno negativo lo aleja.
 */
export function placeBodyOnDepthLayer(
  position: Vector3,
  cameraPosition: Vector3,
  depthLayer: number,
  target: Vector3,
): Vector3 {
  const distance = position.distanceTo(cameraPosition);
  if (distance <= 1e-6 || depthLayer === 0) return target.copy(position);

  return target
    .copy(position)
    .lerp(cameraPosition, depthLayer / distance);
}
