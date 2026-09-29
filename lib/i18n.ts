import type { Locale } from "@/content/site.data";

/**
 * Texto de interfaz en los dos idiomas, junto al componente que lo usa.
 *
 * La prosa del sitio vive en `content/{es,en}/*.mdx`; esto es sólo el texto
 * de los mandos —botones, etiquetas, estados— que no es contenido de nadie y
 * que perdería el hilo si se mudara a un diccionario lejano. El español fija
 * la forma y el inglés debe tener exactamente las mismas claves: `NoInfer`
 * impide que una clave olvidada en inglés pase el typecheck.
 */
export function defineCopy<T>(table: { es: T; en: NoInfer<T> }): Record<Locale, T> {
  return table;
}

/** `og:locale` de cada idioma: el español se escribe desde Santo Domingo. */
export const OG_LOCALE: Record<Locale, string> = { es: "es_DO", en: "en_US" };
