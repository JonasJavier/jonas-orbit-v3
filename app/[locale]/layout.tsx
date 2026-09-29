import { MotionToggle } from "@/components/motion-toggle";
import { GargantuaSystem } from "@/components/scene/gargantua-system";
import { SiteBackdrop } from "@/components/site-backdrop";
import { SoundtrackControl } from "@/components/soundtrack-control";
import { SystemTray } from "@/components/system-tray";
import { VoyageLayer } from "@/components/voyage-layer";
import { PUBLISHED_LOCALES, type Locale } from "@/content/site.data";
import { worldsData } from "@/content/worlds.data";
import { getWorlds } from "@/lib/worlds";
import type { WorldRoute } from "@/lib/world-route";

export function generateStaticParams() {
  return PUBLISHED_LOCALES.map((locale) => ({ locale }));
}

// Sólo existen los idiomas publicados: `/fr` o `/xx/contacto` son un 404
// directo, sin renderizarse bajo demanda ni escribirse en la caché del disco.
export const dynamicParams = false;

/**
 * Layout de idioma: lo único que NO depende de la ruta concreta.
 *
 * Monta el fondo y la escena UNA vez, y ambos sobreviven a la navegación entre
 * todas las rutas. Es el requisito de §4: si el canvas se montara en las páginas,
 * cada navegación recrearía el contexto WebGL, la transición de viaje sería un
 * parpadeo negro y G3 sería imposible de construir.
 *
 * Los dos conviven a propósito. `SiteBackdrop` es el nivel `flat` y se sirve
 * siempre; `GargantuaSystem` decide tras montar si hay equipo para la escena y,
 * si lo hay, se pone delante. Si falla a mitad, se destruye y el fondo 2D sigue
 * ahí sin que el visitante vea un hueco negro.
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Un idioma no publicado acaba en 404, pero su not-found se renderiza DENTRO
  // de este layout: pedir prosa inexistente aquí rompería la propia página de
  // error.
  const published = PUBLISHED_LOCALES.includes(locale as Locale);
  const worlds = published ? getWorlds(locale as Locale) : [];

  const routes: WorldRoute[] = worlds.map((world) => ({
    href: `/${locale}/${world.prose.slug}`,
    id: world.id,
    accent: world.accent,
  }));

  // Solo lo estructural: la escena no recibe ni una palabra de texto (§4).
  const bodies = worlds.map((world) => ({
    id: world.id,
    visual: world.visual,
    accent: world.accent,
    secondary: world.secondary,
    placement: world.placement,
  }));

  return (
    <>
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      {/* Fuera de un mundo (home y páginas legales) manda el color de Gargantúa:
          la home ES el Sistema Gargantúa. */}
      <SiteBackdrop routes={routes} fallbackAccent={worldsData.gargantua.accent} />
      {published ? <GargantuaSystem bodies={bodies} routes={routes} /> : null}
      {children}
      {/* La luz del cruce de la travesía: persiste como el canvas y avisa de
          la llegada al cambiar el pathname. */}
      {published ? <VoyageLayer /> : null}
      {/* Bandeja fija inferior derecha: el único interruptor de movimiento del
          sitio y la banda sonora, en todas las rutas. */}
      {published ? (
        <SystemTray>
          <MotionToggle />
          <SoundtrackControl />
        </SystemTray>
      ) : null}
    </>
  );
}
