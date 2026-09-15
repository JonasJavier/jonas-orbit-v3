import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { WorldPage } from "@/components/world-page";
import { MillerPage } from "@/components/miller-page";
import { EdmundsPage } from "@/components/edmunds-page";
import { AboutPage } from "@/components/about-page";
import { PUBLISHED_LOCALES, type Locale } from "@/content/site.data";
import { buildWorldMetadata } from "@/lib/world-metadata";
import { BESPOKE_WORLD_IDS, getWorldBySlug, getWorlds } from "@/lib/worlds";

/**
 * Los cuatro mundos resueltos desde MDX. Miller y Edmunds tienen presentación
 * propia, igual que Sobre mí; Experimentos usa la página editorial común.
 *
 * Endurance (`/es/proyectos`) y Ranger (`/es/contacto`) tienen carpeta propia
 * porque montan el índice de proyectos y el formulario; sus segmentos estáticos
 * ganan a este dinámico y por eso quedan fuera de `generateStaticParams`.
 *
 * `dynamicParams = false` hace que cualquier otro segmento responda 404 sin
 * escribir una línea: es la mitad de la garantía del test G1.
 */
export const dynamicParams = false;

type WorldRouteProps = {
  params: Promise<{ locale: string; mundo: string }>;
};

export function generateStaticParams() {
  return PUBLISHED_LOCALES.flatMap((locale) =>
    getWorlds(locale)
      .filter((world) => !BESPOKE_WORLD_IDS.includes(world.id))
      .map((world) => ({ locale, mundo: world.prose.slug })),
  );
}

export async function generateMetadata({
  params,
}: WorldRouteProps): Promise<Metadata> {
  const { locale, mundo } = await params;
  if (!PUBLISHED_LOCALES.includes(locale as Locale)) return {};

  const world = getWorldBySlug(mundo, locale as Locale);
  if (!world) return { title: "Destino no encontrado" };

  return buildWorldMetadata(world, locale as Locale);
}

export default async function WorldRoute({ params }: WorldRouteProps) {
  const { locale, mundo } = await params;
  if (!PUBLISHED_LOCALES.includes(locale as Locale)) {
    notFound();
  }

  const typedLocale = locale as Locale;
  const world = getWorldBySlug(mundo, typedLocale);
  if (!world || BESPOKE_WORLD_IDS.includes(world.id)) {
    notFound();
  }

  return (
    <SiteShell
      locale={typedLocale}
      activeWorldId={world.id}
      mainClassName={world.id === "gargantua" ? "about-route" : world.id === "miller" ? "miller-route" : world.id === "edmunds" ? "edmunds-route" : "world-route"}
      footerLabel={`JONÁS ORBIT · DESTINO ${String(world.order).padStart(2, "0")} / ${world.cosmicName.toUpperCase()}`}
    >
      {world.id === "gargantua" ? (
        <AboutPage world={world} locale={typedLocale} />
      ) : world.id === "miller" ? (
        <MillerPage world={world} locale={typedLocale} />
      ) : world.id === "edmunds" ? (
        <EdmundsPage world={world} locale={typedLocale} />
      ) : (
        <WorldPage world={world} locale={typedLocale} />
      )}
    </SiteShell>
  );
}
