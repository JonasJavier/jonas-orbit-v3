import type { Locale } from "./site.data";
import type { WorldId } from "./worlds.data";

/**
 * Identidad estructural de las entradas del blog, neutral al idioma (regla 4):
 * la prosa —título, slug, cuerpo— vive en `content/{es,en}/articles/*.mdx` y
 * se une a esto por el id, nunca por el slug. El orden de `ARTICLE_IDS` no
 * importa: el blog las ordena por fecha.
 */
export const ARTICLE_IDS = [
  "gargantua-webgl",
  "tesseract-4d",
  "webgl-seo-performance",
  "nextjs-bilingual",
  "interstellar-black-hole-physics",
  "hire-freelance-developer-dr",
  "gargantua-wallpapers",
  "gargantua-vs-real-black-holes",
  "what-is-a-tesseract",
  "black-hole-threejs-tutorial",
] as const;

export type ArticleId = (typeof ARTICLE_IDS)[number];

/** Temas del blog. Su nombre visible está en `components/blog-copy.ts`. */
export type ArticleTopic = "webgl" | "nextjs" | "performance" | "space" | "freelance";

export interface ArticleStructuralData {
  /** Fecha de publicación (ISO). La entrada no cambia de fecha al corregirla. */
  published: string;
  topic: ArticleTopic;
  /** Carpeta de sus imágenes en `public/`; cada una se sirve en `-800.webp` y `-1600.webp`. */
  images: string;
  /**
   * Nombre de la portada dentro de `images`; por idioma cuando la portada es
   * una captura con texto (la página de servicios en español no es la portada
   * de la entrada en inglés).
   */
  cover: string | Record<Locale, string>;
  /** El espécimen del Observatorio del que habla, si habla de uno. */
  specimen?: WorldId;
  /**
   * Fondos de pantalla descargables dentro de `images`, en el orden de la
   * entrada. Cada uno se sirve como figura (`-800`/`-1600.webp` el de
   * escritorio, `-400`/`-800.webp` el del teléfono, `-600`/`-1200.webp` el
   * cuadrado) y como descarga a resolución completa (`<nombre>.jpg`:
   * 3840 × 2160, 1440 × 3120 o 2304 × 2304). Van al sitemap de imágenes y al
   * JSON-LD con su licencia.
   */
  wallpapers?: readonly { name: string; shape: "desktop" | "phone" | "square" }[];
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
  // La física que el simulador enseña, para quien busca «agujero negro de
  // Interstellar» y no «shader»: comparte la carpeta de figuras de la primera.
  "interstellar-black-hole-physics": {
    published: "2026-10-02",
    topic: "space",
    images: "/images/articulos/agujero-negro",
    cover: "gargantua-observatorio",
    specimen: "gargantua",
  },
  // Para quien busca contratar: qué pedir y cómo trabajo. Sin cifras inventadas.
  "hire-freelance-developer-dr": {
    published: "2026-10-02",
    topic: "freelance",
    images: "/images/articulos/freelance",
    cover: { es: "servicios-portada", en: "servicios-portada-en" },
  },
  // Google Imágenes: Gargantúa en 4K y en vertical, capturas nativas del
  // simulador con GPU real (`tools/wallpaper-shots.mjs`). El nombre de cada
  // archivo es parte del SEO; la entrada es la página de esas imágenes.
  "gargantua-wallpapers": {
    published: "2026-10-16",
    topic: "space",
    images: "/images/articulos/fondos-gargantua",
    // Portada: el primer plano (10-27), para que la página la represente
    // Gargantúa llenando el cuadro y no la vista abierta del simulador.
    cover: "gargantua-interstellar-wallpaper-4k-closeup",
    specimen: "gargantua",
    wallpapers: [
      { name: "gargantua-interstellar-wallpaper-4k-closeup", shape: "desktop" },
      { name: "gargantua-interstellar-black-hole-closeup", shape: "square" },
      { name: "gargantua-interstellar-black-hole-extreme-closeup", shape: "square" },
      { name: "gargantua-interstellar-wallpaper-4k-cinematic", shape: "desktop" },
      { name: "gargantua-interstellar-wallpaper-4k-film", shape: "desktop" },
      { name: "gargantua-interstellar-wallpaper-4k-lens", shape: "desktop" },
      { name: "gargantua-interstellar-wallpaper-4k-disk", shape: "desktop" },
      { name: "gargantua-interstellar-wallpaper-4k-shadow", shape: "desktop" },
      { name: "gargantua-interstellar-wallpaper-phone-cinematic", shape: "phone" },
      { name: "gargantua-interstellar-wallpaper-phone-lens", shape: "phone" },
      { name: "gargantua-interstellar-wallpaper-phone-shadow", shape: "phone" },
    ],
  },
  // Las tres de 10-27 contestan búsquedas que Search Console ya traía
  // (`docs/difusion/borradores/<id>/notas.md`). Gargantúa frente a los dos
  // agujeros negros fotografiados: portada en la vista Disco, entero.
  "gargantua-vs-real-black-holes": {
    published: "2026-10-27",
    topic: "space",
    images: "/images/articulos/agujero-negro",
    cover: "gargantua-agujero-negro-comparacion",
    specimen: "gargantua",
  },
  // La divulgativa del teseracto; la de código es `tesseract-4d`.
  "what-is-a-tesseract": {
    published: "2026-10-27",
    topic: "space",
    images: "/images/articulos/teseracto",
    cover: "que-es-un-teseracto-hipercubo-4d",
    specimen: "tesseract",
  },
  // El tutorial mínimo para copiar; la portada es la captura de su propio código.
  "black-hole-threejs-tutorial": {
    published: "2026-10-27",
    topic: "webgl",
    images: "/images/articulos/agujero-negro-tutorial",
    cover: "agujero-negro-three-js-tutorial",
    specimen: "gargantua",
  },
};
