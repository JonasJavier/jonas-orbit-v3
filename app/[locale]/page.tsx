import { notFound } from "next/navigation";
import { Hero } from "@/components/hero";
import { ProjectGrid } from "@/components/project-grid";
import { SiteHeader } from "@/components/site-header";
import { WorldSection } from "@/components/world-section";
import { PUBLISHED_LOCALES, type Locale } from "@/content/site.data";
import { getF1AProjects } from "@/lib/projects";
import { getWorlds } from "@/lib/worlds";

export function generateStaticParams() {
  return PUBLISHED_LOCALES.map((locale) => ({ locale }));
}

export default async function NarrativePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!PUBLISHED_LOCALES.includes(locale as Locale)) {
    notFound();
  }
  const worlds = getWorlds(locale as Locale);
  const projects = getF1AProjects(locale as Locale);

  return (
    <>
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <div className="space-backdrop" aria-hidden="true">
        <span className="space-backdrop__stars" />
        <span className="space-backdrop__haze" />
        <span className="space-backdrop__grid" />
      </div>
      <SiteHeader locale={locale as Locale} worlds={worlds} />
      <main id="main-content">
        <Hero />
        {worlds.map((world) => (
          <WorldSection key={world.id} world={world}>
            {world.id === "endurance" ? (
              <ProjectGrid projects={projects} locale={locale as Locale} />
            ) : null}
          </WorldSection>
        ))}
      </main>
      <footer className="site-footer">
        <p>JONÁS ORBIT · SEÑAL ABIERTA DESDE SANTO DOMINGO</p>
        <a href="#main-content">Volver al inicio ↑</a>
      </footer>
    </>
  );
}
