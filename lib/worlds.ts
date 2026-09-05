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
 * Segmentos de `/[locale]` que NO son mundos.
 *
 * El segmento dinámico `[mundo]` resuelve cualquier cosa que no case con una
 * carpeta estática, así que un mundo que se llamara "privacidad" secuestraría
 * silenciosamente la página legal. El test G1 lo impide.
 */
export const RESERVED_SEGMENTS: readonly string[] = ["privacidad"];

/**
 * Mundos con página propia escrita a mano porque su contenido no es solo prosa:
 * Endurance monta el índice de proyectos y Ranger el formulario de contacto.
 * El segmento dinámico no los genera — su carpeta estática ya existe.
 */
export const BESPOKE_WORLD_IDS: readonly WorldId[] = ["endurance", "ranger"];

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

/** Los 6 mundos de un idioma, en orden narrativo. */
export function getWorlds(locale: Locale): World[] {
  return WORLD_IDS.map((id) => getWorld(id, locale)).sort(
    (a, b) => a.order - b.order,
  );
}

/**
 * Ruta pública de un mundo.
 *
 * Es la única función que sabe cómo se construye una URL de mundo: el resto del
 * sitio pide la ruta, nunca la concatena. Cambiar un slug es entonces editar un
 * frontmatter, no perseguir plantillas de string por el repositorio.
 */
export function getWorldPath(world: World, locale: Locale): string {
  return `/${locale}/${world.prose.slug}`;
}

/** Resuelve un segmento de URL a su mundo. Devuelve undefined si no existe. */
export function getWorldBySlug(
  slug: string,
  locale: Locale,
): World | undefined {
  return getWorlds(locale).find((world) => world.prose.slug === slug);
}

/** Vecinos en el orden narrativo. Sustituye al scroll continuo de F1A. */
export function getWorldNeighbours(world: World, locale: Locale) {
  const worlds = getWorlds(locale);
  const index = worlds.findIndex((candidate) => candidate.id === world.id);
  return {
    previous: index > 0 ? worlds[index - 1] : undefined,
    next: index < worlds.length - 1 ? worlds[index + 1] : undefined,
  };
}

/**
 * Proyección mínima de un mundo para navegación y para el mapa del sistema.
 *
 * Lleva `href` ya resuelto y NADA de prosa larga: es lo que cruza a los
 * componentes de shell, que se renderizan en todas las rutas.
 */
export interface WorldNavItem {
  id: WorldId;
  order: number;
  accent: string;
  secondary: string;
  cosmicName: string;
  visual: WorldStructuralData["visual"];
  placement: WorldStructuralData["placement"];
  shortLabel: string;
  title: string;
  summary: string;
  href: string;
}

function toWorldNavItem(world: World, locale: Locale): WorldNavItem {
  return {
    id: world.id,
    order: world.order,
    accent: world.accent,
    secondary: world.secondary,
    cosmicName: world.cosmicName,
    visual: world.visual,
    placement: world.placement,
    shortLabel: world.prose.shortLabel,
    title: world.prose.title,
    summary: world.prose.summary,
    href: getWorldPath(world, locale),
  };
}

/** Los 6 mundos como destinos navegables, en orden narrativo. */
export function getWorldNavItems(locale: Locale): WorldNavItem[] {
  return getWorlds(locale).map((world) => toWorldNavItem(world, locale));
}
