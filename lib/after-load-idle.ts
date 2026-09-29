"use client";

import { useSyncExternalStore } from "react";

/*
  «La página ya cargó y el navegador está ocioso», una vez por visita.

  Es el momento para el trabajo de GPU que no se ve en la primera pantalla o
  que tiene una imagen quieta que lo sustituye mientras tanto: la escena
  persistente cubierta y el agua de Miller. Hacerlo antes competía con la
  hidratación y la imagen principal —cada contexto WebGL con sus shaders
  cuesta ~200–250 ms en un Chrome sin GPU, el de PageSpeed (2026-09-29)—.

  El tope de 2 s evita que una página que nunca queda ociosa se quede sin él.
  Safari no tiene `requestIdleCallback` y no hay otra forma honesta de saber
  cuándo está ocioso: ahí llega justo tras el `load`. Un retraso fijo lo hacía
  coincidir con la primera interacción (e2e de Edmunds en WebKit).

  Una vez alcanzado vale para el resto de la visita: navegar después no
  vuelve a esperar.
*/

let settled = false;
let scheduled = false;
const listeners = new Set<() => void>();

function settle() {
  settled = true;
  for (const listener of listeners) listener();
}

function whenIdle() {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(settle, { timeout: 2000 });
  } else {
    window.setTimeout(settle, 0);
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!scheduled && !settled) {
    scheduled = true;
    if (document.readyState === "complete") whenIdle();
    else window.addEventListener("load", whenIdle, { once: true });
  }
  return () => {
    listeners.delete(listener);
  };
}

export function useAfterLoadIdle(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => settled,
    () => false,
  );
}
