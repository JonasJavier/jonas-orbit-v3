import Link from "next/link";
import { SITE_PROFILE, type Locale } from "@/content/site.data";
import { defineCopy } from "@/lib/i18n";
import { homePath, worldPath } from "@/lib/page-paths";
import { getWorld } from "@/lib/worlds";

const COPY = defineCopy({
  es: {
    kicker: "RANGER / TRANSMISIÓN CONFIRMADA",
    heading: "Tu señal llegó completa.",
    lead: "Gracias por compartir el contexto. Leeré el mensaje personalmente y responderé por el correo que indicaste tan pronto como pueda.",
    status: "ESTADO",
    received: "RECIBIDO",
    next: "PRÓXIMO PASO",
    review: "REVISIÓN HUMANA",
    projects: "Explorar proyectos",
    home: "Volver al inicio",
    addMore: "¿Necesitas añadir algo? Escribe a",
    orBack: "o vuelve a",
  },
  en: {
    kicker: "RANGER / TRANSMISSION CONFIRMED",
    heading: "Your signal came through loud and clear.",
    lead: "Thanks for sharing the context. I’ll read your message myself and reply to the email you gave me as soon as I can.",
    status: "STATUS",
    received: "RECEIVED",
    next: "NEXT STEP",
    review: "HUMAN REVIEW",
    projects: "Explore projects",
    home: "Back to home",
    addMore: "Need to add something? Write to",
    orBack: "or go back to",
  },
});

/** La confirmación del formulario de contacto: fuera del índice, dentro del viaje. */
export function ContactThanks({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  const ranger = getWorld("ranger", locale);
  return (
    <>
      <div className="transmission-page__signal" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="section-kicker">{copy.kicker}</p>
      <h1>{copy.heading}</h1>
      <p className="transmission-page__lead">{copy.lead}</p>
      <div className="transmission-page__status">
        <span>{copy.status}</span>
        <strong>{copy.received}</strong>
        <span>{copy.next}</span>
        <strong>{copy.review}</strong>
      </div>
      <div className="transmission-page__actions">
        <Link className="button button--primary" href={worldPath("endurance", locale)}>
          {copy.projects} <span aria-hidden="true">→</span>
        </Link>
        <Link className="button button--ghost" href={homePath(locale)}>
          {copy.home}
        </Link>
      </div>
      <p className="transmission-page__fallback">
        {copy.addMore}{" "}
        <a href={`mailto:${SITE_PROFILE.email}`}>{SITE_PROFILE.email}</a>{" "}
        {copy.orBack} <Link href={worldPath("ranger", locale)}>{ranger.prose.title}</Link>.
      </p>
    </>
  );
}
