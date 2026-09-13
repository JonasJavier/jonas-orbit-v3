import Link from "next/link";
import { SITE_PROFILE, type Locale } from "@/content/site.data";
import { getWorldNeighbours, getWorldPath, type World } from "@/lib/worlds";
import { ContactChannels } from "./contact-channels";
import { DownloadIcon } from "./download-icon";
import { RangerCockpit, RangerFlightControl, RangerReadouts } from "./ranger-cockpit";
import { RangerConsole } from "./ranger-console";
import { RangerCanopy, RangerScope, RangerTape } from "./ranger-instruments";
import { RangerViewport } from "./ranger-viewport";
import { StructuredData } from "./structured-data";
import "./ranger-contact.css";

/**
 * Ranger — cabina de mando. El visitante va sentado dentro de la nave de
 * enlace: ventanal al frente, HUD sobre el cristal y un panel de instrumentos
 * donde viven los canales reales. Todo lo que importa —prosa, tres canales,
 * formulario, CV y vecinos— es HTML servido; la cabina sólo lo enmarca.
 */
export function RangerContact({ world, locale }: { world: World; locale: Locale }) {
  const { prose } = world;
  const { previous } = getWorldNeighbours(world, locale);
  const destination = `${String(world.order).padStart(2, "0")} / ${world.cosmicName}`;

  return (
    <article className="ranger-page" data-world="ranger">
      <StructuredData locale={locale} breadcrumb={{ path: getWorldPath(world, locale), name: prose.title }} />
      <RangerCockpit>
        <RangerViewport />
        <RangerCanopy />
        <div className="ranger-hud">
          <header className="ranger-hud__copy">
            <p className="ranger-kicker"><span className="ranger-led" data-state="cyan" aria-hidden="true" /><span>Destino {destination}</span><span className="ranger-kicker__sep" aria-hidden="true">·</span><span>Cabina de enlace</span></p>
            <h1>{prose.title}</h1>
            <p className="ranger-hud__line">{prose.eyebrow}</p>
            <p className="ranger-hud__intro">{prose.introduction}</p>
            <div className="ranger-hud__actions">
              <a className="ranger-cta" href="#transmision">Escribir un mensaje <span aria-hidden="true">↓</span></a>
              <a className="ranger-hud__link" href={`mailto:${SITE_PROFILE.email}`}>o abre el correo directamente <span aria-hidden="true">↗</span></a>
            </div>
          </header>
          <RangerReadouts destination={destination.toUpperCase()} />
          <RangerTape heading={world.placement.phase} />
        </div>
        <div className="ranger-dash">
          <div className="ranger-dash__grid">
            <div className="ranger-module ranger-module--freq"><ContactChannels /></div>
            <div className="ranger-module ranger-module--scope">
              <div className="ranger-module__label"><span>Radar</span><span aria-hidden="true">Corto alcance</span></div>
              <RangerScope />
              <p className="ranger-dash__status"><i className="ranger-led" data-state="on" aria-hidden="true" style={{ "--i": 3 } as React.CSSProperties} /> Canal abierto</p>
            </div>
            <div className="ranger-module ranger-module--ctrl">
              <div className="ranger-module__label"><span>Mandos</span><span aria-hidden="true">Ranger / {String(world.order).padStart(2, "0")}</span></div>
              <RangerFlightControl />
              <a className="ranger-dash__cta" href="#transmision">Abrir consola de transmisión <span aria-hidden="true">↓</span></a>
              <p className="ranger-dash__note">Sin compromiso. Una idea es un buen comienzo.</p>
            </div>
          </div>
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

      <aside className="ranger-dossier" aria-label="Perfil profesional y currículum">
        <div><p className="ranger-kicker"><span>Tripulación</span><span className="ranger-kicker__sep" aria-hidden="true">·</span><span>Registro de a bordo</span></p><p>Un poco más sobre quién va a bordo antes del despegue.</p></div>
        <div className="ranger-dossier__links">
          <a href={SITE_PROFILE.github} target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a>
          <a href={SITE_PROFILE.linkedin} target="_blank" rel="noreferrer">LinkedIn <span aria-hidden="true">↗</span></a>
          <a download href="/cv/jonas-javier-cv-es.pdf">CV español <span><DownloadIcon /> PDF</span></a>
          <a download href="/cv/jonas-javier-cv-en-ats.pdf">CV English <span><DownloadIcon /> PDF</span></a>
        </div>
      </aside>
      <div className="ranger-farewell"><span aria-hidden="true">✳</span><p>{prose.closing}</p></div>
      <nav className="ranger-neighbours" aria-label="Destinos contiguos">
        {previous ? <Link href={getWorldPath(previous, locale)} rel="prev"><span aria-hidden="true">←</span><span><small>{previous.cosmicName}</small>{previous.prose.title}</span></Link> : null}
        <span className="ranger-kicker" aria-hidden="true">Fin de la exploración / Inicio de algo más</span>
      </nav>
    </article>
  );
}
