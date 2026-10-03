"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useAfterLoadIdle } from "./after-load-idle";

/**
 * Cuándo precarga la home los seis destinos.
 *
 * `<Link>` precarga cada ruta en cuanto entra en el viewport, y en la home
 * los seis enlaces del raíl están siempre a la vista: al segundo de abrirla
 * el navegador pedía el RSC de los seis mundos y, con él, las imágenes que
 * esas páginas declaran con `preload` —el cielo y las fotos de Sobre mí, la
 * sala de Proyectos, el ventanal de Experimentos— y sus hojas de estilo.
 * Medido el 2026-10-02 sobre `next start`: 1,3 MB de otras páginas en los
 * primeros 3 s, pedidos ANTES que el chunk de three.js que dibuja la escena,
 * y 17 avisos de «preloaded but not used» en consola. Es justo el ancho de
 * banda que la primera pantalla necesita.
 *
 * Así que la precarga espera a que la escena ya dibuje (`data-scene-live`),
 * que es cuando el cable queda libre; si no va a haber escena (perfil plano)
 * basta con que la página haya cargado y el navegador esté ocioso; y si la
 * escena tarda más de la cuenta, un plazo de gracia precarga igual para que
 * la travesía no espere a la red. Apuntar o enfocar un destino lo precarga
 * al momento: es el que más probablemente se va a pulsar.
 */
const SCENE_GRACE_MS = 6000;

export function worldsPrefetchReady(input: {
  sceneLive: boolean;
  idle: boolean;
  /** Nivel publicado en `<html data-scene>`; `undefined` mientras se decide. */
  level: string | undefined;
  graceOver: boolean;
}): boolean {
  if (input.sceneLive) return true;
  if (!input.idle) return false;
  return input.level === "flat" || input.graceOver;
}

function subscribeRoot(listener: () => void) {
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-scene", "data-scene-live"],
  });
  return () => observer.disconnect();
}

const readSceneLive = () => document.documentElement.dataset.sceneLive === "true";
const readLevel = () => document.documentElement.dataset.scene;
const serverFalse = () => false;
const serverUndefined = () => undefined;

/**
 * Precarga diferida de los destinos de la home. Devuelve una función para
 * precargar uno al momento (apuntado o enfocado).
 */
export function useWorldsPrefetch(destinations: readonly { href: string }[]) {
  const router = useRouter();
  const idle = useAfterLoadIdle();
  const sceneLive = useSyncExternalStore(subscribeRoot, readSceneLive, serverFalse);
  const level = useSyncExternalStore(subscribeRoot, readLevel, serverUndefined);
  const [graceOver, setGraceOver] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (!idle || graceOver) return;
    const timer = window.setTimeout(() => setGraceOver(true), SCENE_GRACE_MS);
    return () => window.clearTimeout(timer);
  }, [idle, graceOver]);

  useEffect(() => {
    if (done.current) return;
    if (!worldsPrefetchReady({ sceneLive, idle, level, graceOver })) return;
    done.current = true;
    for (const destination of destinations) router.prefetch(destination.href);
  }, [destinations, graceOver, idle, level, router, sceneLive]);

  return useCallback((href: string) => router.prefetch(href), [router]);
}
