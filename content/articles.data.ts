import type { WorldId } from "./worlds.data";

/**
 * Identidad estructural de las entradas del blog, neutral al idioma (regla 4):
 * la prosa —título, slug, cuerpo— vive en `content/{es,en}/articles/*.mdx` y
 * se une a esto por el id, nunca por el slug. El orden de `ARTICLE_IDS` no
 * importa: el blog las ordena por fecha.
 */
export const ARTICLE_IDS = ["gargantua-webgl", "tesseract-4d", "webgl-seo-performance", "nextjs-bilingual"] as const;

export type ArticleId = (typeof ARTICLE_IDS)[number];

/** Temas del blog. Su nombre visible está en `components/blog-copy.ts`. */
export type ArticleTopic = "webgl" | "nextjs" | "performance";

export interface ArticleStructuralData {
  /** Fecha de publicación (ISO). La entrada no cambia de fecha al corregirla. */
  published: string;
  topic: ArticleTopic;
  /** Carpeta de sus imágenes en `public/`; cada una se sirve en `-800.webp` y `-1600.webp`. */
  images: string;
  /** Nombre de la portada dentro de `images`. */
  cover: string;
  /** El espécimen del Observatorio del que habla, si habla de uno. */
  specimen?: WorldId;
}

export const articlesData: Record<ArticleId, ArticleStructuralData> = {
  "gargantua-webgl": {
    published: "2026-09-30",
    topic: "webgl",
    images: "/images/articulos/agujero-negro",
    cover: "gargantua-cinematografica",
    specimen: "gargantua",
  },
  "tesseract-4d": {
    published: "2026-10-01",
    topic: "webgl",
    images: "/images/articulos/teseracto",
    cover: "teseracto-portada",
    specimen: "tesseract",
  },
  "webgl-seo-performance": {
    published: "2026-10-01",
    topic: "performance",
    images: "/images/articulos/portafolio-3d",
    cover: "portafolio-3d-portada",
  },
  "nextjs-bilingual": {
    published: "2026-10-01",
    topic: "nextjs",
    images: "/images/articulos/sitio-bilingue",
    cover: "sitio-bilingue-portada",
  },
};
