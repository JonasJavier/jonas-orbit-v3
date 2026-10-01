import type { WorldId } from "@/content/worlds.data";
import { PATH_SEGMENTS } from "./path-segments";

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

/**
 * El segmento del Observatorio, y por qué esto importa fuera del Observatorio.
 *
 * `docs/design/tesseract-experimentos.md` §3, enmienda 3: en estas rutas el
 * contexto persistente **no se crea o se libera**, y NO basta con pausar el
 * bucle. La enmienda existe porque yo había escrito lo contrario y era falso:
 * `COVERED_WORLDS` sólo llama a `cancelAnimationFrame`, así que la escena deja
 * de dibujar pero su contexto WebGL —y su VRAM— siguen enteros. En una ruta que
 * monta su PROPIO contexto a pantalla completa eso deja dos vivos a la vez.
 *
 * Es más estricto que el resto del sitio a propósito. Miller y la Ranger montan
 * su propio WebGL2 y ahí basta con que la escena persistente no DIBUJE, que es
 * lo que promete `AGENTS.md`. El Observatorio sube el listón porque su canvas
 * ocupa la pantalla entera durante toda la visita, no un hero.
 *
 * Se casa sólo por el segmento del Observatorio en cada idioma (`observatorio`,
 * `observatory`), que es nuestro (`PATH_SEGMENTS`). El slug del mundo
 * —`experimentos`— vive en el frontmatter del MDX y no se duplica aquí: ésa es
 * la regla 4 del repositorio.
 */
const OBSERVATORY_SEGMENTS: readonly string[] = Object.values(PATH_SEGMENTS.observatory);

export function isObservatoryPath(pathname: string): boolean {
  return pathname.split("/").some((segment) => OBSERVATORY_SEGMENTS.includes(segment));
}

const BLOG_SEGMENTS: readonly string[] = Object.values(PATH_SEGMENTS.blog);

/**
 * El blog (`/es/blog`, `/en/blog/…`) no es un mundo, pero tapa la escena con
 * su propio cielo opaco (`blog-sky.tsx`): ahí la escena duerme como en las
 * rutas cubiertas. Se casa sólo el segmento justo detrás del idioma.
 */
export function isBlogPath(pathname: string): boolean {
  return BLOG_SEGMENTS.includes(pathname.split("/")[2] ?? "");
}
