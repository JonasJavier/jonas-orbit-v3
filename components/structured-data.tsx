import { SITE_PROFILE, type Locale } from "@/content/site.data";
import { absoluteUrl } from "@/lib/site-url";

type Crumb = { path: string; name: string };

/**
 * Datos estructurados: Person + WebSite en todas las páginas, BreadcrumbList
 * fuera de la home y, en una página que ES una obra (un caso, un espécimen),
 * el nodo de esa obra.
 *
 * Regla de contenido honesto del plan: aquí solo entran hechos verificables y
 * ya publicados en el propio sitio. Nada de premios, valoraciones, número de
 * clientes ni métricas que no puedan comprobarse.
 */
export function StructuredData({
  locale,
  breadcrumb,
  work,
}: {
  locale: Locale;
  /**
   * Camino desde la home hasta la página actual (sin la home), cuando NO es
   * la home. La miga de pan es lo que le dice a un buscador que `/es` es el
   * padre y no un documento suelto más.
   */
  breadcrumb?: readonly Crumb[];
  /**
   * El nodo de la obra que la página presenta. Se completa aquí con `author`
   * para que apunte a la misma Person del grafo.
   */
  work?: Record<string, unknown>;
}) {
  const home = absoluteUrl(`/${locale}`);

  const graph: Record<string, unknown>[] = [
    {
      "@type": "Person",
      "@id": `${home}#jonas`,
      name: SITE_PROFILE.name,
      alternateName: SITE_PROFILE.alternateNames,
      image: absoluteUrl(SITE_PROFILE.portrait),
      jobTitle: SITE_PROFILE.jobTitle,
      nationality: { "@type": "Country", name: "República Dominicana" },
      knowsLanguage: SITE_PROFILE.languages,
      email: `mailto:${SITE_PROFILE.email}`,
      telephone: SITE_PROFILE.phone,
      url: home,
      address: {
        "@type": "PostalAddress",
        addressLocality: SITE_PROFILE.locality,
        addressCountry: SITE_PROFILE.country,
      },
      sameAs: [SITE_PROFILE.github, SITE_PROFILE.linkedin],
      // Lo que el propio sitio demuestra con casos y experimentos publicados.
      knowsAbout: SITE_PROFILE.knowsAbout,
    },
    {
      "@type": "WebSite",
      "@id": `${home}#website`,
      name: "Jonás Orbit",
      alternateName: SITE_PROFILE.name,
      url: home,
      inLanguage: locale,
      author: { "@id": `${home}#jonas` },
    },
  ];

  if (breadcrumb?.length) {
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: [{ path: `/${locale}`, name: "Jonás Orbit" }, ...breadcrumb].map(
        (crumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: crumb.name,
          item: absoluteUrl(crumb.path),
        }),
      ),
    });
  }

  if (work) {
    graph.push({ ...work, author: { "@id": `${home}#jonas` }, inLanguage: locale });
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
