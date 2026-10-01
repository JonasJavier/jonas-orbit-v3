import type { Locale } from "@/content/site.data";

/**
 * Los segmentos de URL que no son de ningún mundo, en cada idioma.
 *
 * Módulo sin dependencias a propósito: lo lee también el cliente
 * (`isObservatoryPath`, en la escena persistente) y `page-paths.ts` arrastra
 * todo el contenido compilado de Velite.
 */
export const PATH_SEGMENTS = {
  observatory: { es: "observatorio", en: "observatory" },
  thanks: { es: "gracias", en: "thanks" },
  services: { es: "servicios", en: "services" },
  privacy: { es: "privacidad", en: "privacy" },
  // La misma palabra en los dos idiomas: «blog» es como se busca también en español.
  blog: { es: "blog", en: "blog" },
} as const satisfies Record<string, Record<Locale, string>>;
