import type { Metadata } from "next";
import Link from "next/link";
import { SITE_PROFILE, type Locale } from "@/content/site.data";
import { privacyLabel } from "@/lib/footer-labels";
import { defineCopy } from "@/lib/i18n";
import { pageAlternatesMetadata, privacyPath, worldPath } from "@/lib/page-paths";
import { defaultOgImage, siteOpenGraph } from "@/lib/site-metadata";
import { SiteShell } from "./site-shell";

const COPY = defineCopy({
  es: {
    title: "Privacidad del canal de contacto",
    description: "Cómo se procesan los datos enviados a través de Jonás Orbit.",
    kicker: "PROTOCOLO RANGER / PRIVACIDAD",
    heading: "Una transmisión breve y transparente.",
    lead: "El formulario existe para iniciar una conversación profesional. No crea una cuenta, no suscribe a publicidad y no guarda tus datos en una base de datos del portafolio.",
    sections: [
      {
        title: "Qué se recibe",
        body: "Nombre, correo, tipo de proyecto y mensaje. Solo se utilizan para comprender tu solicitud y responderte.",
      },
      {
        title: "Cómo viaja",
        body: "Cloudflare Turnstile ayuda a bloquear abuso y Resend entrega el mensaje al correo profesional. Ambos procesan los datos técnicos necesarios para prestar esos servicios.",
      },
      {
        title: "Dónde permanece",
        body: "El mensaje queda en el buzón profesional el tiempo necesario para la conversación y el seguimiento legítimo de la solicitud.",
      },
    ],
    controlTitle: "Tu control",
    control: "Puedes pedir acceso, corrección o eliminación escribiendo a",
    cloudflare: "Privacidad de Cloudflare",
    resend: "Privacidad de Resend",
    back: "Volver al contacto",
  },
  en: {
    title: "Contact channel privacy",
    description: "How the data you send through Jonás Orbit is handled.",
    kicker: "RANGER PROTOCOL / PRIVACY",
    heading: "A short, transparent transmission.",
    lead: "The form exists to start a professional conversation. It doesn’t create an account, doesn’t sign you up for marketing, and doesn’t store your data in a portfolio database.",
    sections: [
      {
        title: "What I receive",
        body: "Your name, email, project type and message. They’re used only to understand your request and reply to you.",
      },
      {
        title: "How it travels",
        body: "Cloudflare Turnstile helps block abuse and Resend delivers the message to my work inbox. Both process the technical data they need to provide those services.",
      },
      {
        title: "Where it stays",
        body: "The message stays in my work inbox for as long as the conversation and any legitimate follow-up on your request require.",
      },
    ],
    controlTitle: "Your control",
    control: "You can ask for access, correction or deletion by writing to",
    cloudflare: "Cloudflare privacy policy",
    resend: "Resend privacy policy",
    back: "Back to contact",
  },
});

export function privacyMetadata(locale: Locale): Metadata {
  const copy = COPY[locale];
  return {
    title: copy.title,
    description: copy.description,
    // El canonical evita duplicados si la URL llega con parámetros de campaña
    // desde LinkedIn o el CV.
    alternates: pageAlternatesMetadata({ kind: "privacy" }, locale),
    openGraph: {
      ...siteOpenGraph(locale),
      title: copy.title,
      description: copy.description,
      url: privacyPath(locale),
      images: [defaultOgImage(locale)],
    },
  };
}

/** La página legal del formulario, en los dos idiomas (`/es/privacidad`, `/en/privacy`). */
export function PrivacyPage({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  return (
    <SiteShell
      locale={locale}
      page={{ kind: "privacy" }}
      mainClassName="privacy-page"
      footerLabel={privacyLabel(locale)}
    >
      <p className="section-kicker">{copy.kicker}</p>
      <h1>{copy.heading}</h1>
      <p className="privacy-page__lead">{copy.lead}</p>

      <div className="privacy-page__grid">
        {copy.sections.map((section, index) => (
          <section key={section.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
        <section>
          <span>04</span>
          <h2>{copy.controlTitle}</h2>
          <p>
            {copy.control}{" "}
            <a href={`mailto:${SITE_PROFILE.email}`}>{SITE_PROFILE.email}</a>.
          </p>
        </section>
      </div>

      <div className="privacy-page__links">
        <a href="https://www.cloudflare.com/privacypolicy/" rel="noreferrer" target="_blank">
          {copy.cloudflare} ↗
        </a>
        <a href="https://resend.com/legal/privacy-policy" rel="noreferrer" target="_blank">
          {copy.resend} ↗
        </a>
        <Link href={worldPath("ranger", locale)}>{copy.back} ←</Link>
      </div>
    </SiteShell>
  );
}
