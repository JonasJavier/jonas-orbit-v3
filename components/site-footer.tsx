import Link from "next/link";
import type { CSSProperties } from "react";
import { SITE_PROFILE, type Locale } from "@/content/site.data";
import type { WorldId } from "@/content/worlds.data";
import { defineCopy } from "@/lib/i18n";
import { privacyPath } from "@/lib/page-paths";
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

const COPY = defineCopy({
  es: {
    journey: "El viaje continúa",
    top: "Volver arriba",
    headline: "Tu próxima idea,",
    headlineAccent: "un nuevo universo.",
    pitch: "Diseño y desarrollo para llevarla más lejos.",
    writeMe: "Escríbeme directamente",
    talk: "Hablemos de tu proyecto",
    portalLabel: "Mapa estelar, volver al sistema",
    map: "Mapa estelar",
    backToSystem: "Volver al sistema",
    navLabel: "Destinos del pie",
    keepExploring: "Sigue explorando",
    caption: "Seis destinos. Un mismo universo.",
    brandLabel: "Jonás Orbit, volver al mapa",
    madeIn: "Hecho desde",
    country: "República Dominicana",
    profiles: "Perfiles profesionales",
    privacy: "Privacidad",
  },
  en: {
    journey: "The journey continues",
    top: "Back to top",
    headline: "Your next idea,",
    headlineAccent: "a whole new universe.",
    pitch: "Design and engineering to take it further.",
    writeMe: "Email me directly",
    talk: "Let's talk about your project",
    portalLabel: "Star map, back to the system",
    map: "Star map",
    backToSystem: "Back to the system",
    navLabel: "Footer destinations",
    keepExploring: "Keep exploring",
    caption: "Six destinations. One universe.",
    brandLabel: "Jonás Orbit, back to the map",
    madeIn: "Made in",
    country: "Dominican Republic",
    profiles: "Professional profiles",
    privacy: "Privacy",
  },
});

/** Server-rendered content with a shared, progressively enhanced observatory. */
export function SiteFooter({ locale, activeWorldId, label }: {
  locale: Locale;
  activeWorldId?: WorldId;
  label: string;
}) {
  const copy = COPY[locale];
  const worlds = getWorldNavItems(locale);
  const contact = worlds.find((world) => world.id === "ranger")!;

  return (
    <footer className="site-footer">
      <FooterSky />

      <div className="site-footer__inner">
        <div className="site-footer__topline">
          <span className="site-footer__eyebrow"><i aria-hidden="true" /> {copy.journey}</span>
          <a className="site-footer__top" href="#main-content">{copy.top} <Arrow up /></a>
        </div>

        <div className="site-footer__hero">
          <div className="site-footer__invitation">
            <h2>{copy.headline}<br /><span>{copy.headlineAccent}</span></h2>
            <p>{copy.pitch}</p>
            {activeWorldId === "ranger" ? (
              <a className="site-footer__cta" href={`mailto:${SITE_PROFILE.email}`}>{copy.writeMe} <Arrow /></a>
            ) : (
              <Link className="site-footer__cta" href={contact.href} prefetch={false}>{copy.talk} <Arrow /></Link>
            )}
          </div>

          <Link className="site-footer__portal" href={`/${locale}`} prefetch={false} aria-label={copy.portalLabel}>
            <svg className="site-footer__orrery" viewBox="0 0 360 360" fill="none" aria-hidden="true">
              <circle className="site-footer__orbit-outer" cx="180" cy="180" r="164" />
              <circle cx="180" cy="180" r="140" strokeDasharray="1 9" />
              <ellipse cx="180" cy="180" rx="159" ry="66" transform="rotate(-35 180 180)" />
              <circle className="site-footer__orbit-light" cx="180" cy="180" r="164" strokeDasharray="100 930" pathLength="1030" />
              <path d="M180 8v16m0 312v16M8 180h16m312 0h16" />
              <circle className="site-footer__beacon" cx="310" cy="85" r="3" />
              <circle className="site-footer__beacon" cx="49" cy="273" r="2" />
            </svg>
            <span className="site-footer__portal-core"><Arrow /><span>{copy.map}</span><small>{copy.backToSystem}</small></span>
          </Link>
        </div>

        <div className="site-footer__directory">
          <nav className="site-footer__nav" aria-label={copy.navLabel}>
            <div className="site-footer__nav-heading">
              <span className="site-footer__eyebrow">{copy.keepExploring}</span>
              <span className="site-footer__nav-caption">{copy.caption}</span>
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
            <Link className="site-footer__brand" href={`/${locale}`} prefetch={false} aria-label={copy.brandLabel}>
              <span>JONÁS</span>
              <span className="site-footer__wordmark-orbit"><svg viewBox="0 0 26 28" fill="none" aria-hidden="true"><circle cx="13" cy="14" r="9.5" /><path d="M2.5 26 23.5 2" /></svg>RBIT</span>
            </Link>
            <p>{SITE_PROFILE.jobTitle[locale]}</p>
          </div>
          <span className="site-footer__location">{copy.madeIn}<br /><span>{SITE_PROFILE.locality}, {copy.country}</span></span>
          <div className="site-footer__socials" aria-label={copy.profiles}>
            <a href={SITE_PROFILE.github}>GitHub <span aria-hidden="true">↗</span></a>
            <a href={SITE_PROFILE.linkedin}>LinkedIn <span aria-hidden="true">↗</span></a>
            <a href={`mailto:${SITE_PROFILE.email}`}>Email <span aria-hidden="true">↗</span></a>
          </div>
        </div>

        <div className="site-footer__bottom">
          <small>© {new Date().getFullYear()} Jonás Javier</small>
          <span className="site-footer__position">{label}</span>
          <Link href={privacyPath(locale)} prefetch={false}>{copy.privacy}</Link>
        </div>
      </div>
    </footer>
  );
}
