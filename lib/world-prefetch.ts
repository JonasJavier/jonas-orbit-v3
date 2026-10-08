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
 *
 * ── Intención es QUEDARSE, no pasar por encima ─────────────────────────────
 *
 * El cursor que cruza la home de camino a otro planeta pasa casi siempre por
 * Gargantúa, que ocupa el centro. Precargar al primer `pointerenter` pedía
 * Sobre mí con sus `preload` —el cielo y siete fotos, ~390 KB— y, con la red
 * lenta, esa descarga le quitaba ancho de banda a la página que sí se había
 * pulsado (medido 2026-10-07 con «Slow 4G»: Contacto llegaba 2,9 s después
 * de retirarse la luz, detrás de las fotos de Sobre mí). Así que la precarga
 * espera `INTENT_DWELL_MS` y sólo se pide si el enlace SIGUE apuntado o
 * enfocado. El clic no depende de esto: la travesía precarga al despegar
 * (`world-navigation.ts`) y un `<Link>` pide su ruta al pulsarlo.
 */
const INTENT_DWELL_MS = 160;

function stillIntended(href: string): boolean {
  for (const link of document.querySelectorAll("a:hover, a:focus")) {
    if (link.getAttribute("href") === href) return true;
  }
  return false;
}

export function usePrefetchOnIntent() {
  const router = useRouter();
  return useCallback(
    (href: string) => {
      window.setTimeout(() => {
        if (stillIntended(href)) router.prefetch(href);
      }, INTENT_DWELL_MS);
    },
    [router],
  );
}
