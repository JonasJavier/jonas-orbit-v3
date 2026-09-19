import type { Locale } from "@/content/site.data";
import type { WorldId } from "@/content/worlds.data";
import { OBSERVATION_ORDER } from "@/lib/observatory";
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

/**
 * Los especímenes montados, por slug de URL.
 *
 * La identidad canónica sigue siendo `WorldId` (regla 4): el slug se resuelve
 * aquí, en el borde, y nada más abajo vuelve a mirar la URL. Montar el tercero
 * es añadir una línea a esta tabla y nada más — la recepción, el raíl, el
 * sitemap y `generateStaticParams` salen todos de aquí.
 */
export const OBSERVATORY_SLUGS: Readonly<Record<string, WorldId>> = {
  tesseracto: "tesseract",
  endurance: "endurance",
  /*
    La tercera, y la que demuestra que la tabla era de verdad el único sitio:
    montarla no tocó la recepción, ni el raíl, ni el sitemap, ni
    `generateStaticParams`. Sigue siendo la muestra 06 del catálogo —ese orden
    lo fija `OBSERVATION_ORDER` y no esta tabla— y ahora tiene puerta.
  */
  gargantua: "gargantua",
};

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
  const slug = Object.keys(OBSERVATORY_SLUGS).find(
    (key) => OBSERVATORY_SLUGS[key] === id,
  );
  return slug ? `/${locale}/experimentos/observatorio/${slug}` : null;
}

/**
 * Los seis, en orden de observación.
 *
 * Nombre, descriptor y par son reales o son `null`: nada se inventa para
 * rellenar una fila. Las cuatro muestras sin montar existen en el catálogo
 * porque **el catálogo dice cuántas hay** — enseñar dos sería mentir sobre el
 * tamaño del laboratorio— y llegan sin `href` porque una puerta que no lleva a
 * ninguna parte es peor que la ausencia de puerta.
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
