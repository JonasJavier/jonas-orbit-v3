import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Hero } from "@/components/hero";
import { NarrativeExperience } from "@/components/narrative-experience";
import { ProjectGrid } from "@/components/project-grid";
import { RangerContact } from "@/components/ranger-contact";
import { SiteHeader } from "@/components/site-header";
import { StructuredData } from "@/components/structured-data";
import { WorldSection } from "@/components/world-section";
import { PUBLISHED_LOCALES, type Locale } from "@/content/site.data";
import { getNarrativeWorldSummaries } from "@/lib/narrative-types";
import { getF1AProjects } from "@/lib/projects";
import { getWorlds } from "@/lib/worlds";

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
    alternates: {
      canonical: path,
      // Solo se declaran los idiomas PUBLICADOS: anunciar /en antes de F2A
      // enviaría a los buscadores a una ruta que todavía no existe.
      languages: Object.fromEntries([
        ...PUBLISHED_LOCALES.map((published) => [published, `/${published}`]),
        ["x-default", `/${PUBLISHED_LOCALES[0]}`],
      ]),
    },
    openGraph: { url: path },
  };
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
  const narrativeWorlds = getNarrativeWorldSummaries(worlds);

  return (
    <NarrativeExperience worlds={narrativeWorlds}>
      <StructuredData locale={locale as Locale} />
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <SiteHeader locale={locale as Locale} worlds={worlds} />
      <main id="main-content">
        <Hero />
        {worlds.map((world) => (
          <WorldSection
            key={world.id}
            world={world}
            showPanels={world.id !== "endurance" && world.id !== "ranger"}
          >
            {world.id === "endurance" ? (
              <ProjectGrid projects={projects} locale={locale as Locale} />
            ) : null}
            {world.id === "ranger" ? <RangerContact /> : null}
          </WorldSection>
        ))}
      </main>
      <footer className="site-footer">
        <p>JONÁS ORBIT · SEÑAL ABIERTA DESDE SANTO DOMINGO</p>
        <a href="#main-content">Volver al inicio ↑</a>
      </footer>
    </NarrativeExperience>
  );
}
