import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { PUBLISHED_LOCALES, type Locale } from "@/content/site.data";
import { getWorlds } from "@/lib/worlds";

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
  const worlds = getWorlds(locale as Locale);

  return (
    <>
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <div className="space-backdrop" aria-hidden="true">
        <span className="space-backdrop__stars" />
        <span className="space-backdrop__haze" />
        <span className="space-backdrop__grid" />
      </div>
      <SiteHeader locale={locale as Locale} worlds={worlds} />
      <main className="transmission-page" id="main-content">
        <div className="transmission-page__signal" aria-hidden="true">
          <span /><span /><span />
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
          <Link className="button button--primary" href={`/${locale}#proyectos`}>
            Explorar proyectos <span aria-hidden="true">→</span>
          </Link>
          <Link className="button button--ghost" href={`/${locale}`}>
            Volver al inicio
          </Link>
        </div>
        <p className="transmission-page__fallback">
          ¿Necesitas añadir algo? Escribe a{" "}
          <a href="mailto:jonasjavier.dev@gmail.com">jonasjavier.dev@gmail.com</a>.
        </p>
      </main>
    </>
  );
}
