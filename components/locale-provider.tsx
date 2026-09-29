"use client";

import { createContext, useContext } from "react";
import type { Locale } from "@/content/site.data";

/*
  Sin proveedor —sólo pasa en las pruebas de componentes, porque en el sitio
  todo cuelga del layout raíz— se habla el idioma FUENTE del contenido, el
  español, que es en el que están escritas esas pruebas. No es el idioma por
  defecto del sitio (`DEFAULT_LOCALE`), y no tiene por qué serlo.
*/
const LocaleContext = createContext<Locale>("es");

/**
 * El idioma de la ruta, para los componentes de cliente.
 *
 * Lo fija el layout raíz (`app/[locale]/layout.tsx`) desde el segmento de la
 * URL; los componentes de servidor lo reciben por props. Cambiar de idioma es
 * cambiar de layout raíz, así que Next recarga el documento entero y este
 * valor nunca cambia durante la vida de una página.
 */
export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}
