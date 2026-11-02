import type { Metadata } from "next";
import { IntentLink as Link } from "@/components/intent-link";
import type { ProjectId } from "@/content/projects.data";
import { SITE_PROFILE, type Locale } from "@/content/site.data";
import type { WorldId } from "@/content/worlds.data";
import { servicesLabel } from "@/lib/footer-labels";
import { defineCopy } from "@/lib/i18n";
import { specimenImage } from "@/lib/observatory-images";
import { observatoryPath, pageAlternatesMetadata, projectPath, servicePath, servicesPath, worldPath } from "@/lib/page-paths";
import { SERVICE_IDS, type ServiceId } from "@/lib/service-slugs";
import { defaultOgImage, siteOpenGraph } from "@/lib/site-metadata";
import { getWorld } from "@/lib/worlds";
import { SERVICE_DETAIL } from "./service-detail.copy";
import { ServiceVisual, type Visual } from "./services-page";
import { SiteShell } from "./site-shell";
import { StructuredData } from "./structured-data";
import "./services-page.css";

/** Una prueba: un caso publicado en Proyectos o un espécimen del Observatorio. */
type Proof = { project: ProjectId; visual: Visual } | { specimen: WorldId };

const browser = (src: string): Visual => ({ kind: "browser", src });

/**
 * Lo que cada servicio enseña y con qué herramientas, en el mismo orden que
 * `proofs` en `service-detail.copy.ts`. El texto vive allí; aquí sólo la
 * estructura, que no se traduce.
 */
const SERVICES: Record<ServiceId, { proofs: readonly Proof[]; stack: readonly string[] }> = {
  software: {
    proofs: [
      { project: "omsta", visual: browser("/media/projects/omsta/w02-dashboard.png") },
      { project: "network", visual: browser("/media/projects/network/04-feed-desktop.png") },
      { project: "wikiverse", visual: browser("/media/projects/wikiverse/02-articulo-desktop.png") },
    ],
    stack: ["Django", "Django REST Framework", "PostgreSQL", "Redis", "React", "TypeScript", "Docker"],
  },
  web: {
    proofs: [
      { project: "delicate", visual: browser("/media/projects/delicate/01-home-desktop.png") },
      { project: "izaks-photos", visual: browser("/media/projects/izaks-photos/01-home-desktop.png") },
    ],
    stack: ["React", "Next.js", "TypeScript", "Django", "PostgreSQL", "Railway"],
  },
  mobile: {
    proofs: [
      {
        project: "omsta",
        visual: { kind: "phones", srcs: ["/media/projects/omsta/m02-inicio.png", "/media/projects/omsta/m03-reservas.png"] },
      },
      { project: "omsta", visual: browser("/media/projects/omsta/w02-dashboard.png") },
    ],
    stack: ["React Native", "Expo", "EAS Build", "TypeScript", "Django REST Framework"],
  },
  "3d": {
    proofs: [
      { specimen: "gargantua" },
      { specimen: "tesseract" },
      { specimen: "endurance" },
      { specimen: "ranger" },
      { specimen: "miller" },
      { specimen: "edmunds" },
    ],
    stack: ["Three.js", "WebGL2", "GLSL", "TypeScript", "Next.js"],
  },
};

/** El texto de interfaz: lo que comparten las cuatro páginas. */
const COPY = defineCopy({
  es: {
    services: "Servicios",
    brief: "Ficha de trabajo",
    terms: [
      ["Modalidad", "Remoto o en Santo Domingo"],
      ["Idiomas", "Español · English"],
      ["Horario", "UTC−4"],
    ],
    stack: "Herramientas",
    cta: "Cuéntame tu proyecto",
    projects: "Ver proyectos",
    experiments: "Ver los experimentos",
    open: "Ver el caso",
    observe: "Abrir en el Observatorio",
    faq: "Preguntas frecuentes",
    faqTitle: "Antes de escribirme.",
    others: "Otros servicios",
    all: "Todos los servicios",
    closingTitle: "¿Tienes una misión en mente?",
    closing: "Escríbeme con lo que necesitas. Leo cada mensaje y respondo personalmente.",
    whatsapp: "Escribir por WhatsApp",
  },
  en: {
    services: "Services",
    brief: "Working terms",
    terms: [
      ["Working", "Remote, worldwide"],
      ["Languages", "English · Español"],
      ["Time zone", "UTC−4 · US Eastern"],
    ],
    stack: "Tools",
    cta: "Tell me about your project",
    projects: "See projects",
    experiments: "See the experiments",
    open: "Open the case study",
    observe: "Open in the Observatory",
    faq: "Frequently asked questions",
    faqTitle: "Before you write.",
    others: "Other services",
    all: "All services",
    closingTitle: "Got a mission in mind?",
    closing: "Write to me with what you need. I read every message and reply myself.",
    whatsapp: "Message on WhatsApp",
  },
});

const pad = (n: number) => String(n).padStart(2, "0");

export function serviceMetadata(id: ServiceId, locale: Locale): Metadata {
  const service = SERVICE_DETAIL[locale][id];
  // El 3D se comparte con su propia imagen: quien manda el enlace quiere que se vea Gargantúa.
  const image =
    id === "3d"
      ? { url: specimenImage("gargantua", "og"), width: 1200, height: 630, type: "image/jpeg", alt: service.proofs[0].alt }
      : defaultOgImage(locale);
  return {
    title: service.seoTitle,
    description: service.seoDescription,
    alternates: pageAlternatesMetadata({ kind: "service", id }, locale),
    openGraph: {
      ...siteOpenGraph(locale),
      title: service.seoTitle,
      description: service.seoDescription,
      url: servicePath(id, locale),
      images: [image],
    },
  };
}

/**
 * `/es/contacto/servicios/<servicio>`: un servicio, su página. La de
 * Servicios presenta los cuatro; ésta nombra UNA búsqueda —«desarrollo de
 * software a medida en República Dominicana», «Three.js developer for hire»—
 * y la responde con lo que se construye, los casos que lo prueban, cómo se
 * hace y sus preguntas. Mismo cielo y mismas piezas que Servicios
 * (`services-page.css`): para el visitante es la misma sección, un nivel más
 * abajo.
 */
export function ServiceDetailPage({ id, locale }: { id: ServiceId; locale: Locale }) {
  const copy = COPY[locale];
  const service = SERVICE_DETAIL[locale][id];
  const { proofs, stack } = SERVICES[id];
  const path = servicePath(id, locale);
  const contactHref = worldPath("ranger", locale);
  const secondary =
    id === "3d"
      ? { href: worldPath("tesseract", locale), label: copy.experiments }
      : { href: worldPath("endurance", locale), label: copy.projects };

  return (
    <SiteShell
      locale={locale}
      page={{ kind: "service", id }}
      activeWorldId="ranger"
      mainClassName="services-route"
      footerLabel={servicesLabel(locale)}
    >
      <StructuredData
        locale={locale}
        breadcrumb={[
          { path: contactHref, name: getWorld("ranger", locale).prose.title },
          { path: servicesPath(locale), name: copy.services },
          { path, name: service.name },
        ]}
        services={[{ path, name: service.name, description: service.seoDescription }]}
      />

      <div className="services-sky" aria-hidden="true">
        <span className="services-sky__nebula" />
        <span className="services-sky__stars" />
      </div>

      <div className="services-page">
        <section className="svc-hero" aria-labelledby="svc-title">
          <div className="svc-hero__copy">
            <p className="svc-kicker">
              <i aria-hidden="true" /> {service.kicker}
            </p>
            <h1 id="svc-title">{service.heading}</h1>
            <p className="svc-hero__lead">{service.lead}</p>
            <div className="svc-actions">
              <Link className="button button--primary" href={`${contactHref}#transmision`}>
                {copy.cta} <span aria-hidden="true">→</span>
              </Link>
              <Link className="button button--ghost" href={secondary.href}>
                {secondary.label}
              </Link>
            </div>
          </div>

          <aside className="svc-brief" aria-label={copy.brief}>
            <p className="svc-label">{copy.brief}</p>
            <dl>
              {copy.terms.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <p className="svc-label">{copy.stack}</p>
            <ul className="svc-chips">
              {stack.map((tool) => (
                <li key={tool}>{tool}</li>
              ))}
            </ul>
          </aside>

          <span className="svc-horizon" aria-hidden="true" />
        </section>

        <section className="svc-section" aria-labelledby="svc-builds">
          <header className="svc-section__head">
            <p className="svc-label">{service.name}</p>
            <h2 id="svc-builds">{service.buildsTitle}</h2>
          </header>
          <ul className="svc-builds">
            {service.builds.map((item, index) => (
              <li key={item.title}>
                <span className="svc-card__index" aria-hidden="true">
                  {pad(index + 1)}
                </span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="svc-section" aria-labelledby="svc-proof">
          <header className="svc-section__head">
            <h2 id="svc-proof">{service.proofTitle}</h2>
            <p>{service.proofLead}</p>
          </header>
          {/* Tres pruebas (o seis) van de tres en tres: en dos columnas la tercera quedaba sola. */}
          <div className={proofs.length % 3 === 0 ? "svc-grid svc-grid--3" : "svc-grid"}>
            {proofs.map((proof, index) => {
              const text = service.proofs[index];
              const href = "project" in proof ? projectPath(proof.project, locale) : observatoryPath(proof.specimen, locale);
              const visual: Visual =
                "project" in proof
                  ? proof.visual
                  : { kind: "scene", small: specimenImage(proof.specimen, "800"), large: specimenImage(proof.specimen, "1600") };
              return (
                <article className="svc-card" key={text.title}>
                  <ServiceVisual visual={visual} alt={text.alt} />
                  <div className="svc-card__body">
                    <h3>
                      <Link href={href}>{text.title}</Link>
                    </h3>
                    <p className="svc-card__description">{text.body}</p>
                    <Link className="svc-card__more" href={href}>
                      {"project" in proof ? copy.open : copy.observe} <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="svc-section" aria-labelledby="svc-approach">
          <header className="svc-section__head">
            <h2 id="svc-approach">{service.approachTitle}</h2>
          </header>
          <ul className="svc-points">
            {service.approach.map((item) => (
              <li key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="svc-section svc-faq" aria-labelledby="svc-faq">
          <header className="svc-section__head">
            <p className="svc-label">{copy.faq}</p>
            <h2 id="svc-faq">{copy.faqTitle}</h2>
          </header>
          <div className="svc-faq__list">
            {service.questions.map(({ q, a }) => (
              <details key={q}>
                <summary>
                  {q}
                  <span aria-hidden="true" />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Los otros tres servicios y la página que los reúne: el enlace
            interno que reparte la autoridad entre las cuatro. */}
        <nav className="svc-section svc-others" aria-label={copy.others}>
          <p className="svc-label">{copy.others}</p>
          <ul>
            {SERVICE_IDS.filter((other) => other !== id).map((other) => (
              <li key={other}>
                <Link href={servicePath(other, locale)}>
                  {SERVICE_DETAIL[locale][other].name} <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
            <li>
              <Link href={servicesPath(locale)}>
                {copy.all} <span aria-hidden="true">→</span>
              </Link>
            </li>
          </ul>
        </nav>

        <section className="svc-closing" aria-labelledby="svc-closing">
          <span className="svc-closing__ring" aria-hidden="true" />
          <h2 id="svc-closing">{copy.closingTitle}</h2>
          <p>{copy.closing}</p>
          <div className="svc-actions svc-actions--center">
            <Link className="button button--primary" href={`${contactHref}#transmision`}>
              {copy.cta} <span aria-hidden="true">→</span>
            </Link>
            <a className="button button--ghost" href={`https://wa.me/${SITE_PROFILE.whatsapp}`} target="_blank" rel="noreferrer">
              {copy.whatsapp}
            </a>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
