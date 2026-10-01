import Link from "next/link";
import { SITE_PROFILE, type Locale } from "@/content/site.data";
import { defineCopy } from "@/lib/i18n";
import { privacyPath, servicesPath, thanksPath } from "@/lib/page-paths";
import { WORLD_COPY } from "@/lib/world-copy";
import { getWorldNeighbours, getWorldPath, type World } from "@/lib/worlds";
import { ContactChannels } from "./contact-channels";
import { DownloadIcon } from "./download-icon";
import { RangerCockpit, RangerReadouts } from "./ranger-cockpit";
import { RangerConsole } from "./ranger-console";
import { RangerScope, RangerVisor } from "./ranger-instruments";
import { RangerViewport } from "./ranger-viewport";
import { StructuredData } from "./structured-data";
import "./ranger-contact.css";

const COPY = defineCopy({
  es: {
    write: "Escribir un mensaje",
    orEmail: "o abrir mi correo",
    console: "Consola de transmisión",
    fromYou: "De tu universo al mío",
    title: ["Solo hace falta", "una primera señal."],
    lead: "Cuéntame qué tienes en mente. Yo pongo el diseño, el código y las ganas de hacerlo realidad.",
    manifest: "Qué puedo llevar a bordo",
    services: "Ver servicios",
    signature: "Diseño & desarrollo",
    relay: "Canales directos y registro de a bordo",
    log: "Registro de a bordo",
    crew: "Tripulación",
    open: "Canal abierto",
    cvEs: "CV español",
    cvEn: "CV English",
    end: "Fin de la exploración / Inicio de algo más",
  },
  en: {
    write: "Write a message",
    orEmail: "or open my email",
    console: "Transmission console",
    fromYou: "From your universe to mine",
    title: ["All it takes is", "a first signal."],
    lead: "Tell me what you have in mind. I’ll bring the design, the code and the drive to make it real.",
    manifest: "What I can bring on board",
    services: "See services",
    signature: "Design & development",
    relay: "Direct channels and ship’s log",
    log: "Ship’s log",
    crew: "Crew",
    open: "Channel open",
    cvEs: "CV Español",
    cvEn: "CV English",
    end: "End of exploration / Start of something more",
  },
});

/**
 * Ranger — cabina de mando. El visitante va sentado dentro de la nave de
 * enlace, cruzando un agujero de gusano: el ventanal ocupa la pantalla entera
 * con lo mínimo encima —destino, título, una línea y UN botón—. Debajo, primero
 * la consola del formulario, y después un solo bloque con los canales directos
 * (correo, WhatsApp, LinkedIn), el radar y el registro de a bordo (CV y
 * GitHub). Todo lo que importa es HTML servido; la cabina sólo lo enmarca.
 */
export function RangerContact({ world, locale }: { world: World; locale: Locale }) {
  const { prose } = world;
  const { previous } = getWorldNeighbours(world, locale);
  const copy = COPY[locale];
  const shared = WORLD_COPY[locale];
  const destination = `${String(world.order).padStart(2, "0")} / ${world.cosmicName}`;

  return (
    <article className="ranger-page" data-world="ranger">
      <StructuredData locale={locale} breadcrumb={[{ path: getWorldPath(world, locale), name: prose.title }]} />
      <RangerCockpit>
        <RangerViewport />
        <RangerVisor />
        <div className="ranger-hud">
          <header className="ranger-hud__copy">
            <p className="ranger-kicker"><span className="ranger-led" data-state="cyan" aria-hidden="true" /><span>{shared.destination} {destination}</span></p>
            <h1>{prose.title}</h1>
            <p className="ranger-hud__line">{prose.eyebrow}</p>
            <div className="ranger-hud__actions">
              <a className="ranger-cta" href="#transmision">{copy.write} <span aria-hidden="true">↓</span></a>
              <a className="ranger-hud__link" href={`mailto:${SITE_PROFILE.email}`}>{copy.orEmail} <span aria-hidden="true">↗</span></a>
            </div>
          </header>
          <RangerReadouts name={world.cosmicName} />
        </div>
      </RangerCockpit>

      <section className="ranger-transmission" id="transmision" aria-labelledby="ranger-transmission-title">
        <div className="ranger-transmission__intro">
          <p className="ranger-kicker"><span>{copy.console}</span><span className="ranger-kicker__sep" aria-hidden="true">·</span><span>{copy.fromYou}</span></p>
          <h2 id="ranger-transmission-title">{copy.title[0]}<br /><em>{copy.title[1]}</em></h2>
          <p>{copy.lead}</p>
          <dl className="ranger-manifest" aria-label={copy.manifest}>
            {prose.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
          </dl>
          <Link className="ranger-hud__link ranger-services-link" href={servicesPath(locale)}>{copy.services} <span aria-hidden="true">→</span></Link>
          <div className="ranger-signature"><span className="ranger-signature__mark" aria-hidden="true">J.</span><div><strong>{SITE_PROFILE.name}</strong><span>{copy.signature} · {SITE_PROFILE.locality}</span></div></div>
        </div>
        <RangerConsole thanksHref={thanksPath(locale)} privacyHref={privacyPath(locale)} />
      </section>

      {/*
        El panel de enlace: frecuencias, radar y registro de a bordo en UNA
        pieza. Va después del formulario porque el formulario es la vía
        principal; esto es para quien prefiere escribir por su cuenta o leer
        antes quién va a bordo.
      */}
      <section className="ranger-relay" id="canales" aria-labelledby="ranger-relay-title">
        <h2 className="visually-hidden" id="ranger-relay-title">{copy.relay}</h2>
        <div className="ranger-relay__panel">
          <div className="ranger-relay__channels"><ContactChannels /></div>
          <div className="ranger-relay__crew">
            <div className="ranger-module__label"><span>{copy.log}</span><span aria-hidden="true">{copy.crew}</span></div>
            <div className="ranger-relay__scope">
              <RangerScope />
              <p className="ranger-relay__status"><i className="ranger-led" data-state="on" aria-hidden="true" /> {copy.open}</p>
            </div>
            <div className="ranger-relay__docs">
              <a download href="/cv/jonas-javier-cv-es.pdf" hrefLang="es"><span>{copy.cvEs}</span><span className="ranger-relay__tag"><DownloadIcon /> PDF</span></a>
              <a download href="/cv/jonas-javier-cv-en-ats.pdf" hrefLang="en"><span>{copy.cvEn}</span><span className="ranger-relay__tag"><DownloadIcon /> PDF</span></a>
              <a href={SITE_PROFILE.github} target="_blank" rel="noreferrer"><span>GitHub</span><span className="ranger-relay__tag" aria-hidden="true">↗</span></a>
            </div>
          </div>
        </div>
      </section>

      <div className="ranger-farewell"><span aria-hidden="true">✳</span><p>{prose.closing}</p></div>
      <nav className="ranger-neighbours" aria-label={shared.neighbours}>
        {previous ? <Link href={getWorldPath(previous, locale)} rel="prev"><span aria-hidden="true">←</span><span><small>{previous.cosmicName}</small>{previous.prose.title}</span></Link> : null}
        <span className="ranger-kicker" aria-hidden="true">{copy.end}</span>
      </nav>
    </article>
  );
}
