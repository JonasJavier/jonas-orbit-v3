import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import type { WorldId } from "@/content/worlds.data";
import type { CameraPose } from "@/lib/scene-poses";
import {
  DISPLAY_FRAGMENT,
  GARGANTUA_FRAGMENT,
  GARGANTUA_VERTEX,
} from "./gargantua-shaders";
import { createBody, disposeBody, type SceneBody, type SceneBodyInput } from "./bodies";

/**
 * El Sistema Gargantúa.
 *
 * Cadena de render, en orden:
 *
 *   raymarch de geodésicas → acumulación temporal → cuerpos → bloom → ACES
 *
 * Los tres primeros pasos son independientes y esa separación es deliberada.
 * El raymarch se acumula en el tiempo porque la cámara es fija y el píxel de
 * ayer es el mismo píxel de hoy; los cuerpos NO pueden acumularse porque se
 * mueven, y mezclados con su historial dejarían estela. Dibujarlos después de
 * la acumulación resuelve las dos cosas a la vez.
 *
 * three.js puro, sin react-three-fiber: el bucle de render no compite con el
 * reconciliador y el presupuesto de JS no paga un integrador que no usamos.
 */

export type QualityTier = "orbit" | "deep";

export interface ProjectedBody {
  id: WorldId;
  /** Posición en píxeles CSS dentro del canvas. */
  x: number;
  y: number;
  /** Radio aparente en píxeles CSS: el blanco de clic se dimensiona con esto. */
  radius: number;
  /** Distancia a la cámara, para ordenar etiquetas que se solapen. */
  depth: number;
  /** Falso cuando el cuerpo cae fuera del cuadro (no debería pasar nunca). */
  visible: boolean;
  /**
   * A qué lado del marcador va el texto. Cerca del borde derecho la etiqueta se
   * pasa al otro lado en vez de salirse: el sistema es un ring alrededor de
   * Gargantúa y Gargantúa vive en el tercio derecho, así que sus cuerpos rozan
   * ese borde por diseño.
   */
  side: "left" | "right";
}

export interface SceneHandle {
  setPose(pose: CameraPose): void;
  setFocus(id: WorldId | null): void;
  /** Paralaje aditivo del puntero, en el rango −1..1. */
  setParallax(x: number, y: number): void;
  resize(): void;
  dispose(): void;
  readonly diagnostics: string;
}

export interface SceneOptions {
  canvas: HTMLCanvasElement;
  tier: QualityTier;
  pose: CameraPose;
  bodies: readonly SceneBodyInput[];
  /** Se llama en cada frame con las 7 posiciones proyectadas. */
  onProject(projected: readonly ProjectedBody[]): void;
  /** La escena se rindió: hay que caer al nivel `flat`. */
  onFailure(reason: string): void;
}

/** Radios del disco, en rs. Deben coincidir con el shader. */
const DISK_INNER = 1.58;
const DISK_OUTER = 17;

/** Presupuesto por nivel: las dos palancas de un raymarcher son píxeles y pasos. */
const TIER: Record<QualityTier, { dpr: number; steps: number; stepScale: number }> = {
  orbit: { dpr: 1.0, steps: 190, stepScale: 0.14 },
  deep: { dpr: 1.35, steps: 340, stepScale: 0.085 },
};

const BLOOM: Record<QualityTier, { strength: number; radius: number; scale: number }> = {
  orbit: { strength: 0.5, radius: 0.34, scale: 0.5 },
  deep: { strength: 0.56, radius: 0.36, scale: 0.62 },
};

const BASE_EXPOSURE = 0.78;
const BLOOM_THRESHOLD = 2.0;
const TEMPORAL_BLEND = 0.18;

/** Halton(2,3) recentrado en el píxel. */
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

/**
 * Periodo orbital del cuerpo más interior, en segundos. El resto sale de la
 * tercera ley de Kepler (T ∝ r^1.5), así que el sistema se mueve como un
 * sistema: lo de dentro corre, lo de fuera se arrastra.
 *
 * Deliberadamente enorme. «Órbitas lentas de verdad» significa que en la visita
 * típica un cuerpo recorre una fracción pequeña de su vuelta: la escena está
 * viva, no agitada.
 */
const INNER_PERIOD_S = 210;

/** Paralaje máximo del puntero. §3 lo acota a 2°, y ese es el techo duro. */
const MAX_PARALLAX_DEG = 2;

/**
 * Margen alrededor del sistema al encuadrar, en rs.
 *
 * No es estético: cada cuerpo arrastra una etiqueta de un par de centenares de
 * píxeles y el encuadre solo sabe de radios. Con el margen justo, un destino
 * queda dentro pero su nombre se sale.
 *
 * Bajó de 11 a 6 al encoger los cuerpos: menos margen es menos distancia de
 * cámara, y menos distancia es un Gargantúa más grande en cuadro. Las etiquetas
 * que rozan el borde ya no se salen porque se pasan al otro lado del marcador.
 */
const FRAME_MARGIN = 6;

/** Cuando la escena está congelada (páginas de mundo) basta con refrescar de
 *  vez en cuando: no se puede dejar de dibujar del todo porque el navegador
 *  puede descartar el búfer, pero 4 fps de un cuadro inmóvil no cuesta nada. */
const FROZEN_FRAME_MS = 250;

const WORLD_UP = new THREE.Vector3(0, 1, 0);

/** Posición de un cuerpo en su órbita para un instante dado. Pura. */
function orbitalPosition(
  placement: SceneBodyInput["placement"],
  seconds: number,
  target: THREE.Vector3,
): THREE.Vector3 {
  const { orbitRadius, phase, inclination } = placement;
  if (orbitRadius === 0) return target.set(0, 0, 0);

  const innerRadius = 25;
  const period = INNER_PERIOD_S * Math.pow(orbitRadius / innerRadius, 1.5);
  const angle = (phase * Math.PI) / 180 + (seconds / period) * Math.PI * 2;

  // Punto en el plano de la órbita, inclinado respecto del disco.
  //
  // Las siete órbitas comparten línea de nodos a propósito. El primer intento
  // giraba cada plano por su propia fase, y la trigonometría lo castigó: con
  // node = φ, la coordenada x sale r·(cos²φ + sen²φ·cos i), que es POSITIVA
  // para cualquier fase. Los siete cuerpos arrancaban apiñados en el mismo lado
  // del agujero negro. Compartiendo nodo, la fase vuelve a decidir de verdad
  // dónde está cada uno y el sistema se abre a los dos lados.
  const inc = (inclination * Math.PI) / 180;
  const z = Math.sin(angle) * orbitRadius;

  return target.set(
    Math.cos(angle) * orbitRadius,
    -z * Math.sin(inc),
    z * Math.cos(inc),
  );
}

export function createSystemScene(options: SceneOptions): SceneHandle {
  const { canvas, onProject, onFailure } = options;
  // El nivel es inmutable dentro de una escena: cambiarlo altera la densidad de
  // la malla y las constantes de compilación del shader, así que degradar
  // significa destruir esta escena y crear otra. Es lo que hace `onFailure`.
  const tier = options.tier;
  let pose = options.pose;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: "high-performance",
    failIfMajorPerformanceCaveat: false,
  });
  renderer.setClearColor(0x000000, 1);
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
   * Varios Android exponen WebGL2 pero no dejan renderizar a half-float, y ahí
   * el bloom falla en el primer frame: la pantalla se queda intacta. Es
   * exactamente el síntoma de «se queda cargando».
   */
  const canFloat =
    capabilities.isWebGL2 &&
    (gl.getExtension("EXT_color_buffer_half_float") !== null ||
      gl.getExtension("EXT_color_buffer_float") !== null);

  // === Gargantúa: un cuad de pantalla completa ==============================
  const marchScene = new THREE.Scene();
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadGeometry = new THREE.PlaneGeometry(2, 2);
  const marchMaterial = new THREE.ShaderMaterial({
    vertexShader: GARGANTUA_VERTEX,
    fragmentShader: GARGANTUA_FRAGMENT,
    depthTest: false,
    depthWrite: false,
    defines: { MAX_STEPS: 1 }, // DEBUG TEMPORAL — revertir a TIER[tier].steps
    uniforms: {
      uCamPos: { value: new THREE.Vector3() },
      uCamRight: { value: new THREE.Vector3(1, 0, 0) },
      uCamUp: { value: new THREE.Vector3(0, 1, 0) },
      uCamFwd: { value: new THREE.Vector3(0, 0, -1) },
      uTanHalfFov: { value: Math.tan((pose.fov * Math.PI) / 360) },
      uAspect: { value: 1 },
      uTime: { value: 0 },
      uDiskInner: { value: DISK_INNER },
      uDiskOuter: { value: DISK_OUTER },
      uSkyRadius: { value: 60 },
      uStepScale: { value: TIER[tier].stepScale },
      uDoppler: { value: 1 },
      uSecondary: { value: 1 },
      uSkyLens: { value: 1 },
      tHistory: { value: null },
      uJitter: { value: new THREE.Vector2() },
      uBlend: { value: 1 },
    },
  });
  marchScene.add(new THREE.Mesh(quadGeometry, marchMaterial));

  // === Acumulación temporal ================================================
  const canAccumulate = canFloat;
  const targetOptions: THREE.RenderTargetOptions = {
    type: THREE.HalfFloatType,
    depthBuffer: false,
    stencilBuffer: false,
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

  // === Los cuerpos =========================================================
  const bodyScene = new THREE.Scene();
  const bodyCamera = new THREE.PerspectiveCamera(pose.fov, 1, 1, 4000);
  const bodies: SceneBody[] = [];
  /** Gargantúa no tiene malla pero sí blanco de clic: se proyecta el origen. */
  const centreIds: WorldId[] = [];
  const centreRadii = new Map<WorldId, number>();

  for (const input of options.bodies) {
    const body = createBody(input);
    if (body) {
      bodies.push(body);
      bodyScene.add(body.mesh);
    } else {
      centreIds.push(input.id);
      centreRadii.set(input.id, input.placement.size);
    }
  }

  // === Post-proceso ========================================================
  const fallbackTarget = canFloat
    ? undefined
    : new THREE.WebGLRenderTarget(1, 1, { type: THREE.UnsignedByteType });
  const composer = new EffectComposer(renderer, fallbackTarget);
  composer.addPass(new RenderPass(canAccumulate ? displayScene : marchScene, quadCamera));

  // Los cuerpos entran en la MISMA cadena, encima del raymarch y antes del
  // bloom: así el glow envuelve también a los planetas y no se ven pegados.
  const bodyPass = new RenderPass(bodyScene, bodyCamera);
  bodyPass.clear = false;
  composer.addPass(bodyPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(1, 1),
    BLOOM[tier].strength,
    BLOOM[tier].radius,
    BLOOM_THRESHOLD,
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  // === Cámara ==============================================================
  const cameraPosition = new THREE.Vector3();
  const cameraTarget = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const rolledRight = new THREE.Vector3();
  const rolledUp = new THREE.Vector3();
  const scratch = new THREE.Vector3();
  const basis = new THREE.Matrix4();

  let parallaxX = 0;
  let parallaxY = 0;
  let frameDistance = 120;
  let cssWidth = 1;
  let cssHeight = 1;
  let pixelWidth = 1;
  let pixelHeight = 1;

  /**
   * Distancia mínima a la que TODO el sistema cabe en el viewport actual.
   *
   * Se mide de verdad: se muestrea cada órbita y se proyecta sobre los ejes de
   * la cámara. Podría haber sido una tabla de distancias por tamaño de pantalla,
   * pero entonces cambiar el radio de una órbita en `worlds.data.ts` sacaría un
   * destino de cuadro sin que nadie se enterara. Así el dato manda y el encuadre
   * obedece.
   */
  function measureFrameDistance(aspect: number): number {
    const elevation = (pose.elevation * Math.PI) / 180;
    const azimuth = (pose.azimuth * Math.PI) / 180;

    // Base de la cámara mirando al origen, sin roll: solo hace falta para medir.
    const dir = new THREE.Vector3(
      Math.cos(elevation) * Math.sin(azimuth),
      Math.sin(elevation),
      Math.cos(elevation) * Math.cos(azimuth),
    );
    const f = dir.clone().negate();
    const r = new THREE.Vector3().crossVectors(f, WORLD_UP).normalize();
    const u = new THREE.Vector3().crossVectors(r, f).normalize();

    let extentX = DISK_OUTER;
    let extentY = DISK_OUTER * 0.25;
    const point = new THREE.Vector3();

    for (const body of bodies) {
      // 48 muestras por órbita: el error de una elipse muestreada así es muy
      // inferior al margen, y esto solo corre al redimensionar.
      for (let i = 0; i < 48; i++) {
        const seconds =
          (i / 48) *
          INNER_PERIOD_S *
          Math.pow(body.placement.orbitRadius / 25, 1.5);
        orbitalPosition(body.placement, seconds, point);
        extentX = Math.max(extentX, Math.abs(point.dot(r)) + body.radius);
        extentY = Math.max(extentY, Math.abs(point.dot(u)) + body.radius);
      }
    }

    extentX += FRAME_MARGIN;
    extentY += FRAME_MARGIN;

    const tanHalfFov = Math.tan((pose.fov * Math.PI) / 360);
    // El corrimiento lateral se come parte del semiancho: hay que pedir más.
    const neededHalfWidth = extentX / (1 - pose.targetShiftFraction);
    return Math.max(
      extentY / tanHalfFov,
      neededHalfWidth / (tanHalfFov * Math.max(aspect, 0.2)),
    );
  }

  function applyPose(aspect: number) {
    const elevation = ((pose.elevation + parallaxY * MAX_PARALLAX_DEG) * Math.PI) / 180;
    const azimuth = ((pose.azimuth + parallaxX * MAX_PARALLAX_DEG) * Math.PI) / 180;

    frameDistance = measureFrameDistance(aspect) * pose.distanceScale;

    cameraPosition.set(
      Math.cos(elevation) * Math.sin(azimuth),
      Math.sin(elevation),
      Math.cos(elevation) * Math.cos(azimuth),
    ).multiplyScalar(frameDistance);

    // Base mirando al origen, para saber hacia dónde corremos la mirada.
    forward.copy(cameraPosition).negate().normalize();
    right.crossVectors(forward, WORLD_UP).normalize();

    const tanHalfFov = Math.tan((pose.fov * Math.PI) / 360);
    const halfWidth = frameDistance * tanHalfFov * aspect;
    // Mirar a la IZQUIERDA del agujero negro lo empuja a la derecha del cuadro.
    cameraTarget.copy(right).multiplyScalar(-halfWidth * pose.targetShiftFraction);

    // Base definitiva, ya con la mirada corrida.
    forward.copy(cameraTarget).sub(cameraPosition).normalize();
    right.crossVectors(forward, WORLD_UP).normalize();
    up.crossVectors(right, forward).normalize();

    const cos = Math.cos(pose.roll);
    const sin = Math.sin(pose.roll);
    rolledRight.copy(right).multiplyScalar(cos).addScaledVector(up, sin);
    rolledUp.copy(up).multiplyScalar(cos).addScaledVector(right, -sin);

    marchMaterial.uniforms.uCamPos.value.copy(cameraPosition);
    marchMaterial.uniforms.uCamRight.value.copy(rolledRight);
    marchMaterial.uniforms.uCamUp.value.copy(rolledUp);
    marchMaterial.uniforms.uCamFwd.value.copy(forward);
    marchMaterial.uniforms.uTanHalfFov.value = tanHalfFov;
    marchMaterial.uniforms.uAspect.value = aspect;
    marchMaterial.uniforms.uSkyRadius.value = Math.max(60, frameDistance * 1.5);

    // La cámara de los cuerpos usa EXACTAMENTE la misma base que los rayos del
    // shader. Construirla con lookAt daría un roll distinto y los planetas se
    // desalinearían del disco: se copia la base a mano.
    bodyCamera.position.copy(cameraPosition);
    basis.makeBasis(rolledRight, rolledUp, scratch.copy(forward).negate());
    bodyCamera.quaternion.setFromRotationMatrix(basis);
    bodyCamera.fov = pose.fov;
    bodyCamera.aspect = aspect;
    bodyCamera.near = Math.max(0.1, frameDistance * 0.02);
    bodyCamera.far = frameDistance * 4;
    bodyCamera.updateProjectionMatrix();
    bodyCamera.updateMatrixWorld();

    renderer.toneMappingExposure = BASE_EXPOSURE * pose.exposure;
    bloomPass.strength = BLOOM[tier].strength * pose.bloom;
  }

  let accumulated = 0;
  function resetAccumulation() {
    accumulated = 0;
  }

  function resize() {
    const width = Math.max(1, canvas.clientWidth || canvas.offsetWidth || 0);
    const height = Math.max(1, canvas.clientHeight || canvas.offsetHeight || 0);
    const dpr = Math.min(window.devicePixelRatio || 1, TIER[tier].dpr);

    cssWidth = width;
    cssHeight = height;

    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    composer.setPixelRatio(dpr);
    composer.setSize(width, height);

    pixelWidth = Math.max(1, Math.round(width * dpr));
    pixelHeight = Math.max(1, Math.round(height * dpr));
    historyRead.setSize(pixelWidth, pixelHeight);
    historyWrite.setSize(pixelWidth, pixelHeight);
    resetAccumulation();

    applyPose(width / height);

    const scale = BLOOM[tier].scale;
    const bloomWidth = Math.max(1, Math.round(width * dpr * scale));
    const bloomHeight = Math.max(1, Math.round(height * dpr * scale));
    bloomPass.resolution.set(bloomWidth, bloomHeight);
    bloomPass.setSize(bloomWidth, bloomHeight);
    bloomPass.radius = BLOOM[tier].radius;
  }

  // === Bucle ===============================================================
  const clock = new THREE.Clock();
  const projected: ProjectedBody[] = [];
  const projectionScratch = new THREE.Vector3();
  let frameHandle = 0;
  let disposed = false;
  let lastWidth = 0;
  let lastHeight = 0;
  let lastFrozenDraw = 0;
  /**
   * El paso de animación va por TIEMPO REAL, no por frame (§8). Degradar a
   * 30 fps no ralentiza el sistema: solo lo dibuja con menos muestras.
   */
  let elapsed = 0;

  function project(body: {
    id: WorldId;
    position: THREE.Vector3;
    radius: number;
  }): ProjectedBody {
    projectionScratch.copy(body.position).project(bodyCamera);
    const x = (projectionScratch.x * 0.5 + 0.5) * cssWidth;
    const y = (-projectionScratch.y * 0.5 + 0.5) * cssHeight;

    // Radio aparente REAL, sin suelo.
    //
    // Antes llevaba un mínimo de 22 px para garantizar el blanco de clic, y eso
    // mezclaba dos cosas que no son la misma: cuánto MIDE el cuerpo y cuánto
    // hay que poder PULSAR. Con cuerpos pequeños el suelo ganaba siempre, así
    // que los siete marcadores salían del mismo tamaño y el anillo flotaba
    // alrededor de un punto. El tamaño del blanco lo resuelve el CSS con
    // relleno; aquí se dice la verdad sobre el cuerpo.
    const distance = cameraPosition.distanceTo(body.position);
    const tanHalfFov = Math.tan((pose.fov * Math.PI) / 360);
    const radius =
      (body.radius / Math.max(distance, 1)) * (cssHeight / (2 * tanHalfFov));

    return {
      id: body.id,
      x,
      y,
      radius,
      depth: projectionScratch.z,
      visible:
        projectionScratch.z < 1 &&
        x > 0 &&
        x < cssWidth &&
        y > 0 &&
        y < cssHeight,
      side: x > cssWidth * 0.62 ? "left" : "right",
    };
  }

  function updateBodies(seconds: number) {
    const position = new THREE.Vector3();
    projected.length = 0;

    for (const body of bodies) {
      orbitalPosition(body.placement, seconds, position);
      body.mesh.position.copy(position);
      body.mesh.rotateY(body.spin * 0.016);

      const uniforms = body.material.uniforms;
      uniforms.uTime.value = seconds;
      uniforms.uCamPos.value.copy(cameraPosition);
      // La luz cae con la distancia al disco, que es la única fuente que hay.
      uniforms.uLightIntensity.value = Math.min(
        1.6,
        (30 / Math.max(body.placement.orbitRadius, 1)) * 1.15,
      );

      projected.push(project({ id: body.id, position, radius: body.radius }));
    }

    for (const id of centreIds) {
      const body = project({
        id,
        position: position.set(0, 0, 0),
        radius: centreRadii.get(id) ?? 2.6,
      });
      // La etiqueta de Gargantúa baja hasta despejar el DISCO, no la sombra.
      //
      // El primer intento usaba 1.75 veces el radio de la sombra, y se quedaba
      // corto por un factor grande: la sombra mide 2.6 rs pero el disco llega a
      // 17, así que la etiqueta seguía cayendo sobre la parte más brillante del
      // cuadro y chocando con los cuerpos que cruzan por ahí. El disco visto casi
      // de canto ocupa en vertical del orden de tres radios de sombra.
      body.y += body.radius * 3.4;
      projected.push(body);
    }

    onProject(projected);
  }

  function renderFrame() {
    if (disposed) return;
    frameHandle = requestAnimationFrame(renderFrame);

    const delta = clock.getDelta();
    const now = performance.now();

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width !== lastWidth || height !== lastHeight) {
      lastWidth = width;
      lastHeight = height;
      resize();
    }

    if (pose.animated) {
      elapsed += delta;
    } else {
      // Congelada: se mantiene el cuadro pero no se gasta GPU en repetirlo.
      if (accumulated > JITTER.length * 2 && now - lastFrozenDraw < FROZEN_FRAME_MS) {
        return;
      }
      lastFrozenDraw = now;
    }

    marchMaterial.uniforms.uTime.value = elapsed;
    updateBodies(elapsed);

    try {
      if (canAccumulate) {
        const [jx, jy] = JITTER[accumulated % JITTER.length];
        marchMaterial.uniforms.uJitter.value.set(jx / pixelWidth, jy / pixelHeight);
        marchMaterial.uniforms.uBlend.value = Math.max(
          TEMPORAL_BLEND,
          1 / (accumulated + 1),
        );
        marchMaterial.uniforms.tHistory.value = historyRead.texture;

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
      cancelAnimationFrame(frameHandle);
      frameHandle = 0;
      disposed = true;
      onFailure(error instanceof Error ? error.message : String(error));
      return;
    }
  }

  function handleVisibility() {
    if (document.hidden) {
      if (frameHandle) cancelAnimationFrame(frameHandle);
      frameHandle = 0;
    } else if (!frameHandle && !disposed) {
      clock.getDelta();
      resetAccumulation();
      frameHandle = requestAnimationFrame(renderFrame);
    }
  }

  function handleContextLost(event: Event) {
    event.preventDefault();
    disposed = true;
    if (frameHandle) cancelAnimationFrame(frameHandle);
    frameHandle = 0;
    onFailure("el navegador perdió el contexto WebGL");
  }

  document.addEventListener("visibilitychange", handleVisibility);
  canvas.addEventListener("webglcontextlost", handleContextLost);

  bloomPass.enabled = canFloat;
  resize();
  lastWidth = canvas.clientWidth;
  lastHeight = canvas.clientHeight;
  frameHandle = requestAnimationFrame(renderFrame);

  return {
    get diagnostics() {
      return [
        gpuName,
        capabilities.isWebGL2 ? "WebGL2" : "WebGL1",
        `${pixelWidth}×${pixelHeight}`,
        `${TIER[tier].steps} pasos`,
        `distancia ${frameDistance.toFixed(0)} rs`,
        canAccumulate ? "acumulación ON" : "acumulación OFF",
      ].join(" · ");
    },
    setPose(next) {
      const wasAnimated = pose.animated;
      pose = next;
      applyPose(cssWidth / cssHeight);
      resetAccumulation();
      // Al volver a una pose animada hay que reanimar el bucle si estaba en
      // modo congelado y se había quedado esperando el próximo refresco.
      if (!wasAnimated && next.animated) lastFrozenDraw = 0;
    },
    setFocus(id) {
      for (const body of bodies) {
        body.material.uniforms.uFocus.value = body.id === id ? 1 : 0;
      }
    },
    setParallax(x, y) {
      if (!pose.animated) return;
      parallaxX = Math.max(-1, Math.min(1, x));
      parallaxY = Math.max(-1, Math.min(1, y));
      applyPose(cssWidth / cssHeight);
      // El historial pertenece a otro encuadre: mezclarlo dejaría un fantasma.
      resetAccumulation();
    },
    resize,
    dispose() {
      disposed = true;
      if (frameHandle) cancelAnimationFrame(frameHandle);
      document.removeEventListener("visibilitychange", handleVisibility);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      // Teardown real, no «dejar de dibujar» (§8).
      for (const body of bodies) disposeBody(body);
      quadGeometry.dispose();
      marchMaterial.dispose();
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
