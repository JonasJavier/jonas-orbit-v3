import type { Metadata } from "next";
import type { Locale } from "@/content/site.data";
import { SITE_OPEN_GRAPH } from "./site-metadata";
import { getWorldPath, type World } from "./worlds";

/**
 * Metadata de una página de mundo.
 *
 * Vive en un solo sitio porque las 7 rutas la comparten y porque el riesgo que
 * cubre el test G2 es precisamente que dos de ellas acaben con el mismo título
 * o el mismo canonical: ocho páginas indexables mal etiquetadas se canibalizan
 * entre sí y comparten peor que una sola.
 *
 * `title` es la prosa localizada y `description` su `summary`, así que ambos
 * salen distintos por construcción — no por disciplina de quien edite.
 */
export function buildWorldMetadata(world: World, locale: Locale): Metadata {
  const path = getWorldPath(world, locale);

  return {
    title: world.prose.title,
    description: world.prose.summary,
    alternates: { canonical: path },
    openGraph: {
      ...SITE_OPEN_GRAPH,
      type: "article",
      title: `${world.prose.title} · ${world.cosmicName}`,
      description: world.prose.summary,
      url: path,
    },
  };
}
