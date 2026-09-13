"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Locale } from "@/content/site.data";
import type { WorldId } from "@/content/worlds.data";
import type { WorldNavItem } from "@/lib/worlds";
import { useLightEffectsMode } from "@/lib/effects-mode";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { DownloadIcon } from "./download-icon";
import { MissionNavigation } from "./mission-navigation";
import "./site-header.css";

type Marker = { x: number; width: number; accent: string };

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
}: {
  locale: Locale;
  worlds: readonly WorldNavItem[];
  activeWorldId?: WorldId;
}) {
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const destinationsRef = useRef<HTMLDivElement>(null);
  const lightEffects = useLightEffectsMode();
  const reducedMotion = usePrefersReducedMotion();
  const [skyPaused, setSkyPaused] = useState(false);
  const [pageVisible, setPageVisible] = useState(false);
  const skyEnabled = !lightEffects && !reducedMotion;
  const skyRunning = skyEnabled && pageVisible && !skyPaused;

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
    if (previous && previous.width > 0 && next.width > 0 && Math.abs(previous.x - next.x) > 1 && !reducedMotion) {
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
  }, [activeWorldId, reducedMotion]);

  return (
    <header
      className="site-header site-header--voyage"
      ref={headerRef}
      data-menu-open={open}
      data-sky-running={skyRunning}
      data-sky-enabled={skyEnabled}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <noscript><style>{`.site-header--voyage + .miller-route { --miller-nav-clearance: 0px; } .site-header--voyage .voyage-menu-toggle, .site-header--voyage .voyage-sky-toggle { display: none; } .site-header--voyage .voyage-navigation { display: flex !important; position: static !important; max-height: none !important; box-shadow: none; } @media (max-width: 1080px) { .site-header.site-header--voyage { position: relative; } }`}</style></noscript>
      <div className="voyage-sky" aria-hidden="true" />
      <div className="site-header__bar">
        <Link
          className="brand-lockup"
          href={`/${locale}`}
          aria-label="Jonás Orbit, inicio"
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

        <button ref={toggleRef} className="voyage-menu-toggle" type="button" aria-expanded={open} aria-controls="voyage-navigation" onClick={() => setOpen(!open)}>
          {open ? "Cerrar" : "Explorar"}<span className="voyage-menu-icon" aria-hidden="true"><i /><i /></span>
        </button>
      </div>

      <div id="voyage-navigation" className="voyage-navigation" onClick={(event) => { if ((event.target as HTMLElement).closest("a")) setOpen(false); }}>
        <div className="voyage-destinations" ref={destinationsRef}>
          <MissionNavigation worlds={worlds} activeWorldId={activeWorldId} />
          <i className="voyage-marker" aria-hidden="true" />
        </div>
        <div className="voyage-return">
          <button className="voyage-sky-toggle" type="button" onClick={() => setSkyPaused(!skyPaused)} aria-label={skyPaused ? "Reanudar estrellas" : "Pausar estrellas"} title={skyPaused ? "Reanudar estrellas" : "Pausar estrellas"} aria-pressed={!skyPaused}><span aria-hidden="true">{skyPaused ? "✧" : "Ⅱ"}</span></button>
          <a className="voyage-cv" download href="/cv/jonas-javier-cv-es.pdf" aria-label="Descargar CV (PDF)" title="Descargar CV (PDF)"><DownloadIcon /><span aria-hidden="true">CV</span></a>
          <Link className="voyage-map-link" href={`/${locale}`} aria-label="Volver al mapa"><span>Mapa estelar</span><span aria-hidden="true">↑</span></Link>
        </div>
      </div>
    </header>
  );
}
