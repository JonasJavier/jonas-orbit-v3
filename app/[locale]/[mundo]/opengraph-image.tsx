import { PUBLISHED_LOCALES, type Locale } from "@/content/site.data";
import {
  WORLD_OG_CONTENT_TYPE,
  WORLD_OG_SIZE,
  renderWorldOgImage,
} from "@/lib/world-og";
import { BESPOKE_WORLD_IDS, getWorldBySlug, getWorlds } from "@/lib/worlds";

export const size = WORLD_OG_SIZE;
export const contentType = WORLD_OG_CONTENT_TYPE;
export const alt = "Destino del Sistema Gargantúa";

export function generateStaticParams() {
  return PUBLISHED_LOCALES.flatMap((locale) =>
    getWorlds(locale)
      .filter((world) => !BESPOKE_WORLD_IDS.includes(world.id))
      .map((world) => ({ locale, mundo: world.prose.slug })),
  );
}

export default async function WorldOgImage({
  params,
}: {
  params: Promise<{ locale: string; mundo: string }>;
}) {
  const { locale, mundo } = await params;
  const world = getWorldBySlug(mundo, locale as Locale);
  if (!world) return new Response(null, { status: 404 });
  return renderWorldOgImage(world);
}
