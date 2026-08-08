/**
 * G0 · Escena del spike de Gargantúa — CÓDIGO DESECHABLE.
 *
 * three.js puro, sin React, para que el bucle de render no compita con el
 * reconciliador y las mediciones sean limpias. Responde una sola pregunta:
 * ¿esto lee como la película a 60 fps en un móvil de gama media?
 * (docs/plans/sistema-gargantua.md §9, gate de G0.)
 *
 * La cámara es FIJA a propósito: es el contrato de §3. Hay varias POSES entre
 * las que se conmuta — que es exactamente el modelo de G2,
 * `cameraPose = f(ruta)` — pero ninguna es orbitable.
 *
 * Toda la escena es UN cuad de pantalla completa. No hay esfera negra, ni malla
 * anular, ni billboard del anillo, ni pase de distorsión del fondo: el shader
 * integra la geodésica de cada píxel y de ahí salen la sombra, el disco, sus
 * imágenes lensadas y el fondo curvado, ya ocluidos entre sí. El porqué está en
 * la cabecera de `shaders.ts`.
 *
 * Cadena de render (EffectComposer, todo dentro de `three` — cero dependencias
 * nuevas):
 *
 *   raymarch de geodésicas → acumulación temporal → bloom → tone mapping ACES
 *
 * El HDR y el bloom siguen siendo lo que hace que se parezca a la película: el
 * envolvente blanco de las referencias es glow, no geometría.
 *
 * ── La acumulación temporal ──────────────────────────────────────────────────
 *
 * El raymarch se dibuja FUERA del composer, a un par de render targets en
 * ping-pong, con el rayo desplazado cada fotograma por una subsecuencia de
 * Halton dentro del píxel y mezclado con el fotograma anterior.
 *
 * Es otra cosa que regala la cámara fija. Sin ella habría que reproyectar el
 * historial y detectar desoclusiones — el TAA caro de un motor de videojuego.
 * Aquí la pose no cambia, así que el píxel de ayer es el mismo píxel de hoy y
 * la mezcla es una línea.
 *
 * Y hace falta: la vecindad del anillo de fotones comprime órbitas enteras del
 * disco en dos píxeles, y a una muestra por píxel ese anillo sale PUNTEADO. Con
 * ~8 muestras efectivas es un hilo continuo. De paso paga la rebaja de DPR, que
 * es la palanca de rendimiento más grande que hay aquí.
 */
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import {
  DISPLAY_FRAGMENT,
  GARGANTUA_FRAGMENT,
  GARGANTUA_VERTEX,
} from "./shaders";

export type QualityTier = "orbit" | "deep";
export type CameraPose = "lejos" | "media" | "cerca";

export const CAMERA_POSES: readonly CameraPose[] = ["lejos", "media", "cerca"];

export interface SceneToggles {
  tier: QualityTier;
  pose: CameraPose;
  doppler: boolean;
  halo: boolean;
  lens: boolean;
  bloom: boolean;
}

export interface SceneHandle {
  setToggles(next: SceneToggles): void;
  resize(): void;
  dispose(): void;
  /** Línea completa de estado. Se relee, no se cachea: cambia con el tamaño y
   *  con el nivel. */
  readonly diagnostics: string;
  /** Resumen compacto de en qué condiciones se está renderizando AHORA. Se
   *  guarda junto a cada medición: unos fps sin resolución no significan nada. */
  readonly renderContext: string;
}

/**
 * Radios en unidades de radio de Schwarzschild (rs = 1).
 *
 * El borde interior del disco NO está en la ISCO de Schwarzschild (3 rs) sino
 * pegado a la esfera de fotones, a 1.58. Es deliberado: Gargantúa es un Kerr
 * casi extremo, cuya ISCO cae por debajo de 1 rs, y por eso en la película el
 * disco abraza la sombra. Se conserva la lente de Schwarzschild (barata y
 * simétrica) y se mueve el borde del disco; 1.58 sigue estando fuera de la
 * esfera de fotones (1.5), que es donde dejan de existir órbitas circulares.
 *
 * **Este número es el que decide si el anillo de fotones parece dibujado.** Un
 * pase de depuración (clasificando cada rayo en capturado / con impactos /
 * agotado) mostró que el aro que parecía un contorno era en realidad un anillo
 * de rayos que ESCAPAN SIN TOCAR EL DISCO: enrollan varias vueltas entre la
 * esfera de fotones y el borde interior, y todos esos cruces del plano caían
 * por dentro del disco, así que salían negros. No era falta de presupuesto de
 * pasos — no había ni un rayo agotado ahí.
 *
 * La aritmética lo confirma: la sombra aparente está en b = 2.598 y un borde en
 * r = R se ve en b = R/√(1 − 1/R). R = 2.35 → 2.98 (hueco de medio radio);
 * R = 1.95 → 2.76; R = 1.58 → 2.61, es decir, el borde del disco cae justo
 * sobre el borde de la sombra y el hueco desaparece.
 */
const DISK_INNER = 1.58;
const DISK_OUTER = 17;

/** Inclinación baja, como en las referencias: el disco casi de canto, su cara
 *  lejana subiendo por encima de la sombra. */
const CAMERA_ROLL = -0.12;

/**
 * Poses de cámara. Cada una es un encuadre completo (posición + campo de
 * visión), no un punto de una órbita: en G2 cada mundo tendrá la suya y se
 * llega por navegación, nunca arrastrando el ratón.
 *
 * Las tres NO buscan lo mismo, y por eso cada una lleva dos multiplicadores
 * propios. Son los ÚNICOS overrides por pose que existen: exposición y fuerza
 * de bloom. El material, la física y la geometría son idénticos en las tres —
 * `media` es la referencia maestra y las otras dos heredan su look.
 *
 * - `lejos`: plano de contexto. Ligeramente menos glow para que la silueta y el
 *   arco superior se lean limpios y el fondo no compita.
 * - `media`: plano maestro. Sin corrección: es el patrón contra el que se afinó
 *   todo lo demás.
 * - `cerca`: plano dramático. El disco ocupa el doble de cuadro, así que entra
 *   mucha más luz total; sin bajar exposición y glow, el lado que se acerca se
 *   convierte en una mancha blanca. Es corrección de encuadre, no de material.
 */
const POSES: Record<
  CameraPose,
  { position: THREE.Vector3; fov: number; exposure: number; bloom: number }
> = {
  lejos: {
    position: new THREE.Vector3(0, 3.1, 42),
    fov: 30,
    exposure: 1.02,
    bloom: 0.9,
  },
  media: {
    position: new THREE.Vector3(0, 2.6, 27),
    fov: 40,
    exposure: 1,
    bloom: 1,
  },
  cerca: {
    position: new THREE.Vector3(0, 1.5, 14),
    fov: 54,
    exposure: 0.9,
    bloom: 0.82,
  },
};

/**
 * Aspect de referencia con el que se afinaron las poses. En retrato el campo
 * HORIZONTAL se estrecha muchísimo (un móvil vertical tiene aspect ~0.49 contra
 * ~1.6 de un portátil) y sin compensar, la sombra llena la pantalla y parece un
 * zoom accidental. Se retrocede la cámara de forma acotada: el disco sigue
 * saliéndose por los lados, que es lo que se ve en las referencias, pero el
 * agujero cabe entero.
 */
const REFERENCE_ASPECT = 1.5;
const MAX_PORTRAIT_PULLBACK = 1.7;

/**
 * Presupuesto por nivel. Con un raymarcher las dos palancas reales son los
 * PÍXELES y los PASOS; ya no hay capas que apagar. Como no queda geometría, no
 * hay bordes que aliaseen y bajar el DPR sale casi gratis en calidad.
 */
const TIER: Record<
  QualityTier,
  { dpr: number; steps: number; stepScale: number }
> = {
  // `stepScale` es el ángulo objetivo por paso, en radianes (ver shaders.ts).
  orbit: { dpr: 1.0, steps: 190, stepScale: 0.14 },
  deep: { dpr: 1.35, steps: 340, stepScale: 0.085 },
};

/**
 * Peso en régimen del fotograma nuevo. 0.18 ≈ 8 muestras efectivas y una
 * ventana de ~90 ms: el disco gira tan despacio que ese promedio no se lee como
 * arrastre, se lee como grano fino de película.
 *
 * En régimen. Los primeros fotogramas tras un reinicio usan `1/(n+1)`, que es la
 * media aritmética exacta de lo visto hasta ahora: fotograma 1 al 100 %, el 2 al
 * 50 %, el 3 al 33 %… hasta cruzarse con 0.18 hacia el quinto. Con el peso fijo,
 * un cambio de pose entraba con una imagen de una sola muestra — con el anillo
 * de fotones punteado — y tardaba medio segundo en asentarse a la vista.
 *
 * **Y esta rampa es exactamente la primitiva que G3 necesita.** Durante una
 * transición la cámara se mueve y el historial deja de ser válido; degradar es
 * mantener el peso alto (poca memoria, poco arrastre) mientras dura el
 * movimiento y dejarlo caer a 0.18 al llegar. No hace falta reproyectar.
 */
const TEMPORAL_BLEND = 0.18;

/** Halton(2,3) recentrado en el píxel. Ocho términos bastan: más allá el
 *  historial ya está saturado y las muestras extra no se distinguen. */
const JITTER: readonly (readonly [number, number])[] = [
  [0.5, 0.333333],
  [0.25, 0.666667],
  [0.75, 0.111111],
  [0.125, 0.444444],
  [0.625, 0.777778],
  [0.375, 0.222222],
  [0.875, 0.555556],
  [0.0625, 0.888889],
].map(([x, y]) => [x - 0.5, y - 0.5] as const);

/** El bloom es el único post-proceso que queda, y es el que fabrica el
 *  envolvente incandescente. En `orbit` se calcula a la mitad de resolución. */
const BLOOM: Record<
  QualityTier,
  { strength: number; radius: number; scale: number }
> = {
  orbit: { strength: 0.5, radius: 0.34, scale: 0.5 },
  deep: { strength: 0.56, radius: 0.36, scale: 0.62 },
};

/** Exposición base de ACES, sobre la que actúa el multiplicador de cada pose. */
const BASE_EXPOSURE = 0.78;

/**
 * Umbral del bloom.
 *
 * Apagando el bloom se comprueba que la sombra es NEGRA PURA: el gris que se
 * veía dentro del horizonte no venía de la geodésica, venía enteramente de
 * aquí. Y no lo arreglaba el umbral — con un disco que llegaba a 28 en HDR,
 * subir el corte de 1 a 2.8 apenas le quitaba nada a una fuente tan intensa.
 *
 * Quien lo arregla de raíz es el rodillo de altas luces del shader: el pico
 * bajó de ~28 a ~3.7, así que lo que el bloom recoge por encima del umbral es
 * ahora un margen pequeño. Con el rango comprimido se puede subir la FUERZA y
 * tener por fin el halo cinematográfico sin volver a inundar el horizonte.
 */
const BLOOM_THRESHOLD = 2.0;

export function createGargantuaScene(
  canvas: HTMLCanvasElement,
  initial: SceneToggles,
  onFrame: (deltaMs: number) => void,
  onStatus: (message: string) => void,
): SceneHandle {
  let toggles = initial;
  const notes: string[] = [];

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: "high-performance",
    failIfMajorPerformanceCaveat: false,
  });
  renderer.setClearColor(0x000000, 1);
  // ACES comprime el HDR del disco. Con el composer three NO aplica tone mapping
  // al renderizar a render targets: lo hace OutputPass al final.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = BASE_EXPOSURE;

  const capabilities = renderer.capabilities;
  const gl = renderer.getContext();
  const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
  const gpuName = debugInfo
    ? ((gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string | null) ??
      "GPU desconocida")
    : "GPU oculta por el navegador";

  /**
   * El bloom necesita render targets de coma flotante. Varios Android exponen
   * WebGL2 pero no permiten renderizar a half-float, y ahí UnrealBloomPass falla
   * en el primer frame: la pantalla se queda intacta y el HUD congelado, que es
   * exactamente el síntoma de "se queda cargando".
   */
  const canFloatBloom =
    capabilities.isWebGL2 &&
    (gl.getExtension("EXT_color_buffer_half_float") !== null ||
      gl.getExtension("EXT_color_buffer_float") !== null);
  if (!canFloatBloom) notes.push("sin half-float → bloom apagado");

  // === La escena entera: un cuad =============================================
  // La cámara ortográfica solo existe porque three pide una; el shader no usa
  // ninguna de sus matrices, fabrica los rayos desde la base de `applyPose`.
  const marchScene = new THREE.Scene();
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadGeometry = new THREE.PlaneGeometry(2, 2);
  const material = new THREE.ShaderMaterial({
    vertexShader: GARGANTUA_VERTEX,
    fragmentShader: GARGANTUA_FRAGMENT,
    depthTest: false,
    depthWrite: false,
    // El número de pasos entra como constante de compilación: GLSL ES 1.00 no
    // garantiza bucles con cota dinámica, y además así el compilador puede
    // desenrollar. Cambiar de nivel reconstruye la escena, que es justo lo que
    // ya hacía el HUD.
    defines: { MAX_STEPS: TIER[toggles.tier].steps },
    uniforms: {
      uCamPos: { value: new THREE.Vector3() },
      uCamRight: { value: new THREE.Vector3(1, 0, 0) },
      uCamUp: { value: new THREE.Vector3(0, 1, 0) },
      uCamFwd: { value: new THREE.Vector3(0, 0, -1) },
      uTanHalfFov: { value: Math.tan((40 * Math.PI) / 360) },
      uAspect: { value: 1 },
      uTime: { value: 0 },
      uDiskInner: { value: DISK_INNER },
      uDiskOuter: { value: DISK_OUTER },
      uSkyRadius: { value: 60 },
      uStepScale: { value: TIER[toggles.tier].stepScale },
      uDoppler: { value: toggles.doppler ? 1 : 0 },
      uSecondary: { value: toggles.halo ? 1 : 0 },
      uSkyLens: { value: toggles.lens ? 1 : 0 },
      tHistory: { value: null },
      uJitter: { value: new THREE.Vector2() },
      uBlend: { value: 1 },
    },
  });
  marchScene.add(new THREE.Mesh(quadGeometry, material));

  // === Acumulación temporal ================================================
  // Sin coma flotante el historial se cuantizaría a 8 bits y la mezcla al 18 %
  // se comería el HDR del disco: en ese caso no se acumula, se dibuja directo.
  const canAccumulate = canFloatBloom;
  const targetOptions: THREE.RenderTargetOptions = {
    type: THREE.HalfFloatType,
    depthBuffer: false,
    stencilBuffer: false,
    // Se lee texel a texel en la misma rejilla: interpolar solo emborronaría.
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    generateMipmaps: false,
  };
  let historyRead = new THREE.WebGLRenderTarget(1, 1, targetOptions);
  let historyWrite = new THREE.WebGLRenderTarget(1, 1, targetOptions);

  const displayMaterial = new THREE.ShaderMaterial({
    vertexShader: GARGANTUA_VERTEX,
    fragmentShader: DISPLAY_FRAGMENT,
    depthTest: false,
    depthWrite: false,
    uniforms: { tHistory: { value: null } },
  });
  const displayScene = new THREE.Scene();
  displayScene.add(new THREE.Mesh(quadGeometry, displayMaterial));

  // === Cadena de post-proceso =============================================
  // EffectComposer usa half-float por defecto incluso cuando bloom está apagado.
  // En el fallback móvil hay que darle un target de 8 bits explícito o la escena
  // puede fallar antes de llegar al primer frame.
  const fallbackTarget = canFloatBloom
    ? undefined
    : new THREE.WebGLRenderTarget(1, 1, { type: THREE.UnsignedByteType });
  const composer = new EffectComposer(renderer, fallbackTarget);
  composer.addPass(
    new RenderPass(canAccumulate ? displayScene : marchScene, quadCamera),
  );

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(1, 1),
    BLOOM[toggles.tier].strength,
    BLOOM[toggles.tier].radius,
    BLOOM_THRESHOLD,
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const WORLD_UP = new THREE.Vector3(0, 1, 0);

  /**
   * Aplica una pose: posición, base ortonormal y campo de visión. La cámara es
   * fija DENTRO de cada pose, así que esto nunca se llama por frame ni desde un
   * gesto continuo.
   */
  function applyPose(pose: CameraPose, aspect: number) {
    const preset = POSES[pose];
    const pullback = Math.min(
      MAX_PORTRAIT_PULLBACK,
      Math.max(1, REFERENCE_ASPECT / Math.max(aspect, 0.05)),
    );
    const position = preset.position.clone().multiplyScalar(pullback);

    // Mirando al origen, con `up` mundial y después el roll aplicado sobre la
    // base ya construida.
    forward.copy(position).negate().normalize();
    right.crossVectors(forward, WORLD_UP).normalize();
    up.crossVectors(right, forward).normalize();

    const cos = Math.cos(CAMERA_ROLL);
    const sin = Math.sin(CAMERA_ROLL);
    const rolledRight = right
      .clone()
      .multiplyScalar(cos)
      .addScaledVector(up, sin);
    const rolledUp = up.clone().multiplyScalar(cos).addScaledVector(right, -sin);

    material.uniforms.uCamPos.value.copy(position);
    material.uniforms.uCamRight.value.copy(rolledRight);
    material.uniforms.uCamUp.value.copy(rolledUp);
    material.uniforms.uCamFwd.value.copy(forward);
    material.uniforms.uTanHalfFov.value = Math.tan(
      (preset.fov * Math.PI) / 360,
    );
    material.uniforms.uAspect.value = aspect;
    // El rayo "escapa" cuando se aleja lo bastante como para que lo que queda de
    // curvatura sea imperceptible. Atado a la distancia de la cámara: si el
    // radio fuese menor que ella, todo rayo escaparía en el primer paso.
    material.uniforms.uSkyRadius.value = Math.max(60, position.length() * 1.5);

    renderer.toneMappingExposure = BASE_EXPOSURE * preset.exposure;
  }

  /** Frames acumulados desde el último reinicio. El primero tras un cambio de
   *  pose o de tamaño se dibuja con peso 1: mezclar con un historial de otro
   *  encuadre dejaría un fantasma del anterior durante medio segundo. */
  let accumulated = 0;
  let pixelWidth = 1;
  let pixelHeight = 1;
  let diagnostics = "";

  /**
   * El HUD tenía dos cifras de DPR que parecían contradecirse: el selector
   * anunciaba el tope del nivel y el pie mostraba `window.devicePixelRatio`.
   * Ninguna era el DPR con el que se renderiza — ese es el mínimo de los dos —
   * y con dos números distintos en pantalla no se puede confiar en una medición.
   * Aquí se publican los tres, más la resolución real del búfer.
   */
  function updateDiagnostics(width: number, height: number, dpr: number) {
    diagnostics = [
      gpuName,
      capabilities.isWebGL2 ? "WebGL2" : "WebGL1",
      `DPR pedido ${TIER[toggles.tier].dpr.toFixed(2)} · pantalla ${(
        window.devicePixelRatio || 1
      ).toFixed(2)} · efectivo ${dpr.toFixed(2)}`,
      `render ${pixelWidth}×${pixelHeight}`,
      `css ${width}×${height}`,
      `${TIER[toggles.tier].steps} pasos`,
      canAccumulate ? "acumulación temporal ON" : "acumulación OFF",
      ...notes,
    ].join(" · ");
  }

  function resetAccumulation() {
    accumulated = 0;
  }

  function resize() {
    // En móvil el primer layout puede llegar después del primer frame: sin este
    // suelo el renderer se queda en 1×1 y la escena parece no cargar nunca.
    const width = Math.max(1, canvas.clientWidth || canvas.offsetWidth || 0);
    const height = Math.max(1, canvas.clientHeight || canvas.offsetHeight || 0);
    const dpr = Math.min(window.devicePixelRatio || 1, TIER[toggles.tier].dpr);

    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    composer.setPixelRatio(dpr);
    composer.setSize(width, height);

    pixelWidth = Math.max(1, Math.round(width * dpr));
    pixelHeight = Math.max(1, Math.round(height * dpr));
    historyRead.setSize(pixelWidth, pixelHeight);
    historyWrite.setSize(pixelWidth, pixelHeight);
    resetAccumulation();

    applyPose(toggles.pose, width / height);

    const bloomScale = BLOOM[toggles.tier].scale;
    const bloomWidth = Math.max(1, Math.round(width * dpr * bloomScale));
    const bloomHeight = Math.max(1, Math.round(height * dpr * bloomScale));
    bloomPass.resolution.set(bloomWidth, bloomHeight);
    bloomPass.setSize(bloomWidth, bloomHeight);
    bloomPass.strength =
      BLOOM[toggles.tier].strength * POSES[toggles.pose].bloom;
    bloomPass.radius = BLOOM[toggles.tier].radius;

    updateDiagnostics(width, height, dpr);
  }

  const clock = new THREE.Clock();
  let frameHandle = 0;
  let disposed = false;
  let lastWidth = 0;
  let lastHeight = 0;

  function renderFrame() {
    if (disposed) return;
    frameHandle = requestAnimationFrame(renderFrame);
    const delta = clock.getDelta();

    // El contenedor puede cambiar de tamaño sin disparar `resize` (la barra de
    // direcciones del móvil al aparecer y desaparecer, sobre todo).
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width !== lastWidth || height !== lastHeight) {
      lastWidth = width;
      lastHeight = height;
      resize();
    }

    material.uniforms.uTime.value = clock.elapsedTime;

    try {
      if (canAccumulate) {
        const [jx, jy] = JITTER[accumulated % JITTER.length];
        material.uniforms.uJitter.value.set(jx / pixelWidth, jy / pixelHeight);
        material.uniforms.uBlend.value = Math.max(
          TEMPORAL_BLEND,
          1 / (accumulated + 1),
        );
        material.uniforms.tHistory.value = historyRead.texture;

        renderer.setRenderTarget(historyWrite);
        renderer.render(marchScene, quadCamera);
        renderer.setRenderTarget(null);

        const swap = historyRead;
        historyRead = historyWrite;
        historyWrite = swap;
        displayMaterial.uniforms.tHistory.value = historyRead.texture;
        accumulated += 1;
      }
      composer.render(delta);
    } catch (error) {
      // Sin esto, una excepción en el primer frame deja la pantalla intacta y el
      // HUD congelado en "midiendo…" — indistinguible de una carga infinita.
      cancelAnimationFrame(frameHandle);
      frameHandle = 0;
      disposed = true;
      onStatus(
        `ERROR en el bucle: ${error instanceof Error ? error.message : String(error)}`,
      );
      return;
    }

    onFrame(delta * 1000);
  }

  function handleVisibility() {
    // Pausa total en segundo plano (§8), y evita que las mediciones traguen
    // frames de una pestaña oculta.
    if (document.hidden) {
      if (frameHandle) cancelAnimationFrame(frameHandle);
      frameHandle = 0;
    } else if (!frameHandle && !disposed) {
      clock.getDelta();
      // El reloj siguió corriendo: el disco está en otro sitio y el historial
      // pertenece a otro instante.
      resetAccumulation();
      frameHandle = requestAnimationFrame(renderFrame);
    }
  }

  function handleContextLost(event: Event) {
    event.preventDefault();
    disposed = true;
    if (frameHandle) cancelAnimationFrame(frameHandle);
    frameHandle = 0;
    onStatus("El navegador perdió el contexto WebGL (memoria de GPU agotada).");
  }

  document.addEventListener("visibilitychange", handleVisibility);
  canvas.addEventListener("webglcontextlost", handleContextLost);

  bloomPass.enabled = toggles.bloom && canFloatBloom;
  resize();
  lastWidth = canvas.clientWidth;
  lastHeight = canvas.clientHeight;
  frameHandle = requestAnimationFrame(renderFrame);

  return {
    get diagnostics() {
      return diagnostics;
    },
    get renderContext() {
      return `${pixelWidth}×${pixelHeight} px · DPR efectivo ${Math.min(
        window.devicePixelRatio || 1,
        TIER[toggles.tier].dpr,
      ).toFixed(2)} · ${TIER[toggles.tier].steps} pasos · ${toggles.tier} · ${
        toggles.pose
      }`;
    },
    resize,
    setToggles(next) {
      const tierChanged = next.tier !== toggles.tier;
      const poseChanged = next.pose !== toggles.pose;
      toggles = next;
      material.uniforms.uDoppler.value = next.doppler ? 1 : 0;
      material.uniforms.uSecondary.value = next.halo ? 1 : 0;
      material.uniforms.uSkyLens.value = next.lens ? 1 : 0;
      bloomPass.enabled = next.bloom && canFloatBloom;
      if (tierChanged || poseChanged) resize();
      // Apagar una capa cambia la imagen entera: sin reinicio, el historial la
      // arrastraría durante medio segundo y la captura de pantalla mentiría.
      else resetAccumulation();
    },
    dispose() {
      disposed = true;
      if (frameHandle) cancelAnimationFrame(frameHandle);
      document.removeEventListener("visibilitychange", handleVisibility);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      // Teardown real, no "dejar de dibujar" (§8).
      quadGeometry.dispose();
      material.dispose();
      displayMaterial.dispose();
      historyRead.dispose();
      historyWrite.dispose();
      fallbackTarget?.dispose();
      bloomPass.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
