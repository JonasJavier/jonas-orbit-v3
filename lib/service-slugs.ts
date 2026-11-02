import type { Locale } from "@/content/site.data";

/**
 * Los servicios con página propia, y el slug de URL de cada uno (2026-11-01).
 *
 * Cuelgan de Servicios (`/es/contacto/servicios/software-a-medida`): una
 * página por intención de búsqueda en vez de una sola compitiendo por todas.
 * El slug español nombra lo que se busca en República Dominicana; el inglés,
 * lo que se busca para contratar en remoto. Como los especímenes, la
 * identidad es el id y el slug se resuelve aquí, en el borde: la página, el
 * sitemap y `generateStaticParams` salen de esta lista.
 */
export const SERVICE_IDS = ["software", "web", "mobile", "3d"] as const;

export type ServiceId = (typeof SERVICE_IDS)[number];

const SLUGS: Record<ServiceId, Record<Locale, string>> = {
  software: { es: "software-a-medida", en: "custom-software" },
  web: { es: "paginas-web", en: "websites" },
  mobile: { es: "apps-moviles", en: "mobile-apps" },
  "3d": { es: "desarrollo-3d", en: "3d-development" },
};

export function serviceSlug(id: ServiceId, locale: Locale): string {
  return SLUGS[id][locale];
}

/** El servicio detrás de un slug de URL, o `undefined`. */
export function serviceIdBySlug(slug: string, locale: Locale): ServiceId | undefined {
  return SERVICE_IDS.find((id) => SLUGS[id][locale] === slug);
}
