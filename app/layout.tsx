import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default:
      "Jonás Javier Encarnación — Desarrollador full-stack y creador visual",
    template: "%s · Jonás Orbit",
  },
  description:
    "Portafolio de Jonás Javier Encarnación: desarrollo full-stack, diseño UX/UI y fotografía en una experiencia espacial.",
};

// F1A publica solo español; el lang por locale se revisa en F2A cuando /en exista.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
