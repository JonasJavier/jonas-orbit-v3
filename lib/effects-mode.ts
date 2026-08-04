"use client";

import { useSyncExternalStore } from "react";

/**
 * Perfil ligero explícito (`?no3d=1`).
 *
 * El plan lo define como parte real del producto: es el MISMO mecanismo que
 * usará el botón "Reducir efectos" de F2B, no una puerta trasera para
 * auditorías. Por eso vive en la URL, es visible y lo activa quien navega.
 *
 * Regla no negociable nº5 del repo: prohibido el código cuya única función sea
 * alterar una auditoría. Aquí no se inspecciona el user agent ni ninguna señal
 * del auditor — solo un parámetro que cualquier visitante puede escribir.
 *
 * En F1A el efecto es omitir el canvas del starfield y quedarse con el
 * `StaticBackdrop` de CSS. En F2B este mismo flag vetará `UniverseScene` (A27).
 */

const LIGHT_EFFECTS_PARAM = "no3d";

/** Parser puro: aislado del DOM para poder cubrirlo con Vitest. */
export function isLightEffectsMode(search: string): boolean {
  const value = new URLSearchParams(search).get(LIGHT_EFFECTS_PARAM);
  if (value === null) return false;
  // `?no3d` a secas cuenta como activado; solo un "0"/"false" explícito lo apaga.
  return value !== "0" && value !== "false";
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  // La navegación del narrador usa push/replaceState, que no emiten eventos
  // propios; popstate cubre Atrás/Adelante, que es cuando la URL puede cambiar
  // bajo los pies del componente.
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function getSnapshot() {
  return typeof window !== "undefined" && isLightEffectsMode(window.location.search);
}

/**
 * El home es estático (SSG), así que el servidor nunca ve el parámetro: la
 * instantánea de servidor es siempre `false` y `useSyncExternalStore` re-renderiza
 * tras la hidratación sin provocar mismatch (mismo patrón que reduced-motion).
 */
export function useLightEffectsMode() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
