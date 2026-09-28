import type { Metadata } from "next";
import { SITE_OPEN_GRAPH } from "@/lib/site-metadata";
import { SITE_URL } from "@/lib/site-url";
import "./globals.css";

const SITE_TITLE =
  "Jonás Javier Encarnación — Desarrollador full-stack y diseñador UX/UI";
const SITE_DESCRIPTION =
  "Portafolio de Jonás Javier Encarnación, desarrollador full-stack y diseñador UX/UI en República Dominicana: proyectos con Django y React, fotografía y experimentos 3D.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    // El nombre, no la marca: a Jonás se le busca por «Jonás Javier», y
    // «Jonás Orbit» ya va en og:site_name y en el WebSite de JSON-LD.
    template: "%s · Jonás Javier",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Jonás Orbit",
  authors: [{ name: "Jonás Javier Encarnación" }],
  creator: "Jonás Javier Encarnación",
  // Defaults heredados por todas las rutas; cada página los afina y la de
  // gracias los sobrescribe con noindex (conversión fuera del índice).
  openGraph: {
    ...SITE_OPEN_GRAPH,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  // Sólo la tarjeta. Next fusiona `twitter` de forma superficial y ninguna
  // página declara el suyo: un título aquí viajaba a TODAS las rutas y cada
  // caso se compartía en X con el de la portada. Sin él, Next copia a
  // twitter:* el og:title, og:description y og:image que cada página afina.
  twitter: { card: "summary_large_image" },
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
