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
 * parámetro sobrevivía solo. Con 7 rutas reales, el primer enlace lo borraría y
 * el visitante que pidió menos efectos los recuperaría sin haberlo pedido. §5
 * del pivote ya exigía que "su elección se persiste": la URL es la ENTRADA a la
 * preferencia, el almacenamiento es su memoria.
 */

const LIGHT_EFFECTS_PARAM = "no3d";
const STORAGE_KEY = "jonas-orbit:reducir-efectos";
/*
  ── Un solo interruptor de movimiento (2026-09-13) ─────────────────────────

  Antes había dos almacenes —el perfil ligero y la «activación forzada»— y
  cada página añadía su propio botón (océano, vuelo, estrellas, escena 3D).
  El dueño pidió UN icono, abajo a la derecha, siempre presente, que encienda
  y apague todo el movimiento del sistema, y que por defecto esté encendido.

  Queda un solo valor, «movimiento», con tres entradas por orden de mando:
  la URL (`?no3d=1` es la puerta documentada al perfil ligero y se persiste),
  lo que el visitante eligió con el icono, y si no hay nada, ENCENDIDO. La
  preferencia del sistema `prefers-reduced-motion` ya no apaga nada por sí
  sola: el icono es el consentimiento, visible y reversible en toda ruta.
  `useLightEffectsMode` (= movimiento apagado) y `useForcedEffects`
  (= movimiento encendido) se conservan como lecturas del mismo valor para
  la escena, el fondo y el gate de capacidad.
*/
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
 * La regla es la misma del gate de capacidad: reduced-motion apaga todo por
 * defecto, pero una activación voluntaria recupera escena, cursor, polvo y
 * deriva como una sola elección. El control también permite deshacerla.
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
  if (forcedEffects) return true;
  if (reducedMotion) return false;
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

function announce() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * El interruptor. Guarda la elección y avisa a todos los lectores en el mismo
 * tick; se persiste para que quien apagó el movimiento no tenga que volver a
 * apagarlo en cada ruta ni en cada visita.
 */
export function setMotionEnabled(enabled: boolean) {
  // "true" = apagado; "false" = encendido a propósito (fuerza la escena).
  writeStored(STORAGE_KEY, String(!enabled));
  // La URL es la ENTRADA a la preferencia y manda mientras está presente: si
  // el visitante entró por `?no3d=1` y ahora pulsa el icono, el parámetro se
  // consume para que su gesto sea el que cuente, sin recargar ni navegar.
  const url = new URL(window.location.href);
  if (url.searchParams.has(LIGHT_EFFECTS_PARAM)) {
    url.searchParams.delete(LIGHT_EFFECTS_PARAM);
    window.history.replaceState(window.history.state, "", url);
  }
  announce();
}

/**
 * Movimiento encendido: lo que leen las páginas para animar o quedarse en un
 * fotograma. Instantánea de servidor `true` —el valor por defecto— para que el
 * HTML servido sea el mismo para todo el mundo; lo que cada canvas hace con
 * ello ocurre después de montar, así que no hay mismatch.
 */
export function useMotionEnabled() {
  return !useLightEffectsMode();
}

/**
 * Encendido EXPLÍCITO: el visitante pulsó el icono. (`?no3d=0` sólo retira el
 * perfil ligero; no fuerza la escena en un equipo que el gate desaconseja.)
 *
 * Distingue «encendido porque es el defecto» de «encendido porque lo pedí».
 * Las páginas animan en ambos casos; la escena 3D y su gate de capacidad
 * sólo saltan por encima de reduced-motion y de las heurísticas (GPU por
 * software, red lenta, memoria corta) con la petición explícita, igual que
 * hacía la activación de antes. Un solo icono, dos lecturas.
 */
function getForcedSnapshot() {
  if (typeof window === "undefined") return false;
  if (readLightEffectsParam(window.location.search) === true) return false;
  return readStored(STORAGE_KEY) === "false";
}

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
  }, [value]);

  return value;
}
