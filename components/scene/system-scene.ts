import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import type { WorldId } from "@/content/worlds.data";
import {
  bodyDepthLayerFor,
  placeBodyOnDepthLayer,
} from "@/lib/scene-depth";
import type { CameraPose } from "@/lib/scene-poses";
import {
  DISK_INNER,
  DISK_OUTER,
  DISPLAY_FRAGMENT,
  GARGANTUA_FRAGMENT,
  GARGANTUA_RS,
  GARGANTUA_VERTEX,
} from "./gargantua-shaders";
import {
  createBody,
  disposeBody,
  orbitalPosition,
  type SceneBody,
  type SceneBodyInput,
} from "./bodies";

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
  /** Semiejes opcionales cuando la silueta percibida no es circular. */
  hitRadiusX?: number;
  hitRadiusY?: number;
  /** Desplazamiento exclusivo del rótulo; nunca mueve el proxy de interacción. */
  labelDrop?: number;
  /** Distancia a la cámara, para ordenar etiquetas que se solapen. */
  depth: number;
  /** Falso cuando el cuerpo cae fuera del cuadro (no debería pasar nunca). */
  visible: boolean;
  /**
   * A qué lado del cuerpo va su nombre. Con Gargantúa centrado la regla es que
   * apunte hacia FUERA, de modo que el texto se abra en abanico desde el centro
   * en vez de apilarse sobre el agujero negro.
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

/**
 * Radio del disco que ENCUADRA la cámara, que no es el que se dibuja.
 *
 * El encuadre obedece a los DESTINOS. Si tuviera que meter en el cuadro el
 * disco ya ampliado, retrocedería y le devolvería a Gargantúa el tamaño
 * aparente que se le acaba de dar — el mismo bucle que hace inútil escalar las
 * órbitas. Con rs = 1.22 el disco cabe igualmente; la constante existe para que
 * siga cabiendo la decisión, no el número.
 */
const COMPOSITION_DISK_OUTER = 17;

/** Presupuesto por nivel: las dos palancas de un raymarcher son píxeles y pasos. */
const TIER: Record<QualityTier, { dpr: number; steps: number; stepScale: number }> = {
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
const BLOOM: Record<QualityTier, { strength: number; radius: number; scale: number }> = {
  orbit: { strength: 0.6, radius: 0.57, scale: 0.5 },
  deep: { strength: 0.67, radius: 0.61, scale: 0.62 },
};

const BASE_EXPOSURE = 0.95;
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
 * Ancho de la traza orbital, como fracción de la distancia de encuadre.
 *
 * Va atado a la distancia y no fijo en rs porque la distancia cambia con el
 * viewport: en un móvil en vertical la cámara se va a 250 rs y una cinta de
 * ancho constante se quedaría en medio píxel — invisible justo donde el sistema
 * ya es más pequeño. Así mide siempre ~1.6 px de lado a lado.
 */
const ORBIT_WIDTH_RATIO = 0.0012;

/**
 * Paralaje máximo del puntero. §3 lo acota a 2°, y ese es el techo duro; 1.5 es
 * lo que se usa. A 42° de campo, 2° son ±41 px de vaivén del sistema entero
 * siguiendo al ratón — mucho más de lo que se lee como «profundidad».
 */
const MAX_PARALLAX_DEG = 1.5;

/**
 * Constante de tiempo del paralaje, en segundos.
 *
 * Antes el ángulo saltaba al valor del puntero en el mismo fotograma del
 * `pointermove`: el sistema perseguía al ratón 1:1 y eso era la mitad de la
 * sensación de «los planetas se mueven muchísimo». Con un suavizado
 * exponencial la cámara llega al mismo sitio, pero deriva en vez de dar
 * tirones — y de paso el movimiento por fotograma baja tanto que la
 * acumulación temporal del raymarch ya no hay que tirarla.
 */
const PARALLAX_TAU = 0.32;

/**
 * Margen alrededor del sistema al encuadrar, en rs.
 *
 * No es estético: cada cuerpo arrastra una etiqueta y el encuadre solo sabe de
 * radios. Con el margen justo, un destino queda dentro pero su nombre se sale.
 *
 * Pasó por 11, 9, 7 y 5. Baja a 3 con el rediseño de la etiqueta: al quitarle la
 * píldora y el aro, la caja de un destino pasó de unos 200×60 px a unos 110×36,
 * así que hace falta bastante menos aire para que quepa. Y cada rs de margen se
 * paga en distancia de cámara, o sea en tamaño de Gargantúa.
 */
const FRAME_MARGIN = 3;
// En portrait no hay rótulos pegados a los cuerpos y cada píxel horizontal
// cuenta. Conservamos holgura geométrica, pero no pagamos el margen de desktop
// que hacía que el sistema completo pareciera una miniatura en móvil.
const PORTRAIT_FRAME_MARGIN = 1;
/**
 * En vertical no se escala el sistema de escritorio: se recompone en el plano
 * de cámara. La elipse alta conserva los mismos radios/fases estructurales,
 * pero usa el viewport disponible en lugar de encoger todo a una franja.
 */
const PORTRAIT_ASPECT = 0.75;
const PORTRAIT_HORIZONTAL_SCALE = 0.72;
const PORTRAIT_VERTICAL_SCALE = 1.05;
const PORTRAIT_DEPTH_SCALE = 0.18;
const PORTRAIT_DISK_FRAME = 0.78;

/** Cuando la escena está congelada (páginas de mundo) basta con refrescar de
 *  vez en cuando: no se puede dejar de dibujar del todo porque el navegador
 *  puede descartar el búfer, pero 4 fps de un cuadro inmóvil no cuesta nada. */
const FROZEN_FRAME_MS = 250;

const WORLD_UP = new THREE.Vector3(0, 1, 0);

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
    defines: { MAX_STEPS: TIER[tier].steps },
    uniforms: {
      uCamPos: { value: new THREE.Vector3() },
      uCamRight: { value: new THREE.Vector3(1, 0, 0) },
      uCamUp: { value: new THREE.Vector3(0, 1, 0) },
      uCamFwd: { value: new THREE.Vector3(0, 0, -1) },
      uTanHalfFov: { value: Math.tan((pose.fov * Math.PI) / 360) },
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
      const anisotropy = Math.min(4, capabilities.getMaxAnisotropy());
      for (const material of body.materials) {
        const surface = material.uniforms.uSurfaceMap?.value as
          | THREE.Texture
          | null
          | undefined;
        if (surface?.isTexture) surface.anisotropy = anisotropy;
      }
      bodies.push(body);
      bodyScene.add(body.object);
      // La traza va directa a la escena, no dentro del cuerpo: es fija.
      bodyScene.add(body.orbit);
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
  /*
    Y hay que LIMPIAR LA PROFUNDIDAD, aunque no se limpie el color.

    Este es el fallo que se veía como «los planetas tienen un bug». `clear =
    false` en un RenderPass no limpia nada: ni color —que es lo que queremos,
    porque debajo está el raymarch— ni profundidad, que es justo lo que NO
    queremos. El z-buffer del render target sobrevivía de un fotograma al
    siguiente, así que cada cuerpo iba dejando una pared invisible por donde
    pasaba; en cuanto se alejaba un poco de la cámara, el test de profundidad
    empezaba a rechazar sus propios píxeles contra su rastro de ayer. El
    síntoma: siluetas que se comen por un borde, cuerpos que desaparecen a
    trozos y vuelven al acercarse otra vez.

    El raymarch no escribe profundidad (`depthWrite: false`), así que limpiarla
    aquí no le quita nada: sólo garantiza que los seis cuerpos se ordenan entre
    ellos y con nadie más.
  */
  bodyPass.clearDepth = true;
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
  // Base de composición sin paralaje. Los cuerpos se colocan una vez sobre
  // estos rayos; después la cámara sí puede moverse ±1.5° y revelar la
  // diferencia entre planos en vez de arrastrar el layout con ella.
  const compositionCameraPosition = new THREE.Vector3();
  const compositionTarget = new THREE.Vector3();
  const compositionForward = new THREE.Vector3();
  const compositionRight = new THREE.Vector3();
  const compositionUp = new THREE.Vector3();
  const compositionBaseRight = new THREE.Vector3();
  const compositionBaseUp = new THREE.Vector3();
  const compositionBasePosition = new THREE.Vector3();
  const compositionLayeredPosition = new THREE.Vector3();

  /** Ángulo de paralaje ya aplicado a la cámara. */
  let parallaxX = 0;
  let parallaxY = 0;
  /** A dónde apunta el puntero. El de arriba persigue a este, suavizado. */
  let parallaxTargetX = 0;
  let parallaxTargetY = 0;
  let frameDistance = 120;
  let cssWidth = 1;
  let cssHeight = 1;
  let pixelWidth = 1;
  let pixelHeight = 1;

  function baseBodyPosition(
    body: SceneBody,
    aspect: number,
    cameraRight: THREE.Vector3,
    cameraUp: THREE.Vector3,
    cameraForward: THREE.Vector3,
    target: THREE.Vector3,
  ): THREE.Vector3 {
    orbitalPosition(body.placement, 0, target);
    if (aspect >= PORTRAIT_ASPECT) return target;

    const phase = (body.placement.phase * Math.PI) / 180;
    const depth = target.dot(cameraForward) * PORTRAIT_DEPTH_SCALE;
    const horizontal =
      Math.cos(phase) *
      body.placement.orbitRadius *
      PORTRAIT_HORIZONTAL_SCALE;
    const vertical =
      -Math.sin(phase) *
      body.placement.orbitRadius *
      PORTRAIT_VERTICAL_SCALE;

    return target
      .copy(cameraRight)
      .multiplyScalar(horizontal)
      .addScaledVector(cameraUp, vertical)
      .addScaledVector(cameraForward, depth);
  }

  function composedBodyPosition(
    body: SceneBody,
    aspect: number,
    cameraRight: THREE.Vector3,
    cameraUp: THREE.Vector3,
    cameraForward: THREE.Vector3,
    referenceCameraPosition: THREE.Vector3,
    target: THREE.Vector3,
  ): THREE.Vector3 {
    baseBodyPosition(
      body,
      aspect,
      cameraRight,
      cameraUp,
      cameraForward,
      target,
    );
    return placeBodyOnDepthLayer(
      target,
      referenceCameraPosition,
      bodyDepthLayerFor(body.id),
      target,
    );
  }

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

    const dir = new THREE.Vector3(
      Math.cos(elevation) * Math.sin(azimuth),
      Math.sin(elevation),
      Math.cos(elevation) * Math.cos(azimuth),
    );
    const f = dir.clone().negate();
    const r0 = new THREE.Vector3().crossVectors(f, WORLD_UP).normalize();
    const u0 = new THREE.Vector3().crossVectors(r0, f).normalize();

    // Con el MISMO roll que usa la cámara.
    //
    // Antes se medía con la base sin inclinar, y esa discrepancia dejaba a los
    // dos cuerpos más exteriores fuera de cuadro: la escena calculaba que
    // cabían sobre unos ejes que no eran los que luego proyectaban. Medir en un
    // sistema de referencia distinto del que dibuja es pedir que no cuadre.
    const cosRoll = Math.cos(pose.roll);
    const sinRoll = Math.sin(pose.roll);
    const r = r0.clone().multiplyScalar(cosRoll).addScaledVector(u0, sinRoll);
    const u = u0.clone().multiplyScalar(cosRoll).addScaledVector(r0, -sinRoll);

    const tanHalfFov = Math.tan((pose.fov * Math.PI) / 360);
    /*
      El corrimiento se come parte del cuadro: hay que pedir más.

      Con valor ABSOLUTO. Mientras el corrimiento fue positivo daba igual, pero
      un corrimiento negativo —mirar al otro lado— entraba aquí como `1 − (−x)`
      y hacía creer al encuadre que tenía MÁS ancho del que le queda, no menos.
      El destino del lado corto se habría salido del cuadro.
    */
    const tanHalfWidth =
      tanHalfFov *
      Math.max(aspect, 0.2) *
      (1 - Math.abs(pose.targetShiftFraction));
    const tanHalfHeight = tanHalfFov * (1 - Math.abs(pose.targetShiftYFraction));
    const frameMargin = aspect < 0.75 ? PORTRAIT_FRAME_MARGIN : FRAME_MARGIN;

    /**
     * Distancia mínima a la que ESTE punto cabe, con su cuerpo y su margen.
     *
     * ── Por qué no vale medir en ortográfica ─────────────────────────────────
     *
     * La versión anterior comparaba la mayor extensión del sistema, |p·u|,
     * contra `d · tan(fov/2)`: la geometría de una cámara ortográfica. Eso da
     * el resultado correcto sólo para los puntos que están a la MISMA
     * profundidad que el origen. Un cuerpo en el lado cercano de su órbita está
     * bastante más cerca que eso, y la perspectiva amplía su separación del
     * centro justo en la misma proporción — así que la medida lo daba por
     * dentro cuando ya se había salido.
     *
     * Con las órbitas de 25-51 rs el error quedaba tapado por el margen. Con
     * las de 23-42 ya no: la cámara está a 81 rs y el punto más cercano de la
     * órbita de Edmunds cae a 43, la mitad de camino. Ahí el factor de
     * perspectiva es casi 2 y Edmunds se salía del cuadro por abajo.
     *
     * La condición honesta usa la profundidad real del punto. Para una cámara a
     * distancia `d` mirando al origen, la profundidad de vista de `p` es
     * `d + p·f`, y la base (r, u, f) no depende de `d`. Así que la condición
     *
     *     |p·u| + radio + margen  ≤  tan(fov/2) · (d + p·f)
     *
     * se despeja de una vez, sin iterar.
     */
    function distanceFor(p: THREE.Vector3, radius: number): number {
      // Positivo si el punto está MÁS LEJOS que el origen; negativo si más cerca.
      const depth = p.dot(f);
      const reach = radius + frameMargin;
      return Math.max(
        (Math.abs(p.dot(u)) + reach) / tanHalfHeight - depth,
        (Math.abs(p.dot(r)) + reach) / tanHalfWidth - depth,
      );
    }

    let tight = 0;
    const point = new THREE.Vector3();

    // El borde del disco de acreción, que también tiene que caber entero. Antes
    // entraba como dos números sueltos (su radio y un cuarto de él para el
    // alto); muestrear su circunferencia lo somete a la misma regla que todo lo
    // demás y de paso deja de suponer nada sobre la elevación de la cámara.
    const framedDiskOuter =
      aspect < PORTRAIT_ASPECT
        ? COMPOSITION_DISK_OUTER * PORTRAIT_DISK_FRAME
        : COMPOSITION_DISK_OUTER;
    for (let i = 0; i < 48; i++) {
      const angle = (i / 48) * Math.PI * 2;
      point.set(
        Math.cos(angle) * framedDiskOuter,
        0,
        Math.sin(angle) * framedDiskOuter,
      );
      tight = Math.max(tight, distanceFor(point, 0));
    }

    for (const body of bodies) {
      // Una sola muestra por cuerpo, porque el sistema está QUIETO.
      //
      // Antes se recorrían 48 fases de cada órbita: había que garantizar que
      // ningún destino saliera de cuadro en ningún momento de su vuelta, y eso
      // obligaba a encuadrar la unión de las seis elipses enteras. El precio lo
      // pagaba Gargantúa — la cámara se iba a 90 rs para dejar sitio a
      // posiciones que ningún visitante llegaba a ver.
      //
      // Con las posiciones congeladas el encuadre solo tiene que encajar seis
      // puntos, y eso acerca la cámara de 90 a 73 rs. El disco pasa del 35 % al
      // 42 % del ancho del cuadro sin tocar una sola constante de tamaño.
      baseBodyPosition(body, aspect, r, u, f, point);
      tight = Math.max(tight, distanceFor(point, body.radius));
    }

    /*
      Y un margen de seguridad sobre el resultado.

      Ya no cubre un error de modelo —la condición de arriba es la de la cámara
      que luego dibuja, no una aproximación— sino sólo lo que queda: 48 muestras
      por órbita, y el paralaje de ±1.5° que se suma después de medir. Con eso,
      un 4 % es holgura de sobra; el 12 % de antes se pagaba entero en tamaño de
      Gargantúa.
    */
    return tight * 1.04;
  }

  /**
   * Encuadre y orientación, separados a propósito.
   *
   * `measureFrameDistance` recorre el disco y los seis cuerpos en sus posiciones
   * congeladas. Eso está bien al redimensionar o al cambiar de ruta, pero el
   * paralaje suavizado mueve la cámara en CADA fotograma y
   * ahí ese coste no pinta nada — la distancia de encuadre no depende del
   * paralaje, sólo de la pose y del aspecto. Así que se mide cuando cambian
   * esos dos y se orienta sesenta veces por segundo.
   */
  function applyPose(aspect: number) {
    frameDistance = measureFrameDistance(aspect) * pose.distanceScale;
    setCompositionFrame(aspect);

    // El ancho de la traza orbital se recalcula aquí y no por fotograma: sólo
    // depende de la distancia de encuadre, que es justo lo que se acaba de
    // medir.
    const orbitWidth = frameDistance * ORBIT_WIDTH_RATIO;
    for (const body of bodies) {
      // Las curvas 3D de escritorio pertenecen a sus planos orbitales reales.
      // En vertical los cuerpos se recomponen en el plano de cámara; esconder
      // estas guías GHOST evita dibujar una trayectoria que ya no pasaría por
      // su destino. Brackets, TARGET y raíl siguen íntegros.
      body.orbit.visible = aspect >= PORTRAIT_ASPECT;
      for (const material of body.materials) {
        if (material.uniforms.uWidth) material.uniforms.uWidth.value = orbitWidth;
      }
    }

    orientCamera(aspect);
  }

  /** Fija la composición para la pose pura, antes del paralaje aditivo. */
  function setCompositionFrame(aspect: number) {
    const elevation = (pose.elevation * Math.PI) / 180;
    const azimuth = (pose.azimuth * Math.PI) / 180;
    compositionCameraPosition
      .set(
        Math.cos(elevation) * Math.sin(azimuth),
        Math.sin(elevation),
        Math.cos(elevation) * Math.cos(azimuth),
      )
      .multiplyScalar(frameDistance);

    compositionForward.copy(compositionCameraPosition).negate().normalize();
    compositionBaseRight
      .crossVectors(compositionForward, WORLD_UP)
      .normalize();
    compositionBaseUp
      .crossVectors(compositionBaseRight, compositionForward)
      .normalize();
    const tanHalf = Math.tan((pose.fov * Math.PI) / 360);
    const halfWidth = frameDistance * tanHalf * aspect;
    const halfHeight = frameDistance * tanHalf;
    compositionTarget
      .copy(compositionBaseRight)
      .multiplyScalar(-halfWidth * pose.targetShiftFraction)
      .addScaledVector(
        compositionBaseUp,
        halfHeight * pose.targetShiftYFraction,
      );
    compositionForward
      .copy(compositionTarget)
      .sub(compositionCameraPosition)
      .normalize();
    compositionBaseRight
      .crossVectors(compositionForward, WORLD_UP)
      .normalize();
    compositionBaseUp
      .crossVectors(compositionBaseRight, compositionForward)
      .normalize();

    const cos = Math.cos(pose.roll);
    const sin = Math.sin(pose.roll);
    compositionRight
      .copy(compositionBaseRight)
      .multiplyScalar(cos)
      .addScaledVector(compositionBaseUp, sin);
    compositionUp
      .copy(compositionBaseUp)
      .multiplyScalar(cos)
      .addScaledVector(compositionBaseRight, -sin);

    for (const body of bodies) {
      baseBodyPosition(
        body,
        aspect,
        compositionRight,
        compositionUp,
        compositionForward,
        compositionBasePosition,
      );
      placeBodyOnDepthLayer(
        compositionBasePosition,
        compositionCameraPosition,
        bodyDepthLayerFor(body.id),
        compositionLayeredPosition,
      );
      body.orbit.position.subVectors(
        compositionLayeredPosition,
        compositionBasePosition,
      );
    }
  }

  /**
   * Cuánto hay que bajar la etiqueta de Gargantúa para que despeje el disco, en
   * píxeles CSS.
   *
   * Antes era `radio de la sombra × 3.4`: un número atado a la cosa equivocada.
   * La sombra mide 2.6 rs y el disco llega a 17, así que el factor tenía que
   * absorber esa diferencia a ojo — y en cuanto la elevación de la cámara subió
   * de 9° a 17° dejó de valer, porque el disco pasó a ocupar el doble de alto y
   * el nombre volvió a caer encima de la parte más brillante del cuadro.
   *
   * Aquí se MIDE: se proyecta el borde del disco con la cámara que acaba de
   * quedar montada y se coge su punto más bajo. Cambiar la elevación, el campo
   * de visión o el radio del disco ya no puede volver a descolocar la etiqueta.
   */
  let centreLabelDrop = 0;
  let centreHitRadiusX = 0;
  let centreHitRadiusY = 0;
  const diskScratch = new THREE.Vector3();

  function measureCentreLabelDrop() {
    const centre = diskScratch.set(0, 0, 0).project(bodyCamera).clone();
    const centreY = centre.y;
    let leftmost = centre.x;
    let rightmost = centre.x;
    let lowest = centreY;
    let highest = centreY;
    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      diskScratch
        .set(Math.cos(angle) * DISK_OUTER, 0, Math.sin(angle) * DISK_OUTER)
        .project(bodyCamera);
      leftmost = Math.min(leftmost, diskScratch.x);
      rightmost = Math.max(rightmost, diskScratch.x);
      lowest = Math.min(lowest, diskScratch.y);
      highest = Math.max(highest, diskScratch.y);
    }
    // De NDC a píxeles CSS. El label recibe además seis píxeles de respiro; el
    // hitbox conserva exactamente el plano proyectado y luego CSS le da 110 %.
    centreHitRadiusX = ((rightmost - leftmost) / 4) * cssWidth;
    centreHitRadiusY = ((highest - lowest) / 4) * cssHeight;
    centreLabelDrop = ((centreY - lowest) / 2) * cssHeight + 6;
  }

  function orientCamera(aspect: number) {
    const elevation = ((pose.elevation + parallaxY * MAX_PARALLAX_DEG) * Math.PI) / 180;
    const azimuth = ((pose.azimuth + parallaxX * MAX_PARALLAX_DEG) * Math.PI) / 180;

    cameraPosition.set(
      Math.cos(elevation) * Math.sin(azimuth),
      Math.sin(elevation),
      Math.cos(elevation) * Math.cos(azimuth),
    ).multiplyScalar(frameDistance);

    // Base mirando al origen, para saber hacia dónde corremos la mirada.
    forward.copy(cameraPosition).negate().normalize();
    right.crossVectors(forward, WORLD_UP).normalize();

    up.crossVectors(right, forward).normalize();

    const tanHalfFov = Math.tan((pose.fov * Math.PI) / 360);
    const halfWidth = frameDistance * tanHalfFov * aspect;
    const halfHeight = frameDistance * tanHalfFov;
    // Mirar a la IZQUIERDA del agujero negro lo empuja a la derecha del cuadro,
    // y mirar por ENCIMA lo empuja hacia abajo.
    cameraTarget
      .copy(right)
      .multiplyScalar(-halfWidth * pose.targetShiftFraction)
      .addScaledVector(up, halfHeight * pose.targetShiftYFraction);

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
    /* Ángulo por píxel en vertical. Es el antialias del disco: con él y la
       distancia al punto, el shader calcula la huella del píxel en unidades de
       mundo y apaga cada campo de ruido antes de que su longitud de onda baje
       de esa huella. Depende del FOV y de la resolución REAL, así que se
       escribe aquí y en el resize. */
    marchMaterial.uniforms.uPixelScale.value = (2 * tanHalfFov) / pixelHeight;
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

    measureCentreLabelDrop();
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
  const timer = new THREE.Timer();
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

  /**
   * A qué lado quedó la etiqueta de cada cuerpo la última vez.
   *
   * Existe por la histéresis. Con un único umbral, un cuerpo que orbita justo
   * sobre él hacía cambiar de lado a su nombre en fotogramas alternos: el texto
   * parpadeaba de un extremo al otro del marcador varias veces por segundo. Con
   * dos umbrales separados hay que cruzar la banda entera para volver, así que
   * el cambio ocurre una vez por vuelta y se ve como lo que es.
   */
  const sides = new Map<WorldId, "left" | "right">();

  /**
   * A qué lado del cuerpo va su nombre.
   *
   * ── El bug que corrige ─────────────────────────────────────────────────────
   *
   * Los umbrales eran 0.56 y 0.68 del ancho: dos números heredados de cuando
   * Gargantúa vivía en el tercio derecho del cuadro. Al centrarlo, nadie los
   * revisó, y quedaron los dos a la derecha del centro. El resultado era que
   * TODA la mitad izquierda del sistema —tres de los seis destinos— colgaba su
   * nombre hacia la derecha, o sea hacia dentro, amontonando texto justo encima
   * del agujero negro. Y un cuerpo que cruzara la banda 0.56–0.68 hacía saltar
   * su nombre el ancho entero de la palabra de un lado al otro.
   *
   * La regla correcta para un sistema centrado es que **el nombre apunte hacia
   * fuera**: los destinos de la izquierda lo llevan a su izquierda y los de la
   * derecha a su derecha. Así el texto se abre en abanico desde el centro, nunca
   * se apila sobre Gargantúa y el cambio de lado ocurre una sola vez por vuelta,
   * al cruzar el eje vertical del cuadro — donde además el cuerpo está arriba o
   * abajo del todo y el salto apenas se nota.
   *
   * Aquí sólo se decide el lado NATURAL, por geometría. El pliegue contra el
   * borde de la ventana lo hace la capa del DOM, que es la única que conoce el
   * ancho real de cada palabra: la escena sabe de posiciones, no de tipografía.
   */
  function sideFor(id: WorldId, x: number): "left" | "right" {
    const previous = sides.get(id);
    const centre = cssWidth / 2;
    // Banda muerta alrededor del eje: dentro de ella se conserva el lado que ya
    // tenía. Fuera, manda la posición.
    const band = cssWidth * 0.05;
    if (x > centre + band) return "right";
    if (x < centre - band) return "left";
    return previous ?? (x >= centre ? "right" : "left");
  }

  function project(body: {
    id: WorldId;
    position: THREE.Vector3;
    radius: number;
    hitScaleX?: number;
    hitScaleY?: number;
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

    const side = sideFor(body.id, x);
    sides.set(body.id, side);

    return {
      id: body.id,
      x,
      y,
      radius,
      hitRadiusX: radius * (body.hitScaleX ?? 1),
      hitRadiusY: radius * (body.hitScaleY ?? 1),
      depth: projectionScratch.z,
      visible:
        projectionScratch.z < 1 &&
        x > 0 &&
        x < cssWidth &&
        y > 0 &&
        y < cssHeight,
      side,
    };
  }

  function updateBodies(seconds: number) {
    const position = new THREE.Vector3();
    projected.length = 0;

    for (const body of bodies) {
      /*
        POSICIÓN CONGELADA.

        Los cuerpos ya no recorren su órbita. No es una limitación técnica: es
        dirección de arte. Seis objetos deslizándose sin parar sobre seis elipses
        concéntricas se leen como un diagrama animado, y además obligaban a
        encuadrar la unión de todas las trayectorias — lo que dejaba a Gargantúa
        pequeño. Un sistema real a esta escala tampoco se mueve de forma
        perceptible: la Endurance tarda horas en cruzar un grado.

        Lo que queda vivo es lo que sí aporta atmósfera y no ruido: el giro
        propio de cada cuerpo, el latido de las balizas, el paralaje del puntero
        y el propio disco de acreción, que no para nunca.
      */
      composedBodyPosition(
        body,
        cssWidth / cssHeight,
        compositionRight,
        compositionUp,
        compositionForward,
        compositionCameraPosition,
        position,
      );
      body.object.position.copy(position);
      body.spinAt(seconds);

      /*
        La luz cae con la distancia al disco, que es la única fuente que hay —
        pero MUCHO más despacio que un punto de luz. El disco mide 34 rs de lado
        a lado: para un cuerpo a 30 rs no es un punto lejano, es una pared de luz
        que le ocupa media bóveda, y con una fuente extensa la intensidad no va
        como 1/r².

        Lo que cambia respecto de la versión anterior es el RECORRIDO, no la
        forma. Con exponente 0.45 sobre el cinturón de entonces, la iluminación
        iba de 1.46 a 1.14: un 28 % de diferencia entre el cuerpo más interior y
        el más exterior, que en pantalla es ninguna. Seis cuerpos igual de
        iluminados se leen como seis calcomanías pegadas al mismo cristal — era
        la mitad de por qué el sistema no tenía profundidad.

        Ahora el recorrido es de 1.55 a 1.08, un factor 1.43. El interior está
        claramente bañado por el disco y el exterior claramente en penumbra, y
        eso es lo que ordena las capas. El suelo subió de 0.98 a 1.08 por lo de
        siempre, sólo que un punto más arriba: un destino que no se ve es un
        enlace que no existe, y en penumbra cerrada los tres cuerpos exteriores
        estaban a un paso de no verse. El contraste entre capas apenas cae —
        pierde media décima de factor y gana legibilidad en todo el cinturón.
      */
      const light = Math.min(
        1.66,
        Math.max(1.08, (25 / Math.max(body.placement.orbitRadius, 1)) * 1.36),
      );

      // Un cuerpo lleva ahora hasta dos materiales —superficie y halo— y no
      // comparten uniformes: el halo no sabe nada de cámara ni de luz. Se
      // escribe lo que cada uno declara y punto.
      for (const material of body.materials) {
        const uniforms = material.uniforms;
        uniforms.uTime.value = seconds;
        uniforms.uCamPos?.value.copy(cameraPosition);
        if (uniforms.uLightIntensity) uniforms.uLightIntensity.value = light;
      }

      let hitScaleX = 1;
      let hitScaleY = 1;
      if (body.visual === "ship") {
        // La Endurance se muestra ahora a 48° de frontal en vez de a 60°: la
        // elipse del anillo es bastante menos achatada y el blanco tiene que
        // seguirla, o el clic falla justo en los grupos de módulos de arriba y
        // abajo, que es donde el ojo apunta.
        hitScaleX = 0.82;
        hitScaleY = 0.64;
      } else if (body.visual === "station") {
        // El radio ya no incluye el hábitat orbital (ver `modelRadius`), así
        // que mide anillos: ancho completo y alto el del planeta más el canto.
        hitScaleY = 0.68;
      }
      projected.push(
        project({
          id: body.id,
          position,
          radius: body.radius,
          hitScaleX,
          hitScaleY,
        }),
      );
    }

    for (const id of centreIds) {
      const body = project({
        id,
        position: position.set(0, 0, 0),
        radius: centreRadii.get(id) ?? 2.6,
      });
      // El proxy permanece en el centro físico. Sólo el rótulo baja hasta
      // despejar el disco; sus semiejes de hit testing cubren el disco percibido.
      body.labelDrop = centreLabelDrop;
      body.hitRadiusX = centreHitRadiusX;
      body.hitRadiusY = centreHitRadiusY * 1.18;
      projected.push(body);
    }

    onProject(projected);
  }

  function renderFrame(timestamp: number) {
    if (disposed) return;
    frameHandle = requestAnimationFrame(renderFrame);

    timer.update(timestamp);
    const delta = timer.getDelta();
    const now = timestamp;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width !== lastWidth || height !== lastHeight) {
      lastWidth = width;
      lastHeight = height;
      resize();
    }

    if (pose.animated) {
      elapsed += delta;

      /*
        El paralaje persigue al puntero, no lo copia.

        Suavizado exponencial con constante de tiempo fija: independiente del
        framerate, sin rebote y sin cola infinita — por debajo de una milésima
        de grado se da por llegado y se deja de tocar la cámara, que es lo que
        permite que la acumulación temporal del raymarch converja cuando el
        ratón está quieto.
      */
      const k = 1 - Math.exp(-delta / PARALLAX_TAU);
      const nextX = parallaxX + (parallaxTargetX - parallaxX) * k;
      const nextY = parallaxY + (parallaxTargetY - parallaxY) * k;
      if (Math.abs(nextX - parallaxX) > 1e-4 || Math.abs(nextY - parallaxY) > 1e-4) {
        parallaxX = nextX;
        parallaxY = nextY;
        // Sólo orientar: la distancia de encuadre no depende del paralaje.
        orientCamera(cssWidth / cssHeight);
      }
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
      timer.reset();
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
        const focus = body.id === id ? 1 : 0;
        for (const material of body.materials) {
          material.uniforms.uFocus.value = focus;
        }
      }
    },
    setParallax(x, y) {
      if (!pose.animated) return;
      /*
        Sólo se apunta el objetivo. El bucle lo alcanza suavizado, y por eso
        aquí ya NO se tira la acumulación temporal: antes cada `pointermove`
        llamaba a `resetAccumulation()`, así que mientras el ratón se movía el
        raymarch volvía a empezar de cero en cada fotograma y Gargantúa se veía
        granulada — la escena parecía romperse justo cuando la estabas mirando.
        Con el movimiento repartido, lo que la cámara se desplaza entre dos
        fotogramas es una fracción de píxel y la mezcla del 18 % lo absorbe sin
        dejar fantasma.
      */
      parallaxTargetX = Math.max(-1, Math.min(1, x));
      parallaxTargetY = Math.max(-1, Math.min(1, y));
    },
    resize,
    dispose() {
      disposed = true;
      if (frameHandle) cancelAnimationFrame(frameHandle);
      document.removeEventListener("visibilitychange", handleVisibility);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      timer.dispose();
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
