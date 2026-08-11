"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Perfil ligero explícito (`?no3d=1`).
 *
 * El plan lo define como parte real del producto: es el MISMO mecanismo que
 * usará el botón "Reducir efectos" de G2, no una puerta trasera para
 * auditorías. Por eso vive en la URL, es visible y lo activa quien navega.
 *
 * Regla no negociable nº5 del repo: prohibido el código cuya única función sea
 * alterar una auditoría. Aquí no se inspecciona el user agent ni ninguna señal
 * del auditor — solo un parámetro que cualquier visitante puede escribir.
 *
 * ── Por qué se persiste (cambio de G1) ──────────────────────────────────────
 *
 * En F1A toda la navegación ocurría dentro de la misma URL, así que el
 * parámetro sobrevivía solo. Con 8 rutas reales, el primer enlace lo borraría y
 * el visitante que pidió menos efectos los recuperaría sin haberlo pedido. §5
 * del pivote ya exigía que "su elección se persiste": la URL es la ENTRADA a la
 * preferencia, el almacenamiento es su memoria.
 */

const LIGHT_EFFECTS_PARAM = "no3d";
const STORAGE_KEY = "jonas-orbit:reducir-efectos";
/** Cambios dentro de la misma pestaña: `storage` solo avisa a las OTRAS. */
const CHANGE_EVENT = "jonas:effects-mode";

/** Parser puro del parámetro: aislado del DOM para poder cubrirlo con Vitest. */
export function isLightEffectsMode(search: string): boolean {
  const value = new URLSearchParams(search).get(LIGHT_EFFECTS_PARAM);
  if (value === null) return false;
  // `?no3d` a secas cuenta como activado; solo un "0"/"false" explícito lo apaga.
  return value !== "0" && value !== "false";
}

/** `null` cuando el parámetro no viene en la URL, que no es lo mismo que "no". */
export function readLightEffectsParam(search: string): boolean | null {
  return new URLSearchParams(search).has(LIGHT_EFFECTS_PARAM)
    ? isLightEffectsMode(search)
    : null;
}

/**
 * Resolución completa, pura: la URL manda cuando está presente; si no, la
 * elección recordada; si tampoco, efectos completos.
 */
export function resolveLightEffectsMode(
  search: string,
  stored: string | null,
): boolean {
  const fromUrl = readLightEffectsParam(search);
  if (fromUrl !== null) return fromUrl;
  return stored === "true";
}

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Safari en modo privado y navegadores con almacenamiento bloqueado: la
    // preferencia deja de recordarse, pero la página no se cae por eso.
    return null;
  }
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("popstate", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function getSnapshot() {
  if (typeof window === "undefined") return false;
  return resolveLightEffectsMode(window.location.search, readStored());
}

/**
 * Las rutas son estáticas (SSG), así que el servidor nunca ve el parámetro: la
 * instantánea de servidor es siempre `false` y `useSyncExternalStore` re-renderiza
 * tras la hidratación sin provocar mismatch (mismo patrón que reduced-motion).
 */
export function useLightEffectsMode() {
  const value = useSyncExternalStore(subscribe, getSnapshot, () => false);

  // La URL solo se lee; quien la escribe es el visitante. Aquí únicamente se
  // recuerda lo que pidió, para que sobreviva al siguiente enlace.
  useEffect(() => {
    const fromUrl = readLightEffectsParam(window.location.search);
    if (fromUrl === null) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(fromUrl));
    } catch {
      /* almacenamiento no disponible: la preferencia dura lo que la pestaña */
    }
  }, [value]);

  return value;
}
