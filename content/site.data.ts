/**
 * Configuración de idiomas del sitio.
 *
 * PUBLISHED_LOCALES controla qué idiomas exigen paridad de contenido en el
 * build (ver velite.config.ts). En F1A solo ES está publicado; EN se añade
 * aquí en F2A cuando su contenido esté completo — nunca antes.
 */
const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const PUBLISHED_LOCALES: readonly Locale[] = ["es"];
