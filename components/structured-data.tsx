import { SITE_PROFILE, type Locale } from "@/content/site.data";
import { absoluteUrl } from "@/lib/site-url";

/**
 * Datos estructurados (Person + WebSite en la home, BreadcrumbList en las
 * páginas de mundo).
 *
 * Regla de contenido honesto del plan: aquí solo entran hechos verificables y
 * ya publicados en el propio sitio. Nada de premios, valoraciones, número de
 * clientes ni métricas que no puedan comprobarse.
 */
export function StructuredData({
  locale,
  breadcrumb,
}: {
  locale: Locale;
  /**
   * Ruta y nombre de la página actual cuando NO es la home. Con ocho páginas
   * indexables, la miga de pan es lo que le dice a un buscador que `/es` es el
   * padre y no un octavo documento suelto.
   */
  breadcrumb?: { path: string; name: string };
}) {
  const home = absoluteUrl(`/${locale}`);

  const graph: Record<string, unknown>[] = [
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
  ];

  if (breadcrumb) {
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Jonás Orbit",
          item: home,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: breadcrumb.name,
          item: absoluteUrl(breadcrumb.path),
        },
      ],
    });
  }

  return (
    <script
      type="application/ld+json"
      // `<` escapado: impide que un valor futuro cierre el <script> y se
      // convierta en una inyección de markup.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": graph,
        }).replace(/</g, "\\u003c"),
      }}
    />
  );
}
