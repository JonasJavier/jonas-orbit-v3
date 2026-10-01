"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Locale } from "@/content/site.data";
import type { WorldId } from "@/content/worlds.data";
import type { WorldNavItem } from "@/lib/worlds";
import { useMotionEnabled } from "@/lib/effects-mode";
import { defineCopy } from "@/lib/i18n";
import { DownloadIcon } from "./download-icon";
import { LanguageSwitch } from "./language-switch";
import { MissionNavigation } from "./mission-navigation";
import { VoyageSky } from "./voyage-sky";
import "./site-header.css";

type Marker = { x: number; width: number; accent: string };

const COPY = defineCopy({
  es: {
    home: "Jonás Orbit, inicio",
    worldsNav: "Navegación de mundos",
    close: "Cerrar",
    explore: "Explorar",
    cv: "Descargar CV",
    map: "Mapa estelar",
    mapLabel: "Volver al mapa",
  },
  en: {
    home: "Jonás Orbit, home",
    worldsNav: "Destinations",
    close: "Close",
    explore: "Explore",
    cv: "Download CV",
    map: "Star map",
    mapLabel: "Back to the star map",
  },
});

/** Los dos CV, con el del idioma de la página primero. */
const CV = [
  { locale: "es", name: "Español", href: "/cv/jonas-javier-cv-es.pdf" },
  { locale: "en", name: "English", href: "/cv/jonas-javier-cv-en-ats.pdf" },
] as const;

/**
 * Dónde quedó la línea del destino activo en la última cabecera montada.
 *
 * Cada ruta monta su propia cabecera —el shell vive dentro de la página— así
 * que una transición CSS no puede unir dos montajes. Este recuerdo de módulo
 * sí sobrevive a la navegación: la cabecera nueva arranca la línea donde la
 * dejó la anterior y la lleva hasta su destino. Es el único sitio donde el
 * viaje entre mundos se ve en todas las páginas, y no toca al router.
 */
let lastMarker: Marker | null = null;

export function SiteHeader({
  locale,
  worlds,
  activeWorldId,
  languages,
  blog,
}: {
  locale: Locale;
  worlds: readonly WorldNavItem[];
  activeWorldId?: WorldId;
  /** La página actual en cada idioma, para el selector. */
  languages: Record<Locale, string>;
  /** El blog no es un mundo: va con las herramientas, junto al CV. */
  blog: { href: string; active: boolean };
}) {
  const copy = COPY[locale];
  const cvs = [...CV].sort((a, b) => Number(b.locale === locale) - Number(a.locale === locale));
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const destinationsRef = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLDetailsElement>(null);
  const motion = useMotionEnabled();
  const [pageVisible, setPageVisible] = useState(false);
  // El cielo obedece al interruptor único de movimiento del sitio y duerme en
  // segundo plano; no tiene control propio.
  const skyRunning = motion && pageVisible;

  useEffect(() => {
    const syncVisibility = () => setPageVisible(!document.hidden);
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => document.removeEventListener("visibilitychange", syncVisibility);
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  // El desplegable del CV es un <details>: abre y cierra sin JavaScript. Lo
  // único que añade el cliente es cerrarlo al pulsar fuera o con Escape, que
  // se queda aquí (stopImmediatePropagation) para no cerrar también el menú.
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      const details = cvRef.current;
      if (details?.open && event.target instanceof Node && !details.contains(event.target)) details.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      const details = cvRef.current;
      if (event.key !== "Escape" || !details?.open) return;
      event.stopImmediatePropagation();
      details.open = false;
      details.querySelector("summary")?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  // La línea del destino activo: medida, no dibujada por enlace. Antes de
  // pintar ya está en su sitio (layout effect), y si la cabecera anterior la
  // dejó en otro destino, viaja hasta el nuevo. En el menú móvil el nav está
  // oculto y mide cero: ahí manda la línea por enlace del CSS.
  useLayoutEffect(() => {
    const root = destinationsRef.current;
    if (!root) return;
    const measure = (): Marker => {
      const active = root.querySelector<HTMLElement>('a[aria-current="page"]');
      if (!active) return { x: 0, width: 0, accent: "" };
      const rect = active.getBoundingClientRect();
      const base = root.getBoundingClientRect();
      return { x: rect.left - base.left + rect.width * 0.12, width: rect.width * 0.76, accent: active.style.getPropertyValue("--nav-accent") };
    };
    const apply = (marker: Marker, travel: boolean) => {
      root.style.setProperty("--marker-x", `${marker.x}px`);
      root.style.setProperty("--marker-w", `${marker.width}px`);
      root.style.setProperty("--marker-accent", marker.accent || "var(--voyage-signal)");
      root.dataset.marker = travel ? "travel" : "ready";
    };
    let frame = 0;
    const next = measure();
    const previous = lastMarker;
    if (previous && previous.width > 0 && next.width > 0 && Math.abs(previous.x - next.x) > 1 && motion) {
      apply(previous, false);
      // Un cuadro con la línea en el destino anterior, y al siguiente viaja.
      frame = requestAnimationFrame(() => apply(next, true));
    } else {
      apply(next, false);
    }
    if (next.width > 0) lastMarker = next;
    const settle = () => {
      const marker = measure();
      apply(marker, false);
      if (marker.width > 0) lastMarker = marker;
    };
    // Sólo el redimensionado vuelve a medir: el sitio usa fuentes del sistema,
    // así que no hay una carga tardía que pueda mover los enlaces.
    window.addEventListener("resize", settle);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", settle);
    };
  }, [activeWorldId, motion]);

  return (
    <header
      className="site-header site-header--voyage"
      ref={headerRef}
      data-menu-open={open}
      data-sky-running={skyRunning}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <noscript><style>{`.site-header--voyage + .miller-route { --miller-nav-clearance: 0px; } .site-header--voyage .voyage-menu-toggle { display: none; } .site-header--voyage .voyage-navigation { display: flex !important; position: static !important; max-height: none !important; box-shadow: none; } @media (max-width: 1080px) { .site-header.site-header--voyage { position: relative; } }`}</style></noscript>
      <div className="voyage-sky" aria-hidden="true"><VoyageSky running={skyRunning} /></div>
      <div className="site-header__bar">
        <Link
          className="brand-lockup"
          href={`/${locale}`}
          aria-label={copy.home}
        >
          <strong className="voyage-wordmark" aria-hidden="true">
            <span>JONÁS</span>
            <span className="voyage-wordmark__orbit">
              <svg className="voyage-wordmark__o" viewBox="0 0 26 28" fill="none" focusable="false">
                <circle cx="13" cy="14" r="9.5" />
                <path d="M2.5 26 23.5 2" />
              </svg>
              <span>RBIT</span>
            </span>
          </strong>
        </Link>

        <div className="site-header__bar-tools">
          {/* En táctil el selector vive en la barra, siempre a la vista; en
              escritorio, junto al CV (el CSS enseña uno de los dos). */}
          <LanguageSwitch className="language-switch--bar" languages={languages} />
          <button ref={toggleRef} className="voyage-menu-toggle" type="button" aria-expanded={open} aria-controls="voyage-navigation" onClick={() => setOpen(!open)}>
            <span className="voyage-menu-label">{open ? copy.close : copy.explore}</span><span className="voyage-menu-icon" aria-hidden="true"><i /><i /></span>
          </button>
        </div>
      </div>

      <div id="voyage-navigation" className="voyage-navigation" onClick={(event) => { if ((event.target as HTMLElement).closest("a")) setOpen(false); }}>
        <div className="voyage-destinations" ref={destinationsRef}>
          <MissionNavigation worlds={worlds} activeWorldId={activeWorldId} label={copy.worldsNav} />
          <i className="voyage-marker" aria-hidden="true" />
        </div>
        <div className="voyage-return">
          <LanguageSwitch className="language-switch--tools" languages={languages} />
          <Link className="voyage-blog-link" href={blog.href} aria-current={blog.active ? "page" : undefined}>Blog</Link>
          <details
            className="voyage-cv"
            ref={cvRef}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
            }}
          >
            <summary className="voyage-cv__summary" aria-label={copy.cv} title={copy.cv}><DownloadIcon /><span aria-hidden="true">CV</span></summary>
            <div className="voyage-cv__menu" onClick={() => { if (cvRef.current) cvRef.current.open = false; }}>
              {cvs.map((cv) => (
                <a key={cv.locale} download href={cv.href} hrefLang={cv.locale}>{cv.name} <span>PDF</span></a>
              ))}
            </div>
          </details>
          <Link className="voyage-map-link" href={`/${locale}`} aria-label={copy.mapLabel}><span>{copy.map}</span><span aria-hidden="true">↑</span></Link>
        </div>
      </div>
    </header>
  );
}
