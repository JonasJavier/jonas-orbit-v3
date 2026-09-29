"use client";

import { defineCopy } from "@/lib/i18n";
import "./globals.css";

const COPY = defineCopy({
  es: {
    title: "Fallo de sistema · Jonás Orbit",
    kicker: "FALLO DE SISTEMA / 500",
    heading: "Perdimos la señal por un momento.",
    body: "Jonás Orbit no pudo arrancar esta vez. Reintenta en unos segundos.",
    reference: "Referencia",
    retry: "Reintentar",
  },
  en: {
    title: "System failure · Jonás Orbit",
    kicker: "SYSTEM FAILURE / 500",
    heading: "We lost the signal for a moment.",
    body: "Jonás Orbit couldn’t start this time. Try again in a few seconds.",
    reference: "Reference",
    retry: "Try again",
  },
});

/**
 * Fallo del layout raíz: sustituye al documento entero, así que declara su
 * propio `<html>`/`<body>` y carga los estilos globales por su cuenta.
 *
 * Aquí ya no hay layout que diga el idioma: se lee del primer segmento de la
 * URL, que es lo único que sigue en pie. Sin él, el idioma por defecto.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const locale = typeof window !== "undefined" && window.location.pathname.startsWith("/es") ? "es" : "en";
  const copy = COPY[locale];
  return (
    <html lang={locale} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <title>{copy.title}</title>
        <main className="not-found">
          <div className="not-found__orbit" aria-hidden="true">
            <span />
          </div>
          <p className="section-kicker">{copy.kicker}</p>
          <h1>{copy.heading}</h1>
          <p>
            {copy.body}
            {error.digest ? ` ${copy.reference}: ${error.digest}.` : null}
          </p>
          <button className="button button--primary" type="button" onClick={() => retry()}>
            {copy.retry} <span aria-hidden="true">↻</span>
          </button>
        </main>
      </body>
    </html>
  );
}
