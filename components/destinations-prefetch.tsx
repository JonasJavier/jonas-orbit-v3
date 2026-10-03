"use client";

import { useDeferredPrefetch } from "@/lib/world-prefetch";

/**
 * Precarga de fondo de los seis destinos, montada en el layout: no pinta nada.
 * El momento lo decide `lib/world-prefetch.ts` (escena dibujando o plazo tras
 * el ocio), no la posición de los enlaces en el viewport.
 */
export function DestinationsPrefetch({ routes }: { routes: readonly { href: string }[] }) {
  useDeferredPrefetch(routes);
  return null;
}
