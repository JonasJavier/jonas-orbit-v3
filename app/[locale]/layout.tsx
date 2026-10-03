import type { Metadata, Viewport } from "next";
import { DestinationsPrefetch } from "@/components/destinations-prefetch";
import { LocaleProvider } from "@/components/locale-provider";
import { MotionToggle } from "@/components/motion-toggle";
import { GargantuaSystem } from "@/components/scene/gargantua-system";
import { SiteBackdrop } from "@/components/site-backdrop";
import { SoundtrackControl } from "@/components/soundtrack-control";
import { SystemTray } from "@/components/system-tray";
import { VoyageLayer } from "@/components/voyage-layer";
import { DEFAULT_LOCALE, PUBLISHED_LOCALES, isPublishedLocale, type Locale } from "@/content/site.data";
import { worldsData } from "@/content/worlds.data";
import { defineCopy } from "@/lib/i18n";
import { siteOpenGraph } from "@/lib/site-metadata";
import { SITE_URL } from "@/lib/site-url";
import { getWorldPath, getWorlds } from "@/lib/worlds";
import type { WorldRoute } from "@/lib/world-route";
import "../globals.css";

const COPY = defineCopy({
  es: {
    title: "Jonás Javier Encarnación — Desarrollador full-stack · Portafolio 3D",
    description:
      "Jonás Javier Encarnación, desarrollador full-stack y diseñador UX/UI en República Dominicana. Un portafolio 3D interactivo inspirado en Interstellar.",
    skip: "Saltar al contenido",
  },
  en: {
    title: "Jonás Javier Encarnación — Full-Stack Developer · 3D Portfolio",
    description:
      "Jonás Javier Encarnación, a full-stack developer and UX/UI designer in the Dominican Republic. An interactive 3D portfolio inspired by Interstellar.",
    skip: "Skip to content",
  },
});

/**
 * El color de la interfaz del navegador (barra de Android, pestañas de Safari)
 * y el esquema oscuro: sin esto, el marco del móvil quedaba blanco alrededor
 * de un sitio que es todo espacio.
 */
export const viewport: Viewport = {
  themeColor: "#03050a",
  colorScheme: "dark",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isPublishedLocale(raw) ? raw : DEFAULT_LOCALE;
  const copy = COPY[locale];
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: copy.title,
      // El nombre, no la marca: a Jonás se le busca por «Jonás Javier», y
      // «Jonás Orbit» ya va en `applicationName` y en el WebSite de JSON-LD.
      template: "%s · Jonás Javier",
    },
    description: copy.description,
    applicationName: "Jonás Orbit",
    authors: [{ name: "Jonás Javier Encarnación" }],
    creator: "Jonás Javier Encarnación",
    // Defaults heredados por todas las rutas; cada página los afina y la de
    // gracias los sobrescribe con noindex (conversión fuera del índice).
    openGraph: {
      ...siteOpenGraph(locale),
      title: copy.title,
      description: copy.description,
    },
    // Sólo la tarjeta. Next fusiona `twitter` de forma superficial y ninguna
    // página declara el suyo: un título aquí viajaba a TODAS las rutas y cada
    // caso se compartía en X con el de la portada. Sin él, Next copia a
    // twitter:* el og:title, og:description y og:image que cada página afina.
    twitter: { card: "summary_large_image" },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
  };
}

export function generateStaticParams() {
  return PUBLISHED_LOCALES.map((locale) => ({ locale }));
}

// Sólo existen los idiomas publicados: `/fr` o `/xx/contacto` son un 404
// directo, sin renderizarse bajo demanda ni escribirse en la caché del disco.
export const dynamicParams = false;

/**
 * Layout RAÍZ, uno por idioma: lo único que NO depende de la ruta concreta.
 *
 * Es raíz —declara `<html>`— para que `lang` sea el del idioma de la página en
 * el HTML servido: un lector de pantalla que lee inglés con voz española es un
 * sitio roto aunque el texto esté bien traducido. El precio es que cambiar de
 * idioma recarga el documento (Next no navega en cliente entre dos layouts
 * raíz), y es un precio correcto: el selector de idioma se pulsa una vez.
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
  const published = isPublishedLocale(locale);
  const lang: Locale = published ? locale : DEFAULT_LOCALE;
  const worlds = published ? getWorlds(locale) : [];

  const routes: WorldRoute[] = worlds.map((world) => ({
    href: getWorldPath(world, lang),
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
    // `data-scroll-behavior` no es decoración: Next 16 dejó de neutralizar por
    // su cuenta el `scroll-behavior: smooth` que globals.css pone en <html>, y
    // sin este atributo avisa en cada navegación. Con él vuelve el
    // comportamiento anterior —desplazamiento instantáneo al cambiar de ruta,
    // suave para los saltos dentro de la página— que es justo el que queremos:
    // viajar a un mundo no es hacer scroll.
    <html lang={lang} className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col">
        <LocaleProvider locale={lang}>
          <a className="skip-link" href="#main-content">
            {COPY[lang].skip}
          </a>
          {/* Fuera de un mundo (home y páginas legales) manda el color de Gargantúa:
              la home ES el Sistema Gargantúa. */}
          <SiteBackdrop routes={routes} fallbackAccent={worldsData.gargantua.accent} />
          {published ? <GargantuaSystem bodies={bodies} routes={routes} /> : null}
          {/* Los seis destinos se precargan cuando el cable queda libre, no al
              abrir la página (`lib/world-prefetch.ts`). */}
          {published ? <DestinationsPrefetch routes={routes} /> : null}
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
        </LocaleProvider>
      </body>
    </html>
  );
}
