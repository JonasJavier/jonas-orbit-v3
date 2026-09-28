import Link from "next/link";
import { SITE_PROFILE, type Locale } from "@/content/site.data";
import { getWorldNeighbours, getWorldPath, type World } from "@/lib/worlds";
import { ContactChannels } from "./contact-channels";
import { DownloadIcon } from "./download-icon";
import { RangerCockpit, RangerReadouts } from "./ranger-cockpit";
import { RangerConsole } from "./ranger-console";
import { RangerScope, RangerVisor } from "./ranger-instruments";
import { RangerViewport } from "./ranger-viewport";
import { StructuredData } from "./structured-data";
import "./ranger-contact.css";

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
  const destination = `${String(world.order).padStart(2, "0")} / ${world.cosmicName}`;

  return (
    <article className="ranger-page" data-world="ranger">
      <StructuredData locale={locale} breadcrumb={[{ path: getWorldPath(world, locale), name: prose.title }]} />
      <RangerCockpit>
        <RangerViewport />
        <RangerVisor />
        <div className="ranger-hud">
          <header className="ranger-hud__copy">
            <p className="ranger-kicker"><span className="ranger-led" data-state="cyan" aria-hidden="true" /><span>Destino {destination}</span></p>
            <h1>{prose.title}</h1>
            <p className="ranger-hud__line">{prose.eyebrow}</p>
            <div className="ranger-hud__actions">
              <a className="ranger-cta" href="#transmision">Escribir un mensaje <span aria-hidden="true">↓</span></a>
              <a className="ranger-hud__link" href={`mailto:${SITE_PROFILE.email}`}>o abrir mi correo <span aria-hidden="true">↗</span></a>
            </div>
          </header>
          <RangerReadouts name={world.cosmicName} />
        </div>
      </RangerCockpit>

      <section className="ranger-transmission" id="transmision" aria-labelledby="ranger-transmission-title">
        <div className="ranger-transmission__intro">
          <p className="ranger-kicker"><span>Consola de transmisión</span><span className="ranger-kicker__sep" aria-hidden="true">·</span><span>De tu universo al mío</span></p>
          <h2 id="ranger-transmission-title">Solo hace falta<br /><em>una primera señal.</em></h2>
          <p>Cuéntame qué tienes en mente. Yo pongo el diseño, el código y las ganas de hacerlo realidad.</p>
          <dl className="ranger-manifest" aria-label="Qué puedo llevar a bordo">
            {prose.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
          </dl>
          <div className="ranger-signature"><span className="ranger-signature__mark" aria-hidden="true">J.</span><div><strong>{SITE_PROFILE.name}</strong><span>Diseño & desarrollo · {SITE_PROFILE.locality}</span></div></div>
        </div>
        <RangerConsole />
      </section>

      {/*
        El panel de enlace: frecuencias, radar y registro de a bordo en UNA
        pieza. Va después del formulario porque el formulario es la vía
        principal; esto es para quien prefiere escribir por su cuenta o leer
        antes quién va a bordo.
      */}
      <section className="ranger-relay" id="canales" aria-labelledby="ranger-relay-title">
        <h2 className="visually-hidden" id="ranger-relay-title">Canales directos y registro de a bordo</h2>
        <div className="ranger-relay__panel">
          <div className="ranger-relay__channels"><ContactChannels /></div>
          <div className="ranger-relay__crew">
            <div className="ranger-module__label"><span>Registro de a bordo</span><span aria-hidden="true">Tripulación</span></div>
            <div className="ranger-relay__scope">
              <RangerScope />
              <p className="ranger-relay__status"><i className="ranger-led" data-state="on" aria-hidden="true" /> Canal abierto</p>
            </div>
            <div className="ranger-relay__docs">
              <a download href="/cv/jonas-javier-cv-es.pdf"><span>CV español</span><span className="ranger-relay__tag"><DownloadIcon /> PDF</span></a>
              <a download href="/cv/jonas-javier-cv-en-ats.pdf"><span>CV English</span><span className="ranger-relay__tag"><DownloadIcon /> PDF</span></a>
              <a href={SITE_PROFILE.github} target="_blank" rel="noreferrer"><span>GitHub</span><span className="ranger-relay__tag" aria-hidden="true">↗</span></a>
            </div>
          </div>
        </div>
      </section>

      <div className="ranger-farewell"><span aria-hidden="true">✳</span><p>{prose.closing}</p></div>
      <nav className="ranger-neighbours" aria-label="Destinos contiguos">
        {previous ? <Link href={getWorldPath(previous, locale)} rel="prev"><span aria-hidden="true">←</span><span><small>{previous.cosmicName}</small>{previous.prose.title}</span></Link> : null}
        <span className="ranger-kicker" aria-hidden="true">Fin de la exploración / Inicio de algo más</span>
      </nav>
    </article>
  );
}
