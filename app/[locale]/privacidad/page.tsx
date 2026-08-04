import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { PUBLISHED_LOCALES, type Locale } from "@/content/site.data";
import { getWorlds } from "@/lib/worlds";

export const metadata: Metadata = {
  title: "Privacidad del canal de contacto",
  description: "Cómo se procesan los datos enviados a través de Jonás Orbit.",
  // Ruta ES-only en F1A; el canonical evita duplicados si la URL llega con
  // parámetros de campaña desde LinkedIn o el CV.
  alternates: { canonical: "/es/privacidad" },
  openGraph: { url: "/es/privacidad" },
};

export function generateStaticParams() {
  return PUBLISHED_LOCALES.map((locale) => ({ locale }));
}

export default async function PrivacyPage({
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
      <main className="privacy-page" id="main-content">
        <p className="section-kicker">PROTOCOLO RANGER / PRIVACIDAD</p>
        <h1>Una transmisión breve y transparente.</h1>
        <p className="privacy-page__lead">
          El formulario existe para iniciar una conversación profesional. No crea
          una cuenta, no suscribe a publicidad y no guarda tus datos en una base de
          datos del portafolio.
        </p>

        <div className="privacy-page__grid">
          <section>
            <span>01</span>
            <h2>Qué se recibe</h2>
            <p>
              Nombre, correo, tipo de proyecto y mensaje. Solo se utilizan para
              comprender tu solicitud y responderte.
            </p>
          </section>
          <section>
            <span>02</span>
            <h2>Cómo viaja</h2>
            <p>
              Cloudflare Turnstile ayuda a bloquear abuso y Resend entrega el
              mensaje al correo profesional. Ambos procesan los datos técnicos
              necesarios para prestar esos servicios.
            </p>
          </section>
          <section>
            <span>03</span>
            <h2>Dónde permanece</h2>
            <p>
              El mensaje queda en el buzón profesional el tiempo necesario para la
              conversación y el seguimiento legítimo de la solicitud.
            </p>
          </section>
          <section>
            <span>04</span>
            <h2>Tu control</h2>
            <p>
              Puedes pedir acceso, corrección o eliminación escribiendo a{" "}
              <a href="mailto:jonasjavier.dev@gmail.com">jonasjavier.dev@gmail.com</a>.
            </p>
          </section>
        </div>

        <div className="privacy-page__links">
          <a href="https://www.cloudflare.com/privacypolicy/" rel="noreferrer" target="_blank">
            Privacidad de Cloudflare ↗
          </a>
          <a href="https://resend.com/legal/privacy-policy" rel="noreferrer" target="_blank">
            Privacidad de Resend ↗
          </a>
          <Link href={`/${locale}#contacto`}>Volver al contacto ←</Link>
        </div>
      </main>
    </>
  );
}
