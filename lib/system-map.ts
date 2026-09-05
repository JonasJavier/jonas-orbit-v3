/**
 * Proyección del Sistema Gargantúa al plano de la pantalla — versión `flat`.
 *
 * Es la que se usa cuando NO hay escena 3D: reduced-motion, `?no3d=1`, sin
 * WebGL2 o equipo que no llega. Coloca los seis destinos sobre una elipse
 * achatada usando la MISMA estructura orbital que la escena real
 * (`content/worlds.data.ts`), así que el mapa plano y el sistema 3D no pueden
 * divergir: si un cuerpo cambia de sitio, cambia en los dos.
 *
 * Función pura y sin DOM a propósito. Cuando la escena está viva es ella quien
 * escribe `--map-x` / `--map-y` con la proyección de la cámara, y estos mismos
 * nodos se reposicionan sin tocar el marcado.
 */

import { WORLD_IDS, worldsData, type WorldStructuralData } from "@/content/worlds.data";

/**
 * Extensión del atlas en porcentaje. El catálogo de seis destinos normaliza
 * contra 30 rs: estos márgenes conservan aire en los bordes, también a 375 px,
 * sin reservar una trayectoria para un cuerpo que ya no existe.
 */
export const MAP_RADIUS_X = 36.5;
export const MAP_RADIUS_Y = 32.75;

/** El radio orbital más lejano del sistema: normaliza el resto a 0-1. */
const MAX_ORBIT = Math.max(
  ...WORLD_IDS.map((id) => worldsData[id].placement.orbitRadius),
);

export interface MapPoint {
  /** Porcentaje horizontal dentro del cuadro del mapa. */
  x: number;
  /** Porcentaje vertical dentro del cuadro del mapa. */
  y: number;
}

export function projectPlacement(
  placement: WorldStructuralData["placement"],
): MapPoint {
  const radians = (placement.phase * Math.PI) / 180;
  const radius = placement.orbitRadius / MAX_ORBIT;
  return {
    x: 50 + Math.cos(radians) * radius * MAP_RADIUS_X,
    y: 50 + Math.sin(radians) * radius * MAP_RADIUS_Y,
  };
}
