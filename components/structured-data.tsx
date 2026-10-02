import { SITE_PROFILE, type Locale } from "@/content/site.data";
import { defineCopy } from "@/lib/i18n";
import { absoluteUrl } from "@/lib/site-url";

type Crumb = { path: string; name: string };
type ServiceNode = { id: string; name: string; description: string };

/**
 * Qué es el sitio y quién es su autor, dicho a un buscador. Lo mismo que la
 * descripción de la portada: un portafolio 3D inspirado en Interstellar, el
 * nicho que el sitio demuestra con la escena y el Observatorio.
 */
const COPY = defineCopy({
  es: {
    person:
      "Desarrollador full-stack y diseñador UX/UI dominicano: aplicaciones web y móviles con Django y React, y experiencias 3D interactivas con Three.js y WebGL.",
    website:
      "Portafolio 3D interactivo de Jonás Javier Encarnación, inspirado en Interstellar: proyectos full-stack, formación, fotografía y experimentos en WebGL.",
  },
  en: {
    person:
      "Dominican full-stack developer and UX/UI designer: web and mobile apps with Django and React, and interactive 3D experiences with Three.js and WebGL.",
    website:
      "Jonás Javier Encarnación's interactive 3D portfolio, inspired by Interstellar: full-stack projects, education, photography and WebGL experiments.",
  },
});

/**
 * Datos estructurados: Person + WebSite en todas las páginas, BreadcrumbList
 * fuera de la home, ProfilePage en «Sobre mí» (la página que Google debe
 * asociar a la persona cuando la buscan por su nombre), un Service por cada
 * servicio en la página de servicios y, en una página que ES una obra (un
 * caso, un espécimen), el nodo de esa obra.
 *
 * Regla de contenido honesto del plan: aquí solo entran hechos verificables y
 * ya publicados en el propio sitio. Nada de premios, valoraciones, número de
 * clientes ni métricas que no puedan comprobarse.
 */
export function StructuredData({
  locale,
  breadcrumb,
  profile,
  services,
  work,
}: {
  locale: Locale;
  /**
   * Camino desde la home hasta la página actual (sin la home), cuando NO es
   * la home. La miga de pan es lo que le dice a un buscador que `/es` es el
   * padre y no un documento suelto más.
   */
  breadcrumb?: readonly Crumb[];
  /** Ruta de la página que presenta a la persona, si ésta lo es. */
  profile?: string;
  /**
   * Los servicios que la página ofrece. El proveedor es la misma Person y la
   * zona, la ciudad desde la que trabaja: sin precios ni valoraciones, que
   * aquí no se publican.
   */
  services?: { path: string; items: readonly ServiceNode[] };
  /**
   * El nodo de la obra que la página presenta. Se completa aquí con `author`
   * para que apunte a la misma Person del grafo.
   */
  work?: Record<string, unknown>;
}) {
  const home = absoluteUrl(`/${locale}`);
  // La persona es UNA en los dos idiomas: su `@id` cuelga del origen y no de
  // `/es` o `/en`, para que el buscador no vea dos Jonás distintos.
  const person = `${absoluteUrl("/")}#jonas`;

  const graph: Record<string, unknown>[] = [
    {
      "@type": "Person",
      "@id": person,
      name: SITE_PROFILE.name,
      alternateName: SITE_PROFILE.alternateNames,
      description: COPY[locale].person,
      // ImageObject y no una URL suelta: Google Imágenes lee el pie y sabe de
      // quién es el retrato cuando se busca por el nombre.
      image: {
        "@type": "ImageObject",
        "@id": `${absoluteUrl("/")}#retrato`,
        contentUrl: absoluteUrl(SITE_PROFILE.portrait),
        url: absoluteUrl(SITE_PROFILE.portrait),
        caption: SITE_PROFILE.portraitCaption[locale],
        width: 960,
        height: 1275,
      },
      jobTitle: SITE_PROFILE.jobTitle[locale],
      nationality: { "@type": "Country", name: SITE_PROFILE.countryName[locale] },
      knowsLanguage: SITE_PROFILE.languages,
      email: `mailto:${SITE_PROFILE.email}`,
      telephone: SITE_PROFILE.phone,
      url: home,
      address: {
        "@type": "PostalAddress",
        addressLocality: SITE_PROFILE.locality,
        addressCountry: SITE_PROFILE.country,
      },
      sameAs: [SITE_PROFILE.github, SITE_PROFILE.linkedin, SITE_PROFILE.googleBusiness],
      // Lo que el propio sitio demuestra con casos y experimentos publicados.
      knowsAbout: SITE_PROFILE.knowsAbout[locale],
    },
    {
      "@type": "WebSite",
      "@id": `${home}#website`,
      name: "Jonás Orbit",
      alternateName: SITE_PROFILE.name,
      description: COPY[locale].website,
      url: home,
      inLanguage: locale,
      author: { "@id": person },
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

  if (profile) {
    graph.push({
      "@type": "ProfilePage",
      "@id": `${absoluteUrl(profile)}#perfil`,
      url: absoluteUrl(profile),
      mainEntity: { "@id": person },
      isPartOf: { "@id": `${home}#website` },
      inLanguage: locale,
    });
  }

  if (services) {
    const page = absoluteUrl(services.path);
    for (const service of services.items) {
      graph.push({
        "@type": "Service",
        "@id": `${page}#${service.id}`,
        name: service.name,
        serviceType: service.name,
        description: service.description,
        url: `${page}#${service.id}`,
        provider: { "@id": person },
        areaServed: [
          { "@type": "City", name: SITE_PROFILE.locality },
          { "@type": "Country", name: SITE_PROFILE.countryName[locale] },
        ],
        availableLanguage: SITE_PROFILE.languages,
        inLanguage: locale,
      });
    }
  }

  if (work) {
    graph.push({ ...work, author: { "@id": person }, inLanguage: locale });
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
