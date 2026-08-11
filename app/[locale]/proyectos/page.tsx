import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectGrid } from "@/components/project-grid";
import { SiteShell } from "@/components/site-shell";
import { WorldPage } from "@/components/world-page";
import { PUBLISHED_LOCALES, type Locale } from "@/content/site.data";
import { getF1AProjects } from "@/lib/projects";
import { buildWorldMetadata } from "@/lib/world-metadata";
import { getWorld } from "@/lib/worlds";

/**
 * Endurance — el índice de proyectos.
 *
 * Es el padre natural de `app/[locale]/proyectos/[slug]/`, que ya existía: el
 * pivote encaja en el árbol de rutas sin forzarlo (§2). Los paneles de la prosa
 * se ocultan porque aquí la evidencia son los proyectos reales, no las fichas
 * genéricas del mundo.
 */
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
  return buildWorldMetadata(getWorld("endurance", locale as Locale), locale as Locale);
}

export default async function ProjectsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!PUBLISHED_LOCALES.includes(locale as Locale)) {
    notFound();
  }

  const typedLocale = locale as Locale;
  const world = getWorld("endurance", typedLocale);

  return (
    <SiteShell
      locale={typedLocale}
      activeWorldId={world.id}
      mainClassName="world-route"
      footerLabel={`JONÁS ORBIT · DESTINO ${String(world.order).padStart(2, "0")} / ${world.cosmicName.toUpperCase()}`}
    >
      <WorldPage world={world} locale={typedLocale} showPanels={false}>
        <ProjectGrid
          projects={getF1AProjects(typedLocale)}
          locale={typedLocale}
        />
      </WorldPage>
    </SiteShell>
  );
}
