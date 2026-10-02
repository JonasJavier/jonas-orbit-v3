import type { WorldId } from "@/content/worlds.data";

/**
 * La imagen real de cada espécimen del Observatorio, capturada con GPU real
 * en modo OBSERVAR y sin el cromo del instrumento (2026-10-02).
 *
 * Sirve para tres cosas que antes no existían: la tarjeta al compartir la URL
 * del espécimen (antes salía la tarjeta genérica de la portada), la imagen del
 * `CreativeWork` en JSON-LD y el sitemap de imágenes, que es por donde
 * «Gargantúa 3D» o «nave Endurance» pueden aparecer en Google Imágenes.
 *
 * Tres copias por espécimen en `public/images/experimentos/observatorio/`:
 * `-1600.webp` y `-800.webp` (16:9) y `-og.jpg` (1200 × 630, recorte central).
 * Las produce `tools/prepare-specimens.mjs` a partir de las capturas.
 */
const SPECIMEN_IMAGES = "/images/experimentos/observatorio";

export type SpecimenImageVariant = "1600" | "800" | "og";

export function specimenImage(id: WorldId, variant: SpecimenImageVariant): string {
  return variant === "og" ? `${SPECIMEN_IMAGES}/${id}-og.jpg` : `${SPECIMEN_IMAGES}/${id}-${variant}.webp`;
}
