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
 * Título y descripción salen de `seoTitle`/`seoDescription` del MDX: la voz de
 * la sección («Sobre mí») se queda en la página y el buscador recibe quién y
 * qué. El esquema de Velite acota su longitud y G2 exige que no se repitan.
 */
export function buildWorldMetadata(world: World, locale: Locale): Metadata {
  const path = getWorldPath(world, locale);

  return {
    title: world.prose.seoTitle,
    description: world.prose.seoDescription,
    alternates: { canonical: path },
    openGraph: {
      ...SITE_OPEN_GRAPH,
      type: "article",
      title: `${world.prose.seoTitle} · Jonás Javier`,
      description: world.prose.seoDescription,
      url: path,
    },
  };
}
