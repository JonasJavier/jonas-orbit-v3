import type { Locale } from "@/content/site.data";
import type { WorldId } from "@/content/worlds.data";
import { OBSERVATION_ORDER } from "@/lib/observatory";
import { OBSERVATORY_IDS } from "@/lib/observatory-slugs";
import { observatoryPath } from "@/lib/page-paths";
import { getWorld } from "@/lib/worlds";

/**
 * El catálogo de especímenes, compuesto UNA vez.
 *
 * Existe porque hay dos sitios que tienen que decir lo mismo —la recepción de
 * `/es/experimentos` y el raíl del propio Observatorio— y hasta ahora sólo
 * existía el segundo, escrito a mano dentro de su ruta. Dos listas con la misma
 * numeración mantenidas por separado discrepan el día que se monte el tercer
 * espécimen: el visitante entraría por la fila `03` y aterrizaría en «Espécimen
 * 4 de 6».
 *
 * Es un módulo de SERVIDOR —lee contenido compilado— y por eso no importa nada
 * del DOM ni de three.js. Los componentes de cliente reciben el catálogo ya
 * resuelto por props, igual que hacía la ruta del laboratorio.
 */

export interface SpecimenEntry {
  id: WorldId;
  /** Su sitio en el catálogo, desde 1. Lo fija `OBSERVATION_ORDER`. */
  index: number;
  name: string;
  /** Qué es el objeto, en una línea. Del MDX del espécimen. */
  descriptor: string | null;
  /** El par instrumental del §14.1. Del MDX del espécimen. */
  pair: string | null;
  /** `null` es una muestra catalogada que todavía no se observa. */
  href: string | null;
}

/** La URL del laboratorio para un espécimen montado, o `null`. */
function observatoryHref(id: WorldId, locale: Locale): string | null {
  return OBSERVATORY_IDS.includes(id) ? observatoryPath(id, locale) : null;
}

/**
 * Los seis, en orden de observación.
 *
 * Nombre, descriptor y par son reales o son `null`: nada se inventa para
 * rellenar una fila.
 *
 * Desde Miller y Edmunds **ninguna llega sin `href`**, y la rama que lo permite
 * se queda igual. No es código muerto por si acaso: es la regla que hizo
 * crecible este catálogo —una muestra catalogada y sin montar aparece con su
 * fila y sin puerta, porque el catálogo dice cuántas hay y una puerta que no
 * lleva a ninguna parte es peor que la ausencia de puerta— y quien la borre por
 * «ya no hace falta» tendrá que volver a discutirla el día que el laboratorio
 * reciba una séptima muestra. Sus pruebas viven en dos fixtures inventados a
 * propósito —`components/experiments-index.test.tsx` para la recepción y
 * `components/observatory-chrome.test.tsx` para el raíl—, y son inventados
 * justamente porque una prueba que cuelga del catálogo real deja de probar esta
 * rama el día que el catálogo se completa, sin fallar al hacerlo.
 */
export function observatoryCatalog(locale: Locale): SpecimenEntry[] {
  return OBSERVATION_ORDER.map((id, i) => {
    const world = getWorld(id, locale);
    const observatory = world.prose.observatory;
    return {
      id,
      index: i + 1,
      name: world.cosmicName,
      descriptor: observatory?.descriptor ?? null,
      pair: observatory?.pair ?? null,
      href: observatoryHref(id, locale),
    };
  });
}
