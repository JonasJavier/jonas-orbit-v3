import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectsPage } from "@/components/projects-page";
import { SiteShell } from "@/components/site-shell";
import { PUBLISHED_LOCALES, type Locale } from "@/content/site.data";
import { getF1AProjects } from "@/lib/projects";
import { buildWorldMetadata } from "@/lib/world-metadata";
import { getWorld } from "@/lib/worlds";

/**
 * Endurance — la mesa de ingeniería (docs/design/endurance-proyectos.md).
 *
 * Es el padre natural de `app/[locale]/proyectos/[slug]/`, que ya existía: el
 * pivote encaja en el árbol de rutas sin forzarlo (§2). La ruta conserva su
 * metadata, su OG y su `generateStaticParams`; lo que cambia es qué componente
 * la dibuja: de ficha editorial a mesa donde cada proyecto se despliega a
 * tres profundidades.
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
      mainClassName="projects-route"
      footerLabel={`JONÁS ORBIT · DESTINO ${String(world.order).padStart(2, "0")} / ${world.cosmicName.toUpperCase()}`}
    >
      <ProjectsPage
        locale={typedLocale}
        projects={getF1AProjects(typedLocale)}
        world={world}
      />
    </SiteShell>
  );
}
