import type { WorldId } from "./worlds.data";

/**
 * Validaciones de contenido que ROMPEN el build (plan, sección Contenido).
 *
 * Función pura para poder probarla con fixtures (Appendix A: A3, A4, A5) sin
 * arrancar un build completo de Velite. La invoca `velite.config.ts` dentro de
 * `prepare()`, de modo que cualquier violación aborta `npm run build`.
 *
 * Cubre las validaciones estructurales y de prosa; la validación de "id
 * desconocido" (A2) la impone el esquema `s.enum(WORLD_IDS)` de Velite, y
 * "propiedad estructural faltante" la impone el tipo `WorldStructuralData`.
 */

/** Subconjunto de la prosa de Velite que necesitamos para validar. */
export interface WorldProseLike {
  id: string;
  slug: string;
  locale: string;
}

/** Subconjunto de los datos estructurales que necesitamos para validar. */
export interface WorldStructuralLike {
  order: number;
}

export function validateWorldProse(
  entries: readonly WorldProseLike[],
  publishedLocales: readonly string[],
  worldIds: readonly WorldId[],
  worldsData: Record<WorldId, WorldStructuralLike>,
): void {
  // 1. Estructura: el orden narrativo debe ser único (A4). El plan lo lista
  //    como validación que rompe el build; antes solo lo cubría un test unit.
  const orderOwner = new Map<number, WorldId>();
  for (const id of worldIds) {
    const { order } = worldsData[id];
    const clash = orderOwner.get(order);
    if (clash) {
      throw new Error(
        `[content] Orden narrativo repetido: "${id}" y "${clash}" comparten order=${order}. ` +
          `Cada mundo necesita un orden único.`,
      );
    }
    orderOwner.set(order, id);
  }

  // 2. Prosa: sin dos archivos para el mismo mundo+idioma.
  const seen = new Set<string>();
  for (const world of entries) {
    const key = `${world.locale}/${world.id}`;
    if (seen.has(key)) {
      throw new Error(
        `[content] Mundo duplicado: dos archivos para "${key}". Elimina uno.`,
      );
    }
    seen.add(key);
  }

  // 3. Prosa: paridad exigida SOLO a idiomas publicados (A3 rompe; A5 tolera EN).
  for (const locale of publishedLocales) {
    const missing = worldIds.filter((id) => !seen.has(`${locale}/${id}`));
    if (missing.length > 0) {
      throw new Error(
        `[content] El idioma publicado "${locale}" no tiene prosa para: ${missing.join(", ")}. ` +
          `Un idioma publicado exige los ${worldIds.length} mundos completos.`,
      );
    }
  }

  // 4. Prosa: las anclas (slug) deben ser únicas dentro de cada idioma; dos
  //    slugs iguales producen ids de DOM duplicados y deep links rotos (A23).
  const slugsByLocale = new Map<string, Set<string>>();
  for (const world of entries) {
    const set = slugsByLocale.get(world.locale) ?? new Set<string>();
    if (set.has(world.slug)) {
      throw new Error(
        `[content] Ancla duplicada: dos mundos con slug "${world.slug}" en "${world.locale}". ` +
          `Las anclas deben ser únicas por idioma.`,
      );
    }
    set.add(world.slug);
    slugsByLocale.set(world.locale, set);
  }
}
