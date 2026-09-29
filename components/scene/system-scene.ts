import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SavePass } from "three/examples/jsm/postprocessing/SavePass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import type { WorldId } from "@/content/worlds.data";
import {
  bodyDepthLayerFor,
  placeBodyOnDepthLayer,
} from "@/lib/scene-depth";
import { flatCompositionFor } from "@/lib/flat-composition";
import type { CameraPose } from "@/lib/scene-poses";
import { diagnosticCode, readVisualBench } from "@/lib/visual-bench";
import {
  sampleVoyage,
  voyageFlavourFor,
  voyageTintFor,
  type VoyageFlavour,
  type VoyageSample,
} from "@/lib/voyage";
import { isSoftwareRenderer, rendererName, SOFTWARE_RENDER_SCALE } from "./capability";
import {
  DISK_OUTER,
  DISPLAY_FRAGMENT,
  GARGANTUA_FRAGMENT,
  GARGANTUA_VERTEX,
  SHADOW_GUARD_FRAGMENT,
} from "./gargantua-shaders";
/*
  Los números de Gargantúa viven en un solo sitio desde que hay DOS superficies
  que la dibujan: este mapa y el Observatorio. Aquí no queda ni una constante
  suya — sólo las que describen cómo la encuadra ESTA página.
*/
import {
  BASE_EXPOSURE,
  BLOOM,
  BLOOM_THRESHOLD,
  createMarchUniforms,
  createShadowGuardUniforms,
  HISTORY_TARGET,
  JITTER,
  SHADOW_IMPACT,
  temporalBlend,
  TIER,
  type QualityTier,
} from "./gargantua-render";
import {
  createBody,
  disposeBody,
  orbitalPosition,
  type SceneBody,
  type SceneBodyInput,
} from "./bodies";
import { createVoyagePass } from "./voyage-pass";

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
  /** An opaque destination covers the scene; retain its context without drawing. */
  setCovered(covered: boolean): void;
  setFocus(id: WorldId | null): void;
  /**
   * La travesía hacia un destino. La escena muestrea la línea de tiempo por su
   * cuenta desde `startedAt` (`performance.now()`); `null` la termina. Cambiar
   * de pose también la termina: la ruta manda.
   */
  setVoyage(voyage: { id: WorldId; startedAt: number } | null): void;
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

/**
 * Campo de visión al final de la aceleración. La pose de la home es un
 * teleobjetivo de 35°; abrirlo a 50° mientras la cámara cae es lo que hace
 * que los laterales parezcan envolver al observador y que el cuerpo crezca
 * más deprisa de lo que la distancia sola justificaría.
 */
const VOYAGE_FOV = 50;
/**
 * A cuántos radios del cuerpo se detiene la caída. A 3.2 radios y 50° el
 * diámetro del destino ronda dos tercios del alto del cuadro, y la
 * compresión del centro que hace el shader durante la distorsión lo lleva al
 * 93 %: ocupa gran parte del viewport sin que el visitante pierda de vista qué
 * es, y el anillo de luz queda todavía dentro del cuadro.
 */
const VOYAGE_STOP_RADII = 3.2;
/** Con Gargantúa se para al borde del disco: el destino es la propia sombra. */
const VOYAGE_GARGANTUA_STOP = DISK_OUTER * 1.35;
/**
 * Alabeo del cuadro durante la distorsión, en radianes (3,4°).
 *
 * Entre 1,35 s y el pico la aceleración ya vale 1 y la cámara se quedaba
 * CLAVADA: siete décimas de distorsión sin un solo movimiento debajo. Cerrar
 * más la distancia de parada era lo obvio y está descartado con números — el
 * anillo de Einstein se dibuja a 1,08 limbos y el limbo ya llega al borde del
 * cuadro con la compresión del shader, así que acercarse más echa el anillo
 * fuera de pantalla y con él toda la lente.
 *
 * El alabeo no tiene ese problema: girar el cuadro sobre el eje de la mirada
 * no cambia ni el tamaño aparente del destino ni el radio del anillo. Es el
 * único grado de libertad que queda gratis, y además es el correcto — el
 * espacio se dobla y la nave rueda con él. La mirada ya está en el centro del
 * cuerpo cuando el alabeo entra, así que el cuadro gira ALREDEDOR del destino.
 */
const VOYAGE_ROLL = 0.06;
/** Muestras del desenfoque radial por nivel. Ver `createVoyagePass`. */
const VOYAGE_TAPS: Record<QualityTier, number> = { orbit: 8, deep: 12 };

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
 * de cámara.
 *
 * Hasta 2026-09-28 lo hacía con la elipse estructural estirada a lo alto
 * (×0.72 de ancho, ×1.05 de alto), y eso dejaba el sistema a merced de las
 * fases: franjas muertas arriba y abajo, Edmunds montado sobre el disco y la
 * Ranger al borde del raíl. Ahora cada cuerpo cae en el punto de pantalla que
 * dice la tabla `portrait` de `lib/flat-composition.ts` —la MISMA que usa el
 * atlas plano—, dentro del escenario libre entre cabecera y raíl. La cámara
 * sólo encuadra el disco; los cinco cuerpos se colocan después sobre su rayo.
 *
 * 0.8 y no 0.75: una tablet en vertical (768 × 1024, 810 × 1080) mide 0.75
 * exacto y caía en el encuadre apaisado, con el sistema en una franja central
 * y media pantalla vacía.
 */
const PORTRAIT_ASPECT = 0.8;
/**
 * Qué parte del radio del disco tiene que caber a lo ancho. Con los cuerpos
 * fuera de la medida el disco es lo único que encuadra, y a 0.78 la cámara se
 * acercaba tanto que el remolino desbordaba los dos bordes y aplastaba a sus
 * vecinos; a 0.9 las puntas del disco siguen tocando el borde y el sistema
 * respira alrededor.
 */
const PORTRAIT_DISK_FRAME = 0.9;
/**
 * Proporción más ancha a la que el disco sigue llenando el ancho. Un móvil
 * mide 0.45-0.56; una tablet en vertical, 0.75, y ahí un disco de lado a lado
 * medía 770 px y arrastraba a los cinco cuerpos al mismo tamaño. Por encima de
 * esta proporción el disco se ata al ALTO y deja aire a los lados.
 */
const PORTRAIT_DISK_MAX_ASPECT = 0.52;
/**
 * Tamaño de los cinco cuerpos en vertical, sobre su tamaño de escritorio.
 *
 * El encuadre vertical lo manda el ancho del disco y no el sistema, así que la
 * cámara queda más cerca que en apaisado y los cuerpos saldrían a su escala de
 * escritorio sobredimensionados: el Tesseracto chocaba con la cabecera y la
 * Endurance llenaba media columna. La escala es común a los cinco, así que la
 * jerarquía entre ellos (bodies.test.ts) no cambia.
 */
const PORTRAIT_BODY_SCALE = 0.92;
/**
 * Refuerzo de las dos naves en vertical, sobre `PORTRAIT_BODY_SCALE`.
 *
 * Primera valoración del dueño (2026-09-29): «Endurance y Ranger pierden
 * protagonismo; la Ranger aparece pequeña y aislada». En escritorio su tamaño
 * lo sostienen la órbita y el rótulo; en un móvil no hay ni lo uno ni lo otro,
 * y una lanzadera de perfil mide una fracción de un planeta del mismo radio
 * envolvente. Sólo en vertical: la jerarquía de escritorio no se toca.
 */
const PORTRAIT_EMPHASIS: Partial<Record<WorldId, number>> = {
  ranger: 1.5,
  endurance: 1.1,
};

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
  // Media resolución en un rasterizador por software: ver `SOFTWARE_RENDER_SCALE`.
  const renderScale = isSoftwareRenderer(rendererName(gl)) ? SOFTWARE_RENDER_SCALE : 1;

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
    uniforms: createMarchUniforms(tier),
  });
  marchScene.add(new THREE.Mesh(quadGeometry, marchMaterial));

  /*
    Banco de pruebas visual. En producción es el banco completo para todo el
    mundo y no hay forma de que deje de serlo sin escribir la clave a mano: ver
    la nota de lib/visual-bench.ts sobre por qué esto NO es sniffing del
    auditor.

    Se lee UNA vez, al montar la escena. No es reactivo a propósito — lo usa
    `tools/shot.mjs` para capturar el mismo cuadro con y sin glow, y una captura
    no cambia de opinión a mitad.

    Se lee AQUÍ ARRIBA, antes que nada, porque ahora también decide si hay
    acumulación temporal, y eso se resuelve al construir la cadena de post.
  */
  const bench = readVisualBench();
  // Los modos de diagnóstico del disco (gris de densidad, sólo directa, sólo
  // lensada) viven en el mismo banco y se fijan una vez: ver visual-bench.ts.
  marchMaterial.uniforms.uDiag.value = diagnosticCode(bench);

  // === Acumulación temporal ================================================
  const canAccumulate = canFloat && bench.accumulate;
  let historyRead = new THREE.WebGLRenderTarget(1, 1, HISTORY_TARGET);
  let historyWrite = new THREE.WebGLRenderTarget(1, 1, HISTORY_TARGET);

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
        if (material.uniforms.uEmission) {
          material.uniforms.uEmission.value = bench.emission;
        }
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
    aquí no le quita nada: sólo garantiza que los cinco cuerpos se ordenan entre
    ellos y con nadie más.
  */
  bodyPass.clearDepth = true;
  composer.addPass(bodyPass);

  /*
    La copia SIN bloom, y por qué va aquí y no en otro sitio.

    `UnrealBloomPass` compone su halo con mezcla ADITIVA sobre el mismo búfer
    que acaba de leer: después de él ya no existe en ninguna parte la imagen
    previa. La guarda de la sombra la necesita entera —no un umbral ni una
    aproximación— así que se copia justo antes, con los cuerpos ya dibujados.
    Cuesta un blit y un render target de media precisión; el raymarch de al lado
    gasta entre 190 y 340 pasos por píxel.

    Sólo existe si hay bloom que guardar: sin `canFloat` el halo está apagado y
    la cadena vuelve a ser exactamente la de antes.
  */
  const savePass = canFloat
    ? new SavePass(
        // Sin profundidad ni stencil: aquí sólo se guarda color. El destino por
        // defecto de `SavePass` los reserva y no los usa nadie.
        new THREE.WebGLRenderTarget(1, 1, {
          type: THREE.HalfFloatType,
          depthBuffer: false,
          stencilBuffer: false,
        }),
      )
    : null;
  if (savePass) composer.addPass(savePass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(1, 1),
    BLOOM[tier].strength,
    BLOOM[tier].radius,
    BLOOM_THRESHOLD,
  );
  composer.addPass(bloomPass);

  const shadowGuardPass = savePass
    ? new ShaderPass({
        name: "ShadowGuard",
        uniforms: createShadowGuardUniforms(),
        vertexShader: GARGANTUA_VERTEX,
        fragmentShader: SHADOW_GUARD_FRAGMENT,
      })
    : null;
  if (shadowGuardPass && savePass) {
    shadowGuardPass.uniforms.tClean.value = savePass.renderTarget.texture;
    composer.addPass(shadowGuardPass);
  }

  // La travesía dobla la imagen ENTERA —raymarch, cuerpos y halo— en lineal,
  // antes del tone mapping. Deshabilitado en reposo: cuesta cero.
  const { pass: voyagePass, uniforms: voyageUniforms } = createVoyagePass(
    VOYAGE_TAPS[tier],
  );
  composer.addPass(voyagePass);

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
  /**
   * El paralaje se PARA mientras hay un destino adquirido.
   *
   * Es la otra mitad del fallo de puntero. El paralaje mueve el sistema entero
   * hasta 1.5° siguiendo al ratón, y a la distancia de encuadre eso son unas
   * decenas de píxeles en pantalla; además llega suavizado, con una constante
   * de 0.32 s, así que sigue derivando casi un segundo después de que el ratón
   * se pare. El resultado sobre un cuerpo pequeño era que el planeta se
   * escurría por debajo de un cursor QUIETO y el hover se apagaba solo, sin que
   * el visitante hubiera movido nada. Apuntar movía el blanco.
   *
   * Al adquirir se congela el objetivo en el ángulo actual —no en cero: la
   * cámara no vuelve a su sitio, se queda donde está— y se ignoran los
   * movimientos del puntero hasta soltar. Es la regla de siempre de esta
   * escena: la interfaz manda sobre la atmósfera. Y no hay oscilación posible,
   * porque adquirir siempre termina en un estado inmóvil.
   */
  let parallaxHeld = false;
  let frameDistance = 120;

  /**
   * La travesía en curso. Mientras existe, la cámara se orienta en cada
   * fotograma a partir de la muestra de la línea de tiempo: primero se vuelve
   * hacia el destino (lock), después cae hacia él abriendo el campo
   * (approach), y el paso de post-proceso dobla el espacio a su alrededor
   * (warp, flash). Es una transición guionada sobre la pose de la ruta —§3,
   * regla 2—, no un controlador: nadie escribe en `pose`.
   */
  let voyage: { id: WorldId; startedAt: number; flavour: VoyageFlavour } | null =
    null;
  let voyageSample: VoyageSample | null = null;
  let voyageTarget: SceneBody | null = null;
  const voyageTargetPosition = new THREE.Vector3();
  const voyageDirection = new THREE.Vector3();
  let voyageTargetRadius = 0;
  /** Campo de visión efectivo: el de la pose, salvo durante la caída. */
  let currentFov = pose.fov;
  let cssWidth = 1;
  let cssHeight = 1;
  let pixelWidth = 1;
  let pixelHeight = 1;

  /*
    El escenario de la composición vertical, en píxeles CSS: lo que ocupan la
    cabecera arriba y el raíl abajo. Lo publica el CSS de la home como dos
    longitudes registradas (`--home-stage-top` / `--home-stage-bottom`), así
    que el valor ya llega resuelto a px con el área segura incluida. Fuera de
    la home —o en un navegador sin `@property`— valen 0 y el escenario es el
    viewport entero.
  */
  let stageTop = 0;
  let stageBottom = 0;

  function readStage() {
    const style = getComputedStyle(canvas.ownerDocument.documentElement);
    const px = (name: string) => {
      const raw = style.getPropertyValue(name).trim();
      const value = raw.endsWith("px") ? parseFloat(raw) : 0;
      return Number.isFinite(value) ? Math.max(0, value) : 0;
    };
    stageTop = px("--home-stage-top");
    stageBottom = px("--home-stage-bottom");
  }

  /** Dónde cae un destino en vertical, en NDC, según la tabla compartida. */
  function portraitNdc(id: WorldId): { x: number; y: number } {
    const { x, y } = flatCompositionFor(id).portrait;
    // Nunca menos de medio viewport de escenario: si alguien sube el raíl a
    // tres filas en un móvil apaisado el sistema se aprieta, no se invierte.
    const span = Math.max(
      cssHeight * 0.5,
      cssHeight - stageTop - stageBottom,
    );
    const top = Math.min(stageTop, cssHeight - span);
    return {
      x: (x / 100) * 2 - 1,
      y: 1 - ((top + (y / 100) * span) / cssHeight) * 2,
    };
  }

  /** Qué fracción del alto es escenario, y dónde cae su centro en NDC. */
  function stageFrame(): { span: number; centre: number } {
    const span = Math.max(0.5, 1 - (stageTop + stageBottom) / cssHeight);
    const top = Math.min(stageTop / cssHeight, 1 - span);
    return { span, centre: 1 - (top + span / 2) * 2 };
  }

  /** Corrimiento de la mirada: en vertical lo pone el escenario, no la pose. */
  function shiftX(aspect: number): number {
    return aspect < PORTRAIT_ASPECT ? 0 : pose.targetShiftFraction;
  }

  function shiftY(aspect: number): number {
    // Mirar por encima del origen lo baja en pantalla: para dejar Gargantúa
    // en su punto del escenario hay que mirar a su simétrico.
    if (aspect < PORTRAIT_ASPECT) return -portraitNdc("gargantua").y;
    // En apaisado la pose manda, pero DENTRO del escenario: sin cabecera ni
    // raíl declarados (escritorio) esto es exactamente la pose.
    const stage = stageFrame();
    return -stage.centre + pose.targetShiftYFraction * stage.span;
  }

  /** Posiciones compuestas en vertical; las escribe `setCompositionFrame`. */
  const portraitPositions = new Map<WorldId, THREE.Vector3>();
  /** Escala de cada cuerpo: la de vertical con su refuerzo, o 1. */
  const bodyScales = new Map<WorldId, number>();
  const scaleOf = (id: WorldId) => bodyScales.get(id) ?? 1;

  function baseBodyPosition(
    body: SceneBody,
    aspect: number,
    target: THREE.Vector3,
  ): THREE.Vector3 {
    if (aspect < PORTRAIT_ASPECT) {
      const composed = portraitPositions.get(body.id);
      if (composed) return target.copy(composed);
    }
    return orbitalPosition(body.placement, 0, target);
  }

  function composedBodyPosition(
    body: SceneBody,
    aspect: number,
    referenceCameraPosition: THREE.Vector3,
    target: THREE.Vector3,
  ): THREE.Vector3 {
    baseBodyPosition(body, aspect, target);
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
    const portrait = aspect < PORTRAIT_ASPECT;
    const tanHalfWidth =
      tanHalfFov *
      Math.max(portrait ? Math.min(aspect, PORTRAIT_DISK_MAX_ASPECT) : aspect, 0.2) *
      (1 - Math.abs(shiftX(aspect)));
    // En vertical sólo se encuadra el disco, que es plano: basta con no
    // salirse del cuadro. En apaisado el sistema entero tiene que caber en el
    // escenario, y el escenario es la parte del alto que no tapan cabecera y
    // raíl (el 100 % en escritorio).
    const tanHalfHeight = portrait
      ? tanHalfFov * (1 - Math.abs(shiftY(aspect)))
      : tanHalfFov *
        stageFrame().span *
        (1 - Math.abs(pose.targetShiftYFraction));
    // Un escenario declarado es la home estrecha, y ahí no hay rótulos
    // anclados a los cuerpos: el margen de escritorio sólo encogería el sistema.
    const compact = portrait || stageTop + stageBottom > 0;
    const frameMargin = compact ? PORTRAIT_FRAME_MARGIN : FRAME_MARGIN;

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

    // En vertical los cuerpos no entran en la medida: se colocan DESPUÉS, en su
    // punto del escenario, y ese punto ya está dentro del cuadro por tabla.
    for (const body of portrait ? [] : bodies) {
      // Una sola muestra por cuerpo, porque el sistema está QUIETO.
      //
      // Antes se recorrían 48 fases de cada órbita: había que garantizar que
      // ningún destino saliera de cuadro en ningún momento de su vuelta, y eso
      // obligaba a encuadrar la unión de las cinco elipses enteras. El precio lo
      // pagaba Gargantúa — la cámara se iba a 90 rs para dejar sitio a
      // posiciones que ningún visitante llegaba a ver.
      //
      // Con las posiciones congeladas el encuadre solo tiene que encajar cinco
      // puntos, y eso acerca la cámara de 90 a 73 rs. El disco pasa del 35 % al
      // 42 % del ancho del cuadro sin tocar una sola constante de tamaño.
      baseBodyPosition(body, aspect, point);
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

  /** Las trazas orbitales sólo se dibujan en apaisado (ver `applyPose`). */
  function orbitsFitViewport(aspect: number): boolean {
    return aspect >= PORTRAIT_ASPECT;
  }

  /**
   * Encuadre y orientación, separados a propósito.
   *
   * `measureFrameDistance` recorre el disco y los cinco cuerpos en sus posiciones
   * congeladas. Eso está bien al redimensionar o al cambiar de ruta, pero el
   * paralaje suavizado mueve la cámara en CADA fotograma y
   * ahí ese coste no pinta nada — la distancia de encuadre no depende del
   * paralaje, sólo de la pose y del aspecto. Así que se mide cuando cambian
   * esos dos y se orienta sesenta veces por segundo.
   */
  function applyPose(aspect: number) {
    readStage();
    const portrait = aspect < PORTRAIT_ASPECT;
    for (const body of bodies) {
      const scale = portrait
        ? PORTRAIT_BODY_SCALE * (PORTRAIT_EMPHASIS[body.id] ?? 1)
        : 1;
      bodyScales.set(body.id, scale);
      body.object.scale.setScalar(scale);
    }
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
      body.orbit.visible = orbitsFitViewport(aspect);
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
      .multiplyScalar(-halfWidth * shiftX(aspect))
      .addScaledVector(compositionBaseUp, halfHeight * shiftY(aspect));
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

    /*
      La composición NO alabea con la travesía, y esto es el contrato entero:
      aquí se decide dónde se COLOCAN los cuerpos en el mundo para que caigan
      en el sitio compuesto de la pantalla. Si rodara con la cámara, los
      cuerpos rodarían con ella, el alabeo se cancelaría a la vista y de paso
      cada destino se movería en el mundo a mitad de viaje —con él, su
      proyección y su blanco de clic—. Rueda la cámara; el sistema, no.
    */
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

    /*
      Vertical: cada cuerpo, sobre el rayo que pasa por su punto del escenario.

      Se coloca en el plano de la mirada —a la distancia del blanco— con la
      misma base alabeada con la que dibuja la cámara, así que en reposo cae
      EXACTAMENTE en su píxel. Después la capa de profundidad lo desliza sobre
      ese mismo rayo, que es lo que ya hacía: cambia su tamaño y su orden en z,
      nunca su sitio en pantalla.
    */
    portraitPositions.clear();
    if (aspect < PORTRAIT_ASPECT) {
      const depth = compositionTarget.distanceTo(compositionCameraPosition);
      for (const body of bodies) {
        const ndc = portraitNdc(body.id);
        portraitPositions.set(
          body.id,
          new THREE.Vector3()
            .copy(compositionCameraPosition)
            .addScaledVector(compositionForward, depth)
            .addScaledVector(compositionRight, ndc.x * depth * tanHalf * aspect)
            .addScaledVector(compositionUp, ndc.y * depth * tanHalf),
        );
      }
    }

    for (const body of bodies) {
      baseBodyPosition(body, aspect, compositionBasePosition);
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

    const tanHalfPose = Math.tan((pose.fov * Math.PI) / 360);
    const halfWidth = frameDistance * tanHalfPose * aspect;
    const halfHeight = frameDistance * tanHalfPose;
    // Mirar a la IZQUIERDA del agujero negro lo empuja a la derecha del cuadro,
    // y mirar por ENCIMA lo empuja hacia abajo.
    cameraTarget
      .copy(right)
      .multiplyScalar(-halfWidth * shiftX(aspect))
      .addScaledVector(up, halfHeight * shiftY(aspect));

    /*
      La travesía, encima de la pose y sin tocarla.

      La mirada se lleva al centro del destino durante el bloqueo, y después
      la cámara cae por la recta que la une con él hasta detenerse a unos
      radios de su superficie, mientras el campo se abre. Cuando `voyage` es
      null nada de esto existe y la cámara es exactamente la de la pose.
    */
    let fov = pose.fov;
    if (voyage && voyageSample) {
      cameraTarget.lerp(voyageTargetPosition, voyageSample.lock);
      voyageDirection.subVectors(voyageTargetPosition, cameraPosition);
      const distance = voyageDirection.length();
      if (distance > 1e-6) {
        voyageDirection.divideScalar(distance);
        const stop =
          voyage.id === "gargantua"
            ? VOYAGE_GARGANTUA_STOP
            : Math.max(voyageTargetRadius * VOYAGE_STOP_RADII, 1);
        cameraPosition.addScaledVector(
          voyageDirection,
          Math.max(0, distance - stop) * voyageSample.approach,
        );
      }
      fov += (VOYAGE_FOV - pose.fov) * voyageSample.approach;
    }
    currentFov = fov;
    const tanHalfFov = Math.tan((fov * Math.PI) / 360);

    // Base definitiva, ya con la mirada corrida.
    forward.copy(cameraTarget).sub(cameraPosition).normalize();
    right.crossVectors(forward, WORLD_UP).normalize();
    up.crossVectors(right, forward).normalize();

    // El alabeo de la travesía se suma al de la pose y desaparece con ella:
    // fuera de un viaje `voyageSample` es null y el cuadro es el de siempre.
    const roll = pose.roll + VOYAGE_ROLL * (voyageSample?.warp ?? 0);
    const cos = Math.cos(roll);
    const sin = Math.sin(roll);
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
    bodyCamera.fov = fov;
    bodyCamera.aspect = aspect;
    bodyCamera.near = Math.max(0.1, frameDistance * 0.02);
    bodyCamera.far = frameDistance * 4;
    bodyCamera.updateProjectionMatrix();
    bodyCamera.updateMatrixWorld();

    renderer.toneMappingExposure = BASE_EXPOSURE * pose.exposure;
    bloomPass.strength = BLOOM[tier].strength * pose.bloom * bench.bloom;

    measureCentreLabelDrop();
    measureShadowGate(aspect, tanHalfFov);
  }

  /**
   * Dónde cae la sombra en pantalla, para la guarda del bloom.
   *
   * Se resuelve con la MISMA base que arma los rayos del raymarch —`forward`,
   * `rolledRight`, `rolledUp`, `tanHalfFov`, `aspect`— y no con la matriz de
   * `bodyCamera`. Las dos coinciden hoy y podrían dejar de coincidir mañana; la
   * sombra la dibuja el shader, así que la puerta se mide en su geometría.
   *
   * El semieje sale de proyectar dos puntos del borde: el disco de la sombra
   * visto de canto es la esfera de radio `SHADOW_IMPACT` centrada en el origen,
   * y basta un punto a cada lado para saber cuánto ocupa. Así el número sigue
   * siendo correcto si cambian el encuadre, el campo de visión o el viewport,
   * sin ninguna constante calibrada a ojo.
   */
  const shadowScratch = new THREE.Vector3();
  const shadowEdge = new THREE.Vector3();
  const shadowNdc = new THREE.Vector2();
  const shadowNdcEdge = new THREE.Vector2();

  function projectToNdc(
    point: THREE.Vector3,
    aspect: number,
    tanHalfFov: number,
    out: THREE.Vector2,
  ) {
    shadowScratch.copy(point).sub(cameraPosition);
    const depth = Math.max(shadowScratch.dot(forward), 1e-3);
    out.set(
      shadowScratch.dot(rolledRight) / (depth * aspect * tanHalfFov),
      shadowScratch.dot(rolledUp) / (depth * tanHalfFov),
    );
  }

  function measureShadowGate(aspect: number, tanHalfFov: number) {
    if (!shadowGuardPass) return;

    projectToNdc(shadowEdge.set(0, 0, 0), aspect, tanHalfFov, shadowNdc);
    const uniforms = shadowGuardPass.uniforms;
    uniforms.uCentre.value.set(shadowNdc.x * 0.5 + 0.5, shadowNdc.y * 0.5 + 0.5);

    shadowEdge.copy(rolledRight).multiplyScalar(SHADOW_IMPACT);
    projectToNdc(shadowEdge, aspect, tanHalfFov, shadowNdcEdge);
    const radiusX = Math.abs(shadowNdcEdge.x - shadowNdc.x) * 0.5;

    shadowEdge.copy(rolledUp).multiplyScalar(SHADOW_IMPACT);
    projectToNdc(shadowEdge, aspect, tanHalfFov, shadowNdcEdge);
    const radiusY = Math.abs(shadowNdcEdge.y - shadowNdc.y) * 0.5;

    uniforms.uRadius.value.set(radiusX, radiusY);
  }

  let accumulated = 0;
  function resetAccumulation() {
    accumulated = 0;
  }
  /*
    ¿SE HA MOVIDO LA CÁMARA EN ESTE FOTOGRAMA?

    La acumulación temporal del raymarch sólo es válida con la cámara quieta:
    el historial describe ESTE píxel desde ESTA pose. `temporalBlend` ya lo
    contempla —sube el peso de la mezcla mientras algo se mueve, en vez de
    reproyectar, que sería TAA de motor de juego— pero hasta ahora la única
    cosa que se declaraba en movimiento era la travesía.

    Y el paralaje también mueve la cámara. Hasta grado y medio, suavizado con
    una constante de 0.32 s, o sea decenas de fotogramas en los que el
    historial se mezcla al 82 % con la pose ANTERIOR. Sobre un cielo hecho de
    puntos de un píxel eso no se ve como un suavizado: se ve como que cada
    estrella arrastra una cola en la dirección del ratón. El dueño lo dijo
    tal cual —«el campo estelar sigue deformándose con el movimiento del MOUSE
    aunque esté fuera de la órbita de Gargantúa»— y es la MITAD del «warp
    speed» que abrió el pase del cielo: la otra mitad era el lente, y ésta
    sólo aparece en movimiento, así que ninguna captura estática la enseña.

    El flag se levanta en el mismo sitio donde se decide reorientar y se baja
    al final del fotograma. Cuando el paralaje llega a su destino —por debajo
    de una diezmilésima— deja de levantarse y la acumulación vuelve a
    converger, que es exactamente lo que ya hacía con el ratón quieto.
  */
  let cameraMoved = false;

  function endVoyage() {
    voyage = null;
    voyageSample = null;
    voyageTarget = null;
    voyagePass.enabled = false;
    currentFov = pose.fov;
  }

  function resize() {
    const width = Math.max(1, canvas.clientWidth || canvas.offsetWidth || 0);
    const height = Math.max(1, canvas.clientHeight || canvas.offsetHeight || 0);
    const dpr = Math.min(window.devicePixelRatio || 1, TIER[tier].dpr) * renderScale;

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
  let covered = false;
  /** Los programas todavía compilan en paralelo: nadie arranca el bucle. */
  let warming = true;
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
   * TODA la mitad izquierda del sistema —tres de los cinco destinos— colgaba su
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
    // que los seis marcadores salían del mismo tamaño y el anillo flotaba
    // alrededor de un punto. El tamaño del blanco lo resuelve el CSS con
    // relleno; aquí se dice la verdad sobre el cuerpo.
    const distance = cameraPosition.distanceTo(body.position);
    const tanHalfFov = Math.tan((currentFov * Math.PI) / 360);
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
    const orbitsVisible =
      orbitsFitViewport(cssWidth / cssHeight) &&
      (voyageSample?.approach ?? 0) < 0.02;

    for (const body of bodies) {
      /*
        POSICIÓN CONGELADA.

        Los cuerpos ya no recorren su órbita. No es una limitación técnica: es
        dirección de arte. Cinco objetos deslizándose sin parar sobre cinco elipses
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
        el más exterior, que en pantalla es ninguna. Cinco cuerpos igual de
        iluminados se leen como cinco calcomanías pegadas al mismo cristal — era
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

      /*
        Bloqueo de objetivo (travesía): el destino gana luz y emisión, los
        demás bajan un poco de intensidad. Es lo que dice «vamos hacia ahí»
        antes de que la cámara se mueva, y se hace con los uniformes que ya
        existen — ni un draw ni un uniforme nuevos.
      */
      const lock = voyageSample?.lock ?? 0;
      const travelling = voyage !== null && voyage.id === body.id;
      // Poco, a propósito: el destino ya lleva el foco de navegación y va a
      // llenar el cuadro. Con 0.35 de luz y 0.8 de emisión Miller salía lavado.
      const lightScale = travelling ? 1 + 0.15 * lock : 1 - 0.38 * lock;
      const emissionScale = travelling ? 1 + 0.4 * lock : 1 - 0.3 * lock;

      // Las trazas orbitales se retiran en cuanto la cámara empieza a caer:
      // una cinta que pasa a un radio de la cámara es un garabato de un píxel
      // de ancho cruzando el cuadro entero.
      body.orbit.visible = orbitsVisible;

      // Un cuerpo lleva ahora hasta dos materiales —superficie y halo— y no
      // comparten uniformes: el halo no sabe nada de cámara ni de luz. Se
      // escribe lo que cada uno declara y punto.
      for (const material of body.materials) {
        const uniforms = material.uniforms;
        uniforms.uTime.value = seconds;
        uniforms.uCamPos?.value.copy(cameraPosition);
        if (uniforms.uLightIntensity) {
          uniforms.uLightIntensity.value = light * lightScale;
        }
        if (uniforms.uEmission) {
          uniforms.uEmission.value = bench.emission * emissionScale;
        }
      }

      let hitScaleX = 1;
      let hitScaleY = 1;
      if (body.visual === "ship") {
        // La Endurance se muestra ahora a 51.2° de frontal en vez de a 60°: la
        // elipse del anillo es bastante menos achatada y el blanco tiene que
        // seguirla, o el clic falla justo en los grupos de módulos de arriba y
        // abajo, que es donde el ojo apunta. El pase de fase 1 le devolvió 4.0°
        // de compresión (47.8 → 51.2) para separar los grupos por luz, y este
        // 0.60 es el coseno de ese ángulo con un punto de holgura: el blanco
        // sigue a la pose.
        hitScaleX = 0.82;
        hitScaleY = 0.60;

      }
      projected.push(
        project({
          id: body.id,
          position,
          radius: body.radius * scaleOf(body.id),
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

    if (voyage) {
      /*
        La travesía se muestrea por reloj real, no por fotograma: si el equipo
        va a 30 fps la caída dura lo mismo, sólo se ve con menos muestras. Y la
        cámara se orienta en CADA fotograma, porque aquí sí se mueve.
      */
      voyageSample = sampleVoyage((timestamp - voyage.startedAt) / 1000);
      if (voyageTarget) {
        voyageTargetPosition.copy(voyageTarget.object.position);
        voyageTargetRadius = voyageTarget.radius * scaleOf(voyageTarget.id);
      } else {
        voyageTargetPosition.set(0, 0, 0);
        voyageTargetRadius = centreRadii.get(voyage.id) ?? 2.6;
      }
      orientCamera(width / Math.max(height, 1));
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
      if (
        !voyage &&
        (Math.abs(nextX - parallaxX) > 1e-4 || Math.abs(nextY - parallaxY) > 1e-4)
      ) {
        parallaxX = nextX;
        parallaxY = nextY;
        cameraMoved = true;
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

    /*
      El reloj de la escena, que en producción es SIEMPRE `elapsed`.

      Clavarlo es lo que permite auditar el envejecimiento del disco: su
      enrollado depende del tiempo transcurrido y su fallo tardaba minutos en
      aparecer, así que una suite que solo mira el arranque no lo veía. Con el
      reloj fijo, «a las seis horas» es una captura, no una espera.
    */
    const clock = bench.clock ?? elapsed;
    marchMaterial.uniforms.uTime.value = clock;
    updateBodies(clock);

    if (voyage && voyageSample) {
      // El centro de la distorsión es el destino PROYECTADO, no el centro de
      // la pantalla: la realidad se dobla hacia donde está el cuerpo y la
      // cámara va corrigiendo hasta centrarlo.
      const destination = voyage.id;
      const hit = projected.find((entry) => entry.id === destination);
      if (hit) {
        voyageUniforms.uCentre.value.set(hit.x / cssWidth, 1 - hit.y / cssHeight);
        const radius =
          destination === "gargantua"
            ? hit.radius * 1.4
            : Math.max(hit.hitRadiusX ?? 0, hit.hitRadiusY ?? 0, hit.radius);
        voyageUniforms.uRadius.value = radius / cssHeight;
      }
      voyageUniforms.uAspect.value = cssWidth / cssHeight;
      voyageUniforms.uLock.value = voyageSample.lock;
      voyageUniforms.uApproach.value = voyageSample.approach;
      voyageUniforms.uWarp.value = voyageSample.warp;
      voyageUniforms.uFlash.value = voyageSample.flash;
      voyageUniforms.uTime.value = clock;
      voyagePass.enabled = true;
    } else {
      voyagePass.enabled = false;
    }

    try {
      if (canAccumulate) {
        const [jx, jy] = JITTER[accumulated % JITTER.length];
        marchMaterial.uniforms.uJitter.value.set(jx / pixelWidth, jy / pixelHeight);
        marchMaterial.uniforms.uBlend.value = temporalBlend(
          accumulated,
          voyage !== null || cameraMoved,
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
    cameraMoved = false;
  }

  function handleVisibility() {
    if (document.hidden || covered) {
      if (frameHandle) cancelAnimationFrame(frameHandle);
      frameHandle = 0;
    } else if (!frameHandle && !disposed && !warming) {
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

  /*
    Los programas se compilan en paralelo ANTES del primer fotograma.

    El raymarch de Gargantúa son ~140 KB de GLSL. Compilado dentro del primer
    `render()`, ANGLE sobre D3D11 bloqueaba el hilo principal 2,7 s seguidos en
    un portátil con GPU integrada (perfil del 2026-09-28), y Lighthouse en móvil
    medía 7,9 s de TBT: la portada dejaba de responder justo al llegar.
    `compileAsync` usa KHR_parallel_shader_compile y ESPERA sin bloquear;
    mientras, se ve el cielo 2D. Sin la extensión (Firefox) no hay nada que
    ganar —compilar es bloquear igual— y sólo adelantaría el bloqueo antes de
    que se monte el cielo: se arranca como siempre y compila el primer
    fotograma.

    Se compila con un render target activo porque los tres pases pintan en uno
    (la historia o el composer) y el programa depende de ello —espacio de color
    y tone mapping—: compilados contra la pantalla serían OTROS programas.
  */
  const startLoop = () => {
    warming = false;
    // Oculta o cubierta, lo arrancará `handleVisibility` al volver.
    if (disposed || frameHandle || document.hidden || covered) return;
    frameHandle = requestAnimationFrame(renderFrame);
  };
  if (renderer.extensions.has("KHR_parallel_shader_compile")) {
    renderer.setRenderTarget(historyWrite);
    const compiled = Promise.all([
      renderer.compileAsync(marchScene, quadCamera),
      renderer.compileAsync(bodyScene, bodyCamera),
      canAccumulate ? renderer.compileAsync(displayScene, quadCamera) : null,
    ]);
    renderer.setRenderTarget(null);
    void compiled.catch(() => undefined).then(startLoop);
  } else {
    startLoop();
  }

  return {
    setCovered(next) {
      covered = next;
      canvas.dataset.covered = String(next);
      handleVisibility();
    },
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
      // Cambiar de pose termina cualquier travesía: la ruta ya cambió y su
      // pose manda. Es la mitad de «la animación nunca es dueña del router».
      endVoyage();
      const wasAnimated = pose.animated;
      pose = next;
      applyPose(cssWidth / cssHeight);
      resetAccumulation();
      // Al volver a una pose animada hay que reanimar el bucle si estaba en
      // modo congelado y se había quedado esperando el próximo refresco.
      if (!wasAnimated && next.animated) lastFrozenDraw = 0;
    },
    setFocus(id) {
      // Con una travesía en marcha el destino es dueño del foco: el mapa deja
      // de recibir puntero y el `pointerleave` que eso provoca no puede apagar
      // el cuerpo al que se está viajando.
      if (voyage) return;

      for (const body of bodies) {
        const focus = body.id === id ? 1 : 0;
        for (const material of body.materials) {
          material.uniforms.uFocus.value = focus;
        }
      }

      // Un destino adquirido —por puntero, por raíl o por teclado— congela el
      // paralaje donde esté. Ver la nota de `parallaxHeld`.
      const held = id !== null;
      if (held && !parallaxHeld) {
        parallaxTargetX = parallaxX;
        parallaxTargetY = parallaxY;
      }
      parallaxHeld = held;
    },
    setVoyage(next) {
      if (next === null) {
        if (!voyage) return;
        endVoyage();
        // Los cuerpos vuelven a su luz y el foco lo decide otra vez el DOM.
        for (const body of bodies) {
          body.orbit.visible = orbitsFitViewport(cssWidth / cssHeight);
          for (const material of body.materials) {
            material.uniforms.uFocus.value = 0;
          }
        }
        parallaxHeld = false;
        orientCamera(cssWidth / cssHeight);
        return;
      }

      voyage = {
        id: next.id,
        startedAt: next.startedAt,
        flavour: voyageFlavourFor(next.id),
      };
      voyageTarget = bodies.find((body) => body.id === next.id) ?? null;
      voyageSample = sampleVoyage(0);

      const tint = voyageTintFor(next.id).linear;
      voyageUniforms.uTint.value.set(tint[0], tint[1], tint[2]);
      const { lens, liquid, grid, dark } = voyage.flavour;
      voyageUniforms.uFlavour.value.set(lens, liquid, grid, dark);

      // El destino se queda con el foco y el paralaje se congela donde esté:
      // desde aquí la cámara sólo obedece a la línea de tiempo.
      for (const body of bodies) {
        const focus = body.id === next.id ? 1 : 0;
        for (const material of body.materials) {
          material.uniforms.uFocus.value = focus;
        }
      }
      parallaxTargetX = parallaxX;
      parallaxTargetY = parallaxY;
      parallaxHeld = true;
      lastFrozenDraw = 0;
    },
    setParallax(x, y) {
      if (!pose.animated || parallaxHeld) return;
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
      savePass?.dispose();
      shadowGuardPass?.dispose();
      voyagePass.dispose();
      bloomPass.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
