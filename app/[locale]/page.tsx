import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Hero } from "@/components/hero";
import { StructuredData } from "@/components/structured-data";
import { SystemMap } from "@/components/system-map";
import { PUBLISHED_LOCALES, type Locale } from "@/content/site.data";
import { getWorld, getWorldNavItems, getWorldPath } from "@/lib/worlds";

const HOME_TITLE =
  "Jonás Javier Encarnación — Desarrollador full-stack y creador visual";
const HOME_DESCRIPTION =
  "Sistema Gargantúa: siete destinos que recorren el trabajo de Jonás Javier Encarnación — desarrollo full-stack, proyectos, formación, creatividad visual y contacto directo. No separo creatividad y tecnología: las mantengo en la misma órbita.";

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
    title: HOME_TITLE,
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
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      url: path,
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
 * Server component puro, cero JavaScript propio. El HTML servido ya trae el
 * nombre, la frase, los dos CTAs, el CV y los siete enlaces a los mundos —
 * exactamente lo que exige la regla 7 y ni una palabra más, porque todo lo
 * demás se mudó a su destino.
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
    // La barra de navegación repetía exactamente los siete destinos que ya son
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
