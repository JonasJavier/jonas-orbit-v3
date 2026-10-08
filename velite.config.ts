import { existsSync } from "node:fs";
import { join } from "node:path";
import { defineCollection, defineConfig, s } from "velite";
import {
  ARCHITECTURE_LANES,
  F1A_PROJECT_IDS,
  PROJECT_IDS,
  projectsData,
} from "./content/projects.data";
import { articleHeadings, readingMinutes, rehypeHeadingIds } from "./content/article-outline";
import { ARTICLE_IDS } from "./content/articles.data";
import projectsMedia from "./content/projects-media.json";
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
      /**
       * Lo que ve un buscador, no la página: `title` y `summary` son la voz
       * de la sección («Sobre mí»); estos dos dicen quién y qué para quien
       * todavía no conoce el sitio. El layout añade « · Jonás Javier» al
       * título, así que 55 + 15 caracteres caben enteros en un resultado.
       */
      seoTitle: s.string().max(55),
      seoDescription: s.string().min(110).max(160),
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
          /** Texto y metadatos del espécimen, separados de los de la sección. */
          summary: s.string().max(200).optional(),
          seoTitle: s.string().max(55).optional(),
          seoDescription: s.string().min(110).max(160).optional(),
          /*
            Notas de construcción: cómo está hecho el cuerpo, en hechos que se
            pueden rastrear hasta el código o el documento de diseño. No es el
            registro —ése cuenta el proceso con la voz de Jonás— sino la ficha
            técnica que la cara servida enseña plegada, y la que lee quien llega
            sin WebGL o desde un buscador.
          */
          notes: s.array(s.string().max(320)).min(2).max(4).optional(),
          /*
            El registro recoge el proceso escrito, no los metadatos de búsqueda.
            Si falta, el instrumento `REGISTRO` simplemente no aparece.
            Inventar una intención violaría la regla 8.
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
      // Cada `##` lleva su id para el índice lateral (`content/article-outline.ts`).
      body: s.mdx({ rehypePlugins: [rehypeHeadingIds] }),
      raw: s.raw(),
      path: s.path(),
    })
    .transform(({ raw, ...data }) => ({
      ...data,
      locale: data.path.split("/")[0],
      headings: articleHeadings(raw),
      readingMinutes: readingMinutes(raw),
    })),
});

/**
 * Una captura de proyecto. `frame` dice qué aparato la produjo, no cómo se
 * pinta: `mobile` sólo puede llevarlo una imagen más alta que ancha, y eso lo
 * comprueba el validador contra las dimensiones que registra
 * `tools/prepare-projects.mjs` — es lo que evita un campo de dimensiones a mano
 * (`docs/design/endurance-proyectos.md` §6).
 */
const projectImage = s.object({
  src: s.string(),
  alt: s.string(),
  caption: s.string(),
  frame: s.enum(["desktop", "mobile"]).optional(),
  /**
   * El módulo del producto que enseña la captura («Reservas», «App móvil»).
   * Con él, las pantallas del caso completo se recorren por módulos y no en
   * un solo montón: o lo llevan todas las capturas del proyecto, o ninguna
   * (lo comprueba `validate-projects.ts`).
   */
  module: s.string().max(32).optional(),
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
      /** El stack de un vistazo: lo que se graba en la mesa y va en la ficha. */
      technologies: s.array(s.string()).min(1),
      /**
       * EL STACK COMPLETO, agrupado («Backend», «App móvil», «Calidad y
       * CI»…): la sección «Tecnologías» del caso. `technologies` es la
       * cabecera; esto, el inventario entero con su versión.
       */
      stack: s
        .array(
          s.object({
            group: s.string().max(32),
            items: s.array(s.string()).min(1),
          }),
        )
        .optional(),
      highlights: s.array(s.string()).min(1),
      featuredImage: projectImage,
      gallery: s.array(projectImage).optional(),
      /**
       * ALCANCE (§17): tres cifras que el propio texto del caso afirma —dos
       * sucursales, dieciocho aplicaciones, doce pruebas—, nunca una métrica
       * de negocio que el caso no publica. `value` es corto a propósito (una
       * cifra o una sigla): se lee de lejos, en la mesa y en el caso.
       */
      scope: s
        .array(
          s.object({
            value: s.string().max(8),
            label: s.string().max(48),
          }),
        )
        .length(3)
        .optional(),
      /**
       * DECISIONES DE DISEÑO (§17): qué problema de experiencia tenía una
       * pantalla y qué se decidió. Son la capa Diseño de la mesa y la sección
       * de decisiones del caso. `screen` es una captura del propio proyecto
       * (lo comprueba `validate-projects.ts`), y cada línea es corta: una
       * frase, no un párrafo.
       */
      designDecisions: s
        .array(
          s.object({
            screen: s.string(),
            problem: s.string().max(110),
            decision: s.string().max(120),
          }),
        )
        .optional(),
      /**
       * LA ARQUITECTURA ES CONTENIDO, NO DIBUJO (§3.2 del documento de la
       * mesa). El esquema de Ingeniería sale de aquí y la página sólo lo
       * dispone. Un nodo con `screen` es una captura de la mesa que en esa
       * capa se convierte en nodo; un nodo sin `screen` es una pieza sin
       * pantalla (base de datos, worker, API). `decision` es lo que hace del
       * esquema un mapa de criterio y no un diagrama de stack.
       *
       * Las reglas que lo hacen honesto (aristas a nodos existentes, pantallas
       * presentes en la mesa, mínimo por caso completo) viven en
       * `validate-projects.ts`, cubiertas por fixtures.
       */
      architecture: s
        .object({
          nodes: s
            .array(
              s.object({
                id: s.string().regex(/^[a-z0-9-]+$/),
                label: s.string(),
                lane: s.enum(ARCHITECTURE_LANES),
                screen: s.string().optional(),
                decision: s.string().optional(),
                /**
                 * Con qué está hecho ESTE módulo («Django REST Framework
                 * 3.16», «simplejwt»): el inspector lo dice al elegirlo.
                 */
                tech: s.array(s.string()).optional(),
              }),
            )
            .min(1),
          edges: s.array(s.array(s.string()).length(2)).default([]),
        })
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
      seoTitle: s.string().max(60),
      seoDescription: s.string().min(110).max(160),
      // Cada `##` lleva su id para el índice lateral (`content/article-outline.ts`).
      body: s.mdx({ rehypePlugins: [rehypeHeadingIds] }),
      raw: s.raw(),
      path: s.path(),
    })
    .transform(({ raw, ...data }) => ({
      ...data,
      locale: data.path.split("/")[0],
      headings: articleHeadings(raw),
      readingMinutes: readingMinutes(raw),
    })),
});

/**
 * Notas de taller: artículos largos sobre cómo se hizo una pieza del sitio.
 * Viven bajo Experimentos; su identidad está en `content/articles.data.ts`.
 */
const articleProse = defineCollection({
  name: "ArticleProse",
  pattern: "{es,en}/articles/*.mdx",
  schema: s
    .object({
      id: s.enum(ARTICLE_IDS),
      slug: s.string().regex(/^[a-z0-9-]+$/),
      title: s.string(),
      summary: s.string().max(220),
      coverAlt: s.string(),
      seoTitle: s.string().max(60),
      seoDescription: s.string().min(110).max(160),
      // Cada `##` lleva su id para el índice lateral (`content/article-outline.ts`).
      body: s.mdx({ rehypePlugins: [rehypeHeadingIds] }),
      raw: s.raw(),
      path: s.path(),
    })
    .transform(({ raw, ...data }) => ({
      ...data,
      locale: data.path.split("/")[0],
      headings: articleHeadings(raw),
      readingMinutes: readingMinutes(raw),
    })),
});

export default defineConfig({
  root: "content",
  collections: { worldProse, projectProse, articleProse },
  prepare: ({ worldProse, projectProse, articleProse }) => {
    // Cada nota en cada idioma publicado, una sola vez, y sin dos slugs
    // iguales en el mismo idioma (compartirían URL).
    for (const locale of PUBLISHED_LOCALES) {
      const inLocale = articleProse.filter((article) => article.locale === locale);
      for (const id of ARTICLE_IDS) {
        const count = inLocale.filter((article) => article.id === id).length;
        if (count !== 1) throw new Error(`Nota «${id}» en «${locale}»: ${count} archivos, se espera 1.`);
      }
      const slugs = new Set(inLocale.map((article) => article.slug));
      if (slugs.size !== inLocale.length) throw new Error(`Dos notas comparten slug en «${locale}».`);
    }

    // Todas las validaciones que rompen el build viven en una función pura
    // (content/validate-worlds.ts) para poder cubrirlas con fixtures.
    validateWorldProse(worldProse, PUBLISHED_LOCALES, WORLD_IDS, worldsData);
    validateProjectProse(
      projectProse,
      PUBLISHED_LOCALES,
      PROJECT_IDS,
      F1A_PROJECT_IDS,
      projectsData,
      // Lo publicado de cada captura es su escalera WebP; el PNG maestro se
      // queda en `assets/` (ver `tools/prepare-projects.mjs`).
      (src) => {
        const entry = projectsMedia[src as keyof typeof projectsMedia];
        return (
          entry !== undefined &&
          entry.steps.length > 0 &&
          entry.steps.every((step) =>
            existsSync(join(process.cwd(), "public", src.replace(/\.png$/, `-${step}.webp`))),
          )
        );
      },
      // Dimensiones medidas por `tools/prepare-projects.mjs`, no declaradas.
      (src) => projectsMedia[src as keyof typeof projectsMedia] ?? null,
    );
  },
});
