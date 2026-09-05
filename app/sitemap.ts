import type { MetadataRoute } from "next";
import { PUBLISHED_LOCALES } from "@/content/site.data";
import { getF1AProjects } from "@/lib/projects";
import { absoluteUrl } from "@/lib/site-url";
import { getWorlds } from "@/lib/worlds";

/**
 * Sitemap.
 *
 * Solo entran los idiomas PUBLICADOS (F1A: únicamente ES) y las rutas indexables.
 * `/{locale}/contacto/gracias` queda deliberadamente FUERA: el plan la marca
 * `noindex` y fuera del sitemap porque es una confirmación privada, no una
 * página de aterrizaje.
 *
 * Doce URLs indexables: home, seis destinos, cuatro casos y privacidad.
 * Las rutas se derivan del catálogo vigente; no se conservan destinos retirados.
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
    ...getWorlds(locale).map((world) => ({
      url: absoluteUrl(`/${locale}/${world.prose.slug}`),
      lastModified,
      changeFrequency: "monthly" as const,
      // Por debajo del home y por encima de los casos: son las páginas de
      // aterrizaje temáticas, la puerta de entrada desde una búsqueda.
      priority: 0.9,
    })),
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
