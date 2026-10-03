"use client";

import { IntentLink as Link } from "@/components/intent-link";
import { useEffect, useSyncExternalStore } from "react";
import { defineCopy } from "@/lib/i18n";
import { BlogSky } from "./blog-sky";

const COPY = defineCopy({
  es: {
    kicker: "ERROR DE NAVEGACIÓN / 404",
    heading: "Esta misión salió de la órbita.",
    body: "La coordenada solicitada no existe o todavía no forma parte del mapa público.",
    back: "Volver a Jonás Orbit",
    other: "Go to the English version",
  },
  en: {
    kicker: "NAVIGATION ERROR / 404",
    heading: "This mission drifted out of orbit.",
    body: "The coordinate you asked for doesn’t exist, or it isn’t on the public map yet.",
    back: "Back to Jonás Orbit",
    other: "Ir a la versión en español",
  },
});

const subscribe = () => () => {};

/**
 * El cuerpo de la 404 global, en el idioma de la URL.
 *
 * `global-not-found.tsx` se sirve sin layout y sin params: no sabe si la URL
 * rota empezaba por `/es` o por `/en`. El HTML servido habla inglés —el idioma
 * por defecto, y el que ve quien no ejecuta JavaScript— y al hidratar se lee la
 * URL: una 404 dentro de `/es/…` pasa a español. `useSyncExternalStore` con
 * instantánea de servidor evita el desajuste de hidratación.
 */
export function GlobalNotFoundBody() {
  const locale = useSyncExternalStore(
    subscribe,
    () => (window.location.pathname.startsWith("/es") ? "es" : "en"),
    () => "en" as const,
  );
  const copy = COPY[locale];
  const other = locale === "es" ? "en" : "es";

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <main className="not-found" id="main-content">
      {/* El mismo cielo del blog: la 404 se sirve sin layout y sin escena, y
          sin él era la única página del sitio sobre un fondo liso. */}
      <BlogSky />
      <div className="not-found__orbit" aria-hidden="true">
        <span />
      </div>
      <p className="section-kicker">{copy.kicker}</p>
      <h1>{copy.heading}</h1>
      <p>{copy.body}</p>
      <div className="not-found__actions">
        <Link className="button button--primary" href={`/${locale}`}>
          {copy.back} <span aria-hidden="true">↖</span>
        </Link>
        <Link className="button button--secondary" href={`/${other}`} hrefLang={other} lang={other}>
          {copy.other}
        </Link>
      </div>
    </main>
  );
}
