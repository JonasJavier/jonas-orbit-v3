import * as THREE from "three";
import { DISK_INNER, DISK_OUTER, GARGANTUA_RS } from "./gargantua-shaders";

/**
 * LOS NÚMEROS QUE HACEN QUE GARGANTÚA SEA GARGANTÚA.
 *
 * Existe porque desde el pase del Observatorio hay **dos superficies que la
 * dibujan** —el System Map y el laboratorio— y ninguna de las dos puede tener
 * su propia opinión sobre cuánto se apaga la sombra o cuántos pasos da el
 * integrador.
 *
 * ── Por qué se extrajeron los DATOS y no la maquinaria ──────────────────────
 *
 * La tentación era mover el montaje entero: el cuad, los dos render targets en
 * ping-pong, las pasadas de post. Se descartó, y el motivo es dónde está el
 * riesgo de verdad.
 *
 * El cuad y el orden de las pasadas no derivan solos: son código que nadie
 * edita por gusto, y los dos consumidores quieren cosas distintas alrededor —el
 * mapa tiene cuerpos, travesía y una pose por ruta; el laboratorio tiene vistas
 * curadas y un bucle bajo demanda—. Un módulo que intentara servir a los dos
 * habría ido creciendo opciones hasta convertirse en un objeto de configuración,
 * que es la forma habitual de romper lo que se pretendía proteger.
 *
 * Lo que sí deriva son los NÚMEROS. La guarda de la sombra se afinó dos veces
 * en un solo día —`amount` 0.88 → 0.96 e `inner` 0.72 → 0.80 → 0.85— y cada una
 * de esas rondas, con dos copias vivas, habría dejado al Observatorio
 * enseñando la versión anterior. Justo en la página cuya vista `SOMBRA` existe
 * para contar esa constante.
 *
 * Regla de admisión: aquí entra lo que describe **cómo se ve Gargantúa**, y se
 * queda fuera lo que describe cómo la encuadra una página concreta.
 * `COMPOSITION_DISK_OUTER`, la pose de la home y las vistas del laboratorio son
 * de sus dueños.
 */

/**
 * Nivel de calidad del raymarch.
 *
 * Vive aquí y no en `system-scene.ts` porque las dos palancas que gobierna
 * —píxeles y pasos— son de Gargantúa, no del mapa. El mapa lo traduce desde el
 * veredicto de capacidad; el laboratorio hace lo mismo con el suyo.
 */
export type QualityTier = "orbit" | "deep";

/** Presupuesto por nivel: las dos palancas de un raymarcher son píxeles y pasos. */
export const TIER: Record<
  QualityTier,
  { dpr: number; steps: number; stepScale: number }
> = {
  orbit: { dpr: 1.0, steps: 190, stepScale: 0.14 },
  deep: { dpr: 1.35, steps: 340, stepScale: 0.085 },
};

/*
  El bloom se ensancha MUCHO más de lo que se sube de fuerza, y esa proporción es
  deliberada.

  Lo que hace que una fuente de luz se sienta enorme no es que su núcleo esté más
  quemado, es hasta dónde llega su resplandor: es la diferencia entre una bombilla
  y un incendio. Subir `strength` sí sube el pico, pero además levanta el suelo
  dentro de la SOMBRA — y la sombra tiene que quedarse negra, porque es lo único
  que dice que ahí hay un agujero y no una lámpara. Ensanchar el radio reparte el
  halo hacia fuera, sobre el cielo negro, donde no hay nada que ensuciar.
*/
export const BLOOM: Record<
  QualityTier,
  { strength: number; radius: number; scale: number }
> = {
  orbit: { strength: 0.6, radius: 0.57, scale: 0.5 },
  deep: { strength: 0.67, radius: 0.61, scale: 0.62 },
};

export const BASE_EXPOSURE = 0.95;
export const BLOOM_THRESHOLD = 2.0;

/**
 * Peso de la mezcla temporal en reposo.
 *
 * No se exporta: quien la necesita usa `temporalBlend`, que además aplica la
 * rampa de arranque. Una constante suelta al lado de la función que la
 * interpreta invita a usar la constante y saltarse la rampa.
 *
 * Con la cámara quieta el píxel converge: la contribución del historial cae
 * como `0.82^n`. No es una promesa de convergencia visual —ese umbral se mide
 * con capturas, no se deduce de la serie— pero sí es lo que convierte el
 * supermuestreo sobre ocho posiciones de Halton en algo barato.
 */
const TEMPORAL_BLEND = 0.18;

/*
  ── La travesía ─────────────────────────────────────────────────────────────

  Durante el viaje la cámara SÍ se mueve, y la acumulación temporal del
  raymarch deja de ser válida fotograma a fotograma. El pivote (§G3) fija la
  respuesta: no se reproyecta —eso es TAA de motor de juego— sino que se
  sostiene alto el peso de la mezcla mientras dura el movimiento. 0.55 deja
  algo de suavizado sin dejar estela.

  El Observatorio reutiliza este mismo número para moverse entre vistas
  curadas, y no es una coincidencia: es el mismo problema —la cámara se mueve y
  el historial deja de describir este cuadro— con otro gesto encima.
*/
const VOYAGE_TEMPORAL_BLEND = 0.55;

/**
 * Radio aparente de la sombra, en unidades del integrador.
 *
 * No es el horizonte. Un observador lejano no ve una esfera de radio rs: ve el
 * disco de parámetros de impacto que caen dentro, y ese borde está en
 * b = 3√3·GM/c² = (√27/2)·rs con la convención del shader (horizonte en r = rs,
 * esfera de fotones en 1.5·rs). Es el mismo número que se retiró de la
 * geodésica por dibujar una circunferencia exacta de un píxel; aquí no dibuja
 * nada, sólo acota dónde se protege el negro.
 */
export const SHADOW_IMPACT = (Math.sqrt(27) / 2) * GARGANTUA_RS;

/**
 * Guarda de la sombra. Ver la nota larga de `SHADOW_GUARD_FRAGMENT`.
 *
 * Tampoco se exporta: se consume por `createShadowGuardUniforms`, que es la
 * única forma correcta de montarla —con `tClean` a null, porque `ShaderPass`
 * clona sus uniformes y no sabe clonar la textura de un render target—.
 *
 * `inner` deja el centro protegido y abre el borde hasta el radio de la sombra,
 * para que no se vea una circunferencia. `amount` se queda por debajo de 1 a
 * propósito: retirar el halo del TODO deja un negro plano y recortado contra el
 * disco, que sigue mereciendo una traza. Y `darkGate` está en luminancia
 * LINEAL, antes del tone mapping — el suelo del disco lensado dentro de la
 * sombra vive muy por encima de esta ventana, así que sus arcos no la cruzan.
 *
 * Subió dos veces el 2026-09-12: `amount` 0.88 → 0.96 porque el 12 % residual
 * del halo dejaba el centro en 18 y el flanco brillante en 93 sobre 255 —un
 * gris con degradado, no un negro con una traza—, e `inner` 0.72 → 0.80 → 0.85
 * en la ronda final, que deja el borde abierto en el 15 % exterior y afila el
 * negro un pelo sin dibujar una circunferencia.
 */
const SHADOW_GUARD = {
  inner: 0.85,
  amount: 0.96,
  darkGate: [0.006, 0.075] as const,
};

/** Halton(2,3) recentrado en el píxel. */
export const JITTER: readonly (readonly [number, number])[] = [
  [0.5, 0.333333],
  [0.25, 0.666667],
  [0.75, 0.111111],
  [0.125, 0.444444],
  [0.625, 0.777778],
  [0.375, 0.222222],
  [0.875, 0.555556],
  [0.0625, 0.888889],
].map(([x, y]) => [x - 0.5, y - 0.5] as const);

/**
 * El peso de la mezcla para este fotograma.
 *
 * La rampa `1 / (accumulated + 1)` es lo que hace que el primer fotograma tras
 * un reinicio valga 1 y sobrescriba el historial entero. Por eso
 * `resetAccumulation` puede ser literalmente `accumulated = 0` sin limpiar
 * ningún render target: el siguiente fotograma se encarga.
 *
 * @param moving la cámara se está moviendo — travesía en el mapa, cambio de
 *               vista en el laboratorio. Sostiene el peso alto para que el
 *               historial no deje estela.
 */
export function temporalBlend(accumulated: number, moving: boolean): number {
  return Math.max(
    moving ? VOYAGE_TEMPORAL_BLEND : TEMPORAL_BLEND,
    1 / (accumulated + 1),
  );
}

/**
 * EL JUEGO DE UNIFORMES DEL RAYMARCH, en un solo sitio.
 *
 * Diecinueve entradas, y la mitad se escriben cada fotograma desde la cámara.
 * Las que importan aquí son las que NO se escriben nunca —`uRs`, los radios del
 * disco, `uStepScale` y los tres interruptores— porque son las que definen qué
 * agujero negro es éste. Las demás se inicializan a cualquier cosa razonable y
 * el primer `applyPose` las pisa.
 *
 * Los tres interruptores arrancan encendidos en las dos superficies. Son ramas
 * reales del fragmento —`uDoppler` apaga el beaming, el tinte de los dos lados
 * y la asimetría de densidad; `uSecondary` mata el rayo en su primer cruce;
 * `uSkyLens` deja de curvar el campo estelar— y quien quiera ofrecerlas como
 * instrumento las mueve desde fuera. Ninguna de las dos escenas las toca por su
 * cuenta.
 *
 * `uDiag` es distinto: no es un instrumento, es el banco visual
 * (`diagnosticCode` en `lib/visual-bench.ts`). Arranca en 0 —producción— y
 * cada escena lo fija UNA vez al montar, con el resto del banco.
 */
export function createMarchUniforms(
  tier: QualityTier,
): Record<string, THREE.IUniform> {
  return {
    uCamPos: { value: new THREE.Vector3() },
    uCamRight: { value: new THREE.Vector3(1, 0, 0) },
    uCamUp: { value: new THREE.Vector3(0, 1, 0) },
    uCamFwd: { value: new THREE.Vector3(0, 0, -1) },
    uTanHalfFov: { value: 1 },
    uAspect: { value: 1 },
    uTime: { value: 0 },
    uRs: { value: GARGANTUA_RS },
    uPixelScale: { value: 0.002 },
    uDiskInner: { value: DISK_INNER },
    uDiskOuter: { value: DISK_OUTER },
    uSkyRadius: { value: 60 },
    uStepScale: { value: TIER[tier].stepScale },
    uDoppler: { value: 1 },
    uSecondary: { value: 1 },
    uSkyLens: { value: 1 },
    uDiag: { value: 0 },
    tHistory: { value: null },
    uJitter: { value: new THREE.Vector2() },
    uBlend: { value: 1 },
  };
}

/**
 * Los uniformes de la guarda de la sombra.
 *
 * `tClean` se deja a `null` y se enlaza DESPUÉS de construir el paso: los
 * `ShaderPass` clonan los uniformes que reciben, y `cloneUniforms` no sabe
 * clonar la textura de un render target — la pone a null y avisa por consola.
 */
export function createShadowGuardUniforms(): Record<string, THREE.IUniform> {
  return {
    tDiffuse: { value: null },
    tClean: { value: null },
    uCentre: { value: new THREE.Vector2(0.5, 0.5) },
    uRadius: { value: new THREE.Vector2(0.05, 0.05) },
    uInner: { value: SHADOW_GUARD.inner },
    uAmount: { value: SHADOW_GUARD.amount },
    uDarkGate: {
      value: new THREE.Vector2(
        SHADOW_GUARD.darkGate[0],
        SHADOW_GUARD.darkGate[1],
      ),
    },
  };
}

/**
 * Opciones de los dos render targets del ping-pong.
 *
 * Media precisión y sin filtrado: el historial se lee píxel a píxel contra el
 * fotograma nuevo, así que interpolar sería mezclar muestras vecinas y deshacer
 * el supermuestreo que este mecanismo existe para conseguir.
 */
export const HISTORY_TARGET: THREE.RenderTargetOptions = {
  type: THREE.HalfFloatType,
  depthBuffer: false,
  stencilBuffer: false,
  minFilter: THREE.NearestFilter,
  magFilter: THREE.NearestFilter,
  generateMipmaps: false,
};
