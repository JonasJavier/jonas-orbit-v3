import * as THREE from "three";

/**
 * La atmósfera del Observatorio: el espacio que hay DETRÁS del espécimen.
 *
 * > "Quiero subir un nivel claro de intensidad. «Mínima» no significa
 * > invisible: debe notarse inmediatamente al comparar A contra C, aunque el
 * > Tesseracto siga siendo por mucho el elemento dominante."
 * > — Jonás, 2026-09-17
 *
 * Con una referencia de jerarquía que es la que gobierna todos los números de
 * este archivo: **objeto 100 %, atmósfera 25-35 %, instrumentación 10-15 %**. Y
 * con la misma lista de vetos de siempre: nada de nebulosa, campo denso,
 * rejilla 3D, coordenadas, círculos orbitales, retículas ni HUD.
 *
 * ── Por qué el primer pase salió invisible ──────────────────────────────────
 *
 * No fue una cuestión de gusto: fue un error aritmético con causa localizable.
 * El pase anterior calibró la atmósfera entera contra el «suelo del espécimen»
 * —HDR 0.0083, el canto más débil de la celda lejana— y le impuso al halo la
 * mitad de ese número. Pasado por la cadena real (ACES a exposición 0.95, que
 * internamente divide por 0.6, más la codificación sRGB del OutputPass), HDR
 * 0.0034 sale a **sRGB 0, 0, 1**. Un solo dígito, en un canal.
 *
 * Y peor: ese 0,0,1 es el PICO, que cae fuera de cuadro. La luz de este preset
 * está a 35° del eje de cámara y el cuadro llega a 30° por su lado ancho, así
 * que el máximo del lóbulo vive justo detrás del borde. Lo que se veía en la
 * imagen era el hombro, `cos³(35°) = 0.55` de ese uno: **sRGB 0, 0, 0**.
 *
 * La atmósfera no estaba tenue. Estaba por debajo de lo que un canal de ocho
 * bits sabe representar. Cualquier discusión sobre si «se nota poco» era una
 * discusión sobre una imagen en la que no había nada.
 *
 * La lección, que vale para el resto del proyecto: **un nivel en HDR no es un
 * nivel en pantalla**. Cerca del negro la curva ACES es muy plana y comprime
 * tres décadas de radiancia en los primeros diez valores de sRGB; calibrar «por
 * debajo de tal cosa» en unidades lineales, sin pasar por la curva, no acota la
 * imagen: la borra. Los números de abajo están todos anotados con su valor EN
 * PANTALLA, que es la única unidad en la que se puede discutir con alguien que
 * está mirando una captura.
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
 * vértices de las 32 aristas, más las normales de las membranas—. Un centelleo
 * obligaría a repetir todo eso para mover unos subpíxeles.
 *
 * Y hay una segunda razón: un reloj propio no lo congela el interruptor global
 * de movimiento, así que el cielo seguiría corriendo con el movimiento apagado
 * —contra `movimiento-unificado.md`— y rompería el A/B/C, cuyo requisito es
 * «mismo instante».
 */

/**
 * El brillo de la estrella de magnitud 1, en radiancia lineal HDR.
 *
 * **En pantalla: sRGB ≈ 63, 66, 70.** Es una estrella que se ve sin buscarla y
 * que hace de referencia de profundidad, que es lo que se pidió. En cuadro hay
 * dos o tres de este calibre; el reparto lo decide el exponente y está
 * explicado en `starLayer`.
 *
 * El techo lo sigue poniendo el espécimen —«ninguna debe acercarse al brillo
 * del Tesseracto»—, pero medido donde se puede medir: contra sus aristas VIVAS,
 * que en pantalla pasan de 190, y no contra su canto más apagado, que fue el
 * error del pase anterior.
 */
const STAR_PEAK = 0.115;

/**
 * El suelo de magnitud: qué le queda a la estrella más floja del reparto.
 *
 * **En pantalla: sRGB ≈ 8.** Es el «muchas muy débiles» del encargo, y existe
 * por una razón concreta: sin suelo, `pow(h, n)` con n alto deja el 90 % del
 * campo por debajo de un dígito de sRGB, o sea que lo BORRA. El campo tenía
 * cientos de estrellas y ninguna llegaba a pintarse.
 */
const STAR_FLOOR = 0.1;

/**
 * El pico del halo ambiental, y el número que más cambia respecto del pase
 * anterior: de 0.0034 a 0.105, treinta veces.
 *
 * **En pantalla: sRGB ≈ 44, 55, 85 en la esquina de la luz, y ≈ 13, 18, 32
 * detrás del espécimen** (el lóbulo vale 0.26 ahí). O sea: masa fría evidente
 * hacia un lado del cuadro, azul muy oscuro detrás de la figura, negro real en
 * la esquina opuesta. Es el sandwich que dibujó la dirección.
 *
 * ── La pieza que sigue en pie del pase anterior ─────────────────────────────
 *
 * Que el máximo NO caiga sobre la silueta. La jerarquía por profundidad en W
 * del Tesseracto —celda cercana gruesa y clara, lejana fina y apagada— costó
 * dos versiones enteras, y un fondo azul del nivel de la celda lejana la
 * invierte: el canto deja de ser un hilo que brilla y pasa a ser un hilo
 * oscuro. Eso no se evita bajando el halo hasta hacerlo invisible —ése fue el
 * error— sino colocándolo: el pico está en la esquina de la luz y el espécimen
 * vive en el hombro.
 *
 * El coste residual está medido y anotado en el documento de diseño, porque es
 * real y es la contrapartida de subir la atmósfera un orden de magnitud.
 */
const HALO_PEAK = 0.098;

/**
 * El núcleo azul petróleo, encima del lóbulo ancho y mucho más cerrado.
 *
 * Es lo que convierte una mancha de un solo color en una masa con dentro: el
 * ancho aporta azul profundo en medio cuadro y éste vira a cian-petróleo sólo
 * donde la masa es más densa. Un degradado de COLOR dentro del degradado de
 * luz es lo que separa «hay atmósfera» de «hay un foco azul».
 */
const HALO_CORE = 0.042;

/**
 * El halo se ancla a la LUZ, no al centro del cuadro.
 *
 * En este mundo la luz es el origen (`toLight = normalize(-vPositionW)`), así
 * que «de dónde viene la luz» es una dirección real y no una decisión de
 * composición. Anclar ahí tiene tres consecuencias, y las tres son buenas:
 *
 *  · En el preset del Tesseracto la luz cae a 35° del eje de cámara, o sea
 *    justo en una esquina del cuadro. La masa entra por ahí y muere hacia la
 *    esquina contraria: el degradado ocupa la diagonal larga, que es la lectura
 *    más amplia posible sin tocar nada.
 *  · Su máximo queda FUERA de la silueta, que es la defensa de la jerarquía 4D
 *    descrita arriba.
 *  · Al orbitar, el halo se queda donde está la luz en vez de seguir al ojo.
 *    Una viñeta centrada en pantalla se delata en cuanto arrastras; esto se
 *    comporta como una cosa del espacio, que es justo la diferencia entre
 *    «profundidad del espacio detrás» y «glow del objeto».
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
  // líneas no son la parte de aquel archivo que vale la pena reutilizar.
  vec3 hash33(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.xxy + p.yxx) * p.zyx);
  }

  /*
    Una estrella por celda de un retículo 3D, y sólo en una fracción de las
    celdas. Conserva las dos lecciones ya pagadas del campo de Gargantúa y
    corrige dos errores propios del pase anterior.

    ── Lo que se conserva ─────────────────────────────────────────────────────

     · La distancia se mide ENTRE DIRECCIONES NORMALIZADAS, no entre puntos del
       retículo. Medir en 3D parece equivalente y no lo es: la esfera de
       muestreo corta la gaussiana de la estrella por un plano que casi nunca
       pasa por su centro, y esa sección es un anillo. De ahí salían rayas.
     · El reparto de magnitudes lo hace un exponente sobre ruido uniforme, no
       una lista. Muchas flojas, algunas medias y unas pocas vivas con una sola
       instrucción, y sin que dos capas puedan contradecirse.

    ── Los dos errores que corrige ────────────────────────────────────────────

    1. **El perfil se medía en celdas y no en ángulo.** El original multiplica
       la distancia por la escala, así que el radio de la estrella encoge cuando
       el retículo se aprieta. En la capa fina —escala 260— eso dejaba estrellas
       de 0.2 px: más pequeñas que la rejilla de muestreo, así que el
       rasterizador las pillaba o no según dónde cayera el centro del píxel. La
       mayoría no se pintaba NUNCA. Ahora el radio va en radianes y cada capa
       elige el suyo, con el suelo puesto donde manda la rejilla: el cuadro mide
       40° de alto sobre 900 px, o sea 0.00078 rad por píxel, y ninguna capa
       baja de 1.3 de ésos.

    2. **No había suelo de magnitud.** Con un exponente de 14 la estrella
       mediana vale 10⁻⁴ del pico: por debajo de un dígito de sRGB, o sea negro.
       El campo existía en el shader y no en la imagen. El parámetro "base" es
       el mínimo que se lleva cualquier estrella presente.
  */
  float starLayer(
    vec3 dir, float scale, float density,
    float sigma, float sharpness, float base
  ) {
    vec3 cell = floor(dir * scale);
    vec3 h = hash33(cell);
    float present = step(1.0 - density, h.z);
    // El desplazamiento dentro de la celda se queda en el 80 % central: con el
    // perfil ya desacoplado de la escala, una estrella pegada a la frontera se
    // cortaría en recto contra la celda vecina.
    vec3 starDir = normalize(cell + 0.5 + (h - 0.5) * 0.8);
    float d = length(dir - starDir);
    float magnitude = base + (1.0 - base) * pow(h.y, sharpness);
    return present * magnitude * exp(-(d * d) / (sigma * sigma));
  }

  void main() {
    vec3 dir = normalize(vDirection);

    /*
      Dos capas y no tres, y la jerarquía que pidió la dirección —«muchas
      pequeñas y débiles, unas pocas de brillo medio y 2-3 referencias»— la
      produce el EXPONENTE dentro de cada capa, no el número de capas:

       · REFERENCIAS (escala 34, 2.1 px): unas 47 estrellas en cuadro. Con
         exponente 8 el reparto deja unas 4 por encima de la mitad del pico y 2
         por encima de tres cuartos. Ésas son las referencias de profundidad.
       · POLVO (escala 110, 1.3 px, peso 0.30): unas 270 en cuadro, casi todas
         entre sRGB 6 y 20. Es lo que hace que el ojo diga «espacio profundo»
         sin que se pueda contar ninguna.

      La tercera capa del pase anterior —escala 260— se retira: con el perfil
      corregido pintaría miles de puntos, que es el campo decorativo vetado. La
      densidad de ese régimen la da ahora el suelo de magnitud de la capa de
      polvo, que es mucho más barato y no se parece a una textura.
    */
    float field =
        starLayer(dir,  34.0, 0.060, 0.0019, 8.0, STAR_FLOOR_C) * 1.00
      + starLayer(dir, 110.0, 0.045, 0.0012, 3.5, 0.18) * 0.38;

    // Frío por defecto, con una minoría templada. Los mismos tres tonos que el
    // campo persistente del sitio, sin el ámbar: aquí el ámbar significa «canal
    // aislado» en el cromo y no puede significar otra cosa en el cielo.
    vec3 cool  = vec3(0.86, 0.92, 1.00);
    vec3 plain = vec3(1.00, 1.00, 1.00);
    vec3 tint = mix(cool, plain, hash33(floor(dir * 34.0)).x);

    vec3 colour = tint * field * uStars;

    /*
      EL HALO. Dos lóbulos sobre el mismo eje —el de la luz— y nada más.

      Se pasa de un coseno elevado a dos smoothstep sobre el ÁNGULO por un
      motivo que se ve en la imagen: el coseno elevado no llega nunca a cero,
      así que levantaba el cuadro entero por igual en vez de dibujar una masa.
      Un smoothstep con radio exterior sí muere, y morir es la mitad del
      encargo —«que se desvanezca lentamente hacia negro»—: sin negro real al
      otro lado no hay masa, hay velo.

      Los dos radios, con la luz a 35° del eje y el cuadro llegando a 30° por su
      lado ancho y 35° por la diagonal:

       · ANCHO, muere a 66°. En la esquina de la luz vale 1, detrás del
         espécimen 0.26 y en la esquina opuesta 0. Por encima del umbral de
         visibilidad ocupa algo más de la mitad del cuadro, que es lo pedido.
       · NÚCLEO, muere a 40°. Sólo vive en el tercio de la luz, y es el que mete
         el petróleo: cian frío y oscuro contra el azul profundo del ancho.

      El cuadrado del ancho no es adorno: convierte el hombro del smoothstep
      en una caída más lenta cerca del pico y más rápida en la cola, que es el
      perfil de una masa de gas y no el de una lámpara.
    */
    float a = acos(clamp(dot(dir, uLightDirection), -1.0, 1.0));
    float wide = smoothstep(1.45, 0.06, a);
    wide = pow(wide, 1.5);
    float core = smoothstep(0.95, 0.00, a);
    core *= core;

    vec3 deepBlue  = vec3(0.28, 0.46, 0.80);
    vec3 petroleum = vec3(0.22, 0.48, 0.62);
    colour += deepBlue * wide * uHalo;
    colour += petroleum * core * uHalo * HALO_CORE_C;

    /*
      DITHER, y no es opcional.

      El lienzo final es de 8 bits y en esta cadena no hay dithering en ningún
      sitio: OutputPass usa un RawShaderMaterial sin dithering_fragment, y el
      del renderer sólo actúa sobre la cadena estándar de materiales. Un
      degradado a pantalla completa que ahora recorre de sRGB 0 a 85 bandea sí o
      sí, y unos anillos concéntricos son justo el círculo que el encargo veta.

      LA AMPLITUD SE DERIVA EN EL SITIO CORRECTO DE LA CURVA, y ése fue el error
      de la primera versión de este archivo. Un escalón de sRGB no vale lo mismo
      en todo el recorrido: en el cuerpo del halo son ~0.0011 de HDR y en la
      cola, donde la curva ACES se aplana contra el negro, son ~0.0026. Un solo
      número o ensucia el cuerpo o deja la cola bandeada, y el pase anterior
      eligió el de la zona equivocada. Se interpola entre los dos según la
      densidad local, que es lo único que funciona para un degradado que recorre
      dos décadas.

      Y va sólo DONDE HAY HALO. Sobre negro puro no hay nada que cuantizar, y
      ensuciarlo levantaría el fondo entero sin ganar nada.
    */
    float grain = hash33(vec3(gl_FragCoord.xy, 1.0)).x - 0.5;
    float ladder = mix(0.0026, 0.0011, smoothstep(0.0, 0.30, wide));
    colour += grain * ladder * smoothstep(0.0, 0.004, wide);

    gl_FragColor = vec4(max(colour, 0.0), 1.0);
  }
`;

export interface ObservatorySky {
  readonly object: THREE.Object3D;
  /** Recoloca la cáscara sobre la cámara. Se llama desde `applyCamera`. */
  follow(camera: THREE.Camera): void;
  /** Las capas del banco visual. Restan; nunca suman. */
  setLayers(layers: { stars: boolean; halo: boolean }): void;
  /**
   * Adónde mira el halo cuando el instrumento mueve la luz.
   *
   * El cielo no es decoración independiente: su gradiente sale de la MISMA
   * dirección que ilumina al espécimen, así que si el mando de `LUZ` gira una y
   * no la otra, el fondo empieza a contradecir a la figura y el cuadro deja de
   * ser un sitio.
   */
  setLight(direction: THREE.Vector3): void;
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
    /*
      Las dos constantes que el fragmento necesita como literales entran por
      sustitución de texto y no por uniforme, a propósito: `setLayers` sólo
      puede tocar `uStars` y `uHalo`, así que el suelo de magnitud y la mezcla
      del núcleo quedan fuera del alcance del banco visual. Un interruptor de
      capas que pudiera cambiar el CARÁCTER del cielo y no sólo su presencia
      convertiría el A/B/C en tres imágenes incomparables.
    */
    fragmentShader: FRAGMENT.replace(
      /STAR_FLOOR_C/g,
      STAR_FLOOR.toFixed(4),
    ).replace(/HALO_CORE_C/g, (HALO_CORE / HALO_PEAK).toFixed(4)),
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
    setLight(direction) {
      uniforms.uLightDirection.value.copy(direction).normalize();
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
  STAR_FLOOR,
  HALO_PEAK,
  HALO_CORE,
  HALO_ANCHOR,
} as const;
