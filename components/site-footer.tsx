import Link from "next/link";
import type { CSSProperties } from "react";
import { SITE_PROFILE, type Locale } from "@/content/site.data";
import type { WorldId } from "@/content/worlds.data";
import { getWorldNavItems } from "@/lib/worlds";
import "./site-footer.css";

function Arrow({ up = false }: { up?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="site-footer__arrow">
      <path d={up ? "M12 19V5m-6 6 6-6 6 6" : "M5 12h14m-6-6 6 6-6 6"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A static, server-rendered end to the journey; every destination works without JS. */
export function SiteFooter({ locale, activeWorldId, label }: {
  locale: Locale;
  activeWorldId?: WorldId;
  label: string;
}) {
  const worlds = getWorldNavItems(locale);
  const contact = worlds.find((world) => world.id === "ranger")!;

  return (
    <footer className="site-footer">
      <div className="site-footer__sky" aria-hidden="true">
        <div className="site-footer__planet" />
        <svg className="site-footer__chart" viewBox="0 0 640 420" fill="none">
          <g stroke="currentColor" strokeWidth=".7">
            <ellipse cx="350" cy="225" rx="258" ry="104" transform="rotate(-28 350 225)" />
            <ellipse cx="350" cy="225" rx="306" ry="141" transform="rotate(-28 350 225)" strokeDasharray="2 9" />
            <path d="M350 35v22m-11-11h22M551 326v16m-8-8h16M98 214v12m-6-6h12" />
          </g>
          <circle cx="134" cy="283" r="4" fill="#bdeef4" />
          <circle cx="563" cy="161" r="3" fill="#f2c879" />
          <circle cx="563" cy="161" r="10" stroke="#f2c879" strokeOpacity=".35" />
        </svg>
      </div>

      <div className="site-footer__inner">
        <div className="site-footer__topline">
          <span className="site-footer__eyebrow"><i aria-hidden="true" /> El viaje continúa</span>
          <a className="site-footer__top" href="#main-content">Volver arriba <Arrow up /></a>
        </div>

        <div className="site-footer__invitation">
          <h2>Tu próxima idea,<br /><span>un nuevo universo.</span></h2>
          <p>Diseño y desarrollo para llevarla más lejos.</p>
          {activeWorldId === "ranger" ? (
            <a className="site-footer__cta" href={`mailto:${SITE_PROFILE.email}`}>Escríbeme directamente <Arrow /></a>
          ) : (
            <Link className="site-footer__cta" href={contact.href} prefetch={false}>Hablemos de tu proyecto <Arrow /></Link>
          )}
        </div>

        <div className="site-footer__directory">
          <div className="site-footer__identity">
            <Link className="site-footer__brand" href={`/${locale}`} aria-label="Jonás Orbit, volver al mapa">
              <svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><circle cx="20" cy="20" r="10" stroke="currentColor" /><ellipse cx="20" cy="20" rx="19" ry="7" transform="rotate(-35 20 20)" stroke="currentColor" /><circle cx="32" cy="10" r="2.5" fill="currentColor" /></svg>
              <span>JONÁS <strong>ORBIT</strong></span>
            </Link>
            <p>{SITE_PROFILE.jobTitle}</p>
            <span className="site-footer__location">{SITE_PROFILE.locality}, República Dominicana</span>
            <div className="site-footer__socials" aria-label="Perfiles profesionales">
              <a href={SITE_PROFILE.github}>GitHub <span aria-hidden="true">↗</span></a>
              <a href={SITE_PROFILE.linkedin}>LinkedIn <span aria-hidden="true">↗</span></a>
              <a href={`mailto:${SITE_PROFILE.email}`}>Email <span aria-hidden="true">↗</span></a>
            </div>
          </div>

          <nav className="site-footer__nav" aria-label="Destinos del pie">
            <div className="site-footer__nav-heading">
              <span className="site-footer__eyebrow">Sigue explorando</span>
              <Link href={`/${locale}`} prefetch={false}>Mapa estelar <span aria-hidden="true">↗</span></Link>
            </div>
            <ol>
              {worlds.map((world) => (
                <li key={world.id} style={{ "--destination-accent": world.accent } as CSSProperties}>
                  <Link href={world.href} prefetch={false} aria-current={activeWorldId === world.id ? "location" : undefined}>
                    <span className="site-footer__number" aria-hidden="true">{String(world.order).padStart(2, "0")}</span>
                    <span className="site-footer__destination">{world.shortLabel}<small>{world.cosmicName}</small></span>
                    <span className="site-footer__destination-arrow" aria-hidden="true">↗</span>
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        <div className="site-footer__bottom">
          <small>© {new Date().getFullYear()} Jonás Javier</small>
          <span className="site-footer__position">{label}</span>
          <Link href={`/${locale}/privacidad`} prefetch={false}>Privacidad</Link>
        </div>
      </div>
    </footer>
  );
}
