import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Hero } from "@/components/hero";
import { StructuredData } from "@/components/structured-data";
import { SystemMap } from "@/components/system-map";
import { PUBLISHED_LOCALES, isPublishedLocale } from "@/content/site.data";
import { defineCopy } from "@/lib/i18n";
import { pageAlternates, pageAlternatesMetadata, worldPath } from "@/lib/page-paths";
import { defaultOgImage, siteOpenGraph } from "@/lib/site-metadata";
import { getWorldNavItems } from "@/lib/worlds";

const COPY = defineCopy({
  es: {
    title: "Jonás Javier Encarnación — Desarrollador full-stack · Portafolio 3D",
    description:
      "Jonás Javier Encarnación, desarrollador full-stack y diseñador UX/UI en República Dominicana. Un portafolio 3D interactivo inspirado en Interstellar.",
  },
  en: {
    title: "Jonás Javier Encarnación — Full-Stack Developer · 3D Portfolio",
    description:
      "Jonás Javier Encarnación, a full-stack developer and UX/UI designer in the Dominican Republic. An interactive 3D portfolio inspired by Interstellar.",
  },
});

export function generateStaticParams() {
  return PUBLISHED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublishedLocale(locale)) return {};
  const copy = COPY[locale];

  return {
    // Absoluto: la plantilla del layout repetiría el nombre.
    title: { absolute: copy.title },
    description: copy.description,
    alternates: pageAlternatesMetadata({ kind: "home" }, locale),
    openGraph: {
      ...siteOpenGraph(locale),
      title: copy.title,
      description: copy.description,
      url: `/${locale}`,
      images: [defaultOgImage(locale)],
    },
  };
}

/**
 * `/en` y `/es` — el Sistema Gargantúa.
 *
 * Una sola pantalla, sin scroll. La escena ocupa el viewport entero y este
 * marcado vive encima: no es un documento con un fondo bonito, es un LUGAR
 * (docs/plans/sistema-gargantua.md §1 y §4).
 *
 * Server component puro, cero JavaScript propio. El HTML servido ya trae la
 * identidad y los accesos contractuales como respaldo semántico, además de los
 * seis enlaces a los mundos. Visualmente, el sistema y su navegación son el
 * Hero: no hay un bloque de presentación personal sobre la escena.
 */
export default async function SystemPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isPublishedLocale(locale)) notFound();
  const worlds = getWorldNavItems(locale);

  return (
    // Sin cabecera y sin pie, a propósito.
    //
    // La barra de navegación repetía exactamente los seis destinos que ya son
    // el mapa: en una home que ES un lugar, eso es decir dos veces lo mismo y
    // enmarcar el espacio con muebles de página web. Las páginas de mundo sí
    // conservan el shell completo, porque ahí sí eres un visitante leyendo un
    // documento y necesitas saber dónde estás.
    <main className="system-home" id="main-content">
      <StructuredData locale={locale} />
      <Hero
        locale={locale}
        projectsHref={worldPath("endurance", locale)}
        contactHref={worldPath("ranger", locale)}
      />
      <SystemMap worlds={worlds} languages={pageAlternates({ kind: "home" })} />
    </main>
  );
}
