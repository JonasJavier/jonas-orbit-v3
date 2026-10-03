"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Precarga por intención, no por viewport.
 *
 * `<Link>` de Next precarga cada ruta en cuanto entra en el viewport, y los
 * seis destinos están siempre a la vista: en el raíl de la home y en la
 * cabecera de cualquier otra página. Al segundo de abrir una página el
 * navegador pedía el RSC de los seis mundos y, con él, lo que esas páginas
 * declaran con `preload` —el cielo y las fotos de Sobre mí, la sala de
 * Proyectos, el ventanal de Experimentos— y sus hojas de estilo. Medido el
 * 2026-10-02 sobre `next start`: 1,3 MB de otras páginas en los primeros 3 s
 * de la home, pedidos ANTES que el chunk de three.js que dibuja la escena, y
 * ~10 avisos de «preloaded but not used» en consola en CADA ruta (1 830 en
 * 174 cargas).
 *
 * Precargar en segundo plano más tarde no arregla lo segundo: React aplica
 * los `preload` del RSC en cuanto lo recibe, y Chrome avisa de cada preload
 * que no se usa, se pida cuando se pida. Así que la precarga sólo ocurre con
 * intención —apuntar, enfocar o tocar un enlace (`IntentLink`)—, que es
 * cuando precede a una navegación real y los preload sí se consumen. Sigue
 * cumpliendo el §7 del pivote: la ruta se pide antes de pulsar, y la travesía
 * (2,6 s) tapa lo que falte.
 */
export function usePrefetchOnIntent() {
  const router = useRouter();
  return useCallback((href: string) => router.prefetch(href), [router]);
}
