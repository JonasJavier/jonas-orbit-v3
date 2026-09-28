import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Hero } from "@/components/hero";
import { StructuredData } from "@/components/structured-data";
import { SystemMap } from "@/components/system-map";
import { PUBLISHED_LOCALES, type Locale } from "@/content/site.data";
import { DEFAULT_OG_IMAGE, SITE_OPEN_GRAPH } from "@/lib/site-metadata";
import { getWorld, getWorldNavItems, getWorldPath } from "@/lib/worlds";

const HOME_TITLE =
  "Jonás Javier Encarnación — Desarrollador full-stack y diseñador UX/UI";
const HOME_DESCRIPTION =
  "Portafolio de Jonás Javier Encarnación, desarrollador full-stack y diseñador UX/UI en República Dominicana: proyectos, formación, fotografía y experimentos 3D.";

export function generateStaticParams() {
  return PUBLISHED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!PUBLISHED_LOCALES.includes(locale as Locale)) return {};

  const path = `/${locale}`;
  return {
    // Absoluto: la plantilla del layout repetiría el nombre.
    title: { absolute: HOME_TITLE },
    description: HOME_DESCRIPTION,
    alternates: {
      canonical: path,
      // Solo se declaran los idiomas PUBLICADOS: anunciar /en antes de F2A
      // enviaría a los buscadores a una ruta que todavía no existe.
      languages: Object.fromEntries([
        ...PUBLISHED_LOCALES.map((published) => [published, `/${published}`]),
        ["x-default", `/${PUBLISHED_LOCALES[0]}`],
      ]),
    },
    openGraph: {
      ...SITE_OPEN_GRAPH,
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      url: path,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

/**
 * `/es` — el Sistema Gargantúa.
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
  if (!PUBLISHED_LOCALES.includes(locale as Locale)) {
    notFound();
  }
  const typedLocale = locale as Locale;
  const worlds = getWorldNavItems(typedLocale);

  return (
    // Sin cabecera y sin pie, a propósito.
    //
    // La barra de navegación repetía exactamente los seis destinos que ya son
    // el mapa: en una home que ES un lugar, eso es decir dos veces lo mismo y
    // enmarcar el espacio con muebles de página web. Las páginas de mundo sí
    // conservan el shell completo, porque ahí sí eres un visitante leyendo un
    // documento y necesitas saber dónde estás.
    <main className="system-home" id="main-content">
      <StructuredData locale={typedLocale} />
      <Hero
        projectsHref={getWorldPath(getWorld("endurance", typedLocale), typedLocale)}
        contactHref={getWorldPath(getWorld("ranger", typedLocale), typedLocale)}
      />
      <SystemMap worlds={worlds} />
    </main>
  );
}
