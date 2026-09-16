import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import type { WorldId } from "@/content/worlds.data";
import { observationPlacement } from "@/lib/observatory";
import { createBody, disposeBody, type SceneBodyInput } from "./bodies";
import { specimenContract, type SpecimenContract } from "./specimen-contract";

/**
 * El Observatorio: un espécimen, su propia cámara y su propio bucle.
 *
 * > El contrato de cámara rige la escena persistente. El Observatorio es otra
 * > escena, con otro canvas y otra cámara, a la que el visitante entra a
 * > propósito.
 * > — docs/design/tesseract-experimentos.md §2
 *
 * Este archivo es el «driver» del §13: no reimplementa ningún material ni toca
 * `bodies.ts`. Construye el cuerpo con `createBody` —que ya lo devuelve aislado
 * y centrado en su propio origen—, lo coloca según el preset, y escribe cada
 * fotograma los MISMOS cuatro uniformes que escribe el bucle del System Map.
 * Si algún día esos cuatro cambian allí, cambian aquí: son el contrato real
 * entre la escena y los cuerpos.
 *
 * ── Lo que NO se dibuja ─────────────────────────────────────────────────────
 *
 * La cinta de órbita. `createBody` la devuelve en `body.orbit`, aparte del
 * cuerpo, y aquí simplemente no se añade: es una guía del mapa, no parte del
 * espécimen.
 *
 * ── Por qué el cuerpo no está en el centro del mundo ────────────────────────
 *
 * Porque la luz ES el origen del mundo (`toLight = normalize(-vPositionW)`).
 * Un cuerpo en el origen queda a oscuras. Toda la explicación y la matemática
 * viven en `lib/observatory.ts`; aquí sólo se consume.
 *
 * Consecuencia bonita y deliberada: al orbitar, el visitante cambia su ángulo
 * respecto de la ÚNICA luz que hay. No está paseando alrededor de un objeto
 * iluminado de frente, está eligiendo dónde sentarse respecto del disco. Es la
 * regla del §6 hecha interacción.
 */

/** Los mismos valores del System Map: el espécimen no puede verse «mejor
 *  expuesto» aquí que en su sitio, o dejaría de ser él. */
const BASE_EXPOSURE = 0.95;
const BLOOM_STRENGTH = 0.6;
const BLOOM_RADIUS = 0.57;
const BLOOM_THRESHOLD = 2;

const FOV = 40;
/** Qué fracción del alto del cuadro ocupa el espécimen en la pose inicial. El
 *  §5 pide entre 70 % y 85 %: todo lo demás es instrumentación. */
const FRAME_FILL = 0.78;

/** Topes del zoom, en múltiplos de la distancia de encuadre inicial. Acotado a
 *  propósito: esto es un instrumento de observación, no un vuelo libre. */
const ZOOM_NEAR = 0.45;
const ZOOM_FAR = 2.6;
/** Cuánto puede subir o bajar el visitante. Sin tope, el polo invierte la
 *  imagen y el gesto deja de tener sentido. */
const PITCH_LIMIT = 1.45;

export interface ObservatoryHandle {
  /** El contrato medido del espécimen. Va a `INSPECCIONAR / DATOS`, nunca a la
   *  vista normal. */
  readonly contract: SpecimenContract;
  /** Vuelve a la pose del preset. No es «movimiento» y por eso no depende del
   *  interruptor global. */
  reset(): void;
  /** Instrumento `BLOOM`: apagar el halo. La prueba de oficio del proyecto —un
   *  cuerpo que pierde su identidad sin glow no está terminado. */
  setBloom(enabled: boolean): void;
  /** Instrumento `MATERIAL`: el material sin su emisión, vía `uEmission`. Aísla
   *  un canal con fines diagnósticos; no altera un solo parámetro. */
  setEmission(enabled: boolean): void;
  /** El interruptor global. Gobierna el movimiento AUTÓNOMO, nunca la mano del
   *  visitante: rotar y acercar siguen funcionando con él apagado. */
  setMotion(enabled: boolean): void;
  dispose(): void;
}

export interface ObservatoryOptions {
  canvas: HTMLCanvasElement;
  world: SceneBodyInput;
  motion: boolean;
}

export function createObservatoryScene(
  options: ObservatoryOptions,
): ObservatoryHandle | null {
  const { canvas, world } = options;

  const body = createBody(world);
  // Gargantúa no llega aquí: no tiene malla y se observa por vistas curadas.
  if (!body) return null;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
    failIfMajorPerformanceCaveat: false,
  });
  renderer.setClearColor(0x000000, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = BASE_EXPOSURE;

  const scene = new THREE.Scene();
  scene.add(body.object);

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 4000);

  /*
    El encuadre: a `d = r / sin(fov/2)` el espécimen llena el alto exacto. Se
    divide por `FRAME_FILL` para dejarle aire alrededor — un objeto que toca los
    bordes se lee como un recorte, no como una muestra.
  */
  const framing =
    body.radius / (FRAME_FILL * Math.sin(((FOV / 2) * Math.PI) / 180));
  const placement = observationPlacement(
    world.id as Exclude<WorldId, "gargantua">,
    body.radius,
    framing,
  );

  const target = new THREE.Vector3(...placement.body);
  body.object.position.copy(target);

  /*
    La órbita en coordenadas esféricas ALREDEDOR DEL ESPÉCIMEN, sembradas desde
    la pose del preset. Así «reajustar» es literalmente volver a estos tres
    números, y no hay un segundo camino por el que la cámara pueda llegar a un
    sitio que el preset no describa.
  */
  const home = new THREE.Vector3(...placement.camera).sub(target);
  const spherical = new THREE.Spherical().setFromVector3(home);
  const homeSpherical = spherical.clone();
  const up = new THREE.Vector3(...placement.up);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(1, 1),
    BLOOM_STRENGTH,
    BLOOM_RADIUS,
    BLOOM_THRESHOLD,
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  let motion = options.motion;
  let emission = 1;
  let elapsed = 0;
  let last = 0;
  let frame = 0;
  let disposed = false;
  /** Render bajo demanda: se dibuja cuando algo cambió, no en bucle. */
  let dirty = true;
  let width = 0;
  let height = 0;

  function applyCamera() {
    spherical.makeSafe();
    camera.position.setFromSpherical(spherical).add(target);
    camera.up.copy(up);
    camera.lookAt(target);
  }

  function resize(): boolean {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === width && h === height) return false;
    width = w;
    height = h;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    composer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloomPass.setSize(w, h);
    camera.aspect = h > 0 ? w / h : 1;
    camera.updateProjectionMatrix();
    return true;
  }

  /*
    Los CUATRO uniformes por fotograma, los mismos que escribe `updateBodies` en
    el System Map, y en el mismo orden de responsabilidad: `uTime` sin guarda
    porque todo material lo declara; el resto con `?.` porque no todos lo hacen.

    `uLightIntensity` sale del preset, que copia la ley del mapa: el espécimen
    conserva «a qué distancia del disco vive», que es parte de su identidad.
  */
  function writeUniforms() {
    for (const material of body!.materials) {
      const uniforms = material.uniforms;
      uniforms.uTime.value = elapsed;
      uniforms.uCamPos?.value.copy(camera.position);
      if (uniforms.uLightIntensity) {
        uniforms.uLightIntensity.value = placement.lightIntensity;
      }
      if (uniforms.uEmission) uniforms.uEmission.value = emission;
    }
  }

  function renderFrame(timestamp: number) {
    if (disposed) return;
    frame = requestAnimationFrame(renderFrame);

    const delta = last ? Math.min((timestamp - last) / 1000, 0.05) : 0;
    last = timestamp;

    /*
      El movimiento propio del espécimen. Para el Tesseracto `spinAt` es
      exactamente su reconfiguración interna y su trazo, porque su `SPIN_RATE`
      vale 0: el giro genérico que el §3 retira no existe en este cuerpo.

      Cuando entren Miller, Edmunds y la Endurance habrá que separar el giro de
      la animación —ahí `spinAt` hace las dos cosas con el mismo reloj—, y ése
      es el motivo por el que el Observatorio lleva reloj propio.
    */
    if (motion) {
      elapsed += delta;
      body!.spinAt(elapsed);
      dirty = true;
    }

    if (resize()) dirty = true;
    if (!dirty) return;
    dirty = false;

    applyCamera();
    writeUniforms();
    composer.render();
  }

  // ── El gesto del visitante ────────────────────────────────────────────────
  // Manipulación directa: vive fuera del interruptor de movimiento, que sólo
  // gobierna lo autónomo.

  let dragging: number | null = null;
  let lastX = 0;
  let lastY = 0;

  function onPointerDown(event: PointerEvent) {
    if (dragging !== null) return;
    dragging = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent) {
    if (dragging !== event.pointerId) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    // Media pantalla de arrastre ≈ media vuelta: el gesto lleva el espécimen
    // con la mano, sin aceleración ni inercia que lo conviertan en un juguete.
    spherical.theta -= (dx / Math.max(width, 1)) * Math.PI * 2;
    spherical.phi = THREE.MathUtils.clamp(
      spherical.phi - (dy / Math.max(height, 1)) * Math.PI,
      Math.PI / 2 - PITCH_LIMIT,
      Math.PI / 2 + PITCH_LIMIT,
    );
    dirty = true;
  }

  function endDrag(event: PointerEvent) {
    if (dragging !== event.pointerId) return;
    dragging = null;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault();
    spherical.radius = THREE.MathUtils.clamp(
      spherical.radius * (1 + Math.sign(event.deltaY) * 0.12),
      framing * ZOOM_NEAR,
      framing * ZOOM_FAR,
    );
    dirty = true;
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  resize();
  applyCamera();
  body.spinAt(0);
  frame = requestAnimationFrame(renderFrame);

  return {
    contract: specimenContract(body),
    reset() {
      spherical.copy(homeSpherical);
      dirty = true;
    },
    setBloom(enabled) {
      bloomPass.enabled = enabled;
      dirty = true;
    },
    setEmission(enabled) {
      emission = enabled ? 1 : 0;
      dirty = true;
    },
    setMotion(enabled) {
      motion = enabled;
      // Reanudar sin `last` limpio daría un salto proporcional al tiempo que
      // estuvo apagado.
      last = 0;
      dirty = true;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endDrag);
      canvas.removeEventListener("pointercancel", endDrag);
      canvas.removeEventListener("wheel", onWheel);
      disposeBody(body);
      bloomPass.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
