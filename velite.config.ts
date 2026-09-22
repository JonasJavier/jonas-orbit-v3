import { existsSync } from "node:fs";
import { join } from "node:path";
import { defineCollection, defineConfig, s } from "velite";
import {
  F1A_PROJECT_IDS,
  PROJECT_IDS,
  projectsData,
} from "./content/projects.data";
import { WORLD_IDS, worldsData } from "./content/worlds.data";
import { PUBLISHED_LOCALES } from "./content/site.data";
import { validateProjectProse } from "./content/validate-projects";
import { validateWorldProse } from "./content/validate-worlds";

/**
 * Pipeline ÚNICO de contenido (decisión del plan: Velite, prohibido añadir
 * un segundo pipeline MDX sin retirar este).
 *
 * Validaciones que ROMPEN el build (plan, sección Contenido):
 *  - MDX con id desconocido            → s.enum(WORLD_IDS)
 *  - dos archivos para el mismo mundo+idioma → chequeo en prepare()
 *  - mundo sin prosa en idioma publicado     → chequeo en prepare()
 *  - propiedad estructural faltante          → tipos + tests de worlds.data
 * La paridad se exige SOLO a PUBLISHED_LOCALES (F1A: solo ES).
 */

const worldProse = defineCollection({
  name: "WorldProse",
  pattern: "{es,en}/worlds/*.mdx",
  schema: s
    .object({
      id: s.enum(WORLD_IDS),
      /** Segmento de ruta localizado (p. ej. /es/proyectos). */
      slug: s.string().regex(/^[a-z0-9-]+$/),
      title: s.string(),
      eyebrow: s.string(),
      shortLabel: s.string(),
      summary: s.string(),
      introduction: s.string(),
      closing: s.string(),
      /**
       * La ficha de laboratorio del ESPÉCIMEN, no de la sección.
       *
       * Es la distinción que obligó a añadir este bloque: todo lo demás de este
       * archivo describe el mundo como sección del sitio —«Experimentos»,
       * «Cosas que construyo para explorar una idea»— y el Observatorio no
       * enseña una sección, enseña un objeto. El resumen de la sección puesto
       * bajo el nombre del Tesseracto habla de otra cosa.
       *
       * Y va SEPARADO de `DATOS`, que es medición pura: llamadas de dibujo,
       * materiales, vértices y conteos que salen del modelo. Aquí vive el
       * objeto como experimento de diseño —qué se buscaba, qué falló, qué
       * quedó— y ninguno de los dos puede colarse en el otro. Mezclarlos
       * convertiría una medida en una opinión o al revés.
       *
       * Opcional a propósito: los cuatro especímenes que aún no se montan no
       * tienen registro, y el instrumento simplemente no aparece. Inventarles
       * una intención sería exactamente el contenido de relleno que prohíbe la
       * regla 8.
       */
      observatory: s
        .object({
          /** Una línea bajo el nombre. Dos o tres palabras, no una frase. */
          descriptor: s.string().max(40),
          /**
           * El par instrumental del §14.1: `CRISTAL / CUARTA DIMENSIÓN`.
           *
           * Habla del objeto COMO OBJETO, nunca de la sección del sitio. Es
           * otro eje que la arquitectura narrativa y por eso no la contradice
           * — queda escrito aquí y en el documento para que nadie lo «arregle»
           * dentro de seis meses.
           */
          pair: s.string().max(40),
          /*
            El registro es lo ÚNICO opcional de este bloque, y es lo que separa
            una muestra montada de una que sólo está catalogada. Los cuatro
            especímenes que aún no se observan tienen nombre, descriptor y par
            —son datos del objeto, que existe— y no tienen proceso escrito,
            porque no lo hay. El instrumento `REGISTRO` simplemente no aparece.
            Inventarles una intención sería el contenido de relleno que prohíbe
            la regla 8.
          */
          registro: s
            .object({
              intencion: s.string(),
              prueba: s.string(),
              construccion: s.string(),
              resultado: s.string(),
              iteraciones: s.string(),
            })
            .optional(),
        })
        .optional(),
      creativity: s.object({
        heroLine: s.string(),
        statement: s.string(),
        note: s.string(),
        collections: s.array(s.object({ id: s.string(), label: s.string(), description: s.string() })).min(1),
        artworks: s.array(s.object({
          id: s.string().regex(/^[a-z0-9-]+$/),
          title: s.string(),
          alt: s.string(),
          caption: s.string(),
          collection: s.string(),
          medium: s.enum(["photo", "poster", "composite", "editorial", "interface"]),
          /** Enlace opcional al prototipo vivo de una pieza de interfaz. */
          prototypeHref: s.string().regex(/^https:\/\/www\.figma\.com\/proto\//).optional(),
          source: s.string(),
          width: s.number().positive(),
          height: s.number().positive(),
        })).min(1),
      }).optional(),
      education: s.object({
        heroLine: s.string(),
        philosophy: s.string(),
        certificates: s.array(s.object({
          id: s.string(),
          title: s.string(),
          issuer: s.string(),
          date: s.string().optional(),
          detail: s.string(),
          category: s.enum(["code", "design", "marketing"]),
          kind: s.enum(["program", "role", "course"]),
          href: s.string(),
          preview: s.string(),
        })).min(1),
        /**
         * Formación EN CURSO: sin `href` ni `preview` a propósito. Lo que está
         * en marcha no tiene documento todavía y no se presenta como terminado
         * (regla 8: contenido honesto). Cuando exista el certificado, la
         * entrada se mueve a `certificates`, no se duplica.
         */
        inProgress: s.array(s.object({
          id: s.string().regex(/^[a-z0-9-]+$/),
          title: s.string(),
          issuer: s.string().optional(),
          detail: s.string(),
          area: s.enum(["code", "languages"]),
        })).optional(),
      }).optional(),
      facts: s.array(s.object({ value: s.string(), label: s.string() })).min(1),
      panels: s
        .array(
          s.object({
            eyebrow: s.string(),
            title: s.string(),
            description: s.string(),
            tags: s.array(s.string()).optional(),
          }),
        )
        .min(1),
      body: s.mdx(),
      path: s.path(),
    })
    .transform((data) => ({ ...data, locale: data.path.split("/")[0] })),
});

/** Proyectos reales localizados; la estructura neutral vive en projects.data.ts. */
const projectProse = defineCollection({
  name: "ProjectProse",
  pattern: "{es,en}/projects/*.mdx",
  schema: s
    .object({
      id: s.enum(PROJECT_IDS),
      slug: s.string().regex(/^[a-z0-9-]+$/),
      title: s.string(),
      eyebrow: s.string(),
      summary: s.string(),
      statusLabel: s.string(),
      role: s.string(),
      problem: s.string(),
      contribution: s.string(),
      decision: s.string(),
      technologies: s.array(s.string()).min(1),
      highlights: s.array(s.string()).min(1),
      featuredImage: s.object({
        src: s.string(),
        alt: s.string(),
        caption: s.string(),
      }),
      gallery: s
        .array(
          s.object({
            src: s.string(),
            alt: s.string(),
            caption: s.string(),
          }),
        )
        .optional(),
      links: s
        .array(
          s.object({
            label: s.string(),
            href: s.string(),
            kind: s.enum(["repository", "demo", "contact"]),
          }),
        )
        .optional(),
      seoTitle: s.string(),
      seoDescription: s.string(),
      body: s.mdx(),
      path: s.path(),
    })
    .transform((data) => ({ ...data, locale: data.path.split("/")[0] })),
});

const designProse = defineCollection({
  name: "DesignProse",
  pattern: "{es,en}/designs/*.mdx",
  schema: s
    .object({
      slug: s.string().regex(/^[a-z0-9-]+$/),
      title: s.string(),
      summary: s.string(),
      body: s.mdx(),
      path: s.path(),
    })
    .transform((data) => ({ ...data, locale: data.path.split("/")[0] })),
});

export default defineConfig({
  root: "content",
  collections: { worldProse, projectProse, designProse },
  prepare: ({ worldProse, projectProse }) => {
    // Todas las validaciones que rompen el build viven en una función pura
    // (content/validate-worlds.ts) para poder cubrirlas con fixtures.
    validateWorldProse(worldProse, PUBLISHED_LOCALES, WORLD_IDS, worldsData);
    validateProjectProse(
      projectProse,
      PUBLISHED_LOCALES,
      PROJECT_IDS,
      F1A_PROJECT_IDS,
      projectsData,
      (src) => existsSync(join(process.cwd(), "public", src)),
    );
  },
});
