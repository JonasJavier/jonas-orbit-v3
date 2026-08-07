import type { Metadata } from "next";
import { GargantuaSpike } from "./gargantua-spike";

/**
 * G0 · Spike de dirección visual — CÓDIGO DESECHABLE (plan §9).
 *
 * Vive dentro de la app solo para tener servidor de desarrollo, TypeScript y una
 * URL abrible desde el móvil sin montar un segundo build. NO forma parte del
 * producto: fuera del sitemap, `noindex`, y bloqueado en robots.txt.
 *
 * Al cerrar G0 se borra `app/spike/` entera. Lo que sobreviva se reescribe
 * dentro de la escena de G2; nada de aquí se importa desde el sitio.
 */
export const metadata: Metadata = {
  title: "G0 · Spike de Gargantúa",
  robots: { index: false, follow: false },
};

export default function GargantuaSpikePage() {
  return <GargantuaSpike />;
}
