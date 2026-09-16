import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ObservatoryViewer } from "@/components/observatory-viewer";
import { PUBLISHED_LOCALES, type Locale } from "@/content/site.data";
import { worldsData, type WorldId } from "@/content/worlds.data";
import { getWorld } from "@/lib/worlds";

/**
 * El Observatorio: un espécimen, pantalla completa.
 *
 * Ruta anidada bajo `/es/experimentos` SIN carpeta `page.tsx` propia en el
 * segmento padre, así que `/es/experimentos` sigue resolviéndose por el
 * `[mundo]` dinámico y la recepción queda intacta — está fuera del alcance de
 * esta entrega.
 *
 * `findWorldRoute` casa por prefijo, de modo que esta ruta ya se resuelve al
 * mundo `tesseract`: con él en `COVERED_WORLDS`, la escena persistente deja de
 * dibujar mientras el visitante está aquí.
 *
 * ── Rule 7 ──────────────────────────────────────────────────────────────────
 *
 * El canvas es la representación visual principal, nunca la única
 * representación semántica. El HTML servido trae nombre, resumen y vuelta al
 * índice sin una línea de JavaScript; el visor se monta encima.
 */

/** V1: sólo el Tesseracto. Los otros cinco entran después del pase visual. */
const OBSERVABLE: Record<string, WorldId> = {
  tesseracto: "tesseract",
};

export const dynamicParams = false;

export function generateStaticParams() {
  return PUBLISHED_LOCALES.flatMap((locale) =>
    Object.keys(OBSERVABLE).map((objeto) => ({ locale, objeto })),
  );
}

type Props = { params: Promise<{ locale: string; objeto: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, objeto } = await params;
  if (!PUBLISHED_LOCALES.includes(locale as Locale)) return {};
  const id = OBSERVABLE[objeto];
  if (!id) return { title: "Espécimen no encontrado" };
  const world = getWorld(id, locale as Locale);
  return {
    title: `${world.cosmicName} · Observatorio`,
    description: `Observación de cerca de ${world.cosmicName}: geometría, material e iluminación.`,
  };
}

export default async function ObservatoryRoute({ params }: Props) {
  const { locale, objeto } = await params;
  if (!PUBLISHED_LOCALES.includes(locale as Locale)) notFound();

  const id = OBSERVABLE[objeto];
  if (!id) notFound();

  const typedLocale = locale as Locale;
  const world = getWorld(id, typedLocale);
  const structure = worldsData[id];

  return (
    <main className="observatory-route" id="main-content">
      <h1 className="observatory-route__title">{world.cosmicName}</h1>
      <p className="observatory-route__summary">{world.prose.summary}</p>
      <p>
        <Link href={`/${typedLocale}/experimentos`}>Volver a Experimentos</Link>
      </p>

      <ObservatoryViewer
        name={world.cosmicName}
        world={{
          id,
          visual: structure.visual,
          accent: structure.accent,
          secondary: structure.secondary,
          placement: structure.placement,
        }}
      />
    </main>
  );
}
