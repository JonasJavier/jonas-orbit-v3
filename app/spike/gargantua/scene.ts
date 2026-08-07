/**
 * G0 · Escena del spike de Gargantúa — CÓDIGO DESECHABLE.
 *
 * three.js puro, sin React, para que el bucle de render no compita con el
 * reconciliador y las mediciones sean limpias. Responde una sola pregunta:
 * ¿esto lee como la película a 60 fps en un móvil de gama media?
 * (docs/plans/sistema-gargantua.md §9, gate de G0.)
 *
 * La cámara es FIJA a propósito: es el contrato de §3 y es lo que hace barato el
 * realismo. Hay varias POSES entre las que se conmuta — que es exactamente el
 * modelo de G2, `cameraPose = f(ruta)` — pero ninguna es orbitable.
 *
 * Cadena de render (EffectComposer, todo dentro de `three` — cero dependencias
 * nuevas):
 *
 *   fondo (nebulosa + estrellas) → distorsión gravitacional [deep]
 *      → disco + sombra + halo   → bloom → tone mapping ACES
 *
 * Las dos piezas que hacen que se parezca a la película no son geometría: son el
 * HDR del disco y el bloom. El envolvente blanco de las referencias es glow.
 */
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import {
  DISK_FRAGMENT,
  DISK_VERTEX,
  HALO_FRAGMENT,
  HALO_VERTEX,
  LENS_FRAGMENT,
  LENS_VERTEX,
  NEBULA_FRAGMENT,
  NEBULA_VERTEX,
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
  readonly diagnostics: string;
}

/**
 * Radios en unidades de radio de Schwarzschild (Rs).
 *
 * SHADOW = 2.6 porque la sombra APARENTE de un agujero negro es sqrt(27)/2 Rs,
 * no 1 Rs: la luz que pasa más cerca no escapa. Dibujar la esfera al radio del
 * horizonte dejaba un hueco negro inexplicable entre ella y el anillo. El disco
 * empieza en la ISCO (3 Rs).
 */
const SHADOW = 2.6;
const DISK_INNER = 3.15;
const DISK_OUTER = 14;
const HALO_HALF_SIZE = 7;

/**
 * Poses de cámara. Cada una es un encuadre completo (posición + campo de visión
 * + fuerza de lente), no un punto de una órbita: en G2 cada mundo tendrá la
 * suya y se llega por navegación, nunca arrastrando el ratón.
 */
const POSES: Record<
  CameraPose,
  { position: THREE.Vector3; fov: number; lens: number }
> = {
  // Panorámica: el sistema entero, el disco casi de canto.
  lejos: { position: new THREE.Vector3(0, 3.4, 34), fov: 34, lens: 0.0024 },
  // El encuadre de la película.
  media: { position: new THREE.Vector3(0, 1.6, 20), fov: 40, lens: 0.0032 },
  // Aproximación: la sombra domina el cuadro y la curvatura se aprecia de verdad.
  cerca: { position: new THREE.Vector3(0, 0.85, 11), fov: 52, lens: 0.0045 },
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
const MAX_PORTRAIT_PULLBACK = 1.9;

/** Topes de DPR por nivel (§5). Sin esto un móvil con DPR 3 renderiza 9 veces
 *  los píxeles necesarios y la medición no dice nada útil. */
const DPR_CAP: Record<QualityTier, number> = { orbit: 1.15, deep: 1.75 };

/** El bloom es el efecto caro de la cadena, así que es lo que más se separa
 *  entre niveles: en `orbit` se calcula a la mitad de resolución. */
const BLOOM: Record<
  QualityTier,
  { strength: number; radius: number; scale: number }
> = {
  orbit: { strength: 0.42, radius: 0.22, scale: 0.5 },
  deep: { strength: 0.5, radius: 0.28, scale: 1 },
};

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
  renderer.toneMappingExposure = 0.82;

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
    gl.getExtension("EXT_color_buffer_half_float") !== null;
  if (!canFloatBloom) notes.push("sin half-float → bloom apagado");

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 900);

  // === Escena de fondo (se distorsiona) ====================================
  const backdrop = new THREE.Scene();

  const nebulaGeometry = new THREE.SphereGeometry(400, 32, 24);
  const nebulaMaterial = new THREE.ShaderMaterial({
    vertexShader: NEBULA_VERTEX,
    fragmentShader: NEBULA_FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uIntensity: { value: 0.34 } },
  });
  backdrop.add(new THREE.Mesh(nebulaGeometry, nebulaMaterial));

  const starCount = 3600;
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const direction = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
    );
    if (direction.lengthSq() < 1e-6) direction.set(0, 0, 1);
    direction.normalize().multiplyScalar(200 + Math.random() * 120);
    starPositions.set([direction.x, direction.y, direction.z], i * 3);
    // Unas pocas muy brillantes alimentan el bloom y dan profundidad; un campo
    // uniforme se lee como ruido.
    const brightness = Math.pow(Math.random(), 3) * 1.4 + 0.15;
    starColors.set([brightness, brightness * 0.95, brightness * 0.88], i * 3);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(starPositions, 3),
  );
  starGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
  const starMaterial = new THREE.PointsMaterial({
    size: 0.9,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  backdrop.add(new THREE.Points(starGeometry, starMaterial));

  // === Escena principal (NO se distorsiona) ================================
  const scene = new THREE.Scene();

  // Sombra aparente. Opaca: three dibuja los opacos antes que los transparentes,
  // así que ocluye correctamente la mitad lejana del disco.
  const shadowGeometry = new THREE.SphereGeometry(SHADOW, 64, 48);
  const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  scene.add(new THREE.Mesh(shadowGeometry, shadowMaterial));

  const diskGeometry = new THREE.RingGeometry(
    DISK_INNER,
    DISK_OUTER,
    toggles.tier === "deep" ? 256 : 144,
    toggles.tier === "deep" ? 64 : 32,
  );
  const diskMaterial = new THREE.ShaderMaterial({
    vertexShader: DISK_VERTEX,
    fragmentShader: DISK_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uInner: { value: DISK_INNER },
      uOuter: { value: DISK_OUTER },
      uCamLocal: { value: new THREE.Vector3() },
      uBeta: { value: 0.44 },
      uBrightness: { value: 1 },
      uDoppler: { value: toggles.doppler ? 1 : 0 },
    },
  });
  const disk = new THREE.Mesh(diskGeometry, diskMaterial);
  disk.rotation.x = -Math.PI / 2;
  disk.renderOrder = 1;
  scene.add(disk);

  const haloGeometry = new THREE.PlaneGeometry(
    HALO_HALF_SIZE * 2,
    HALO_HALF_SIZE * 2,
  );
  const haloMaterial = new THREE.ShaderMaterial({
    vertexShader: HALO_VERTEX,
    fragmentShader: HALO_FRAGMENT,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPhotonRadius: { value: 2.63 / HALO_HALF_SIZE },
      uShadowRadius: { value: SHADOW / HALO_HALF_SIZE },
      uBrightness: { value: 1 },
      uHalo: { value: toggles.halo ? 1 : 0 },
    },
  });
  const halo = new THREE.Mesh(haloGeometry, haloMaterial);
  halo.renderOrder = 2;
  scene.add(halo);

  // === Cadena de post-proceso =============================================
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(backdrop, camera));

  const lensPass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uCenter: { value: new THREE.Vector2(0.5, 0.5) },
      uAspect: { value: 1 },
      uStrength: { value: POSES[toggles.pose].lens },
      uHorizon: { value: 0.05 },
    },
    vertexShader: LENS_VERTEX,
    fragmentShader: LENS_FRAGMENT,
  });
  composer.addPass(lensPass);

  // clear: false conserva el fondo ya distorsionado; clearDepth: true da un
  // buffer de profundidad limpio para que sombra y disco se ocluyan bien.
  const mainPass = new RenderPass(scene, camera);
  mainPass.clear = false;
  mainPass.clearDepth = true;
  composer.addPass(mainPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(1, 1),
    BLOOM[toggles.tier].strength,
    BLOOM[toggles.tier].radius,
    // Umbral ALTO: solo el borde interior y el anillo alimentan el glow. Con un
    // umbral bajo el bloom agarra el disco entero y lava la imagen a blanco.
    0.9,
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  /** Aplica una pose. La cámara es fija DENTRO de cada pose: esto nunca se llama
   *  por frame ni desde un gesto continuo. */
  function applyPose(pose: CameraPose) {
    const preset = POSES[pose];
    const pullback = Math.min(
      MAX_PORTRAIT_PULLBACK,
      Math.max(1, REFERENCE_ASPECT / Math.max(camera.aspect, 0.05)),
    );
    camera.position.copy(preset.position).multiplyScalar(pullback);
    camera.fov = preset.fov;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);

    // Doppler: la cámara no se mueve dentro de la pose, así que su posición en
    // espacio local del disco se calcula aquí, no en cada frame.
    disk.updateMatrixWorld(true);
    diskMaterial.uniforms.uCamLocal.value.copy(
      disk.worldToLocal(preset.position.clone()),
    );
    halo.lookAt(camera.position);
    lensPass.uniforms.uStrength.value = preset.lens;
  }

  function resize() {
    // En móvil el primer layout puede llegar después del primer frame: sin este
    // suelo el renderer se queda en 1×1 y la escena parece no cargar nunca.
    const width = Math.max(1, canvas.clientWidth || canvas.offsetWidth || 0);
    const height = Math.max(1, canvas.clientHeight || canvas.offsetHeight || 0);
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP[toggles.tier]);

    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    composer.setPixelRatio(dpr);
    composer.setSize(width, height);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    // El retroceso por retrato depende del aspect: reaplicar la pose ANTES de
    // proyectar el centro de la sombra, o la lente apuntaría al sitio viejo.
    applyPose(toggles.pose);

    const bloomScale = BLOOM[toggles.tier].scale;
    bloomPass.resolution.set(
      Math.max(1, Math.round(width * bloomScale)),
      Math.max(1, Math.round(height * bloomScale)),
    );
    bloomPass.strength = BLOOM[toggles.tier].strength;
    bloomPass.radius = BLOOM[toggles.tier].radius;

    // Centro y radio de la sombra en pantalla. Fijos mientras la pose lo esté,
    // pero dependen del aspect: recalcular en cada resize.
    const center = new THREE.Vector3(0, 0, 0).project(camera);
    const edge = new THREE.Vector3(SHADOW, 0, 0).project(camera);
    lensPass.uniforms.uCenter.value.set(
      center.x * 0.5 + 0.5,
      center.y * 0.5 + 0.5,
    );
    lensPass.uniforms.uAspect.value = width / height;
    lensPass.uniforms.uHorizon.value =
      Math.abs(edge.x - center.x) * 0.5 * (width / height);
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

    const elapsed = clock.elapsedTime;
    diskMaterial.uniforms.uTime.value = elapsed;
    haloMaterial.uniforms.uTime.value = elapsed;

    try {
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

  lensPass.enabled = toggles.tier === "deep" && toggles.lens;
  bloomPass.enabled = toggles.bloom && canFloatBloom;
  resize();
  lastWidth = canvas.clientWidth;
  lastHeight = canvas.clientHeight;
  frameHandle = requestAnimationFrame(renderFrame);

  const diagnostics = [
    gpuName,
    capabilities.isWebGL2 ? "WebGL2" : "WebGL1",
    `DPR ${(window.devicePixelRatio || 1).toFixed(2)}`,
    `${canvas.clientWidth}×${canvas.clientHeight} css`,
    ...notes,
  ].join(" · ");

  return {
    diagnostics,
    resize,
    setToggles(next) {
      const tierChanged = next.tier !== toggles.tier;
      const poseChanged = next.pose !== toggles.pose;
      toggles = next;
      diskMaterial.uniforms.uDoppler.value = next.doppler ? 1 : 0;
      haloMaterial.uniforms.uHalo.value = next.halo ? 1 : 0;
      lensPass.enabled = next.tier === "deep" && next.lens;
      bloomPass.enabled = next.bloom && canFloatBloom;
      if (tierChanged || poseChanged) resize();
    },
    dispose() {
      disposed = true;
      if (frameHandle) cancelAnimationFrame(frameHandle);
      document.removeEventListener("visibilitychange", handleVisibility);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      // Teardown real, no "dejar de dibujar" (§8).
      nebulaGeometry.dispose();
      nebulaMaterial.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      shadowGeometry.dispose();
      shadowMaterial.dispose();
      diskGeometry.dispose();
      diskMaterial.dispose();
      haloGeometry.dispose();
      haloMaterial.dispose();
      bloomPass.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
