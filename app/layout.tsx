import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";
import "./globals.css";

const SITE_TITLE =
  "Jonás Javier Encarnación — Desarrollador full-stack y creador visual";
const SITE_DESCRIPTION =
  "Portafolio de Jonás Javier Encarnación: desarrollo full-stack, diseño UX/UI y fotografía en una experiencia espacial.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s · Jonás Orbit",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Jonás Orbit",
  authors: [{ name: "Jonás Javier Encarnación" }],
  creator: "Jonás Javier Encarnación",
  // Defaults heredados por todas las rutas; cada página los afina y la de
  // gracias los sobrescribe con noindex (conversión fuera del índice).
  openGraph: {
    type: "website",
    siteName: "Jonás Orbit",
    locale: "es_DO",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

// F1A publica solo español; el lang por locale se revisa en F2A cuando /en exista.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // `data-scroll-behavior` no es decoración: Next 16 dejó de neutralizar por
    // su cuenta el `scroll-behavior: smooth` que globals.css pone en <html>, y
    // sin este atributo avisa en cada navegación. Con él vuelve el
    // comportamiento anterior —desplazamiento instantáneo al cambiar de ruta,
    // suave para los saltos dentro de la página— que es justo el que queremos:
    // viajar a un mundo no es hacer scroll.
    <html lang="es" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
