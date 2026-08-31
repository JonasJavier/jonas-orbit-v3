/**
 * Gate de capacidad: decide qué nivel de la escena se monta (§5 del pivote).
 *
 * Es una función PURA sobre señales explícitas, y está separada de la escena
 * para poder cubrirla con tests sin WebGL. Tres reglas la gobiernan:
 *
 * 1. **Los vetos son duros.** Sin WebGL2, con `prefers-reduced-motion` o con el
 *    perfil ligero pedido por el visitante, no hay negociación: `flat`.
 * 2. **Una señal ausente es neutral**, nunca una pista en contra. `deviceMemory`
 *    y `effectiveType` no existen en Safari, y penalizar su ausencia habría
 *    mandado a `flat` a media población de iPhone.
 * 3. **Prohibido detectar al auditor** (regla 5 del repositorio). Aquí no se
 *    mira el user agent ni ninguna huella de Lighthouse: solo capacidades reales
 *    y la preferencia explícita del visitante.
 */

export type EffectsLevel = "flat" | "orbit" | "deep";

export interface CapabilitySignals {
  /** Veto duro: sin WebGL2 no hay raymarch que valga. */
  hasWebGL2: boolean;
  /**
   * Nombre del renderer (`WEBGL_debug_renderer_info`), en minúsculas.
   *
   * Veto duro cuando delata un rasterizador por SOFTWARE. No es una excepción
   * cosmética: el raymarch son ~190 pasos por píxel, y sin GPU eso no es «va
   * lento», es que no completa un fotograma y el visitante ve un rectángulo
   * negro con el ventilador a tope.
   *
   * Y no, esto NO es detectar al auditor (regla 5). Se mira una capacidad real
   * del equipo, la misma para todo el mundo, y quien la tiene recibe el nivel
   * `flat` porque es el que puede usar. Que un CI headless caiga aquí es una
   * consecuencia correcta, no el objetivo: ese entorno tampoco podría pintarlo.
   */
  renderer?: string;
  /** Veto duro: preferencia de accesibilidad del sistema. */
  reducedMotion: boolean;
  /** Veto duro: el visitante pidió el perfil ligero (`?no3d=1`). */
  lightEffects: boolean;
  /** `navigator.deviceMemory` en GB. Ausente en Safari y Firefox. */
  deviceMemory?: number;
  /** `navigator.hardwareConcurrency`. */
  cores?: number;
  /** `navigator.connection.effectiveType`. */
  effectiveType?: string;
  /** Puntero grueso: dedo en vez de ratón. Buen indicador de móvil. */
  coarsePointer: boolean;
  /** Ancho del viewport en píxeles CSS. */
  viewportWidth: number;
  /** `window.devicePixelRatio`. */
  devicePixelRatio: number;
  /**
   * El visitante pulsó «Activar escena 3D».
   *
   * Salta las HEURÍSTICAS —renderer por software, memoria justa, red lenta—,
   * que son suposiciones sobre su equipo y pueden equivocarse. No salta los
   * vetos que no son suposiciones: sin WebGL2 no hay nada que activar, y
   * `prefers-reduced-motion` es una necesidad declarada, no una estimación.
   *
   * Al forzar se entra en `orbit`, nunca en `deep`: si el gate creía que este
   * equipo no llegaba, lo prudente es empezar por el nivel barato.
   */
  forced?: boolean;
}

/** Rasterizadores por software conocidos. */
const SOFTWARE_RENDERERS = /swiftshader|llvmpipe|softpipe|software|basic render/;

/**
 * Por qué el gate decidió lo que decidió.
 *
 * Existe porque una escena que no aparece y no dice nada es indistinguible de
 * una escena rota. Con el motivo se puede escribir un mensaje honesto, ofrecer
 * la salida correcta y —esto es lo que lo hace valer— DIAGNOSTICAR desde fuera
 * sin adivinar.
 */
export type LevelReason =
  | "ok"
  | "sin-webgl2"
  | "movimiento-reducido"
  | "perfil-ligero"
  | "gpu-por-software"
  | "red-lenta"
  | "memoria-corta";

export interface CapabilityVerdict {
  level: EffectsLevel;
  reason: LevelReason;
  /** Si tiene sentido ofrecer al visitante que la active de todas formas. */
  canOverride: boolean;
}

export function evaluateCapabilities(
  signals: CapabilitySignals,
): CapabilityVerdict {
  // Sin WebGL2 no hay nada que activar. No es una preferencia ni una
  // estimación, es la ausencia de la herramienta.
  if (!signals.hasWebGL2) {
    return { level: "flat", reason: "sin-webgl2", canOverride: false };
  }

  // Reduced motion es un veto de accesibilidad, no una heurística de capacidad.
  // Se evalúa ANTES que una activación guardada para que ninguna preferencia de
  // una visita anterior vuelva a encender movimiento a espaldas del visitante.
  if (signals.reducedMotion) {
    return {
      level: "flat",
      reason: "movimiento-reducido",
      canOverride: false,
    };
  }

  // La activación explícita sólo gana a heurísticas o a un opt-out previo. No
  // puede fabricar WebGL2 ni saltarse el veto de movimiento reducido de arriba.
  if (signals.forced) {
    return { level: "orbit", reason: "ok", canOverride: false };
  }
  if (signals.lightEffects) {
    return { level: "flat", reason: "perfil-ligero", canOverride: true };
  }
  if (signals.renderer && SOFTWARE_RENDERERS.test(signals.renderer)) {
    return { level: "flat", reason: "gpu-por-software", canOverride: true };
  }
  // Red muy mala: el chunk de la escena tardaría más que la paciencia de nadie.
  if (signals.effectiveType === "slow-2g" || signals.effectiveType === "2g") {
    return { level: "flat", reason: "red-lenta", canOverride: true };
  }
  // Equipos claramente cortos de memoria: la escena arranca pero el navegador
  // acaba tirando el contexto WebGL, que es peor que no ofrecerla.
  if (signals.deviceMemory !== undefined && signals.deviceMemory <= 2) {
    return { level: "flat", reason: "memoria-corta", canOverride: true };
  }

  // `deep` pide señales verdes, no ausencia de rojas: pantalla de escritorio,
  // puntero fino y CPU holgada. Un móvil potente se queda en `orbit`, que es
  // exactamente lo que dice §5.
  const desktopClass =
    !signals.coarsePointer &&
    signals.viewportWidth >= 1100 &&
    (signals.cores === undefined || signals.cores >= 8) &&
    (signals.deviceMemory === undefined || signals.deviceMemory >= 8);

  return {
    level: desktopClass ? "deep" : "orbit",
    reason: "ok",
    canOverride: false,
  };
}

export function detectLevel(signals: CapabilitySignals): EffectsLevel {
  return evaluateCapabilities(signals).level;
}

/** Lee las señales del navegador. Solo se llama en el cliente. */
export function readSignals({
  reducedMotion,
  lightEffects,
  forced,
}: {
  reducedMotion: boolean;
  lightEffects: boolean;
  forced?: boolean;
}): CapabilitySignals {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { effectiveType?: string };
  };

  const probe = inspectWebGL();

  return {
    hasWebGL2: probe.hasWebGL2,
    renderer: probe.renderer,
    reducedMotion,
    lightEffects,
    forced,
    deviceMemory: nav.deviceMemory,
    cores: nav.hardwareConcurrency,
    effectiveType: nav.connection?.effectiveType,
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    viewportWidth: window.innerWidth,
    devicePixelRatio: window.devicePixelRatio || 1,
  };
}

interface WebGLProbe {
  hasWebGL2: boolean;
  renderer?: string;
}

/**
 * La sonda se cachea: sus respuestas no cambian durante la sesión y crear un
 * contexto WebGL cuesta caro. Sin caché, `readSignals` sería llamado en cada
 * render y fabricaría un contexto por cada uno.
 */
let cachedProbe: WebGLProbe | null = null;

/** Sondea WebGL2 en un canvas desechable: el contexto real lo crea la escena. */
function inspectWebGL(): WebGLProbe {
  if (cachedProbe) return cachedProbe;
  cachedProbe = probeWebGL();
  return cachedProbe;
}

function probeWebGL(): WebGLProbe {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) return { hasWebGL2: false };

    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = info
      ? (gl.getParameter(info.UNMASKED_RENDERER_WEBGL) as string | null)
      : null;

    // Se suelta el contexto: dejarlo vivo consume uno de los pocos que el
    // navegador concede por pestaña, y la escena necesita el suyo.
    gl.getExtension("WEBGL_lose_context")?.loseContext();

    return { hasWebGL2: true, renderer: renderer?.toLowerCase() };
  } catch {
    return { hasWebGL2: false };
  }
}
