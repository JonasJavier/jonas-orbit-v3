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
  /*
    Miller sube de 0 a +5 (2026-09-04), y no es un ajuste de gusto.

    Al cruzar al superior izquierdo su fase lo hunde 12 rs por detrás del plano
    del origen: queda a 89 rs de la cámara de referencia contra los 78 de
    Edmunds. A esa distancia el Tesseracto —cuya esfera envolvente es casi toda
    vacío entre vigas— se veía un 17.6 % mayor que él, y el planeta que tiene
    que sostener esa esquina pasaba a ser el cuerpo más diminuto del cuadro.

    Deslizarlo 5 rs sobre su propio rayo lo deja en 84 y devuelve la jerarquía
    (el test de `bodies.test.ts` pide < 1.15×) SIN moverlo un píxel en pantalla
    y SIN tocar el encuadre, que se mide con la posición base. La alternativa
    —subirlo por inclinación— costaba un 11 % del radio de sombra de Gargantúa,
    porque la altura sí entra en la envolvente que encuadra la cámara.

    Sigue siendo el segundo cuerpo más lejano, por detrás sólo del Tesseracto:
    84 contra 76 de Edmunds, 60 de Endurance y 49 de la Ranger.
  */
  miller: 5,
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
