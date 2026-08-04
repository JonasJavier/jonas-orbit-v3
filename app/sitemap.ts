import type { MetadataRoute } from "next";
import { PUBLISHED_LOCALES } from "@/content/site.data";
import { getF1AProjects } from "@/lib/projects";
import { absoluteUrl } from "@/lib/site-url";

/**
 * Sitemap de F1A.
 *
 * Solo entran los idiomas PUBLICADOS (F1A: únicamente ES) y las rutas indexables.
 * `/{locale}/contacto/gracias` queda deliberadamente FUERA: el plan la marca
 * `noindex` y fuera del sitemap porque es una confirmación privada, no una
 * página de aterrizaje.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLISHED_LOCALES.flatMap((locale) => [
    {
      url: absoluteUrl(`/${locale}`),
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    ...getF1AProjects(locale).map((project) => ({
      url: absoluteUrl(`/${locale}/proyectos/${project.prose.slug}`),
      lastModified,
      changeFrequency: "monthly" as const,
      // Los casos son la prueba profesional: por debajo del home, por encima
      // de las páginas legales.
      priority: 0.8,
    })),
    {
      url: absoluteUrl(`/${locale}/privacidad`),
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
  ]);
}
