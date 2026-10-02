/**
 * Configuración de idiomas del sitio.
 *
 * PUBLISHED_LOCALES controla qué idiomas exigen paridad de contenido en el
 * build (ver velite.config.ts) y qué rutas existen. El español es la fuente
 * del contenido; el inglés se publicó el 2026-09-29 y es el idioma POR DEFECTO
 * (decisión de Jonás): `/` lleva a `/en` y `x-default` apunta al inglés. El
 * orden de la lista es el del selector de idioma.
 */
export type Locale = "es" | "en";

export const PUBLISHED_LOCALES: readonly Locale[] = ["en", "es"];

export const DEFAULT_LOCALE: Locale = "en";

export function isPublishedLocale(value: string): value is Locale {
  return (PUBLISHED_LOCALES as readonly string[]).includes(value);
}

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
  /**
   * Retrato publicado en «Sobre mí», para `image` en JSON-LD y para Google
   * Imágenes: el archivo lleva su nombre porque el buscador también lee el
   * nombre del archivo (el original es la F40 del archivo privado).
   */
  portrait: "/images/sobre-mi/jonas-javier-encarnacion-960.webp",
  /** Pie del retrato en JSON-LD (`ImageObject.caption`): quién es y qué hace. */
  portraitCaption: {
    es: "Jonás Javier Encarnación, desarrollador full-stack y diseñador UX/UI en Santo Domingo, República Dominicana",
    en: "Jonás Javier Encarnación, full-stack developer and UX/UI designer in Santo Domingo, Dominican Republic",
  },
  jobTitle: {
    es: "Desarrollador full-stack y diseñador UX/UI",
    en: "Full-stack developer and UX/UI designer",
  },
  email: "jonasjavier.dev@gmail.com",
  phone: "+18498625049",
  whatsapp: "18498625049",
  linkedin: "https://www.linkedin.com/in/jonas-javier-encarnacion/",
  github: "https://github.com/JonasJavier",
  locality: "Santo Domingo",
  country: "DO",
  /** Para `knowsAbout` en JSON-LD: sólo lo que un caso o experimento publicado prueba. */
  /** Idiomas que el sitio acredita (Formación: inglés avanzado en curso). */
  languages: ["es", "en"],
  knowsAbout: {
    es: ["Desarrollo full-stack", "Django", "Django REST Framework", "React", "TypeScript", "Next.js", "PostgreSQL", "React Native", "Three.js", "WebGL", "Diseño UX/UI", "Fotografía"],
    en: ["Full-stack development", "Django", "Django REST Framework", "React", "TypeScript", "Next.js", "PostgreSQL", "React Native", "Three.js", "WebGL", "UX/UI design", "Photography"],
  },
  /** El país, dicho en cada idioma (JSON-LD `nationality`). */
  countryName: { es: "República Dominicana", en: "Dominican Republic" },
} as const;
