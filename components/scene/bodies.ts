import * as THREE from "three";
import { createTesseractModel } from "./tesseract-model";
import {
  ENDURANCE_JETS,
  ENDURANCE_LIGHT_FRAGMENT,
  updateEnduranceOperations,
} from "./endurance-operations";
import {
  mergeGeometries,
  mergeVertices,
} from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { WorldId, WorldStructuralData } from "@/content/worlds.data";

/**
 * Los seis destinos dispuestos alrededor de Gargantúa.
 *
 * ── Por qué NO están dentro del raymarch ────────────────────────────────────
 *
 * La tentación era meterlos en el bucle de geodésicas y tener lente y oclusión
 * gratis. No sale: son siete tests de intersección por PASO, y hay entre 190 y
 * 340 pasos por píxel. El coste se multiplicaría por siete para un detalle que
 * a 23-42 rs del agujero apenas se nota.
 *
 * Van como geometría real compuesta DELANTE del raymarch, con su propia cámara
 * en perspectiva alineada exactamente con la base de rayos del shader. Gargantúa
 * lleva la física; los cuerpos, iluminación honesta.
 *
 * ── Y por qué nunca los ocluye nada ─────────────────────────────────────────
 *
 * Un cuerpo situado por dirección de arte detrás del disco debería desaparecer.
 * No lo hacemos, y es deliberado: **cada destino tiene que estar siempre visible
 * y pulsable.** Ocultar una parte del menú por realismo sería un fallo de
 * accesibilidad; la pequeña inexactitud se lee como una silueta recortada contra
 * el disco.
 *
 * ── Forma real, y emisión localizada ────────────────────────────────────────
 *
 * Hubo una versión en la que las cuatro estructuras —tesseracto, estación,
 * Endurance y Ranger— no eran malla sino un punto de luz con su destello. El
 * motivo era bueno (a veinte píxeles un cilindro sin textura es un rectángulo
 * gris) pero el resultado en pantalla no: con el núcleo cayendo como
 * `(1-d)^12`, lo que quedaba era una chincheta de seis píxeles dentro de un
 * anillo de interfaz vacío. Cuatro de los seis destinos no tenían cuerpo.
 *
 * El problema real no era la geometría, era usar una silueta genérica y cubrirla
 * con un halo. Los modelos construidos se leen por estructura; sólo sus balizas
 * y núcleos emiten. El bloom óptico ya convierte esos puntos físicos en luz sin
 * envolver la nave o el planeta entero en un degradado de interfaz.
 *
 * ── La luz ──────────────────────────────────────────────────────────────────
 *
 * No hay `THREE.Light` en toda la escena. La única fuente del sistema es el
 * disco de acreción, así que cada cuerpo se ilumina desde el origen con una
 * intensidad que cae con la distancia. Es una línea de shader y es lo que hace
 * que el sistema se lea como un sistema y no como seis esferas flotando.
 */

/**
 * Periodo orbital del cuerpo de referencia (25 rs), en segundos. Se conserva
 * sólo como parametrización de la curva: la dirección de arte fija `seconds=0`
 * para los cuerpos y la traza usa el periodo para muestrear una vuelta exacta.
 *
 * No implica movimiento visible ni vuelve a hacer dueña de la composición a la
 * animación orbital.
 */
const INNER_PERIOD_S = 210;

function orbitalPeriod(placement: WorldStructuralData["placement"]): number {
  return INNER_PERIOD_S * Math.pow(placement.orbitRadius / 25, 1.5);
}

/**
 * Posición de un cuerpo en su órbita para un instante dado. Pura.
 *
 * Vive aquí y no en la escena porque la posición fija y el constructor de la
 * traza deben muestrear la MISMA curva. Duplicar la fórmula sería garantizar que
 * un día la traza deje de coincidir con el destino.
 */
export function orbitalPosition(
  placement: WorldStructuralData["placement"],
  seconds: number,
  target: THREE.Vector3,
): THREE.Vector3 {
  const { orbitRadius, phase, inclination } = placement;
  if (orbitRadius === 0) return target.set(0, 0, 0);

  const angle =
    (phase * Math.PI) / 180 + (seconds / orbitalPeriod(placement)) * Math.PI * 2;

  // Punto en el plano de la órbita, inclinado respecto del disco.
  //
  // Las seis órbitas comparten línea de nodos a propósito. El primer intento
  // giraba cada plano por su propia fase, y la trigonometría lo castigó: con
  // node = φ, la coordenada x sale r·(cos²φ + sen²φ·cos i), que es POSITIVA
  // para cualquier fase. Los seis cuerpos arrancaban apiñados en el mismo lado
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

/** Traducción del modelo visual del contenido al índice que usa el shader.
 *
 *  `tesseract` conserva su número aunque el material común ya no tenga una
 *  rama para él: desde que el hipercubo tiene shader propio, este índice sólo
 *  se lee para distinguir «tiene malla» de «la dibuja el raymarch». */
const KIND: Record<WorldStructuralData["visual"], number> = {
  water: 0,
  desert: 1,
  tesseract: 2,
  ship: 4,
  beacon: 5,
  // Gargantúa no tiene malla: la dibuja el raymarch.
  "black-hole": -1,
};

/**
 * La traza de la órbita.
 *
 * ── Qué problema resuelve ───────────────────────────────────────────────────
 *
 * En reposo deja apenas una insinuación de profundidad. Al apuntar, sólo un arco
 * corto alrededor del destino adquiere color: localiza el cuerpo y su dirección
 * sin convertir el hero en seis elipses saturadas.
 *
 * ── Por qué es una cinta y no una línea ─────────────────────────────────────
 *
 * `THREE.Line` dibuja líneas de un píxel sin antialias —el renderer va con
 * `antialias: false` porque el post-proceso lo desactiva de todas formas— y una
 * elipse diagonal de un píxel duro es una escalera. Se ve barata, que es justo
 * lo contrario de lo que busca esto.
 *
 * Así que es una cinta de dos triángulos por muestra que SE ORIENTA HACIA LA
 * CÁMARA en el vertex shader, y el fragment shader le da los bordes suaves. El
 * antialias sale del degradado, no del hardware. El ancho va en unidades de
 * mundo escaladas con la distancia de encuadre, así que mide lo mismo en
 * pantalla en un monitor que en un móvil.
 */
const ORBIT_VERTEX = /* glsl */ `
  uniform vec3 uCamPos;
  uniform float uWidth;

  attribute vec3 aTangent;
  attribute float aSide;
  attribute float aCue;

  varying float vSide;
  varying float vCue;
  varying vec3 vWorld;

  void main() {
    vSide = aSide;
    vCue = aCue;

    vec3 base = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3 tangent = normalize(mat3(modelMatrix) * aTangent);
    vWorld = base;

    /* La cinta se abre en la perpendicular común a la trayectoria y a la línea
       de visión: así siempre da la cara y nunca se ve de canto. El cruce jamás
       degenera porque ninguna órbita pasa por la cámara — la más tumbada forma
       27° con la línea de visión (ver el invariante de worlds.data.ts). */
    vec3 toCam = normalize(uCamPos - base);
    vec3 across = cross(tangent, toCam);
    across /= max(length(across), 1e-4);

    gl_Position =
      projectionMatrix * viewMatrix * vec4(base + across * aSide * uWidth, 1.0);
  }
`;

const ORBIT_FRAGMENT = /* glsl */ `
  uniform vec3 uAccent;
  uniform vec3 uNavigation;
  uniform vec3 uCamPos;
  uniform float uFocus;
  uniform float uTime;
  uniform float uOrbitRadius;

  varying float vSide;
  varying float vCue;
  varying vec3 vWorld;

  void main() {
    /* Bordes suaves: aquí está todo el antialias de la traza. */
    float edge = 1.0 - smoothstep(0.35, 1.0, abs(vSide));

    /*
      El tramo que pasa por DELANTE del agujero está más cerca de la cámara que
      el centro del sistema; el de detrás, más lejos. Atenuar con esa diferencia
      es lo que convierte un óvalo dibujado sobre el cristal en una elipse que
      rodea algo: el arco cercano se lee y el lejano se disuelve en el negro.
    */
    float here = length(vWorld - uCamPos);
    float depth = clamp((here - length(uCamPos)) / max(uOrbitRadius, 1.0) * 0.5 + 0.5, 0.0, 1.0);
    float fade = mix(1.0, 0.08, depth);

    /*
      En reposo la traza es CASI GRIS, y esa es la corrección que más cambia la
      escena.

      Con las seis elipses a pleno color —ámbar, cian, violeta, naranja— lo
      primero que leía el ojo no era el agujero negro: era una maraña de líneas
      cruzándose. Seis trazas saturadas no dibujan un sistema, dibujan un
      ESQUEMA. El color es información de estado, así que se guarda para el
      estado: en reposo la órbita es una cuerda de acero apenas visible, y sólo
      adquiere el cian común de navegación el tramo del destino apuntado. El
      salto de reposo a foco es de más de diez veces, así que no hace falta
      ningún adorno para saber cuál está activa.
    */
    vec3 reposo = mix(vec3(0.44, 0.50, 0.62), uAccent, 0.16);
    float cue = uFocus * vCue;
    vec3 tinte = mix(reposo, uNavigation, cue);

    /*
      Hover no dibuja la elipse entera. vCue vale uno junto a la posición fija
      del cuerpo y cae suavemente en un arco corto a ambos lados; fuera de ese
      tramo la órbita conserva únicamente su lectura ambiental. Así la respuesta
      se siente como adquisición de trayectoria, no como volver a encender un
      diagrama orbital completo.
    */
    float energy = (0.018 + cue * 0.44) * fade * edge;

    /* Aditivo sobre negro: el alfa va a 1 y la energía viaja en el color. Con
       la energía también en alfa se elevaría al cuadrado. */
    gl_FragColor = vec4(tinte * energy, 1.0);
  }
`;

const BODY_VERTEX = /* glsl */ `
  attribute float aSurfaceMask;

  varying vec3 vNormalW;
  varying vec3 vNormalL;
  varying vec3 vPositionW;
  varying vec3 vLocal;
  varying vec2 vUv;
  varying float vSurfaceMask;
  varying vec3 vLightLocal;

  void main() {
    vLocal = position;
    vNormalL = normal;
    vUv = uv;
    vSurfaceMask = aSurfaceMask;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPositionW = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    /*
      La dirección de la luz, en el espacio LOCAL del cuerpo.

      Se calcula aquí y no en el fragmento porque three sólo inyecta
      modelMatrix en el vertex shader. Como la matriz es rotación por escala
      uniforme, los productos escalares con sus columnas deshacen la rotación,
      y basta normalizar al otro lado. Lo usan el oleaje y el relieve
      de los planetas para orientar su iluminación.
    */
    vec3 toLightW = normalize(-world.xyz);
    vLightLocal = vec3(
      dot(modelMatrix[0].xyz, toLightW),
      dot(modelMatrix[1].xyz, toLightW),
      dot(modelMatrix[2].xyz, toLightW)
    );
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const BODY_FRAGMENT = /* glsl */ `
  uniform vec3 uAccent;
  uniform vec3 uSecondary;
  uniform vec3 uNavigation;
  uniform vec3 uCamPos;
  uniform float uLightIntensity;
  uniform float uTime;
  uniform float uFocus;
  uniform int uKind;
  uniform sampler2D uSurfaceMap;
  /* Banco de pruebas visual: 1 en producción. Ver lib/visual-bench.ts. */
  uniform float uEmission;
  /*
    Régimen de la propulsión: 0 continuo, 1 pulsado.

    Las dos naves comparten programa y comparten el ramo emisivo, pero no hacen
    lo mismo con sus motores, y ésa es justamente la diferencia que se quiere
    ver. La Ranger EMPUJA —un crucero mantiene su motor encendido—; la Endurance
    CORRIGE —una estación de anillo dispara impulsos cortos y espaciados—. Un
    uniforme por material es lo más barato que distingue las dos cosas: no añade
    atributo de vértice, no añade draw y no obliga a un uKind nuevo con todo
    lo que arrastra (retorno anticipado, escalado de emisivos, banco visual).
  */
  uniform float uPulsed;

  varying vec3 vNormalW;
  varying vec3 vNormalL;
  varying vec3 vPositionW;
  varying vec3 vLocal;
  varying vec2 vUv;
  varying float vSurfaceMask;
  varying vec3 vLightLocal;

  /* Ruido de valor barato. Los mapas de superficie de las naves se generan en
     memoria; la escena no transfiere texturas por red y conserva intacto el
     presupuesto de 1,2 MB del plan. */
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0, 0, 0)), hash(i + vec3(1, 0, 0)), f.x),
          mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
          mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }

  /*
    Cuatro octavas por llamada, y cada octava son ocho hash: una llamada a fbm
    cuesta 32. El presupuesto real del shader no es el número de materiales
    —todos los cuerpos comparten un único programa— sino el número de SITIOS de
    llamada, que se pagan en compilación y por píxel.

    Está medido: subir de 12 a 16 sitios multiplicó por treinta el arranque de
    la escena en el runtime software que usa CI (A28 pasó de 1,7 s a 46-60 s con
    tres workers en paralelo). Por eso el detalle de alta frecuencia
    —microoleaje, escarpes, vórtices, grano cepillado— usa noise() de una sola
    octava: a esa frecuencia las octavas siguientes caen por debajo del píxel,
    no se ven y se pagan enteras.
  */
  float fbm(vec3 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      sum += amp * noise(p);
      p *= 2.03;
      amp *= 0.5;
    }
    return sum;
  }

  /*
    Rayas de panel para el casco de la estación: una nave no tiene ruido
    geológico.

    La frecuencia es baja a propósito. Con rayas finas, un casco de veinte
    píxeles se convertía en un tejido de moiré porque el detalle caía por debajo
    del píxel. Menos rayas y más anchas sobreviven al tamaño real en pantalla.
  */
  /*
    RÉGIMEN DE DISPARO DE UN RCS.

    Un propulsor de control de actitud no es una antorcha: da un impulso corto,
    lo mantiene, se apaga, y vuelve un rato después. Lo que hace que se lea como
    una máquina corrigiendo —y no como un efecto— son tres propiedades, y las
    tres están aquí:

    1. **El pulso dura de verdad.** Entre medio segundo y un segundo y cuarto.
       Un parpadeo rápido es lenguaje de videojuego; esto es un chorro de gas.
    2. **La envolvente no es simétrica.** Ataque en el 14 % inicial —la válvula
       abre de golpe— y caída larga en la última mitad, que es el gas que queda
       saliendo. Al revés se ve como un fundido, no como una válvula.
    3. **Los dos propulsores NO coinciden.** La semilla sale de la posición
       angular de cada tobera, así que cada una tiene su propio ciclo, su propio
       instante de disparo y su propia duración. Dos luces sincronizadas se leen
       como un efecto; desincronizadas, como una nave.

    El ciclo dura unos nueve segundos y el disparo cae en un sitio distinto de
    cada ciclo —el desorden sale de una función hash sobre el número de ciclo—,
    así que el patrón no se repite en la escala de tiempo que nadie mira. Es
    determinista y depende sólo de uTime: dos pestañas abiertas ven lo mismo, y
    el paso de animación no depende de los fotogramas por segundo.
  */
  float thrusterDuty(float seed) {
    /* El periodo también depende de la semilla —7.9 s contra 10.8 s— así que
       las dos toberas no sólo empiezan desfasadas: nunca vuelven a coincidir.
       Con el mismo periodo y sólo un desfase, el patrón se repetiría cada
       ciclo y el ojo lo cazaría en menos de un minuto. */
    float cycle = uTime * (0.11 + seed * 0.017) + seed * 0.41;
    float index = floor(cycle);
    float phase = cycle - index;
    float jitter = fract(sin(index * 43.7 + seed * 12.9) * 4137.31);
    float start = 0.12 + jitter * 0.58;
    /* 0.06 a 0.12 de ciclo. Con los dos periodos de arriba eso da impulsos de
       0.47 a 0.94 s en una tobera y de 0.65 a 1.29 s en la otra: dentro del
       medio segundo largo que pide la dirección, y distintos entre sí. */
    float length = 0.06 + jitter * 0.06;
    float u = (phase - start) / length;
    float inside = step(0.0, u) * step(u, 1.0);
    return inside * smoothstep(0.0, 0.14, u) * (1.0 - smoothstep(0.5, 1.0, u));
  }

  float panels(vec3 p, float density) {
    float bands = abs(fract(p.y * density) - 0.5);
    float ribs = abs(fract((p.x + p.z) * density * 0.5) - 0.5);
    return smoothstep(0.12, 0.32, min(bands, ribs));
  }

  void main() {
    vec3 normal = normalize(vNormalW);
    vec3 view = normalize(uCamPos - vPositionW);

    /* La única luz del sistema es el disco, en el origen. */
    vec3 toLight = normalize(-vPositionW);
    float ndl = dot(normal, toLight);

    float fresnel = pow(1.0 - max(dot(normal, view), 0.0), 3.0);

    /*
      RELIEVE, y por qué se declara aquí arriba.

      Un mundo procedural puede tener toda la variación de color del mundo y
      seguir pareciendo una calcomanía esférica: sin sombra propia, el ojo no
      tiene con qué construir volumen. Lo que faltaba en Edmunds no era paleta,
      era topografía iluminada.

      Un mapa de normales de verdad pediría el gradiente del ruido, y eso son
      tres evaluaciones más por octava —el presupuesto que este shader tiene
      medido y cerrado—. La salida es usar relieve cuyo gradiente sea
      ANALÍTICO: sumas de ondas direccionales, donde la derivada es la misma
      onda desfasada y no cuesta una sola muestra extra.

      Cada mundo escribe aquí el desplazamiento de su término lambert; el
      terminador se recalcula después de los materiales con esa corrección
      dentro. A primer orden, inclinar la normal es exactamente eso.
    */
    float reliefOffset = 0.0;

    /* Ámbar del disco para la clave; azul tenue del fondo estelar para el
       relleno, que es lo que impide que la cara noche sea un agujero recortado. */
    /*
      LA CLAVE ES GARGANTÚA, y ahora se le nota.

      Con 0.84 / 0.62 el ámbar era casi blanco cálido: la luz llegaba pero no
      tenía TEMPERATURA, así que un casco iluminado por un disco de acreción se
      parecía demasiado a un casco iluminado en un plató. A 0.78 / 0.52 la cara
      que mira al disco queda inequívocamente dorada y la contraria se separa
      sola, sin subir contraste ni tocar exposición.
    */
    vec3 key = vec3(1.0, 0.78, 0.52) * uLightIntensity;
    /*
      Y el relleno es el CIELO, no una segunda lámpara.

      Valía 0.078/0.101/0.181 y competía con la clave: levantaba la cara noche
      de todos los cuerpos por igual y aplanaba la escena. Baja a poco más de la
      mitad y se enfría. Lo que resuelve la silueta contra el negro no es este
      término sino el contraluz de más abajo, que sí depende de la orientación.
    */
    vec3 fill = vec3(0.044, 0.058, 0.115);

    vec3 albedo;
    float gloss = 0.0;
    float specularPower = 42.0;
    float specularStrength = 0.9;
    float materialOcclusion = 1.0;
    vec3 emissive = vec3(0.0);
    /* Atmósfera: color del halo y cuánto pesa. Cero en lo que no tiene aire. */
    vec3 atmosphere = vec3(0.0);
    float atmosphereWeight = 0.0;
    float outputAlpha = 1.0;
    /* Miller reutiliza estos campos en su lámina de luz y en su filo de aire.
       Declararlos una vez evita repetir dos FBM completos después de resolver
       el material. millerGlitterMask viaja ya resuelta —oleaje por micro-
       oleaje, descontada la nube— porque quien la usa está veinte líneas más
       abajo y no tiene acceso a ninguno de sus tres ingredientes. */
    float millerWeather = 0.0;
    float millerGlitterMask = 0.0;
    /* Y sus corrientes zonales, que además de pintar tienen que ROMPER el
       reflejo extendido: una lámina de agua sin bandas se lee como gas. */
    float millerBands = 0.0;
    /* Y la rotura de la cresta, que es lo que convierte el camino de luz en
       una deformación del agua y no en una pincelada. Viaja resuelta por el
       mismo motivo que la máscara de destello: sus tres ingredientes —veta de
       bajío, oleaje y nube— viven en el bloque del material. */
    float millerCrestFoam = 0.0;
    /* Y Edmunds publica su cresta por el mismo motivo: quien la necesita —el
       filo de aire y el filo cálido— vive doscientas líneas más abajo, fuera
       del bloque donde se resuelven height, terrain y rugged. Es lo que
       convierte su limbo en topografía atrapando luz en vez de un filete
       continuo alrededor de una esfera. */
    float edmundsRidge = 0.0;

    if (uKind == 0) {
      /*
        Miller: un océano LUMINOSO, y esta vez con el mar en movimiento.

        ── El giro de dirección (2026-09-06, quinta revisión) ───────────────
        Las cuatro revisiones anteriores empujaron a Miller hacia lo oscuro y
        lo austero: agua honda casi negra, nubes casi retiradas, croma bajo.
        Técnicamente cada paso era correcto y el resultado conjunto no. El
        dueño lo vio en una captura aislada y lo dijo sin rodeos — «está muy
        apagado y oscuro». La referencia que dio es un mundo de agua ENCENDIDO:
        cian y turquesa, con nubes que se ven y con superficie viva.

        Así que la meta cambia de sitio. No se defiende «océano» quitándole luz
        al cuerpo: se defiende dándole COMPORTAMIENTO. Un gigante gaseoso no
        tiene un camino de luz especular que se desplaza, ni destellos que
        centellean, ni una cresta con espuma intermitente. Un océano sí, y eso
        se lee igual de bien —mejor— sobre un cuerpo brillante.

        Tres cosas nuevas y una recuperada:

        1. **El mar se mueve.** La marejada, el rizo medio y el microoleaje
           avanzan de verdad, no a la velocidad simbólica de antes. El sistema
           sigue quieto como manda la dirección artística —Miller no recorre su
           órbita— pero su SUPERFICIE respira, igual que el Tesseracto se
           reconfigura sin salir de su envolvente.
        2. **Las nubes vuelven a verse**, y se desplazan sobre el agua a otra
           velocidad que el oleaje. Ese desfase es meteorología: es lo que
           distingue una capa de vapor por encima de una superficie de un
           patrón pintado sobre ella.
        3. **La paleta se enciende.** Abismo azul de medianoche, océano cian,
           bajíos turquesa y lagunas de aguamarina. Cinco aguas, no tres grises
           azulados.
        4. **La cresta se queda.** Es lo único de las cuatro revisiones
           anteriores que el dueño aprobó explícitamente, y no depende de que
           el cuerpo sea oscuro: sigue siendo una zona plateada estrecha con
           espuma a tramos, sombra a un lado y ladera al otro.

        Presupuesto intacto: tres sitios de FBM y una octava suelta. Ni un draw
        call, ni una textura, ni un uniforme nuevo — la animación sale del
        uTime que este shader ya recibía.

        Y el movimiento no compromete la accesibilidad: con reduced-motion no
        hay canvas (ver lib/effects-mode.ts), así que el mar sólo se mueve para
        quien ya está viendo una escena en movimiento.
      */
      /* MACRO: la cuenca. Es la única escala que decide dónde el agua tiene
         fondo, y la que hace que el planeta tenga sitios y no manchas. Baja de
         1.72 a 1.55: masas algo más grandes, que es lo que deja sitio a que se
         distingan los tres tonos de agua en vez de mezclarse en uno. */
      float basin = fbm(vLocal * 1.55 + vec3(2.7, 0.0, 5.1));
      /* VETAS DE BAJÍO. Anisótropa —latitud comprimida ×2.8— y DEFORMADA por la
         macro: sin ese warp las vetas cruzan la cuenca y vuelven a ser ruido
         sobre una bola. Es el mismo truco que ordenó la geografía de Edmunds. */
      float shoal = fbm(
        vec3(vLocal.x, vLocal.y * 2.8, vLocal.z) * 3.05 + basin * 2.4
      );
      /* Y una banda direccional larga que las peina. Un océano visto desde
         órbita tiene corrientes, que son PATRONES LARGOS; el detalle repartido
         al azar es justo lo que no se quiere. */
      float current = 0.5 + 0.5 * sin(
        dot(vLocal, vec3(5.3, 2.1, -3.9)) + shoal * 4.6
      );
      /*
        CORRIENTES ZONALES. Siguen mandando sobre la geografía: son una banda
        LATITUDINAL, o sea que va con la curvatura del cuerpo y no con el ruido,
        y sobre la cara visible caen dos o tres. La macro y las vetas entran
        como perturbación para que no sean rayas de pijama.
      */
      float bandPhase = vLocal.y * 6.6 + basin * 0.8 - shoal * 0.4;
      millerBands = 0.5 + 0.5 * sin(bandPhase);
      /*
        Y EL BAJÍO SE ABRE, que es la mitad de por qué el cuerpo estaba oscuro.

        La puerta valía (0.50, 0.86) sobre una suma cuyo máximo real ronda 0.9:
        cubría un puñado de vetas finas y todo lo demás era agua honda. A
        (0.30, 0.74) el bajío pasa a ser una PROVINCIA —un tercio largo del
        cuerpo— y por fin hay superficie que iluminar. No era la paleta: era
        cuánto cuerpo llegaba a los tonos claros de la paleta.
      */
      float shallow = smoothstep(
        0.33,
        0.76,
        millerBands * 0.42 + basin * 0.40 + shoal * 0.20
      );
      /*
        NUBES, y esta vez se ven.

        Miller tiene una atmósfera de agua sobre un océano hervido por la marea:
        lo raro era que casi no tuviera nube. Tres cambios respecto de la
        «bruma» anterior:

          · La puerta baja de (0.66, 0.90) a (0.40, 0.76). Deja de ser un
            umbral de excepción y pasa a cubrir del orden de un cuarto del
            cuerpo, que es lo que se ve en la referencia del dueño.
          · La frecuencia baja de 2.85 a 2.35 y la compresión latitudinal de
            3.4 a 2.3: sistemas nubosos GRANDES con brazos, no encaje fino. A
            47 px de radio el encaje fino es grano.
          · Y se MUEVEN por el mismo eje que el mar pero a 0.10 unidades por
            segundo, o sea 4.7 px/s: el doble que el giro del cuerpo y menos de
            la mitad que el agua de debajo. La dirección compartida es lo que
            hace que el conjunto tenga marcha; la velocidad distinta es lo que
            las separa en dos capas. Si coincidieran en las dos cosas serían una
            sola pintura, y si no coincidieran en ninguna volveríamos al hervor.

            El campo se muestrea con la latitud comprimida ×3.1, así que para
            que el patrón viaje recto por el eje hay que compensar esa anisotropía
            en la deriva: 2.45 en x y z, 7.595 en y.
      */
      /*
        EL EJE Y EL PASO DEL MAR, declarados aquí arriba porque las nubes son su
        primer cliente y en GLSL no hay declaración diferida. Todo lo que se
        mueve en este cuerpo —cuatro trenes de oleaje y la capa de nube— sale de
        estos dos números, y ése es justamente el punto: un solo sentido de
        marcha y una sola velocidad de superficie.
      */
      vec3 swellA = vec3(3.7, -2.1, 2.9);
      vec3 seaAxis = normalize(swellA);
      float seaSpeed = 0.24;
      vec3 cloudDrift = vec3(2.45, 7.595, 2.45) * seaAxis * 0.10;
      millerWeather = fbm(
        vec3(vLocal.x, vLocal.y * 3.1, vLocal.z) * 2.45
          + cloudDrift * uTime + vec3(0.0, 0.0, 3.3)
      );
      /* Y la puerta sube un punto —0.47 a 0.51— porque la corrugación del rizo
         necesita agua donde verse: una nube que tapa no deja leer una ola. */
      float cloudCover = smoothstep(
        0.51, 0.86, millerWeather + current * 0.06 + millerBands * 0.05
      );
      /*
        ── EL MAR SE MUEVE ──────────────────────────────────────────────────

        Tres escalas de oleaje, las tres con gradiente ANALÍTICO —la derivada de
        un seno es un coseno y no cuesta una muestra más— y las tres avanzando a
        velocidades distintas. Que sean distintas es el punto: dos trenes a la
        misma velocidad son un dibujo que se traslada; tres a velocidades
        distintas son una superficie.

        ── DOS REGLAS QUE COSTARON UNA ENTREGA CADA UNA ────────────────────

        PRIMERA: la unidad que importa es el píxel por segundo, no el rad/s. Una
        fase no dice cuánto se mueve un patrón en pantalla; hay que dividirla por
        el número de onda para tener velocidad de superficie y multiplicarla por
        el radio del cuerpo en píxeles, que aquí son 47. Con esa cuenta, todo el
        oleaje de la primera versión iba entre 0.5 y 2.5 px/s — y Miller GIRA
        sobre su eje a 0.05 rad/s, o sea 2.35 px/s en su ecuador. Todas las olas
        se movían igual o más despacio que la superficie que las lleva, y un
        patrón que viaja a la velocidad de su soporte es textura pintada encima.
        Sobre un cuerpo que gira, un campo animado no existe hasta que su
        velocidad de superficie es varias veces la del giro.

        SEGUNDA, y es la que arregla esta pasada: **acelerar no basta si el
        movimiento no tiene MARCHA.** Con las velocidades ya subidas el dueño
        seguía sin ver olas, y medido sobre su grabación había un 34-46 % del
        disco cambiando por segundo. O sea: se movía, y aun así no se leía. El
        motivo es que los tres trenes iban en ejes distintos y a velocidades de
        superficie distintas, así que se deslizaban unos a través de otros. Eso
        no es oleaje, es HERVOR — y el ojo lo archiva como ruido, no como mar.

        Lo que hace que un mar se lea como mar es que sus crestas son largas,
        PARALELAS y avanzan TODAS HACIA EL MISMO LADO a la misma velocidad. Así
        que los cuatro trenes comparten ahora un solo eje —el de la marejada
        mayor— y una sola velocidad de superficie, 0.24 unidades por segundo:
        11.3 px/s, casi cinco veces el giro del cuerpo.

        Y como la fase de un tren avanza a k·v, cada uno lleva SU número de onda
        multiplicado por esa velocidad común. Eso es exactamente lo contrario de
        poner a todos la misma fase: fases iguales con números de onda distintos
        es precisamente lo que producía el deslizamiento.

        Lo que impide que el resultado sea una reja de seno perfecta no es el
        desorden de direcciones —ése era el problema— sino cuatro cosas que ya
        estaban: los 15° de desvío del segundo tren, el desfase del rizo por la
        veta de bajío, las bandas latitudinales que lo cruzan, y la espuma por
        segmentos.

        MAREJADA MAYOR, número de onda 5.22: dos o tres crestas sobre el
        diámetro, la escala lenta, y la que fija el eje de todo lo demás.
      */
      /* Y el segundo tren deja de cruzarse con el primero: mismo sentido de
         marcha, 15° de desvío y un número de onda medio (8.6) para que el par
         tenga grano sin tener batido. Antes iba a −2.4/3.2/4.1, o sea a 96° del
         otro y en sentido contrario — dos mares peleándose dentro del mismo
         planeta. */
      vec3 swellB = vec3(4.95, -3.43, 6.15);
      float swellPhaseA = dot(vLocal, swellA) + uTime * seaSpeed * 5.22;
      float swellPhaseB = dot(vLocal, swellB) + uTime * seaSpeed * 8.60;
      vec3 swellSlope = swellA * cos(swellPhaseA) * 0.8
                      + swellB * cos(swellPhaseB) * 0.2;
      vec3 oceanUp = normalize(vLocal);
      vec3 swellTangent = swellSlope - oceanUp * dot(swellSlope, oceanUp);
      /* La nube apaga el relieve porque tapa el agua, no porque la aplane. */
      reliefOffset = -dot(swellTangent, normalize(vLightLocal))
                   * 0.021 * (1.0 - cloudCover * 0.55);
      /*
        RIZO MEDIO, y es EL que se ve moverse: número de onda 15.5, o sea cinco
        crestas sobre el diámetro visible, en el mismo eje y al mismo paso que
        las dos marejadas. Es la pana que barre el cuerpo.

        Iba a (−1.9, 5.4, 3.1)·2.2, que está a 78° del eje de la marejada: por
        muy rápido que fuera, lo único que podía hacer era interferir con ella.
        Ahora es la propia dirección de swellA escalada, así que suma en vez de
        batir.

        No pinta color, porque a esta distancia el pigmento a esa escala es
        grano: lo que hace es inclinar la lámina y modular el brillo, que es
        exactamente como se ve el viento sobre el agua desde arriba. Y su
        amplitud sube de 0.0085 a 0.0098 — con un gradiente de 15.5 eso son
        quince centésimas de coseno sobre el término lambert, y es lo que
        convierte la corrugación en algo con contraste en vez de una sospecha.
        A 0.0125 ya no corrugaba: TALLABA, y las crestas salían como franjas
        negras que se comían el turquesa justo donde el dueño lo quería.
        La veta de bajío le sigue desfasando la cresta para que no sea una reja.
      */
      vec3 rippleDir = seaAxis * 15.5;
      float ripplePhase = dot(vLocal, rippleDir)
                        + uTime * seaSpeed * 15.5 + shoal * 3.1;
      float ripple = 0.5 + 0.5 * sin(ripplePhase);
      vec3 rippleSlope = rippleDir * cos(ripplePhase);
      vec3 rippleTangent = rippleSlope - oceanUp * dot(rippleSlope, oceanUp);
      reliefOffset += -dot(rippleTangent, normalize(vLightLocal))
                    * 0.0098 * (1.0 - cloudCover * 0.7);
      /* Y la cresta larga decide cuánto refleja: es la mitad de por qué se lee
         como lámina de agua y no como bruma. */
      float swellCrest = 0.5 + 0.5 * cos(swellPhaseA);
      /* Oleaje corto: no pinta, sólo pica la lámina de luz. También se alinea
         —iba por (6, 27, 0), a 71° del eje— y también viaja al paso común. */
      vec3 chopDir = seaAxis * 27.7;
      float waveField = 0.5 + 0.5 * sin(
        dot(vLocal, chopDir) + shoal * 4.8 + uTime * seaSpeed * 27.7
      );
      /* Una octava de ruido: microoleaje, por debajo del píxel a esta
         distancia, y el responsable de que el destello CENTELLEE en vez de
         quedarse quieto. Su deriva también va POR EL EJE del mar: como se
         muestrea en vLocal·18, para que el patrón viaje a la velocidad común
         hay que desplazar el dominio a 18 veces esa velocidad. Antes derivaba
         en (x, y) sin relación con nada. */
      float microWaves = noise(
        vLocal * 18.0 + seaAxis * (uTime * seaSpeed * 18.0)
      );

      /*
        ── PALETA: cinco aguas ──────────────────────────────────────────────

        La revisión anterior tenía tres tonos y los tres oscuros: petróleo, azul
        acero y un bajío gris. Aquí hay cinco y suben todos, con el salto de
        croma repartido en la parte ALTA de la rampa — el abismo se queda
        profundo porque es lo que sigue dando la escala, y lo que se enciende es
        el agua que recibe luz.

          abismo   (0.012, 0.052, 0.104)  azul de medianoche, no negro
          océano   (0.048, 0.223, 0.348)  el tono base, cian marino
          bajío    (0.132, 0.470, 0.545)  turquesa: la provincia iluminada
          laguna   (0.268, 0.632, 0.628)  aguamarina, sólo donde la corriente
                                          cruza el bajío
          nube     (0.780, 0.855, 0.900)  blanco frío, con el agua por debajo
      */
      albedo = mix(vec3(0.010, 0.046, 0.112), vec3(0.036, 0.212, 0.372), basin);
      albedo = mix(albedo, vec3(0.098, 0.398, 0.508), shallow * 0.66);
      /* La laguna es una VETA, no un continente: sale del cruce de la corriente
         con el bajío, así que sigue una dirección. */
      albedo = mix(
        albedo,
        vec3(0.232, 0.560, 0.586),
        shallow * smoothstep(0.58, 0.92, current) * 0.34
      );
      /*
        CORRIENTES OSCURAS. Sobreviven al giro de dirección porque no son
        oscuridad general: son masas ALARGADAS —la cuenca cruzada con la banda
        direccional— que separan una provincia de agua de la siguiente. Sin
        ellas, un cuerpo encendido se convierte en una bola de color plano. Lo
        que baja es su fuerza, de 0.46 a 0.26: cortan, no apagan.
      */
      float darkCurrent = smoothstep(0.60, 0.26, basin * 0.66 + current * 0.34);
      albedo *= 1.0 - darkCurrent * 0.26;
      /*
        LAS BANDAS INCLINAN LA LÁMINA, que es lo que las hace agua. Pintarlas en
        el albedo no basta: lo que se ve en un océano de verdad no es que el
        agua cambie de color por franjas, es que la lámina está inclinada por
        franjas y devuelve la luz de otra manera. Gradiente analítico: la
        derivada de la fase es la constante de la banda por el coseno.
      */
      vec3 bandSlope = vec3(0.0, 6.6, 0.0) * cos(bandPhase);
      vec3 bandTangent = bandSlope - oceanUp * dot(bandSlope, oceanUp);
      reliefOffset += -dot(bandTangent, normalize(vLightLocal)) * 0.019;
      /*
        ESCALA MEDIA: líneas suaves que siguen la curvatura. Es el tercer
        armónico de la misma banda latitudinal —nueve líneas sobre la cara
        visible en vez de tres—, desfasado por la veta de bajío para que no sea
        un rayado de regla y picado por la banda grande, así que sólo aparece
        dentro de una corriente. Cuesta un seno.
      */
      float detailPhase = bandPhase * 3.0 + shoal * 2.4;
      albedo *= 1.0 + sin(detailPhase) * millerBands * 0.13;
      vec3 detailSlope = vec3(0.0, 19.8, 0.0) * cos(detailPhase);
      vec3 detailTangent = detailSlope - oceanUp * dot(detailSlope, oceanUp);
      reliefOffset += -dot(detailTangent, normalize(vLightLocal))
                    * 0.0030 * millerBands;
      /* MICROCONTRASTE: un unsharp barato sobre la escala MEDIA, no sobre el
         grano. Aclara lo que ya era claro y hunde lo que ya era oscuro sin
         inventar estructura nueva ni tocar la jerarquía de masas. */
      albedo *= 1.0 + (shoal - 0.47) * 0.62;
      albedo *= 0.94 + millerBands * 0.12;
      /* Un hemisferio algo más profundo que el otro, sobre una dirección fija y
         sin ruido nuevo: lo justo para que el brillo no esté repartido con
         simetría de render. */
      float hemisphere = smoothstep(
        -0.55, 0.72, dot(oceanUp, vec3(0.38, 0.46, -0.80))
      );
      albedo *= mix(0.88, 1.08, hemisphere);
      /*
        Y LA NUBE PESA 0.62, no 0.055.

        Aquí estaba la otra mitad del apagón. La revisión anterior había dejado
        la nube en un tinte del 5 %, o sea invisible, y el argumento era que las
        masas pálidas competían con el camino de luz. Y competían — pero la
        respuesta buena no era borrarlas, era darles OTRA NATURALEZA. Una nube
        se distingue de un reflejo por tres cosas y ninguna es el brillo: se
        mueve a su propio ritmo, mata el especular de debajo, y tiene borde. Las
        tres están puestas, así que la nube ya puede ser tan clara como pide la
        referencia sin volver a confundirse con el reflejo.
      */
      albedo = mix(albedo, vec3(0.800, 0.868, 0.905), cloudCover * 0.24);
      /*
        BRILLO. El agua es la superficie más reflectiva del sistema, y por eso
        el mando no es «cuánto» sino «con qué forma». Aquí sólo queda el suelo;
        la forma la ponen el lóbulo anisótropo y el destello del oleaje, más
        abajo, ya con la luz resuelta.

        Y la nube lo mata: 0.06 bajo cobertura total. Es la propiedad que impide
        que una nube blanca se lea como reflejo, por clara que sea.
      */
      gloss = mix(0.95, 0.06, cloudCover);
      gloss *= 0.58 + waveField * 0.22 + microWaves * 0.2;
      /* Las bandas mandan sobre el brillo más que sobre el color: es la
         diferencia entre pintar rayas y tener corrientes. */
      gloss *= 0.6 + millerBands * 0.72;
      gloss *= 0.66 + swellCrest * 0.56;
      /* Y el rizo medio, que es el que se ve moverse, manda sobre el brillo
         casi tanto como sobre el relieve: un rizo que sólo inclina la lámina se
         nota en el terminador y en ningún otro sitio. */
      gloss *= 0.55 + ripple * 0.85;
      /* La máscara del destello viaja resuelta: quien la usa está doscientas
         líneas más abajo y no tiene acceso al oleaje ni a la nube. Con el
         microoleaje animado, esta máscara CENTELLEA. */
      millerGlitterMask = smoothstep(0.40, 0.80, waveField * 0.55 + microWaves * 0.45)
                        * (1.0 - cloudCover * 0.88);
      /*
        ESPUMA POR SEGMENTOS, y aquí empieza la cresta.

        «Espuma únicamente en algunos segmentos» — el dueño, en la revisión
        anterior, y es lo único de aquel pase que sigue en pie tal cual. Una
        deformación de mil kilómetros no rompe entera: rompe a trozos. Lo que
        manda es por tanto una escala GRANDE —la veta de bajío— y no el oleaje;
        el oleaje sólo pica por dentro de cada tramo, y ahora además hace que
        los tramos HIERVAN, porque el microoleaje avanza.
      */
      millerCrestFoam = smoothstep(0.42, 0.58, shoal)
                      * (0.38 + 0.62 * smoothstep(0.24, 0.86, waveField * 0.6 + microWaves * 0.4))
                      * (1.0 - cloudCover * 0.74);
      /*
        EL NÚCLEO ISÓTROPO. Exponente 320 y peso bajo: lo que queda es el
        corazón caliente del reflejo, unos pocos píxeles, dentro de la lámina
        anisótropa que sí tiene dirección. Sube de 0.085 a 0.16 con el resto del
        cuerpo, pero no cambia de FORMA — la mancha blanca redonda de las
        primeras versiones venía de un exponente 74, no de este peso.
      */
      specularPower = 320.0;
      specularStrength = 0.16;
      /*
        ATMÓSFERA. Vuelve a pesar de verdad —0.09 → 0.34— porque un mundo de
        agua con aire tiene halo, y el halo es parte de por qué la referencia
        del dueño se ve encendida. Sigue muy por debajo del 1.12 original, que
        era el que rodeaba el cuerpo por igual también en la cara noche; el aire
        CON DIRECCIÓN lo sigue poniendo el filo del bloque de más abajo.
      */
      atmosphere = vec3(0.216, 0.492, 0.784);
      atmosphereWeight = 0.26;
    } else if (uKind == 1) {
      /*
        Edmunds: roca seca, hierro y arena bajo la luz de Gargantúa.

        ── Revisión de geología (2026-09-06) ────────────────────────────────

        El dueño lo mira aislado y el diagnóstico es de jerarquía, no de
        paleta: la superficie tiene «muchas manchas de tamaño parecido» y
        «casi todo tiene importancia parecida». Eso es exactamente lo que se
        ve, y tiene una causa concreta que conviene dejar escrita porque es
        contraintuitiva.

        Las cuatro provincias se decidían con smoothsteps ESTRECHOS —de 0.05 a
        0.065 de ancho— sobre un campo de fbm de cuatro octavas. Una fbm a
        frecuencia 1.28 no es una forma grande: es una forma grande MÁS tres
        octavas por encima que suman ±0.15 de rizado, o sea tres veces el
        ancho de la puerta que decide la frontera. El resultado es que el
        contorno de cada provincia no lo dibujaba la macroforma sino la octava
        fina, y por eso salían islas del mismo calibre en todas partes. Subir
        la escala de la macro no lo arreglaba: el rizado sube con ella.

        La salida no es más ruido ni menos: es cambiar QUIÉN MANDA.

        1. **El campo que decide la geografía pasa a ser ANALÍTICO.** Tres
           ondas direccionales de frecuencia baja —una o dos ondulaciones por
           cuerpo— construyen la tectónica. Es liso por construcción, así que
           una puerta ancha da una masa grande y no un encaje. La fbm sigue
           ahí, pero degradada a PERTURBACIÓN de la frontera (0.26 de peso):
           lo que impide que las masas parezcan estampadas a máquina.

        2. **Y trae su propia pendiente.** La derivada de una suma de senos es
           la misma suma desfasada: cuesta tres cosenos y ninguna muestra de
           ruido. Ésa es la pieza que faltaba de verdad — el relieve percibido
           que pide la revisión. Hasta ahora el desplazamiento del terminador
           salía de ondas de frecuencia 12-15 (corrugación fina, que a 54 px de
           radio es grano) y de una derivada de pantalla; ninguno de los dos
           coincidía con las manchas de color. Un cuerpo cuyo color y cuyo
           sombreado hablan de dos terrenos distintos se lee como calcomanía
           por mucha textura que tenga. Ahora la misma función pinta la
           provincia y la ilumina, y por eso la cuenca tiene borde encendido y
           el valle tiene sombra.

        3. **La región montañosa se define por PENDIENTE, no por altura.** Es
           gratis —ya tenemos el gradiente— y es lo que separa de verdad los
           cuatro accidentes que pide la revisión: la cuenca y la meseta son
           sitios LLANOS a distinta altura, la cordillera es un sitio INCLINADO
           a media altura, y la planicie mineral es el resto. Cuatro masas que
           se distinguen por cómo responden a la luz, no sólo por su tinte.

        4. **El detalle pequeño pasa a ser subordinado y condicional.** La
           escala media deja de modular el albedo por igual en todo el cuerpo
           (±12 % plano) y pasa a pesar ±5 % en la llanura y ±20 % en la
           cordillera; el grano baja de ±4 % a ±2.5 %; y los estratos dejan de
           seguir al ruido para seguir a la ALTURA, que es lo que hacen los
           estratos de verdad — bandas paralelas a la topografía, visibles en
           el escarpe y no en la llanura.

        Nada de esto añade una llamada de ruido: siguen siendo dos sitios de
        fbm y uno de noise. Lo que se añade son seis senos y tres cosenos.

        ── Paleta: Edmunds es Creatividad, y se le nota en el mineral ───────

        La revisión pide riqueza mineral sin planeta de fantasía: ocre, cobre,
        carbón, arcilla, arena y un oliva muy apagado. Se cumple sin subir la
        saturación media: el hierro rojizo se desplaza hacia CARBÓN —neutro y
        oscuro, que es lo que abre sitio a que los cálidos se lean como
        cálidos—, el macizo pasa a COBRE, y la cuenca gana una veta de OLIVA
        apagado en su fondo. Seis minerales donde había cuatro, con el mismo
        recorrido de valor.
      */
      /* ── 1. TECTÓNICA. Baja frecuencia, lisa, y con gradiente analítico. */
      vec3 up = normalize(vLocal);
      vec3 lightLocal = normalize(vLightLocal);
      /*
        La frecuencia se calibró contra la pantalla y hubo que subirla.

        El primer intento usó vectores de módulo 3: sobre una esfera de radio
        1 eso es MEDIA ondulación por cuerpo, así que el campo entero era un
        degradado y salían dos masas, no cuatro. El cuerpo pasó de manchado a
        liso —de un defecto al contrario— y con él se fueron la cordillera y
        el estriado, que estaban gateados por la pendiente.

        Con módulos de 4.2 a 6.1 la fase recorre unas dos ondulaciones de
        diámetro a diámetro, que sobre el disco visible son las tres o cuatro
        masas que pide la revisión. Los tres módulos son distintos a propósito:
        con los tres iguales el patrón se lee como una rejilla.
      */
      vec3 tectA = vec3(4.90, -2.96, 2.21);
      vec3 tectB = vec3(-1.62, 3.76, 3.48);
      vec3 tectC = vec3(2.18, 1.53, -3.28);
      float tPhaseA = dot(vLocal, tectA) + 0.7;
      float tPhaseB = dot(vLocal, tectB) - 1.9;
      float tPhaseC = dot(vLocal, tectC) + 3.1;
      float tectonic = sin(tPhaseA) * 0.46
                     + sin(tPhaseB) * 0.33
                     + sin(tPhaseC) * 0.21;
      vec3 tectonicGrad = tectA * cos(tPhaseA) * 0.46
                        + tectB * cos(tPhaseB) * 0.33
                        + tectC * cos(tPhaseC) * 0.21;
      /* Sólo la componente tangente inclina la superficie: la radial es
         cambio de radio, no de pendiente. */
      vec3 tectonicSlope = tectonicGrad - up * dot(tectonicGrad, up);

      float provinces = fbm(vLocal * 1.28 + vec3(4.2, 1.1, 7.3));
      float terrain = fbm(vLocal * 4.6 + provinces * 1.9);
      float grain = noise(vLocal * 15.5);

      /* ── 2. CUATRO ACCIDENTES. La fbm sólo desordena la frontera. */
      /* La perturbación sube de 0.26 a 0.40. Es la corrección del exceso
         contrario: con la tectónica mandando sola, las fronteras salían tan
         lisas que las masas parecían aerografiadas, y una provincia geológica
         tiene borde EROSIONADO. A 0.40 la fbm vuelve a decidir por dónde
         serpentea la frontera sin volver a decidir cuántas hay, que es lo que
         hacía cuando las puertas eran estrechas. */
      float elevation = 0.5 + tectonic * 0.34 + (provinces - 0.47) * 0.40;
      /* Escarpado: dónde el terreno está INCLINADO. La cordillera y la zona
         fracturada viven aquí, y por construcción son formas alargadas
         —crestas y fallas— y no discos. Ése es el otro motivo de que la
         versión anterior derivara a cráteres: una puerta sobre una fbm
         isótropa sólo sabe hacer manchas redondas. */
      float rugged = smoothstep(1.05, 2.70, length(tectonicSlope));
      /* Cuenca: bajo. Tierras altas: alto. Las puertas son ANCHAS —0.24 y
         0.26 contra los 0.05 de antes— porque sobre un campo liso una puerta
         ancha es un borde erosionado, no una transición borrosa. */
      float lowland = 1.0 - smoothstep(0.30, 0.38, elevation);
      float highland = smoothstep(0.62, 0.72, elevation);
      /* Y las cuatro masas salen de cruzar altura con pendiente. */
      float pan = lowland * (1.0 - rugged * 0.78);
      float plateau = highland * (1.0 - rugged * 0.86);
      float upland = rugged * (1.0 - lowland * 0.55);
      /* La planicie mineral es lo que queda: ni alta, ni baja, ni inclinada.
         Es la única provincia que no se declara — se deduce, que es lo que la
         convierte en el fondo sobre el que se leen las otras tres. Y su
         exclusión por pendiente es PARCIAL (0.6): con el producto entero de
         los tres complementos se quedaba en una cáscara delgada entre las
         otras provincias, y un fondo que no cubre nada no es un fondo. */
      float mineralPlain = (1.0 - lowland) * (1.0 - highland)
                         * (1.0 - rugged * 0.6);
      /*
        MESAS, y por qué hacía falta un quinto término.

        Con la geografía resuelta por un campo liso, el cuerpo pasó de
        manchado a AEROGRAFIADO: masas grandes correctas, pero sin un solo
        borde duro dentro de ellas, y una superficie sin bordes duros no se
        lee como roca por mucho que su composición sea buena. El detalle que
        quedaba —la modulación de escala media— pesaba un ±3 % típico: nada.

        La respuesta NO es volver a repartir manchas por todo el cuerpo. Es
        meter accidentes de borde duro DENTRO de las provincias y no fuera:
        una puerta estrecha sobre la escala media, multiplicada por la meseta
        y la cordillera. Confinados así, no compiten con las macroformas
        —viven dentro de una— y por construcción son más pequeños que ellas.
        Eso es exactamente lo que la revisión llama detalle subordinado.

        Y escriben en el relieve, no sólo en el color: el escalón de una mesa
        tiene una cara iluminada y una en sombra, que es lo que separa un
        accidente de una mancha.
      */
      float mesa = smoothstep(0.455, 0.525, terrain)
                 * max(plateau, upland * 0.62);

      /* ── 3. RELIEVE. Tres escalas, y ahora la que manda es la grande. */
      /*
        Macro. Es el término nuevo y el que resuelve la revisión: la ladera de
        una cordillera, el borde iluminado de una cuenca y la sombra de un
        valle salen de aquí, y coinciden con el color porque comparten campo.
        Pesa 0.030 sobre una pendiente tangente cuya media ronda 1.95: unos
        ±0.06 de desplazamiento del terminador en terreno normal y hasta ±0.14
        en el escarpe, que a esta escala es la diferencia entre una bola
        pintada y un cuerpo con terreno. El peso bajó de 0.052 a 0.030 al subir
        la frecuencia porque lo que importa es el PRODUCTO: una pendiente el
        doble de empinada con el mismo peso habría duplicado la excursión del
        terminador y devuelto un planeta de yeso.
      */
      reliefOffset = -dot(tectonicSlope, lightLocal) * 0.022;

      /* Media: la corrugación de cresta que ya existía, ahora SUBORDINADA y
         condicional. En la llanura y en la meseta casi no se nota; en la
         cordillera es lo que pone el detalle de ladera. Antes pesaba igual en
         todas partes y por eso el cuerpo entero tenía la misma textura. */
      vec3 waveA = vec3(12.7, 7.9, -8.9);
      vec3 waveB = vec3(-7.1, 14.3, 10.4);
      vec3 waveC = vec3(9.4, -11.6, 15.1);
      float phaseA = dot(vLocal, waveA);
      float phaseB = dot(vLocal, waveB);
      float phaseC = dot(vLocal, waveC);
      float height = sin(phaseA) * 0.5 + sin(phaseB) * 0.34 + sin(phaseC) * 0.26;
      vec3 slope = waveA * cos(phaseA) * 0.5
                 + waveB * cos(phaseB) * 0.34
                 + waveC * cos(phaseC) * 0.26;
      vec3 tangentSlope = slope - up * dot(slope, up);
      reliefOffset += -dot(tangentSlope, lightLocal) * 0.0125 * (0.16 + 0.9 * upland);

      /*
        Media: escarpes por derivada de pantalla, y la altura que se deriva
        CAMBIA DE ESCALA.

        Se calculaba sobre terrain —fbm a frecuencia 4.6, cuya cuarta octava
        cae en 38 y tiene longitud de onda de nueve píxeles—. La derivada de
        pantalla de eso no es orografía: es moteado por píxel, y era la mitad
        de lo que el dueño describe como ruido pequeño trabajando demasiado.

        Ahora deriva sobre provinces (frecuencia 1.28, la octava más fina en
        10.8, unos treinta píxeles) más los bordes de las macroformas, y deja
        a terrain un tercio del peso que tenía. Es literalmente el reparto que
        pide la revisión —más estructura grande, menos ruido pequeño— aplicado
        al término que decide qué se ve como bulto.
      */
      float geologicalHeight = highland * 0.22 - lowland * 0.24
                             + upland * 0.10 + provinces * 0.40
                             + terrain * 0.15 + mesa * 0.12;
      vec3 dpdx = dFdx(vLocal);
      vec3 dpdy = dFdy(vLocal);
      vec3 acrossY = cross(dpdy, up);
      vec3 acrossX = cross(up, dpdx);
      float determinant = dot(dpdx, acrossY);
      vec3 geologicalSlope = (dFdx(geologicalHeight) * acrossY
                            + dFdy(geologicalHeight) * acrossX)
                           * sign(determinant) / max(abs(determinant), 1e-8);
      reliefOffset += clamp(-dot(geologicalSlope, lightLocal) * 0.026, -0.070, 0.070);

      /*
        Y la CRESTA se publica para el limbo.

        El otro defecto que señala la revisión es el filete claro continuo del
        contorno derecho: un rim uniforme alrededor de una esfera es la firma
        de un render, no de un planeta. Lo que se pide es que la luz atrape
        relieve —luz, nada, destello, negro— y eso necesita una máscara de
        cresta que varíe DEPRISA a lo largo del limbo. La corrugación media
        varía a esa velocidad, así que el filo de aire y el filo cálido de más
        abajo se multiplican por esto en vez de rodear el cuerpo por igual.
      */
      edmundsRidge = smoothstep(
        0.36,
        0.64,
        clamp(0.5 + height * 0.62 + (terrain - 0.5) * 0.55 + rugged * 0.18,
              0.0, 1.0)
      );

      /* ── 4. MINERAL. Seis materiales, mismo recorrido de valor. */
      /*
        EL SUSTRATO ES LA PLANICIE MINERAL, y esto es una corrección de fondo.

        La planicie estaba escrita como una provincia con máscara propia
        —mineralPlain pintando carbón sobre un sustrato umber— y en pantalla
        salía como una MANCHA GRIS REDONDA de bordes suaves en mitad del
        cuerpo. O sea, justo el vocabulario que la revisión prohíbe: el ojo lo
        leía como un cráter enorme y difuminado, no como una llanura.

        El error era de categoría. Un fondo no tiene frontera: es aquello
        contra lo que se recortan los accidentes. Así que el carbón deja de
        ser una máscara y pasa a ser el SUSTRATO —oscuro, casi neutro, y
        texturado por la escala media en todo el cuerpo—, y encima de él se
        recortan los tres accidentes que sí tienen forma: cuenca de arcilla,
        cordillera de cobre y meseta de arena.

        La consecuencia práctica es que el cuerpo gana su cuarta masa sin
        dibujarla, y que la llanura ya no puede leerse como un accidente
        circular porque no tiene contorno.
      */
      albedo = mix(vec3(0.068, 0.064, 0.066), vec3(0.152, 0.108, 0.082), terrain);
      /* Y lo que queda de mineralPlain es un ligero ahondamiento de lo más
         llano: sin contorno propio —ya no puede tenerlo, el sustrato es de su
         mismo color— sólo profundiza medio escalón donde el terreno no tiene
         ni altura ni pendiente. Es lo que impide que la llanura salga plana de
         valor además de plana de relieve. */
      albedo *= 1.0 - mineralPlain * 0.16;
      /*
        ARCILLA en el fondo de la cuenca — y NO es la masa más clara.

        Estaba en 0.47/0.386/0.296 y la meseta de arena en 0.61/0.428/0.256:
        dos masas separadas por 0.09 de valor y por casi nada de tinte, o sea
        una sola mancha pálida partida por una frontera invisible. Ahora la
        arcilla es más FRÍA y más apagada y la arena se queda con el extremo
        claro: la cuenca es polvo depositado, la meseta es roca barrida por el
        viento, y a la distancia del hero se distinguen sin leer la etiqueta.
      */
      albedo = mix(albedo, vec3(0.318, 0.282, 0.240), pan * 0.66);
      /* OLIVA muy apagado en el centro de la cuenca. Es la nota de color que
         pide Creatividad y pesa un tercio: a este peso no se lee como verde,
         se lee como que la arcilla del fondo no es la misma arcilla del
         borde. */
      albedo = mix(albedo, vec3(0.226, 0.226, 0.138), pan * lowland * 0.66);
      /* COBRE en la cordillera, y ocupa el escalón medio-oscuro: por debajo
         de la arcilla y muy por encima del carbón. Es el más saturado de los
         seis minerales, que es lo que le toca — la montaña es donde la roca
         está recién partida y el óxido todavía no se ha lavado. */
      albedo = mix(albedo, vec3(0.468, 0.222, 0.112), upland);
      /* ARENA en la meseta. Sin tocar: es la masa clara del hemisferio diurno
         y la referencia contra la que se ajustó todo lo demás. */
      albedo = mix(albedo, vec3(0.496, 0.338, 0.186), plateau * 0.84);

      /* La cara alta de la mesa barrida por el viento, un escalón por encima
         de la provincia que la sostiene. El borde es estrecho a propósito:
         es la única frontera dura del cuerpo, y de ella sale la sensación de
         roca que ninguna macroforma puede dar por sí sola. */
      albedo = mix(albedo, vec3(0.466, 0.330, 0.196), mesa * 0.56);

      /*
        ESTRATOS, y ahora siguen la topografía.

        Antes su fase era ruido de escala media —bandas que cruzaban las
        provincias sin relación con nada— y ésa es media respuesta a por qué el
        cuerpo se leía procedural. Un estrato es una capa horizontal cortada
        por la erosión: en planta se ve como una CURVA DE NIVEL. Con la fase
        tomada de la altura salen exactamente eso, y se apiñan donde el terreno
        es empinado, que es donde de verdad se ven.
      */
      float strataPhase = elevation * 44.0 + (terrain - 0.5) * 6.5;
      float strata = sin(strataPhase);
      float strataVisible = 1.0 - smoothstep(0.7, 2.2, fwidth(strataPhase));
      albedo *= 1.0 - (0.5 + 0.5 * strata)
              * max(max(upland, plateau * 0.7), max(pan * 0.5, mineralPlain * 0.45))
              * strataVisible * 0.30;

      /* La escala media deja de pesar lo mismo en todas partes: ±5 % en la
         llanura, ±20 % en la cordillera. Es literalmente el reparto que pide
         la revisión — detalle pequeño SUBORDINADO a la estructura grande. */
      albedo *= 1.0 + (terrain - 0.5) * (0.24 + 0.26 * upland);

      /*
        UNA FRACTURA LARGA, y esta vez también se hunde.

        Seguía a la fbm de provincia y sólo cambiaba de color; una falla que no
        proyecta sombra es una raya pintada. Ahora sigue a la TECTÓNICA —así
        que corta el terreno en el sentido en que el terreno está plegado— y su
        labio escribe en reliefOffset: un lado atrapa la luz de Gargantúa y el
        otro se apaga.
      */
      float faultCoord = dot(vLocal, vec3(0.72, -0.43, 0.54))
                       + tectonic * 0.22 + (provinces - 0.5) * 0.30 - 0.16;
      float faultWidth = max(fwidth(faultCoord), 0.008);
      float fault = 1.0 - smoothstep(0.016, 0.016 + faultWidth * 1.6, abs(faultCoord));
      float faultLip = (1.0 - smoothstep(0.0, 0.055, abs(faultCoord - 0.028)))
                     - (1.0 - smoothstep(0.0, 0.055, abs(faultCoord + 0.028)));
      reliefOffset += faultLip * 0.045;
      float sediment = 1.0 - smoothstep(0.04, 0.12, abs(faultCoord - 0.09));
      albedo = mix(albedo, vec3(0.372, 0.268, 0.168), sediment * (0.24 + upland * 0.34));
      albedo *= 1.0 - fault * (0.18 + upland * 0.34);
      /* Grano: de ±4 % a ±2.5 %. Es lo que la revisión llama ruido pequeño, y
         a 54 px de radio su única función honesta es quitarle plástico a las
         transiciones. */
      albedo *= 0.972 + grain * 0.056;
      /* Y la sombra de valle de la corrugación media, gateada a la cordillera
         igual que su relieve. */
      albedo *= 1.0 - (1.0 - smoothstep(-0.85, -0.3, height)) * upland * 0.20;

      /* Arena expuesta sólo en una fracción de crestas orientadas hacia la
         luz. Es reflectancia difusa; sigue apagándose con la cara nocturna. */
      float crest = smoothstep(0.48, 0.92, height) * upland;
      float crestFacing = smoothstep(0.015, 0.12, reliefOffset)
                        * smoothstep(0.0, 0.55, ndl);
      albedo = mix(albedo, vec3(0.512, 0.388, 0.260), crest * crestFacing * 0.44);
      /* Y la desaturación baja otra vez, de 0.975 a 0.985. El gris que se le
         restaba existía para evitar el planeta de fantasía, y el peligro es
         real; pero el sustrato de este cuerpo ya ES casi neutro por diseño
         —el carbón—, así que el freno estaba actuando dos veces sobre lo
         mismo y lo único que quitaba era la distancia entre cobre, arcilla,
         oliva y arena, que es exactamente la riqueza mineral que la revisión
         pide en el cuerpo de Creatividad. */
      float groundLuma = dot(albedo, vec3(0.2126, 0.7152, 0.0722));
      albedo = mix(vec3(groundLuma), albedo, 0.985);
      gloss = 0.018;
      specularPower = 56.0;
      specularStrength = 0.18;
      /* El aire se resuelve abajo como filo direccional. Sin halo común. */
    } else if (uKind == 4) {
      /*
        Endurance: mantas térmicas y panel pintado, no metal cromado.

        La nave de la película comparte lenguaje con la ISS: blanco roto,
        costuras anchas, recesos grises y variación de roughness. A la escala
        del Hero las costuras finas sólo producen moiré, así que el patrón
        trabaja en bloques grandes y deja que la silueta cuente los módulos.
      */
      vec4 surface = texture2D(uSurfaceMap, fract(vUv));
      float blanket = surface.r;
      float warmFoil = surface.g;
      float seam = surface.b;
      float microRoughness = surface.a;
      float macroVariation = fbm(vLocal * 3.6 + vec3(2.7, 0.8, 5.1));
      /*
        VALOR, que es lo que ordena una silueta a 160 px.

        Con toda la nave en manta clara el conjunto se leía como una mancha
        blanca con motas oscuras: había piezas, pero no jerarquía. La manta
        estándar —rieles, cordones, satélites— baja a gris medio y deja el
        marfil apagado para los cuatro módulos principales. Tres valores
        separados hacen el trabajo que doce siluetas iguales no hacían.
      */
      /*
        FASE 1 · PASE 1 (2026-09-05). Lo que fallaba no era que estuviera clara:
        era que estaba PLANA. Con 117° entre la luz y la cámara —medido, no
        estimado— casi todo lo que se ve de esta nave cae del lado del
        terminador, así que su lectura no la puede dar el difuso. La da el
        reparto de valor entre familias de material y el filo.

        Manta estándar: mismo sitio en la escala, más recorrido dentro de ella.
        El extremo oscuro baja y el claro sube, así que la misma pieza tiene
        ahora caras separadas en vez de un gris único con motas.
      */
      albedo = mix(vec3(0.078, 0.088, 0.104), vec3(0.345, 0.338, 0.314), blanket);
      albedo = mix(albedo, vec3(0.72, 0.49, 0.27), warmFoil * 0.30);
      /* La costura pesaba 0.68 y dibujaba una rejilla casi negra sobre cada
         cara: a tamaño de Hero la nave parecía forrada de azulejos. Una manta
         térmica real tiene juntas, pero no son surcos —van cosidas, no
         mecanizadas— y a esta distancia valen un cuarto de lo que valían. */
      albedo = mix(albedo, vec3(0.12, 0.13, 0.145), seam * 0.34);
      albedo *= 0.9 + macroVariation * 0.17;
      /* Y el brillo también se separa: la manta responde, la roca no. Subir el
         gloss aquí es lo que permite que la lámina ancha de más abajo encuentre
         módulos concretos en vez de barrer la nave entera por igual. */
      gloss = mix(0.36, 0.12, microRoughness);
      specularPower = 78.0;
      specularStrength = 0.68;

      /* Cuatro acabados dentro del mismo draw: la máscara viaja como atributo
         de vértice y la textura sigue siendo común. */
      /* El canal de manta ya lleva la junta restada, así que arrastra consigo
         la rejilla de paneles. El ala la devuelve: un plano sustentador tiene
         largueros en el sentido de la cuerda, no un damero. */
      float smoothPlate = clamp(blanket + seam * 0.4, 0.0, 1.0);

      if (vSurfaceMask > 2.5) {
        /*
          Radiador. No es «una caja más oscura»: es la única superficie de la
          nave con estriado DIRECCIONAL, y esa dirección —perpendicular al
          brazo— es lo que la separa de todo lo demás en una silueta de 160 px.
        */
        /* El estriado gana recorrido —de 0.15 a 0.20 de separación entre valle
           y cresta— y el valle se hunde: es la única superficie de la nave que
           puede permitirse ser casi negra sin perder su dirección. */
        float ribs = smoothstep(0.28, 0.5, abs(fract(vUv.x * 13.0) - 0.5));
        albedo = mix(vec3(0.038, 0.046, 0.060), vec3(0.235, 0.258, 0.286), ribs);
        gloss = 0.22 + ribs * 0.46;
        specularPower = 44.0;
        specularStrength = 0.66;
      } else if (vSurfaceMask > 1.5) {
        /* Grafito satinado, y AHORA SÍ oscuro. Terminaba en 0.49/0.54/0.58 —un
           acero medio— así que competía en valor con la manta principal y las
           dos se fundían en una sola masa. Es el material de las juntas y los
           encastres: su trabajo es separar piezas, no exhibirse. */
        albedo = mix(vec3(0.052, 0.059, 0.068), vec3(0.232, 0.245, 0.258), blanket * 0.55);
        albedo = mix(albedo, vec3(0.028, 0.038, 0.05), seam * 0.72);
        gloss = 0.54;
        specularPower = 64.0;
      } else if (vSurfaceMask > 0.5) {
        /* Módulos principales: manta más clara y reflectante. La repetición
           cada 90° crea jerarquía sin sumar colores ni paneles aleatorios. */
        /*
          Aluminio marfil. Bajó de 0.72 a 0.49 para quitarle el aspecto de
          plástico blanco, y ahí se pasó de frenada: a 0.49 los cuatro módulos
          principales dejaban de ser los cuatro módulos principales. Vuelve a
          0.66, que NO es volver al punto de partida —el 0.72 era un blanco
          plano y esto es un marfil con recorrido de 0.105 a 0.66— y recupera
          lo que la jerarquía necesita: una familia claramente más clara que
          las otras tres.
        */
        albedo = mix(vec3(0.098, 0.107, 0.119), vec3(0.735, 0.700, 0.622), blanket);
        albedo = mix(albedo, vec3(0.115, 0.125, 0.14), seam * 0.3);
        gloss = mix(0.46, 0.16, microRoughness);
        specularPower = 108.0;
        specularStrength = 0.86;
      }
      /* Oclusión de los recesos entre rieles: sólo las caras que miran hacia
         el interior del aro. Las tapas exteriores conservan su luz directa. */
      vec3 radialNormal = vec3(vLocal.xy, 0.0) / max(length(vLocal.xy), 0.001);
      float inward = max(-dot(normalize(vNormalL), radialNormal), 0.0);
      /* La banda de receso se ensancha (0.12-0.32 en vez de 0.10-0.27) y empieza
         antes en radio: alcanza también el encastre de los brazos, que es donde
         la nave tiene sus huecos más profundos y donde el gris uniforme se
         notaba más. La profundidad sube de 0.78 a 0.88. */
      float railCavity = (1.0 - smoothstep(0.12, 0.32, abs(vLocal.z)))
                       * smoothstep(0.30, 0.66, length(vLocal.xy));
      materialOcclusion = 1.0 - inward * railCavity * 0.93;
    } else if (uKind == 5) {
      /*
        Ranger: chapa aeronáutica, no manta térmica.

        La textura de esta nave lleva junta marcada y remache; aquí se traduce
        en un metal más oscuro y bastante más pulido que el de la Endurance —una
        lanzadera de veinte metros se fabrica, no se forra— y con la variación
        de rugosidad subiendo al doble. Es lo que hace que el barrido especular
        del disco recorra el fuselaje en vez de dejarlo plano.
      */
      vec4 surface = texture2D(uSurfaceMap, fract(vUv * 1.15));
      float blanket = surface.r;
      float warmFoil = surface.g;
      float seam = surface.b;
      float microRoughness = surface.a;
      /*
        FASE 1 · PASE 3 (2026-09-05). La chapa arrancaba en 0.425 y terminaba en
        0.90: un recorrido de medio punto sobre un valor ya alto, que en pantalla
        es una nave de un solo tono. El extremo oscuro baja a 0.30 y el claro se
        calienta —una nave iluminada por un disco ámbar no devuelve blanco
        neutro— así que el fuselaje pasa a tener zonas, y la junta se hunde más
        (0.62 → 0.74) para que esas zonas tengan bordes.
      */
      albedo = mix(vec3(0.340, 0.345, 0.356), vec3(0.960, 0.942, 0.908), blanket);
      albedo = mix(albedo, vec3(0.78, 0.63, 0.43), warmFoil * 0.26);
      /*
        0.74 -> 0.58, y es consecuencia directa de que la junta ahora mida un
        texel. Con la junta ancha del System Map hundirla casi a negro era lo
        que la hacía visible a setenta pixeles; con la junta fina del
        laboratorio, ese mismo 0.74 dibuja una retícula de rayas negras sobre
        la chapa. Lo que la hace visible ahora no es su negrura, es el labio
        claro que lleva al lado — y ese vive en el canal de chapa.
      */
      albedo = mix(albedo, vec3(0.082, 0.086, 0.094), seam * 0.58);
      gloss = mix(0.86, 0.24, microRoughness);
      specularPower = 68.0;
      specularStrength = 1.22;

      /* El canal de manta ya lleva la junta restada, así que arrastra consigo
         la rejilla de paneles. El ala la devuelve: un plano sustentador tiene
         largueros en el sentido de la cuerda, no un damero. */
      float smoothPlate = clamp(blanket + seam * 0.4, 0.0, 1.0);

      if (vSurfaceMask > 2.5) {
        /*
          Plano sustentador. Un valor propio, más oscuro y más mate que el
          fuselaje: sin esa diferencia el ala y el cuerpo se funden en una sola
          mancha y la nave pierde su planta justo al tamaño en que se mira.
          Las líneas de cuerda van con la envergadura, como los largueros.
        */
        /* El plano baja un escalón entero respecto del fuselaje. Antes iba de
           0.362 a 0.80 —o sea, casi el mismo sitio que la chapa— y por eso ala
           y cuerpo se fundían; el larguero oscuro tenía que hacer solo todo el
           trabajo de separarlos. Ahora los separa el valor, y el larguero
           dibuja el filo. */
        /*
          Siete largueros finos donde había cuatro brochazos.

          Con smoothstep(0.42, 0.5) sobre cuatro periodos, cada linea ocupaba
          el 16 % de la cuerda: a setenta pixeles eso es sombreado y a
          seiscientos es una cebra. Ahora son siete y miden la sexta parte, con
          su propio labio claro por delante — el mismo recurso que la junta del
          fuselaje, y por el mismo motivo: una linea oscura sola se lee como
          pintura, una linea oscura con brillo al lado se lee como un canto.
        */
        float rib = abs(fract(vUv.y * 7.0) - 0.5);
        float chordwise = smoothstep(0.47, 0.5, rib);
        float ribLip = smoothstep(0.47, 0.43, rib) * smoothstep(0.38, 0.43, rib);
        albedo = mix(vec3(0.300, 0.307, 0.318), vec3(0.780, 0.774, 0.758), 0.3 + smoothPlate * 0.45);
        albedo = mix(albedo, vec3(0.078, 0.083, 0.090), chordwise * 0.52);
        albedo += vec3(0.055, 0.054, 0.052) * ribLip;
        /* Y la envergadura tiene gradiente: el plano se aclara hacia la punta,
           que es donde la chapa es mas fina y el sol rasante la encuentra
           antes. Sin esto un ala es un poligono de un solo valor. */
        albedo *= 0.94 + 0.12 * vUv.x;
        gloss = mix(0.54, 0.18, microRoughness);
        specularPower = 48.0;
        specularStrength = 0.86;
      } else if (vSurfaceMask > 1.5) {
        /* Tapa de servicio. Bajó de saturación: en naranja pleno eran lo
           primero que se veía de la nave, por delante de la proa. */
        albedo = mix(vec3(0.17, 0.075, 0.03), vec3(0.62, 0.31, 0.10), smoothPlate);
        gloss = 0.31;
        specularPower = 38.0;
      } else if (vSurfaceMask > 0.5) {
        /*
          Cristal polarizado: casi negro, con suficiente azul para recuperar
          volumen cuando el barrido especular cruza la cabina.

          Y con DOS cosas que antes no tenia, las dos por la misma razon — de
          cerca era una mancha oscura con forma rara y nada mas. La primera es
          el reflejo del campo estelar: un cristal que no refleja nada no es
          cristal, es un agujero, y el termino de Fresnel ya esta calculado.
          La segunda es el travesano central, que parte el parabrisas en dos
          lunas y es lo que hace que se lea como una cabina y no como un visor.
        */
        float pane = smoothstep(0.02, 0.0, abs(fract(vUv.x * 2.0) - 0.5) - 0.5);
        albedo = vec3(0.018, 0.055, 0.075);
        albedo += vec3(0.055, 0.075, 0.115) * pow(fresnel, 2.2);
        albedo = mix(albedo, vec3(0.30, 0.30, 0.31), pane * 0.8);
        gloss = 0.96;
        specularPower = 110.0;
        specularStrength = 1.34;
      }
    } else if (uKind == 7) {
      /* Trusses, ejes y hábitat: metal oscuro con grano direccional. El
         contraste ancho sobrevive al tamaño del Hero; no es greeble fino. */
      float structure = panels(vLocal * 1.35, 1.0);
      /* El grano va dentro del seno: una octava le sobra para romperlo. */
      float brushed = 0.5 + 0.5 * sin((vLocal.x + vLocal.z) * 34.0 + noise(vLocal * 8.0) * 3.0);
      albedo = mix(vec3(0.055, 0.067, 0.086), vec3(0.38, 0.4, 0.43), structure * 0.48);
      albedo *= 0.84 + brushed * 0.22;
      gloss = 0.46 + brushed * 0.18;
      specularPower = 58.0;
    } else if (uKind == 9) {
      /* Paneles de servicio de Endurance: naranja quemado, muy localizado. */
      float serviceWear = fbm(vLocal * 5.2 + vec3(1.1, 7.0, 3.4));
      albedo = mix(vec3(0.18, 0.075, 0.025), uAccent * 0.72, 0.55 + serviceWear * 0.22);
      gloss = 0.24;
      specularPower = 30.0;
      specularStrength = 0.62;
    } else if (uKind == 8) {
      /*
        Balizas y toberas comparten material, y por tanto draw call. La máscara
        de vértice es lo que los separa: un quinto material por nave habría
        costado un batch de los veinte que hay, y el presupuesto está cerrado.

        · Máscara 0 — BALIZA. Luz de navegación en el color del cuerpo, con el
          latido lento de siempre.
        · Máscara 1 — TOBERA. Plasma blanco-azulado, más frío y algo más débil
          que una baliza: es escape, no señal. Su fase depende de la posición
          local de la pieza, así que las cuatro campanas de la Endurance y las
          dos de la Ranger no respiran a la vez — cuatro luces sincronizadas se
          leen como un efecto, y desincronizadas como una máquina encendida.
      */
      float pulse = 0.94 + 0.06 * sin(uTime * 0.55);
      albedo = vec3(0.0);
      float glow = 2.75 + uFocus * 0.55;
      vec3 emissiveTint = uAccent;
      gloss = 0.0;
      /*
        La semilla es el LADO del modelo, no el ángulo exacto.

        Tiene que ser constante dentro de cada tobera, y el ángulo no lo es: la
        pluma se aleja del centro, así que su atan2 recorría siete grados de
        punta a punta y cada anillo de la malla disparaba en un instante
        distinto — el cono se encendía a trozos. Las dos toberas activas están
        diametralmente opuestas, así que el signo de x las separa sin ambigüedad
        y vale lo mismo en todos sus vértices, pluma incluida.

        Es estable aunque el cuerpo gire: vLocal es anterior a la rotación.
      */
      float duty = mix(1.0, thrusterDuty(step(0.0, vLocal.x) * 2.0 - 1.0), uPulsed);
      if (vSurfaceMask > 7.5) {
        /*
          PLUMA, y la rampa viaja DENTRO de la máscara.

          aSurfaceMask es un float interpolado por vértice, así que no hace
          falta un atributo nuevo —ni tocar la fusión de geometrías, ni pagar un
          canal más— para tener un gradiente: la garganta vale 2.0, la punta
          3.0, y lo de en medio sale de la interpolación. Es el mismo truco de
          los cuatro acabados del casco llevado un paso más allá.

          Tres cosas la separan de un cono azul pegado detrás del motor:

          1. **Cae, no se corta.** El alfa va con (1−t) elevado a 1.7: la mitad
             de la pluma se ha ido en el primer tercio de su longitud.
          2. **Se enfría al alejarse.** Blanco casi puro en la garganta, azul en
             la punta. Un escape que conserva su color hasta el final se lee
             como plástico.
          3. **No tiene borde.** El alfa cae también con la incidencia, así que
             la silueta del cono nunca llega a dibujarse: lo que se ve es un
             núcleo brillante que se deshace, no un objeto.

          Y late. Un escape estable es una textura; uno que respira es una
          máquina encendida.
        */
        float plume = clamp(vSurfaceMask - 8.0, 0.0, 1.0);
        /*
          Los tres números de esta pluma salen de una captura, no de un gusto.

          La primera versión usaba 1.15 de ganancia y exponente 1.7, y en el
          hero salía un foco de coche: un cono blanco sólido más largo que la
          nave, con el bloom encima. Un escape de maniobra tiene que decir
          «encendido», no iluminar la escena — la única fuente de luz de este
          sistema es Gargantúa, y esa regla no la rompe un propulsor.

          Ganancia a 0.34, caída a exponente 2.4 (la mitad del brillo se ha ido
          en el primer 25 % de la longitud) y alfa a 0.62. Lo que queda es una
          lengua corta que se deshace, que es exactamente lo pedido.
        */
        /*
          Y la pluma RESPIRA de largo, que no es lo mismo que parpadear.

          Dos senos inconmensurables mueven la longitud efectiva un ±9 %: la
          pluma se estira y se recoge sin llegar nunca a repetirse ni a llamar
          la atención. Es lo que separa un cono geométrico de un chorro. Se
          aplica sobre el parámetro, no sobre el brillo: alargar por brillo
          sube el bloom y vuelve a lavar el casco, que es el error que costó
          dos capturas.
        */
        float breath = 1.0 + 0.09 * sin(uTime * 0.37 + vLocal.z * 2.0)
                           + 0.05 * sin(uTime * 0.83);
        plume = clamp(plume / breath, 0.0, 1.0);
        float fade = pow(1.0 - plume, 2.8);
        float flicker = 0.84 + 0.16 * sin(uTime * 2.3 + plume * 9.0 + vLocal.y * 6.0);
        /* Exterior casi transparente: la incidencia entra más tarde y más
           deprisa, así que el borde del cono desaparece del todo y lo que queda
           es núcleo. */
        float core = smoothstep(0.06, 0.78, abs(dot(normal, view)));
        emissive = mix(vec3(0.88, 0.95, 1.0), vec3(0.34, 0.55, 1.0), plume)
                 * glow * 0.36 * flicker;
        outputAlpha = fade * core * 0.62 * duty;
      } else if (vSurfaceMask > 0.5) {
        /* Garganta de la tobera: el punto más caliente y el más pequeño.
           Entre impulsos NO se apaga del todo: conserva un rescoldo del 16 %.
           Una tobera que acaba de disparar sigue caliente, y ese resto es lo
           que dice que el propulsor existe cuando no está encendido. */
        emissiveTint = vec3(0.66, 0.82, 1.0);
        glow *= 0.70;
        pulse = 0.86 + 0.14 * sin(uTime * 0.33 + vLocal.x * 5.0 + vLocal.y * 3.0);
        emissive = emissiveTint * glow * pulse * mix(1.0, 0.16 + 0.84 * duty, uPulsed);
      } else {
        /*
          Y la baliza paga la mitad, para NO cambiar de aspecto.

          El material pasó a mezcla aditiva por la pluma, y con dos caras
          activas una esfera diminuta se dibuja dos veces y suma: las balizas de
          la Endurance se convirtieron en halos cian del tamaño del barril. El
          0.5 devuelve el brillo exacto que tenían cuando el material era opaco.
          El cambio de mezcla es para la pluma; no puede pagarlo el resto.
        */
        emissive = emissiveTint * glow * pulse * 0.5;
      }
    }

    /*
      Y aquí, en un solo sitio, pasa TODO lo que emite luz propia.

      El banco de pruebas del contrato visual necesita poder apagar los emisivos
      para comprobar que un cuerpo conserva silueta, volumen y material sin
      ellos. Escalarlos aquí —después de que cada material haya escrito el suyo
      y antes de que nadie los use— garantiza que no queda ninguno fuera de
      este material: ni las balizas, ni el rebote de los anillos. El Tesseracto
      ya no pasa por aquí —tiene material propio— y declara un uEmission con
      el mismo nombre, que es lo que hace que el banco de pruebas lo siga
      apagando sin saber nada de él.
    */
    emissive *= uEmission;

    /*
      Las balizas salen por aquí y no tocan nada más: son luces, no superficies.

      Aquí salía TAMBIÉN el Tesseracto, cuando compartía este material. Se le
      quitó el atajo para que obedeciera a Gargantúa como los demás, y esa
      regla viaja con él a su material propio: sus aristas de cristal siguen
      recibiendo la clave, el fresnel y el reflejo del disco. La misma luz toca
      materiales diferentes; lo que no admite excepción es la luz, no el
      shader que la escribe.
    */
    if (uKind == 8) {
      /* El alfa sale del ramo: 1.0 en balizas y gargantas, la rampa en la
         pluma. Con mezcla aditiva el alfa es el que gradúa cuánto suma. */
      gl_FragColor = vec4(emissive + uNavigation * uFocus * 0.75, outputAlpha);
      return;
    }

    /*
      El TERMINADOR es lo que hace que una esfera parezca un mundo.

      El primer intento usaba lambert crudo más una envolvente ancha: el
      resultado era una bola uniformemente iluminada, sin cara noche, y eso es
      exactamente el aspecto «de plástico». Lo que se lee a esta distancia es la
      silueta, la media luna encendida y el filo de atmósfera. Todo el
      presupuesto de shader va ahí.

      Se resuelve DESPUÉS de los materiales porque el relieve de cada mundo
      entra aquí: es el mismo terminador, corrido punto a punto por la
      pendiente del terreno.
    */
    float shadedNdl = clamp(ndl + reliefOffset, -1.0, 1.0);
    float day = smoothstep(-0.08, 0.34, shadedNdl);
    /* Oscurecimiento de limbo: el borde del disco iluminado cae un poco. */
    float limb = 0.55 + 0.45 * pow(max(dot(normal, view), 0.0), 0.4);
    /*
      Y el relieve modula TAMBIÉN la cara ya iluminada.

      La envolvente del terminador satura por encima de 0.34, así que
      corregir sólo su argumento dejaba el hemisferio diurno completamente
      plano: la topografía sólo se veía en la franja del amanecer. El segundo
      término es el que pone ladera iluminada y ladera en sombra en pleno día,
      que es donde el ojo lee la orografía.
    */
    float diffuse = day * limb * clamp(1.0 + reliefOffset * 2.6, 0.4, 1.6);
    /*
      AGUA: la misma corrección que la roca, y era lo que le faltaba a Miller.

      La envolvente común satura en n·l = 0.34, así que más de la mitad del
      hemisferio diurno salía a brillo PLENO. Sobre un mundo con relieve eso se
      nota poco; sobre un océano continuo es fatal, porque el único sitio donde
      un cuerpo sin accidentes cuenta su tamaño y su curvatura es el degradado.
      Con la meseta no había degradado: había un disco azul uniforme con un
      trazo blanco encima, que es exactamente como lo describió el dueño.

      Exponente 0.55 y no 1: el agua devuelve luz difusa por dispersión bajo la
      superficie, así que su caída es más lenta que la de un lambert seco. Lo
      que importa es que YA NO HAY MESETA — el punto que mira de frente a
      Gargantúa y el que está a 60° de él dejan de valer lo mismo. Medido sobre
      la envolvente: donde antes había 1.00 plano de 0.34 en adelante, ahora hay
      0.60 en el arranque y 0.95 en el punto subestelar.
    */
    /*
      Y el suelo sube de 0.10 a 0.30 (quinta revisión). El exponente 0.55 se
      queda —es lo que mantiene el degradado y evita la meseta— pero el término
      constante es DISPERSIÓN BAJO LA SUPERFICIE, y en agua clara es cualquier
      cosa menos despreciable: es la razón física por la que un mar tropical
      visto desde arriba no se apaga a negro fuera del punto subsolar. Con 0.10
      el cuerpo perdía toda su provincia turquesa en cuanto se salía del centro
      del hemisferio diurno, que es literalmente lo que el dueño describió como
      «muy apagado y oscuro».
    */
    if (uKind == 0) {
      diffuse = day * limb * (0.19 + 0.81 * pow(max(shadedNdl, 0.0), 0.55));
    }
    /* Roca mate: la pendiente y la incidencia conservan dirección en todo el
       hemisferio diurno, sin una meseta de brillo al saturarse day. */
    /*
      ROCA MATE, y ahora con una caída MÁS RÁPIDA que Lambert.

      La ley anterior era lambert puro sobre un suelo de 0.12, y el reparto de
      valor que salía de ella no era el de un mundo seco: con la geografía
      nueva —masas grandes, laderas que responden— el hemisferio diurno subía
      ocho puntos de media sin que subiera el pico, o sea que lo que engordaba
      eran los MEDIOS TONOS. Un planeta cuyo rango vive todo en los medios es
      un planeta lavado, y es lo contrario de lo que pide la revisión.

      Exponente 1.35 y suelo 0.07. En el punto subestelar la respuesta es
      exactamente la misma que antes —1.0, el pico no se toca— y a incidencia
      media cae un tercio. Eso baja la media sin tocar el brillo máximo, que
      es la definición de repartir el valor y no de bajar la exposición.

      Y no es un truco: es el modelo correcto para esta superficie. Un regolito
      seco y rugoso se auto-ensombrece a incidencia rasante, así que su caída
      es más brusca que la de un lambert ideal. La comparación con Miller lo
      dice todo — el agua tiene suelo 0.19 y exponente 0.55, o sea la caída
      MÁS LENTA del sistema por dispersión bajo la superficie. Las dos leyes
      ahora se leen como lo que son: aire y agua contra polvo y piedra. Es la
      caída a oscuridad brusca que pide la revisión, escrita en el material y
      no en la exposición.
    */
    if (uKind == 1) {
      diffuse = day * limb * (0.07 + 0.93 * pow(max(shadedNdl, 0.0), 1.35));
    }
    /* Chapa facetada: Lambert conserva diferencias entre caras iluminadas;
       el terminador de los planetas las igualaba a partir de n·l = 0.34. */
    if (uKind == 4) diffuse = day * (0.12 + 0.88 * max(ndl, 0.0));

    /* Los mundos pierden más fill en su hemisferio nocturno. El terminador
       gana una línea de penumbra cálida: la dirección hacia Gargantúa se
       entiende antes de analizar conscientemente la luz. */
    /*
      REGLA COMÚN DE RELLENO NOCTURNO.

      Antes esto era una excepción para tres tipos y un valor plano para el
      resto: los mundos perdían relleno en su cara noche y las naves no. Ese
      detalle es la mitad de por qué parecían renderizados por separado — dos
      familias de objetos obedeciendo a modelos de luz distintos dentro del
      mismo cuadro.

      Ahora todos siguen la misma ley y lo único que cambia es el SUELO, por
      familia de material: cuánto rebote de cielo conserva la cara que no ve a
      Gargantúa. Los mundos, que tienen aire, conservan más; el metal, menos.

      Endurance baja de 0.42 a 0.30 en el pase de fase 1, y NO para oscurecerla:
      ese suelo era luz sin dirección repartida por todo el casco, o sea justo
      lo que la aplanaba. Lo que se le quita aquí se le devuelve multiplicado en
      el filo cálido y en la lámina ancha, que sí dependen de dónde está
      Gargantúa. La oclusión analítica oscurece sus cavidades de forma
      independiente de las superficies exteriores.

      Edmunds baja de 0.28 a 0.22 por el mismo motivo y en la misma pasada: es
      roca seca sin océano ni nubes, así que su cara noche tiene menos que
      rebotar que cualquier otro mundo con aire.
    */
    float nightFloor = 0.5;
    /*
      Y Miller estrena el suyo (2026-09-06), que es lo que le faltaba para
      leerse como un océano y no como una bola azul.

      Se había quedado con el valor COMÚN, 0.5, el más alto de todo el sistema:
      medio hemisferio nocturno de rebote sin dirección repartido por igual. Un
      cuerpo así no tiene terminador —tiene un degradado— y sin terminador no
      hay dónde leer que la luz viene de Gargantúa ni, con ella, el tamaño de
      lo que se está mirando.

      Es exactamente el mismo movimiento que la fase 1 hizo con la Endurance
      (0.42 → 0.30) y con Edmunds (0.28 → 0.22), y el principio es el mismo: no
      oscurecerlo, repartir su valor. Lo que pierde aquí se le devuelve entero
      —y multiplicado— en la lámina de agua de más abajo, que sí sabe dónde
      está la fuente.

      Y el agua es, físicamente, el peor rebotador del cuadro: a incidencia
      normal devuelve un 2 %, contra el 10-30 % de la roca seca de Edmunds. Que
      su cara noche conservara MÁS relleno que la de un mundo mineral era la
      única cifra del bloque que contradecía su propio material.
    */
    /* Miller vuelve a 0.46 (quinta revisión). El 0.32 salía de un argumento
       correcto —el agua es el peor rebotador del cuadro, un 2 % a incidencia
       normal— aplicado al término equivocado: este suelo no modela el rebote
       del AGUA, modela cuánto cielo conserva la cara que no ve a Gargantúa, y
       Miller es el cuerpo del sistema con más atmósfera y más nube. La cara
       noche de un mundo oceánico nublado no es la de un casco de aluminio. */
    if (uKind == 0) nightFloor = 0.34;
    /* Y baja otra vez a 0.20 (2026-09-06). No es un ajuste de exposición: es
       la única cifra del bloque que separa materialmente a Edmunds de Miller
       en la cara noche, y la revisión lo pide por su nombre —Miller tiene agua
       y aire que dispersan, Edmunds debe caer a oscuridad mucho más
       bruscamente—. Sale gratis en legibilidad porque lo que cuenta la roca
       está en el hemisferio diurno y en la franja del terminador, no aquí. */
    if (uKind == 1) nightFloor = 0.20;
    if (uKind == 4) nightFloor = 0.26;
    if (uKind == 5) nightFloor = 0.44;
    if (uKind == 7) nightFloor = 0.4;
    float nightFill = mix(nightFloor, 1.0, day);
    /* Y Edmunds tampoco hereda el azul entero del cielo. Es roca seca sin
       océano ni nube: lo que rebota en su cara noche es medio grado más cálido
       y bastante más flojo que el relleno común. El lavado azul que le cubría
       casi medio disco salía de aquí y de los dos filos de más abajo, no de la
       clave — por eso subir el albedo sin tocar esto no lo habría arreglado. */
    vec3 materialFill = uKind == 1 ? vec3(0.024, 0.025, 0.035) : fill;
    vec3 color = albedo * (
      key * diffuse * materialOcclusion + materialFill * nightFill
    );
    /* Y las cavidades bajan de 0.38 a 0.24 de suelo: un receso entre rieles no
       recibe ni clave ni cielo, y lo que hacía que la nave se leyera maciza era
       precisamente que sus huecos no llegaban a negro. */
    if (uKind == 4) color *= mix(0.19, 1.0, materialOcclusion);
    /* Edmunds conserva sólo un rebote corto en el relieve del terminador. */
    float bandFalloff = uKind == 1 ? 18.0 : 15.0;
    float terminatorBand = exp(-abs(shadedNdl - 0.055) * bandFalloff)
                         * (1.0 - day * 0.34);
    if (uKind == 0 || uKind == 1) {
      /* El peso de Edmunds no se toca —la revisión pide expresamente NO
         aclarar la cara oscura, y ese negro profundo es lo que lo separa de
         Miller, que sí tiene dispersión atmosférica—. Lo que cambia es que la
         banda deja de ser lisa: la cresta la reparte, así que aparece grano
         mineral en la franja del amanecer sin que suba un punto la luz media
         del hemisferio nocturno. */
      float bandRelief = uKind == 1 ? (0.58 + 0.84 * edmundsRidge) : 1.0;
      color += albedo * key * terminatorBand * bandRelief
             * (uKind == 1 ? 0.075 : 0.09);
    }

    /* Especular del disco: una banda estrecha, no un punto de estudio.
       Ojo con el nombre de la variable: half es palabra reservada en GLSL. */
    vec3 halfVec = normalize(toLight + view);
    float specBase = max(dot(normal, halfVec), 0.0);
    float spec = pow(specBase, specularPower) * gloss * day * materialOcclusion;
    color += key * spec * specularStrength;

    if (uKind == 5 && vSurfaceMask > 0.5 && vSurfaceMask < 1.5) {
      float glassGlint = pow(specBase, 118.0) * day;
      color += mix(key, vec3(0.34, 0.72, 1.0), 0.64) * glassGlint * 1.35;
      color += vec3(0.018, 0.1, 0.16) * fresnel * 0.72;
    }

    /*
      MILLER: LÁMINA DE LUZ Y AIRE DIRECCIONAL.

      Aquí estaba el fallo número uno del cuerpo. La versión anterior sumaba
      encima del especular estrecho un lóbulo de exponente 15: angularmente
      enorme, redondo y centrado, o sea exactamente un foco de plató sobre una
      canica. Un reflejo sobre agua no es eso. Es una lámina ESTIRADA en la
      dirección del plano luz-vista y ROTA por el oleaje.

      1. **La lámina.** Un lóbulo ELÍPTICO, ancho en el plano luz-vista y
         estrecho a lo ancho. Se escribe como una gaussiana sobre las dos
         componentes tangenciales del half-vector y no como una potencia sobre
         un vector deformado: deformar y volver a normalizar da isolíneas con
         esquinas, y en pantalla eso sale como una cometa —una figura
         geométrica— en vez de como un reflejo. La gaussiana no tiene esquinas.

         El eje transversal sale de la LUZ Y LA VISTA, no de la normal, y esa
         distinción costó una captura. Con el eje escrito como
         cross(normal, toLight) el reparto entre las dos componentes se divide
         por el seno del ángulo normal-luz, que vale cero en el punto sublunar:
         a unos veinte grados del pico —o sea a veinte píxeles, dentro del
         cuerpo— la componente transversal se disparaba, el max() de la
         longitudinal recortaba, y el reflejo salía como un ROMBO de aristas
         rectas. Una figura geométrica en mitad de un océano. El plano
         luz-vista no se degrada en ningún punto del cuerpo, y con él las tres
         direcciones forman una base ortonormal de verdad: el reparto es exacto
         y el lóbulo, una elipse limpia en todo el disco.
      2. **El destello.** El mismo lóbulo con exponente alto, picado por la
         máscara de oleaje que traía el material. Es lo que convierte la lámina
         en un rastro de chispas y no en una chapa: el detalle que dice AGUA.
      3. **El filo de aire.** Exponente 8 contra el 2.2 del halo común: una
         línea en el limbo, no un resplandor alrededor. Y sólo del lado que
         mira a Gargantúa, con microvariación de la propia bruma para que no
         sea un contorno dibujado con compás.
      4. **El rebote cálido.** Un toque de ámbar del disco en el filo más
         encarado, muy por debajo del cyan. No es un borde naranja: es la
         respuesta a «la luz no parece venir de ella con suficiente intención».
         Del lado contrario ya no hay nada que lo compense, y ahí es donde el
         contraluz frío común cierra la silueta.
    */
    if (uKind == 0) {
      vec3 acrossRaw = cross(toLight, view);
      float acrossLen = length(acrossRaw);
      vec3 acrossDir = acrossLen > 1e-4 ? acrossRaw / acrossLen : vec3(0.0);
      /* Descomposición de la normal en la base del reflejo sin una sola raíz
         extra: halfVec y acrossDir son ortogonales y unitarios, así que lo que
         no cae en ninguno de los dos es la componente longitudinal. */
      float acrossOff = dot(normal, acrossDir);
      float acrossOff2 = acrossOff * acrossOff;
      float alongOff2 = max(1.0 - specBase * specBase - acrossOff2, 0.0);
      /*
        Y AHORA LA BASE SE CIERRA, porque la cresta necesita LADOS.

        Hasta aquí sólo se usaban cuadrados, y con cuadrados el perfil del
        camino de luz es forzosamente simétrico: una gaussiana que se apaga
        igual por arriba que por abajo. Eso es exactamente lo que hacía que se
        leyera como pincelada. Una cresta de agua tiene cara y espalda.

        El eje acrossDir es perpendicular al plano luz-vista y halfVec está dentro
        de él, así que el tercer eje sale de un producto vectorial y ya es
        unitario — ni una raíz. Con él, acrossOff con SIGNO deja de ser sólo
        un ancho y pasa a distinguir el lado iluminado del lado en sombra.
      */
      vec3 alongDir = cross(acrossDir, halfVec);
      float alongOff = dot(normal, alongDir);
      /* Y los dos extremos del camino no se apagan igual. Un 34 % de asimetría
         es poco en número y mucho en lectura: es lo que impide que la cresta
         termine en una punta limpia por los dos lados, que es de lo que estaba
         hecha la pincelada. Se declara aquí arriba porque lo usan los cuatro
         términos del camino, empezando por el primero. */
      float crestTaper = 1.0 - 0.34 * smoothstep(-0.10, 0.46, alongOff);
      /* Tres anchos del MISMO lóbulo, no tres efectos. El asiento es lo que
         impide que el camino de luz se lea como un arañazo pegado encima: una
         banda ancha y muy tenue, anisótropa también, que dice que ahí abajo
         sigue habiendo agua. Es el término que en la versión anterior valía
         0.26 con lóbulo isótropo, y por eso salía mancha. */
      /*
        FRESNEL DE AGUA, y es lo que convierte la lámina en océano (2026-09-06).

        Faltaba la mitad del material. El agua es la superficie del sistema con
        el comportamiento angular más extremo que existe: a incidencia normal
        devuelve un 2 % y a incidencia rasante devuelve casi el 100 %. Es una
        propiedad, no un efecto — y es LA propiedad por la que un océano visto
        desde órbita no se parece a nada más.

        Sin ella, el reflejo pesaba lo mismo en el centro del disco que en el
        limbo, así que el camino de luz salía como una banda blanca uniforme
        cruzando una bola: exactamente el trazo que se leía como nube. Con ella,
        la misma lámina se ADELGAZA hacia el centro y se ABRE hacia el borde, que
        es lo que hace el mar de verdad cuando se mira de lejos, y es también lo
        que da la sensación de superficie ENORME: el reflejo cuenta la curvatura.

        Schlick sobre el ángulo de vista, exponente 5, sin una muestra ni un
        sitio de FBM más. La ganancia no arranca en cero porque el 2 % literal
        apagaría el corazón del reflejo, que es la parte que ya estaba aprobada;
        arranca en 0.62 y llega a 1.9. El destello del oleaje gana bastante
        menos —son microfacetas, y su normal ya no es la del cuerpo—, lo justo
        para que el rastro de chispas siga la misma ley que la lámina que lo
        contiene.
      */
      float waterFresnel = pow(1.0 - max(dot(normal, view), 0.0), 5.0);
      float waterGain = mix(0.78, 2.1, waterFresnel);
      float oceanSeat = exp(-(alongOff2 * 2.4 + acrossOff2 * 28.0))
                      * gloss * day * waterGain;
      /* Más larga y más estrecha (2026-09-06): 7.5 → 6.4 a lo largo y 265 → 330
         a lo ancho. Un CAMINO de luz, no una mancha alargada — es la diferencia
         entre ver el reflejo de una fuente sobre agua y ver una nube con
         forma. La energía que pierde de ancho la recupera de peso. */
      /*
        Y EL CAMINO SE PICA CON LAS CORRIENTES.

        Una lámina especular continua de extremo a extremo es lo último que
        quedaba de la pincelada: en el mar de verdad el camino de luz se
        estrangula donde la superficie cambia de inclinación. Las bandas
        latitudinales ya cruzan la diagonal —van con la curvatura, no con ella—
        así que estrechan el camino una o dos veces a lo largo de su recorrido.
        Es el mismo picado que lleva el asiento desde la segunda revisión; lo
        raro era que el término estrecho no lo tuviera.
      */
      float oceanSheet = exp(-(alongOff2 * 6.4 + acrossOff2 * 360.0))
                       * gloss * day * waterGain
                       * (0.40 + 0.60 * millerBands) * crestTaper;
      /*
        Y EL DESTELLO SE ABRE, que es la otra mitad de por qué no se veía el mar.

        Valía 26 a lo largo y 520 a lo ancho: un filete de cuatro píxeles de
        ancho pegado al camino de luz. Dentro de él el centelleo funcionaba
        perfectamente y no lo veía nadie, porque ocupaba el 2 % del disco.

        A 9 y 110 el lóbulo pasa a cubrir buena parte del hemisferio que mira a
        Gargantúa, que es donde un océano de verdad tiene su campo de chispas.
        Lo que se gana en superficie se paga en peso —de 0.95 a 0.52— para que
        la luminancia media del cuerpo no suba: es reparto, no exposición.
      */
      float oceanGlint = exp(-(alongOff2 * 9.0 + acrossOff2 * 110.0))
                       * millerGlitterMask * day * mix(0.86, 1.34, waterFresnel);
      /*
        ── LA CRESTA (2026-09-06, cuarta revisión) ─────────────────────────

        El diagnóstico del dueño, literal: «Ahora parece casi una pincelada
        luminosa sobre la esfera. Podría transformarse sutilmente en una cresta
        oceánica gigantesca. No una ola caricaturesca.» Y la condición de
        contorno, también suya: desde lejos tiene que seguir viéndose la MISMA
        diagonal, porque esa diagonal es lo que hace que Miller funcione en la
        composición. El detalle raro ocurre DENTRO de la esfera, no la rompe.

        Así que no se mueve nada de dónde está el camino de luz. Lo que cambia
        es su PERFIL TRANSVERSAL, que hasta ahora era una gaussiana simétrica
        —y una gaussiana simétrica es, por construcción, una pincelada—. Tres
        términos, y los tres viven dentro de la huella que ya estaba aprobada:

        1. **La espalda oscura.** Un lóbulo NEGATIVO pegado al camino, a un lado
           solo. Es la línea que convierte el trazo en algo con volumen: un ojo
           que ve claro-oscuro adyacente reconstruye un relieve, y eso no lo
           puede hacer con una gaussiana. Va en multiplicativo sobre el color ya
           formado y antes de sumar los reflejos, así que oscurece AGUA, que es
           lo que hay en el seno de una ola, y no apaga la lámina.
        2. **El filo de plata.** Un cuarto ancho del mismo lóbulo —la mitad de
           estrecho que el camino— encendido SÓLO donde la máscara de rotura
           dice que la cresta rompe. Es la única espuma del cuerpo, y es
           intermitente por definición.
        3. **El sesgo.** El seno se aparta del camino un poco más según se
           avanza a lo largo de él, y la cresta se afila por un extremo. Una
           deformación de agua no es un segmento recto de anchura constante; en
           cuanto los dos bordes dejan de ser paralelos, el ojo deja de leer
           «trazo» y empieza a leer «cosa».

        Cuesta tres exponenciales y ni un sitio de ruido: la rotura viajaba ya
        resuelta desde el material.
      */
      /*
        LA CARA DE LA CRESTA, y es la línea que hace el trabajo.

        Costó una captura entender por qué oscurecer el agua junto al camino no
        se veía: el agua de al lado YA ESTÁ casi negra —0.02 lineal— y el 86 %
        de casi nada sigue siendo casi nada. Una sombra no se puede pintar donde
        no hay luz que quitar. Lo que reconstruye un relieve en el ojo es un par
        claro-oscuro ADYACENTE, así que primero hay que poner el claro.

        Y no vale subir el asiento: el asiento es un lóbulo de sigma 0.15, o sea
        un tercio del disco, y ensancharlo por un lado no da una cresta — da
        neblina. La segunda captura salió con medio planeta empañado.

        Éste es el ancho que faltaba, entre el camino (sigma 0.037) y el asiento
        (0.15): la LADERA. Un solo lado, porque una ola tiene cara y espalda, y
        con la puerta desplazada hacia el lado contrario para que el borde de la
        ladera caiga justo sobre el camino y no alrededor de él. Del otro lado
        no hay nada que lo compense, y ahí es donde el seno hace de sombra.
      */
      float crestFacing = smoothstep(0.105, -0.015, acrossOff);
      float crestSlope = exp(-(alongOff2 * 5.0 + acrossOff2 * 135.0))
                       * gloss * day * waterGain * crestFacing;
      /* Y el asiento pierde un tercio DEL LADO DE LA ESPALDA. No es una
         segunda ladera: es que el único término que reparte luminancia ancha
         alrededor del camino no puede seguir siendo simétrico si la cresta no
         lo es. Sin esto, el seno de más abajo oscurece sobre negro y no se ve
         —fue el diagnóstico de la primera captura— porque no había luz que
         quitar justo ahí. */
      oceanSeat *= mix(0.58, 1.0, crestFacing);
      /* Y el seno se separa del camino según se avanza: bordes no paralelos. */
      float troughOff = acrossOff - 0.058 - alongOff * 0.052;
      float crestTrough = exp(-(alongOff2 * 4.6 + troughOff * troughOff * 380.0))
                        * day * crestTaper
                        * (0.55 + 0.45 * millerCrestFoam);
      float crestFoam = exp(-(alongOff2 * 4.2 + acrossOff2 * 1700.0))
                      * millerCrestFoam * day * crestTaper
                      * mix(0.72, 1.5, waterFresnel);
      /* El asiento va PICADO POR LAS BANDAS. Una lámina de reflejo continua
         sobre todo el hemisferio es exactamente lo que hace que un océano se
         lea como gas: sin corrientes que la corten, no hay superficie. */
      /*
        Y las tres anchuras se reparten la TEMPERATURA, que es la otra mitad de
        por qué el trazo se leía como nube.

        Un reflejo especular devuelve el color de la fuente, y la fuente aquí es
        ámbar. La versión anterior enfriaba el camino estrecho un 34 % y la
        sábana ancha un 46 %, o sea casi lo mismo: el resultado era una banda
        blanca de temperatura indefinida, que es la firma de una nube. Ahora el
        reparto es explícito y opuesto — el camino estrecho se queda casi en el
        ámbar del disco y la sábana ancha se va al azul del cielo. Sobre agua
        fría eso sólo puede ser una cosa, y además dice de dónde viene la luz
        sin dibujar ninguna flecha.
      */
      /* La espalda va PRIMERO: oscurece el agua que hay debajo, no los
         reflejos que vienen después. Un 62 % es mucho sobre una lámina y casi
         nada sobre un cuerpo cuyo seno ya estaba en penumbra — que es
         exactamente donde tiene que notarse. */
      color *= 1.0 - crestTrough * 0.62;
      color += mix(key, vec3(0.36, 0.68, 0.94), 0.52)
             * oceanSeat * (0.3 + millerBands * 1.2) * 0.185;
      /* La ladera va entre el asiento y el camino, y con su temperatura: es
         agua inclinada devolviendo el disco, así que se queda más cerca del
         ámbar que la sábana ancha y más lejos que el filo del camino. */
      color += mix(key, vec3(0.42, 0.72, 0.96), 0.38) * crestSlope * 0.34;
      color += mix(key, vec3(0.46, 0.74, 0.98), 0.22) * oceanSheet * 0.92;
      /* Y la espuma, casi blanca y sólo un punto fría: es agua pulverizada, no
         reflejo, así que no se queda con el ámbar del disco como el camino ni
         se va al cielo como la sábana. */
      color += vec3(0.94, 0.97, 1.0) * crestFoam * 2.70;
      /* Y el destello sube a 0.95 y se enfría un poco. Con el microoleaje
         animado ya no es un adorno estático: es el CENTELLEO, o sea la señal
         más barata y más inequívoca de que ahí abajo hay agua y no gas. */
      color += mix(vec3(1.0, 0.94, 0.82), vec3(0.72, 0.92, 1.0), 0.42)
             * oceanGlint * 0.52;

      /*
        EL FILO SE VUELVE ASIMÉTRICO, y ése es el punto tres.

        Encendía desde ndl = −0.06: o sea prácticamente todo el hemisferio
        visible que no fuera noche cerrada, y sumado al desborde del halo común
        eso dibujaba una línea pálida casi uniforme por todo el borde inferior.
        Un contorno de recorte, no atmósfera.

        Ahora la puerta abre en 0.10 y cierra en 0.80, así que el filo NACE
        donde el cuerpo empieza a mirar a Gargantúa y se apaga progresivamente
        dando la vuelta al limbo. Y encima cambia de color con la misma rampa:
        cyan pálido en los flancos, blanco cálido en el punto más encarado. El
        borde ya no dice sólo que hay aire — dice de dónde viene la luz.
      */
      /*
        Y EL FILO SE ROMPE EN TRAMOS (2026-09-06, cuarta revisión).

        «Ahora mismo está casi uniformemente trazado alrededor de una parte de
        la esfera. El océano debería reaccionar a la luz de manera distinta
        según el ángulo, así que algunos pequeños segmentos pueden desaparecer
        completamente y otros brillar» — el dueño. Y tiene razón por una razón
        que además es técnica: la modulación que tenía, 0.82 + bruma·0.36,
        nunca bajaba de 0.82, o sea que era un contorno continuo con una leve
        ondulación encima. Un contorno continuo es la firma de «esfera con rim
        light», no de superficie húmeda.

        Ahora el mando es una PUERTA sobre dos campos que ya existían —la bruma
        y las corrientes latitudinales, que a lo largo del limbo van cambiando—
        y su recorrido llega hasta 0.16, o sea que hay tramos donde el filo
        desaparece de verdad. Los que sobreviven pagan 1.42 en vez de 1.18, así
        que el borde gana contraste sin ganar luminancia media.
      */
      /* El recorrido de la puerta se suaviza en la quinta revisión: de
         (0.16 … 1.42) a (0.46 … 1.55). Los tramos siguen apareciendo y
         desapareciendo —era lo que pedía el dueño y sigue en pie— pero el
         mínimo deja de ser un agujero: sobre un cuerpo encendido, un trozo de
         limbo a 0.16 no se lee como «aire irregular», se lee como una mordida.
         Y el exponente baja de 8 a 6.5, así que el filo es un poco más ancho,
         que es lo que hace que el borde brille en vez de subrayarse. */
      float airBreak = smoothstep(0.22, 0.68, millerWeather * 0.54 + millerBands * 0.46);
      float airEdge = pow(1.0 - max(dot(normal, view), 0.0), 6.5)
                    * mix(0.46, 1.55, airBreak);
      float airLit = smoothstep(0.20, 0.9, ndl);
      float airFacing = smoothstep(0.5, 1.0, ndl);
      color += mix(vec3(0.34, 0.72, 1.0), vec3(0.90, 0.97, 1.0), airFacing)
             * airEdge * airLit * uLightIntensity * 2.6;
      color += key * airEdge * airFacing * 0.58;

      /*
        LA CARA NOCHE SIGUE SIENDO AGUA, y ahora se le nota más.

        «Conservaría el lado oscuro, aunque introduciría una cantidad diminuta
        de azul profundo reflejado dentro de él. No para iluminarlo. Sólo para
        que siga sintiéndose como agua incluso donde no recibe la luz directa»
        — el dueño, y es la descripción exacta de lo que hace un océano de
        noche: el agua es un espejo, así que su cara oscura no devuelve negro,
        devuelve el cielo. Aquí el cielo es un campo estelar sobre un disco de
        acreción, y eso es un petróleo muy oscuro.

        Va con el fresnel dentro porque un espejo devuelve más cuanto más
        rasante se le mira, que es también lo que impide que esto se convierta
        en un relleno plano: el centro de la cara noche se queda casi negro y lo
        que se levanta es el canto, o sea justo donde el agua estaría
        reflejando. Y va DESPUÉS de los reflejos para que no los tiña.

        El suelo nocturno común no puede hacer este trabajo: es acromático por
        diseño —el mismo relleno de cielo para todo el sistema, escalado por
        familia—, así que subirlo aclara sin decir de qué está hecho el cuerpo.
        Éste sí: es azul de agua honda, y por eso puede pesar dos veces y media
        más que en la revisión anterior sin devolver el degradado plano.
      */
      float oceanNight = (1.0 - day) * (0.30 + 0.70 * fresnel);
      color += vec3(0.0090, 0.0262, 0.0355) * oceanNight;
    }

    /* Aire fino: sólo el arco encarado al disco, sin blanco ni halo uniforme.
       El rebote cálido queda pegado al terminador y conserva el terreno. */
    if (uKind == 1) {
      /* Más fino y más concentrado: exponente 11 → 14 y puerta desplazada, así
         que el arco vive sólo donde de verdad hay atmósfera atravesada por la
         luz. Lo que gana en peso (0.55 → 0.95) no lo gana en extensión — que es
         la diferencia entre una línea de aire y un halo. */
      /*
        El exponente BAJA de 14 a 9, y esto va contra la intuición de la
        revisión anterior.

        Aquel pase lo subió para concentrar el aire —y acertaba en que un
        halo ancho era un halo—, pero a exponente 14 la banda mide un par de
        píxeles sobre un cuerpo de 54 de radio: eso no es una capa de
        atmósfera, es una LÍNEA dibujada siguiendo la circunferencia. Y una
        línea de grosor constante alrededor de un disco es exactamente el
        artefacto que el dueño nombra. Más ancha y con la mitad de peso, la
        misma energía deja de leerse como contorno.
      */
      float limbArc = pow(1.0 - max(dot(normal, view), 0.0), 9.0);
      float airLit = smoothstep(0.26, 0.94, ndl);
      /*
        Y EL FILO SE ROMPE. Es el defecto del contorno derecho.

        Con el arco liso, la luz dibujaba un filete claro continuo siguiendo
        toda la circunferencia iluminada, y eso es la firma inconfundible de
        una esfera renderizada: un cuerpo rocoso sin atmósfera densa no tiene
        un borde de grosor constante. Lo que tiene es relieve interrumpiendo
        la luz — cresta encendida, hueco negro, un destello corto, negro otra
        vez.

        La máscara de cresta hace justo eso, y sin añadir un solo cálculo: la
        corrugación media que ya se computaba varía mucho más deprisa a lo
        largo del limbo que la geometría de la esfera, así que multiplicar por
        ella trocea el arco en el orden de magnitud correcto.

        El peso sube de 0.95 a 1.28 para compensar: la media del filo baja un
        poco —que es lo que pide la revisión— pero sus picos suben, así que el
        cuerpo no pierde su relación con Gargantúa. Repartir el valor, no
        apagarlo.
      */
      float limbBreak = 0.06 + 0.94 * edmundsRidge;
      color += vec3(0.62, 0.46, 0.30) * limbArc * airLit * limbBreak
             * uLightIntensity * 0.40;
      /*
        Y EL DESTELLO, que es la última palabra de la secuencia que pide la
        revisión: luz, desaparece, pequeño destello, negro.

        Sale de cruzar el pico de la cresta con el pico del limbo, así que
        vive en un puñado de sitios sueltos del contorno y en ninguno más. No
        es un material nuevo ni una muestra nueva: son los dos términos que
        ya estaban, multiplicados en vez de sumados. Lo que consigue es que
        el ojo lea el borde como topografía atrapando luz —una cresta que
        asoma— en vez de como el canto de una esfera.
      */
      float limbGlint = pow(1.0 - max(dot(normal, view), 0.0), 22.0)
                      * smoothstep(0.86, 1.0, edmundsRidge)
                      * airLit;
      color += vec3(0.74, 0.56, 0.36) * limbGlint * uLightIntensity * 1.15;
      /* Y el rebote pegado al terminador también toma el relieve: es el
         «detalle mineral mínimo junto al terminador» que pide la revisión, y
         se consigue modulando lo que ya había en vez de subir el suelo, que
         es lo único que la revisión prohíbe expresamente. */
      color += albedo * key
             * exp(-abs(shadedNdl + 0.06) * 19.0) * (1.0 - day) * 0.07
             * (0.62 + 0.76 * edmundsRidge);
    }
    /*
      Atmósfera. Se acumula hacia el borde Y hacia la cara iluminada, que es la
      dispersión real: el filo brillante aparece donde la luz atraviesa más aire.
      Un poco desborda a la cara noche, como el amanecer visto desde órbita.
    */
    float rim = pow(1.0 - max(dot(normal, view), 0.0), 2.2);
    float scatter = rim * smoothstep(-0.45, 0.5, ndl);
    color += atmosphere * atmosphereWeight * scatter * uLightIntensity * 0.9;

    /*
      CONTRALUZ FRÍO, y ahora lo reciben todos.

      La segunda mitad de la regla común: la cara que mira a Gargantúa recibe
      ámbar —eso ya lo hacían la clave y la atmósfera—, y la contraria cae a un
      azul acero casi negro en lugar de a un gris plano. Es lo que cierra la
      silueta contra el fondo sin subir el relleno general, que es lo que
      aplanaba la escena.

      Antes sólo lo tenían las naves y la estación, en su propio bloque y con su
      propia fórmula. Un mundo y una nave a la misma distancia del disco tenían
      bordes de temperaturas distintas, y eso —más que ningún material— es lo
      que los delataba como assets separados.
    */
    float backRim = pow(1.0 - max(dot(normal, view), 0.0), 3.0)
                  * (1.0 - smoothstep(-0.5, 0.22, ndl));
    vec3 backRimColor = vec3(0.062, 0.086, 0.152);
    /* Edmunds paga 0.15 en vez de 0.24, y con el relleno mineral de arriba. Su
       contraluz seguía siendo el del resto —azul de campo estelar sobre casi
       medio disco— y sobre un mundo sin aire eso no cierra la silueta: la
       empaña. Lo que separa a este cuerpo del fondo es su propio filo cálido. */
    color += backRimColor * backRim
           * (uKind == 1 ? 0.10 : (uKind == 0 ? 0.40 : 0.55));

    /*
      Metales: una segunda reflexión, ancha y fría.

      El disco es una fuente ENORME, así que un casco metálico no devuelve sólo
      el filete especular estrecho: devuelve también una lámina suave que barre
      la superficie según gira. Sin ella, una nave metálica girando se ve como
      una silueta gris rotando —el giro no tiene nada a lo que agarrarse— y ése
      era justo el motivo de que la Endurance pareciera la única viva.

      El Tesseracto se quedó FUERA, y se probó dentro: a potencia 6 la lámina
      es angularmente enorme y sobre una barra de siete píxeles no barre nada,
      la enciende entera. Aquella captura salía gris claro y uniforme —justo el
      wireframe grueso que se quería evitar—. Su material propio conserva la
      lección: reflejo especular ESTRECHO, que sí recorre los cantos según las
      piezas se mueven.
    */
    if (uKind == 4 || uKind == 5 || uKind == 7) {
      float sheen = pow(specBase, 6.0) * gloss * day;
      /* Rampa invertida escrita al derecho. smoothstep(0.25, -0.55, x) con
         edge0 > edge1 es comportamiento INDEFINIDO en GLSL ES: funcionaba por
         suerte del compilador, no por contrato. */
      float coldRim = pow(1.0 - max(dot(normal, view), 0.0), 2.6)
                    * (1.0 - smoothstep(-0.55, 0.25, ndl));

      if (uKind == 4) {
        /*
          Que los volúmenes los dibuje GARGANTÚA, no un rebote plano.

          Ese término ambiente valía 0.048 y era luz que llegaba por igual a
          todas las caras: aplanaba la nave y le quitaba a la clave el trabajo
          de explicar la forma. A 0.018 sigue impidiendo que el lado oscuro sea
          un agujero recortado, pero ya no compite con la fuente. Plata cálida
          hacia el disco, azul acero casi negro en la espalda.
        */
        /* El mismo rebote dirigido que la Ranger, en la escala que admite un
           casco que ya vive casi entero de su filo: ámbar hacia Gargantúa, azul
           acero en la espalda. Es poco, pero es lo único que traía color a las
           caras que no alcanzan ni el filo ni la lámina. */
        color += albedo * mix(
          vec3(0.005, 0.006, 0.009),
          vec3(0.026, 0.019, 0.011),
          smoothstep(-0.7, 0.2, ndl)
        ) * materialOcclusion;
        /*
          LÁMINA ANCHA, y es la pieza que faltaba.

          La Endurance era el único casco metálico del sistema SIN el barrido de
          fuente extensa: tenía el filete de exponente 22 y nada más, así que
          fuera de ese filete todas sus caras devolvían exactamente lo mismo. Un
          disco de acreción es enorme; un panel orientado hacia él devuelve una
          lámina suave y ancha, y es lo que separa dos módulos vecinos que
          comparten material pero no orientación. Con el gloss ya escalonado por
          familia, esta lámina encuentra los módulos principales y deja mate el
          radiador — que es exactamente el «metal vivo» que se pedía.
        */
        color += mix(key, vec3(1.0, 0.93, 0.84), 0.16) * sheen * 0.42 * materialOcclusion;
        /* Y el filete estrecho sube de 0.12 a 0.22: sobre el marfil de los
           módulos principales es el único highlight duro de la nave. */
        color += key * pow(specBase, 22.0) * gloss * day * 0.22 * materialOcclusion;
        /* Relleno frío del lado contrario. Sube de 0.16 a 0.30 y se enfría: es
           lo que impide que bajar el suelo nocturno devuelva un recorte negro,
           y a diferencia del suelo SÍ tiene dirección. */
        color += vec3(0.10, 0.145, 0.235) * coldRim * 0.30;
      } else {
        /*
          PLATA CÁLIDA, no azul.

          Este barrido llevaba un 42 % de azul cielo mezclado en la clave, así
          que el metal de la Ranger y de la estación devolvía luz FRÍA mirando a
          un disco de acreción dorado. Un objeto cuyo reflejo no coincide con su
          fuente se lee como pegado encima de la escena, y era buena parte de
          por qué la Ranger parecía un low poly aislado. Con 0.18 el reflejo
          conserva el oro del disco y sólo se enfría lo justo para que se
          entienda que es metal y no pintura.
        */
        color += mix(key, vec3(0.78, 0.82, 0.9), 0.18) * sheen * 0.28;
        /* Contraluz del campo estelar en el canto opuesto. Baja de 0.34 a 0.2
           porque ahora hay un contraluz común para todos los cuerpos: sumados
           daban un borde azul que se comía la silueta. */
        color += vec3(0.22, 0.32, 0.58) * coldRim * 0.2;
      }
    }

    /*
      CONTRALUZ de la Ranger.

      Está colocada por delante del plano del disco, así que la única fuente del
      sistema le llega por detrás: 122° entre la luz y la cámara. Con el
      tratamiento común eso da una nave negra, y era justo lo contrario de lo
      que pide la dirección de arte —«iluminación cálida mucho más clara
      proveniente de Gargantúa»—.

      La respuesta correcta a contraluz no es subir el difuso, que no existe:
      es el filo. Aquí la luz envuelve el canto —el término de envoltura deja
      pasar también algo de la cara oscura, como hace una fuente extensa— y el
      término ámbar corto dibuja la línea encendida del borde de ataque, de la
      cabina y de las góndolas.
      Es la lectura de cine para un objeto delante de una fuente enorme.
    */
    if (uKind == 5) {
      float wrap = smoothstep(-0.62, 0.3, ndl);
      color += key * fresnel * wrap * 0.70;
      /* Y la línea ámbar sube de 0.30 a 0.44: con 153° entre luz y cámara, ESTE
         es el término que dibuja el borde de ataque, la cabina y las góndolas.
         Lo que hacía gris a esta nave no era su chapa —forzada a blanco puro se
         veía igual de apagada— sino que su filo no llegaba a encenderse. */
      color += vec3(1.0, 0.72, 0.42) * pow(fresnel, 1.5) * wrap * 0.58;
      /* Y una segunda línea, más estrecha y más roja, pegada al canto. Es la
         que integra la nave con Gargantúa: sin ella el acero devolvía un filo
         crema genérico que podría venir de cualquier parte. */
      color += vec3(1.0, 0.58, 0.26) * pow(fresnel, 3.2) * wrap * 0.52;
      /*
        RELLENO CON DIRECCIÓN, que no es lo mismo que ambiente.

        Esto era un color plano sumado a toda la chapa por igual: el término que
        impedía que la sombra fuera un recorte negro, y a la vez el que dejaba a
        la nave en lavanda. Un relleno sin dirección no puede integrar nada,
        porque no sabe dónde está la fuente.

        Ahora son dos rellenos y una rampa que los cruza. La chapa que aún mira
        algo hacia Gargantúa —aunque esté pasado el terminador, que a 153° es
        casi toda la que se ve— recoge un rebote ÁMBAR; la que le da la espalda
        del todo se queda con el azul del campo estelar. Misma cantidad de luz,
        repartida por orientación en vez de por igual, y ésa es toda la
        diferencia entre una nave gris y una nave que está ahí dentro.
      */
      float bounce = smoothstep(-0.78, 0.16, ndl);
      color += albedo * mix(
        vec3(0.024, 0.030, 0.046),
        vec3(0.082, 0.058, 0.034),
        bounce
      );
    }

    /*
      CONTRALUZ DE LA ENDURANCE, y es el término que ordena toda su lectura.

      Su geometría de luz está medida: 117° entre Gargantúa y la cámara. Eso
      significa que la mayor parte de lo que se ve de la nave está cerca del
      terminador o pasado, y que ningún ajuste del difuso puede arreglarla — el
      difuso ahí no existe. Lo que sí existe a 117° es el FILO: la luz recorta
      el canto de cada módulo del lado que mira al disco.

      Es el mismo mecanismo que ya tenía la Ranger a 153°, y no haberlo escrito
      también aquí es la razón de fondo de que la Endurance se leyera como un
      modelo iluminado por un plató en vez de como una nave delante de un
      agujero negro. Dos términos: la envoltura ancha, que dice de qué lado
      viene la luz, y la línea ámbar corta, que dibuja el canto encendido.

      Ambos pasan por la oclusión: un canto metido en un receso entre rieles no
      ve el disco, y sin ese factor el filo dibujaba también los huecos.
    */
    if (uKind == 4) {
      float wrap = smoothstep(-0.40, 0.36, ndl);
      color += key * fresnel * wrap * 0.38 * materialOcclusion;
      color += vec3(1.0, 0.74, 0.44) * pow(fresnel, 1.6) * wrap * 0.42 * materialOcclusion;
    }

    /* Borde encendido por el disco, para todo lo demás: es lo que separa al
       cuerpo del fondo negro sin dibujarle un contorno. */
    float warmRim = fresnel * smoothstep(-0.25, 0.42, ndl);
    /* El filo cálido de Edmunds valía un 12 % del común —o sea, casi nada— y
       ésa era la mitad del problema: un planeta cuya única luz es un disco de
       acreción tenía menos relación visible con él que cualquier casco. Sube a
       0.34 con la puerta bajada, así que el borde que mira a Gargantúa se
       enciende de verdad. Sigue por debajo de un tercio del rim común: no es
       un contorno naranja, es el arco que cuenta de dónde viene la luz. */
    /* Y también se fragmenta, por lo mismo que el filo de aire: este término
       es difuso y rodea el cuerpo entero, así que es el segundo ingrediente
       del filete continuo. Sube de 0.52 a 0.66 del común y se multiplica por
       la cresta — mismo pico, media más baja, contorno con topografía. */
    if (uKind == 1) {
      warmRim *= 0.58 * smoothstep(0.08, 0.66, ndl)
               * (0.20 + 0.80 * edmundsRidge);
    }
    if (uKind == 4) warmRim *= materialOcclusion;
    /* La Endurance paga MÁS que el común, y por la misma razón por la que la
       Ranger tiene bloque propio: a 117° el filo es su iluminación principal,
       no un adorno que la separa del fondo. El resto del sistema se queda en
       0.18 sin enterarse. */
    /* Y Miller paga 0.07 en vez de 0.18. Este filo es un borde DIFUSO, y el
       agua no tiene borde difuso: su limbo lo dibuja el reflejo especular, que
       a incidencia rasante se vuelve espejo. Los 0.18 comunes le ponían encima
       un contorno cálido que rodeaba el cuerpo mirase donde mirase — la otra
       mitad del aro pálido, junto con el relleno de canto— y competía justo con
       el término que sí cuenta de dónde viene la luz. Lo que se le quita aquí
       se le devuelve en la lámina de agua, que sube a la vez. */
    float commonRim = uKind == 4 ? 0.62 : (uKind == 0 ? 0.15 : 0.18);
    color += key * warmRim * commonRim;
    /* Y el relleno de canto también baja para el mundo mineral: 0.32 levantaba
       el limbo entero, iluminado o no, y es el tercer ingrediente del lavado
       azul que se está retirando. */
    /* Y Miller baja a 0.13 por el mismo motivo por el que bajó Edmunds, sólo
       que en su caso el aro sobrevivió a los dos pases anteriores: se estuvo
       buscando en la atmósfera —que ya está casi apagada, 0.09— y en el halo
       común, y estaba aquí. Este término levanta el canto MIRE DONDE MIRE, así
       que dibujaba una línea pálida por toda la circunferencia, cara noche
       incluida. Un planeta rodeado de un aro uniforme se lee como una canica
       iluminada desde dentro; el limbo de un océano lo tiene que dibujar el
       reflejo, que sólo existe de un lado. */
    /* Edmunds baja otra vez, de 0.11 a 0.07, y es el tercer y último
       ingrediente del contorno continuo: a diferencia de los otros dos este
       término no sabe dónde está la luz —levanta el canto mire donde mire— así
       que no hay forma de darle topografía. Lo que se puede hacer con él es
       dejarlo casi fuera, y devolver su trabajo a los dos que sí tienen
       dirección. */
    float fillRim = uKind == 1 ? 0.07 : (uKind == 0 ? 0.13 : 0.32);
    color += materialFill * fresnel * fillRim;
    color += emissive;

    /*
      Foco: al enfocar un destino, su cuerpo se enciende. La cámara no se mueve
      —es el contrato de §3— así que toda la respuesta es luz.

      Baja respecto de la versión anterior (0.055 + 0.62·fresnel). Con el casco
      de la Endurance, que es casi todo canto, aquel valor teñía la nave entera
      de cian y se perdía el metal justo cuando el visitante la estaba mirando.
      La adquisición ya la cuentan el arco de la órbita, los corchetes, el raíl y
      el NAV TARGET: el cuerpo sólo tiene que confirmarla, no anunciarla.
    */
    /*
      ── Y el tinte se reparte por MATERIAL (2026-09-06) ────────────────────

      Bajarlo una vez para todos no bastaba, y el motivo es el mismo criterio
      que sostiene la capa visual: la misma luz toca materiales distintos sin
      borrar su identidad. Un tinte de navegación uniforme hace exactamente lo
      contrario — sobre el océano de Miller el cian ES su color y no se nota,
      sobre la roca ocre de Edmunds lo convierte en otro mundo acuático justo
      en el momento en que el visitante lo está señalando. El cuerpo que peor
      lo llevaba era el que más lejos estaba de la paleta de navegación.

      Así que el foco deja de ser un color y pasa a ser tres cosas cuyo reparto
      depende del material:

      · focusTint — cuánto cian aguanta el cuerpo sin dejar de ser él. Los dos
        que ya vivían cerca de la paleta de navegación —agua y baliza— lo
        conservan entero. El Tesseracto tiene su propio reparto, en su material.
      · focusGain — el material se sube a sí mismo. No añade color: multiplica
        el que ya tenía, así que un planeta ocre se enciende ocre.
      · focusEdge — el filo cálido, que ya sabe dónde está Gargantúa, se marca
        un poco más. Es la parte que se lee como «apuntado» a tamaño de hero.

      Edmunds baja a un 8 % del tinte y Endurance a un 16 %: la nave es aluminio
      marfil y aguanta algo más de cian que la roca seca sin dejar de ser metal,
      que es justo el orden en que el dueño describió el problema. Lo que dice
      de verdad la adquisición sigue estando fuera del cuerpo — los corchetes,
      el arco de la órbita, el raíl y el NAV TARGET.

      Los dos números salieron de MEDIR el color medio del cuerpo apuntado, no
      de mirarlo: sobre el hero de 1440x860, Edmunds pasaba de 51/34/21 en
      reposo a 66/50/36 apuntado —o sea, el azul subía un 71 % contra un 29 %
      del rojo— y la Endurance de 21/20/20, neutra, a 27/34/36, o sea a fría.
      Un cuerpo cuyo canal azul crece el doble que el rojo al adquirirlo ya no
      conserva su material; ése es el umbral que fija estos dos valores.

      Y por eso la Endurance acabó en 16 y no en 34: a 34 la medida seguía
      dando 27/33/34, o sea el azul todavía por encima del rojo y todavía
      creciendo el doble. El paso de 45 a 34 casi no movió la aguja —27/34/36 →
      27/33/34— porque el tinte entra multiplicado por el fresnel y el casco es
      casi todo canto: sobre esa geometría hace falta bajar el número mucho más
      de lo que parece para bajar el color un poco. Lo que se le quita se le
      devuelve en filo (0.20 → 0.30), que marca el contorno sin tocar la
      temperatura del metal.
    */
    vec3 focusColor = uNavigation;
    float focusTint = 1.0;
    float focusGain = 0.0;
    float focusEdge = 0.0;
    if (uKind == 1) { focusTint = 0.08; focusGain = 0.16; focusEdge = 0.11; }
    if (uKind == 4) { focusTint = 0.16; focusGain = 0.15; focusEdge = 0.30; }
    /*
      Y MILLER SE SUMA A LA REGLA, que hasta ahora era el único que la incumplía.

      §9 quater repartió el foco por material y dejó a Miller en el 1.0 genérico
      —el más alto del sistema, contra el 0.08 de Edmunds y el 0.16 de la
      Endurance— con este argumento textual: «sobre el océano de Miller el cian
      ES su color y no se nota». Era cierto cuando Miller era un gris azulado
      oscuro.

      Dejó de serlo el día que Miller pasó a ser un cuerpo cian brillante. Medido
      sobre una grabación del dueño con el cuerpo enfocado, su disco subía a 125
      de luminancia media contra los 97 que tiene en reposo: el tinte de
      navegación a plena potencia sobre un mundo que YA es de ese color no lo
      identifica, lo LAVA — y borra justo la corrugación del oleaje, en el
      momento exacto en que el visitante lo está mirando con más atención.

      Medido con el puntero encima, luminancia del disco: en reposo 98.5, con el
      tinte viejo 118, con el nuevo 111.9. Pero la cifra que importa no es la
      media sino el percentil 5, o sea la CARA NOCHE: 28 en reposo, 57 con el
      tinte viejo, 38 con el nuevo. Ahí estaba el daño — el término crece con el
      fresnel y no depende de la luz, así que donde más pesaba era justo donde no
      había nada con qué competir. El tinte no aclaraba el cuerpo: le borraba el
      terminador, y con él la mitad del oleaje.

      Así que baja a 0.20 y la diferencia se le devuelve donde el propio §9
      quater dice que hay que devolverla: ganancia del material y filo. El cuerpo
      responde igual de fuerte a la adquisición, pero respondiendo con LO SUYO.
    */
    if (uKind == 0) { focusTint = 0.20; focusGain = 0.15; focusEdge = 0.16; }
    color *= 1.0 + uFocus * focusGain * (0.55 + 0.45 * fresnel);
    color += key * warmRim * uFocus * focusEdge;
    color += focusColor * uFocus * focusTint * (0.032 + fresnel * 0.44);

    gl_FragColor = vec4(color, outputAlpha);
  }
`;

const NAVIGATION_COLOUR = "#7fe5ff";
/**
 * Base de la rampa de máscara que el shader interpreta como PLUMA.
 *
 * Vive en una constante porque la usan tres sitios que tienen que coincidir o
 * el efecto se rompe en silencio: quien construye la rampa (`surfaceRamp`), el
 * ramo emisivo del fragment y la poda de `modelRadius`. El shader reserva todo
 * lo que hay de aquí para arriba; por debajo van los acabados de casco.
 *
 * Vale 8 y no 2, y la diferencia costó una prueba: el atributo es COMPARTIDO
 * entre materiales, así que un umbral bajo choca con los acabados del casco.
 * Con base 2, la poda de `modelRadius` se comía el grafito y los radiadores de
 * la Endurance —máscaras 2 y 3— y el radio publicado caía un 26 %. El shader no
 * se enteraba, porque allí la máscara se lee dentro del ramo del material que
 * la escribió; la poda, que es transversal, sí. Ocho está holgadamente por
 * encima de las tres máscaras de casco de la Endurance, que es la que más usa.
 */
const PLUME_MASK = 8;
const STRUCTURE_KIND = 7;
const EMISSIVE_KIND = 8;
const ENDURANCE_SERVICE_KIND = 9;
interface MaterialOptions {
  accent?: string;
  secondary?: string;
  transparent?: boolean;
  depthWrite?: boolean;
  side?: THREE.Side;
  surfaceTexture?: THREE.Texture;
  blending?: THREE.Blending;
  /** Propulsión a impulsos en vez de continua. Sólo la lee el ramo emisivo. */
  pulsed?: boolean;
}

type HullSurface = "endurance" | "ranger";

function surfaceNoise(x: number, y: number, seed: number): number {
  let value = Math.imul(x + seed * 17, 374_761_393);
  value = Math.imul(value ^ (y + seed * 31), 668_265_263);
  value = Math.imul(value ^ (value >>> 13), 1_274_126_177);
  return ((value ^ (value >>> 16)) >>> 0) / 4_294_967_295;
}

/** Recorte a [0,1]. Aparece en cada canal de la textura de casco. */
function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Textura de casco generada en memoria.
 *
 * No es ruido pegado encima: empaqueta brillo de manta, tono térmico, costura
 * y micro-rugosidad en RGBA. Son 64 KiB por nave en memoria y cero bytes de
 * red; `flat` ni siquiera importa este módulo.
 *
 * ── Por qué las dos naves NO comparten parámetros ───────────────────────────
 *
 * La versión anterior usaba una sola gramática con una celda distinta, y el
 * resultado era el mismo damero en las dos: dieciséis cuadros por cara con
 * medio punto de contraste entre vecinos. Sobre el módulo de una estación eso
 * pasa por manta acolchada; sobre el ala de una lanzadera parecía suelo de
 * baldosas, y era la mitad de por qué la Ranger se leía como asset barato.
 *
 * Ahora la Endurance lleva manta térmica —clara, casi uniforme, con acolchado
 * fino y costuras suaves— y la Ranger, panelado aeronáutico: chapa más oscura,
 * junta marcada y fila de remaches. La misma textura, dos oficios distintos.
 */
function createHullSurfaceTexture(kind: HullSurface): THREE.DataTexture {
  const blanketed = kind === "endurance";
  /*
    ── LA RESOLUCIÓN ES POR NAVE, y la diferencia la pidió el Observatorio ───

    Esta textura se escribió para el System Map, donde la Ranger mide setenta
    píxeles. A 128 con paneles de 32 hay CUATRO paneles por cara, así que sobre
    el fuselaje del laboratorio —seiscientos píxeles de largo— cada junta salía
    de seis píxeles de ancho y difuminada: no se leía como una costura sino como
    una franja pintada de negro. Es lo que hacía que la nave, vista de cerca,
    pareciera un asset barato por mucho que la geometría estuviera bien.

    La Ranger sube a 384 con paneles de 48 —ocho por cara, juntas de un texel— y
    la Endurance se queda exactamente donde estaba: su manta térmica no tiene
    juntas que afinar, está aprobada, y subirle la resolución le cambiaría el
    grano a un cuerpo que nadie ha pedido tocar.
  */
  const size = blanketed ? 128 : 384;
  const cell = blanketed ? 24 : 48;
  const seed = blanketed ? 41 : 73;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const offset = (y * size + x) * 4;
      const grain = surfaceNoise(x, y, seed);
      const broad = surfaceNoise(
        Math.floor(x / cell),
        Math.floor(y / cell),
        seed + 11,
      );
      const localX = x % cell;
      const localY = y % cell;
      const edgeDistance = Math.min(
        localX,
        localY,
        cell - 1 - localX,
        cell - 1 - localY,
      );
      /*
        La junta de la chapa pasa a medir UN texel, no dos y medio.

        Y no es sólo estrecharla: una junta real se ve porque la chapa de al
        lado monta sobre ella, así que aquí hay dos cosas y no una — la línea
        oscura y el LABIO, el texel inmediatamente anterior, que recibe la luz
        rasante y sale más claro que el panel. Sin el labio una junta fina se
        lee como una raya pintada; con él se lee como un escalón.
      */
      const seam = blanketed
        ? edgeDistance < 1
          ? 0.34
          : edgeDistance < 1.8
            ? 0.13
            : 0
        : edgeDistance < 1
          ? 1
          : edgeDistance < 2
            ? 0.3
            : 0;
      const lip = !blanketed && edgeDistance >= 2 && edgeDistance < 3 ? 1 : 0;
      /*
        Y los paneles dejan de ser un damero perfecto: uno de cada tres lleva
        una junta INTERMEDIA. Una cuadrícula regular es lo que el ojo identifica
        como textura repetida; basta romper un tercio de sus celdas para que se
        lea como despiece.
      */
      const subSeam =
        !blanketed &&
        surfaceNoise(Math.floor(x / cell), Math.floor(y / cell), seed + 29) > 0.66 &&
        Math.abs(localY - cell / 2) < 1
          ? 0.8
          : 0;
      // Remaches: sólo la Ranger, y sólo sobre la junta. Es el detalle que
      // convierte un plano liso en una pieza fabricada. A 384 van cada seis
      // texeles en vez de cada ocho, que a esta escala es el paso de un roblón.
      const rivet =
        !blanketed && edgeDistance >= 3 && edgeDistance < 4.2 && (x + y) % 6 === 0
          ? 0.5
          : 0;
      const quilt = blanketed
        ? 0.5 + 0.5 * Math.sin((x / size) * Math.PI * 34 + Math.sin((y / size) * 21))
        : 0.5 + 0.5 * Math.sin((x / size) * Math.PI * 12);
      /*
        REGUEROS. Vetas largas y sucias en un solo sentido, que es lo que
        distingue una chapa que ha VOLADO de una recién pintada. Valen menos de
        seis centésimas de albedo: se notan en el conjunto, no de una en una.
      */
      const streak = blanketed
        ? 0
        : (surfaceNoise(x, Math.floor(y / 9), seed + 53) - 0.5) *
          (0.35 + 0.65 * surfaceNoise(x, 0, seed + 67));

      const blanket = clamp01(
        blanketed
          ? // Manta clara y CASI uniforme: ±0.05 entre paneles vecinos, no ±0.2.
            0.84 + (broad - 0.5) * 0.1 + (grain - 0.5) * 0.055 - seam * 0.3
          : 0.6 +
            (broad - 0.5) * 0.13 +
            (grain - 0.5) * 0.05 +
            streak * 0.055 -
            seam * 0.34 -
            subSeam * 0.16 +
            lip * 0.1 +
            rivet * 0.22,
      );
      // Lámina dorada: parches raros y grandes, no un tinte general.
      const warmth = clamp01(
        blanketed
          ? Math.max(0, broad - 0.62) * 2.4 + quilt * 0.08
          : Math.max(0, broad - 0.7) * 1.8,
      );
      const roughness = clamp01(
        blanketed
          ? 0.52 + grain * 0.28 + quilt * 0.14
          : 0.3 +
            grain * 0.2 +
            quilt * 0.1 +
            Math.abs(streak) * 0.3 -
            rivet * 0.2 -
            lip * 0.12,
      );

      data[offset] = Math.round(blanket * 255);
      data[offset + 1] = Math.round(warmth * 255);
      data[offset + 2] = Math.round(
        Math.max(Math.max(seam, subSeam), rivet) * 255,
      );
      data[offset + 3] = Math.round(roughness * 255);
    }
  }

  const texture = new THREE.DataTexture(
    data,
    size,
    size,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  texture.name = `${kind}-thermal-surface`;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Todos los materiales, incluidos luces y anillos, exponen el mismo contrato de
 * uniformes. `system-scene.ts` puede actualizar tiempo/foco sin saber cuántas
 * piezas tiene un mundo; la complejidad queda encapsulada aquí.
 */
function bodyMaterial(
  input: SceneBodyInput,
  kind: number,
  options: MaterialOptions = {},
): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    vertexShader: BODY_VERTEX,
    fragmentShader: BODY_FRAGMENT,
    transparent: options.transparent ?? false,
    depthWrite: options.depthWrite ?? true,
    side: options.side ?? THREE.FrontSide,
    blending: options.blending ?? THREE.NormalBlending,
    uniforms: {
      uAccent: { value: new THREE.Color(options.accent ?? input.accent) },
      uSecondary: { value: new THREE.Color(options.secondary ?? input.secondary) },
      uNavigation: { value: new THREE.Color(NAVIGATION_COLOUR) },
      uCamPos: { value: new THREE.Vector3() },
      uLightIntensity: { value: 1 },
      uTime: { value: 0 },
      uFocus: { value: 0 },
      uKind: { value: kind },
      uSurfaceMap: { value: options.surfaceTexture ?? null },
      // Producción por defecto; sólo el banco de pruebas lo baja (§F1.0).
      uEmission: { value: 1 },
      uPulsed: { value: options.pulsed ? 1 : 0 },
    },
  });
  // Three hace dos pases para transparent + DoubleSide salvo que se indique lo
  // contrario. Anillos y estratos no necesitan ordenar caras por separado: un
  // solo pase conserva ambos lados y mantiene real el presupuesto de batches.
  if (material.transparent && material.side === THREE.DoubleSide) {
    material.forceSinglePass = true;
  }

  // Las mallas sin máscara reciben cero sin crear un buffer inútil. Three
  // permite defaults por atributo en ShaderMaterial; extendemos el contrato
  // incorporado (color/uv/uv1) para nuestro canal de material.
  Object.assign(material.defaultAttributeValues, { aSurfaceMask: [0] });
  return material;
}

type VectorTuple = readonly [number, number, number];

/** Aplica una transformación y la hornea en la geometría antes de fusionarla. */
function placed(
  geometry: THREE.BufferGeometry,
  position: VectorTuple = [0, 0, 0],
  rotation: VectorTuple = [0, 0, 0],
): THREE.BufferGeometry {
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
    new THREE.Vector3(1, 1, 1),
  );
  return geometry.applyMatrix4(matrix);
}

/**
 * Máscara VARIABLE a lo largo de un eje local, para las plumas de propulsión.
 *
 * `surfaceMasked` escribe una constante y con eso basta para elegir acabado;
 * una pluma necesita saber además CUÁNTO ha avanzado, y eso es un gradiente.
 *
 * En vez de añadir un atributo —que obligaría a rellenarlo en toda geometría
 * que se fusione con ésta, y a pagar un canal de vértice más— se aprovecha que
 * `aSurfaceMask` ya es un float interpolado: la garganta escribe `base` y la
 * punta `base + 1`, y el fragment recupera el parámetro restando. El shader
 * reserva para esto todo lo que hay por encima de 1.5.
 *
 * Se aplica DESPUÉS de `placed`, porque mide sobre las coordenadas ya
 * horneadas en el espacio del modelo.
 */
function surfaceRamp(
  geometry: THREE.BufferGeometry,
  axis: "x" | "y" | "z",
  from: number,
  to: number,
  base: number,
): THREE.BufferGeometry {
  const position = geometry.getAttribute("position");
  const values = new Float32Array(position.count);
  const read =
    axis === "x"
      ? (index: number) => position.getX(index)
      : axis === "y"
        ? (index: number) => position.getY(index)
        : (index: number) => position.getZ(index);
  for (let index = 0; index < position.count; index++) {
    const t = THREE.MathUtils.clamp((read(index) - from) / (to - from), 0, 1);
    values[index] = base + t;
  }
  geometry.setAttribute("aSurfaceMask", new THREE.BufferAttribute(values, 1));
  return geometry;
}

/** Marca una pieza para seleccionar un acabado dentro del mismo draw call. */
function surfaceMasked(
  geometry: THREE.BufferGeometry,
  mask: number,
): THREE.BufferGeometry {
  const count = geometry.getAttribute("position").count;
  geometry.setAttribute(
    "aSurfaceMask",
    new THREE.BufferAttribute(new Float32Array(count).fill(mask), 1),
  );
  return geometry;
}

/**
 * RoundedBox sale no indexada; se normaliza para poder fusionarla con boxes.
 *
 * `segments` entra con el pase de calidad de la Ranger y por defecto vale lo de
 * siempre, que es lo que deja intactos a los demás cuerpos. Dos subdivisiones
 * bastan a setenta píxeles; en el Observatorio el fuselaje mide seiscientos y
 * sus cantos redondeados se leen como tres facetas planas.
 */
function roundedBox(
  width: number,
  height: number,
  depth: number,
  radius: number,
  segments = 2,
): THREE.BufferGeometry {
  const geometry = new RoundedBoxGeometry(width, height, depth, segments, radius);
  const indexed = mergeVertices(geometry);
  geometry.dispose();
  return indexed;
}

/** Una malla por familia material: detalle real sin pagar un draw por módulo. */
function mergedMesh(
  geometries: THREE.BufferGeometry[],
  material: THREE.ShaderMaterial,
): THREE.Mesh {
  const usesSurfaceMask = geometries.some((geometry) =>
    Boolean(geometry.getAttribute("aSurfaceMask")),
  );
  if (usesSurfaceMask) {
    for (const geometry of geometries) {
      if (geometry.getAttribute("aSurfaceMask")) continue;
      const count = geometry.getAttribute("position").count;
      geometry.setAttribute(
        "aSurfaceMask",
        new THREE.BufferAttribute(new Float32Array(count), 1),
      );
    }
  }
  const geometry = mergeGeometries(geometries, false);
  for (const part of geometries) part.dispose();
  if (!geometry) {
    throw new Error("No se pudieron fusionar las geometrías del cuerpo");
  }
  return new THREE.Mesh(geometry, material);
}

interface BodyModel {
  root: THREE.Object3D;
  materials: THREE.ShaderMaterial[];
  /**
   * Movimiento SECUNDARIO del modelo, en su propio espacio local.
   *
   * El giro propio ya lo pone `spinAt` sobre la raíz, y por sí solo deja el
   * sistema desequilibrado: la Endurance —que tiene doce módulos y un eje— lee
   * ese giro perfectamente, mientras que una esfera lisa girando parece quieta.
   * Aquí es donde cada cuerpo puede mover ALGO SUYO: un anillo en su plano, un
   * hábitat recorriendo su órbita, retículas contrarrotando.
   *
   * Es absoluto y en segundos, como `spinAt`, por el mismo motivo: un paso por
   * fotograma haría que la escena corriera al doble en una pantalla de 120 Hz.
   */
  animate?(seconds: number): void;
}

/**
  * Teselado de los mundos esféricos.
  *
  * 48×32 era detalle que nadie podía ver: el mundo más grande ocupa ~130 px de
  * diámetro y a esa talla un meridiano cada 9° ya cae por debajo del píxel. Los
  * vértices que se ahorran aquí son exactamente los que pagan los módulos de la
  * Endurance y las alas de la Ranger, que sí se leen.
  */
const WORLD_SEGMENTS = 40;
const WORLD_RINGS = 26;

function simpleWorld(input: SceneBodyInput, kind: number): BodyModel {
  const material = bodyMaterial(input, kind);
  const root = new THREE.Object3D();
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, WORLD_SEGMENTS, WORLD_RINGS),
    material,
  );
  sphere.name = `${input.id}-surface`;
  root.add(sphere);
  return { root, materials: [material] };
}

/**
 * Endurance: el objeto con mejor diseño industrial del sistema.
 *
 * ── Qué fallaba ─────────────────────────────────────────────────────────────
 *
 * La versión anterior tenía piezas —doce cápsulas, cuatro motores, un mástil—
 * pero no JERARQUÍA. Doce módulos del mismo peso repartidos cada 30°, brazos de
 * dos centímetros de canto que a tamaño de Hero no existen y un hub más pequeño
 * que cualquiera de sus módulos: en pantalla eso no es una nave, es una nube de
 * cubos. Se leía «tiene muchas piezas», no «entiendo cómo se construyó esto».
 *
 * ── El orden de lectura, ahora explícito ────────────────────────────────────
 *
 * 1. **Núcleo.** Eje esbelto con collar de atraque a proa y bloque de cuatro
 *    campanas a popa. Explica la profundidad sin tapar los brazos.
 * 2. **Estructura primaria.** Dos rieles continuos cierran la circunferencia
 *    ENTERA, también donde no hay módulos. La rueda existe aunque falte carga,
 *    y ése es el dato que convierte doce cajas en una nave.
 * 3. **Cuatro brazos.** Celosía de verdad —dos cordones, diagonales alternas y
 *    travesaños— con canto suficiente para leerse a 160 px de ancho total.
 * 4. **Cuatro grupos de tres módulos.** Un módulo principal por brazo y dos
 *    satélites flanqueándolo a 22°, con 46° de riel desnudo entre grupos. La
 *    agrupación es lo que convierte doce repeticiones en cuatro decisiones.
 * 5. **Sistemas secundarios.** Radiadores, paneles de servicio, dos Ranger y
 *    dos Lander atracadas y balizas. Detalle, y sólo después de la silueta.
 *
 * Sigue costando cuatro draws: manta/panel, estructura, servicio y balizas.
 */
function enduranceModel(input: SceneBodyInput): BodyModel {
  const hull = bodyMaterial(input, KIND.ship, {
    surfaceTexture: createHullSurfaceTexture("endurance"),
  });
  const structure = bodyMaterial(input, STRUCTURE_KIND);
  const service = bodyMaterial(input, ENDURANCE_SERVICE_KIND, {
    accent: "#c0793d",
  });
  // Existing fourth draw: physically placed service lamps and short RCS jets.
  const lights = bodyMaterial(input, EMISSIVE_KIND, {
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const ignition = new Float32Array(ENDURANCE_JETS);
  const navigation = new Float32Array(3);
  lights.fragmentShader = ENDURANCE_LIGHT_FRAGMENT;
  lights.uniforms.uIgnition = { value: ignition };
  lights.uniforms.uNavPulse = { value: navigation };
  updateEnduranceOperations(0, ignition, navigation);
  const root = new THREE.Object3D();
  const assembly = new THREE.Object3D();
  assembly.name = "endurance-assembly";
  root.add(assembly);

  /* Acabados dentro del mismo draw: manta estándar, manta principal —más clara
     y reflectante—, grafito satinado y radiador acanalado. */
  const BLANKET = 0;
  const PRIMARY_BLANKET = 1;
  const GRAPHITE = 2;
  const RADIATOR = 3;

  const GROUPS = 4;
  const MODULES_PER_GROUP = 3;
  /** Radio de la circunferencia de módulos. Todo lo demás se mide contra esto. */
  const RING = 0.88;
  const GROUP_STEP = (Math.PI * 2) / GROUPS;
  /** Separación dentro del grupo. 22° dejan 46° de riel desnudo entre grupos. */
  const SLOT_SPREAD = (22 * Math.PI) / 180;
  /** Semiseparación axial de los dos rieles primarios. */
  const RAIL_Z = 0.125;

  const hullParts: THREE.BufferGeometry[] = [];
  const structureParts: THREE.BufferGeometry[] = [];
  const serviceParts: THREE.BufferGeometry[] = [];
  const lightParts: THREE.BufferGeometry[] = [];
  const halo = (position: VectorTuple, radius: number, mask: number) => {
    // A local optical halo only: 4–6 px in the Hero, with no change to the
    // wide bloom tuned for Gargantúa. Mask >= 40 excludes light from bounds.
    lightParts.push(surfaceMasked(placed(new THREE.SphereGeometry(radius, 6, 4), position), 40 + mask));
  };

  /* ── 1. Núcleo ─────────────────────────────────────────────────────────────
     El eje va en Z, perpendicular al plano del anillo. El barril mide 0.65 de
     largo por 0.37 de diámetro: el collar y la propulsión prolongan su lectura
     axial sin convertir el centro en un botón macizo. */
  hullParts.push(
    surfaceMasked(
      placed(
        new THREE.CylinderGeometry(0.185, 0.185, 0.65, 18),
        [0, 0, 0],
        [Math.PI / 2, 0, 0],
      ),
      PRIMARY_BLANKET,
    ),
    // Proa: collar de atraque troncocónico. Por aquí entra todo lo que llega.
    surfaceMasked(
      placed(
        new THREE.CylinderGeometry(0.10, 0.17, 0.22, 16),
        [0, 0, 0.425],
        [Math.PI / 2, 0, 0],
      ),
      PRIMARY_BLANKET,
    ),
    // Popa: sección de servicio en grafito, más estrecha y claramente distinta.
    surfaceMasked(
      placed(
        new THREE.CylinderGeometry(0.155, 0.175, 0.24, 16),
        [0, 0, -0.415],
        [Math.PI / 2, 0, 0],
      ),
      GRAPHITE,
    ),
  );

  structureParts.push(
    // Cinturón: el nudo donde el núcleo recoge la carga de los cuatro brazos.
    new THREE.TorusGeometry(0.255, 0.045, 8, 26),
    placed(new THREE.TorusGeometry(0.195, 0.018, 5, 18), [0, 0, 0.25]),
    placed(new THREE.TorusGeometry(0.195, 0.018, 5, 18), [0, 0, -0.25]),
    // Mástil y reflector de alta ganancia: escala y función en dos piezas.
    placed(
      new THREE.CylinderGeometry(0.012, 0.012, 0.26, 7),
      [0, 0, 0.64],
      [Math.PI / 2, 0, 0],
    ),
    placed(
      new THREE.ConeGeometry(0.075, 0.03, 12, 1, true),
      [0, 0, 0.78],
      [Math.PI / 2, 0, 0],
    ),
  );

  // Propulsión principal: cuatro campanas alrededor del eje, no doce repartidas
  // por el anillo. Una nave empuja desde su centro de masas.
  for (let index = 0; index < 4; index++) {
    const angle = Math.PI / 4 + index * (Math.PI / 2);
    const x = Math.cos(angle) * 0.115;
    const y = Math.sin(angle) * 0.115;
    structureParts.push(
      placed(
        new THREE.CylinderGeometry(0.05, 0.082, 0.22, 10, 1, true),
        [x, y, -0.645],
        [Math.PI / 2, 0, 0],
      ),
      placed(new THREE.TorusGeometry(0.079, 0.011, 5, 12), [x, y, -0.75]),
    );
  }

  /* Four existing rim pods retain their tank and bell geometry. Add two
     small attitude nozzles to each pod, plus two at the docking collar.
     The dark bells remain readable when all fourteen jets are off. */
  const jet = (
    mouth: VectorTuple,
    direction: THREE.Vector3,
    channel: number,
    radius: number,
    length: number,
    addBell = true,
  ) => {
    const axis = direction.clone().normalize();
    const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
    const locate = (geometry: THREE.BufferGeometry) => geometry
      .applyQuaternion(rotation).translate(...mouth);
    if (addBell) {
      structureParts.push(locate(
        new THREE.CylinderGeometry(radius * 1.35, radius * 0.75, 0.055, 8, 1, true)
          .translate(0, -0.0275, 0),
      ));
    }
    const mask = PLUME_MASK + channel * 2;
    lightParts.push(
      surfaceMasked(locate(new THREE.SphereGeometry(radius * 0.65, 6, 4)), mask),
      locate(surfaceRamp(
        new THREE.CylinderGeometry(radius * 1.7, radius * 0.8, length, 9, 1, true)
          .translate(0, length / 2, 0),
        "y", 0, length, mask,
      )),
    );
  };
  const RIM_THRUSTER_ANGLES = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
  RIM_THRUSTER_ANGLES.forEach((angle, index) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    /* Casi RADIAL, no tangente. La primera versión disparaba tangencialmente
       —que es lo que da par puro— y en la captura la pluma corría pegada al
       borde del aro, cruzándose con radiadores y módulos: el escape se leía
       dentro de la nave. A 24° del radio conserva componente tangencial
       suficiente para que siga siendo control de actitud y sale del contorno
       en su primer tercio, que es donde tiene todo su brillo. */
    const fire = angle + (index % 2 === 0 ? 0.42 : -0.42);
    const fireX = Math.cos(fire);
    const fireY = Math.sin(fire);
    const baseX = cos * (RING + 0.055);
    const baseY = sin * (RING + 0.055);

    structureParts.push(
      // Bloque de tanques: lo que hace que la tobera pertenezca a la nave.
      placed(
        roundedBox(0.13, 0.115, 0.115, 0.02),
        [cos * (RING + 0.02), sin * (RING + 0.02), 0],
        [0, 0, angle],
      ),
      // Campana. Grande a propósito: por debajo de esto no se lee que es una.
      placed(
        new THREE.CylinderGeometry(0.055, 0.032, 0.115, 9, 1, true),
        [baseX + fireX * 0.085, baseY + fireY * 0.085, 0],
        [0, 0, fire - Math.PI / 2],
      ),
    );

    jet(
      [baseX + fireX * 0.144, baseY + fireY * 0.144, 0],
      new THREE.Vector3(fireX, fireY, 0), index, 0.034, 0.24, false,
    );
    for (const side of [-1, 1]) {
      jet(
        [baseX - sin * side * 0.055, baseY + cos * side * 0.055, side * 0.09],
        new THREE.Vector3(-sin * side, cos * side, side * 0.65),
        4 + index * 2 + (side > 0 ? 1 : 0), 0.022, 0.105,
      );
    }
  });
  jet([0.15, 0.055, 0.42], new THREE.Vector3(1, 0.25, 0.5), 12, 0.021, 0.09);
  jet([-0.15, -0.055, 0.42], new THREE.Vector3(-1, -0.25, 0.5), 13, 0.021, 0.09);

  /* ── 2. Estructura primaria: la circunferencia completa ────────────────────
     Dos rieles y sus travesaños. Es la pieza que faltaba: sin ella los módulos
     eran cubos suspendidos a la misma distancia del centro por casualidad. */
  /* Los rieles van en el material de CASCO, no en el de estructura. Es una
     decisión de lectura, no de física: a tamaño de Hero el metal oscuro
     desaparece contra el fondo, y lo que tiene que verse desde el primer
     píxel es la circunferencia. Un aro claro dice «nave de anillo» antes de
     que se distinga un solo módulo. */
  hullParts.push(
    surfaceMasked(
      placed(new THREE.TorusGeometry(RING, 0.032, 6, 52), [0, 0, RAIL_Z]),
      BLANKET,
    ),
    surfaceMasked(
      placed(new THREE.TorusGeometry(RING, 0.032, 6, 52), [0, 0, -RAIL_Z]),
      BLANKET,
    ),
  );
  const TIES = 24;
  for (let index = 0; index < TIES; index++) {
    const angle = (index / TIES) * Math.PI * 2;
    structureParts.push(
      placed(
        new THREE.BoxGeometry(0.028, 0.024, RAIL_Z * 2),
        [Math.cos(angle) * RING, Math.sin(angle) * RING, 0],
        [0, 0, angle],
      ),
    );
  }

  /* ── 3. Cuatro brazos ──────────────────────────────────────────────────────
     Dos cordones de 55 mm de sección, cinco travesaños y cuatro diagonales
     alternas. A tamaño de Hero cada brazo mide unos 3 px de canto: por debajo
     de eso no hay celosía que valga, y por eso los cordones anteriores —de 22
     mm— sencillamente no existían en pantalla. */
  const ARM_INNER = 0.28;
  const ARM_OUTER = RING - 0.24;
  const ARM_BAYS = 4;
  /** Semiseparación tangencial de los cordones. */
  const CHORD = 0.095;

  for (let group = 0; group < GROUPS; group++) {
    // Índice 0 = las 12; sentido horario, como el diagrama de producción.
    const angle = Math.PI / 2 - group * GROUP_STEP;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    /** Punto del brazo en coordenadas (radio, lado del cordón). */
    const at = (radius: number, side: number): VectorTuple => [
      cos * radius - sin * side * CHORD,
      sin * radius + cos * side * CHORD,
      0,
    ];

    // Cordones en casco claro por el mismo motivo que los rieles: son la
    // segunda línea que el ojo tiene que encontrar, y no puede ser negra.
    for (const side of [-1, 1]) {
      hullParts.push(
        surfaceMasked(
          placed(
            new THREE.BoxGeometry(ARM_OUTER - ARM_INNER, 0.045, 0.045),
            at((ARM_INNER + ARM_OUTER) / 2, side),
            [0, 0, angle],
          ),
          BLANKET,
        ),
      );
    }

    const bayLength = (ARM_OUTER - ARM_INNER) / ARM_BAYS;
    for (let bay = 0; bay <= ARM_BAYS; bay++) {
      const radius = ARM_INNER + bay * bayLength;
      structureParts.push(
        placed(
          new THREE.BoxGeometry(0.036, CHORD * 2, 0.036),
          [cos * radius, sin * radius, 0],
          [0, 0, angle],
        ),
      );
      if (bay === ARM_BAYS) continue;
      // Diagonales alternas: la celosía se lee incluso cuando el brazo mide
      // tres píxeles, porque el zigzag rompe la simetría de los dos cordones.
      const rise = bay % 2 === 0 ? 1 : -1;
      structureParts.push(
        strut(
          new THREE.Vector3(...at(radius, -rise)),
          new THREE.Vector3(...at(radius + bayLength, rise)),
          0.03,
        ),
      );
    }

    // Encastre en el cinturón: la carga entra en el núcleo por una pieza ancha.
    hullParts.push(
      surfaceMasked(
        placed(
          roundedBox(0.17, CHORD * 2 + 0.085, 0.18, 0.022),
          [cos * (ARM_INNER + 0.02), sin * (ARM_INNER + 0.02), 0],
          [0, 0, angle],
        ),
        GRAPHITE,
      ),
    );

    /* Horquilla: el brazo se abre en tres y entrega a los tres módulos del
       grupo. Es la pieza que hace que el grupo sea un grupo, y no tres cajas
       que casualmente están cerca. */
    hullParts.push(
      surfaceMasked(
        placed(
          new THREE.BoxGeometry(0.22, 0.1, 0.1),
          [cos * (ARM_OUTER + 0.11), sin * (ARM_OUTER + 0.11), 0],
          [0, 0, angle],
        ),
        BLANKET,
      ),
    );
    for (const slot of [-1, 1]) {
      const slotAngle = angle + slot * SLOT_SPREAD;
      structureParts.push(
        strut(
          new THREE.Vector3(cos * (ARM_OUTER + 0.04), sin * (ARM_OUTER + 0.04), 0),
          new THREE.Vector3(
            Math.cos(slotAngle) * (RING - 0.17),
            Math.sin(slotAngle) * (RING - 0.17),
            0,
          ),
          0.038,
        ),
      );
    }
  }

  /* ── 4. Cuatro grupos de tres módulos ──────────────────────────────────────
     El módulo principal es un 44 % más largo y ocupa el eje del brazo; los dos
     satélites son claramente menores. Tres tamaños distintos por grupo son lo
     que produce lectura de ingeniería en vez de repetición. */
  for (let group = 0; group < GROUPS; group++) {
    const groupAngle = Math.PI / 2 - group * GROUP_STEP;
    const primaryZ = [0.065, -0.055, 0.025, -0.04][group];

    for (let slot = -1; slot <= 1; slot++) {
      const isPrimary = slot === 0;
      const angle = groupAngle + slot * SLOT_SPREAD;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      // Variaciones fijas de carga, no ruido ni nuevas piezas. Los satélites
      // alternan delante/detrás de los rieles y dejan ver sus soportes.
      const variation = Math.sin(group * 2.3 + slot * 1.7);
      const radial = (isPrimary ? 0.46 : 0.32) * (1 + variation * 0.065);
      const tangential = (isPrimary ? 0.33 : 0.25) * (1 - variation * 0.08);
      const depth = isPrimary ? 0.33 : 0.22 + (variation + 1) * 0.025;
      const moduleZ = isPrimary ? primaryZ : primaryZ + slot * 0.105;

      hullParts.push(
        surfaceMasked(
          placed(
            roundedBox(radial, tangential, depth, 0.03),
            [cos * RING, sin * RING, moduleZ],
            [0, 0, angle + (isPrimary ? 0 : variation * 0.07)],
          ),
          isPrimary ? PRIMARY_BLANKET : BLANKET,
        ),
      );

      const occupied = (group === 0 && slot !== 1) ||
        (group === 1 && slot === 1) || (group === 2 && slot !== 0) ||
        (group === 3 && slot === 0);
      if (occupied) {
        // A compact interior aperture on the front face, offset from docking.
        lightParts.push(surfaceMasked(placed(
          new THREE.BoxGeometry(isPrimary ? 0.080 : 0.065, 0.039, 0.008),
          [cos * (RING - 0.025) - sin * tangential * 0.36,
            sin * (RING - 0.025) + cos * tangential * 0.36,
            moduleZ + depth / 2 + 0.006],
          [0, 0, angle],
        ), 0));
        halo([cos * (RING - 0.025) - sin * tangential * 0.36,
          sin * (RING - 0.025) + cos * tangential * 0.36,
          moduleZ + depth / 2 + 0.009], 0.060, 0);
      }

      // Cuello al riel: el módulo está montado sobre la estructura, no flotando.
      structureParts.push(
        strut(
          new THREE.Vector3(cos * (RING - 0.28), sin * (RING - 0.28), 0),
          new THREE.Vector3(cos * (RING - radial / 2 + 0.02), sin * (RING - radial / 2 + 0.02), moduleZ),
          0.064,
        ),
      );

      if (isPrimary) {
        // Escotilla y panel de servicio: el módulo principal es el que trabaja.
        structureParts.push(
          placed(
            new THREE.CylinderGeometry(0.062, 0.062, 0.05, 12),
            [cos * (RING + 0.04), sin * (RING + 0.04), moduleZ + depth / 2 + 0.02],
            [Math.PI / 2, 0, 0],
          ),
        );
        serviceParts.push(
          placed(
            new THREE.BoxGeometry(0.17, 0.15, 0.014),
            [cos * (RING - 0.09), sin * (RING - 0.09), moduleZ + depth / 2 + 0.008],
            [0, 0, angle],
          ),
        );
        /*
          Un radiador por grupo, en el eje del brazo. Hubo ocho —dos por
          grupo, sobre los satélites— y el contorno se volvió un engranaje:
          dieciséis puntas alrededor del anillo son ruido, no ingeniería.
          Se conservan cuatro paneles; sólo dos se alargan para introducir
          direcciones selectivas en la silueta.

          Y van EN EL PLANO del anillo, no perpendiculares. Perpendiculares se
          veían de canto justo desde la pose del Hero: cuatro palos rayados
          saliendo del aro. En el plano prolongan el disco de la nave y
          aportan lo que ninguna otra pieza aporta, superficie plana grande.
        */
        const panelLength = [0.50, 0.32, 0.46, 0.32][group];
        hullParts.push(
          surfaceMasked(
            placed(
              new THREE.BoxGeometry(panelLength, 0.32, 0.014),
              [cos * (RING + 0.19 + panelLength / 2), sin * (RING + 0.19 + panelLength / 2), primaryZ],
              [0, 0, angle + (group % 2 === 0 ? 0.06 : -0.04)],
            ),
            RADIATOR,
          ),
        );
        structureParts.push(
          placed(
            new THREE.BoxGeometry(0.12, 0.032, 0.032),
            [cos * (RING + 0.24), sin * (RING + 0.24), primaryZ],
            [0, 0, angle],
          ),
        );
      } else {
        if (slot > 0) {
          serviceParts.push(
            placed(
              new THREE.BoxGeometry(0.12, 0.11, 0.012),
              [cos * RING, sin * RING, moduleZ + depth / 2 + 0.007],
              [0, 0, angle + variation * 0.07],
            ),
          );
        }
      }
    }

    /* ── 5. Naves atracadas ────────────────────────────────────────────────
       Dos Ranger y dos Lander, atracadas sobre la cara +Z de los módulos
       principales. Ahí no compiten con el núcleo —que es lo que arruinaba la
       versión anterior, con el full stack encima del hub— y confirman la
       escala: son las únicas piezas cuyo tamaño real conocemos. */
    const cos = Math.cos(groupAngle);
    const sin = Math.sin(groupAngle);
    // Alternan cara: dos por delante del plano del anillo y dos por detrás.
    // Cuatro cosas apiladas del mismo lado se leen como una sola masa.
    const dockZ = primaryZ + (group % 2 === 0 ? 1 : -1) * (0.33 / 2 + 0.075);
    if (group % 2 === 0) {
      // Ranger: dos semialas en flecha y una cabina mínima.
      for (const side of [1, -1]) {
        hullParts.push(
          surfaceMasked(
            placed(
              foil(0.15, -0.15, side * 0.16, 0.01, -0.11, 0.03),
              [cos * (RING - 0.02), sin * (RING - 0.02), dockZ],
              [0, 0, groupAngle],
            ),
            GRAPHITE,
          ),
        );
      }
      structureParts.push(
        placed(
          new THREE.BoxGeometry(0.16, 0.07, 0.055),
          [cos * (RING + 0.02), sin * (RING + 0.02), dockZ + 0.03],
          [0, 0, groupAngle],
        ),
      );
    } else {
      // Lander: bloque corto y pesado con dos toberas hacia popa.
      hullParts.push(
        surfaceMasked(
          placed(
            roundedBox(0.24, 0.18, 0.14, 0.025),
            [cos * RING, sin * RING, dockZ * 1.15],
            [0, 0, groupAngle],
          ),
          GRAPHITE,
        ),
      );
      for (const side of [-1, 1]) {
        structureParts.push(
          placed(
            new THREE.CylinderGeometry(0.028, 0.042, 0.09, 8, 1, true),
            [
              cos * (RING - 0.16) - sin * side * 0.055,
              sin * (RING - 0.16) + cos * side * 0.055,
              dockZ * 1.15,
            ],
            [0, 0, groupAngle + Math.PI / 2],
          ),
        );
      }
    }

  }

  // Three more warm sources: two inner-ring service points and one recessed
  // docking indicator. Two pulse gently; the others are continuously powered.
  const lamp = (position: VectorTuple, radius: number, mask: number) => {
    lightParts.push(surfaceMasked(placed(new THREE.SphereGeometry(radius, 8, 6), position), mask));
    halo(position, radius * 2.7, mask);
  };
  lamp([0.49, 0.095, 0.04], 0.021, 2);
  lamp([-0.09, -0.62, 0.13], 0.023, 0);
  lamp([0.07, -0.035, 0.537], 0.021, 4);
  // Four cold technical points, at docking / truss / axial connections.
  lamp([-0.057, 0.045, 0.536], 0.018, 1);
  lamp([0.013, 0.008, 0.774], 0.017, 3);
  lamp([0.62, 0.27, 0.142], 0.018, 1);
  lamp([-0.64, -0.255, 0.142], 0.018, 1);

  const hullMesh = mergedMesh(hullParts, hull);
  hullMesh.name = "endurance-twelve-module-ring";
  assembly.add(hullMesh);
  const structureMesh = mergedMesh(structureParts, structure);
  structureMesh.name = "endurance-radial-trusses-connectors-and-engines";
  assembly.add(structureMesh);
  const serviceMesh = mergedMesh(serviceParts, service);
  serviceMesh.name = "endurance-service-panels";
  assembly.add(serviceMesh);
  const lightMesh = mergedMesh(lightParts, lights);
  lightMesh.name = "endurance-airlock-lights";
  lightMesh.renderOrder = 2;
  assembly.add(lightMesh);

  assembly.userData.enduranceArchitecture = {
    modules: GROUPS * MODULES_PER_GROUP,
    groups: GROUPS,
    arms: GROUPS,
    primaryModules: GROUPS,
    engineBells: 4,
    radiators: GROUPS,
    dockedRangers: 2,
    dockedLanders: 2,
    manoeuvringPods: 4,
    manoeuvringNozzles: 4,
    rcsNozzles: 10,
    firingNozzles: 2,
    warmLights: 9,
    technicalLights: 4,
  };

  return {
    root,
    materials: [hull, structure, service, lights],
    animate(seconds) {
      updateEnduranceOperations(seconds, ignition, navigation);
      // Corrección de actitud subgrado. Se suma al giro axial del conjunto y
      // hace que las mantas crucen el terminador sin que la nave derive de sitio.
      assembly.rotation.x = Math.sin(seconds * 0.071) * 0.007;
      assembly.rotation.y = Math.sin(seconds * 0.049) * 0.009;
    },
  };
}

/**
 * Viga de sección cuadrada con la longitud en el eje Y local.
 *
 * Todas las vigas nacen igual y se rotan al colocarlas, así que sus UV
 * significan lo mismo en las cuatro caras largas: `u` cruza la sección y `v`
 * recorre la viga. De ahí salen el canal de luz y las juntas sin una sola
 * textura y sin resolución que se agote al acercar la cámara.
 */
function beam(section: number, length: number): THREE.BufferGeometry {
  return new THREE.BoxGeometry(section, length, section);
}

/** Tirante entre dos puntos: el hipercubo son sus diagonales, no sus caras. */
function strut(
  from: THREE.Vector3,
  to: THREE.Vector3,
  section: number,
): THREE.BufferGeometry {
  const direction = new THREE.Vector3().subVectors(to, from);
  const length = direction.length();
  const midpoint = new THREE.Vector3()
    .addVectors(from, to)
    .multiplyScalar(0.5);
  const orientation = new THREE.Euler().setFromQuaternion(
    new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize(),
    ),
  );

  return placed(
    beam(section, length),
    [midpoint.x, midpoint.y, midpoint.z],
    [orientation.x, orientation.y, orientation.z],
  );
}

/**
 * Superficie sustentadora extruida. Cuatro puntos y un espesor.
 *
 * Existe porque un ala de caja es un ladrillo: lo que hace reconocible a una
 * nave pequeña de un vistazo es la FLECHA de su borde de ataque, y eso pide un
 * cuadrilátero, no un `BoxGeometry`. El plano de la forma es (cuerda, envergadura)
 * y el espesor sale en Z; quien la coloca decide cómo tumbarla.
 */
function foil(
  rootLeading: number,
  rootTrailing: number,
  span: number,
  tipLeading: number,
  tipTrailing: number,
  thickness: number,
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(rootLeading, 0);
  shape.lineTo(rootTrailing, 0);
  shape.lineTo(tipTrailing, span);
  shape.lineTo(tipLeading, span);
  shape.closePath();

  const extruded = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 1,
  }).translate(0, 0, -thickness / 2);

  /*
    `ExtrudeGeometry` sale NO indexada y el resto del sistema es indexado;
    `mergeGeometries` exige que todas las piezas coincidan y devuelve `null` en
    silencio si no —lo que aquí se manifestaba como un `Mesh` sin geometría, no
    como un error legible. `mergeVertices` la indexa comparando posición, normal
    y uv, así que las aristas vivas del extrudido se conservan.
  */
  const indexed = mergeVertices(extruded);
  extruded.dispose();
  return indexed;
}

/**
 * Ranger: la lanzadera. Pequeña por jerarquía, nunca por descuido.
 *
 * ── Qué fallaba ─────────────────────────────────────────────────────────────
 *
 * La iteración anterior ya se reconocía como nave pequeña, y ahí se acababa lo
 * bueno: era un elipsoide aplastado con dos cuadriláteros extruidos por alas.
 * Sin proa, sin cabina enmarcada, sin toberas visibles desde la pose del Hero y
 * con el mismo damero de la textura estirado sobre un ala entera. Se leía como
 * asset de videojuego al lado de mundos que sí tienen superficie.
 *
 * ── Qué la define ahora ─────────────────────────────────────────────────────
 *
 * 1. **Proa facetada.** Un cono de ocho caras, aplastado: la nave tiene morro y
 *    tiene dirección. Es lo primero que faltaba.
 * 2. **Cabina con marco.** Cristal oscuro hundido entre dos montantes claros.
 *    Un reflejo sin marco es una mancha; con marco es una cabina.
 * 3. **Alas con borde de ataque.** Un larguero oscuro recorre la flecha entera:
 *    separa el ala del fuselaje y da un filo que la luz puede encontrar.
 * 4. **Dos góndolas con tobera.** Cuerpo claro, anillo, campana oscura y una
 *    brasa dentro. Los motores existen desde cualquier ángulo del Hero.
 * 5. **Deriva en V.** Dos planos de cola inclinados, no dos aletas verticales:
 *    rompen la silueta por arriba sin competir con las alas.
 *
 * ── Y ya no gira ────────────────────────────────────────────────────────────
 *
 * Una nave de veinte metros dando una vuelta completa sobre su eje longitudinal
 * cada seis minutos no es vida, es un error de lectura: parece un modelo colgado
 * de un hilo. Su pose es fija —proa hacia Gargantúa, dorso hacia la cámara— y lo
 * único que se mueve es la corrección de actitud de menos de un grado.
 */
function rangerModel(input: SceneBodyInput): BodyModel {
  const hull = bodyMaterial(input, KIND.beacon, {
    surfaceTexture: createHullSurfaceTexture("ranger"),
  });
  const structure = bodyMaterial(input, STRUCTURE_KIND);
  const beacon = bodyMaterial(input, EMISSIVE_KIND, {
    accent: input.accent,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const root = new THREE.Object3D();
  // Grupo propio: la pose de reposo va en la raíz y la actitud viva aquí dentro.
  const craft = new THREE.Object3D();
  root.add(craft);

  /* Acabados dentro del casco: chapa, cristal de cabina, tapa de servicio y
     plano sustentador. El ala tiene su propio valor a propósito —es la
     diferencia entre «una nave» y «un cuerpo con dos aletas del mismo color». */
  const PLATE = 0;
  const GLASS = 1;
  const SERVICE = 2;
  const WING = 3;

  // Marco local: +X proa, +Y arriba, +Z estribor.
  const WING_ROOT_LEADING = 0.24;
  const WING_TIP_LEADING = -0.16;
  const WING_SPAN = 0.6;
  /*
    Babor y estribor, una sola vez.

    Estaba escrito `[-1, 1]` ocho veces, que es lo mismo hasta que hay que
    CONTAR: el panel `DATOS` del Observatorio publica la arquitectura de la
    figura y la regla del §8 es que ninguna lectura se teclea. Con la constante,
    «dos góndolas» sale de la misma lista que construye las dos góndolas.
  */
  const SIDES = [-1, 1];
  /** Las dos semialas, por envergadura con signo. */
  const WINGS = [WING_SPAN, -WING_SPAN];
  /** Balizas de navegación: las dos puntas de ala y el morro. Son SEÑAL —dicen
   *  dónde empieza y acaba la nave— y por eso van en violeta de identidad. */
  const NAV_BEACONS: VectorTuple[] = [
    [-0.2, -0.042, WING_SPAN + 0.02],
    [-0.2, -0.042, -WING_SPAN - 0.02],
    [0.75, 0.025, 0],
  ];
  /**
   * El marco de la cabina: cumbrera, dos arcos y los dos rieles laterales.
   *
   * Sus cotas siguen a la cúpula del parabrisas y no al revés — antes eran tres
   * barras colocadas a ojo alrededor de una esfera, y con la cúpula nueva
   * quedaban por debajo de su base, o sea enterradas. Un marco que no toca el
   * cristal no enmarca nada.
   */
  const COCKPIT_FRAME: Array<[VectorTuple, VectorTuple]> = [
    // Cumbrera, sobre la arista alta de la cúpula.
    [[0.3, 0.012, 0.016], [0.33, 0.211, 0]],
    // Arco de proa y arco de popa, ceñidos a los dos extremos.
    [[0.016, 0.03, 0.15], [0.478, 0.172, 0]],
    [[0.016, 0.034, 0.17], [0.185, 0.174, 0]],
    // Rieles laterales: la junta entre el cristal y la chapa.
    [[0.31, 0.016, 0.014], [0.33, 0.174, 0.094]],
    [[0.31, 0.016, 0.014], [0.33, 0.174, -0.094]],
  ];

  const hullParts = [
    // Fuselaje: bloque bajo y ancho, con los cantos redondeados de una nave
    // que reentra. No es un cilindro: es un lifting body.
    /*
      ── LA TESELACIÓN ES DEL OBSERVATORIO, no del System Map ────────────────

      Todo lo que sigue se dimensionó para setenta píxeles, donde un canto
      redondeado de dos subdivisiones ya es una curva y un cono de ocho caras ya
      es una punta. A seiscientos píxeles las dos cosas son poliedros: el
      fuselaje enseña tres facetas planas por canto y la proa, ocho aristas
      francas. Subir los lados no cambia ni la silueta ni la escala —los radios
      son los mismos— y en el mapa no se nota, que es exactamente lo que tiene
      que pasar.
    */
    surfaceMasked(
      placed(roundedBox(0.94, 0.28, 0.37, 0.09, 3), [-0.07, 0.035, 0]),
      PLATE,
    ),
    // Proa facetada: dieciséis caras y un aplastado vertical. Sigue teniendo
    // quiebres —una lanzadera es chapa plegada, no una gota— pero ya no se
    // cuentan con el dedo.
    surfaceMasked(
      placed(
        new THREE.ConeGeometry(0.19, 0.36, 16, 1).scale(0.76, 1, 1),
        [0.58, 0.025, 0],
        [0, 0, -Math.PI / 2],
      ),
      PLATE,
    ),
    // Popa: cierre troncocónico corto, para que la cola no acabe en un canto.
    surfaceMasked(
      placed(
        new THREE.CylinderGeometry(0.12, 0.18, 0.14, 16),
        [-0.61, 0.035, 0],
        [0, 0, Math.PI / 2],
      ),
      PLATE,
    ),
    // Alas en flecha. La cuerda de raíz casi dobla a la de punta y el borde de
    // salida retrocede: la planta es la de una nave que vuela, no un triángulo.
    ...WINGS.map((span) =>
      surfaceMasked(
        placed(
          foil(WING_ROOT_LEADING, -0.5, span, WING_TIP_LEADING, -0.4, 0.055),
          [0, -0.045, 0],
          [Math.PI / 2, 0, 0],
        ),
        WING,
      ),
    ),
    /*
      LA CABINA, rehecha porque de cerca era lo peor de la nave.

      Era una esfera aplastada medio enterrada en el fuselaje, así que lo que
      se veía era el trozo que asomaba: una mancha oscura de contorno
      irregular, sin arriba ni abajo, que a setenta píxeles pasa por cabina y a
      seiscientos parece un bulto. El problema no era el material —forzado a
      cualquier color se veía igual de informe— sino que una superficie
      recortada por otra no tiene forma propia.

      Ahora es una cúpula FACETADA de ocho caras apoyada sobre el lomo: base
      cerrada, cumbrera definida y ocho aristas que la luz puede encontrar. La
      dirección de arte pide «cristal hundido, no una burbuja encima», y eso lo
      sigue cumpliendo — su base entra en la chapa y sólo asoma cinco
      centésimas, que es menos de lo que asomaba la esfera.
    */
    surfaceMasked(
      placed(
        new THREE.SphereGeometry(1, 8, 3, 0, Math.PI * 2, 0, Math.PI * 0.5)
          .scale(0.175, 0.052, 0.098),
        [0.33, 0.162, 0],
      ),
      GLASS,
    ),
    // Góndolas de motor: cuerpo claro bajo el encastre del ala.
    ...SIDES.map((side) =>
      surfaceMasked(
        placed(
          new THREE.CylinderGeometry(0.1, 0.112, 0.42, 22),
          [-0.29, -0.06, side * 0.215],
          [0, 0, Math.PI / 2],
        ),
        PLATE,
      ),
    ),
    // Deriva en V. Dos planos inclinados 38°: rompen el perfil por arriba y
    // dejan ver el fuselaje entre ellos.
    ...SIDES.map((side) =>
      surfaceMasked(
        placed(
          foil(-0.26, -0.54, 0.26, -0.44, -0.57, 0.032),
          [0, 0.12, side * 0.05],
          [side * 0.66, 0, 0],
        ),
        WING,
      ),
    ),
    // Tapas de servicio: dos rectángulos cálidos, rasantes al dorso.
    ...SIDES.map((side) =>
      surfaceMasked(
        placed(roundedBox(0.15, 0.018, 0.075, 0.005), [-0.19, 0.165, side * 0.115]),
        SERVICE,
      ),
    ),
    /*
      ── LO QUE UNA NAVE TIENE Y ESTA NO TENÍA ─────────────────────────────

      Nada de esto se ve en el System Map y todo se ve en el Observatorio: una
      superficie grande y limpia lee como maqueta, y lo que la convierte en
      máquina es que tenga encima piezas de otro tamaño.

      Van en CHAPA y no en estructura, y esa fue la corrección de la primera
      versión: puestas en el metal oscuro de la quilla no se leían como piezas
      montadas sino como agujeros, y el lomo acababa con una franja negra de
      punta a punta. Un carenado es del mismo material que el casco; lo que lo
      separa es el canto que proyecta, no su color.

      Todas caben dentro de la envolvente: el radio del cuerpo lo sigue fijando
      la baliza de proa, así que ni el blanco de clic ni la distancia de
      encuadre se mueven.
    */
    /*
      El marco de la cabina, en CHAPA y no en estructura.

      Estaba en el metal oscuro de la quilla, que es donde vivía cuando era
      tres barras sueltas alrededor de una esfera. Con la cúpula nueva el marco
      pasa a ser lo que enmarca, y en metal oscuro lo que enmarcaba era un
      rectángulo negro sobre el lomo. La dirección de arte lo dice desde el
      primer pase: «cristal oscuro hundido entre dos montantes CLAROS».
    */
    ...COCKPIT_FRAME.map(([size, at]) =>
      surfaceMasked(placed(new THREE.BoxGeometry(...size), at), PLATE),
    ),
    // Espina dorsal: el conducto que le da EJE al lomo. Sin ella la vista
    // PLANTA es un rectángulo con dos tapas cálidas encima.
    surfaceMasked(
      placed(new THREE.BoxGeometry(0.58, 0.016, 0.034), [-0.2, 0.178, 0]),
      PLATE,
    ),
    ...SIDES.flatMap((side) => [
      // Carenado de encastre: tapa la junta entre ala y fuselaje, que hasta
      // ahora era una interpenetración a la vista.
      surfaceMasked(
        placed(roundedBox(0.54, 0.05, 0.05, 0.018), [-0.08, -0.05, side * 0.172]),
        PLATE,
      ),
      // Valla de ala: el plano queda partido y deja de ser una losa.
      surfaceMasked(
        placed(new THREE.BoxGeometry(0.13, 0.032, 0.01), [-0.07, -0.026, side * 0.37]),
        PLATE,
      ),
      // Dos carenados de actuador bajo el borde de salida.
      ...[0.16, 0.38].map((t) =>
        surfaceMasked(
          placed(
            new THREE.BoxGeometry(0.085, 0.028, 0.038),
            [-0.41 + t * 0.14, -0.068, side * (0.24 + t)],
          ),
          PLATE,
        ),
      ),
      // Rejilla de la góndola: tres lamas finas sobre su dorso.
      ...[0, 1, 2].map((n) =>
        surfaceMasked(
          placed(
            new THREE.BoxGeometry(0.055, 0.01, 0.085),
            [-0.205 + n * 0.05, 0.026, side * 0.215],
          ),
          PLATE,
        ),
      ),
    ]),
  ];
  const hullMesh = mergedMesh(hullParts, hull);
  hullMesh.name = "ranger-metallic-hull";
  craft.add(hullMesh);

  const structureParts: THREE.BufferGeometry[] = [
    // Quilla: escudo térmico oscuro bajo el vientre. Se ve por el canto y da
    // una segunda silueta —la del Shuttle— sin pagar otra ala.
    placed(
      new THREE.BoxGeometry(0.84, 0.07, 0.29),
      [-0.07, -0.115, 0],
    ),
    /* Bloque de maniobra de proa. Va en estructura —metal oscuro— para que la
       brasa que lleva encima tenga contra qué leerse: un punto de luz sobre
       chapa clara es una mota, sobre chapa oscura es una tobera. */
    ...SIDES.map((side) =>
      placed(
        new THREE.BoxGeometry(0.10, 0.055, 0.05),
        [0.42, 0.05, side * 0.125],
      ),
    ),
    /*
      Puertos de maniobra: seis discos hundidos por costado, en dos grupos.
      Una nave que apunta tiene por dónde empujar, y a esta se le veían sólo
      los dos bloques de proa.
    */
    ...SIDES.flatMap((side) =>
      [0.46, 0.34, -0.5].map((x) =>
        placed(
          new THREE.CylinderGeometry(0.017, 0.013, 0.014, 10),
          [x, 0.02, side * 0.176],
          [Math.PI / 2, 0, 0],
        ),
      ),
    ),
    // Patines de aterrizaje replegados bajo la quilla.
    ...SIDES.map((side) =>
      placed(
        new THREE.BoxGeometry(0.22, 0.022, 0.055),
        [-0.12, -0.147, side * 0.095],
      ),
    ),
    // Anillo de escotilla, hundido en el lomo por detrás de la cabina.
    placed(
      new THREE.TorusGeometry(0.034, 0.006, 6, 20),
      [0.0, 0.176, -0.095],
      [Math.PI / 2, 0, 0],
    ),
    // Antena de pala y tubo de Pitot: dos siluetas finas que rompen el canto.
    placed(new THREE.BoxGeometry(0.016, 0.055, 0.005), [-0.36, 0.198, 0.075]),
    placed(
      new THREE.CylinderGeometry(0.005, 0.005, 0.1, 6),
      [0.71, 0.045, 0],
      [0, 0, Math.PI / 2],
    ),
  ];

  for (const side of SIDES) {
    /* Borde de ataque: un larguero oscuro que recorre la flecha entera. Es la
       pieza que separa el ala del fuselaje a distancia —sin él, ala y cuerpo
       comparten valor y la nave se lee como una mancha con puntas. */
    structureParts.push(
      strut(
        new THREE.Vector3(WING_ROOT_LEADING, -0.045, side * 0.155),
        new THREE.Vector3(WING_TIP_LEADING, -0.045, side * WING_SPAN),
        0.045,
      ),
      // Campana de la tobera y su anillo.
      placed(
        new THREE.CylinderGeometry(0.088, 0.12, 0.18, 22, 1, true),
        [-0.58, -0.06, side * 0.215],
        [0, 0, Math.PI / 2],
      ),
      placed(
        new THREE.TorusGeometry(0.112, 0.014, 6, 20),
        [-0.49, -0.06, side * 0.215],
        [0, Math.PI / 2, 0],
      ),
      /*
        DENTRO de la campana, que hasta ahora era un tubo hueco.

        La garganta —un tronco de cono corto que estrecha hacia delante— y el
        anillo de cardán que la sujeta. No se ven desde el System Map y son lo
        primero que se mira en el Observatorio cuando la vista `PROPULSIÓN`
        pone las dos toberas de frente: un motor sin interior es una lata.
      */
      placed(
        new THREE.CylinderGeometry(0.046, 0.086, 0.13, 18, 1, true),
        [-0.535, -0.06, side * 0.215],
        [0, 0, Math.PI / 2],
      ),
      placed(
        new THREE.TorusGeometry(0.058, 0.011, 5, 14),
        [-0.475, -0.06, side * 0.215],
        [0, Math.PI / 2, 0],
      ),
      // Tres nervios de refuerzo por campana, repartidos por su circunferencia.
      ...[0, 1, 2].map((n) =>
        placed(
          new THREE.BoxGeometry(0.17, 0.012, 0.02),
          [
            -0.575 + Math.cos((n * Math.PI * 2) / 3) * 0.0,
            -0.06 + Math.sin((n * Math.PI * 2) / 3 + 0.6) * 0.1,
            side * 0.215 + Math.cos((n * Math.PI * 2) / 3 + 0.6) * 0.1,
          ],
          [(n * Math.PI * 2) / 3 + 0.6, 0, 0],
        ),
      ),
      // Góndola colgada del ala por un pilón corto y visible.
      placed(
        new THREE.BoxGeometry(0.32, 0.085, 0.045),
        [-0.29, 0.005, side * 0.215],
      ),
      // Contenedor de punta de ala: cierra el plano y sostiene la baliza.
      placed(
        new THREE.CylinderGeometry(0.028, 0.028, 0.18, 14),
        [-0.28, -0.042, side * (WING_SPAN + 0.005)],
        [0, 0, Math.PI / 2],
      ),

    );
  }

  const structureMesh = mergedMesh(structureParts, structure);
  structureMesh.name = "ranger-heat-shield-and-engines";
  craft.add(structureMesh);

  /*
     Balizas y escape, y NO son lo mismo.

     Las dos cosas comparten material —un cuarto por nave habría costado un draw
     del presupuesto de veinte, y no hay— pero se distinguen por máscara de
     vértice, que es gratis:

     · Máscara 0, en violeta de identidad: puntas de ala y morro. Son luces de
       navegación, o sea SEÑAL: dicen dónde empieza y acaba la nave.
     · Máscara 1, en blanco azulado: las dos campanas y las dos toberas de
       maniobra de proa. Son ESCAPE, y por eso ni comparten color con las
       balizas ni laten a su ritmo.

     El violeta de las balizas se quedaba solo antes de este pase, y con él la
     nave entera: un acento frío-lavanda sobre chapa lavanda es lo que hacía que
     la Ranger se leyera como una miniatura de plástico. El contraste entre una
     señal violeta y un escape blanco-azul es lo que la vuelve una máquina.

     Todas son físicas y diminutas: el bloom óptico las convierte en luz, y las
     de motor viven DENTRO de la campana, que es lo que hace que el escape se lea
     como escape y no como dos puntos pegados a la cola. */
  const beaconMesh = mergedMesh(
    [
      ...NAV_BEACONS.map((at, i) =>
        placed(new THREE.SphereGeometry(i === 2 ? 0.019 : 0.021, 7, 5), at),
      ),
      ...SIDES.map((side) =>
        surfaceMasked(
          placed(
            new THREE.CircleGeometry(0.048, 12),
            [-0.652, -0.06, side * 0.215],
            [0, -Math.PI / 2, 0],
          ),
          1,
        ),
      ),
      /* Y su pluma. Corta —0.30 de largo contra 1.7 de nave, o sea unos 17 px
         en el hero— y con la rampa sobre el eje X local, que es el de la nave:
         la garganta en la boca de la campana y la punta detrás. Se construye
         a lo largo de X y se ramplea antes de colocarla en su góndola. */
      ...SIDES.map((side) =>
        placed(
          surfaceRamp(
            new THREE.CylinderGeometry(0.060, 0.036, 0.30, 10, 1, true)
              .rotateZ(Math.PI / 2)
              .translate(-0.27, 0, 0),
            "x",
            -0.12,
            -0.42,
            PLUME_MASK,
          ),
          [-0.55, -0.06, side * 0.215],
        ),
      ),
      // Toberas de maniobra de proa: el par que hace apuntar a una lanzadera.
      ...SIDES.map((side) =>
        surfaceMasked(
          placed(new THREE.SphereGeometry(0.019, 6, 5), [0.44, 0.055, side * 0.145]),
          1,
        ),
      ),
    ],
    beacon,
  );
  beaconMesh.name = "ranger-violet-beacon";
  beaconMesh.renderOrder = 2;
  craft.add(beaconMesh);

  /*
    LA ARQUITECTURA DE LA LANZADERA, contada por las listas que la construyen.

    `specimen-contract.ts` ya lo esperaba —«se busca por sufijo para que añadir
    `rangerArchitecture` mañana no exija tocar este archivo»— y el motivo de que
    no haya ni un número escrito a mano es el de siempre: el modelo se toca, y
    el día que a esta nave le salga una tercera tobera el panel `DATOS` tiene
    que enterarse solo. Por eso arriba hay cuatro listas en vez de cuatro
    literales repetidos.

    No están TODAS las piezas: están las que alguien podría contar mirando. Un
    conteo que no se puede verificar contra la imagen no es una lectura de
    instrumento, es relleno.
  */
  craft.userData.rangerArchitecture = {
    wings: WINGS.length,
    tailFins: SIDES.length,
    leadingEdgeSpars: SIDES.length,
    engineBells: SIDES.length,
    plumes: SIDES.length,
    rcsNozzles: SIDES.length,
    navBeacons: NAV_BEACONS.length,
    servicePanels: SIDES.length,
    cockpitFrame: COCKPIT_FRAME.length,
  };

  return {
    root,
    materials: [hull, structure, beacon],
    animate(seconds) {
      /*
        Mantenimiento de actitud, no bamboleo.

        Amplitud de ~0,7° y periodos de 47 y 71 segundos: dos senos primos entre
        sí, así que el gesto nunca se repite igual y nunca llega a leerse como
        una oscilación. Con la nave ya sin giro propio, esto es todo su
        movimiento: la diferencia entre una nave que se sostiene sobre sus
        propulsores y una maqueta clavada en el cielo.
      */
      craft.rotation.z = Math.sin(seconds * 0.134) * 0.013;
      craft.rotation.y = Math.sin(seconds * 0.088) * 0.011;
    },
  };
}

function bodyModel(input: SceneBodyInput): BodyModel {
  switch (input.visual) {
    case "water":
      return simpleWorld(input, KIND.water);
    case "desert":
      return simpleWorld(input, KIND.desert);
    case "tesseract":
      return createTesseractModel();
    case "ship":
      return enduranceModel(input);
    case "beacon":
      return rangerModel(input);
    default:
      return simpleWorld(input, KIND.water);
  }
}

/**
 * Radio real desde el origen, ya con transforms y escala del modelo aplicados.
 *
 * ── Por qué se mide por VÉRTICES y no por esfera envolvente ─────────────────
 *
 * Decía «radio real» y devolvía una COTA: el centro de la esfera envolvente más
 * su radio. Para una esfera o un casco compacto la cota es exacta y nadie lo
 * notó nunca. Para una figura de caja no lo es —`computeBoundingSphere` mide
 * desde el centro de la caja envolvente, así que el resultado tira hacia la
 * distancia a una ESQUINA— y ahí el error se paga entero.
 *
 * El pase visual del Tesseracto lo destapó. Su estructura nueva —dos placas
 * cuadradas y un túnel— publicaba 4.94 rs cuando su vértice más lejano estaba a
 * 4.13: un 20 % de más en el número que dimensiona el blanco de clic, los
 * corchetes de adquisición y la distancia de encuadre. La consecuencia práctica
 * era peor que el número: obligaba a encoger el modelo un 17 % para que
 * «cupiera» en una jerarquía que él ya cumplía.
 *
 * Recorrer los vértices da el radio de verdad. Cuesta una pasada por los 21 k
 * vértices del sistema, UNA VEZ al construir la escena, y sólo cambia dos
 * cuerpos: el Tesseracto (−16 %) y la Ranger (−10 %), que son los dos únicos con
 * geometría de caja fusionada. Los otros cuatro devuelven exactamente el mismo
 * número que antes, porque para ellos la cota ya era exacta.
 *
 * ── Y la LUZ no es silueta (2026-09-05) ─────────────────────────────────────
 *
 * Las plumas de propulsión entraron en el mismo draw call que las balizas, así
 * que sus vértices llegan aquí como cualquier otro — y son, con diferencia, los
 * más lejanos del modelo. Contarlos hinchaba el radio publicado un 15 % en la
 * Ranger y un 8 % en la Endurance, con tres consecuencias todas equivocadas: el
 * blanco de clic crecía hacia el vacío detrás del motor, los corchetes de
 * adquisición encuadraban humo, y la cámara se alejaba para «dejar sitio» a una
 * estela. Una nave no ocupa más espacio por encender un motor.
 *
 * Así que este recorrido salta lo que la máscara marca como pluma. No es una
 * excepción para un efecto: es la regla correcta, y el sitio donde vive dice
 * exactamente eso — `radius` describe la SILUETA, y una pluma es luz emitida,
 * no materia. Las gargantas (máscara 1) sí cuentan: ésas son chapa.
 */
function modelRadius(root: THREE.Object3D): number {
  const vertex = new THREE.Vector3();
  let radius = 0;
  root.updateMatrixWorld(true);

  // Recursión propia y no `traverse`: hay que poder podar un SUBÁRBOL entero,
  // y el callback de traverse no puede detener el descenso a los hijos.
  const visit = (node: THREE.Object3D) => {
    const geometry = (node as Partial<THREE.Mesh>).geometry;
    const position = geometry?.getAttribute("position");
    if (position) {
      const mask = geometry?.getAttribute("aSurfaceMask");
      for (let i = 0; i < position.count; i++) {
        if (mask && mask.getX(i) > PLUME_MASK - 0.5) continue;
        vertex
          .fromBufferAttribute(position as THREE.BufferAttribute, i)
          .applyMatrix4(node.matrixWorld);
        radius = Math.max(radius, vertex.length());
      }
    }
    for (const child of node.children) visit(child);
  };

  visit(root);
  return radius;
}

/**
 * Actitud de la Ranger, construida como base ortonormal.
 *
 * Tres ángulos de Euler escritos a ojo son ilegibles y no dicen a dónde apunta
 * la nave. Aquí se declara lo que importa —dorso y proa— y la matriz sale de
 * ahí.
 *
 * ── Por qué estos dos vectores y no otros ───────────────────────────────────
 *
 * La Ranger es un cuerpo aerodinámico: casi toda su superficie mira a un mismo
 * sitio. Eso la hace MUY sensible a la actitud, al revés que la Endurance, que
 * con doce módulos siempre tiene caras encaradas a la luz. Colocada de plano
 * contra la cámara quedaba en penumbra entera, porque la única fuente del
 * sistema le llega por detrás.
 *
 * El dorso apunta al punto medio entre la cámara y Gargantúa: se ve a dos
 * tercios de su área y recibe luz de clave de verdad. Ése es el compromiso —ni
 * planta iluminada de canto ni tres cuartos a oscuras—, y es lo que cumple la
 * dirección de arte de que Gargantúa la ilumine de verdad.
 *
 * La proa va en el plano del dorso, hacia la derecha del cuadro: apunta a la
 * Endurance. La nave pequeña señalando a la nave grande cuenta un viaje sin
 * que nada se mueva.
 *
 * ── Corrección 2026-09-05 ───────────────────────────────────────────────────
 *
 * El dorso valía (0.337, 0.918, 0.229) y ese vector describía el compromiso de
 * arriba en la composición ANTERIOR. La recomposición de seis destinos movió la
 * nave y nadie rehízo el cálculo, así que el «punto medio» dejó de serlo:
 * medido contra la posición real, el dorso daba **n·l = −0.24** —o sea, de
 * espaldas a la única luz del sistema— con n·v = 0.996. La nave se veía
 * completamente de plano y completamente en penumbra, y por eso ningún cambio
 * de material se notaba: lo que se veía no era su chapa, era el relleno frío.
 *
 * El vector nuevo es el anterior inclinado un 45 % hacia la luz. Contra la
 * posición real da **n·l = 0.51** (el terminador satura a partir de 0.34, así
 * que el dorso queda enteramente en el día) y **n·v = 0.67**, que sigue siendo
 * dos tercios de área vista. Luz y cámara están a 107° en este sitio, así que
 * ninguna actitud las contenta a las dos: esto es el óptimo del compromiso, no
 * una preferencia.
 *
 * `ranger-probe` en la suite fija la lectura: si una recomposición vuelve a
 * mover la nave y el dorso baja del suelo de luz, el test lo dice en vez de
 * salir en una captura tres semanas después.
 *
 * ── Fase 1 (2026-09-05): la proa apuntaba mal ───────────────────────────────
 *
 * La corrección anterior arregló la luz y dejó pasar lo otro. Este documento
 * dice desde el principio que «la proa apunta a la Endurance» y que ese gesto
 * cuenta un viaje sin que nada se mueva — pero eso nunca se comprobó CONTRA LA
 * PANTALLA, que es donde el gesto ocurre. Medido: la dirección Ranger →
 * Endurance proyectada sobre el cuadro es **(0.978, +0.207)** —arriba y a la
 * derecha, porque la Endurance está más alta— y la proa daba **(0.986,
 * −0.168)**: derecha y ligeramente ABAJO. Veinte grados de error, y del signo
 * que peor se lee: una nave con el morro caído es una nave que no va a ningún
 * sitio, que es exactamente el «se ve horizontal y quieta» del encargo.
 *
 * El dorso nuevo lo corrige y no cuesta luz. Contra la posición real:
 *
 * | | dorso·luz | dorso·cámara | proa en pantalla |
 * |---|---|---|---|
 * | Antes | 0.230 | 0.231 | (0.986, −0.168) |
 * | Ahora | 0.197 | 0.232 | (0.718, **+0.197**) |
 *
 * El morro sube de −9.7° a +15.4° sobre la horizontal del cuadro, el área vista
 * se queda donde estaba y lo que se paga es un 14 % de incidencia de luz, que
 * sigue muy por encima del suelo de 0.15 que fija la suite.
 *
 * Y hay una cuarta magnitud que sólo apareció al mirar la captura: **hacia
 * dónde miran las toberas**. Es el producto del eje de escape por la cámara, y
 * las dos primeras poses candidatas lo dejaban en −0.08 — o sea, las dos
 * campanas apuntando al otro lado, con sus brasas invisibles. Justo el acento
 * que pedía el encargo, apagado por una decisión sobre la proa. Con esta pose
 * vale **0.569**, mejor incluso que el 0.508 de partida: los motores se ven
 * desde el hero, y se ven mejor que antes.
 *
 * El barrido que produjo estos números está en el histórico de la sesión: se
 * recorrió la vecindad del dorso en dos parámetros, se descartó todo lo que
 * bajara de 0.19 en cualquiera de los dos productos, y de lo que quedaba se
 * eligió lo que acerca la proa a la Endurance sin perder área vista.
 *
 * Existía una solución que clavaba la proa en el ideal —(0.974, +0.228), y sin
 * coste de luz— y se descartó EN LA CAPTURA: pedía bajar el área vista a 0.195,
 * y con ella la nave se leía de canto y apagada. La proa a medio camino sobre
 * una silueta entera se ve mejor que la proa perfecta sobre una silueta fina;
 * el barrido acota el espacio, la captura elige dentro de él.
 *
 * Se calcula una vez al cargar el módulo; el cuerpo ya no gira, así que esta
 * pose es toda su orientación.
 */
const RANGER_ATTITUDE = (() => {
  const top = new THREE.Vector3(-0.076, 0.993, -0.088).normalize();
  const nose = new THREE.Vector3(0.764, 0.001, -0.645)
    .projectOnPlane(top)
    .normalize();
  const side = new THREE.Vector3().crossVectors(nose, top).normalize();
  return new THREE.Matrix4().makeBasis(nose, top, side);
})();

/**
 * Orientación de reposo del cuerpo, ANTES de su giro propio.
 *
 * Vive en el grupo y no en las piezas porque el giro va en la raíz del modelo:
 * así cada cuerpo gira sobre su propio eje en vez de bambolearse alrededor del
 * eje del mundo, que es lo que sale cuando se compone al revés.
 */
function restOrientation(visual: WorldStructuralData["visual"], target: THREE.Euler) {
  /*
    Endurance. El ángulo se mide contra el EJE DE VISTA, no contra el mundo: el
    cuerpo está a 22 rs del centro y la cámara mira al centro, así que su rayo
    llega oblicuo. El pase de peso añade 0.12 rad (6.9°) de yaw sobre la pose
    anterior, comprimiendo el aro sin cambiar cámara ni posición.

    ── Fase 1 (2026-09-05): 0.30/0.32/−0.08 → 0.46/0.27/−0.16 ────────────────

    El pedido fue «rotarla un pelín para que no se vea tan presentada», y aquí
    hay dos cosas que medir, no una. Con la pose anterior el eje del anillo daba
    **0.672 con la cámara** —el aro casi de frente— y **−0.918 con Gargantúa**,
    o sea el plano del anillo casi perpendicular a la única luz del sistema. Lo
    segundo es lo que de verdad la aplanaba: con la luz llegando casi de canto
    al plano, los doce módulos recibían todos prácticamente la misma incidencia.

    La pose nueva mueve las dos a la vez y muy poco: 0.627 con la cámara —4.0°
    más comprimido— y −0.886 con la luz, 2.4° más rasante sobre el plano del
    anillo. Eso basta para que los grupos dejen de recibir la misma incidencia:
    los del lado encarado ganan cara iluminada y los del contrario entran en
    sombra.

    Se probó también más giro (0.46/0.27/−0.16, o sea 0.608 y −0.874) y se
    descartó mirando la captura: a esa compresión el aro deja de leerse como
    aro. La silueta circular es la mitad de la identidad de esta nave —lo dice
    la nota de `enduranceModel`— así que el techo del giro no lo pone el gusto,
    lo pone la lectura de la rueda.

    El blanco de clic sigue a la pose: `hitScaleY` baja de 0.64 a 0.60 en
    `system-scene.ts`, que es el coseno del ángulo nuevo. Un aro más comprimido
    con la elipse antigua falla justo en los grupos de arriba y abajo.
  */
  if (visual === "ship") return target.set(0.42, 0.28, -0.14);
  /*
    Tesseracto. Ésta es TODA su orientación —no gira sobre su eje— así que hace
    bastante más trabajo que la de cualquier otro cuerpo.

    Apunta el eje de la RECURSIÓN (+Y local) casi a la cámara: los tres marcos
    se ven enfilados uno dentro de otro, que es la lectura entera del objeto.
    Quien da la vista de tres cuartos no es esta pose, es la caja: va girada
    unos 25° contra ese eje (ver `TESSERACT_BOX_TILT`), así que enseña ancho,
    alto y fondo a la vez mientras el túnel llega de frente. Las dos cosas que
    se peleaban —volumen y recursión— dejan de pelearse porque no comparten eje.

    Se queda a 0.19 rad de la enfilada perfecta para que el conjunto no se cierre
    en una diana simétrica, que es lo que hace que un objeto se lea como icono.
  */
  if (visual === "tesseract") return target.set(1.38, 0.24, 0.1);
  if (visual === "beacon") return target.setFromRotationMatrix(RANGER_ATTITUDE);
  return target.set(0, 0, 0);
}

/**
 * Velocidad de giro propio, en radianes por segundo.
 *
 * ── Por qué cada cuerpo tiene la suya ───────────────────────────────────────
 *
 * Antes había dos números: mundos y estructuras. El resultado en pantalla era
 * un desequilibrio claro — la Endurance, con doce módulos y un eje, LEÍA su
 * giro; una esfera lisa a la misma velocidad parecía completamente quieta,
 * porque lo que se ve girar en un planeta no es el planeta, es su relieve
 * cruzando el terminador. Un mundo necesita más vueltas que una estructura para
 * contar lo mismo.
 *
 * Todas siguen en escala astronómica: la más rápida completa su vuelta en poco
 * más de dos minutos y la más lenta en siete. Nada aquí llama la atención por
 * sí solo; lo que se nota es que NADA está congelado.
 */
const SPIN_RATE: Record<WorldStructuralData["visual"], number> = {
  water: 0.05,
  desert: 0.042,
  ship: 0.016,
  /*
    CERO, y por el mismo motivo que la Ranger aunque desde el lado contrario.

    El Tesseracto no es un cuerpo celeste: es espacio plegado. Un objeto que
    gira sobre su eje afirma que tiene un eje, un dentro y un fuera estables —
    que es exactamente la lectura que su diseño intenta negar. Y a efectos de
    pantalla el giro también trabajaba en contra: hacía la figura predecible,
    porque en cuanto el ojo ve una rotación constante deja de mirar la forma y
    empieza a esperar el siguiente fotograma.

    Lo que le queda es su microtransformación interna, que oscila sin dirección
    estable y con periodos inconmensurables entre sí. Ver `createTesseractModel`.
  */
  tesseract: 0,
  /*
    CERO, y es la única excepción deliberada de la tabla.

    Un mundo que gira sobre su eje es física; una lanzadera de veinte metros
    dando una vuelta completa cada seis minutos es un modelo colgado de un
    hilo. La Ranger tiene proa, cabina y toberas: en cuanto rota, el ojo ve
    que la dirección a la que apunta no significa nada. Con pose fija, apuntar
    a Gargantúa sí significa algo. Lo único que le queda es la corrección de
    actitud de menos de un grado que pone su propio `animate`.
  */
  beacon: 0,
  "black-hole": 0,
};

/**
 * Escala perceptual exclusiva de WebGL.
 *
 * `placement.size` sigue siendo la composición compartida con el mapa plano.
 * Esta segunda capa permite que assets con mucho vacío interno (anillos,
 * retículas y lifting bodies) ocupen el tamaño que el ojo necesita sin tocar
 * una sola coordenada o ilustración del fallback 2D.
 */
const MODEL_SCALE: Record<WorldStructuralData["visual"], number> = {
  water: 1.12,
  desert: 1.12,
  /*
    Segundo ancla, no coprotagonista.

    Endurance no compite con Gargantúa por tamaño —el disco le saca cinco veces
    el ancho— sino por CONTRASTE: es blanca, tiene mucha geometría por unidad de
    silueta y cae cerca del centro visual. El grueso de la corrección es tonal
    (ver el ramo `uKind == 4` del fragment) y esto es solo el ajuste fino: −6 %
    de escala, que con el descentrado de la toma queda en un −9 % aparente.
  */
  ship: 0.9,
  /*
    1.153, y NO es un ascenso de jerarquía: el radio publicado se queda donde
    estaba.

    La geometría nueva es compacta —una caja con tres marcos dentro, sin las
    cinco extensiones largas— así que su esfera envolvente encogió un 7 % con la
    misma escala; después la caja creció para poder alojar tres marcos dentro y
    la esfera envolvente se fue por encima. El multiplicador devuelve el radio a
    los mismos ~55 px de la versión anterior, que es lo que mide
    `tools/composition.mjs` y lo que fija el blanco de clic y el encuadre.

    Lo que sí crece, y a propósito, es la MASA percibida: antes ese radio se
    gastaba en espolones finos y ahora lo ocupa la silueta de la caja. Es la
    diferencia entre agrandar un objeto y hacerlo legible; la dirección pidió
    resolverlo por lo segundo.
  */
  tesseract: 1.138,
  /*
    La Ranger nueva es MÁS COMPACTA que la anterior —fuselaje de verdad en vez
    de dos alas anchas— así que su esfera envolvente cayó de 4.04 a 2.70 rs con
    la misma escala. Sin corregirlo, un rediseño pensado para hacerla crecer la
    habría encogido un 15 %. Con 1.75 y su fase nueva queda en +21 % de tamaño
    aparente respecto de la versión anterior, dentro de lo pedido.
  */
  beacon: 1.75,
  "black-hole": 1,
};

/** Eje de giro propio, en el espacio local de la raíz de cada modelo. */
function spinAxis(visual: WorldStructuralData["visual"]): THREE.Vector3 {
  if (visual === "ship") return new THREE.Vector3(0, 0, 1);
  if (visual === "beacon") return new THREE.Vector3(1, 0, 0);
  return new THREE.Vector3(0, 1, 0);
}

/**
 * Construye la cinta de la órbita: dos vértices por muestra, uno a cada lado.
 *
 * La curva se muestrea de la MISMA función que mueve el cuerpo, así que la traza
 * no puede desalinearse de lo que traza. La tangente va como atributo porque el
 * vertex shader la necesita para orientar la cinta hacia la cámara, y calcularla
 * ahí obligaría a mirar los vértices vecinos.
 */
const ORBIT_SAMPLES = 160;

function orbitGeometry(
  placement: WorldStructuralData["placement"],
): THREE.BufferGeometry {
  const period = orbitalPeriod(placement);
  const positions = new Float32Array(ORBIT_SAMPLES * 2 * 3);
  const tangents = new Float32Array(ORBIT_SAMPLES * 2 * 3);
  const sides = new Float32Array(ORBIT_SAMPLES * 2);
  const cues = new Float32Array(ORBIT_SAMPLES * 2);
  const indices: number[] = [];

  const point = new THREE.Vector3();
  const ahead = new THREE.Vector3();
  const tangent = new THREE.Vector3();

  for (let i = 0; i < ORBIT_SAMPLES; i++) {
    const progress = i / ORBIT_SAMPLES;
    const t = progress * period;
    const distanceFromBody = Math.min(progress, 1 - progress);
    // Uno junto al cuerpo fijo; cero después de un arco corto a cada lado.
    const cue = 1 - THREE.MathUtils.smoothstep(distanceFromBody, 0.025, 0.085);
    orbitalPosition(placement, t, point);
    // Diferencia adelantada sobre la propia curva: exacta para lo que hace
    // falta y sin tener que derivar la parametrización a mano.
    orbitalPosition(placement, t + period / ORBIT_SAMPLES, ahead);
    tangent.subVectors(ahead, point).normalize();

    for (const side of [0, 1]) {
      const v = i * 2 + side;
      positions[v * 3] = point.x;
      positions[v * 3 + 1] = point.y;
      positions[v * 3 + 2] = point.z;
      tangents[v * 3] = tangent.x;
      tangents[v * 3 + 1] = tangent.y;
      tangents[v * 3 + 2] = tangent.z;
      sides[v] = side === 0 ? -1 : 1;
      cues[v] = cue;
    }

    // Se cierra el bucle contra la muestra 0: una órbita no tiene extremos.
    const next = ((i + 1) % ORBIT_SAMPLES) * 2;
    const here = i * 2;
    indices.push(here, here + 1, next, here + 1, next + 1, next);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aTangent", new THREE.BufferAttribute(tangents, 3));
  geometry.setAttribute("aSide", new THREE.BufferAttribute(sides, 1));
  geometry.setAttribute("aCue", new THREE.BufferAttribute(cues, 1));
  geometry.setIndex(indices);
  return geometry;
}

export interface SceneBodyInput {
  id: WorldId;
  visual: WorldStructuralData["visual"];
  accent: string;
  secondary: string;
  placement: WorldStructuralData["placement"];
}

export interface SceneBody {
  id: WorldId;
  visual: WorldStructuralData["visual"];
  /** Raíz colocada en el sistema; contiene todas las piezas del modelo. */
  object: THREE.Object3D;
  /**
   * La traza de la órbita va aparte del cuerpo: es geometría fija en el espacio
   * del sistema y su cue se alinea con la posición de dirección de arte.
   */
  orbit: THREE.Object3D;
  /** Todos los materiales del cuerpo. El bucle les escribe los uniformes. */
  materials: readonly THREE.ShaderMaterial[];
  placement: WorldStructuralData["placement"];
  /** Radio en rs, ya con la escala aplicada: lo usa el blanco de clic. */
  radius: number;
  /**
   * Coloca el giro propio para un instante dado.
   *
   * ABSOLUTO, no incremental. La versión anterior hacía `rotateY(spin * 0.016)`
   * por fotograma, con el 0.016 escrito a mano: en una pantalla de 144 Hz los
   * cuerpos giraban dos veces y media más rápido que en una de 60. Eso es
   * exactamente lo que §8 prohíbe —el paso de animación va por tiempo real— y
   * era una de las cosas que se veían como «los planetas se mueven raro».
   */
  spinAt(seconds: number): void;
  /**
   * Sólo el movimiento PROPIO del espécimen, sin el giro genérico.
   *
   * Existe para el Observatorio, y responde a una regla de su §3: «en un
   * laboratorio el espécimen se queda quieto hasta que alguien lo estudia; un
   * objeto que gira solo obliga a perseguirlo para mirarle una cara concreta».
   * Pero apagar el reloj entero apagaría también lo que SÍ es contenido — la
   * reconfiguración del Tesseracto, el oleaje de Miller, los RCS y las balizas
   * de la Endurance—, así que el giro se anula por ESPÉCIMEN y no por reloj.
   *
   * `spinAt` hace las dos cosas y no se toca: es lo que consume el System Map,
   * donde los seis cuerpos sí giran. Aquí se separan porque el Observatorio
   * necesita exactamente la mitad.
   *
   * Que el Tesseracto no notara la diferencia es una coincidencia de su tabla:
   * su `SPIN_RATE` vale 0, así que llamar a uno o a otro daba lo mismo. La
   * Endurance gira a 0.016 rad/s y es el primer espécimen donde se nota.
   */
  animateAt(seconds: number): void;
}

/** Crea el cuerpo. Devuelve `null` para Gargantúa: la dibuja el raymarch y no
 *  tiene geometría. */
export function createBody(input: SceneBodyInput): SceneBody | null {
  const kind = KIND[input.visual];
  if (kind < 0) return null;

  const object = new THREE.Object3D();
  restOrientation(input.visual, object.rotation);
  const model = bodyModel(input);
  model.root.scale.setScalar(input.placement.size * MODEL_SCALE[input.visual]);
  const radius = modelRadius(model.root);
  object.add(model.root);

  // La traza de la órbita. Gargantúa no llega aquí (sale antes por `kind < 0`),
  // así que todo lo que se construye tiene órbita que dibujar.
  const orbitMaterial = new THREE.ShaderMaterial({
    vertexShader: ORBIT_VERTEX,
    fragmentShader: ORBIT_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uAccent: { value: new THREE.Color(input.accent) },
      uNavigation: { value: new THREE.Color(NAVIGATION_COLOUR) },
      uCamPos: { value: new THREE.Vector3() },
      uFocus: { value: 0 },
      uTime: { value: 0 },
      uOrbitRadius: { value: input.placement.orbitRadius },
      // Lo sobrescribe la escena al encuadrar: el ancho va atado a la distancia
      // de cámara para que la traza mida lo mismo en pantalla en cualquier
      // viewport. Este valor solo cubre el primer fotograma.
      uWidth: { value: 0.12 },
    },
  });
  // La cinta ya orienta sus dos caras a cámara en el vertex shader; el segundo
  // pase automático de materiales transparentes DoubleSide sería redundante.
  orbitMaterial.forceSinglePass = true;
  const materials = [...model.materials, orbitMaterial];
  const orbit = new THREE.Mesh(orbitGeometry(input.placement), orbitMaterial);
  // Detrás de los cuerpos: es una guía, no un objeto del sistema.
  orbit.renderOrder = -1;

  const spin = SPIN_RATE[input.visual] ?? 0.014;
  const axis = spinAxis(input.visual);

  return {
    id: input.id,
    visual: input.visual,
    object,
    orbit,
    materials,
    placement: input.placement,
    radius,
    spinAt(seconds) {
      // En el eje LOCAL del modelo completo: módulos, trusses, planeta y hábitat
      // conservan sus relaciones y no bambolean alrededor del eje del mundo.
      model.root.quaternion.setFromAxisAngle(axis, spin * seconds);
      // Y lo que se mueve DENTRO del cuerpo: anillos en su plano, hábitat en su
      // órbita, retículas contrarrotando. Es lo que reparte la vida por toda la
      // escena en lugar de concentrarla en el único cuerpo que tenía módulos.
      model.animate?.(seconds);
    },
    animateAt(seconds) {
      // La segunda mitad de `spinAt`, sin la primera. El cuaternión de la raíz
      // no se toca, así que el modelo se queda en su orientación de reposo —que
      // es justamente la que el preset de observación encuadra.
      model.animate?.(seconds);
    },
  };
}

export function disposeBody(body: SceneBody) {
  for (const root of [body.object, body.orbit]) {
    root.traverse((node) => {
      (node as Partial<THREE.Mesh>).geometry?.dispose();
    });
  }
  for (const material of body.materials) {
    const surface = material.uniforms.uSurfaceMap?.value as unknown;
    if (surface instanceof THREE.Texture) surface.dispose();
    material.dispose();
  }
}
