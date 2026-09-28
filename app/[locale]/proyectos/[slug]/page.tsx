import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectCase } from "@/components/project-case";
import { SiteShell } from "@/components/site-shell";
import { PUBLISHED_LOCALES, type Locale } from "@/content/site.data";
import { getF1AProjectBySlug, getF1AProjects } from "@/lib/projects";
import { projectOgImagePath, SITE_OPEN_GRAPH } from "@/lib/site-metadata";
import { getWorld, getWorldPath } from "@/lib/worlds";

type ProjectPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

// Sólo existen los casos del catálogo: un slug desconocido es un 404 directo,
// sin renderizarse bajo demanda ni escribirse en la caché del disco.
export const dynamicParams = false;

export function generateStaticParams() {
  return PUBLISHED_LOCALES.flatMap((locale) =>
    getF1AProjects(locale).map((project) => ({
      locale,
      slug: project.prose.slug,
    })),
  );
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!PUBLISHED_LOCALES.includes(locale as Locale)) {
    return { title: "Misión no encontrada" };
  }

  const project = getF1AProjectBySlug(slug, locale as Locale);
  if (!project) {
    return { title: "Misión no encontrada" };
  }

  const path = `/${locale}/proyectos/${project.prose.slug}`;
  return {
    title: project.prose.seoTitle,
    description: project.prose.seoDescription,
    alternates: { canonical: path },
    openGraph: {
      ...SITE_OPEN_GRAPH,
      title: project.prose.seoTitle,
      description: project.prose.seoDescription,
      type: "article",
      url: path,
      images: [
        {
          url: projectOgImagePath(project.prose.featuredImage.src),
          width: 1200,
          height: 630,
          alt: project.prose.featuredImage.alt,
        },
      ],
    },
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { locale, slug } = await params;
  if (!PUBLISHED_LOCALES.includes(locale as Locale)) {
    notFound();
  }

  const typedLocale = locale as Locale;
  const project = getF1AProjectBySlug(slug, typedLocale);
  if (!project) {
    notFound();
  }

  // Un caso de estudio sigue perteneciendo a Endurance: la cabecera lo marca
  // como mundo activo aunque la ruta sea hija. `case-route` le da la paleta
  // de la mesa (`system-diagram.css`) y su fondo propio, opaco: la escena
  // persistente duerme detrás (`gargantua-system.tsx`).
  return (
    <SiteShell
      locale={typedLocale}
      activeWorldId="endurance"
      mainClassName="case-route"
      footerLabel={`JONÁS ORBIT · ARCHIVO DE MISIÓN ${String(project.order).padStart(2, "0")}`}
    >
      <ProjectCase
        project={project}
        projects={getF1AProjects(typedLocale)}
        projectsHref={getWorldPath(getWorld("endurance", typedLocale), typedLocale)}
        contactHref={getWorldPath(getWorld("ranger", typedLocale), typedLocale)}
      />
    </SiteShell>
  );
}
