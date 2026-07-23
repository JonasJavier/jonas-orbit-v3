import { worldProse } from "@velite";
import {
  WORLD_IDS,
  worldsData,
  type WorldId,
  type WorldStructuralData,
} from "@/content/worlds.data";
import type { Locale } from "@/content/site.data";

type WorldProse = (typeof worldProse)[number];

export interface World extends WorldStructuralData {
  id: WorldId;
  prose: WorldProse;
}

/**
 * Compone los datos estructurales (neutrales) con la prosa localizada.
 * La unión usa WorldId canónico — nunca el slug de URL, que puede cambiar
 * o localizarse sin romper la relación con la escena.
 */
export function getWorld(id: WorldId, locale: Locale): World {
  const prose = worldProse.find(
    (entry) => entry.id === id && entry.locale === locale,
  );
  if (!prose) {
    // El build de Velite garantiza paridad para idiomas publicados;
    // llegar aquí significa pedir un idioma no publicado.
    throw new Error(`No hay prosa para el mundo "${id}" en "${locale}".`);
  }
  return { id, ...worldsData[id], prose };
}

/** Los 7 mundos de un idioma, en orden narrativo. */
export function getWorlds(locale: Locale): World[] {
  return WORLD_IDS.map((id) => getWorld(id, locale)).sort(
    (a, b) => a.order - b.order,
  );
}
