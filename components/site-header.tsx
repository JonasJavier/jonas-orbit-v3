"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/content/site.data";
import type { WorldId } from "@/content/worlds.data";
import type { WorldNavItem } from "@/lib/worlds";
import { MissionNavigation } from "./mission-navigation";
import "./site-header.css";

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

  return (
    <header className="site-header site-header--voyage" ref={headerRef} data-menu-open={open}>
      <noscript><style>{`.site-header--voyage .voyage-menu-toggle { display: none; } .site-header--voyage .voyage-navigation { display: block !important; }`}</style></noscript>
      <div className="site-header__bar">
        <Link
          className="brand-lockup"
          href={`/${locale}`}
          aria-label="Jonás Orbit, inicio"
        >
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span>
            <strong>JONÁS ORBIT</strong>
            <small>PORTAFOLIO INTERESTELAR</small>
          </span>
        </Link>

        <button ref={toggleRef} className="voyage-menu-toggle" type="button" aria-expanded={open} aria-controls="voyage-navigation" onClick={() => setOpen(!open)}>
          {open ? "Cerrar" : "Explorar"}<span className="voyage-menu-icon" aria-hidden="true"><i /><i /></span>
        </button>
      </div>

      <div id="voyage-navigation" className="voyage-navigation" onClick={(event) => { if ((event.target as HTMLElement).closest("a")) setOpen(false); }}>
        <MissionNavigation worlds={worlds} activeWorldId={activeWorldId} />
        <Link className="voyage-map-link" href={`/${locale}`}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-35 12 12)" /><circle cx="12" cy="12" r="3" /><circle cx="19" cy="6" r="1.5" /></svg><span>Volver al mapa</span><span aria-hidden="true">↗</span></Link>
      </div>
      {activeWorldId === "miller" ? <nav className="voyage-page-nav" aria-label="En esta página"><span>MILLER <i>/</i> FORMACIÓN</span><div><a href="#panorama">Panorama</a><a href="#trayectoria">Trayectoria</a><a href="#certificados">Certificados <span aria-hidden="true">↓</span></a></div></nav> : null}
    </header>
  );
}
