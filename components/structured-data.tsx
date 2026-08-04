import { SITE_PROFILE, type Locale } from "@/content/site.data";
import { absoluteUrl } from "@/lib/site-url";

/**
 * Datos estructurados del home (Person + WebSite).
 *
 * Regla de contenido honesto del plan: aquí solo entran hechos verificables y
 * ya publicados en el propio sitio. Nada de premios, valoraciones, número de
 * clientes ni métricas que no puedan comprobarse.
 */
export function StructuredData({ locale }: { locale: Locale }) {
  const home = absoluteUrl(`/${locale}`);

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${home}#jonas`,
        name: SITE_PROFILE.name,
        jobTitle: SITE_PROFILE.jobTitle,
        email: `mailto:${SITE_PROFILE.email}`,
        url: home,
        address: {
          "@type": "PostalAddress",
          addressLocality: SITE_PROFILE.locality,
          addressCountry: SITE_PROFILE.country,
        },
        sameAs: [SITE_PROFILE.github, SITE_PROFILE.linkedin],
      },
      {
        "@type": "WebSite",
        "@id": `${home}#website`,
        name: "Jonás Orbit",
        url: home,
        inLanguage: locale,
        author: { "@id": `${home}#jonas` },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // `<` escapado: impide que un valor futuro cierre el <script> y se
      // convierta en una inyección de markup.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(graph).replace(/</g, "\\u003c"),
      }}
    />
  );
}
