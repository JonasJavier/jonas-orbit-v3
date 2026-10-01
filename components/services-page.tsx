import type { Metadata } from "next";
import Link from "next/link";
import type { ProjectId } from "@/content/projects.data";
import type { Locale } from "@/content/site.data";
import { servicesLabel } from "@/lib/footer-labels";
import { defineCopy } from "@/lib/i18n";
import { pageAlternatesMetadata, projectPath, servicesPath, worldPath } from "@/lib/page-paths";
import { getF1AProjects } from "@/lib/projects";
import { defaultOgImage, siteOpenGraph } from "@/lib/site-metadata";
import { getWorld } from "@/lib/worlds";
import { SiteShell } from "./site-shell";
import { StructuredData } from "./structured-data";
import "./services-page.css";

type ServiceId = "web" | "commerce" | "mobile" | "design-3d";

/**
 * Cada servicio con su prueba: sólo casos publicados en Proyectos (y, para el
 * 3D, los Experimentos). Nada de precios, clientes ni cifras que el sitio no
 * pueda enseñar.
 */
const SERVICES: readonly { id: ServiceId; proof: readonly ProjectId[]; experiments?: true }[] = [
  { id: "web", proof: ["omsta", "network", "wikiverse"] },
  { id: "commerce", proof: ["delicate", "izaks-photos"] },
  { id: "mobile", proof: ["omsta"] },
  { id: "design-3d", proof: ["delicate"], experiments: true },
];

const COPY = defineCopy({
  es: {
    seoTitle: "Desarrollador web freelance en Santo Domingo — Servicios",
    seoDescription:
      "Jonás Javier Encarnación, desarrollador full-stack freelance: aplicaciones web a medida, tiendas en línea, apps móviles y webs 3D. En remoto o en Santo Domingo.",
    breadcrumb: "Servicios",
    kicker: "RANGER / SERVICIOS",
    heading: "Desarrollo web y móvil a medida.",
    lead: "Soy Jonás Javier Encarnación, desarrollador full-stack freelance en Santo Domingo, República Dominicana. Diseño y construyo tu producto, de la idea al lanzamiento.",
    terms: [
      ["Modalidad", "Remoto, cualquier país"],
      ["En persona", "Santo Domingo"],
      ["Idiomas", "Español · English"],
    ],
    termsLabel: "Cómo y dónde trabajo",
    cta: "Cuéntame tu proyecto",
    projects: "Ver proyectos",
    offer: "Qué hago",
    proof: "Hecho en",
    experiments: "Experimentos 3D",
    services: {
      web: {
        name: "Aplicaciones web a medida",
        description: "Sistemas con Django y React para operar tu negocio: ERP, paneles internos y plataformas con usuarios y roles.",
      },
      commerce: {
        name: "Tiendas y webs de negocio",
        description: "Tiendas en línea y sitios con un catálogo que tú mismo administras, rápidos y preparados para buscadores.",
      },
      mobile: {
        name: "Apps móviles",
        description: "Apps multiplataforma con React Native y Expo, conectadas al mismo sistema que tu web.",
      },
      "design-3d": {
        name: "Diseño UX/UI y webs 3D",
        description: "Interfaces pensadas antes de programarse y experiencias 3D interactivas con Three.js y WebGL, como este sitio.",
      },
    } satisfies Record<ServiceId, { name: string; description: string }>,
    process: "Cómo trabajo",
    steps: [
      { title: "Conversación", body: "Entiendo el problema, quién lo usará y qué significa que salga bien." },
      { title: "Propuesta", body: "Alcance, plazos y presupuesto por escrito antes de empezar." },
      { title: "Construcción", body: "Avances que puedes abrir y probar en un enlace real." },
      { title: "Lanzamiento", body: "Publicación, dominio y acompañamiento después de la entrega." },
    ],
    closingTitle: "¿Tienes una misión en mente?",
    closing: "Escríbeme con lo que necesitas. Leo cada mensaje y respondo personalmente.",
  },
  en: {
    seoTitle: "Freelance Web Developer in Santo Domingo — Services",
    seoDescription:
      "Jonás Javier Encarnación, freelance full-stack developer: custom web apps, online stores, mobile apps and 3D websites. Remote, or in person in Santo Domingo.",
    breadcrumb: "Services",
    kicker: "RANGER / SERVICES",
    heading: "Custom web and mobile development.",
    lead: "I’m Jonás Javier Encarnación, a freelance full-stack developer in Santo Domingo, Dominican Republic. I design and build your product, from the idea to launch.",
    terms: [
      ["Working", "Remote, any country"],
      ["In person", "Santo Domingo"],
      ["Languages", "English · Español"],
    ],
    termsLabel: "How and where I work",
    cta: "Tell me about your project",
    projects: "See projects",
    offer: "What I do",
    proof: "Built in",
    experiments: "3D Experiments",
    services: {
      web: {
        name: "Custom web applications",
        description: "Django and React systems to run your business: ERPs, internal dashboards and platforms with users and roles.",
      },
      commerce: {
        name: "Online stores and business sites",
        description: "Online stores and sites with a catalog you manage yourself, fast and ready for search engines.",
      },
      mobile: {
        name: "Mobile apps",
        description: "Cross-platform apps with React Native and Expo, connected to the same system as your website.",
      },
      "design-3d": {
        name: "UX/UI design and 3D websites",
        description: "Interfaces designed before they’re coded, and interactive 3D experiences with Three.js and WebGL, like this site.",
      },
    },
    process: "How I work",
    steps: [
      { title: "Conversation", body: "I learn the problem, who will use it and what success looks like." },
      { title: "Proposal", body: "Scope, timeline and budget in writing before we start." },
      { title: "Build", body: "Progress you can open and try on a real link." },
      { title: "Launch", body: "Release, domain and support after delivery." },
    ],
    closingTitle: "Got a mission in mind?",
    closing: "Write to me with what you need. I read every message and reply myself.",
  },
});

const pad = (n: number) => String(n).padStart(2, "0");

/** El nombre corto de un caso: lo que va antes de la raya del título. */
const shortTitle = (title: string) => title.split(" — ")[0];

export function servicesMetadata(locale: Locale): Metadata {
  const copy = COPY[locale];
  return {
    title: copy.seoTitle,
    description: copy.seoDescription,
    alternates: pageAlternatesMetadata({ kind: "services" }, locale),
    openGraph: {
      ...siteOpenGraph(locale),
      title: copy.seoTitle,
      description: copy.seoDescription,
      url: servicesPath(locale),
      images: [defaultOgImage(locale)],
    },
  };
}

/**
 * `/es/contacto/servicios` y `/en/contact/services`: lo que Jonás ofrece como
 * freelance, cada servicio con el caso publicado que lo demuestra. Vive bajo
 * Contacto porque quien busca contratar tiene que llegar al formulario en un
 * paso, sin abrir un séptimo destino en la arquitectura de seis mundos.
 */
export function ServicesPage({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  const path = servicesPath(locale);
  const contactHref = worldPath("ranger", locale);
  const projects = new Map(getF1AProjects(locale).map((project) => [project.id, project]));

  return (
    <SiteShell
      locale={locale}
      page={{ kind: "services" }}
      activeWorldId="ranger"
      mainClassName="services-page"
      footerLabel={servicesLabel(locale)}
    >
      <StructuredData
        locale={locale}
        breadcrumb={[
          { path: contactHref, name: getWorld("ranger", locale).prose.title },
          { path, name: copy.breadcrumb },
        ]}
        services={{
          path,
          items: SERVICES.map(({ id }) => ({ id, ...copy.services[id] })),
        }}
      />

      <header className="services-page__hero">
        <p className="section-kicker">{copy.kicker}</p>
        <h1>{copy.heading}</h1>
        <p className="services-page__lead">{copy.lead}</p>
        <dl className="services-page__terms" aria-label={copy.termsLabel}>
          {copy.terms.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="services-page__actions">
          <Link className="button button--primary" href={`${contactHref}#transmision`}>
            {copy.cta} <span aria-hidden="true">→</span>
          </Link>
          <Link className="button button--ghost" href={worldPath("endurance", locale)}>
            {copy.projects}
          </Link>
        </div>
      </header>

      <section className="services-page__offer" aria-labelledby="services-offer">
        <h2 className="section-kicker" id="services-offer">{copy.offer}</h2>
        <div className="services-page__grid">
          {SERVICES.map(({ id, proof, experiments }, index) => (
            <article key={id} id={id}>
              <span aria-hidden="true">{pad(index + 1)}</span>
              <h3>{copy.services[id].name}</h3>
              <p>{copy.services[id].description}</p>
              <p className="services-page__proof">
                <span>{copy.proof}</span>
                {proof.map((projectId) => {
                  const project = projects.get(projectId)!;
                  return (
                    <Link key={projectId} href={projectPath(projectId, locale)}>
                      {shortTitle(project.prose.title)}
                    </Link>
                  );
                })}
                {experiments ? <Link href={worldPath("tesseract", locale)}>{copy.experiments}</Link> : null}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="services-page__process" aria-labelledby="services-process">
        <h2 className="section-kicker" id="services-process">{copy.process}</h2>
        <ol>
          {copy.steps.map((step, index) => (
            <li key={step.title}>
              <span aria-hidden="true">{pad(index + 1)}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="services-page__closing" aria-labelledby="services-closing">
        <h2 id="services-closing">{copy.closingTitle}</h2>
        <p>{copy.closing}</p>
        <Link className="button button--primary" href={`${contactHref}#transmision`}>
          {copy.cta} <span aria-hidden="true">→</span>
        </Link>
      </section>
    </SiteShell>
  );
}
