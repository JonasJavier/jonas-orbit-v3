import type { Locale } from "@/content/site.data";
import type { WorldId } from "@/content/worlds.data";

/**
 * Los especímenes montados, y el slug de URL de cada uno.
 *
 * La identidad canónica sigue siendo `WorldId` (regla 4): el slug se resuelve
 * aquí, en el borde, y nada más abajo vuelve a mirar la URL. Montar uno nuevo
 * es añadir una línea a esta lista y nada más — la recepción, el raíl, el
 * sitemap y `generateStaticParams` salen todos de aquí.
 *
 * El orden es el del montaje, no el del catálogo (ése lo fija
 * `OBSERVATION_ORDER`): Tesseracto y Endurance primero; Gargantúa, la tercera,
 * demostró que esta tabla era de verdad el único sitio; la Ranger costó
 * descubrir que el laboratorio la iluminaba por donde nadie había mirado
 * (`lib/observatory.ts`); Miller y Edmunds cierran el `06 / 06` y son las dos
 * únicas donde lo que se observa es luz sobre material y nada más.
 */
export const OBSERVATORY_IDS: readonly WorldId[] = [
  "tesseract",
  "endurance",
  "gargantua",
  "ranger",
  "miller",
  "edmunds",
];

/**
 * El slug es el id salvo donde el idioma pide otra palabra. Los nombres de los
 * cuerpos son propios y no se traducen; «Tesseracto» es la excepción, porque en
 * español la palabra lleva la c de «tesseracto» y en inglés es «tesseract».
 */
const LOCALIZED_SLUGS: Partial<Record<WorldId, Record<Locale, string>>> = {
  tesseract: { es: "tesseracto", en: "tesseract" },
};

export function observatorySlug(id: WorldId, locale: Locale): string {
  return LOCALIZED_SLUGS[id]?.[locale] ?? id;
}

/** El espécimen montado detrás de un slug de URL, o `undefined`. */
export function observatoryIdBySlug(slug: string, locale: Locale): WorldId | undefined {
  return OBSERVATORY_IDS.find((id) => observatorySlug(id, locale) === slug);
}
