import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RangerContact } from "@/components/ranger-contact";
import { SiteShell } from "@/components/site-shell";
import { WorldPage } from "@/components/world-page";
import { PUBLISHED_LOCALES, type Locale } from "@/content/site.data";
import { buildWorldMetadata } from "@/lib/world-metadata";
import { getWorld } from "@/lib/worlds";

/**
 * Ranger — contacto, oferta freelance y canales directos.
 *
 * Padre natural de `contacto/gracias`, que ya existía. Es el final del embudo:
 * A21 exige llegar aquí desde el hero en 3 interacciones como máximo, y con
 * rutas reales son dos — el CTA y el envío.
 */
export function generateStaticParams() {
  return PUBLISHED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!PUBLISHED_LOCALES.includes(locale as Locale)) return {};
  return buildWorldMetadata(getWorld("ranger", locale as Locale), locale as Locale);
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!PUBLISHED_LOCALES.includes(locale as Locale)) {
    notFound();
  }

  const typedLocale = locale as Locale;
  const world = getWorld("ranger", typedLocale);

  return (
    <SiteShell
      locale={typedLocale}
      activeWorldId={world.id}
      mainClassName="world-route"
      footerLabel={`JONÁS ORBIT · DESTINO ${String(world.order).padStart(2, "0")} / ${world.cosmicName.toUpperCase()}`}
    >
      <WorldPage world={world} locale={typedLocale} showPanels={false}>
        <RangerContact />
      </WorldPage>
    </SiteShell>
  );
}
