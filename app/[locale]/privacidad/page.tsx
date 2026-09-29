import type { Metadata } from "next";
import { PrivacyPage, privacyMetadata } from "@/components/privacy-page";

/**
 * `/es/privacidad`. La misma página vive en `/en/privacy`: una carpeta por
 * idioma porque el segmento es estático y cada una responde sólo en el suyo
 * (`/en/privacidad` y `/es/privacy` son 404).
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ locale: "es" }];
}

export const metadata: Metadata = privacyMetadata("es");

export default function PrivacidadRoute() {
  return <PrivacyPage locale="es" />;
}
