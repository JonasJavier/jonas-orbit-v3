/* Las capturas de los casos ya están preparadas en su escalera WebP
   (`tools/prepare-projects.mjs`): se sirven tal cual, como en Proyectos. */
/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import type { ProjectId } from "@/content/projects.data";
import { SITE_PROFILE, type Locale } from "@/content/site.data";
import { screenSources } from "@/lib/engineering-table";
import { servicesLabel } from "@/lib/footer-labels";
import { defineCopy } from "@/lib/i18n";
import { blogPath, pageAlternatesMetadata, projectPath, servicesPath, worldPath } from "@/lib/page-paths";
import { getF1AProjects } from "@/lib/projects";
import { defaultOgImage, siteOpenGraph } from "@/lib/site-metadata";
import { getWorld } from "@/lib/worlds";
import { SiteShell } from "./site-shell";
import { StructuredData } from "./structured-data";
import "./services-page.css";

type ServiceId = "web" | "commerce" | "mobile" | "design-3d";

/** Cómo se enseña cada servicio: una captura real de un caso publicado. */
type Visual =
  | { kind: "browser"; src: string }
  | { kind: "phones"; srcs: readonly [string, string] }
  | { kind: "scene"; src: string };

/**
 * Cada servicio con su prueba: sólo casos publicados en Proyectos (y, para el
 * 3D, los Experimentos). Nada de precios, clientes ni cifras que el sitio no
 * pueda enseñar. La imagen de cada tarjeta es una captura de esos casos.
 */
const SERVICES: readonly { id: ServiceId; proof: readonly ProjectId[]; experiments?: true; visual: Visual }[] = [
  { id: "web", proof: ["omsta", "network", "wikiverse"], visual: { kind: "browser", src: "/media/projects/omsta/w02-dashboard.png" } },
  { id: "commerce", proof: ["delicate", "izaks-photos"], visual: { kind: "browser", src: "/media/projects/delicate/01-home-desktop.png" } },
  {
    id: "mobile",
    proof: ["omsta"],
    visual: { kind: "phones", srcs: ["/media/projects/omsta/m02-inicio.png", "/media/projects/omsta/m03-reservas.png"] },
  },
  {
    id: "design-3d",
    proof: ["delicate"],
    experiments: true,
    visual: { kind: "scene", src: "/images/articulos/agujero-negro/gargantua-cinematografica" },
  },
];

/** Lo que el sitio acredita (`SITE_PROFILE.knowsAbout`), sin las disciplinas. */
const STACK = ["Django", "Django REST Framework", "React", "TypeScript", "Next.js", "PostgreSQL", "React Native", "Three.js", "WebGL"];

const COPY = defineCopy({
  es: {
    seoTitle: "Desarrollador web freelance en Santo Domingo — Servicios",
    seoDescription:
      "Jonás Javier Encarnación, desarrollador full-stack freelance: aplicaciones web a medida, tiendas en línea, apps móviles y webs 3D. En remoto o en Santo Domingo.",
    breadcrumb: "Servicios",
    kicker: "SERVICIOS · FREELANCE",
    heading: "Desarrollo web y móvil a medida.",
    lead: "Soy Jonás Javier Encarnación, desarrollador full-stack y diseñador UX/UI en Santo Domingo, República Dominicana. Diseño y construyo tu producto, de la idea al lanzamiento.",
    brief: "Ficha de trabajo",
    terms: [
      ["Modalidad", "Remoto, cualquier país"],
      ["En persona", "Santo Domingo"],
      ["Idiomas", "Español · English"],
    ],
    stack: "Herramientas",
    cta: "Cuéntame tu proyecto",
    projects: "Ver proyectos",
    offer: "Qué hago",
    offerTitle: "Lo que puedo construir para ti.",
    offerLead: "Cuatro tipos de proyecto, cada uno con un caso publicado que puedes abrir y revisar.",
    includes: "Incluye",
    allProjects: "Ver todos los proyectos",
    projectCount: (n: number) => `${n} casos completos, con su diseño y su ingeniería.`,
    proof: "Hecho en",
    experiments: "Experimentos 3D",
    services: {
      web: {
        name: "Aplicaciones web a medida",
        description: "Sistemas con Django y React para operar tu negocio: ERP, paneles internos y plataformas con usuarios y roles.",
        includes: ["Usuarios, roles y permisos", "Paneles, reportes y flujos de trabajo", "API REST e integraciones"],
        alt: "Panel principal de OMSTA, el ERP de una agencia de viajes",
      },
      commerce: {
        name: "Tiendas y webs de negocio",
        description: "Tiendas en línea y sitios con un catálogo que tú mismo administras, rápidos y preparados para buscadores.",
        includes: ["Catálogo que administras tú", "Diseño pensado para el móvil", "SEO técnico y carga rápida"],
        alt: "Portada de la tienda en línea de Delicaté",
      },
      mobile: {
        name: "Apps móviles",
        description: "Apps multiplataforma con React Native y Expo, conectadas al mismo sistema que tu web.",
        includes: ["iOS y Android con una sola base de código", "Conectada a la API de tu web", "Cada pantalla diseñada para el pulgar"],
        alt: "Dos pantallas de la app móvil de OMSTA: inicio y reservas",
      },
      "design-3d": {
        name: "Diseño UX/UI y webs 3D",
        description: "Interfaces pensadas antes de programarse y experiencias 3D interactivas con Three.js y WebGL, como este sitio.",
        includes: ["Interfaces y prototipos antes del código", "Sistemas de diseño y componentes", "Escenas 3D con Three.js y WebGL"],
        alt: "Gargantúa, el agujero negro trazado en tiempo real en este sitio",
      },
    } satisfies Record<ServiceId, { name: string; description: string; includes: string[]; alt: string }>,
    process: "Cómo trabajo",
    processTitle: "Del primer mensaje al lanzamiento.",
    steps: [
      { title: "Conversación", body: "Entiendo el problema, quién lo usará y qué significa que salga bien." },
      { title: "Propuesta", body: "Alcance, plazos y presupuesto por escrito antes de empezar." },
      { title: "Construcción", body: "Avances que puedes abrir y probar en un enlace real." },
      { title: "Lanzamiento", body: "Publicación, dominio y acompañamiento después de la entrega." },
    ],
    faq: "Preguntas frecuentes",
    faqTitle: "Antes de escribirme.",
    questions: [
      {
        q: "¿Trabajas con clientes fuera de República Dominicana?",
        a: "Sí. Trabajo en remoto con clientes de cualquier país, en español o en inglés. En Santo Domingo también podemos reunirnos en persona.",
      },
      {
        q: "¿Cuánto cuesta un proyecto?",
        a: "Depende del alcance. Después de la primera conversación te envío una propuesta por escrito con alcance, plazos y presupuesto, antes de empezar nada.",
      },
      {
        q: "¿Puedo ver el avance mientras se construye?",
        a: "Sí. Cada avance se publica en un enlace real que puedes abrir y probar desde tu ordenador o tu teléfono.",
      },
      {
        q: "¿También haces el diseño?",
        a: "Sí. Diseño la interfaz antes de programarla, así decidimos cómo se ve y cómo se usa antes de escribir código.",
      },
      {
        q: "¿Qué pasa después del lanzamiento?",
        a: "Me ocupo de la publicación y del dominio, y te acompaño después de la entrega.",
      },
    ],
    closingTitle: "¿Tienes una misión en mente?",
    closing: "Escríbeme con lo que necesitas. Leo cada mensaje y respondo personalmente.",
    whatsapp: "Escribir por WhatsApp",
    blog: "¿Quieres ver cómo trabajo por dentro? Lee el blog",
  },
  en: {
    seoTitle: "Freelance Web Developer in Santo Domingo — Services",
    seoDescription:
      "Jonás Javier Encarnación, freelance full-stack developer: custom web apps, online stores, mobile apps and 3D websites. Remote, or in person in Santo Domingo.",
    breadcrumb: "Services",
    kicker: "SERVICES · FREELANCE",
    heading: "Custom web and mobile development.",
    lead: "I’m Jonás Javier Encarnación, a full-stack developer and UX/UI designer in Santo Domingo, Dominican Republic. I design and build your product, from the idea to launch.",
    brief: "Working terms",
    terms: [
      ["Working", "Remote, any country"],
      ["In person", "Santo Domingo"],
      ["Languages", "English · Español"],
    ],
    stack: "Tools",
    cta: "Tell me about your project",
    projects: "See projects",
    offer: "What I do",
    offerTitle: "What I can build for you.",
    offerLead: "Four kinds of project, each with a published case you can open and review.",
    includes: "Includes",
    allProjects: "See all projects",
    projectCount: (n: number) => `${n} full case studies, design and engineering included.`,
    proof: "Built in",
    experiments: "3D Experiments",
    services: {
      web: {
        name: "Custom web applications",
        description: "Django and React systems to run your business: ERPs, internal dashboards and platforms with users and roles.",
        includes: ["Users, roles and permissions", "Dashboards, reports and workflows", "REST APIs and integrations"],
        alt: "The main dashboard of OMSTA, a travel agency ERP",
      },
      commerce: {
        name: "Online stores and business sites",
        description: "Online stores and sites with a catalog you manage yourself, fast and ready for search engines.",
        includes: ["A catalog you manage yourself", "Designed for phones first", "Technical SEO and fast loading"],
        alt: "The home page of the Delicaté online store",
      },
      mobile: {
        name: "Mobile apps",
        description: "Cross-platform apps with React Native and Expo, connected to the same system as your website.",
        includes: ["iOS and Android from one codebase", "Connected to your website’s API", "Every screen designed for the thumb"],
        alt: "Two screens of the OMSTA mobile app: home and bookings",
      },
      "design-3d": {
        name: "UX/UI design and 3D websites",
        description: "Interfaces designed before they’re coded, and interactive 3D experiences with Three.js and WebGL, like this site.",
        includes: ["Interfaces and prototypes before code", "Design systems and components", "3D scenes with Three.js and WebGL"],
        alt: "Gargantua, the black hole ray-traced in real time on this site",
      },
    },
    process: "How I work",
    processTitle: "From the first message to launch.",
    steps: [
      { title: "Conversation", body: "I learn the problem, who will use it and what success looks like." },
      { title: "Proposal", body: "Scope, timeline and budget in writing before we start." },
      { title: "Build", body: "Progress you can open and try on a real link." },
      { title: "Launch", body: "Release, domain and support after delivery." },
    ],
    faq: "Frequently asked questions",
    faqTitle: "Before you write.",
    questions: [
      {
        q: "Do you work with clients outside the Dominican Republic?",
        a: "Yes. I work remotely with clients in any country, in English or Spanish. In Santo Domingo we can also meet in person.",
      },
      {
        q: "How much does a project cost?",
        a: "It depends on the scope. After our first conversation I send you a written proposal with scope, timeline and budget, before anything starts.",
      },
      {
        q: "Can I see progress while it’s being built?",
        a: "Yes. Each step is published on a real link you can open and try from your computer or your phone.",
      },
      {
        q: "Do you do the design too?",
        a: "Yes. I design the interface before coding it, so we decide how it looks and works before writing any code.",
      },
      {
        q: "What happens after launch?",
        a: "I take care of the release and the domain, and I support you after delivery.",
      },
    ],
    closingTitle: "Got a mission in mind?",
    closing: "Write to me with what you need. I read every message and reply myself.",
    whatsapp: "Message on WhatsApp",
    blog: "Want to see how I work under the hood? Read the blog",
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

/** La imagen de una tarjeta: un navegador, dos teléfonos o la escena 3D. */
function ServiceVisual({ visual, alt }: { visual: Visual; alt: string }) {
  if (visual.kind === "scene") {
    return (
      <div className="svc-visual svc-visual--scene">
        <img
          src={`${visual.src}-800.webp`}
          srcSet={`${visual.src}-800.webp 800w, ${visual.src}-1600.webp 1600w`}
          sizes="(max-width: 56rem) calc(100vw - 2.5rem), 36rem"
          width={1600}
          height={900}
          alt={alt}
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }
  if (visual.kind === "phones") {
    return (
      <div className="svc-visual svc-visual--phones" role="img" aria-label={alt}>
        {visual.srcs.map((src) => {
          const image = screenSources(src, "mobile");
          return (
            <span className="svc-phone" key={src}>
              <img src={image.thumb} srcSet={image.srcSet} sizes="9rem" width={image.width} height={image.height} alt="" loading="lazy" decoding="async" />
            </span>
          );
        })}
      </div>
    );
  }
  const image = screenSources(visual.src, "desktop");
  return (
    <div className="svc-visual svc-visual--browser">
      <span className="svc-browser">
        <span className="svc-browser__bar" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <img
          src={image.thumb}
          srcSet={image.srcSet}
          sizes="(max-width: 56rem) calc(100vw - 4rem), 32rem"
          width={image.width}
          height={image.height}
          alt={alt}
          loading="lazy"
          decoding="async"
        />
      </span>
    </div>
  );
}

/**
 * `/es/contacto/servicios` y `/en/contact/services`: lo que Jonás ofrece como
 * freelance, cada servicio con el caso publicado que lo demuestra. Vive bajo
 * Contacto porque quien busca contratar tiene que llegar al formulario en un
 * paso, sin abrir un séptimo destino en la arquitectura de seis mundos.
 *
 * Fondo propio y opaco (`.services-sky`): la escena persistente duerme en
 * Contacto y su último fotograma no debe asomar. El hero termina en el
 * horizonte de un planeta; el resto de la página va sobre su lado oscuro.
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
      mainClassName="services-route"
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
          items: SERVICES.map(({ id }) => ({ id, name: copy.services[id].name, description: copy.services[id].description })),
        }}
      />

      <div className="services-sky" aria-hidden="true">
        <span className="services-sky__nebula" />
        <span className="services-sky__stars" />
      </div>

      <div className="services-page">
        <section className="svc-hero" aria-labelledby="svc-title">
          <div className="svc-hero__copy">
            <p className="svc-kicker">
              <i aria-hidden="true" /> {copy.kicker}
            </p>
            <h1 id="svc-title">{copy.heading}</h1>
            <p className="svc-hero__lead">{copy.lead}</p>
            <div className="svc-actions">
              <Link className="button button--primary" href={`${contactHref}#transmision`}>
                {copy.cta} <span aria-hidden="true">→</span>
              </Link>
              <Link className="button button--ghost" href={worldPath("endurance", locale)}>
                {copy.projects}
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
              {STACK.map((tool) => (
                <li key={tool}>{tool}</li>
              ))}
            </ul>
          </aside>

          <span className="svc-horizon" aria-hidden="true" />
        </section>

        <section className="svc-section" aria-labelledby="svc-offer">
          <header className="svc-section__head">
            <p className="svc-label">{copy.offer}</p>
            <h2 id="svc-offer">{copy.offerTitle}</h2>
            <p>{copy.offerLead}</p>
          </header>
          <div className="svc-grid">
            {SERVICES.map(({ id, proof, experiments, visual }, index) => {
              const service = copy.services[id];
              return (
                <article className="svc-card" key={id} id={id}>
                  <ServiceVisual visual={visual} alt={service.alt} />
                  <div className="svc-card__body">
                    <p className="svc-card__index" aria-hidden="true">
                      {pad(index + 1)}
                    </p>
                    <h3>{service.name}</h3>
                    <p className="svc-card__description">{service.description}</p>
                    <p className="svc-label svc-label--muted">{copy.includes}</p>
                    <ul className="svc-card__includes">
                      {service.includes.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
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
                  </div>
                </article>
              );
            })}
          </div>
          {/* Después de las pruebas, todas las demás: quien llegó hasta aquí quiere ver más. */}
          <div className="svc-more">
            <p>{copy.projectCount(projects.size)}</p>
            <Link className="button button--ghost" href={worldPath("endurance", locale)}>
              {copy.allProjects} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        <section className="svc-section" aria-labelledby="svc-process">
          <header className="svc-section__head">
            <p className="svc-label">{copy.process}</p>
            <h2 id="svc-process">{copy.processTitle}</h2>
          </header>
          <ol className="svc-steps">
            {copy.steps.map((step, index) => (
              <li key={step.title}>
                <span className="svc-steps__node" aria-hidden="true">
                  {pad(index + 1)}
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="svc-section svc-faq" aria-labelledby="svc-faq">
          <header className="svc-section__head">
            <p className="svc-label">{copy.faq}</p>
            <h2 id="svc-faq">{copy.faqTitle}</h2>
          </header>
          <div className="svc-faq__list">
            {copy.questions.map(({ q, a }) => (
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
          <Link className="svc-closing__blog" href={blogPath(locale)}>
            {copy.blog}&nbsp;<span aria-hidden="true">→</span>
          </Link>
        </section>
      </div>
    </SiteShell>
  );
}
