"use client";

import Link from "next/link";
import { useLocale } from "@/components/locale-provider";
import { defineCopy } from "@/lib/i18n";

const COPY = defineCopy({
  es: {
    kicker: "FALLO DE SISTEMA / 500",
    heading: "Perdimos la señal por un momento.",
    body: "Algo falló al cargar esta coordenada. Puedes reintentarlo o volver al mapa principal.",
    reference: "Referencia",
    retry: "Reintentar",
    back: "Volver a Jonás Orbit",
  },
  en: {
    kicker: "SYSTEM FAILURE / 500",
    heading: "We lost the signal for a moment.",
    body: "Something went wrong while loading this coordinate. Try again, or head back to the main map.",
    reference: "Reference",
    retry: "Try again",
    back: "Back to Jonás Orbit",
  },
});

/**
 * Fallo inesperado dentro de una ruta. Usa el mismo lenguaje que la 404:
 * el visitante puede reintentar la ruta o volver al mapa sin perder la sesión.
 */
export default function RouteError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const locale = useLocale();
  const copy = COPY[locale];
  return (
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
      <div className="not-found__actions">
        <button className="button button--primary" type="button" onClick={() => retry()}>
          {copy.retry} <span aria-hidden="true">↻</span>
        </button>
        <Link className="button button--secondary" href={`/${locale}`}>
          {copy.back} <span aria-hidden="true">↖</span>
        </Link>
      </div>
    </main>
  );
}
