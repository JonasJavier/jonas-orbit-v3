"use client";

import { useEffect, useRef } from "react";

/** Selector bilingüe del hero. El `<details>` conserva la descarga sin JS. */
export function MillerCvDownload() {
  const details = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (details.current?.open && event.target instanceof Node && !details.current.contains(event.target)) {
        details.current.open = false;
      }
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !details.current?.open) return;
      details.current.open = false;
      details.current.querySelector("summary")?.focus();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, []);

  return (
    <details
      className="miller-cv"
      ref={details}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
      }}
    >
      <summary aria-label="Descargar CV">Descargar CV</summary>
      <div className="miller-cv__menu" onClick={() => { if (details.current) details.current.open = false; }}>
        <a download href="/cv/jonas-javier-cv-es.pdf"><span>Español</span><small>PDF · ES</small></a>
        <a download href="/cv/jonas-javier-cv-en-ats.pdf"><span>English</span><small>PDF · EN</small></a>
      </div>
    </details>
  );
}
