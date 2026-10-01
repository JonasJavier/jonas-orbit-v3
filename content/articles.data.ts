import type { WorldId } from "./worlds.data";

/**
 * Identidad estructural de las notas de taller, neutral al idioma (regla 4):
 * la prosa —título, slug, cuerpo— vive en `content/{es,en}/articles/*.mdx` y
 * se une a esto por el id, nunca por el slug.
 */
export const ARTICLE_IDS = ["gargantua-webgl"] as const;

export type ArticleId = (typeof ARTICLE_IDS)[number];

interface ArticleStructuralData {
  /** Fecha de publicación (ISO). La nota no cambia de fecha al corregirla. */
  published: string;
  /** El espécimen del Observatorio del que habla la nota. */
  specimen: WorldId;
  /** Base de la imagen de portada; se sirve en `-800.webp` y `-1600.webp`. */
  cover: string;
}

export const articlesData = {
  "gargantua-webgl": {
    published: "2026-09-30",
    specimen: "gargantua",
    cover: "/images/articulos/agujero-negro/gargantua-cinematografica",
  },
} as const satisfies Record<ArticleId, ArticleStructuralData>;
