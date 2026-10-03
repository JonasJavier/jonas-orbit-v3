"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useAfterLoadIdle } from "./after-load-idle";

/**
 * Cuándo se precargan los seis destinos.
 *
 * `<Link>` precarga cada ruta en cuanto entra en el viewport, y los seis
 * destinos están siempre a la vista: en el raíl de la home y en la cabecera
 * de cualquier otra página. Al segundo de abrir una página el navegador pedía
 * el RSC de los seis mundos y, con él, lo que esas páginas declaran con
 * `preload` —el cielo y las fotos de Sobre mí, la sala de Proyectos, el
 * ventanal de Experimentos— y sus hojas de estilo. Medido el 2026-10-02 sobre
 * `next start`: 1,3 MB de otras páginas en los primeros 3 s de la home,
 * pedidos ANTES que el chunk de three.js que dibuja la escena, y ~10 avisos de
 * «preloaded but not used» en consola en CADA ruta (1 830 en 174 cargas).
 *
 * La precarga completa espera a que la escena ya dibuje (`data-scene-live`),
 * que es cuando el cable queda libre, o a un plazo de gracia tras el ocio
 * posterior a la carga: fuera de la home la escena está cubierta y no se
 * publica nunca, así que ahí manda el plazo. Apuntar o enfocar un destino lo
 * precarga al momento (`usePrefetchOnIntent`): es el que se va a pulsar. El
 * plazo es largo a propósito: Chrome avisa de los preload sin usar unos
 * segundos después de `load`, y una precarga dentro de esa ventana sigue
 * ensuciando la consola aunque ya no compita con nada.
 */
const GRACE_AFTER_IDLE_MS = 6000;

export function worldsPrefetchReady(input: { sceneLive: boolean; graceOver: boolean }): boolean {
  return input.sceneLive || input.graceOver;
}

function subscribeRoot(listener: () => void) {
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-scene-live"],
  });
  return () => observer.disconnect();
}

const readSceneLive = () => document.documentElement.dataset.sceneLive === "true";
const serverFalse = () => false;

/** Precarga diferida de un conjunto de rutas (los seis destinos, desde el layout). */
export function useDeferredPrefetch(destinations: readonly { href: string }[]) {
  const router = useRouter();
  const idle = useAfterLoadIdle();
  const sceneLive = useSyncExternalStore(subscribeRoot, readSceneLive, serverFalse);
  const [graceOver, setGraceOver] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (!idle || graceOver) return;
    const timer = window.setTimeout(() => setGraceOver(true), GRACE_AFTER_IDLE_MS);
    return () => window.clearTimeout(timer);
  }, [idle, graceOver]);

  useEffect(() => {
    if (done.current || !worldsPrefetchReady({ sceneLive, graceOver })) return;
    done.current = true;
    for (const destination of destinations) router.prefetch(destination.href);
  }, [destinations, graceOver, router, sceneLive]);
}

/** Precarga inmediata de la ruta que el visitante apunta o enfoca. */
export function usePrefetchOnIntent() {
  const router = useRouter();
  return useCallback((href: string) => router.prefetch(href), [router]);
}
