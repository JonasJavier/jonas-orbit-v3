import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { PUBLISHED_LOCALES, type Locale } from "@/content/site.data";
import { getWorld, getWorldPath } from "@/lib/worlds";

export const metadata: Metadata = {
  title: "Transmisión recibida",
  description: "Confirmación privada del formulario de contacto de Jonás Orbit.",
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return PUBLISHED_LOCALES.map((locale) => ({ locale }));
}

export default async function ContactThanksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!PUBLISHED_LOCALES.includes(locale as Locale) || locale !== "es") {
    notFound();
  }
  const typedLocale = locale as Locale;
  const ranger = getWorld("ranger", typedLocale);

  return (
    <SiteShell
      locale={typedLocale}
      activeWorldId="ranger"
      mainClassName="transmission-page"
      footerLabel="JONÁS ORBIT · TRANSMISIÓN CONFIRMADA"
    >
      <div className="transmission-page__signal" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="section-kicker">RANGER / TRANSMISIÓN CONFIRMADA</p>
      <h1>Tu señal llegó completa.</h1>
      <p className="transmission-page__lead">
        Gracias por compartir el contexto. Leeré el mensaje personalmente y
        responderé por el correo que indicaste tan pronto como pueda.
      </p>
      <div className="transmission-page__status">
        <span>ESTADO</span>
        <strong>RECIBIDO</strong>
        <span>PRÓXIMO PASO</span>
        <strong>REVISIÓN HUMANA</strong>
      </div>
      <div className="transmission-page__actions">
        <Link
          className="button button--primary"
          href={getWorldPath(getWorld("endurance", typedLocale), typedLocale)}
        >
          Explorar proyectos <span aria-hidden="true">→</span>
        </Link>
        <Link className="button button--ghost" href={`/${locale}`}>
          Volver al inicio
        </Link>
      </div>
      <p className="transmission-page__fallback">
        ¿Necesitas añadir algo? Escribe a{" "}
        <a href="mailto:jonasjavier.dev@gmail.com">jonasjavier.dev@gmail.com</a>{" "}
        o vuelve a{" "}
        <Link href={getWorldPath(ranger, typedLocale)}>{ranger.prose.title}</Link>.
      </p>
    </SiteShell>
  );
}
