"use client";

import "./globals.css";

/**
 * Fallo del layout raíz: sustituye al documento entero, así que declara su
 * propio `<html>`/`<body>` y carga los estilos globales por su cuenta.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <title>Fallo de sistema · Jonás Orbit</title>
        <main className="not-found">
          <div className="not-found__orbit" aria-hidden="true">
            <span />
          </div>
          <p className="section-kicker">FALLO DE SISTEMA / 500</p>
          <h1>Perdimos la señal por un momento.</h1>
          <p>
            Jonás Orbit no pudo arrancar esta vez. Reintenta en unos segundos.
            {error.digest ? ` Referencia: ${error.digest}.` : null}
          </p>
          <button className="button button--primary" type="button" onClick={() => retry()}>
            Reintentar <span aria-hidden="true">↻</span>
          </button>
        </main>
      </body>
    </html>
  );
}
