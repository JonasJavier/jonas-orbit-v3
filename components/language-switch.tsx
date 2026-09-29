"use client";

import { useState } from "react";
import { PUBLISHED_LOCALES, type Locale } from "@/content/site.data";
import { defineCopy } from "@/lib/i18n";
import { LANGUAGE_COOKIE } from "@/lib/language-cookie";
import { useLocale } from "./locale-provider";
import "./language-switch.css";

const COPY = defineCopy({
  es: { label: "Idioma" },
  en: { label: "Language" },
});

/** El nombre de cada idioma dicho en ese mismo idioma: así se reconoce. */
const NATIVE_NAME: Record<Locale, string> = { es: "Español", en: "English" };

/**
 * El selector de idioma: EN | ES, y la píldora encima del idioma de la página.
 *
 * Son enlaces, no un botón: cada opción ES la misma página en el otro idioma
 * (`pageAlternates`), se puede abrir en otra pestaña y funciona sin
 * JavaScript. Enlaces `<a>` y no `<Link>`: cambiar de idioma cambia de layout
 * raíz y Next recargaría el documento igual.
 *
 * Lo único que añade el cliente es el gesto: al pulsar, la píldora viaja al
 * idioma elegido mientras llega la página nueva —si el movimiento está
 * encendido—, y la elección se recuerda para que `/` lleve ahí la próxima vez
 * (`next.config.ts`).
 */
export function LanguageSwitch({
  languages,
  className,
}: {
  /** La página actual en cada idioma publicado. */
  languages: Record<Locale, string>;
  className?: string;
}) {
  const current = useLocale();
  const [chosen, setChosen] = useState<Locale>(current);

  return (
    <nav
      className={className ? `language-switch ${className}` : "language-switch"}
      aria-label={COPY[current].label}
      data-active={chosen}
    >
      <span className="language-switch__thumb" aria-hidden="true" />
      {PUBLISHED_LOCALES.map((locale) => (
        <a
          key={locale}
          href={languages[locale]}
          hrefLang={locale}
          lang={locale}
          aria-current={locale === current ? "true" : undefined}
          title={NATIVE_NAME[locale]}
          onClick={() => {
            document.cookie = `${LANGUAGE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
            setChosen(locale);
          }}
        >
          <span aria-hidden="true">{locale.toUpperCase()}</span>
          <span className="sr-only">{NATIVE_NAME[locale]}</span>
        </a>
      ))}
    </nav>
  );
}
