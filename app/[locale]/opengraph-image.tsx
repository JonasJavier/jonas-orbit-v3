import { readFile } from "node:fs/promises";
import path from "node:path";
import { PUBLISHED_LOCALES, isPublishedLocale } from "@/content/site.data";

/**
 * Imagen Open Graph por defecto del sitio (la tarjeta de la portada).
 *
 * Es el render real de Gargantúa con el nombre abajo, horneado a JPG por
 * `tools/prepare-share-card.mjs` en `public/brand/tarjeta-compartir-<idioma>.jpg`
 * (~65 kB; la misma tarjeta en el PNG de `ImageResponse` pesaba ~700 kB).
 * La ruta sólo sirve el archivo del idioma: se resuelve en BUILD, así que en
 * Railway sale del prerender y en el preview de Cloudflare de la caché de
 * assets. Los casos de estudio y los mundos la sobrescriben con la suya.
 */

// El archivo no conoce su ruta: un solo texto. Las páginas que declaran su
// `openGraph` llevan el alt de su idioma (`defaultOgImage` en
// `lib/site-metadata.ts`).
export const alt =
  "Jonás Javier, Full-Stack Developer — Gargantúa renderizado en 3D en tiempo real · Jonás Orbit";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

export function generateStaticParams() {
  return PUBLISHED_LOCALES.map((locale) => ({ locale }));
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isPublishedLocale(raw) ? raw : "en";
  const card = await readFile(
    path.join(process.cwd(), "public/brand", `tarjeta-compartir-${locale}.jpg`),
  );
  return new Response(new Uint8Array(card), { headers: { "Content-Type": contentType } });
}
