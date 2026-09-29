"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "./locale-provider";

/** Los dos CV, con el del idioma de la página primero. */
const CV = [
  { locale: "es", name: "Español", href: "/cv/jonas-javier-cv-es.pdf", tag: "PDF · ES" },
  { locale: "en", name: "English", href: "/cv/jonas-javier-cv-en-ats.pdf", tag: "PDF · EN" },
] as const;

/** Selector bilingüe del hero. El `<details>` conserva la descarga sin JS. */
export function MillerCvDownload() {
  const details = useRef<HTMLDetailsElement>(null);
  const locale = useLocale();
  const label = locale === "es" ? "Descargar CV" : "Download CV";
  const cvs = [...CV].sort((a, b) => Number(b.locale === locale) - Number(a.locale === locale));

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
      <summary aria-label={label}>{label}</summary>
      <div className="miller-cv__menu" onClick={() => { if (details.current) details.current.open = false; }}>
        {cvs.map((cv) => (
          <a key={cv.locale} download href={cv.href} hrefLang={cv.locale}><span>{cv.name}</span><small>{cv.tag}</small></a>
        ))}
      </div>
    </details>
  );
}
