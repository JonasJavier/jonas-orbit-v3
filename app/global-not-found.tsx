import type { Metadata } from "next";
import { GlobalNotFoundBody } from "@/components/global-not-found-body";
import "./globals.css";

/**
 * 404 de una URL que no casa con ninguna ruta: `/fr`, `/xyz/lo-que-sea`,
 * `/es/proyectos/no-existe`.
 *
 * El layout raíz vive bajo `app/[locale]`, así que aquí no hay layout que la
 * componga (ver `not-found.md` de Next) ni params que digan el idioma. El
 * cuerpo lo decide leyendo la URL (`GlobalNotFoundBody`); el HTML servido y el
 * título hablan inglés, el idioma por defecto.
 */
export const metadata: Metadata = {
  title: "Mission not found · Jonás Orbit",
  description: "The requested coordinate is not part of Jonás Orbit.",
};

export default function GlobalNotFound() {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <GlobalNotFoundBody />
      </body>
    </html>
  );
}
