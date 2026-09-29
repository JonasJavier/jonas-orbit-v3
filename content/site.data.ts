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
  /**
   * Cómo se le busca de verdad: sin tildes, sin el apellido o con él solo.
   * Van a `alternateName` en JSON-LD para que el buscador una las variantes.
   */
  alternateNames: ["Jonás Javier", "Jonas Javier Encarnacion", "Jonas Javier", "Jonás Encarnación"],
  /** Retrato publicado en «Sobre mí» (F40), para `image` en JSON-LD. */
  portrait: "/images/sobre-mi/F40-960.webp",
  jobTitle: "Desarrollador full-stack y diseñador UX/UI",
  email: "jonasjavier.dev@gmail.com",
  phone: "+18498625049",
  whatsapp: "18498625049",
  linkedin: "https://www.linkedin.com/in/jonas-javier-247b50425",
  github: "https://github.com/JonasJavier",
  locality: "Santo Domingo",
  country: "DO",
  /** Para `knowsAbout` en JSON-LD: sólo lo que un caso o experimento publicado prueba. */
  /** Idiomas que el sitio acredita (Formación: inglés avanzado en curso). */
  languages: ["es", "en"],
  knowsAbout: [
    "Desarrollo full-stack",
    "Django",
    "Django REST Framework",
    "React",
    "TypeScript",
    "Next.js",
    "PostgreSQL",
    "React Native",
    "Three.js",
    "WebGL",
    "Diseño UX/UI",
    "Fotografía",
  ],
} as const;
