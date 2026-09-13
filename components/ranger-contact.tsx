import Image from "next/image";
import Link from "next/link";
import { SITE_PROFILE, type Locale } from "@/content/site.data";
import { getWorldNeighbours, getWorldPath, type World } from "@/lib/worlds";
import { ContactChannels } from "./contact-channels";
import { ContactForm } from "./contact-form";
import { RangerCockpit } from "./ranger-cockpit";
import { StructuredData } from "./structured-data";
import "./ranger-contact.css";

/** The deck is decorative; every contact route and the form are server-rendered. */
export function RangerContact({ world, locale }: { world: World; locale: Locale }) {
  const { prose } = world;
  const { previous } = getWorldNeighbours(world, locale);

  return (
    <article className="ranger-page" data-world="ranger">
      <StructuredData locale={locale} breadcrumb={{ path: getWorldPath(world, locale), name: prose.title }} />
      <RangerCockpit>
        <div className="ranger-view" aria-hidden="true">
          <Image src="/images/ranger/observation-deck.webp" alt="" fill sizes="100vw" preload />
          <div className="ranger-view__shade" />
        </div>
        <header className="ranger-hero__copy">
          <p className="ranger-kicker"><span className="ranger-led" aria-hidden="true" /> DESTINO 06 <span>/</span> RANGER</p>
          <h1>{prose.title}<span aria-hidden="true">.</span></h1>
          <p className="ranger-hero__line">{prose.eyebrow}</p>
          <p className="ranger-hero__intro">{prose.introduction}</p>
          <a className="ranger-primary" href="#transmision">Escribir un mensaje <span aria-hidden="true">↗</span></a>
        </header>
        <div className="ranger-deck__caption" aria-hidden="true"><span>RANGER / 06</span><span>NAVE DE ENLACE</span><i /></div>
        <div className="ranger-hero__channels"><ContactChannels /></div>
      </RangerCockpit>

      <section className="ranger-transmission" id="transmision" aria-labelledby="ranger-transmission-title">
        <div className="ranger-transmission__intro">
          <p className="ranger-kicker">DE TU UNIVERSO AL MÍO</p>
          <h2 id="ranger-transmission-title">Solo hace falta<br /><em>una primera señal.</em></h2>
          <p>Cuéntame qué tienes en mente. Yo pongo el diseño, el código y las ganas de hacerlo realidad.</p>
          <div className="ranger-service-list" aria-label="Podemos trabajar en">
            {prose.panels.map((panel) => <span key={panel.title}>{panel.title}</span>)}
          </div>
          <div className="ranger-signature"><span className="ranger-signature__mark" aria-hidden="true">J.</span><div><strong>Jonás Javier</strong><span>Diseño & desarrollo · {SITE_PROFILE.locality}</span></div></div>
        </div>
        <div className="ranger-form-panel">
          <div className="ranger-panel-label"><span><i className="ranger-led" aria-hidden="true" /> NUEVA TRANSMISIÓN</span><span aria-hidden="true">↗ 06</span></div>
          <ContactForm />
        </div>
      </section>

      <aside className="ranger-dossier" aria-label="Perfil profesional y currículum">
        <div><p className="ranger-kicker">ANTES DEL DESPEGUE</p><p>Un poco más sobre quién va a bordo.</p></div>
        <div className="ranger-dossier__links">
          <a href={SITE_PROFILE.github} target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a>
          <a href={SITE_PROFILE.linkedin} target="_blank" rel="noreferrer">LinkedIn <span aria-hidden="true">↗</span></a>
          <a download href="/cv/jonas-javier-cv-es.pdf">CV español <span>PDF ↓</span></a>
          <a download href="/cv/jonas-javier-cv-en-ats.pdf">CV English <span>PDF ↓</span></a>
        </div>
      </aside>
      <div className="ranger-farewell"><span aria-hidden="true">✳</span><p>{prose.closing}</p></div>
      <nav className="ranger-neighbours" aria-label="Destinos contiguos">
        {previous ? <Link href={getWorldPath(previous, locale)} rel="prev"><span aria-hidden="true">←</span><span><small>{previous.cosmicName}</small>{previous.prose.title}</span></Link> : null}
        <span className="ranger-kicker" aria-hidden="true">FIN DE LA EXPLORACIÓN / INICIO DE ALGO MÁS</span>
      </nav>
    </article>
  );
}
