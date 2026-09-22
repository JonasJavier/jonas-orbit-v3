import type { Locale } from "@/content/site.data";
import type { WorldId } from "@/content/worlds.data";
import { getWorldNavItems } from "@/lib/worlds";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

/**
 * Envoltorio común de todas las páginas: cabecera, `<main>` y pie.
 *
 * Está aquí y no en `app/[locale]/layout.tsx` por una razón concreta: el layout
 * no conoce los params de su hijo, y el mundo activo es dato de la RUTA. Con el
 * shell como componente de servidor cada página declara a qué mundo pertenece y
 * la cabecera se marca en el HTML, sin `usePathname`. El menú móvil añade
 * únicamente el estado de apertura; no decide la ruta activa.
 *
 * Lo que SÍ vive en el layout es lo que no depende de la ruta: el fondo (y en
 * G2, el canvas persistente de la escena, §4).
 */
export function SiteShell({
  locale,
  activeWorldId,
  mainClassName,
  footerLabel,
  children,
}: {
  locale: Locale;
  activeWorldId?: WorldId;
  mainClassName?: string;
  /** Línea del pie. Cada ruta dice dónde está el visitante. */
  footerLabel: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader
        locale={locale}
        worlds={getWorldNavItems(locale)}
        activeWorldId={activeWorldId}
      />

      <main id="main-content" className={mainClassName}>
        {children}
      </main>

      <SiteFooter locale={locale} activeWorldId={activeWorldId} label={footerLabel} />
    </>
  );
}
