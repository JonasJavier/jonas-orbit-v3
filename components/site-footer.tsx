import Link from "next/link";
import type { CSSProperties } from "react";
import { SITE_PROFILE, type Locale } from "@/content/site.data";
import type { WorldId } from "@/content/worlds.data";
import { getWorldNavItems } from "@/lib/worlds";
import { FooterSky } from "./footer-sky";
import "./site-footer.css";

function Arrow({ up = false }: { up?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="site-footer__arrow">
      <path d={up ? "M12 19V5m-6 6 6-6 6 6" : "M5 12h14m-6-6 6 6-6 6"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Server-rendered content with a shared, progressively enhanced observatory. */
export function SiteFooter({ locale, activeWorldId, label }: {
  locale: Locale;
  activeWorldId?: WorldId;
  label: string;
}) {
  const worlds = getWorldNavItems(locale);
  const contact = worlds.find((world) => world.id === "ranger")!;

  return (
    <footer className="site-footer">
      <FooterSky />

      <div className="site-footer__inner">
        <div className="site-footer__topline">
          <span className="site-footer__eyebrow"><i aria-hidden="true" /> El viaje continúa</span>
          <a className="site-footer__top" href="#main-content">Volver arriba <Arrow up /></a>
        </div>

        <div className="site-footer__hero">
          <div className="site-footer__invitation">
            <h2>Tu próxima idea,<br /><span>un nuevo universo.</span></h2>
            <p>Diseño y desarrollo para llevarla más lejos.</p>
            {activeWorldId === "ranger" ? (
              <a className="site-footer__cta" href={`mailto:${SITE_PROFILE.email}`}>Escríbeme directamente <Arrow /></a>
            ) : (
              <Link className="site-footer__cta" href={contact.href} prefetch={false}>Hablemos de tu proyecto <Arrow /></Link>
            )}
          </div>

          <Link className="site-footer__portal" href={`/${locale}`} prefetch={false} aria-label="Mapa estelar, volver al sistema">
            <svg className="site-footer__orrery" viewBox="0 0 360 360" fill="none" aria-hidden="true">
              <circle className="site-footer__orbit-outer" cx="180" cy="180" r="164" />
              <circle cx="180" cy="180" r="140" strokeDasharray="1 9" />
              <ellipse cx="180" cy="180" rx="159" ry="66" transform="rotate(-35 180 180)" />
              <circle className="site-footer__orbit-light" cx="180" cy="180" r="164" strokeDasharray="100 930" pathLength="1030" />
              <path d="M180 8v16m0 312v16M8 180h16m312 0h16" />
              <circle className="site-footer__beacon" cx="310" cy="85" r="3" />
              <circle className="site-footer__beacon" cx="49" cy="273" r="2" />
            </svg>
            <span className="site-footer__portal-core"><Arrow /><span>Mapa estelar</span><small>Volver al sistema</small></span>
          </Link>
        </div>

        <div className="site-footer__directory">
          <nav className="site-footer__nav" aria-label="Destinos del pie">
            <div className="site-footer__nav-heading">
              <span className="site-footer__eyebrow">Sigue explorando</span>
              <span className="site-footer__nav-caption">Seis destinos. Un mismo universo.</span>
            </div>
            <ol>
              {worlds.map((world) => (
                <li key={world.id} style={{ "--destination-accent": world.accent } as CSSProperties}>
                  <Link href={world.href} prefetch={false} aria-current={activeWorldId === world.id ? "location" : undefined}>
                    <span className="site-footer__number" aria-hidden="true"><i />{String(world.order).padStart(2, "0")}</span>
                    <span className="site-footer__destination">{world.shortLabel}<small>{world.cosmicName}</small></span>
                    <span className="site-footer__destination-arrow" aria-hidden="true">↗</span>
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        <div className="site-footer__identity">
          <div>
            <Link className="site-footer__brand" href={`/${locale}`} prefetch={false} aria-label="Jonás Orbit, volver al mapa">
              <span>JONÁS</span>
              <span className="site-footer__wordmark-orbit"><svg viewBox="0 0 26 28" fill="none" aria-hidden="true"><circle cx="13" cy="14" r="9.5" /><path d="M2.5 26 23.5 2" /></svg>RBIT</span>
            </Link>
            <p>{SITE_PROFILE.jobTitle}</p>
          </div>
          <span className="site-footer__location">Hecho desde<br /><span>{SITE_PROFILE.locality}, República Dominicana</span></span>
          <div className="site-footer__socials" aria-label="Perfiles profesionales">
            <a href={SITE_PROFILE.github}>GitHub <span aria-hidden="true">↗</span></a>
            <a href={SITE_PROFILE.linkedin}>LinkedIn <span aria-hidden="true">↗</span></a>
            <a href={`mailto:${SITE_PROFILE.email}`}>Email <span aria-hidden="true">↗</span></a>
          </div>
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
