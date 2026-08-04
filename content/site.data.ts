/**
 * Configuración de idiomas del sitio.
 *
 * PUBLISHED_LOCALES controla qué idiomas exigen paridad de contenido en el
 * build (ver velite.config.ts). En F1A solo ES está publicado; EN se añade
 * aquí en F2A cuando su contenido esté completo — nunca antes.
 */
export type Locale = "es" | "en";

export const PUBLISHED_LOCALES: readonly Locale[] = ["es"];

/**
 * Identidad y canales públicos de Jonás, neutrales al idioma.
 *
 * Viven aquí y no en el componente porque los consumen dos sitios que NO pueden
 * divergir: los canales directos de Ranger y el JSON-LD de datos estructurados.
 * Un perfil actualizado en un solo lado sería una mentira publicada en el otro.
 */
export const SITE_PROFILE = {
  name: "Jonás Javier Encarnación",
  jobTitle: "Desarrollador full-stack y diseñador UX/UI",
  email: "jonasjavier.dev@gmail.com",
  whatsapp: "18498625049",
  linkedin: "https://www.linkedin.com/in/jonas-javier-247b50425",
  github: "https://github.com/JonasJavier",
  locality: "Santo Domingo",
  country: "DO",
} as const;
