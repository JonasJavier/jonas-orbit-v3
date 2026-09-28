"use client";

import Link from "next/link";

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
  return (
    <main className="not-found">
      <div className="not-found__orbit" aria-hidden="true">
        <span />
      </div>
      <p className="section-kicker">FALLO DE SISTEMA / 500</p>
      <h1>Perdimos la señal por un momento.</h1>
      <p>
        Algo falló al cargar esta coordenada. Puedes reintentarlo o volver al
        mapa principal.
        {error.digest ? ` Referencia: ${error.digest}.` : null}
      </p>
      <div className="not-found__actions">
        <button className="button button--primary" type="button" onClick={() => retry()}>
          Reintentar <span aria-hidden="true">↻</span>
        </button>
        <Link className="button button--secondary" href="/es">
          Volver a Jonás Orbit <span aria-hidden="true">↖</span>
        </Link>
      </div>
    </main>
  );
}
