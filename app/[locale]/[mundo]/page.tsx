import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { MillerPage } from "@/components/miller-page";
import { EdmundsPage } from "@/components/edmunds-page";
import { AboutPage } from "@/components/about-page";
import { ExperimentsPage } from "@/components/experiments-page";
import { ProjectsPage } from "@/components/projects-page";
import { RangerContact } from "@/components/ranger-contact";
import { PUBLISHED_LOCALES, isPublishedLocale } from "@/content/site.data";
import type { WorldId } from "@/content/worlds.data";
import { destinationLabel } from "@/lib/footer-labels";
import { getF1AProjects } from "@/lib/projects";
import { buildWorldMetadata } from "@/lib/world-metadata";
import { getWorldBySlug, getWorlds } from "@/lib/worlds";

/**
 * Los seis mundos, cada uno con su slug localizado del MDX (`/es/proyectos`,
 * `/en/projects`). Una sola ruta dinámica para los seis es lo que deja que el
 * slug cambie con el idioma sin carpetas duplicadas: una carpeta estática
 * `proyectos/` sólo podría llamarse de una manera.
 *
 * Endurance monta el índice de proyectos y Ranger el formulario; el resto,
 * su presentación propia. Los hijos —un caso, la confirmación del contacto y
 * el Observatorio— cuelgan de `[mundo]/[sub]`.
 *
 * `dynamicParams = false` hace que cualquier otro segmento responda 404 sin
 * escribir una línea: es la mitad de la garantía del test G1.
 */
export const dynamicParams = false;

type WorldRouteProps = {
  params: Promise<{ locale: string; mundo: string }>;
};

export function generateStaticParams() {
  return PUBLISHED_LOCALES.flatMap((locale) =>
    getWorlds(locale).map((world) => ({ locale, mundo: world.prose.slug })),
  );
}

export async function generateMetadata({
  params,
}: WorldRouteProps): Promise<Metadata> {
  const { locale, mundo } = await params;
  if (!isPublishedLocale(locale)) return {};

  const world = getWorldBySlug(mundo, locale);
  if (!world) return {};

  return buildWorldMetadata(world, locale);
}

/** La clase del `<main>` de cada mundo: su paleta y su composición. */
const MAIN_CLASS: Record<WorldId, string> = {
  gargantua: "about-route",
  miller: "miller-route",
  endurance: "projects-route",
  edmunds: "edmunds-route",
  tesseract: "experiments-route",
  ranger: "ranger-route",
};

export default async function WorldRoute({ params }: WorldRouteProps) {
  const { locale, mundo } = await params;
  if (!isPublishedLocale(locale)) notFound();

  const world = getWorldBySlug(mundo, locale);
  if (!world) notFound();

  return (
    <SiteShell
      locale={locale}
      page={{ kind: "world", id: world.id }}
      activeWorldId={world.id}
      mainClassName={MAIN_CLASS[world.id]}
      footerLabel={destinationLabel(world, locale)}
    >
      {world.id === "gargantua" ? (
        <AboutPage world={world} locale={locale} />
      ) : world.id === "miller" ? (
        <MillerPage world={world} locale={locale} />
      ) : world.id === "edmunds" ? (
        <EdmundsPage world={world} locale={locale} />
      ) : world.id === "tesseract" ? (
        <ExperimentsPage world={world} locale={locale} />
      ) : world.id === "endurance" ? (
        <ProjectsPage locale={locale} projects={getF1AProjects(locale)} world={world} />
      ) : (
        <RangerContact world={world} locale={locale} />
      )}
    </SiteShell>
  );
}
