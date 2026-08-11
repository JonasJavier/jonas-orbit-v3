import type { WorldId } from "@/content/worlds.data";

/**
 * Resolución de la ruta activa a su mundo.
 *
 * Es una función PURA, sin DOM y sin router: recibe un pathname y una tabla, y
 * devuelve siempre lo mismo para la misma entrada. Esa pureza no es estética —
 * es el contrato de cámara del pivote (`cameraPose = f(routeWorldId)`,
 * docs/plans/sistema-gargantua.md §3). En G1 solo tiñe el fondo 2D; en G2 es
 * quien decide la pose, y por eso nace aquí, aislada y cubierta por tests.
 */

export interface WorldRoute {
  /** Ruta pública del mundo, ya localizada (p. ej. `/es/proyectos`). */
  href: string;
  id: WorldId;
  accent: string;
}

function normalise(pathname: string): string {
  // Un `/` final no es otra página. Se conserva la raíz para no dejar "".
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : "/";
}

/**
 * Mundo al que pertenece un pathname, o `null` si no pertenece a ninguno
 * (la home y las páginas legales).
 *
 * Coincide por prefijo de segmento y gana la ruta más larga: `/es/proyectos/omsta`
 * sigue siendo Endurance y `/es/contacto/gracias` sigue siendo Ranger, que es
 * justo lo que hace que un caso de estudio no apague el color de su mundo.
 */
export function findWorldRoute(
  pathname: string,
  routes: readonly WorldRoute[],
): WorldRoute | null {
  const path = normalise(pathname);

  let best: WorldRoute | null = null;
  for (const route of routes) {
    const href = normalise(route.href);
    // `startsWith` a secas haría que `/es/proyectosx` casara con `/es/proyectos`.
    if (path !== href && !path.startsWith(`${href}/`)) continue;
    if (!best || href.length > normalise(best.href).length) best = route;
  }
  return best;
}
