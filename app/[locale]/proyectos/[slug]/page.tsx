import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectCase } from "@/components/project-case";
import { PUBLISHED_LOCALES, type Locale } from "@/content/site.data";
import { getF1AProjectBySlug, getF1AProjects } from "@/lib/projects";
import { getWorlds } from "@/lib/worlds";

type ProjectPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

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

  return {
    title: project.prose.seoTitle,
    description: project.prose.seoDescription,
    openGraph: {
      title: project.prose.seoTitle,
      description: project.prose.seoDescription,
      type: "article",
      locale: "es_DO",
      images: [
        {
          url: project.prose.featuredImage.src,
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

  const project = getF1AProjectBySlug(slug, locale as Locale);
  if (!project) {
    notFound();
  }

  return (
    <ProjectCase
      project={project}
      locale={locale as Locale}
      worlds={getWorlds(locale as Locale)}
    />
  );
}
