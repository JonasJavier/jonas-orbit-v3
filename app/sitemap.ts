import type { MetadataRoute } from "next";
import { PUBLISHED_LOCALES } from "@/content/site.data";
import { OBSERVATORY_SLUGS } from "@/lib/observatory-catalog";
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
 * Home, seis destinos, los especímenes montados del Observatorio, cuatro casos
 * y privacidad. Las rutas se derivan del catálogo vigente; no se conservan
 * destinos retirados.
 *
 * Los especímenes entran porque el §1.3 vende «mira la Endurance» como enlace
 * compartible dentro de una candidatura, y hasta ahora esa URL no la conocía
 * nadie: no había un solo enlace hacia ella en todo el repositorio ni una línea
 * en este archivo. Salen de la misma tabla que la recepción y el raíl, así que
 * montar el tercer espécimen lo añade aquí sin tocar este archivo.
 *
 * Sin `lastModified`: sellar cada URL con la fecha del build afirmaría un
 * cambio que no ocurrió, y los buscadores descartan un `lastmod` poco fiable.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLISHED_LOCALES.flatMap((locale) => [
    {
      url: absoluteUrl(`/${locale}`),
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    ...getWorlds(locale).map((world) => ({
      url: absoluteUrl(`/${locale}/${world.prose.slug}`),
      changeFrequency: "monthly" as const,
      // Por debajo del home y por encima de los casos: son las páginas de
      // aterrizaje temáticas, la puerta de entrada desde una búsqueda.
      priority: 0.9,
    })),
    ...Object.keys(OBSERVATORY_SLUGS).map((objeto) => ({
      url: absoluteUrl(`/${locale}/experimentos/observatorio/${objeto}`),
      changeFrequency: "monthly" as const,
      // Por debajo de su sección y a la altura de un caso: es una pieza de
      // trabajo con URL propia, no una página de aterrizaje.
      priority: 0.8,
    })),
    ...getF1AProjects(locale).map((project) => ({
      url: absoluteUrl(`/${locale}/proyectos/${project.prose.slug}`),
      changeFrequency: "monthly" as const,
      // Los casos son la prueba profesional: por debajo del home, por encima
      // de las páginas legales.
      priority: 0.8,
    })),
    {
      url: absoluteUrl(`/${locale}/privacidad`),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
  ]);
}
