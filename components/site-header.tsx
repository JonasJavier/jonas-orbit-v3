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
    <header
      className="site-header site-header--voyage"
      ref={headerRef}
      data-menu-open={open}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <noscript><style>{`.site-header--voyage + .miller-route { --miller-nav-clearance: 0px; } .site-header--voyage .voyage-menu-toggle { display: none; } .site-header--voyage .voyage-navigation { display: block !important; position: static !important; max-height: none !important; box-shadow: none; } @media (max-width: 1080px) { .site-header.site-header--voyage { position: relative; } }`}</style></noscript>
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
        <MissionNavigation worlds={worlds} activeWorldId={activeWorldId} />
        <Link className="voyage-map-link" href={`/${locale}`} aria-label="Volver al mapa"><span>Mapa estelar</span><span aria-hidden="true">↗</span></Link>
      </div>
    </header>
  );
}
