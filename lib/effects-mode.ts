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
/**
 * La activación explícita: «lo quiero todo aunque mi sistema diga que no».
 *
 * Vive AQUÍ y no dentro de la escena porque la petición no es sobre la escena,
 * es sobre los efectos. Cuando era `useState` de `GargantuaSystem`, pulsar
 * «Activar escena 3D» encendía el raymarch y dejaba apagados el cursor de
 * navegación y el polvo estelar, que leen la preferencia por su cuenta: el
 * visitante pedía una cosa y recibía media. Un solo almacén, tres lectores.
 */
const FORCED_STORAGE_KEY = "jonas-orbit:efectos-forzados";
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

/**
 * Quién tiene derecho a respuesta del puntero — cursor de navegación y polvo
 * estelar — expresado UNA vez, en positivo y sin DOM.
 *
 * Estaba escrito en línea dentro del telón como `reducedMotion || lightEffects`,
 * y esa expresión no conocía la activación explícita. El resultado era un sitio
 * que decía «escena activada» mientras el CSS mantenía las dos capas en
 * `display: none`: la avería que se estaba diagnosticando.
 *
 * La regla es la misma del gate de capacidad: reduced-motion es un veto duro;
 * una petición explícita sólo puede recuperar efectos desactivados por el
 * perfil ligero o por heurísticas de capacidad.
 */
export function pointerLifeEnabled({
  reducedMotion,
  lightEffects,
  forcedEffects,
}: {
  reducedMotion: boolean;
  lightEffects: boolean;
  forcedEffects: boolean;
}): boolean {
  if (reducedMotion) return false;
  if (forcedEffects) return true;
  return !lightEffects;
}

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    // Safari en modo privado y navegadores con almacenamiento bloqueado: la
    // preferencia deja de recordarse, pero la página no se cae por eso.
    return null;
  }
}

function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* almacenamiento no disponible: la preferencia dura lo que la pestaña */
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
  return resolveLightEffectsMode(window.location.search, readStored(STORAGE_KEY));
}

function getForcedSnapshot() {
  if (typeof window === "undefined") return false;
  return readStored(FORCED_STORAGE_KEY) === "true";
}

function announce() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * Guarda —o retira— la activación explícita y avisa a los tres lectores en el
 * mismo tick. Se persiste por la misma razón que el perfil ligero: quien ya dijo
 * «enciéndelo» no tiene que volver a decirlo en cada ruta ni en cada visita.
 */
export function setForcedEffects(value: boolean) {
  if (getForcedSnapshot() === value) return;
  writeStored(FORCED_STORAGE_KEY, String(value));
  announce();
}

/**
 * Instantánea de servidor `false` a propósito: el HTML servido es idéntico para
 * todo el mundo y la activación se resuelve tras hidratar, sin mismatch.
 */
export function useForcedEffects() {
  return useSyncExternalStore(subscribe, getForcedSnapshot, () => false);
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
    writeStored(STORAGE_KEY, String(fromUrl));
    // Pedir MENOS efectos tiene que reducirlos de verdad: una activación
    // guardada de otra visita no puede sobrevivir a `?no3d=1` y dejar el botón
    // «Reducir efectos» sin efecto. `?no3d=0` no la toca — ahí no hay conflicto.
    if (fromUrl) setForcedEffects(false);
  }, [value]);

  return value;
}
