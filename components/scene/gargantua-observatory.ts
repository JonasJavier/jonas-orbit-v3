import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SavePass } from "three/examples/jsm/postprocessing/SavePass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import {
  diskRadiiInRs,
  gargantuaFraming,
  gargantuaTelemetry,
  GARGANTUA_VIEWS,
} from "@/lib/gargantua-views";
import { GARGANTUA_INSTRUMENTS } from "@/lib/observatory";
import { diagnosticCode, readVisualBench } from "@/lib/visual-bench";
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
  DISK_INNER,
  DISK_OUTER,
  DISPLAY_FRAGMENT,
  GARGANTUA_FRAGMENT,
  GARGANTUA_RS,
  GARGANTUA_VERTEX,
  SHADOW_GUARD_FRAGMENT,
} from "./gargantua-shaders";
import type { ObservatoryHandle, ObservatoryOptions } from "./observatory-scene";

/**
 * GARGANTÚA EN EL OBSERVATORIO: el único espécimen que no es una malla.
 *
 * Todo el laboratorio está construido alrededor de `createBody`, y para
 * Gargantúa esa función devuelve `null`: no tiene geometría. Lo que hay es un
 * raymarch de geodésicas sobre un cuad de pantalla completa, alimentado por una
 * base de cámara explícita —posición y tres vectores— en vez de por una
 * `PerspectiveCamera`.
 *
 * ── Qué se comparte con el System Map, y qué no ─────────────────────────────
 *
 * Se comparten **los números**: `gargantua-render.ts` tiene el nivel de
 * calidad, el bloom, la exposición, la tabla de Halton, la regla de mezcla, la
 * guarda de la sombra y la fábrica de uniformes. Ni una constante de Gargantúa
 * vive en dos sitios, y ésa es toda la garantía de que las dos superficies la
 * dibujan igual.
 *
 * No se comparte **el cableado**, y es deliberado. El mapa tiene cinco cuerpos
 * encima del raymarch, una travesía que dobla la imagen entera y una pose por
 * ruta; aquí hay cuatro vistas curadas y un bucle bajo demanda. Un módulo que
 * sirviera a los dos habría ido creciendo opciones hasta ser un objeto de
 * configuración — la forma habitual de romper lo que se pretendía proteger.
 *
 * ── Lo que este visor NO tiene ──────────────────────────────────────────────
 *
 *  · **Órbita libre.** No hay un solo manejador de puntero sobre el lienzo. El
 *    §7 lo cierra: durante el arrastre se perdería el supermuestreo que paga el
 *    acabado y, sobre todo, una órbita libre garantiza que alguien mirará el
 *    pase visual final desde un ángulo que nadie encuadró.
 *  · **Luz.** El espécimen es la fuente. No hay dial que ofrecer.
 *  · **Sonda.** No hay aristas que nombrar.
 *  · **Material.** `uEmission` vive en el material común de los cuerpos, y aquí
 *    no hay cuerpo.
 *  · **Cielo del Observatorio.** El raymarch dibuja su propio campo estelar y
 *    lo lensa; añadir la cáscara de `observatory-sky` sería pintar dos cielos,
 *    y el de fuera no se curvaría.
 */

/**
 * Cuántos fotogramas se siguen dibujando con todo quieto antes de parar.
 *
 * **Medido, no deducido.** Que la contribución del historial caiga como
 * `0.82^n` es aritmética y no dice cuándo deja de verse la diferencia en una
 * pantalla de ocho bits. El número sale de comparar la imagen a N fotogramas
 * contra la imagen ya asentada (`tools/observatory-shot.mjs --asentamiento`,
 * vista canónica, reloj congelado):
 *
 *   | promediados | media \|Δ\| | píxeles fuera de ±16 |
 *   | ----------- | ---------- | -------------------- |
 *   | 17          | 0.476      | 0.33 %               |
 *   | 34          | 0.102      | 0.007 %              |
 *   | 48          | —          | asentada             |
 *
 * A diecisiete fotogramas todavía quedan cuatro mil píxeles a más de dieciséis
 * niveles de su valor final: eso es moteado visible sobre el disco, no una
 * diferencia de laboratorio. A treinta y cuatro quedan noventa. Cuarenta y ocho
 * deja margen y son seis ciclos completos de las ocho posiciones de Halton, que
 * es la otra condición que tiene que cumplirse para que el supermuestreo esté
 * entero.
 *
 * Por debajo de este número el bucle sigue vivo aunque nadie toque nada, y eso
 * es exactamente lo que pide O12: *tras el asentamiento* el contador de renders
 * deja de avanzar. Con los cinco sólidos es inmediato porque no acumulan.
 *
 * ── Una trampa de medición, para quien vuelva a medir esto ──────────────────
 *
 * En Chromium headless `requestAnimationFrame` deja de dispararse cuando nada
 * fuerza un pintado — comprobado con un contador de rAF propio en la página,
 * que se queda clavado a los veintitantos ciclos. Así que esperar entre
 * capturas no deja pasar fotogramas, deja pasar tiempo. La primera medición
 * concluyó que la acumulación se asentaba en tres pasos, y lo que medía era que
 * cada captura forzaba exactamente un fotograma. Hay que capturar en cadena y
 * leer el contador que el propio instrumento publica en `DATOS`.
 */
const SETTLE_FRAMES = 48;

export function createGargantuaObservatory(
  options: ObservatoryOptions & { tier: QualityTier },
): ObservatoryHandle | null {
  const { canvas, onFailure, onFirstFrame, onTelemetry, tier } = options;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    // El antialias del contexto no haría nada sobre un cuad de pantalla
    // completa: aquí quien suaviza el borde es la acumulación temporal.
    antialias: false,
    powerPreference: "high-performance",
    failIfMajorPerformanceCaveat: false,
  });
  renderer.setClearColor(0x000000, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = BASE_EXPOSURE;

  const capabilities = renderer.capabilities;
  const gl = renderer.getContext();
  /*
    Varios Android exponen WebGL2 y no dejan renderizar a half-float. Sin esto,
    la acumulación falla en el primer fotograma y la pantalla se queda negra —
    el síntoma exacto de «se queda cargando». La misma guarda que el mapa.
  */
  const canFloat =
    capabilities.isWebGL2 &&
    (gl.getExtension("EXT_color_buffer_half_float") !== null ||
      gl.getExtension("EXT_color_buffer_float") !== null);

  const bench = readVisualBench();
  const canAccumulate = canFloat && bench.accumulate;

  // === El cuad ==============================================================
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadGeometry = new THREE.PlaneGeometry(2, 2);
  const marchScene = new THREE.Scene();
  const marchMaterial = new THREE.ShaderMaterial({
    vertexShader: GARGANTUA_VERTEX,
    fragmentShader: GARGANTUA_FRAGMENT,
    depthTest: false,
    depthWrite: false,
    defines: { MAX_STEPS: TIER[tier].steps },
    uniforms: createMarchUniforms(tier),
  });
  // Los modos de diagnóstico del disco (gris de densidad, sólo directa, sólo
  // lensada) viven en el banco visual y se fijan una vez: ver visual-bench.ts.
  marchMaterial.uniforms.uDiag.value = diagnosticCode(bench);
  marchScene.add(new THREE.Mesh(quadGeometry, marchMaterial));

  // === Acumulación temporal =================================================
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

  // === Post-proceso =========================================================
  /*
    La misma cadena del mapa menos lo que aquí no existe: no hay pasada de
    cuerpos —no hay cuerpos— ni pasada de travesía —no se viaja desde dentro
    del laboratorio—. Lo que sí está entero es el par SavePass + guarda de la
    sombra, y eso no es opcional: es la regla del §14 undecies, y ésta es
    justamente la página cuya vista `SOMBRA` existe para enseñarla.
  */
  const fallbackTarget = canFloat
    ? undefined
    : new THREE.WebGLRenderTarget(1, 1, { type: THREE.UnsignedByteType });
  const composer = new EffectComposer(renderer, fallbackTarget);
  composer.addPass(
    new RenderPass(canAccumulate ? displayScene : marchScene, quadCamera),
  );

  const savePass = canFloat
    ? new SavePass(
        new THREE.WebGLRenderTarget(1, 1, {
          type: THREE.HalfFloatType,
          depthBuffer: false,
          stencilBuffer: false,
        }),
      )
    : null;
  if (savePass) composer.addPass(savePass);

  /*
    El banco visual también manda aquí. El mapa multiplica la fuerza del bloom
    por `bench.bloom` desde que existe el bloom-off test; el laboratorio no lo
    hacía, y por eso las capturas «sin halo» del pase de cohesión (2026-09-19)
    salieron idénticas a las «con halo» hasta que se midió la diferencia entre
    las dos: 0.000. Sin esto, un A/B del material en el laboratorio sólo se
    puede hacer con la consola abierta y el mando BLOOM pulsado, que es una
    captura con el cromo encima.
  */
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(1, 1),
    BLOOM[tier].strength * bench.bloom,
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

  composer.addPass(new OutputPass());

  // === Estado ===============================================================
  let view = 0;
  let motion = options.motion;
  let elapsed = 0;
  let last = 0;
  let frame = 0;
  let disposed = false;
  let painted = false;
  let accumulated = 0;
  let width = 0;
  let height = 0;
  let pixelWidth = 1;
  let pixelHeight = 1;
  /** Fuerza al menos un fotograma. El asentamiento decide el resto. */
  let dirty = true;

  function resetAccumulation() {
    /*
      Literalmente esto, sin limpiar ningún render target: el fotograma
      siguiente calcula `uBlend = 1` por la rampa de arranque y sobrescribe el
      historial entero de una vez. Es la misma propiedad que documenta el mapa,
      y es lo que hace que cambiar de vista sea gratis.
    */
    accumulated = 0;
    dirty = true;
  }

  const framingScratch = { aspect: 1 };

  /** Escribe la vista actual en los uniformes de cámara del raymarch. */
  function applyView() {
    const aspect = height > 0 ? width / height : 1;
    framingScratch.aspect = aspect;
    const framing = gargantuaFraming(GARGANTUA_VIEWS[view], aspect);
    const u = marchMaterial.uniforms;
    u.uCamPos.value.set(...framing.position);
    u.uCamRight.value.set(...framing.right);
    u.uCamUp.value.set(...framing.up);
    u.uCamFwd.value.set(...framing.forward);
    u.uTanHalfFov.value = framing.tanHalfFov;
    u.uAspect.value = aspect;
    u.uSkyRadius.value = framing.skyRadius;
    /*
      Ángulo por píxel en vertical: es el antialias del disco. Con él y la
      distancia al punto el shader calcula la huella del píxel en unidades de
      mundo y apaga cada campo de ruido antes de que su longitud de onda baje de
      esa huella. Depende del campo y de la resolución REAL, no de la CSS.
    */
    u.uPixelScale.value = (2 * framing.tanHalfFov) / pixelHeight;
    measureShadowGate(framing.position, framing.right, framing.up, framing.forward, aspect, framing.tanHalfFov);
  }

  /**
   * Dónde cae la sombra en pantalla, para la guarda del bloom.
   *
   * Se resuelve con la MISMA base que arma los rayos y no con una matriz de
   * proyección: la sombra la dibuja el shader, así que su puerta se mide en su
   * geometría. El semieje sale de proyectar un punto del borde a cada lado —la
   * esfera de radio `SHADOW_IMPACT` centrada en el origen—, así que sigue
   * siendo correcto si cambian la vista, el campo o el viewport.
   */
  const guardScratch = new THREE.Vector3();
  function measureShadowGate(
    position: readonly [number, number, number],
    right: readonly [number, number, number],
    up: readonly [number, number, number],
    forward: readonly [number, number, number],
    aspect: number,
    tanHalfFov: number,
  ) {
    if (!shadowGuardPass) return;
    const project = (px: number, py: number, pz: number) => {
      guardScratch.set(px - position[0], py - position[1], pz - position[2]);
      const depth = Math.max(
        guardScratch.x * forward[0] +
          guardScratch.y * forward[1] +
          guardScratch.z * forward[2],
        1e-3,
      );
      return {
        x:
          (guardScratch.x * right[0] +
            guardScratch.y * right[1] +
            guardScratch.z * right[2]) /
          (depth * aspect * tanHalfFov),
        y:
          (guardScratch.x * up[0] +
            guardScratch.y * up[1] +
            guardScratch.z * up[2]) /
          (depth * tanHalfFov),
      };
    };

    const centre = project(0, 0, 0);
    const uniforms = shadowGuardPass.uniforms;
    uniforms.uCentre.value.set(centre.x * 0.5 + 0.5, centre.y * 0.5 + 0.5);

    const sideways = project(
      right[0] * SHADOW_IMPACT,
      right[1] * SHADOW_IMPACT,
      right[2] * SHADOW_IMPACT,
    );
    const vertical = project(
      up[0] * SHADOW_IMPACT,
      up[1] * SHADOW_IMPACT,
      up[2] * SHADOW_IMPACT,
    );
    uniforms.uRadius.value.set(
      Math.abs(sideways.x - centre.x) * 0.5,
      Math.abs(vertical.y - centre.y) * 0.5,
    );
  }

  function resize(): boolean {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === width && h === height) return false;
    width = w;
    height = h;
    const dpr = Math.min(window.devicePixelRatio || 1, TIER[tier].dpr);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);

    pixelWidth = Math.max(1, Math.round(w * dpr));
    pixelHeight = Math.max(1, Math.round(h * dpr));
    historyRead.setSize(pixelWidth, pixelHeight);
    historyWrite.setSize(pixelWidth, pixelHeight);

    const scale = BLOOM[tier].scale;
    const bloomWidth = Math.max(1, Math.round(pixelWidth * scale));
    const bloomHeight = Math.max(1, Math.round(pixelHeight * scale));
    bloomPass.resolution.set(bloomWidth, bloomHeight);
    bloomPass.setSize(bloomWidth, bloomHeight);
    bloomPass.radius = BLOOM[tier].radius;

    resetAccumulation();
    applyView();
    return true;
  }

  function publishTelemetry() {
    if (!onTelemetry) return;
    const measured = gargantuaTelemetry(
      GARGANTUA_VIEWS[view],
      framingScratch.aspect,
    );
    onTelemetry({
      azimuth: measured.azimuth,
      elevation: measured.elevation,
      distance: measured.distance,
      fov: measured.fov,
      /*
        La mezcla real que acaba de escribirse, no una constante: es el número
        que el §8 pide para este espécimen, y con la acumulación desactivada no
        existe. Publicar 0.18 de todas formas sería teclear un dato.
      */
      blend: canAccumulate
        ? marchMaterial.uniforms.uBlend.value
        : undefined,
      accumulated: canAccumulate ? accumulated : undefined,
    });
  }

  function renderFrame(timestamp: number) {
    if (disposed) return;
    frame = requestAnimationFrame(renderFrame);

    const delta = last ? Math.min((timestamp - last) / 1000, 0.05) : 0;
    last = timestamp;

    /*
      EL RELOJ DEL DISCO, que es el único movimiento autónomo que hay aquí.

      `uTime` mueve el devanado del disco —`cycle = uTime / EPOCH`— y eso es
      CONTENIDO, igual que el oleaje de Miller o la reconfiguración del
      Tesseracto: el disco de un agujero negro gira. Así que el interruptor
      global lo congela y no lo apaga a medias.

      Y ahí está el matiz que decide O12: con el reloj corriendo la imagen
      cambia cada fotograma y la acumulación nunca converge, así que el bucle no
      puede parar — como en Miller. Con el reloj quieto sí converge, y entonces
      para de verdad. Por eso O12 se afirma con el movimiento apagado, que es
      justo como ya lo afirma la prueba que existe.
    */
    if (motion && bench.clock === null) {
      elapsed += delta;
      dirty = true;
    }

    if (resize()) dirty = true;

    /*
      RENDER BAJO DEMANDA, CON ASENTAMIENTO.

      Los cinco sólidos paran en cuanto nadie toca nada. Gargantúa no puede:
      su imagen se compone promediando fotogramas, así que parar al primero
      dejaría a la vista el ruido de una sola muestra. Sigue dibujando hasta que
      el promedio se asienta y ENTONCES para, que es exactamente lo que pide
      O12 para su caso.
    */
    if (!dirty && accumulated >= SETTLE_FRAMES) return;
    dirty = false;

    marchMaterial.uniforms.uTime.value = bench.clock ?? elapsed;

    try {
      if (canAccumulate) {
        const [jx, jy] = JITTER[accumulated % JITTER.length];
        marchMaterial.uniforms.uJitter.value.set(
          jx / pixelWidth,
          jy / pixelHeight,
        );
        // `false`: aquí la cámara nunca se mueve dentro de una vista, y el
        // cambio de vista es un corte que reinicia la acumulación.
        marchMaterial.uniforms.uBlend.value = temporalBlend(accumulated, false);
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
      /*
        UN INSTRUMENTO QUE SE MUERE TIENE QUE DECIRLO.

        La primera versión se tragaba el error y paraba el bucle. Eso deja la
        peor clase de fallo posible: la imagen se queda en el último fotograma
        pintado —que puede ser perfectamente correcto— y nada, ni en la
        pantalla ni en la consola, dice que el aparato ha dejado de funcionar.
        Costó una tarde de medidas creer que la acumulación se asentaba en tres
        fotogramas cuando lo que pasaba es que el bucle había muerto en el tres.

        Ahora se anuncia por consola y por `onFailure`, que es el mismo camino
        por el que la escena persistente cae al perfil plano.
      */
      cancelAnimationFrame(frame);
      frame = 0;
      disposed = true;
      const message = error instanceof Error ? error.message : String(error);
      console.error("[observatorio/gargantua] el raymarch se detuvo:", message);
      onFailure?.(message);
      return;
    }

    publishTelemetry();

    /*
      El aviso de llegada va DESPUÉS de `composer.render()`, nunca en el
      `.then()` del import: lo que se anuncia es que hay imagen, no que haya
      escena. Entre construir el material y pintarlo hay una compilación de
      shaders que en un equipo modesto se mide en cientos de milisegundos — y
      este shader es el más largo del proyecto.
    */
    if (!painted) {
      painted = true;
      onFirstFrame?.();
    }
  }

  resize();
  applyView();

  // Compilación en paralelo antes del primer fotograma, sólo si el navegador
  // la ofrece: ver `system-scene.ts`.
  const startLoop = () => {
    if (!disposed && !frame) frame = requestAnimationFrame(renderFrame);
  };
  if (renderer.extensions.has("KHR_parallel_shader_compile")) {
    renderer.setRenderTarget(historyWrite);
    const compiled = Promise.all([
      renderer.compileAsync(marchScene, quadCamera),
      canAccumulate ? renderer.compileAsync(displayScene, quadCamera) : null,
    ]);
    renderer.setRenderTarget(null);
    void compiled.catch(() => undefined).then(startLoop);
  } else {
    startLoop();
  }

  const { inner, outer } = diskRadiiInRs(DISK_INNER, DISK_OUTER);

  return {
    /*
      EL CONTRATO, medido igual que el de los sólidos aunque no haya malla.

      `draws`, `materials` y `vertices` describen el cuad de pantalla completa,
      y son verdad: **un agujero negro entero en una llamada de dibujo, un
      material y cuatro vértices.** No es una curiosidad, es la afirmación más
      honesta que se puede hacer sobre cómo está construido — todo lo demás lo
      pone el integrador, y eso vive en `raymarch`.
    */
    contract: {
      draws: 1,
      materials: 1,
      vertices: 4,
      architecture: null,
      raymarch: {
        rs: GARGANTUA_RS,
        diskInner: inner,
        diskOuter: outer,
        steps: TIER[tier].steps,
      },
    },
    views: GARGANTUA_VIEWS.map(({ id, label, study }) => ({
      id,
      label,
      study,
    })),
    instruments: GARGANTUA_INSTRUMENTS,
    canProbe: false,
    /*
      No hay un solo manejador de puntero sobre este lienzo, y eso no es una
      omisión: es el §7 escrito como ausencia de código. Publicarlo permite que
      la pista de abajo diga la verdad sin que nadie tenga que preguntarle al
      espécimen por su nombre.
    */
    canOrbit: false,
    setView(index) {
      if (index < 0 || index >= GARGANTUA_VIEWS.length) return;
      view = index;
      /*
        Un CORTE, no un travelling.

        El §7 preveía transiciones entre vistas con la mezcla alta de la
        travesía. Se descarta, y por dos motivos que apuntan al mismo sitio:
        un instrumento conmuta, no hace una panorámica; y el §12 pide en O6 que
        con el movimiento apagado las transiciones sean instantáneas, así que
        el camino animado habría necesitado de todas formas esta versión al
        lado. El reinicio de la acumulación deja el corte limpio sin coste.
      */
      resetAccumulation();
      applyView();
    },
    setProbe() {},
    reset() {
      view = 0;
      resetAccumulation();
      applyView();
    },
    setBloom(enabled) {
      bloomPass.enabled = enabled;
      /*
        La guarda se va con él. Con el bloom apagado sería la identidad —mezcla
        hacia una imagen que es la que ya hay— así que dejarla encendida sólo
        gastaría una pasada, pero apagarla deja dicho en el código que las dos
        son la misma decisión.
      */
      if (shadowGuardPass) shadowGuardPass.enabled = enabled;
      /*
        Y la acumulación NO se reinicia: el bloom vive en el post-proceso, o
        sea después del historial. Reiniciar aquí tiraría un promedio que sigue
        siendo válido y metería ruido en la mitad de una comparación A/B, que
        es justo el gesto para el que existe el instrumento.
      */
      dirty = true;
    },
    setPhysics(uniform, enabled) {
      const u = marchMaterial.uniforms[uniform];
      if (!u) return;
      u.value = enabled ? 1 : 0;
      // Esto SÍ cambia lo que el integrador calcula, así que el historial deja
      // de describir este cuadro y hay que tirarlo.
      resetAccumulation();
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
      historyRead.dispose();
      historyWrite.dispose();
      savePass?.renderTarget.dispose();
      fallbackTarget?.dispose();
      shadowGuardPass?.dispose();
      bloomPass.dispose();
      marchMaterial.dispose();
      displayMaterial.dispose();
      quadGeometry.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
