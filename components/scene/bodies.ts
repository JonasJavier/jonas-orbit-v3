import * as THREE from "three";
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

/** Traducción del modelo visual del contenido al índice que usa el shader. */
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

    if (uKind == 0) {
      /*
        Miller: océano global bajo una luz brutal.

        ── Qué fallaba ─────────────────────────────────────────────────────
        La versión anterior se leía «bonita» y genérica: esfera azul luminosa a
        medio camino entre planeta helado y gigante gaseoso. Cuatro cosas la
        delataban, y ninguna era la silueta.

        1. **Un foco frontal.** Una mancha blanca lechosa, redonda y centrada
           que hacía de Miller una canica de cristal. No venía del especular
           estrecho sino de una lámina de exponente 15 encima: un lóbulo tan
           ancho que cubría un tercio del disco con luz plana.
        2. **Nubes y espuma repartidas.** Motitas claras por todo el globo. A
           tamaño de Hero eso no es meteorología, es textura de planeta.
        3. **Un halo isótropo.** La atmósfera pesaba 1.12 y rodeaba el cuerpo
           por igual, también donde no llega luz. Ayudaba a que se viera lindo;
           no a que se viera creíble.
        4. **Ninguna relación visible con Gargantúa.** La luz llegaba, pero
           nada en el cuerpo decía DE DÓNDE.

        ── La dirección ────────────────────────────────────────────────────
        Más agua que nubes. Un océano continuo, frío y austero, con una lámina
        de luz encima —no un punto— y el aire justo para tener volumen. Un
        sitio silencioso, inundado y peligroso; no un planeta azul bonito.

        Tres sitios de FBM y una octava suelta, exactamente el presupuesto
        anterior: la cuenca, las vetas de bajío y la bruma. Lo que desaparece
        —bandas de tormenta, rompientes, espuma— no se sustituye por más ruido
        sino por menos.
      */
      /* MACRO: la cuenca. Es la única escala que decide dónde el agua tiene
         fondo, y la que hace que el planeta tenga sitios y no manchas. */
      float basin = fbm(vLocal * 1.72 + vec3(2.7, 0.0, 5.1));
      /* VETAS DE BAJÍO. Anisótropa —latitud comprimida ×2.8— y DEFORMADA por la
         macro: sin ese warp las vetas cruzan la cuenca y vuelven a ser ruido
         sobre una bola. Es el mismo truco que ordenó la geografía de Edmunds. */
      float shoal = fbm(
        vec3(vLocal.x, vLocal.y * 2.8, vLocal.z) * 3.05 + basin * 2.4
      );
      /* Y una banda direccional larga que las peina. Un océano visto desde
         órbita tiene corrientes, que son PATRONES LARGOS; el detalle repartido
         al azar es justo lo que se estaba quitando. */
      float current = 0.5 + 0.5 * sin(
        dot(vLocal, vec3(5.3, 2.1, -3.9)) + shoal * 4.6
      );
      /*
        CORRIENTES ZONALES, y son lo primero que se decide.

        Aquí estaba el fallo que sobrevivió a tres pases. Las masas claras del
        cuerpo salían de mezclar tres campos de pesos parecidos —macro, vetas y
        corriente— y eso, por construcción, no puede dar otra cosa que una nube
        isótropa: manchas blandas que el ojo lee como vapor, hielo o gas. Se ve
        en un segundo pintando la máscara de bajío en un canal.

        Ahora la voz que manda es una banda LATITUDINAL: sigue la curvatura del
        cuerpo, no el ruido, y sobre la cara visible caen dos o tres. La macro y
        las vetas siguen ahí, pero como perturbación, para que las bandas no
        sean rayas de pijama. Cuesta cero sitios de FBM.
      */
      float bandPhase = vLocal.y * 6.6 + basin * 0.8 - shoal * 0.4;
      millerBands = 0.5 + 0.5 * sin(bandPhase);
      float shallow = smoothstep(
        0.5,
        0.86,
        millerBands * 0.5 + basin * 0.32 + shoal * 0.18
      );
      /*
        BRUMA, no capa de nubes. Alargada en longitud y con el umbral alto: lo
        que queda son unas pocas bandas finas, no algodón repartido. Miller es
        agua; la nube es lo que deja ver el agua, no lo que la tapa.
      */
      millerWeather = fbm(
        vec3(vLocal.x, vLocal.y * 3.4, vLocal.z) * 2.85
          + vec3(uTime * 0.004, 0.0, 3.3)
      );
      float cloudCover = smoothstep(0.66, 0.9, millerWeather + current * 0.06);
      /* Oleaje de superficie: no pinta color, sólo rompe la lámina de luz. */
      float waveField = 0.5 + 0.5 * sin(
        vLocal.y * 27.0 + vLocal.x * 6.0 + shoal * 4.8
      );
      /* Una octava: microoleaje, por debajo del píxel a esta distancia. */
      float microWaves = noise(vLocal * 18.0 + vec3(uTime * 0.012, 0.0, 0.0));

      /*
        MAREJADA. Dos trenes de onda largos, de gradiente exacto —la derivada
        de un seno es un coseno, no cuesta una muestra más— que inclinan el
        término lambert. En un mundo de olas de kilómetro, el terminador no es
        una curva limpia: es una banda rota.

        Y AQUÍ ESTABAN LAS MANCHAS NEBULOSAS. Se veían como nube, hielo o gas y
        se buscaron tres veces en la paleta y en la capa de nubes; no estaban
        ahí. Dos trenes cruzados de amplitud parecida y número de onda ~21
        producen un patrón de BATIDO —elipses de interferencia del tamaño de una
        cuarta parte del cuerpo— que a esta distancia no se lee como oleaje sino
        como manchas blandas sin dirección. Se ve de un vistazo pintando
        reliefOffset en un canal.

        Bajarla a un tercio quitó las manchas pero dejó el océano sin su
        estructura propia. La respuesta buena es cambiarle la ESCALA, no el
        volumen: los números de onda caen de ~21 a ~5.2, o sea de doce crestas
        sobre el diámetro a menos de dos. Lo que queda son dos o tres trenes
        largos y oblicuos que cruzan las corrientes latitudinales, y el batido
        entre ellos pasa a tener una escala MAYOR que el propio cuerpo — así que
        ya no puede dibujar elipses dentro de él. El segundo tren pesa un quinto
        del primero para que no salga un rayado regular.

        A esa escala la amplitud vuelve a subir —0.013 sobre gradientes cuatro
        veces menores— y ahora el tren manda también sobre el BRILLO, no sólo
        sobre el difuso: una cresta larga devuelve luz distinta que un seno, y
        eso es lo que hace inequívoco que la superficie es agua y no nube.
      */
      vec3 swellA = vec3(3.7, -2.1, 2.9);
      vec3 swellB = vec3(-2.4, 3.2, 4.1);
      float swellPhaseA = dot(vLocal, swellA) + uTime * 0.05;
      float swellPhaseB = dot(vLocal, swellB) - uTime * 0.037;
      vec3 swellSlope = swellA * cos(swellPhaseA) * 0.8
                      + swellB * cos(swellPhaseB) * 0.2;
      vec3 oceanUp = normalize(vLocal);
      vec3 swellTangent = swellSlope - oceanUp * dot(swellSlope, oceanUp);
      reliefOffset = -dot(swellTangent, normalize(vLightLocal))
                   * 0.013 * (1.0 - cloudCover * 0.55);
      /* Y la cresta larga también decide cuánto refleja: es la mitad de por qué
         se lee como lámina de agua y no como bruma. */
      float swellCrest = 0.5 + 0.5 * cos(swellPhaseA);

      /*
        PALETA: azul grisáceo, no cyan de piscina.

        Los tres tramos de profundidad se conservan —son lo que da fondo al
        agua— pero bajan croma y suben contraste entre sí. El bajío era
        (0.09, 0.47, 0.55): un turquesa eléctrico que a tamaño de Hero se leía
        como hielo iluminado. Pierde un quinto de saturación y algo de valor, y
        la lectura pasa de «bola azul brillante» a «océano con plataforma».
      */
      albedo = mix(vec3(0.006, 0.024, 0.078), vec3(0.022, 0.094, 0.226), basin);
      /* Las bandas se pintan POCO a propósito: el dueño las pidió «muy
         sutiles», y una banda de color fuerte vuelve a leerse como nube. Lo que
         las hace visibles es la inclinación de la lámina, no el pigmento. */
      albedo = mix(albedo, vec3(0.062, 0.19, 0.376), shallow * 0.55);
      /* El acento somero es una VETA, no un continente: sale del cruce de la
         corriente con el bajío, así que sigue una dirección. */
      albedo = mix(
        albedo,
        vec3(0.126, 0.298, 0.472),
        shallow * smoothstep(0.62, 0.94, current) * 0.42
      );
      /*
        CORRIENTES ZONALES: lo que hace que el cerebro diga AGUA.

        Las masas grandes ya estaban bien, pero eran blandas: nubosas por
        dentro, y una mancha suave azul claro se puede leer como nube, hielo o
        gas. Lo que faltaba era DIRECCIÓN a escala del planeta.

        Tres bandas largas siguiendo la curvatura —van con la latitud del
        cuerpo, no con el ruido— y perturbadas por la macroforma para que no
        sean rayas de pijama. No es textura de oleaje: a 47 px de radio unas
        olitas son grano y desaparecen. Es la variación grande de la lámina
        oceánica: dónde el agua devuelve luz y dónde la traga. Y por eso el
        término principal que modulan no es el color sino el BRILLO, aquí y en
        el reflejo extendido de más abajo.

        Cuesta cero sitios de FBM: la perturbación sale de basin y de shoal,
        que ya estaban calculados.
      */
      /*
        Y LAS BANDAS INCLINAN LA LÁMINA, que es lo que las hace agua.

        Pintarlas en el albedo no bastaba: a esta distancia un ±17 % de color
        sobre un cuerpo oscuro son seis niveles de gris y el ojo los lee como
        más nube. Lo que se ve en un océano de verdad no es que el agua cambie
        de color por franjas — es que la lámina está inclinada por franjas y
        devuelve la luz de otra manera.

        Mismo truco de gradiente analítico que la marejada, una escala por
        encima: la derivada de la fase respecto de la posición es la constante
        de la banda por el coseno, así que no cuesta una muestra más. El efecto
        aparece fuerte cerca del terminador —donde una inclinación pequeña
        decide entre luz y sombra— y suave en pleno día, que es exactamente
        cómo se comporta un mar iluminado de refilón.
      */
      vec3 bandSlope = vec3(0.0, 6.6, 0.0) * cos(bandPhase);
      vec3 bandTangent = bandSlope - oceanUp * dot(bandSlope, oceanUp);
      reliefOffset += -dot(bandTangent, normalize(vLightLocal)) * 0.023;
      /*
        MICROCONTRASTE, un realce local del 7 %.

        A tamaño de Hero el planeta corría el riesgo de leerse como una bola
        azul ligeramente desenfocada: masas correctas, ningún filo. Esto es un
        unsharp barato sobre la escala MEDIA —la que ya decide regiones— y no
        sobre el grano: multiplica por la desviación de shoal respecto de su
        media, así que aclara lo que ya era claro y hunde lo que ya era oscuro
        sin inventar estructura nueva ni tocar la jerarquía de masas.
      */
      albedo *= 1.0 + (shoal - 0.47) * 0.7;
      albedo *= 0.94 + millerBands * 0.12;
      /*
        Un hemisferio algo más profundo que el otro. Catorce puntos de
        luminancia sobre una dirección fija, sin ruido nuevo: lo justo para que
        el brillo no esté repartido con simetría de render.
      */
      float hemisphere = smoothstep(
        -0.55, 0.72, dot(oceanUp, vec3(0.38, 0.46, -0.80))
      );
      albedo *= mix(0.84, 1.06, hemisphere);
      /* Nube fría y apagada. Ni blanca ni cálida: es vapor sobre agua helada. */
      albedo = mix(albedo, vec3(0.398, 0.486, 0.588), cloudCover * 0.26);
      /*
        BRILLO. El agua es la superficie más reflectiva del sistema, y por eso
        el mando no es «cuánto» sino «con qué forma». Aquí sólo queda el suelo;
        la forma la ponen el lóbulo anisótropo y el destello del oleaje, más
        abajo, ya con la luz resuelta.
      */
      gloss = mix(0.92, 0.08, cloudCover);
      gloss *= 0.62 + waveField * 0.22 + microWaves * 0.2;
      /* Y las bandas mandan sobre el brillo más que sobre el color: es la
         diferencia entre pintar rayas y tener corrientes. */
      gloss *= 0.6 + millerBands * 0.72;
      gloss *= 0.68 + swellCrest * 0.58;
      /* La máscara del destello viaja resuelta: quien la usa está veinte líneas
         más abajo y no tiene acceso al oleaje ni a la nube. */
      millerGlitterMask = smoothstep(0.30, 0.88, waveField * 0.58 + microWaves * 0.42)
                        * (1.0 - cloudCover * 0.82);
      /*
        EL NÚCLEO ISÓTROPO CASI DESAPARECE, y ésta es la línea que quita la
        mancha blanca.

        Valía 74 de exponente y 0.82 de peso, y ahí estaba el foco de plató:
        con exponente 74 el lóbulo cae a 1/e a ocho grados de normal, que sobre
        un cuerpo de 47 px de radio son catorce píxeles de diámetro —un tercio
        del planeta— saturados a blanco. Bajarle el peso no arreglaba la FORMA:
        un disco redondo y liso encima de un océano sigue siendo una canica.

        A 320 y 0.12 lo que queda es el corazón caliente del reflejo, cuatro
        píxeles, dentro de la lámina anisótropa que sí tiene dirección. Aquí es
        donde el cuerpo deja de parecer iluminado de frente.
      */
      specularPower = 320.0;
      specularStrength = 0.085;
      /*
        ATMÓSFERA FINA, y esto es la mitad del arreglo.

        Pesaba 1.12 y era un halo isótropo: rodeaba el cuerpo por igual, cara
        noche incluida, y lo dejaba flotando dentro de un aro azul de interfaz.
        Baja a 0.3 —el mismo orden que Edmunds— y el aire que de verdad se ve
        pasa a ser el filo direccional del bloque uKind == 0 de más abajo. El
        color pierde algo de croma para no volver a competir con el ámbar.
      */
      atmosphere = vec3(0.196, 0.436, 0.756);
      /* 0.20, no 0.30. El halo COMÚN desborda hasta ndl = −0.45, así que buena
         parte de la línea pálida que rodeaba el limbo salía de aquí y no del
         filo propio. Termina en 0.09: el halo común usa exponente 2.2 y desborda
         hasta ndl = −0.45, así que por construcción NO PUEDE ser direccional —
         cualquier valor que se le deje pinta también el hemisferio que no mira
         a Gargantúa. Lo que se le quita se le devuelve entero al filo propio,
         que sí sabe dónde está la fuente. */
      atmosphereWeight = 0.09;
    } else if (uKind == 1) {
      /* Edmunds: roca seca, hierro y arena bajo la luz de Gargantúa.
         La macro decide provincias; la escala media sigue sus límites; el
         grano sólo modula. Sin nubes, velo, casquetes ni emisión. Dos FBM. */
      float provinces = fbm(vLocal * 1.62 + vec3(4.2, 1.1, 7.3));
      float terrain = fbm(vLocal * 4.6 + provinces * 1.9);
      float grain = noise(vLocal * 15.5);
      float upland = smoothstep(0.43, 0.49, provinces);
      float plateau = smoothstep(0.54, 0.59, provinces + (terrain - 0.5) * 0.12);
      float ironMass = smoothstep(0.62, 0.67, provinces);

      /* Cordilleras continuas con pendiente analítica: los claros sólo se
         ganan en crestas cuya ladera mira al disco, nunca en manchas de albedo.
         Las cuencas conservan una topografía mucho más plana. */
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
      vec3 up = normalize(vLocal);
      vec3 tangentSlope = slope - up * dot(slope, up);
      vec3 lightLocal = normalize(vLightLocal);
      reliefOffset = -dot(tangentSlope, lightLocal) * 0.0105 * (0.2 + upland);

      /* Escarpes derivados de la misma meseta que pinta el material. Las
         derivadas de pantalla recuperan su pendiente sin volver a muestrear
         ruido: arena, ladera y sombra comparten una sola topografía. */
      float geologicalHeight = upland * 0.18 + plateau * 0.14 + terrain * 0.45;
      vec3 dpdx = dFdx(vLocal);
      vec3 dpdy = dFdy(vLocal);
      vec3 acrossY = cross(dpdy, up);
      vec3 acrossX = cross(up, dpdx);
      float determinant = dot(dpdx, acrossY);
      vec3 geologicalSlope = (dFdx(geologicalHeight) * acrossY
                            + dFdy(geologicalHeight) * acrossX)
                           * sign(determinant) / max(abs(determinant), 1e-8);
      reliefOffset += clamp(-dot(geologicalSlope, lightLocal) * 0.022, -0.09, 0.09);

      /* Cuenca de umber, macizo rojizo, meseta de arena y provincia de hierro.
         Umbrales estrechos: bordes erosionados de roca, no algodón luminoso. */
      albedo = mix(vec3(0.075, 0.046, 0.035), vec3(0.16, 0.091, 0.061), terrain);
      albedo = mix(albedo, vec3(0.34, 0.185, 0.105), upland);
      albedo = mix(albedo, vec3(0.43, 0.30, 0.18), plateau * 0.82);
      albedo = mix(albedo, vec3(0.245, 0.105, 0.062), ironMass * 0.9);
      /* Estratos erosionados de la escala media. Se desvanecen al dejar de
         resolverse; nunca sustituyen a las cuatro provincias principales. */
      float strataPhase = terrain * 48.0 + provinces * 14.0;
      float strata = sin(strataPhase);
      float strataVisible = 1.0 - smoothstep(0.7, 2.2, fwidth(strataPhase));
      albedo *= 1.0 - (0.5 + 0.5 * strata) * upland * strataVisible * 0.18;
      albedo *= 0.83 + terrain * 0.34;

      /* Una fractura extensa, deformada por la provincia. Sus depósitos
         siguen la falla; el detalle fino no crea islas claras independientes. */
      float faultCoord = dot(vLocal, vec3(0.72, -0.43, 0.54))
                       + (provinces - 0.5) * 0.65 - 0.16;
      float faultWidth = max(fwidth(faultCoord), 0.008);
      float fault = 1.0 - smoothstep(0.018, 0.018 + faultWidth * 1.5, abs(faultCoord));
      float sediment = 1.0 - smoothstep(0.04, 0.12, abs(faultCoord - 0.09));
      albedo = mix(albedo, vec3(0.37, 0.255, 0.15), sediment * upland * 0.38);
      albedo *= 1.0 - fault * upland * 0.34;
      albedo *= 0.96 + grain * 0.08;
      albedo *= 1.0 - (1.0 - smoothstep(-0.85, -0.3, height)) * upland * 0.22;

      /* Arena expuesta sólo en una fracción de crestas orientadas hacia la
         luz. Es reflectancia difusa; sigue apagándose con la cara nocturna. */
      float crest = smoothstep(0.48, 0.92, height) * upland;
      float crestFacing = smoothstep(0.015, 0.12, reliefOffset)
                        * smoothstep(0.0, 0.55, ndl);
      albedo = mix(albedo, vec3(0.49, 0.37, 0.245), crest * crestFacing * 0.38);
      float groundLuma = dot(albedo, vec3(0.2126, 0.7152, 0.0722));
      albedo = mix(vec3(groundLuma), albedo, 0.94);
      gloss = 0.018;
      specularPower = 56.0;
      specularStrength = 0.18;
      /* El aire se resuelve abajo como filo direccional. Sin halo común. */
    } else if (uKind == 2) {
      /*
        Tesseracto: grafito casi negro, metal frío y filos blanco-crema.

        ── Lo que cambia respecto de la versión anterior ────────────────────
        Aquel material era CASI TODO EMISIÓN: un canal ámbar recorriendo cada
        viga, más una jaula interior que era literalmente albedo = 0 con
        emisión pura. Encender todas las aristas por igual es, sin rodeos,
        dibujar el wireframe que la dirección artística prohíbe — y además
        salía por un atajo del final de este shader que se saltaba difuso,
        especular, relleno y contraluz. El único cuerpo del sistema que no
        obedecía a Gargantúa era justo el que tenía que ser el más raro.

        Ahora pasa por el mismo modelo de luz que todo lo demás y la forma la
        revelan highlights, intersecciones, rim y diferencias de rugosidad. Lo
        único que emite son las ranuras de tungsteno de los dos marcos
        profundos y la costura tenue de las piezas transversales. El resto es
        material. Ningún emisivo frío: este cuerpo no toca el secundario cian.

        Las UV siguen siendo las de la barra —u cruza la sección, v la
        recorre—, así que todo el detalle es procedural: ni textura que se
        pixele al acercarse ni línea que se quede en un píxel al alejarse.
      */
      float along = vUv.y;
      float across = abs(vUv.x - 0.5);

      /*
        El chaflán es lo que da SECCIÓN.

        Las barras ya llegan con el canto redondeado, así que la normal hace
        casi todo el trabajo; esto sube el pulido de los últimos milímetros del
        filo, que es donde la clave del disco deja la línea blanco-crema que
        dibuja la figura.

        Iba de 0.36 a 0.49 —un filo estrechísimo, para que no se encendiera la
        arista entera— y con las vigas nuevas se volvió en contra: una viga de
        la caja mide ahora cinco píxeles en pantalla, así que ese filo caía por
        debajo del píxel y, sin antialias, salía roto en una fila de CUENTAS a
        lo largo del canto. El mismo fallo que ya está documentado dos veces en
        este cuerpo, otra vez por la misma causa. De 0.29 a 0.5 el filo mide dos
        píxeles y vuelve a ser una línea; para que no encienda la barra entera,
        lo que baja es su fuerza, no su ancho.
      */
      // El filo integra la huella del píxel: no desaparece entre muestras
      // cuando una cara oblicua queda por debajo del píxel en el hero.
      float faceFootprint = fwidth(vUv.x);
      float pixelAcross = min(faceFootprint * 0.5, 0.25);
      float chamfer = smoothstep(0.29 - pixelAcross, 0.5 + pixelAcross, across);
      // Al no resolverse el ancho de una cara, usamos la cobertura media del
      // bisel (21 %). Así el especular no convierte vigas finas en cuentas.
      chamfer = mix(chamfer, 0.21, smoothstep(0.16, 0.48, faceFootprint));
      /*
        Grano de laminación, de frecuencia MUY baja: menos de un ciclo de lado a
        lado de la barra. A tamaño de Hero una barra mide siete píxeles, y a esa
        talla sin(across * 21) no es veta — son cuatro píxeles por ciclo, o sea
        una barra de puntos. Fue exactamente lo que salió en la primera captura.
      */
      float grain = 0.5 + 0.5 * sin(across * 7.0 + along * 1.6);

      /*
        Grafito, no gris medio: la estructura tiene que ABSORBER la luz para que
        lo poco que devuelve se lea como filo y no como superficie.

        Y el especular de la CARA baja mucho —0.3 de fuerza sobre 0.16 de
        gloss— mientras el del FILO sube. Esto es lo que arregló la primera
        versión, que salía gris claro y uniforme: con la cara devolviendo tanto
        como el canto, una barra de siete píxeles es toda highlight y el objeto
        vuelve a ser un wireframe, sólo que más gordo. Aquí la cara es casi
        negra y la línea blanco-crema del canto dibuja la figura ella sola.

        Importa más de lo normal porque a este cuerpo la luz le llega CASI DE
        FRENTE: está al otro lado de Gargantúa, así que la fuente queda entre él
        y la cámara. Sin terminador que reparta valores, todo el modelado
        depende de la diferencia entre cara y canto.
      */
      albedo = mix(
        vec3(0.015, 0.016, 0.019),
        vec3(0.04, 0.042, 0.047),
        grain * 0.5
      );
      /*
        Y el filo es CREMA CÁLIDO, no acero azulado.

        Iba en vec3(0.46, 0.472, 0.5) —más azul que rojo— y con eso el objeto
        salía gris neutro dentro de un sistema iluminado por un disco de
        acreción dorado. Un cuerpo cuyo reflejo no coincide con su fuente se lee
        como pegado encima de la escena, que es el diagnóstico que ya está
        escrito para la Ranger unas líneas más abajo. La dirección pide
        exactamente esto: grafito casi negro y bordes blanco-crema ligeramente
        cálidos.
      */
      /*
        Y EL FILO SE ENCIENDE POR ORIENTACIÓN, no por pintura.

        Subiendo el albedo del chaflán se encendían las aristas TODAS POR IGUAL
        —incluidas las que dan la espalda al disco— y eso es literalmente volver
        a dibujar el wireframe, que es lo que la dirección artística prohíbe.
        Así que el chaflán aporta poco albedo y casi todo especular: sólo brilla
        el canto cuya cara está orientada hacia Gargantúa, y el resto se queda
        en grafito. La luz vuelve a decidir qué se ve.

        El lóbulo del filo es ANCHO (potencia 20) y el de la cara estrecho (55),
        que parece al revés y no lo es: un chaflán no es una superficie pulida
        plana, es un filete que barre noventa grados de normales en un milímetro.
        Su respuesta integrada es ancha por construcción. La cara sí es plana, y
        una cara plana casi negra tiene que devolver un filete estrecho o vuelve
        a lavarse.
      */
      /* Y un degradado suave a lo ancho antes del filo: el centro de la cara
         más apagado que sus bordes. Una placa real tiene bisel, y sin este
         medio tono la cara de doce píxeles sale de un solo valor plano — que
         es lo que hacía que el conjunto se leyera como cartón recortado. */
      albedo *= 0.55 + 0.65 * across;
      /*
        EL REPARTO, que es lo que dirección pidió en números: 70-80 % de grafito
        muy oscuro, 15-20 % de highlight crema-cobre y muy poco emisivo. Antes
        el cuerpo entero flotaba en un beige uniforme y eso lo integraba con
        Gargantúa a costa de aplanarle el material: parecía naturalmente dorado
        en vez de parecer ILUMINADO por un disco dorado, que no es lo mismo.

        El grafito baja otro 35 % y el cobre del chaflán sube de saturación pero
        NO de superficie: sigue entrando por especular, así que sólo se enciende
        el canto cuya cara mira al disco. El calor pasa a ser una respuesta a la
        fuente y deja de ser el color del objeto.

        Corrección del lavado (2026-09-04): el cobre del chaflán teñía el ALBEDO
        (0.3 de mezcla) y el barrido posterior encendía las CARAS enteras, así
        que cara + canto devolvían calor a la vez y el objeto salía beige. El
        cobre baja a 0.22 de mezcla y toda la luz cálida de superficie se mueve
        al especular orientado: la cara se queda en grafito salvo que su normal
        mire al disco.
      */
      albedo = mix(albedo, vec3(0.31, 0.33, 0.35), chamfer * 0.10);
      gloss = mix(0.035, 0.72, chamfer);
      specularPower = mix(68.0, 18.0, chamfer);
      /*
        0.9, no 1.7. Con 1.7 TODOS los cantos que miraban al disco reventaban a
        la vez y el objeto dibujaba su wireframe completo en crema: a este
        cuerpo la luz le llega casi de frente, así que sin estrechar el filo
        toda barra devuelve lo mismo. Estrecho y contenido, el canto que mira a
        Gargantúa llega a crema y el resto se queda en grafito.

        Y baja otra vez, de 0.46 a 0.40, al separar la caja exterior de los
        marcos: este ramo es ahora SÓLO el exterior, y la dirección lo quiere
        casi a oscuras. Los marcos de dentro suben hasta 0.95 en su propio
        ramo, así que la diferencia entre fuera y dentro es de más del doble —
        que es lo que hace legibles las capas a 55 px.
      */
      specularStrength = 0.022 + chamfer * 0.17;

      /*
        OCLUSIÓN DE CAVIDAD, analítica.

        La escena no tiene sombras proyectadas, y a ningún otro cuerpo le hacen
        falta: una esfera y un casco convexo se explican con su terminador. Este
        no. Es una estructura hueca —una caja de vigas con tres marcos dentro— y
        además le llega la luz casi de frente, así que sin nada más TODAS sus
        caras devuelven lo mismo y el conjunto se lee como un anillo de cartón
        gris. Es lo que salió en las tres primeras capturas.

        Lo que falta es saber qué caras miran al hueco. Y eso sí es barato: el
        producto escalar de la normal con la dirección radial del propio punto.
        Positivo hacia fuera, negativo hacia dentro. Las caras que miran al eje
        ven menos cielo y menos disco, así que se apagan; las de fuera se quedan
        como están. Ni un shadow map, ni una muestra de ruido, y aparece la
        profundidad del túnel.
      */
      float cavity = clamp(-dot(normalize(vNormalL), normalize(vLocal)), 0.0, 1.0);
      // El interior recoge más rebote del mismo disco. Conserva sus escalones
      // de material incluso con emisión y bloom a cero.
      float innerFrame = step(1.5, vSurfaceMask) * (1.0 - step(4.5, vSurfaceMask));
      materialOcclusion = 1.0 - cavity * mix(0.86, 0.60, innerFrame);

      /*
        DOS COSAS QUE SÓLO EXISTEN EN ESTE CUERPO, y las dos van aquí porque las
        usan los tres escalones de dentro.

        ── El sesgo hacia el vacío ─────────────────────────────────────────────
        La cavidad ya sabe qué caras miran al eje. Reutilizarlo para el calor hace
        que el tungsteno se encienda POR DENTRO de cada marco y se apague por
        fuera: el brillo deja de ser un color de la pieza y pasa a ser lo que se
        ve al asomarse. Es la diferencia entre un marco pintado de ámbar y un
        marco con algo encendido detrás.

        ── La respiración ──────────────────────────────────────────────────────
        El mismo pulso llega con retraso a cada profundidad: la caja no
        respira, el primer marco apenas, el del fondo es el que late.
        Va en el shader y no en el modelo a propósito:
        es luz, no geometría, así que no toca la silueta, no puede desalinear
        una pieza y no cuesta ni una matriz. Y como pasa por el escalado global
        de emisivos, el banco de bloom-off la apaga con todo lo demás.
      */
      float inward = 0.55 + 0.9 * cavity;
      // El calor cruza las capas con retraso: no se enciende toda la caja a la vez.
      float breath2 = 0.83 + 0.17 * sin(uTime * 0.72 + along * 2.0);
      float breath3 = 0.76 + 0.24 * sin(uTime * 0.72 - 1.4 + along * 2.0);
      float breath4 = 0.73 + 0.27 * sin(uTime * 0.72 - 2.8 + along * 2.0);

      /*
        LA JERARQUÍA LUMINOSA, que es la mitad del diseño de este cuerpo.

        La dirección la pidió en una escala: caja ~10, marco 2 ~18, marco 3 ~28,
        marco 4 ~40 y el filo del vacío ~55. No son valores literales de un
        uniform, es el orden: la luz sube hacia adentro y por eso el ojo entra.
        Al revés —o plano, que era el fallo de la versión anterior— la estructura
        entera se enciende a la vez y vuelve a salir un wireframe grueso.

        Cada escalón sube TRES cosas juntas: el grafito se aclara y se
        entibia, el filo devuelve más, y el tungsteno emite más. Con una sola de
        las tres el escalón no se ve a 55 px.

        La rampa se abrió el 2026-09-04 (0.15/0.30/0.62 → 0.12/0.36/0.95 de
        emisivo, y el filo cálido con ella). Con la caja casi de frente el
        recorrido hacia dentro pasó a ser LA lectura del objeto, y con los
        escalones anteriores los tres marcos llegaban demasiado parecidos: el
        ojo veía cuadrados concéntricos en vez de viajar. Ahora el primero es
        más sobrio que antes y el fondo bastante más caliente — la diferencia
        entre marcar la profundidad y describirla.

        ── Por qué el tungsteno es un DEGRADADO ANCHO y no una ranura ────────
        Iba como ranura de 0.05 de ancho, que es el 10 % de la cara de la barra.
        A tamaño de Hero una barra interior mide tres píxeles, así que la ranura
        medía tres décimas de píxel: en la captura no salía una línea, salía un
        RASTRO DE CUENTAS —el mismo fallo del grano de laminación que ya está
        documentado arriba, y por la misma causa—. Ahora el calor ocupa el 60 %
        central de la cara con bordes suaves: a tres píxeles es una barra que
        brilla, y al acercar la cámara sigue siendo un degradado y no un borde
        duro.
      */
      if (vSurfaceMask > 4.5) {
        /*
          EL FONDO: marco trasero y tirantes de fuga.

          Es la única máscara que ROMPE el orden de brillo, y a propósito: 0 a 4
          suben hacia adentro, y ésta se sale de la escala por abajo. Lo que
          está detrás tiene que llegar MÁS APAGADO que la caja de delante o no
          se lee como fondo, se lee como calco. Grafito casi negro, sin cobre en
          el albedo, sin emisivo y con el filo apenas encendido: sólo lo justo
          para que sus esquinas se despeguen del cielo cuando asoman por los
          lados.
        */
        albedo = mix(vec3(0.025, 0.026, 0.029), vec3(0.07, 0.069, 0.066), grain * 0.5);
        albedo *= 0.6 + 0.5 * across;
        gloss = mix(0.05, 0.5, chamfer);
        specularPower = mix(72.0, 26.0, chamfer);
        specularStrength = 0.05 + chamfer * 0.48;
      } else if (vSurfaceMask > 3.5) {
        /*
          MARCO 4 — el fondo del recorrido. Es el más pequeño y el más caliente:
          la única luz fuerte del cuerpo, y está al final. Desde el Hero se lee
          como una brasa dentro del vacío; al acercar la cámara se descubre que
          lo que brilla es una ranura embutida en una viga, no un núcleo.
        */
        albedo = mix(vec3(0.045, 0.042, 0.035), vec3(0.14, 0.125, 0.095), grain * 0.5);
        albedo *= 0.4 + 0.85 * across;
        albedo = mix(albedo, vec3(0.76, 0.65, 0.46), chamfer * 0.36);
        gloss = mix(0.1, 0.72, chamfer);
        specularPower = mix(54.0, 19.0, chamfer);
        specularStrength = 0.18 + chamfer * 1.25;

        float glow = 1.0 - smoothstep(0.1, 0.42, across);
        float run = smoothstep(0.12, 0.3, along) * (1.0 - smoothstep(0.7, 0.9, along));
        albedo = mix(albedo, vec3(0.024, 0.016, 0.011), glow * 0.5);
        float threshold = step(4.1, vSurfaceMask);
        float depthHeat = mix(0.58, 0.84, threshold);
        float depthBreath = mix(breath4, 0.78 + 0.22 * sin(uTime * 0.72 - 4.1 + along * 2.0), threshold);
        emissive = vec3(1.0, 0.67, 0.33) * glow * run * inward * depthBreath * depthHeat;
      } else if (vSurfaceMask > 2.5) {
        /*
          MARCO 3 y la viga imposible. Escalón intermedio: grafito ya tibio y
          media ranura. La viga que entra por detrás y sale por delante comparte
          este acabado a propósito — así sus dos tramos se reconocen como LA
          MISMA pieza, que es lo que hace que la discontinuidad duela.
        */
        albedo = mix(vec3(0.03, 0.026, 0.021), vec3(0.08, 0.07, 0.056), grain * 0.5);
        albedo *= 0.45 + 0.8 * across;
        albedo = mix(albedo, vec3(0.64, 0.56, 0.42), chamfer * 0.29);
        gloss = mix(0.08, 0.66, chamfer);
        specularPower = mix(56.0, 20.0, chamfer);
        specularStrength = 0.14 + chamfer * 0.98;

        float glow = 1.0 - smoothstep(0.1, 0.4, across);
        float run = smoothstep(0.16, 0.34, along) * (1.0 - smoothstep(0.66, 0.86, along));
        albedo = mix(albedo, vec3(0.02, 0.016, 0.012), glow * 0.5);
        emissive = vec3(1.0, 0.55, 0.23) * glow * run * inward * breath3 * 0.36;
      } else if (vSurfaceMask > 1.5) {
        /*
          MARCO 2 — el primer paso hacia dentro. Apenas se separa de la caja:
          un grafito un punto más claro y una costura ámbar corta. Si aquí ya
          hubiera brasa, el recorrido se acabaría en el primer escalón.
        */
        albedo = mix(vec3(0.023, 0.022, 0.023), vec3(0.06, 0.058, 0.058), grain * 0.5);
        albedo *= 0.5 + 0.72 * across;
        albedo = mix(albedo, vec3(0.5, 0.44, 0.34), chamfer * 0.14);
        gloss = mix(0.065, 0.58, chamfer);
        specularPower = mix(60.0, 22.0, chamfer);
        specularStrength = 0.1 + chamfer * 0.74;

        float glow = 1.0 - smoothstep(0.12, 0.4, across);
        float run = smoothstep(0.22, 0.4, along) * (1.0 - smoothstep(0.6, 0.8, along));
        albedo = mix(albedo, vec3(0.016, 0.016, 0.018), glow * 0.5);
        emissive = vec3(1.0, 0.58, 0.26) * glow * run * inward * breath2 * 0.12;
      } else if (vSurfaceMask > 0.5) {
        /*
          Nodos. Acero pulido y facetado: las piezas que devuelven un destello
          duro del disco, y ese destello es lo que convierte el objeto en algo
          construido en vez de dibujado. Son el ÚNICO brillo del exterior, que
          por lo demás no emite nada: la dirección pide la caja casi a oscuras y
          la luz concentrada dentro.
        */
        albedo = vec3(0.06, 0.064, 0.074);
        gloss = 0.95;
        specularPower = 30.0;
        specularStrength = 1.35;
      }
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
      albedo = mix(vec3(0.10, 0.115, 0.135), vec3(0.34, 0.345, 0.33), blanket);
      albedo = mix(albedo, vec3(0.68, 0.46, 0.26), warmFoil * 0.26);
      /* La costura pesaba 0.68 y dibujaba una rejilla casi negra sobre cada
         cara: a tamaño de Hero la nave parecía forrada de azulejos. Una manta
         térmica real tiene juntas, pero no son surcos —van cosidas, no
         mecanizadas— y a esta distancia valen un cuarto de lo que valían. */
      albedo = mix(albedo, vec3(0.12, 0.13, 0.145), seam * 0.34);
      albedo *= 0.9 + macroVariation * 0.17;
      gloss = mix(0.27, 0.10, microRoughness);
      specularPower = 76.0;
      specularStrength = 0.52;

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
        float ribs = smoothstep(0.28, 0.5, abs(fract(vUv.x * 13.0) - 0.5));
        albedo = mix(vec3(0.052, 0.062, 0.079), vec3(0.2, 0.225, 0.255), ribs);
        gloss = 0.28 + ribs * 0.3;
        specularPower = 44.0;
        specularStrength = 0.58;
      } else if (vSurfaceMask > 1.5) {
        albedo = mix(vec3(0.11, 0.14, 0.17), vec3(0.49, 0.54, 0.58), blanket * 0.55);
        albedo = mix(albedo, vec3(0.04, 0.055, 0.07), seam * 0.72);
        gloss = 0.46;
        specularPower = 58.0;
      } else if (vSurfaceMask > 0.5) {
        /* Módulos principales: manta más clara y reflectante. La repetición
           cada 90° crea jerarquía sin sumar colores ni paneles aleatorios. */
        /* Aluminio marfil: baja de 0.72 a 0.49 para que el difuso conserve
           material y sólo los reflejos localizados alcancen valores altos. */
        albedo = mix(vec3(0.12, 0.135, 0.15), vec3(0.49, 0.475, 0.435), blanket);
        albedo = mix(albedo, vec3(0.13, 0.14, 0.155), seam * 0.3);
        gloss = mix(0.32, 0.14, microRoughness);
        specularPower = 92.0;
      }
      /* Oclusión de los recesos entre rieles: sólo las caras que miran hacia
         el interior del aro. Las tapas exteriores conservan su luz directa. */
      vec3 radialNormal = vec3(vLocal.xy, 0.0) / max(length(vLocal.xy), 0.001);
      float inward = max(-dot(normalize(vNormalL), radialNormal), 0.0);
      float railCavity = (1.0 - smoothstep(0.10, 0.27, abs(vLocal.z)))
                       * smoothstep(0.35, 0.70, length(vLocal.xy));
      materialOcclusion = 1.0 - inward * railCavity * 0.78;
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
      albedo = mix(vec3(0.425, 0.432, 0.438), vec3(0.9, 0.9, 0.895), blanket);
      albedo = mix(albedo, vec3(0.74, 0.61, 0.43), warmFoil * 0.22);
      albedo = mix(albedo, vec3(0.098, 0.101, 0.108), seam * 0.62);
      gloss = mix(0.74, 0.26, microRoughness);
      specularPower = 62.0;
      specularStrength = 1.05;

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
        float chordwise = smoothstep(0.42, 0.5, abs(fract(vUv.y * 4.0) - 0.5));
        albedo = mix(vec3(0.362, 0.368, 0.372), vec3(0.8, 0.802, 0.798), 0.3 + smoothPlate * 0.45);
        albedo = mix(albedo, vec3(0.112, 0.118, 0.126), chordwise * 0.5);
        gloss = mix(0.5, 0.2, microRoughness);
        specularPower = 46.0;
        specularStrength = 0.82;
      } else if (vSurfaceMask > 1.5) {
        /* Tapa de servicio. Bajó de saturación: en naranja pleno eran lo
           primero que se veía de la nave, por delante de la proa. */
        albedo = mix(vec3(0.17, 0.075, 0.03), vec3(0.56, 0.28, 0.09), smoothPlate);
        gloss = 0.31;
        specularPower = 38.0;
      } else if (vSurfaceMask > 0.5) {
        /* Cristal polarizado: casi negro, con suficiente azul para recuperar
           volumen cuando el barrido especular cruza la cabina. */
        albedo = vec3(0.018, 0.055, 0.075);
        gloss = 0.96;
        specularPower = 96.0;
        specularStrength = 1.22;
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
      float pulse = 0.94 + 0.06 * sin(uTime * 0.55);
      albedo = vec3(0.0);
      float glow = 2.75 + uFocus * 0.55;
      emissive = uAccent * glow * pulse;
      gloss = 0.0;
    }

    /*
      Y aquí, en un solo sitio, pasa TODO lo que emite luz propia.

      El banco de pruebas del contrato visual necesita poder apagar los emisivos
      para comprobar que un cuerpo conserva silueta, volumen y material sin
      ellos. Escalarlos aquí —después de que cada material haya escrito el suyo
      y antes de que nadie los use— garantiza que no queda ninguno fuera: ni el
      canal del Tesseracto, ni las balizas, ni el rebote de los anillos.
    */
    emissive *= uEmission;

    /*
      Las balizas salen por aquí y no tocan nada más: son luces, no superficies.

      El Tesseracto SALÍA TAMBIÉN, y ése era el fallo de fondo de su versión
      anterior. El atajo se escribió cuando su malla eran aristas (EdgesGeometry)
      sin atributo de normal, donde el difuso habría salido NaN. Desde que tiene
      estructura de verdad, el atajo dejó de tener motivo y se quedó: el único
      cuerpo del sistema que no obedecía a Gargantúa era justo el que la
      dirección artística quiere más raro, y «raro» no es «ajeno a la luz».

      Ahora pasa por el mismo terminador, el mismo relleno de cielo, el mismo
      contraluz frío y el mismo especular que los otros seis. La misma luz toca
      materiales diferentes: es la regla del contrato visual, y no admite una
      excepción para el cuerpo que más falta le hace.
    */
    if (uKind == 8) {
      gl_FragColor = vec4(emissive + uNavigation * uFocus * 0.75, 1.0);
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
    /* Roca mate: la pendiente y la incidencia conservan dirección en todo el
       hemisferio diurno, sin una meseta de brillo al saturarse day. */
    if (uKind == 1) diffuse = day * limb * (0.12 + 0.88 * max(shadedNdl, 0.0));
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

      Endurance conserva un suelo frío de 0.42. La oclusión analítica oscurece
      sus cavidades de forma independiente de las superficies exteriores.
    */
    float nightFloor = 0.5;
    if (uKind == 1) nightFloor = 0.28;
    if (uKind == 4) nightFloor = 0.42;
    if (uKind == 5) nightFloor = 0.44;
    if (uKind == 2 || uKind == 7) nightFloor = 0.4;
    float nightFill = mix(nightFloor, 1.0, day);
    /* El Tesseracto no hereda el tinte azul del cielo. Su sombra conserva una
       reflexión neutra-cálida de acero ennegrecido; toda temperatura visible
       procede del mismo disco ámbar que ilumina el resto del sistema. */
    vec3 materialFill = uKind == 2 ? vec3(0.024, 0.022, 0.019) : fill;
    vec3 color = albedo * (
      key * diffuse * materialOcclusion + materialFill * nightFill
    );
    if (uKind == 4) color *= mix(0.38, 1.0, materialOcclusion);
    /* Edmunds conserva sólo un rebote corto en el relieve del terminador. */
    float bandFalloff = uKind == 1 ? 18.0 : 15.0;
    float terminatorBand = exp(-abs(shadedNdl - 0.055) * bandFalloff)
                         * (1.0 - day * 0.34);
    if (uKind == 0 || uKind == 1) {
      color += albedo * key * terminatorBand * (uKind == 1 ? 0.055 : 0.09);
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
      /* Tres anchos del MISMO lóbulo, no tres efectos. El asiento es lo que
         impide que el camino de luz se lea como un arañazo pegado encima: una
         banda ancha y muy tenue, anisótropa también, que dice que ahí abajo
         sigue habiendo agua. Es el término que en la versión anterior valía
         0.26 con lóbulo isótropo, y por eso salía mancha. */
      float oceanSeat = exp(-(alongOff2 * 1.7 + acrossOff2 * 22.0)) * gloss * day;
      float oceanSheet = exp(-(alongOff2 * 7.5 + acrossOff2 * 265.0))
                       * gloss * day;
      float oceanGlint = exp(-(alongOff2 * 26.0 + acrossOff2 * 520.0))
                       * millerGlitterMask * day;
      /* El asiento va PICADO POR LAS BANDAS. Una lámina de reflejo continua
         sobre todo el hemisferio es exactamente lo que hace que un océano se
         lea como gas: sin corrientes que la corten, no hay superficie. */
      color += mix(key, vec3(0.34, 0.56, 0.88), 0.46)
             * oceanSeat * (0.3 + millerBands * 1.2) * 0.08;
      color += mix(key, vec3(0.42, 0.62, 0.92), 0.34) * oceanSheet * 0.30;
      color += mix(vec3(1.0, 0.92, 0.78), vec3(0.66, 0.86, 1.0), 0.3)
             * oceanGlint * 0.42;

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
      float airEdge = pow(1.0 - max(dot(normal, view), 0.0), 8.0)
                    * (0.82 + millerWeather * 0.36);
      float airLit = smoothstep(0.28, 0.9, ndl);
      float airFacing = smoothstep(0.5, 1.0, ndl);
      color += mix(vec3(0.3, 0.6, 1.0), vec3(0.88, 0.95, 1.0), airFacing)
             * airEdge * airLit * uLightIntensity * 2.15;
      color += key * airEdge * airFacing * 0.54;
    }

    /* Aire fino: sólo el arco encarado al disco, sin blanco ni halo uniforme.
       El rebote cálido queda pegado al terminador y conserva el terreno. */
    if (uKind == 1) {
      float limbArc = pow(1.0 - max(dot(normal, view), 0.0), 11.0);
      float airLit = smoothstep(0.18, 0.90, ndl);
      color += vec3(0.56, 0.43, 0.29) * limbArc * airLit * uLightIntensity * 0.55;
      color += albedo * key
             * exp(-abs(shadedNdl + 0.06) * 19.0) * (1.0 - day) * 0.07;
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
    vec3 backRimColor = uKind == 2
      ? vec3(0.052, 0.047, 0.04)
      : vec3(0.062, 0.086, 0.152);
    color += backRimColor * backRim * (uKind == 1 ? 0.24 : 0.55);

    /*
      Metales: una segunda reflexión, ancha y fría.

      El disco es una fuente ENORME, así que un casco metálico no devuelve sólo
      el filete especular estrecho: devuelve también una lámina suave que barre
      la superficie según gira. Sin ella, una nave metálica girando se ve como
      una silueta gris rotando —el giro no tiene nada a lo que agarrarse— y ése
      era justo el motivo de que la Endurance pareciera la única viva.

      El Tesseracto se quedó FUERA, y se probó dentro. Su barrido usa potencia
      6, que es una lámina angularmente enorme: sobre una barra de siete píxeles
      no barre nada, la enciende entera. La primera captura con él dentro salía
      gris claro y uniforme —justo el wireframe grueso que se quería evitar— y
      su microtransformación se percibe igual de bien por el filo especular
      estrecho, que sí recorre los cantos al moverse las piezas.
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
        color += albedo * vec3(0.006, 0.007, 0.009) * materialOcclusion;
        color += key * pow(specBase, 22.0) * gloss * day * 0.12 * materialOcclusion;
        color += vec3(0.11, 0.15, 0.23) * coldRim * 0.16;
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
      color += key * fresnel * wrap * 0.62;
      color += vec3(1.0, 0.72, 0.42) * pow(fresnel, 1.5) * wrap * 0.3;
      // Y el relleno del cielo por el lado opuesto, para que la sombra tenga
      // materia en vez de ser un recorte negro.
      color += albedo * vec3(0.05, 0.062, 0.094);
    }

    /*
      Barrido del Tesseracto: la reflexión ancha del disco, pero CERRADA.

      Los cascos usan potencia 6, que sobre una barra de doce píxeles no barre
      nada — la enciende entera. A potencia 22 la lámina recorre los cantos
      según las piezas interiores se mueven, y ésa es la única forma de que una
      microtransformación de tres grados se note en pantalla sin acelerarla.
    */
    if (uKind == 2) {
      /*
        El barrido lleva un SUELO de gloss bajo (0.04): sólo evita que la cara
        orientada quede muerta. La fuerza baja a 0.25 porque ahora el contraste
        lo pone la diferencia entre barras —cada marco lleva su propia
        inclinación fuera del plano, así que la luz ya no las encuentra a todas
        a la vez— y no el brillo absoluto.
      */
      float sweep = pow(specBase, 24.0)
                  * (0.04 + gloss * 0.96)
                  * day
                  * materialOcclusion;
      /*
        Y el barrido TAMBIÉN escalona. Con un solo factor para todo el cuerpo,
        la caja devolvía tanta reflexión ancha como los marcos de dentro y la
        jerarquía se aplanaba justo en el término que más superficie toca. La
        capa de fondo casi no participa, la caja poco, y los tres marcos
        interiores el doble: la separación entre fuera y dentro deja de
        depender sólo del emisivo.
      */
      float sweepGain = vSurfaceMask > 4.5
        ? 0.14
        : (vSurfaceMask > 1.5 ? 0.32 : 0.15);
      color += mix(key, vec3(0.92, 0.88, 0.8), 0.2) * sweep * sweepGain;
    }

    /* Borde encendido por el disco, para todo lo demás: es lo que separa al
       cuerpo del fondo negro sin dibujarle un contorno. */
    float warmRim = fresnel * smoothstep(-0.25, 0.42, ndl);
    if (uKind == 1) warmRim *= 0.12 * smoothstep(0.18, 0.86, ndl);
    if (uKind == 4) warmRim *= materialOcclusion;
    /*
      El Tesseracto paga un tercio del rim común. Es grafito casi negro con la
      luz casi de frente: el fresnel ya levanta sus cantos por especular, y el
      0.18 genérico le ponía una segunda línea crema ENCIMA — borde sobre borde
      — que a escala de Hero se comía la diferencia entre cara y filo y
      devolvía el marco beige. A 0.06 el cuerpo se sigue separando del negro
      pero el filo lo dibuja el material, no el contorno.
    */
    /*
      Y el filo del Tesseracto se reparte igual que el barrido. El tercio del
      rim común valía cuando todo el cuerpo era una sola familia de material;
      con cinco, un valor único volvía a igualar el fondo con el centro. El
      marco trasero casi no lo paga —tiene que quedarse en penumbra—, la caja
      paga poco, y los marcos interiores el triple: es lo que les da el canto
      encendido que los separa entre sí a 55 px.
    */
    float tesseractRim = vSurfaceMask > 4.5
      ? 0.075
      : (vSurfaceMask > 1.5 ? 0.115 : 0.045);
    color += key * warmRim * (uKind == 2 ? tesseractRim : 0.18);
    /*
      Y el relleno de canto tampoco es igual para todos dentro del Tesseracto.
      Este término levanta el borde de CUALQUIER pieza mire donde mire, así que
      es el que más trabajaba en contra del marco trasero: por muy negro que sea
      su albedo, un canto levantado por igual lo devolvía al mismo plano que la
      caja de delante y el fondo dejaba de leerse como fondo.
    */
    float fillRim = uKind == 2 && vSurfaceMask > 4.5 ? 0.26 : 0.32;
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
    vec3 focusColor = uKind == 2 ? vec3(1.0, 0.64, 0.34) : uNavigation;
    color += focusColor * uFocus * (0.032 + fresnel * 0.44);

    gl_FragColor = vec4(color, outputAlpha);
  }
`;

const NAVIGATION_COLOUR = "#7fe5ff";
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
  const size = 128;
  const blanketed = kind === "endurance";
  // Celda pequeña = panel pequeño. La manta se acolcha cada 16 px; la chapa de
  // la Ranger va en paneles de 32 px porque su UV cubre el ala entera.
  const cell = blanketed ? 24 : 32;
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
      // Costura: dura en la chapa, apenas insinuada en la manta.
      const seam = blanketed
        ? edgeDistance < 1
          ? 0.34
          : edgeDistance < 1.8
            ? 0.13
            : 0
        : edgeDistance < 1.2
          ? 1
          : edgeDistance < 2.4
            ? 0.45
            : 0;
      // Remaches: sólo la Ranger, y sólo sobre la junta. Es el detalle que
      // convierte un plano liso en una pieza fabricada.
      const rivet =
        !blanketed && edgeDistance < 2.6 && (x + y) % 8 === 0 ? 0.55 : 0;
      const quilt = blanketed
        ? 0.5 + 0.5 * Math.sin((x / size) * Math.PI * 34 + Math.sin((y / size) * 21))
        : 0.5 + 0.5 * Math.sin((x / size) * Math.PI * 12);

      const blanket = clamp01(
        blanketed
          ? // Manta clara y CASI uniforme: ±0.05 entre paneles vecinos, no ±0.2.
            0.84 + (broad - 0.5) * 0.1 + (grain - 0.5) * 0.055 - seam * 0.3
          : 0.6 + (broad - 0.5) * 0.16 + (grain - 0.5) * 0.07 - seam * 0.4 + rivet * 0.3,
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
          : 0.3 + grain * 0.24 + quilt * 0.1 - rivet * 0.2,
      );

      data[offset] = Math.round(blanket * 255);
      data[offset + 1] = Math.round(warmth * 255);
      data[offset + 2] = Math.round(Math.max(seam, rivet) * 255);
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

/** RoundedBox sale no indexada; se normaliza para poder fusionarla con boxes. */
function roundedBox(
  width: number,
  height: number,
  depth: number,
  radius: number,
): THREE.BufferGeometry {
  const geometry = new RoundedBoxGeometry(width, height, depth, 2, radius);
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
  const lights = bodyMaterial(input, EMISSIVE_KIND, { accent: input.secondary });
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
        lightParts.push(
          placed(new THREE.SphereGeometry(0.019, 7, 5), [
            cos * (RING - 0.24),
            sin * (RING - 0.24),
            0.12,
          ]),
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

    // Baliza de brazo: una por grupo, en el vértice de la horquilla.
    lightParts.push(
      placed(new THREE.SphereGeometry(0.021, 7, 5), [
        cos * (ARM_OUTER + 0.02),
        sin * (ARM_OUTER + 0.02),
        0.075,
      ]),
    );
  }

  // Balizas del núcleo: proa y popa, para que el eje tenga principio y final.
  lightParts.push(
    placed(new THREE.SphereGeometry(0.023, 8, 6), [0, 0, 0.545]),
    placed(new THREE.SphereGeometry(0.019, 7, 5), [0.19, 0.19, -0.2]),
    placed(new THREE.SphereGeometry(0.019, 7, 5), [-0.19, -0.19, -0.2]),
  );

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
  };

  return {
    root,
    materials: [hull, structure, service, lights],
    animate(seconds) {
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

/**
 * Marco de apertura: cuatro barras en el plano XZ con un hueco rectangular.
 *
 * Es la pieza que sustituye a las doce aristas del cubo, y el cambio no es de
 * grosor sino de CLASE. Una arista es una línea: no tiene cara que orientar
 * hacia la luz, y a tamaño de Hero una retícula de aristas se lee como un icono
 * dibujado. Un marco tiene canto, cara interior y cara exterior — o sea masa,
 * hueco y dos superficies que responden distinto a la misma fuente.
 *
 * `halfX/halfZ` miden al EJE de la barra; `width` es su ancho dentro del plano y
 * `depth` su canto en el eje del túnel. Las barras nacen con la longitud en Y y
 * se rotan al colocarlas, así que conservan la convención de UV de las vigas:
 * `u` cruza la sección y `v` la recorre.
 *
 * ── Por qué caja plana y no `roundedBox` ────────────────────────────────────
 *
 * Se probó con el canto redondeado, y salió mal por donde no se esperaba. El
 * redondeo de three usa cinco segmentos por eje, así que una barra larga tiene
 * cinco facetas por filo; con el especular estrecho que pide este material, cada
 * faceta devuelve su propio destello y el resultado en pantalla es una fila de
 * cuentas a lo largo del canto. Se ve en la captura y se ve muy claro: la barra
 * deja de ser metal y pasa a ser un cordón de bolitas.
 *
 * El chaflán del shader hace el mismo trabajo sobre las mismas UV, es un
 * degradado continuo que no puede facetarse, y cuesta 24 vértices por barra en
 * vez de 200.
 */
function apertureFrame(
  halfX: number,
  halfZ: number,
  width: number,
  depth: number,
  folds: readonly [number, number, number, number] = [0, 0, 0, 0],
  widths: readonly [number, number, number, number] = [1, 1, 1, 1],
  /*
    Lados presentes: [z=+halfZ, z=−halfZ, x=+halfX, x=−halfX]. Un marco con un lado
    ausente deja de ser un túnel cuadrado y pasa a ser arquitectura abierta: el
    ojo no puede cerrarlo como un prisma.
  */
  present: readonly [boolean, boolean, boolean, boolean] = [
    true,
    true,
    true,
    true,
  ],
  spans: readonly [number, number, number, number] = [1, 1, 1, 1],
  offsets: readonly [number, number, number, number] = [0, 0, 0, 0],
): THREE.BufferGeometry[] {
  // El solape del canto cierra las esquinas sin una pieza extra. Los spans y
  // offsets permiten que una barra sobrepase una esquina y muera antes de la
  // opuesta: un marco sigue siendo reconocible sin cerrar un rectángulo ideal.
  const spanX = halfX * 2 + width;
  const spanZ = halfZ * 2 + width;
  // El alabeo va sobre el eje LARGO de la barra y antes de colocarla: gira su
  // sección sin moverla de sitio.
  const roll = (geometry: THREE.BufferGeometry, angle: number) =>
    placed(geometry, [0, 0, 0], [0, angle, 0]);
  // Cada barra puede ensancharse por su cuenta: la silueta deja de ser un
  // diamante de cuatro lados iguales sin dejar de ser una placa con un agujero.
  // El eje escalado es el ANCHO dentro del plano en cada grupo (Z en las que
  // corren en X, X en las que corren en Z); el canto del túnel no se toca.
  const widenInPlaneX = (base: THREE.BufferGeometry, scale: number) =>
    scale === 1 ? base : base.scale(1, 1, scale);
  const widenInPlaneZ = (base: THREE.BufferGeometry, scale: number) =>
    scale === 1 ? base : base.scale(scale, 1, 1);
  const bars = [
    // Las dos barras que corren en X, a z = ±half.
    ...([halfZ, -halfZ] as const).map((z, index) =>
      placed(
        roll(
          widenInPlaneX(
            new THREE.BoxGeometry(depth, spanX * spans[index], width),
            widths[index],
          ),
          folds[index],
        ),
        [offsets[index], 0, z],
        [0, 0, Math.PI / 2],
      ),
    ),
    // Y las dos que corren en Z, a x = ±half.
    ...([halfX, -halfX] as const).map((x, index) =>
      placed(
        roll(
          widenInPlaneZ(
            new THREE.BoxGeometry(width, spanZ * spans[index + 2], depth),
            widths[index + 2],
          ),
          folds[index + 2],
        ),
        [x, 0, offsets[index + 2]],
        [Math.PI / 2, 0, 0],
      ),
    ),
  ];
  return bars.filter((_, index) => present[index]);
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

/** Nodo facetado. Indexado a mano: `OctahedronGeometry` no lo está y no fusiona. */
function latticeNode(radius: number): THREE.BufferGeometry {
  const geometry = new THREE.OctahedronGeometry(radius, 0);
  const indexed = mergeVertices(geometry);
  geometry.dispose();
  return indexed;
}

/** Los cuatro cuadrantes de un plano: (+,+), (+,−), (−,+), (−,−). */
const BOX_QUADRANTS = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const;

/**
 * Caja de vigas: hasta doce aristas de sección cuadrada, cada una opcional.
 *
 * Es la pieza que da la SILUETA del Tesseracto, y la razón de que exista está
 * en el fallo de la versión anterior: siete marcos apilados a lo largo de un
 * eje no dibujan un volumen, dibujan una diana. Desde el Hero —55 px— eso se
 * leía como un manojo de líneas cruzadas y no como una arquitectura.
 *
 * Una caja de aristas gruesas, en cambio, se reconoce entera de un vistazo:
 * ancho, alto y fondo a la vez. Es la lectura simple que la dirección pide
 * FUERA, para poder poner la complejidad DENTRO.
 *
 * Orden de las aristas, que es el de `present`:
 *
 *   0-3    a lo largo de X, en (y, z) = (+,+) (+,−) (−,+) (−,−)
 *   4-7    a lo largo de Y, en (x, z) = (+,+) (+,−) (−,+) (−,−)
 *   8-11   a lo largo de Z, en (x, y) = (+,+) (+,−) (−,+) (−,−)
 *
 * La longitud lleva un `section` de más para que las esquinas cierren por
 * solape, sin una pieza de nudo por vértice.
 */
function boxFrame(
  half: VectorTuple,
  section: number,
  present: readonly boolean[],
): THREE.BufferGeometry[] {
  const [hx, hy, hz] = half;
  const edges: THREE.BufferGeometry[] = [];
  for (const [a, b] of BOX_QUADRANTS) {
    edges.push(
      placed(
        beam(section, hx * 2 + section),
        [0, a * hy, b * hz],
        [0, 0, Math.PI / 2],
      ),
    );
  }
  for (const [a, b] of BOX_QUADRANTS) {
    edges.push(placed(beam(section, hy * 2 + section), [a * hx, 0, b * hz]));
  }
  for (const [a, b] of BOX_QUADRANTS) {
    edges.push(
      placed(
        beam(section, hz * 2 + section),
        [a * hx, b * hy, 0],
        [Math.PI / 2, 0, 0],
      ),
    );
  }
  return edges.filter((_, index) => present[index]);
}

/**
 * La caja exterior y su inclinación respecto del eje de la recursión.
 *
 * ── Por qué la caja va TORCIDA contra el túnel ──────────────────────────────
 *
 * Son dos requisitos que se pelean. La recursión sólo se lee si sus marcos
 * llegan casi de frente a la cámara —de canto se convierten en cuatro rayas—,
 * y un volumen sólo se lee si NO llega de frente: una caja vista por su cara
 * es un cuadrado.
 *
 * La solución es no compartir eje. El túnel apunta casi a la cámara, así que
 * la caída de marcos se ve enfilada; la caja va girada contra él, así que
 * enseña tres caras. De paso, el desencaje ES la primera rareza del objeto: el
 * espacio de dentro no está alineado con la caja que lo contiene.
 *
 * ── Cuánto de torcida: 15° de yaw y 9° de pitch (2026-09-04) ────────────────
 *
 * Hubo una versión a 39° que buscaba fuga: con la cara trasera a diecisiete
 * píxeles de la delantera, el volumen se leía sin discusión. El problema es que
 * a esos grados la caja llegaba a 33° del eje de vista y tapaba lo que este
 * objeto tiene que enseñar. Dirección lo dijo así:
 *
 *   Está enseñando demasiado el lateral. La silueta es menos reconocible, el
 *   vacío central no se lee, las capas interiores se amontonan y parece un
 *   objeto que pasa por ahí en vez de un destino.
 *
 * Y el objeto se rediseñó justo para que se leyeran el marco exterior, los
 * marcos interiores y la progresión hacia el vacío. De canto se esconde
 * exactamente aquello que lo caracteriza.
 *
 * La primera corrección se fue a 17.5° y ahí apareció el otro extremo: a esa
 * escala el objeto empezaba a leerse como un SÍMBOLO de cuadrados concéntricos
 * en vez de como un objeto dimensional. Tres grados y medio bastan para
 * devolver la fuga sin volver a esconder el interior, así que la cara queda a
 * 20.9° del eje de vista —yaw 18.8°, pitch 10.0°— con las aristas a 10° de la
 * escuadra. Frontal para entender la estructura de un vistazo; torcida para
 * conservar volumen. Ni 33°, que lo escondía, ni 17°, que lo aplanaba.
 *
 * No son tres números sueltos: se resolvieron invirtiendo la cadena
 * `orientación de reposo → roll → inclinación` contra la dirección real de la
 * cámara al cuerpo. Cambiar la fase del Tesseracto obliga a rehacer ese cálculo.
 */
const TESSERACT_BOX_HALF: VectorTuple = [1.02, 0.23, 0.95];
const TESSERACT_BOX_SECTION = 0.155;
const TESSERACT_BOX_TILT: VectorTuple = [0.251, 0.053, 0.417];
/*
  Y un giro final SOBRE EL EJE DEL TÚNEL, que es casi el eje de vista: o sea, un
  giro en el plano de la pantalla. Va aparte y va el último porque hace un
  trabajo distinto del de la inclinación, y mezclarlos en un Euler los vuelve
  imposibles de ajustar por separado.

  Es el mando de la ESCUADRA. Con la caja de canto hacía falta mucho (0.55 rad)
  para sacarla del rombo; ahora que llega casi de frente, el mismo giro la
  volvería a ladear, así que baja a −0.09 y las aristas quedan a 10° de la
  horizontal. Diez, y no cero, por lo de siempre: una caja perfectamente a
  escuadra deja de parecer una caja y parece un icono.
*/
const TESSERACT_BOX_ROLL = -0.09;

/** Un punto del espacio de la caja, llevado al espacio del túnel. */
function boxPoint(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x, y, z)
    .applyEuler(new THREE.Euler(...TESSERACT_BOX_TILT))
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), TESSERACT_BOX_ROLL);
}

/**
 * Cuatro marcos en progresión geométrica: 0.68 → 0.50 → 0.345 → 0.225.
 * El último añade profundidad a tamaño de hero sin tapar el hueco. Sus giros,
 * inclinaciones y desplazamientos alternos desencajan el túnel de la caja.
 */
interface TesseractRing {
  halfX: number;
  halfZ: number;
  y: number;
  twist: number;
  width: number;
  depth: number;
  shift: readonly [number, number];
  tilt: readonly [number, number];
  widths: readonly [number, number, number, number];
}

const TESSERACT_RINGS = [
  {
    halfX: 0.68,
    halfZ: 0.625,
    y: 0.1,
    twist: (10 * Math.PI) / 180,
    width: 0.092,
    depth: 0.09,
    shift: [0.025, -0.018],
    tilt: [-0.04, 0.035],
    widths: [1.06, 0.95, 1.03, 0.97],
  },
  {
    halfX: 0.5,
    halfZ: 0.455,
    y: -0.25,
    twist: (-8 * Math.PI) / 180,
    width: 0.08,
    depth: 0.078,
    shift: [-0.032, 0.024],
    tilt: [0.045, -0.038],
    widths: [0.96, 1.07, 0.98, 1.04],
  },
  {
    halfX: 0.345,
    halfZ: 0.31,
    y: -0.55,
    twist: (13 * Math.PI) / 180,
    width: 0.07,
    depth: 0.068,
    shift: [0.022, 0.028],
    tilt: [-0.035, 0.06],
    widths: [1.04, 0.97, 1.06, 0.95],
  },
  {
    halfX: 0.225,
    halfZ: 0.205,
    y: -0.86,
    twist: (-7 * Math.PI) / 180,
    width: 0.052,
    depth: 0.055,
    shift: [-0.006, 0.014],
    tilt: [0.025, -0.025],
    widths: [1.02, 0.97, 1.03, 0.98],
  },
] as const satisfies readonly TesseractRing[];

/**
 * La espalda pertenece a la misma caja que el frente. Sus cuatro lados y
 * cuatro tirantes cierran el volumen; la arista imposible sigue en el frente.
 * El desfase en profundidad se ve por los laterales, no por otro rectángulo
 * girado que compita con la recursión.
 */
const TESSERACT_BACK_Y = -0.38;

/**
 * Las cuatro esquinas de un marco, con su giro, inclinación y desplazamiento.
 *
 * Existe porque los puentes entre capas van de una esquina concreta a otra
 * esquina concreta, y esa cuenta escrita a mano se equivoca siempre: hay que
 * componer el mismo Euler que usa la colocación del marco o el puente aterriza
 * en el aire.
 */
function ringCorners(ring: TesseractRing): THREE.Vector3[] {
  const orientation = new THREE.Euler(ring.tilt[0], ring.twist, ring.tilt[1]);
  return ([
    [1, 1],
    [1, -1],
    [-1, -1],
    [-1, 1],
  ] as const).map(([sx, sz]) =>
    new THREE.Vector3(sx * ring.halfX, 0, sz * ring.halfZ)
      .applyEuler(orientation)
      .add(new THREE.Vector3(ring.shift[0], ring.y, ring.shift[1])),
  );
}

/**
 * Tesseracto: arquitectura de grafito con un túnel que se repliega hacia dentro.
 *
 * El frente interrumpido, la espalda completa y cuatro tirantes comparten
 * esquinas. Dos paneles laterales dan espesor visible sin tapar el túnel.
 * La referencia del dueño pide volumen construido y profundidad: la espalda
 * ya no es un rectángulo independiente tan oscuro que parezca inexistente.
 *
 * Cuatro marcos interiores disminuyen de tamaño y alternan orientación; el
 * calor aumenta hacia el fondo. La cáscara permanece fija, y sólo los tres
 * grupos interiores derivan. Se conservan la arista desplazada, el puente
 * inconcluso y el nodo huérfano como contradicciones legibles.
 *
 * Cuatro draws, un material opaco, sin texturas ni cambios de cámara o posición.
 */
function tesseractModel(input: SceneBodyInput): BodyModel {
  /*
    Un solo material opaco para todo el cuerpo: el grafito, el filo cálido, la
    oclusión de cavidad y las ranuras de tungsteno salen del mismo shader con
    la máscara de superficie. Sin transparencias, sin segundo material.
  */
  const structure = bodyMaterial(input, KIND.tesseract);
  const root = new THREE.Object3D();

  const [ring2, ring3, ring4, ring5] = TESSERACT_RINGS;
  const [corners2, corners3, corners4] = TESSERACT_RINGS.map(ringCorners);

  /** Una pieza de la caja, llevada del espacio de la caja al del túnel. */
  const tilted = (geometry: THREE.BufferGeometry): THREE.BufferGeometry =>
    placed(
      placed(geometry, [0, 0, 0], TESSERACT_BOX_TILT),
      [0, 0, 0],
      [0, TESSERACT_BOX_ROLL, 0],
    );

  /** Un marco de la recursión ya colocado: giro + inclinación + altura. */
  const ringAt = (ring: TesseractRing): THREE.BufferGeometry[] =>
    apertureFrame(
      ring.halfX,
      ring.halfZ,
      ring.width,
      ring.depth,
      [0, 0, 0, 0],
      ring.widths,
      [true, true, true, true],
    ).map((part) =>
      placed(
        part,
        [ring.shift[0], ring.y, ring.shift[1]],
        [ring.tilt[0], ring.twist, ring.tilt[1]],
      ),
    );

  /*
    LA CÁSCARA NO SE MUEVE. Es arquitectura, y la arquitectura no tiembla: todo
    el movimiento del cuerpo vive en los tres grupos interiores. Eso también
    garantiza que la deriva ambiental no pueda destruir la silueta.
  */
  const shell = mergedMesh(
    [
      // Frente: tres lados continuos y el cuarto interrumpido más abajo.
      ...boxFrame(TESSERACT_BOX_HALF, TESSERACT_BOX_SECTION, [
        true, false, false, false,
        false, false, false, false,
        true, false, true, false,
      ]).map(tilted),
      // Marco posterior completo. Deja un hueco central y conserva las cuatro
      // esquinas que permiten leer una espalda, también en la zona izquierda.
      ...apertureFrame(1.02, 0.95, 0.135, 0.135).map((part) =>
        surfaceMasked(tilted(placed(part, [0, TESSERACT_BACK_Y, 0])), 5),
      ),
      // Cada esquina delantera llega a su esquina posterior correspondiente.
      ...BOX_QUADRANTS.map(([x, z]) => surfaceMasked(
        strut(
          boxPoint(x * 1.02, 0.23, z * 0.95),
          boxPoint(x * 1.02, TESSERACT_BACK_Y, z * 0.95),
          0.115,
        ),
        5,
      )),
      // Dos caras de metal dan espesor y superficie donde leer la luz. Son
      // laterales de la caja: ninguna placa ocupa el hueco del túnel.
      surfaceMasked(tilted(placed(
        new THREE.BoxGeometry(1.86, 0.61, 0.045),
        [0, -0.075, -0.95],
      )), 5),
      surfaceMasked(tilted(placed(
        new THREE.BoxGeometry(0.045, 0.45, 1.62),
        [-1.02, -0.095, 0.08],
      )), 5),
      /*
        LA ARISTA PARTIDA, y va en el MARCO DE DELANTE a propósito.

        Estuvo primero en una arista del fondo, que es donde no sirve de nada:
        una contradicción escondida detrás de la estructura no contradice a
        nadie. Ahora parte por la mitad una de las cuatro aristas de la cara que
        mira a la cámara. El tramo de la izquierda va donde toca; el de la
        derecha sigue a la MISMA altura pero 0.15 más adentro, con un hueco de
        otro tanto entre los dos, así que la arista se mete detrás del cuerpo y
        vuelve a salir por donde no debía.

        Los dos tramos comparten altura y dirección a propósito: con el segundo
        además bajado y girado —como estuvo un intento— dejan de leerse como UNA
        arista rota y pasan a ser dos barras paralelas, que es ruido. La
        contradicción necesita que el ojo insista en unirlas.
      */
      tilted(
        placed(
          beam(TESSERACT_BOX_SECTION, 1.04),
          [-0.56, 0.23, -0.95],
          [0, 0, Math.PI / 2],
        ),
      ),
      tilted(
        placed(
          beam(TESSERACT_BOX_SECTION, 0.96),
          [0.59, 0.23, -0.79],
          [0, 0, Math.PI / 2],
        ),
      ),
      /*
        UN PANEL, y no es decoración: es la única superficie ANCHA del cuerpo.
        Sin él todo es canto, la clave sólo devuelve filos y el objeto se lee
        como alambre por muy gruesas que sean las vigas. Un panel tiene cara: un
        valor continuo donde apoyar la lectura de material.

        Es un trozo de suelo en la esquina del fondo, y está donde está por dos
        capturas fallidas. Ocupando el fondo entero quedaba de frente a la
        cámara y tapaba exactamente el vacío —un panel claro justo donde tiene
        que haber estrellas—. Con un segundo panel de pared lateral, los dos
        engordaban el lado derecho hasta convertirlo en un haz de barras. Uno
        solo, pequeño y al fondo, se ve A TRAVÉS de la caja y cuenta a qué
        profundidad está el otro lado.
      */
      tilted(
        placed(new THREE.BoxGeometry(0.52, 0.026, 0.42), [-0.66, -0.222, -0.56]),
      ),
      /*
        DOS ESPOLONES CORTOS, asimétricos y gruesos. Salen de las CARAS y no de
        las esquinas, así que mueren dentro de la esfera que ya define la caja:
        cambian la silueta sin tocar el radio publicado ni convertir el cuerpo
        en una antena. La versión anterior tenía cinco, largos y repartidos en
        cinco direcciones — y ésa era la silueta de estrella que había que
        matar.
      */
      strut(boxPoint(0.98, 0.02, 0.16), boxPoint(1.4, 0.1, 0.06), 0.105),
      strut(boxPoint(0.24, 0.0, -0.92), boxPoint(0.34, -0.06, -1.36), 0.092),
      /*
        Nodos de acero pulido en tres esquinas de la caja, con radios distintos:
        cuatro iguales serían repetición mecánica, y la repetición mecánica es
        lo que hace que una figura se entienda de un vistazo. Son los únicos
        destellos duros del exterior — la caja no emite nada.
      */
      ...(
        [
          [boxPoint(1.02, 0.23, 0.95), 0.072],
          [boxPoint(-1.02, 0.23, 0.95), 0.056],
          [boxPoint(1.02, -0.23, -0.95), 0.048],
        ] as const
      ).map(([corner, radius]) =>
        surfaceMasked(
          placed(latticeNode(radius), [corner.x, corner.y, corner.z]),
          1,
        ),
      ),
    ],
    structure,
  );
  shell.name = "tesseract-shell";
  root.add(shell);

  /*
    LOS MARCOS MEDIOS: las capas 2 y 3 de la recursión, sus dos puentes y la
    viga imposible.

    Los puentes existen para que la recursión se lea CONECTADA. Sin ellos son
    tres marcos flotando a distintas profundidades, que es lo mismo que decir
    tres objetos; con ellos el ojo entiende que lo de dentro cuelga de lo de
    fuera, y entonces la pregunta pasa a ser hasta dónde sigue.

    Van a esquinas NO homólogas —de la esquina i a la i+1— así que salen
    alabeados y no existe ninguna cara plana que los contenga.
  */
  const mid = new THREE.Object3D();
  const midMesh = mergedMesh(
    [
      ...ringAt(ring2).map((part) => surfaceMasked(part, 2)),
      ...ringAt(ring3).map((part) => surfaceMasked(part, 3)),
      /*
        LOS PUENTES VAN TODOS A LA MISMA ESQUINA, y ésa es la diferencia entre
        una espina y tres palos. Repartidos —cada tramo a una esquina distinta—
        cruzaban el hueco por sitios distintos y el ojo los leía como ruido
        encima de la recursión; encadenados por la esquina 0 forman UNA línea
        que baja desde una esquina de la caja hasta el fondo, y esa línea es lo
        que hace que los marcos se lean colgados unos de otros en vez de
        flotando.
      */
      strut(boxPoint(1.02, 0.23, 0.95), corners2[0], 0.068),
      strut(corners2[0], corners3[0], 0.056),
    ],
    structure,
  );
  midMesh.name = "tesseract-mid-frames";
  mid.add(midMesh);
  root.add(mid);

  /*
    EL FONDO: penúltimo marco y puentes. El umbral final deriva por separado.

    Son los marcos más pequeños y calientes: sus ranuras de tungsteno son la
    luz fuerte del cuerpo y están al final del recorrido, que es lo que
    lleva el ojo hacia adentro. Dentro del último no hay nada — ni núcleo, ni
    reactor, ni velo. El cilindro central queda libre en toda la altura y por
    ahí pasan las estrellas.
  */
  const deep = new THREE.Object3D();
  const deepMesh = mergedMesh(
    [
      ...ringAt(ring4).map((part) => surfaceMasked(part, 4)),
      strut(corners3[0], corners4[0], 0.048),
      /*
        EL PUENTE QUE NO LLEGA. Se detiene al 58 % del camino y en su extremo
        flota un nodo facetado: un destello sin soporte justo donde la barra
        debería continuar y no continúa. Pregunta «¿cómo se sostiene eso?» sin
        gastar ni un emisivo.
      */
      strut(corners3[2], corners3[2].clone().lerp(corners4[2], 0.58), 0.042),
      surfaceMasked(
        placed(
          latticeNode(0.04),
          (() => {
            const tip = corners3[2].clone().lerp(corners4[2], 0.58);
            return [tip.x, tip.y, tip.z] as const;
          })(),
        ),
        1,
      ),
    ],
    structure,
  );
  deepMesh.name = "tesseract-deep-frames";
  deep.add(deepMesh);
  root.add(deep);

  // El último umbral tiene su propio ritmo. Su pivote vive en el centro del
  // marco para que inclinarlo no lo haga barrer y taponar el agujero del túnel.
  const threshold = new THREE.Object3D();
  const thresholdMesh = mergedMesh(
    ringAt({ ...ring5, y: 0 }).map((part) => surfaceMasked(part, 4.25)),
    structure,
  );
  thresholdMesh.name = "tesseract-threshold";
  threshold.add(thresholdMesh);
  threshold.position.y = ring5.y;
  root.add(threshold);

  /* Contrato semántico de la geometría. Los tests fijan la lectura —cuántas
     capas, cuánto puente, cuánta contradicción y que el centro esté vacío— sin
     acoplarse a cada coordenada artística. */
  root.userData.tesseractArchitecture = {
    /* Caja más cuatro marcos interiores; la espalda pertenece a la caja. */
    visualLayers: 1 + TESSERACT_RINGS.length,
    recursiveRings: TESSERACT_RINGS.length,
    structuralBridges: 3,
    shellExtensions: 2,
    interruptedBeams: 2,
    /* Cada marco interior lleva su propio escalón hacia el vacío. */
    emissiveTiers: 4,
    /* Frente, interior y FONDO. Sin esto el cuerpo se leía sólo por delante. */
    rearFrame: true,
    depthRails: 4,
    sidePanels: 2,
    centralVoid: true,
    closedOuterCube: false,
  };

  return {
    root,
    materials: [structure],
    /* La cáscara fija ancla tres ritmos interiores. La contracción desigual
       cambia las proporciones y las oclusiones, de forma visible en pocos
       segundos a tamaño de hero. Todo oscila: no hay vueltas completas,
       acumulación por fotograma ni desplazamiento del destino. */
    animate(seconds) {
      const wave = (period: number, phase = 0) =>
        Math.sin((seconds * Math.PI * 2) / period + phase);

      mid.rotation.set(
        wave(12.7, 0.6) * 0.035,
        0.02 + wave(10.7) * 0.12,
        wave(14.3, 2.2) * 0.028,
      );
      mid.position.set(wave(13.9) * 0.018, wave(9.4, 1) * 0.035, wave(11.9, 1.1) * 0.016);
      const middleFold = wave(10.7, 0.7);
      mid.scale.set(1 + middleFold * 0.045, 1, 1 - middleFold * 0.035);

      // El fondo va en contra: cuando los medios avanzan, retrocede.
      deep.rotation.set(
        wave(11.1, 2.4) * 0.055,
        -0.05 + wave(8.9, Math.PI) * 0.19,
        wave(13.7, 1.1) * 0.045,
      );
      deep.position.set(wave(12.3, 2) * 0.028, wave(8.2) * 0.045, wave(10.1) * 0.024);
      const deepFold = wave(8.9, 2.3);
      deep.scale.set(1 + deepFold * 0.075, 1, 1 - deepFold * 0.055);

      threshold.rotation.set(
        wave(9.7, 0.7) * 0.06,
        0.04 + wave(7.3, 2.1) * 0.24,
        wave(11.3, 2) * 0.05,
      );
      threshold.position.set(wave(9.1, 1.7) * 0.018, ring5.y + wave(7.9) * 0.04, wave(10.9) * 0.016);
      threshold.scale.setScalar(1 + wave(7.3, 2.8) * 0.085);
    },
  };
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
  const beacon = bodyMaterial(input, EMISSIVE_KIND, { accent: input.accent });
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

  const hullParts = [
    // Fuselaje: bloque bajo y ancho, con los cantos redondeados de una nave
    // que reentra. No es un cilindro: es un lifting body.
    surfaceMasked(
      placed(roundedBox(0.94, 0.28, 0.37, 0.09), [-0.07, 0.035, 0]),
      PLATE,
    ),
    // Proa facetada. Ocho caras y un aplastado vertical: a 70 px lo que se lee
    // es la punta y los dos quiebres de la faceta superior.
    surfaceMasked(
      placed(
        new THREE.ConeGeometry(0.19, 0.36, 8, 1).scale(0.76, 1, 1),
        [0.58, 0.025, 0],
        [0, 0, -Math.PI / 2],
      ),
      PLATE,
    ),
    // Popa: cierre troncocónico corto, para que la cola no acabe en un canto.
    surfaceMasked(
      placed(
        new THREE.CylinderGeometry(0.12, 0.18, 0.14, 8),
        [-0.61, 0.035, 0],
        [0, 0, Math.PI / 2],
      ),
      PLATE,
    ),
    // Alas en flecha. La cuerda de raíz casi dobla a la de punta y el borde de
    // salida retrocede: la planta es la de una nave que vuela, no un triángulo.
    surfaceMasked(
      placed(
        foil(WING_ROOT_LEADING, -0.5, WING_SPAN, WING_TIP_LEADING, -0.4, 0.055),
        [0, -0.045, 0],
        [Math.PI / 2, 0, 0],
      ),
      WING,
    ),
    surfaceMasked(
      placed(
        foil(WING_ROOT_LEADING, -0.5, -WING_SPAN, WING_TIP_LEADING, -0.4, 0.055),
        [0, -0.045, 0],
        [Math.PI / 2, 0, 0],
      ),
      WING,
    ),
    // Cabina: cristal hundido en la superficie superior, no una burbuja encima.
    surfaceMasked(
      placed(
        new THREE.SphereGeometry(0.115, 14, 8).scale(1.5, 0.44, 1.05),
        [0.31, 0.13, 0],
        [0, 0, -0.06],
      ),
      GLASS,
    ),
    // Góndolas de motor: cuerpo claro bajo el encastre del ala.
    ...[-1, 1].map((side) =>
      surfaceMasked(
        placed(
          new THREE.CylinderGeometry(0.1, 0.112, 0.42, 12),
          [-0.29, -0.06, side * 0.215],
          [0, 0, Math.PI / 2],
        ),
        PLATE,
      ),
    ),
    // Deriva en V. Dos planos inclinados 38°: rompen el perfil por arriba y
    // dejan ver el fuselaje entre ellos.
    ...[-1, 1].map((side) =>
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
    ...[-1, 1].map((side) =>
      surfaceMasked(
        placed(roundedBox(0.15, 0.018, 0.075, 0.005), [-0.19, 0.165, side * 0.115]),
        SERVICE,
      ),
    ),
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
    // Montante central de la cabina, más los dos travesaños del marco.
    placed(new THREE.BoxGeometry(0.26, 0.026, 0.02), [0.31, 0.165, 0]),
    placed(new THREE.BoxGeometry(0.018, 0.028, 0.16), [0.43, 0.145, 0]),
    placed(new THREE.BoxGeometry(0.018, 0.028, 0.2), [0.19, 0.15, 0]),
  ];

  for (const side of [-1, 1]) {
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
        new THREE.CylinderGeometry(0.088, 0.12, 0.18, 12, 1, true),
        [-0.58, -0.06, side * 0.215],
        [0, 0, Math.PI / 2],
      ),
      placed(
        new THREE.TorusGeometry(0.112, 0.014, 6, 14),
        [-0.49, -0.06, side * 0.215],
        [0, Math.PI / 2, 0],
      ),
      // Góndola colgada del ala por un pilón corto y visible.
      placed(
        new THREE.BoxGeometry(0.32, 0.085, 0.045),
        [-0.29, 0.005, side * 0.215],
      ),
      // Contenedor de punta de ala: cierra el plano y sostiene la baliza.
      placed(
        new THREE.CylinderGeometry(0.028, 0.028, 0.18, 8),
        [-0.28, -0.042, side * (WING_SPAN + 0.005)],
        [0, 0, Math.PI / 2],
      ),
    );
  }

  const structureMesh = mergedMesh(structureParts, structure);
  structureMesh.name = "ranger-heat-shield-and-engines";
  craft.add(structureMesh);

  /* Balizas: punta de ala, morro y las dos brasas de tobera. Físicas y
     diminutas —el bloom óptico las convierte en luz, no un degradado— y ahora
     las de motor viven DENTRO de la campana, que es lo que hace que el escape
     se lea como escape y no como dos puntos pegados a la cola. */
  const beaconMesh = mergedMesh(
    [
      placed(new THREE.SphereGeometry(0.021, 7, 5), [-0.2, -0.042, WING_SPAN + 0.02]),
      placed(new THREE.SphereGeometry(0.021, 7, 5), [-0.2, -0.042, -WING_SPAN - 0.02]),
      placed(new THREE.SphereGeometry(0.019, 7, 5), [0.75, 0.025, 0]),
      placed(new THREE.CircleGeometry(0.082, 12), [-0.645, -0.06, 0.215], [0, -Math.PI / 2, 0]),
      placed(new THREE.CircleGeometry(0.082, 12), [-0.645, -0.06, -0.215], [0, -Math.PI / 2, 0]),
    ],
    beacon,
  );
  beaconMesh.name = "ranger-violet-beacon";
  beaconMesh.renderOrder = 2;
  craft.add(beaconMesh);

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
      return tesseractModel(input);
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
 */
function modelRadius(root: THREE.Object3D): number {
  const vertex = new THREE.Vector3();
  let radius = 0;
  root.updateMatrixWorld(true);

  // Recursión propia y no `traverse`: hay que poder podar un SUBÁRBOL entero,
  // y el callback de traverse no puede detener el descenso a los hijos.
  const visit = (node: THREE.Object3D) => {
    const position = (node as Partial<THREE.Mesh>).geometry?.getAttribute(
      "position",
    );
    if (position) {
      for (let i = 0; i < position.count; i++) {
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
 * Se calcula una vez al cargar el módulo; el cuerpo ya no gira, así que esta
 * pose es toda su orientación.
 */
const RANGER_ATTITUDE = (() => {
  const top = new THREE.Vector3(0.299, 0.949, -0.095).normalize();
  const nose = new THREE.Vector3(0.855, -0.185, -0.489)
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
  */
  if (visual === "ship") return target.set(0.3, 0.32, -0.08);
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
    estable y con periodos inconmensurables entre sí. Ver `tesseractModel`.
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
