import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactThanks } from "@/components/contact-thanks";
import { ProjectCase } from "@/components/project-case";
import { ServicesPage, servicesMetadata } from "@/components/services-page";
import { SiteShell } from "@/components/site-shell";
import { StructuredData } from "@/components/structured-data";
import { PUBLISHED_LOCALES, isPublishedLocale, type Locale } from "@/content/site.data";
import type { ProjectId } from "@/content/projects.data";
import { missionFileLabel, transmissionLabel } from "@/lib/footer-labels";
import { defineCopy } from "@/lib/i18n";
import { pageAlternatesMetadata, projectPath, worldPath } from "@/lib/page-paths";
import { PATH_SEGMENTS } from "@/lib/path-segments";
import { getF1AProjectBySlug, getF1AProjects } from "@/lib/projects";
import { projectOgImagePath, siteOpenGraph } from "@/lib/site-metadata";
import { absoluteUrl } from "@/lib/site-url";
import { getWorld, getWorldBySlug } from "@/lib/worlds";

/**
 * Los hijos de un mundo: un caso de estudio bajo Endurance (`/es/proyectos/omsta`,
 * `/en/projects/omsta`) y, bajo Ranger, los servicios
 * (`/es/contacto/servicios`, `/en/contact/services`) y la confirmación del
 * contacto (`/es/contacto/gracias`, `/en/contact/thanks`). Las entradas del
 * blog vivieron un día bajo Experimentos; ahora están en `app/[locale]/blog`.
 *
 * Comparten carpeta porque el segmento del padre es el slug localizado del
 * mundo; el Observatorio, el tercer hijo, tiene un nivel más y vive en
 * `[sub]/[objeto]`.
 */

type Props = {
  params: Promise<{ locale: string; mundo: string; sub: string }>;
};

// Sólo existen los casos del catálogo, los servicios y la confirmación: cualquier otro
// segmento es un 404 directo, sin renderizarse bajo demanda.
export const dynamicParams = false;

export function generateStaticParams() {
  return PUBLISHED_LOCALES.flatMap((locale) => {
    const projects = getWorld("endurance", locale).prose.slug;
    const contact = getWorld("ranger", locale).prose.slug;
    return [
      ...getF1AProjects(locale).map((project) => ({ locale, mundo: projects, sub: project.prose.slug })),
      { locale, mundo: contact, sub: PATH_SEGMENTS.services[locale] },
      { locale, mundo: contact, sub: PATH_SEGMENTS.thanks[locale] },
    ];
  });
}

type Child =
  | { kind: "project"; id: ProjectId }
  | { kind: "services" }
  | { kind: "thanks" };

/** Qué página hay detrás de `[mundo]/[sub]`, o `null` si no hay ninguna. */
function resolveChild(locale: Locale, mundo: string, sub: string): Child | null {
  const world = getWorldBySlug(mundo, locale);
  if (world?.id === "endurance") {
    const project = getF1AProjectBySlug(sub, locale);
    return project ? { kind: "project", id: project.id } : null;
  }
  if (world?.id === "ranger" && sub === PATH_SEGMENTS.services[locale]) return { kind: "services" };
  if (world?.id === "ranger" && sub === PATH_SEGMENTS.thanks[locale]) return { kind: "thanks" };
  return null;
}

const THANKS_COPY = defineCopy({
  es: {
    title: "Transmisión recibida",
    description: "Confirmación privada del formulario de contacto de Jonás Orbit.",
  },
  en: {
    title: "Transmission received",
    description: "Private confirmation for the Jonás Orbit contact form.",
  },
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, mundo, sub } = await params;
  if (!isPublishedLocale(locale)) return {};
  const child = resolveChild(locale, mundo, sub);
  if (!child) return {};

  if (child.kind === "services") return servicesMetadata(locale);

  if (child.kind === "thanks") {
    return {
      ...THANKS_COPY[locale],
      robots: { index: false, follow: false },
    };
  }

  const project = getF1AProjects(locale).find((entry) => entry.id === child.id)!;
  const path = projectPath(project.id, locale);
  return {
    title: project.prose.seoTitle,
    description: project.prose.seoDescription,
    alternates: pageAlternatesMetadata({ kind: "project", id: project.id }, locale),
    openGraph: {
      ...siteOpenGraph(locale),
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

export default async function WorldChildPage({ params }: Props) {
  const { locale, mundo, sub } = await params;
  if (!isPublishedLocale(locale)) notFound();
  const child = resolveChild(locale, mundo, sub);
  if (!child) notFound();

  if (child.kind === "services") return <ServicesPage locale={locale} />;

  if (child.kind === "thanks") {
    return (
      <SiteShell
        locale={locale}
        page={{ kind: "thanks" }}
        activeWorldId="ranger"
        mainClassName="transmission-page"
        footerLabel={transmissionLabel(locale)}
      >
        <ContactThanks locale={locale} />
      </SiteShell>
    );
  }

  const projects = getF1AProjects(locale);
  const project = projects.find((entry) => entry.id === child.id)!;
  // Un caso de estudio sigue perteneciendo a Endurance: la cabecera lo marca
  // como mundo activo aunque la ruta sea hija. `case-route` le da la paleta
  // de la mesa (`system-diagram.css`) y su fondo propio, opaco: la escena
  // persistente duerme detrás (`gargantua-system.tsx`).
  const projectsHref = worldPath("endurance", locale);
  const casePath = projectPath(project.id, locale);
  return (
    <SiteShell
      locale={locale}
      page={{ kind: "project", id: project.id }}
      activeWorldId="endurance"
      mainClassName="case-route"
      footerLabel={missionFileLabel(project.order, locale)}
    >
      <StructuredData
        locale={locale}
        breadcrumb={[
          { path: projectsHref, name: getWorld("endurance", locale).prose.title },
          { path: casePath, name: project.prose.title },
        ]}
        work={{
          "@type": "CreativeWork",
          "@id": `${absoluteUrl(casePath)}#caso`,
          name: project.prose.title,
          headline: project.prose.seoTitle,
          description: project.prose.seoDescription,
          url: absoluteUrl(casePath),
          image: absoluteUrl(projectOgImagePath(project.prose.featuredImage.src)),
          keywords: project.prose.technologies.join(", "),
        }}
      />
      <ProjectCase
        project={project}
        projects={projects}
        projectsHref={projectsHref}
        contactHref={worldPath("ranger", locale)}
      />
    </SiteShell>
  );
}
