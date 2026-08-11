import { PUBLISHED_LOCALES, type Locale } from "@/content/site.data";
import {
  WORLD_OG_CONTENT_TYPE,
  WORLD_OG_SIZE,
  renderWorldOgImage,
} from "@/lib/world-og";
import { getWorld } from "@/lib/worlds";

export const size = WORLD_OG_SIZE;
export const contentType = WORLD_OG_CONTENT_TYPE;
export const alt = "Ranger — abrir un canal de contacto";

export function generateStaticParams() {
  return PUBLISHED_LOCALES.map((locale) => ({ locale }));
}

export default async function ContactOgImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return renderWorldOgImage(getWorld("ranger", locale as Locale));
}
