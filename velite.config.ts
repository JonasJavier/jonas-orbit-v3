import { defineCollection, defineConfig, s } from "velite";
import { WORLD_IDS } from "./content/worlds.data";
import { PUBLISHED_LOCALES } from "./content/site.data";

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
      /** Ancla localizada de la sección (p. ej. /es#proyectos). */
      slug: s.string().regex(/^[a-z0-9-]+$/),
      title: s.string(),
      eyebrow: s.string(),
      shortLabel: s.string(),
      summary: s.string(),
      introduction: s.string(),
      closing: s.string(),
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

/** Esquemas provisionales — se completan cuando el contenido real llegue (F1A pasos 4-6). */
const projectProse = defineCollection({
  name: "ProjectProse",
  pattern: "{es,en}/projects/*.mdx",
  schema: s
    .object({
      slug: s.string().regex(/^[a-z0-9-]+$/),
      title: s.string(),
      summary: s.string(),
      kind: s.enum(["case-study", "brief"]),
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
  prepare: ({ worldProse }) => {
    const seen = new Set<string>();
    for (const world of worldProse) {
      const key = `${world.locale}/${world.id}`;
      if (seen.has(key)) {
        throw new Error(
          `[content] Mundo duplicado: dos archivos para "${key}". Elimina uno.`,
        );
      }
      seen.add(key);
    }
    for (const locale of PUBLISHED_LOCALES) {
      const missing = WORLD_IDS.filter((id) => !seen.has(`${locale}/${id}`));
      if (missing.length > 0) {
        throw new Error(
          `[content] El idioma publicado "${locale}" no tiene prosa para: ${missing.join(", ")}. ` +
            `Un idioma publicado exige los 7 mundos completos.`,
        );
      }
    }
  },
});
