import * as THREE from "three";

/**
 * La atmósfera del Observatorio: el espacio que hay DETRÁS del espécimen.
 *
 * > "Quiero que el fondo siga pareciendo negro al primer vistazo. Pero cuando
 * > miras durante unos segundos, empieces a percibir que hay espacio detrás."
 * > — Jonás, 2026-09-16
 *
 * Y con una lista de vetos igual de explícita: nada de nebulosa espectacular,
 * campo denso, rejilla 3D, números flotando, círculos orbitales, retículas ni
 * HUD. Su tesis, que es la que gobierna este archivo: **el laboratorio no es
 * una sala.** Es la cámara, las herramientas y la forma de inspeccionar; el
 * espacio puede seguir siendo infinito. El visitante no está dentro de una
 * habitación mirando un objeto, está usando un instrumento imposible suspendido
 * en el vacío.
 *
 * ── Por qué va pegado a la cámara ───────────────────────────────────────────
 *
 * La malla se recoloca en `camera.position` en cada fotograma y NO rota. Es
 * rotación pura y traslación cero, o sea distancia infinita: al arrastrar, el
 * cielo barre el cuadro mientras el espécimen gira contra él; al acercar, el
 * cielo no cambia de escala.
 *
 * Las otras dos opciones se delatan, y cada una de una forma:
 *
 *  · Un cielo FIJO EN EL MUNDO produce paralaje contra el espécimen —la cámara
 *    orbita a 45.7 unidades del centro de esa esfera—, y una cáscara con
 *    paralaje se lee como el interior de una habitación. Es exactamente lo
 *    vetado.
 *  · Un cielo anclado a la PANTALLA (CSS detrás del lienzo, o un quad que use
 *    `vUv` en vez del rayo de vista) no se mueve al arrastrar. Y el arrastre es
 *    toda la interacción de esta página: sería papel pintado, y se vería en el
 *    primer vídeo de la entrega.
 *
 * ── Por qué no se anima NADA ────────────────────────────────────────────────
 *
 * Este archivo no declara un solo uniforme de tiempo, y es deliberado. El bucle
 * del Observatorio es bajo demanda: en reposo no llama a `composer.render()` ni
 * una vez, y un fotograma aquí no es barato —`spinAt` reescribe en CPU los
 * 768 vértices por arista de las 32 aristas, más las normales de las
 * membranas—. Un centelleo obligaría a repetir todo eso para mover unos
 * subpíxeles: coste máximo, señal mínima, y contradiciendo de paso el encargo
 * de que ninguna estrella compita con las aristas.
 *
 * El único movimiento que el cielo se permite es el que YA está pagado: el de
 * la mano. Al arrastrar, el fotograma se redibuja de todas formas.
 */

/**
 * El techo de brillo de una estrella, en radiancia lineal HDR.
 *
 * NO sale del umbral del bloom. Eso fue lo primero que comprobé y estaba
 * equivocado: el umbral vale 2.0 de radiancia lineal, y cualquier cosa que un
 * humano llame «extremadamente tenue» vive entre 0.006 y 0.03 — entre sesenta y
 * trescientas veces por debajo. El bloom no es la restricción.
 *
 * La restricción la pone el ESPÉCIMEN. Evaluado el ramo de cristal del
 * Tesseracto con su intensidad de clave real, el canto más débil de la celda
 * lejana —la que la jerarquía 4D empuja al fondo— está en HDR ≈ 0.0083, o sea
 * sRGB 3-6-12. Ése es el suelo contra el que hay que calibrar: una estrella a
 * sRGB 32 sería cuatro veces el borde más débil de la figura, y el encargo dice
 * que ninguna puede competir con las aristas.
 *
 * Con 0.022 la más definida sale a sRGB ≈ 21 y el grueso del campo se queda
 * entre 2 y 8. Medido sobre la captura, no estimado.
 */
const STAR_PEAK = 0.022;

/**
 * El pico del halo ambiental, y el número más delicado del archivo.
 *
 * El encargo lo describe como «#000000 → negro azulado muy profundo → #000000»,
 * y un azul de ésos —#04070e— es HDR luma ≈ 0.0084: EXACTAMENTE el nivel del
 * canto más débil de la celda lejana del hipercubo. Un halo así, centrado
 * detrás del espécimen, borraría la jerarquía por profundidad en W justo donde
 * más se nota, que es lo que costó las versiones V2 y V3 del Tesseracto.
 *
 * De ahí las dos defensas, y hacen falta las dos: el pico se queda por debajo
 * de 0.004, y su centro NO cae sobre la silueta (ver `HALO_ANCHOR`).
 */
const HALO_PEAK = 0.0034;

/**
 * El halo se ancla a la LUZ, no al centro del cuadro.
 *
 * En este mundo la luz es el origen (`toLight = normalize(-vPositionW)`), así
 * que «de dónde viene la luz» es una dirección real y no una decisión de
 * composición. Anclar ahí el halo tiene tres consecuencias, y las tres son
 * buenas:
 *
 *  · En la pose del preset el Tesseracto está a CONTRALUZ —su `keyAngle` es
 *    145°—, así que el halo cae justo detrás de la figura, que es literalmente
 *    lo que se pidió, sin tener que decirle a nadie dónde ponerse.
 *  · Su máximo queda FUERA de la silueta —arriba y a la izquierda, según la
 *    dirección de clave del preset—, que es la segunda defensa del párrafo de
 *    arriba.
 *  · Al orbitar, el halo se queda donde está la luz en vez de seguir al ojo.
 *    Una viñeta centrada en pantalla se delata en cuanto arrastras; esto se
 *    comporta como una cosa del espacio.
 *
 * Es la única decisión de este archivo que interpreta el encargo en vez de
 * transcribirlo: se pidió «detrás del Tesseracto» y aquí está «donde está la
 * luz», que en la pose inicial es el mismo sitio. Cambiarlo a centrado en
 * pantalla es sustituir `toLight` por la dirección de vista.
 */
const HALO_ANCHOR = "luz";

/** Radio de la cáscara. Cualquier valor entre `near` y `far` sirve: como viaja
 *  con la cámara, la distancia es constante y no participa de nada. */
const SHELL_RADIUS = 600;

const VERTEX = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    // La dirección desde la cámara hacia este punto de la cáscara, en espacio
    // de MUNDO. Es el rayo de vista, y es lo único que el fragmento necesita:
    // por eso el cielo gira con la cámara sin que nadie lo rote.
    vDirection = (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;

  varying vec3 vDirection;

  uniform vec3 uLightDirection;
  uniform float uStars;
  uniform float uHalo;

  // Los mismos hashes del cielo de Gargantúa. Se copian y no se importan porque
  // aquel shader es una cadena de texto dentro del raymarch: compartirlos
  // obligaría a extraer un módulo de GLSL que hoy no existe, y estas seis
  // líneas no son la parte de aquel archivo que vale la pena reutilizar. Lo que
  // sí se reutiliza es todo lo de abajo.
  vec3 hash33(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.xxy + p.yxx) * p.zyx);
  }

  /*
    Una estrella por celda de un retículo 3D, y sólo en una fracción de las
    celdas. Es el starLayer de gargantua-shaders.ts con dos cambios de
    calibre, y conserva sus dos lecciones ya pagadas:

     · La distancia se mide ENTRE DIRECCIONES NORMALIZADAS, no entre puntos del
       retículo. Medir en 3D parece equivalente y no lo es: la esfera de
       muestreo corta la gaussiana de la estrella por un plano que casi nunca
       pasa por su centro, y esa sección es un anillo. De ahí salían rayas y
       arcos en vez de puntos.
     · El exponente alto de la magnitud es lo que hace el trabajo. pow(h, 14)
       deja una cola tan corta que sólo una fracción diminuta de celdas produce
       una estrella legible; el resto se queda en polvo. Subir el brillo en vez
       del exponente da estrellas más gordas, no un cielo más poblado.

    Los dos cambios respecto del original: no hay suelo de brillo —allí el campo
    arranca en 0.30 y aquí en 0.0, porque allí compite con un disco de acreción
    y aquí con un cristal casi negro— y el perfil es más apretado.
  */
  float starLayer(vec3 dir, float scale, float density) {
    vec3 cell = floor(dir * scale);
    vec3 h = hash33(cell);
    float present = step(1.0 - density, h.z);
    vec3 starDir = normalize(cell + 0.5 + (h - 0.5) * 0.9);
    float d = length(dir - starDir) * scale;
    float magnitude = pow(h.y, 14.0);
    return present * magnitude * exp(-d * d * 320.0);
  }

  void main() {
    vec3 dir = normalize(vDirection);

    /*
      Tres escalas, y el peso va casi entero a la más fina. Es el reparto que
      pidió la dirección —«95 % negro, 4 % apenas perceptible, 1 % alguna algo
      más definida»— dicho en el único sitio donde se puede cumplir: la escala
      gruesa es la que produce las estrellas legibles y por eso su densidad es
      la más baja de las tres.
    */
    float field =
        starLayer(dir,  38.0, 0.055) * 1.00
      + starLayer(dir, 105.0, 0.120) * 0.52
      + starLayer(dir, 260.0, 0.170) * 0.24;

    // Frío por defecto, con una minoría templada. Los mismos tres tonos que el
    // campo persistente del sitio, sin el ámbar: aquí el ámbar significa «canal
    // aislado» en el cromo y no puede significar otra cosa en el cielo.
    vec3 cool  = vec3(0.86, 0.92, 1.00);
    vec3 plain = vec3(1.00, 1.00, 1.00);
    vec3 tint = mix(cool, plain, hash33(floor(dir * 38.0)).x);

    vec3 colour = tint * field * uStars;

    /*
      El halo: una variación amplísima del negro alrededor de la dirección de la
      luz. pow(..., 3.0) sobre el coseno da una campana muy ancha y sin borde
      —no hay radio, no hay filo, no hay nada que se pueda llamar círculo—, que
      es la diferencia entre «hay espacio detrás» y «hay un foco ahí».
    */
    float toLight = max(0.0, dot(dir, uLightDirection));
    float halo = pow(toLight, 3.0);
    colour += vec3(0.42, 0.56, 1.00) * halo * uHalo;

    /*
      DITHER, y no es opcional.

      El lienzo final es de 8 bits y en esta cadena no hay dithering en ningún
      sitio: OutputPass usa un RawShaderMaterial sin dithering_fragment, y
      renderer.dithering sólo actúa sobre la cadena estándar de materiales. Un
      degradado a pantalla completa que vive entre sRGB 0 y 6 bandea sí o sí, y
      unos anillos concéntricos son justo el circulo que el encargo veta.

      LA AMPLITUD SE DERIVA EN EL SITIO CORRECTO DE LA CURVA, y ése fue el error
      de la primera versión. Entre HDR 0.005 y 0.010 la cadena ACES a exposición
      0.95 da unos mil pasos de sRGB por unidad, o sea un escalón cada 0.001 —
      pero el halo no vive ahí, vive en 0.003, donde la curva es MUCHO más
      plana: de 0 a 0.005 sólo caben dos escalones, así que un escalón son
      ~0.0025. Con 0.0011 el dither valía un quinto de lo que hacía falta y los
      anillos seguían enteros. Medido sobre la captura: 155 cambios de nivel en
      460 px, con mesetas planas entre ellos.

      Y va sólo DONDE HAY HALO. Sobre negro puro no hay nada que cuantizar, y
      ensuciarlo levantaría el fondo entero sin ganar nada — el encargo pide que
      el fondo siga leyéndose negro.
    */
    float grain = hash33(vec3(gl_FragCoord.xy, 1.0)).x - 0.5;
    colour += grain * 0.0032 * smoothstep(0.0, 0.02, halo);

    gl_FragColor = vec4(max(colour, 0.0), 1.0);
  }
`;

export interface ObservatorySky {
  readonly object: THREE.Object3D;
  /** Recoloca la cáscara sobre la cámara. Se llama desde `applyCamera`. */
  follow(camera: THREE.Camera): void;
  /** Las capas del banco visual. Restan; nunca suman. */
  setLayers(layers: { stars: boolean; halo: boolean }): void;
  dispose(): void;
}

/**
 * @param lightDirection Hacia dónde está la luz vista desde el espécimen. En
 * este mundo la luz es el origen, así que es `normalize(-specimenPosition)`.
 */
export function createObservatorySky(lightDirection: THREE.Vector3): ObservatorySky {
  const uniforms = {
    uLightDirection: { value: lightDirection.clone().normalize() },
    uStars: { value: STAR_PEAK },
    uHalo: { value: HALO_PEAK },
  };

  const geometry = new THREE.SphereGeometry(SHELL_RADIUS, 24, 16);
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms,
    side: THREE.BackSide,
    // Ni escribe ni comprueba profundidad: es el fondo, y todo lo demás va
    // delante por definición.
    depthWrite: false,
    depthTest: false,
    // Opaco a propósito. Transparente entraría en la lista de transparentes,
    // que three ordena por distancia y dibuja DESPUÉS de las opacas.
    transparent: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  /*
    `renderOrder` -2 y no -1: la capa de oclusión del Tesseracto —la que sólo
    escribe profundidad para que las aristas de detrás se interrumpan en los
    cruces— ya ocupa el -1. El cielo tiene que ir antes que ella.
  */
  mesh.renderOrder = -2;
  // Viaja con la cámara, así que su envolvente no dice nada útil y el culling
  // por frustum sólo puede equivocarse.
  mesh.frustumCulled = false;
  mesh.matrixAutoUpdate = false;

  return {
    object: mesh,
    follow(camera) {
      mesh.position.copy(camera.position);
      mesh.updateMatrix();
      mesh.updateMatrixWorld(true);
    },
    setLayers({ stars, halo }) {
      uniforms.uStars.value = stars ? STAR_PEAK : 0;
      uniforms.uHalo.value = halo ? HALO_PEAK : 0;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

/** Sólo para los tests y la documentación: los números que se calibran a ojo. */
export const SKY_CALIBRATION = {
  STAR_PEAK,
  HALO_PEAK,
  HALO_ANCHOR,
} as const;
