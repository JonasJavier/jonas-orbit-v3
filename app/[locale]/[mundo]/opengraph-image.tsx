import { PUBLISHED_LOCALES, isPublishedLocale } from "@/content/site.data";
import {
  WORLD_OG_CONTENT_TYPE,
  WORLD_OG_SIZE,
  renderWorldOgImage,
} from "@/lib/world-og";
import { getWorldBySlug, getWorlds } from "@/lib/worlds";

export const size = WORLD_OG_SIZE;
export const contentType = WORLD_OG_CONTENT_TYPE;
// Un solo texto para las doce tarjetas: el archivo no conoce su ruta. El
// nombre va primero porque es lo que se busca.
export const alt = "Jonás Javier Encarnación · Jonás Orbit";

export function generateStaticParams() {
  return PUBLISHED_LOCALES.flatMap((locale) =>
    getWorlds(locale).map((world) => ({ locale, mundo: world.prose.slug })),
  );
}

export default async function WorldOgImage({
  params,
}: {
  params: Promise<{ locale: string; mundo: string }>;
}) {
  const { locale, mundo } = await params;
  const world = isPublishedLocale(locale) ? getWorldBySlug(mundo, locale) : undefined;
  // Cuerpo no vacío a propósito: una respuesta de 404 con `null` hace que el
  // caché de prerender de Next calcule tamaño 0 y registre un error por cada
  // petición a un destino retirado. El texto no lo lee nadie; evita el ruido.
  if (!world || !isPublishedLocale(locale)) return new Response("Not found", { status: 404 });
  return renderWorldOgImage(world, locale);
}
