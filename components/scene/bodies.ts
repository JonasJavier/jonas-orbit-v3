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
 * anillo de interfaz vacío. Cuatro de los siete destinos no tenían cuerpo.
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
  station: 3,
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
      y basta normalizar al otro lado. Lo usa la sombra de los anillos de
      Cooper, que necesita cortar el plano del anillo.
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
    /* Miller reutiliza estos campos en su reflexión extensa. Declararlos una
       vez evita repetir dos FBM completos después de resolver el material. */
    float millerWeather = 0.0;
    float millerWaveField = 0.0;

    if (uKind == 0) {
      /*
        Miller: mundo oceánico.

        No hacía falta reconstruirlo —se lee de un vistazo y su identidad es
        clara— pero sí quitarle el azul plano. Lo que cambia es todo de segundo
        orden: profundidad de agua en tres tramos en vez de uno, nubes
        ALARGADAS en longitud como las de un planeta que rota deprisa, y una
        marejada de gradiente analítico que quiebra el terminador. Nada de esto
        se ve como efecto; se ve como que el océano tiene sitios.
      */
      millerWeather = fbm(vLocal * 3.4 + vec3(0.0, uTime * 0.02, 0.0));
      float stormBands = 0.5 + 0.5 * sin(vLocal.y * 17.0 + millerWeather * 4.5);
      float ocean = fbm(vLocal * 2.1);
      /* Muestreo anisótropo: la latitud comprimida alarga las nubes en
         longitud. Sale de la misma llamada y evita el algodón isótropo. */
      float cloudField = fbm(
        vec3(vLocal.x, vLocal.y * 2.6, vLocal.z) * 3.9
          + vec3(uTime * 0.004, 0.0, 1.7)
      );
      float cloudCover = smoothstep(
        0.6,
        0.83,
        cloudField * 0.62 + millerWeather * 0.2 + stormBands * 0.18
      );
      millerWaveField = 0.5 + 0.5 * sin(
        vLocal.y * 31.0 + vLocal.x * 7.0 + cloudField * 5.2
      );
      /* Una octava: microoleaje, por debajo del píxel a esta distancia. */
      float microWaves = noise(vLocal * 18.0 + vec3(uTime * 0.012, 0.0, 0.0));
      float breakers = 0.5 + 0.5 * sin(
        vLocal.z * 49.0 - vLocal.x * 13.0 + microWaves * 7.0
      );
      float foam = smoothstep(
        0.72,
        0.93,
        millerWaveField * 0.48 + millerWeather * 0.34 + breakers * 0.18
      );

      /*
        MAREJADA. Dos trenes de onda largos, de gradiente exacto —la derivada
        de un seno es un coseno, no cuesta una muestra más— que inclinan el
        término lambert. En un mundo de olas de kilómetro, el terminador no es
        una curva limpia: es una banda rota. Es el detalle que Miller no tenía.
      */
      vec3 swellA = vec3(14.9, -8.3, 11.7);
      vec3 swellB = vec3(-10.3, 12.9, 16.1);
      float swellPhaseA = dot(vLocal, swellA) + uTime * 0.05;
      float swellPhaseB = dot(vLocal, swellB) - uTime * 0.037;
      vec3 swellSlope = swellA * cos(swellPhaseA) * 0.6
                      + swellB * cos(swellPhaseB) * 0.4;
      vec3 oceanUp = normalize(vLocal);
      vec3 swellTangent = swellSlope - oceanUp * dot(swellSlope, oceanUp);
      reliefOffset = -dot(swellTangent, normalize(vLightLocal))
                   * 0.0035 * (1.0 - cloudCover * 0.75);

      /* Tres profundidades: fosa, plataforma y bajío. El agua deja de ser un
         color y pasa a tener fondo. */
      albedo = mix(vec3(0.004, 0.03, 0.105), vec3(0.017, 0.2, 0.35), ocean);
      albedo = mix(
        albedo,
        vec3(0.09, 0.47, 0.55),
        smoothstep(0.52, 0.86, ocean) * 0.72
      );
      albedo = mix(albedo, vec3(0.52, 0.71, 0.79), cloudCover * 0.58);
      albedo = mix(albedo, vec3(0.72, 0.94, 0.97), foam * (1.0 - cloudCover) * 0.26);
      gloss = mix(0.94, 0.12, cloudCover);
      gloss *= 0.72 + millerWaveField * 0.18 + microWaves * 0.2;
      /* Reflejo más CERRADO. A 38 el disco dejaba una mancha blanca reventada
         de un tercio del planeta: eso no es sol sobre el mar, es una fuga de
         exposición. A 74 el camino de luz se estrecha y aparece lo que
         importa, el rastro de destellos del oleaje alrededor. */
      specularPower = 74.0;
      /* Y más BAJO: 0.82, no 1.05. El brillo del disco sobre el océano seguía
         dejando una mancha casi blanca, y una superficie perfecta a esa
         intensidad es lo que hace que un planeta de agua se lea como material
         de videojuego. Con 0.82 el reflejo sigue estando —es medio Miller— pero
         deja ver el agua que hay debajo. */
      specularStrength = 0.82;
      /* Un mundo de agua tiene aire, y ese filo azul es la mitad de la lectura.
         Pesa 1.12 en vez de 1.3: por encima, el halo azul empieza a leerse como
         un contorno dibujado y desentona con el ámbar del resto del sistema. */
      atmosphere = vec3(0.24, 0.5, 0.82);
      atmosphereWeight = 1.12;
    } else if (uKind == 1) {
      /*
        Edmunds: el mundo de la Creatividad, y por tanto el que no puede ser
        «un planeta marrón genérico».

        ── Qué fallaba ─────────────────────────────────────────────────────
        Tenía cinco escalas de ruido y todas pintaban COLOR. El resultado era
        una red de grietas naranjas de frecuencia uniforme cubriendo el disco
        entero: se leía como una textura de lava aplicada a una bola, no como
        un paisaje. Y sin sombra propia, la esfera no tenía volumen más allá
        del terminador.

        ── Qué lo cambia ───────────────────────────────────────────────────
        1. **Topografía iluminada.** Tres ondas direccionales de gradiente
           analítico inclinan el término lambert: las laderas encaradas a
           Gargantúa se encienden y las opuestas caen. Es sombra propia de
           verdad, y no cuesta ni una muestra de ruido.
        2. **Dos terrenos, no cinco.** Tierras altas de cobre y cuencas de
           basalto oscuro, separadas por un umbral duro. El contraste grande
           va entre regiones; el detalle fino sólo las texturiza por dentro.
        3. **Sales y polvo.** Depósitos claros en las cuencas y una capa de
           polvo alta que lava el color hacia el limbo. Es lo que le da el
           aire cálido y habitable que pide su nombre.
      */
      float continents = fbm(vLocal * 1.75 + vec3(4.2, 1.1, 7.3));
      float terrain = fbm(vLocal * 5.4 + continents * 1.3);
      float ridges = 1.0 - abs(fbm(vLocal * 9.2) * 2.0 - 1.0);
      float haze = smoothstep(
        0.52,
        0.8,
        fbm(vLocal * 2.65 + vec3(uTime * 0.0025, 8.0, 2.0))
      );
      /* Depósitos minerales: la escala fina y de alto contraste. Es la que
         impide que el planeta se lea como una textura uniforme al girar. */
      float veins = smoothstep(0.52, 0.74, fbm(vLocal * 13.5 + continents));

      /*
        Relieve. Tres ondas de números de onda primos entre sí, así que el
        patrón no se repite en la esfera; la amplitud sube donde hay tierra
        alta y se apaga en las cuencas, que es donde el terreno real es plano.
        El gradiente es la derivada exacta —la misma onda en coseno— y su
        componente tangencial es la pendiente que ve la luz.
      */
      float highland = smoothstep(0.38, 0.62, continents);
      vec3 waveA = vec3(17.3, 10.7, -12.1);
      vec3 waveB = vec3(-9.7, 19.3, 14.1);
      vec3 waveC = vec3(12.7, -15.7, 20.5);
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
      /* Amplitud pequeña a propósito. Con números de onda del orden de veinte,
         0.011 por unidad de gradiente da laderas de unos 15°: cordilleras que
         cruzan el terminador, no una pelota de golf ni un mapa de relieve
         exagerado. La mitad de la amplitud vive en las tierras altas. */
      float reliefStrength = 0.011 * (0.35 + highland * 0.9);
      reliefOffset = -dot(tangentSlope, lightLocal) * reliefStrength;

      /* Casquetes: no nieve, sales heladas. Rompen la monotonía del cobre y dan
         un eje visible — sin polos, una esfera girando no tiene norte. */
      float polar = smoothstep(0.62, 0.93, abs(vLocal.y));

      /* Cuenca de basalto oscuro y tierra alta de cobre: el salto de valor
         grande va aquí, entre dos regiones, no repartido en cien grietas. */
      albedo = mix(vec3(0.135, 0.062, 0.042), vec3(0.58, 0.29, 0.135), highland);
      albedo = mix(albedo, vec3(0.86, 0.53, 0.26), terrain * highland * 0.72);
      /* 0.20, no 0.34. No es un rediseño de Edmunds —eso queda para su fase—
         sino control de frecuencias: las tres escalas finas pintaban COLOR con
         tanto peso como las dos masas grandes, y a tamaño de Hero eso no se lee
         como geología sino como ruido procedimental sobre una esfera. Bajan las
         finas, se quedan las grandes, y el reparto pasa a ser el que pide
         dirección: primero masa, después estructura, y el grano al final. */
      albedo = mix(albedo, vec3(0.97, 0.76, 0.53), ridges * highland * 0.2);
      /* Sal seca en el fondo de las cuencas, donde el terreno es bajo. */
      albedo = mix(albedo, vec3(0.72, 0.63, 0.52), veins * (1.0 - highland) * 0.18);
      /* Y el relieve también tiñe: las crestas están más expuestas y pierden
         el óxido; los valles lo acumulan. */
      albedo = mix(albedo, vec3(0.9, 0.66, 0.42), smoothstep(0.3, 0.95, height) * 0.2);
      albedo = mix(albedo, vec3(0.1, 0.04, 0.03), smoothstep(-0.3, -0.95, height) * 0.28);
      albedo = mix(albedo, vec3(0.8, 0.6, 0.44), haze * 0.3);
      /* Los casquetes bajan de 0.55 a 0.34: eran el mayor salto de valor del
         planeta y competían con la propia masa continental. */
      albedo = mix(albedo, vec3(0.88, 0.87, 0.85), polar * 0.34);
      gloss = 0.045 + haze * 0.04 + polar * 0.2 + veins * 0.05;
      specularPower = 26.0;
      atmosphere = vec3(1.0, 0.63, 0.36);
      atmosphereWeight = 1.18;
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
      float chamfer = smoothstep(0.29, 0.5, across);
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
      albedo = mix(albedo, vec3(0.46, 0.38, 0.28), chamfer * 0.12);
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
      materialOcclusion = 1.0 - cavity * 0.86;

      /*
        LA JERARQUÍA LUMINOSA, que es la mitad del diseño de este cuerpo.

        La dirección la pidió en una escala: caja 0 %, marco 2 ~10 %, marco 3
        ~20 %, marco 4 ~40 %. No son valores literales de un uniform, es el
        orden: la luz sube hacia adentro y por eso el ojo entra. Al revés —o
        plano, que era el fallo de la versión anterior— la estructura entera se
        enciende a la vez y vuelve a salir un wireframe grueso.

        Cada escalón sube TRES cosas juntas: el grafito se aclara y se
        entibia, el filo devuelve más, y el tungsteno emite más. Con una sola de
        las tres el escalón no se ve a 55 px.

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
      if (vSurfaceMask > 3.5) {
        /*
          MARCO 4 — el fondo del recorrido. Es el más pequeño y el más caliente:
          la única luz fuerte del cuerpo, y está al final. Desde el Hero se lee
          como una brasa dentro del vacío; al acercar la cámara se descubre que
          lo que brilla es una ranura embutida en una viga, no un núcleo.
        */
        albedo = mix(vec3(0.032, 0.026, 0.02), vec3(0.084, 0.068, 0.048), grain * 0.5);
        albedo *= 0.4 + 0.85 * across;
        albedo = mix(albedo, vec3(0.62, 0.44, 0.25), chamfer * 0.26);
        gloss = mix(0.09, 0.64, chamfer);
        specularPower = mix(58.0, 21.0, chamfer);
        specularStrength = 0.15 + chamfer * 0.95;

        float glow = 1.0 - smoothstep(0.1, 0.42, across);
        float run = smoothstep(0.12, 0.3, along) * (1.0 - smoothstep(0.7, 0.9, along));
        albedo = mix(albedo, vec3(0.02, 0.014, 0.01), glow * 0.5);
        emissive = vec3(1.0, 0.52, 0.2) * glow * run * 0.56;
      } else if (vSurfaceMask > 2.5) {
        /*
          MARCO 3 y la viga imposible. Escalón intermedio: grafito ya tibio y
          media ranura. La viga que entra por detrás y sale por delante comparte
          este acabado a propósito — así sus dos tramos se reconocen como LA
          MISMA pieza, que es lo que hace que la discontinuidad duela.
        */
        albedo = mix(vec3(0.026, 0.023, 0.02), vec3(0.068, 0.06, 0.05), grain * 0.5);
        albedo *= 0.45 + 0.8 * across;
        albedo = mix(albedo, vec3(0.56, 0.44, 0.29), chamfer * 0.22);
        gloss = mix(0.075, 0.58, chamfer);
        specularPower = mix(60.0, 22.0, chamfer);
        specularStrength = 0.12 + chamfer * 0.72;

        float glow = 1.0 - smoothstep(0.1, 0.4, across);
        float run = smoothstep(0.16, 0.34, along) * (1.0 - smoothstep(0.66, 0.86, along));
        albedo = mix(albedo, vec3(0.018, 0.014, 0.011), glow * 0.5);
        emissive = vec3(1.0, 0.55, 0.23) * glow * run * 0.26;
      } else if (vSurfaceMask > 1.5) {
        /*
          MARCO 2 — el primer paso hacia dentro. Apenas se separa de la caja:
          un grafito un punto más claro y una costura ámbar corta. Si aquí ya
          hubiera brasa, el recorrido se acabaría en el primer escalón.
        */
        albedo = mix(vec3(0.02, 0.02, 0.022), vec3(0.052, 0.052, 0.056), grain * 0.5);
        albedo *= 0.5 + 0.72 * across;
        gloss = mix(0.06, 0.5, chamfer);
        specularPower = mix(64.0, 24.0, chamfer);
        specularStrength = 0.09 + chamfer * 0.56;

        float glow = 1.0 - smoothstep(0.12, 0.4, across);
        float run = smoothstep(0.22, 0.4, along) * (1.0 - smoothstep(0.6, 0.8, along));
        albedo = mix(albedo, vec3(0.014, 0.014, 0.016), glow * 0.5);
        emissive = vec3(1.0, 0.58, 0.26) * glow * run * 0.1;
      } else if (vSurfaceMask > 0.5) {
        /*
          Nodos. Acero pulido y facetado: las piezas que devuelven un destello
          duro del disco, y ese destello es lo que convierte el objeto en algo
          construido en vez de dibujado. Son el ÚNICO brillo del exterior, que
          por lo demás no emite nada: la dirección pide la caja casi a oscuras y
          la luz concentrada dentro.
        */
        albedo = vec3(0.052, 0.056, 0.066);
        gloss = 0.92;
        specularPower = 34.0;
        specularStrength = 1.1;
      }
    } else if (uKind == 3) {
      /*
        Cooper Station: cerámica habitada — un LUGAR, no una nave (F1.3).

        El planeta anillado deja paso a la megaestructura: gran arco abierto,
        módulos repetidos, espina, paneles y vacío en el centro. Endurance es
        máquina (manta térmica gris, grafito); Cooper es arquitectura (cerámica
        clara, aluminio, microventanas cálidas). La diferencia la sostienen el
        VALOR y el acabado, no el número de piezas.

        Sin una sola llamada a fbm: juntas de panel anchas —sobreviven al tamaño
        de Hero sin moiré— y grano de una octava. La misma luz toca este material
        y el de todos los demás; el suelo nocturno es el común de la familia.
      */
      float joints = panels(vLocal * 1.15, 1.35);
      /* Una octava: grano de cerámica y aluminio, por debajo del píxel lejano. */
      float ceramicGrain = noise(vLocal * 9.0);
      if (vSurfaceMask > 2.5) {
        /*
          Panel solar. Azul acero oscuro con largueros en el sentido largo: sin
          esa dirección, un plano oscuro a 60 px se funde con el fondo y la
          estación pierde sus alas.
        */
        float ribs = smoothstep(0.3, 0.5, abs(fract(vUv.x * 14.0) - 0.5));
        albedo = mix(vec3(0.05, 0.08, 0.13), vec3(0.16, 0.22, 0.32), ribs);
        gloss = 0.55 + ribs * 0.25;
        specularPower = 52.0;
        specularStrength = 0.8;
      } else if (vSurfaceMask > 1.5) {
        /* Receso y grafito: las juntas oscuras entre cerámica. */
        albedo = mix(vec3(0.05, 0.06, 0.075), vec3(0.14, 0.155, 0.175), joints * 0.5);
        albedo *= 0.85 + ceramicGrain * 0.2;
        gloss = 0.4;
        specularPower = 46.0;
      } else if (vSurfaceMask > 0.5) {
        /* Aluminio satinado: arco, espina secundaria, conectores, remates. */
        albedo = mix(vec3(0.3, 0.32, 0.345), vec3(0.55, 0.56, 0.56), joints);
        albedo *= 0.88 + ceramicGrain * 0.18;
        gloss = 0.5;
        specularPower = 55.0;
        specularStrength = 0.85;
      } else {
        /*
          Cerámica espacial clara. Llega a 0.78 donde la junta la enciende: más
          blanca que la manta principal de Endurance (0.72), que es lo que aparta
          a Cooper de la lectura de nave sin llegar al papel recortado —está una
          órbita más lejos y un plano más al fondo, así que la misma clave le
          devuelve menos.
        */
        albedo = mix(vec3(0.6, 0.61, 0.6), vec3(0.78, 0.77, 0.74), joints);
        albedo *= 0.92 + ceramicGrain * 0.12;
        gloss = 0.32;
        specularPower = 40.0;
        specularStrength = 0.6;
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
        blanco casi puro para los cuatro módulos principales. Tres valores
        separados hacen el trabajo que doce siluetas iguales no hacían.
      */
      albedo = mix(vec3(0.13, 0.145, 0.165), vec3(0.47, 0.475, 0.46), blanket);
      albedo = mix(albedo, vec3(0.68, 0.46, 0.26), warmFoil * 0.26);
      /* La costura pesaba 0.68 y dibujaba una rejilla casi negra sobre cada
         cara: a tamaño de Hero la nave parecía forrada de azulejos. Una manta
         térmica real tiene juntas, pero no son surcos —van cosidas, no
         mecanizadas— y a esta distancia valen un cuarto de lo que valían. */
      albedo = mix(albedo, vec3(0.12, 0.13, 0.145), seam * 0.34);
      albedo *= 0.9 + macroVariation * 0.17;
      gloss = mix(0.34, 0.13, microRoughness);
      specularPower = 38.0;
      specularStrength = 0.72;

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
        /* 0.72, no 0.99. El blanco puro es lo que hacía que el ojo aterrizara
           aquí antes que en el agujero negro: a la intensidad de clave de esta
           órbita, 0.99 revienta el canal y la manta deja de tener material —
           pasa a ser papel recortado. A 0.72 sigue siendo la superficie más
           clara de la escena y recupera medio tono de rango donde antes había
           saturación. */
        albedo = mix(vec3(0.145, 0.165, 0.185), vec3(0.72, 0.7, 0.66), blanket);
        albedo = mix(albedo, vec3(0.13, 0.14, 0.155), seam * 0.3);
        gloss = mix(0.46, 0.2, microRoughness);
        specularPower = 48.0;
      }
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
      albedo = mix(vec3(0.185, 0.21, 0.245), vec3(0.83, 0.85, 0.86), blanket);
      albedo = mix(albedo, vec3(0.74, 0.61, 0.43), warmFoil * 0.22);
      albedo = mix(albedo, vec3(0.06, 0.075, 0.095), seam * 0.55);
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
        albedo = mix(vec3(0.115, 0.135, 0.165), vec3(0.46, 0.49, 0.52), 0.3 + smoothPlate * 0.45);
        albedo = mix(albedo, vec3(0.05, 0.062, 0.078), chordwise * 0.45);
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
    } else if (uKind == 8 || uKind == 11) {
      /*
        Luces de navegación y microventanas: geometría, no halo global.

        Dos intensidades, un solo shader. Las BALIZAS (8) van a 2.75: tienen que
        pinchar el bloom y leerse a distancia. Las VENTANAS de Cooper (11) van a
        1.15 a propósito —a 2.75 el ámbar clipea a blanco y una ventana cálida
        de un píxel se convierte en un glint genérico; a 1.15 conserva el tono
        y el cerebro lee «hay personas ahí» en vez de «hay un led».
      */
      float pulse = 0.94 + 0.06 * sin(uTime * 0.55);
      albedo = vec3(0.0);
      float glow = uKind == 8 ? (2.75 + uFocus * 0.55) : 1.15;
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
    if (uKind == 8 || uKind == 11) {
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
      La cerámica clara de Cooper conserva el suelo común: devuelve más cielo
      que el grafito del Tesseracto, como haría un casco claro de verdad.

      Endurance es la excepción alta a propósito: tiene más caras por unidad de
      silueta que ningún otro cuerpo, y un suelo bajo no le da grafito — le abre
      agujeros negros entre los módulos y se lee como confeti alrededor de un
      aro.
    */
    float nightFloor = 0.5;
    if (uKind == 4) nightFloor = 0.6;
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
    float terminatorBand = exp(-abs(shadedNdl - 0.055) * 15.0) * (1.0 - day * 0.34);
    if (uKind == 0 || uKind == 1 || uKind == 3) {
      color += albedo * key * terminatorBand * 0.09;
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

    /* Miller refleja una fuente EXTENSA: además del filo especular estrecho hay
       una lámina de luz más ancha sobre el océano. Las nubes ya bajan el brillo,
       así que la lectura sigue siendo agua y no una bola cromada. */
    if (uKind == 0) {
      float oceanSheen = pow(specBase, 15.0) * gloss * day;
      float oceanGlint = pow(specBase, 62.0)
                       * smoothstep(0.46, 0.9, millerWaveField)
                       * (1.0 - smoothstep(0.64, 0.84, millerWeather))
                       * day;
      color += mix(key, vec3(0.45, 0.68, 1.0), 0.28) * oceanSheen * 0.26;
      color += mix(vec3(1.0, 0.88, 0.67), vec3(0.58, 0.8, 1.0), 0.24)
             * oceanGlint * 0.42;
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
    color += backRimColor * backRim * 0.55;

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
        color += albedo * vec3(0.018, 0.018, 0.021);
        color += mix(key, vec3(0.6, 0.64, 0.71), 0.16) * sheen * 0.2;
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
      color += mix(key, vec3(0.9, 0.86, 0.78), 0.2) * sweep * 0.16;
    }

    /* Borde encendido por el disco, para todo lo demás: es lo que separa al
       cuerpo del fondo negro sin dibujarle un contorno. */
    float warmRim = fresnel * smoothstep(-0.25, 0.42, ndl);
    /*
      El Tesseracto paga un tercio del rim común. Es grafito casi negro con la
      luz casi de frente: el fresnel ya levanta sus cantos por especular, y el
      0.18 genérico le ponía una segunda línea crema ENCIMA — borde sobre borde
      — que a escala de Hero se comía la diferencia entre cara y filo y
      devolvía el marco beige. A 0.06 el cuerpo se sigue separando del negro
      pero el filo lo dibuja el material, no el contorno.
    */
    color += key * warmRim * (uKind == 2 ? 0.035 : 0.18);
    color += materialFill * fresnel * 0.32;
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
/* Microventanas de Cooper: mismo shader que las balizas, un grado menos de
   insolencia. Ver la rama `uKind == 11` del fragment. */
const COOPER_WINDOW_KIND = 11;

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
 * 1. **Núcleo.** Barril axial con collar de atraque a proa y bloque de cuatro
 *    campanas a popa. Es la pieza individual más grande y la única que rompe el
 *    plano del anillo: se ve primero y explica dónde está el eje.
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
     El eje va en Z, perpendicular al plano del anillo. El barril mide 0.5 de
     largo por 0.48 de diámetro: más volumen que el módulo principal, que es
     exactamente lo que hacía falta para que el centro se lea como centro. */
  hullParts.push(
    surfaceMasked(
      placed(
        new THREE.CylinderGeometry(0.24, 0.24, 0.5, 18),
        [0, 0, 0],
        [Math.PI / 2, 0, 0],
      ),
      PRIMARY_BLANKET,
    ),
    // Proa: collar de atraque troncocónico. Por aquí entra todo lo que llega.
    surfaceMasked(
      placed(
        new THREE.CylinderGeometry(0.125, 0.215, 0.22, 16),
        [0, 0, 0.33],
        [Math.PI / 2, 0, 0],
      ),
      PRIMARY_BLANKET,
    ),
    // Popa: sección de servicio en grafito, más estrecha y claramente distinta.
    surfaceMasked(
      placed(
        new THREE.CylinderGeometry(0.185, 0.205, 0.24, 16),
        [0, 0, -0.32],
        [Math.PI / 2, 0, 0],
      ),
      GRAPHITE,
    ),
  );

  structureParts.push(
    // Cinturón: el nudo donde el núcleo recoge la carga de los cuatro brazos.
    new THREE.TorusGeometry(0.3, 0.052, 8, 26),
    placed(new THREE.TorusGeometry(0.25, 0.018, 5, 18), [0, 0, 0.2]),
    placed(new THREE.TorusGeometry(0.25, 0.018, 5, 18), [0, 0, -0.19]),
    // Mástil y reflector de alta ganancia: escala y función en dos piezas.
    placed(
      new THREE.CylinderGeometry(0.012, 0.012, 0.26, 7),
      [0, 0, 0.55],
      [Math.PI / 2, 0, 0],
    ),
    placed(
      new THREE.ConeGeometry(0.075, 0.03, 12, 1, true),
      [0, 0, 0.69],
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
        [x, y, -0.55],
        [Math.PI / 2, 0, 0],
      ),
      placed(new THREE.TorusGeometry(0.079, 0.011, 5, 12), [x, y, -0.655]),
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
  const ARM_INNER = 0.34;
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
            new THREE.BoxGeometry(ARM_OUTER - ARM_INNER, 0.055, 0.055),
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

    for (let slot = -1; slot <= 1; slot++) {
      const isPrimary = slot === 0;
      const angle = groupAngle + slot * SLOT_SPREAD;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const radial = isPrimary ? 0.46 : 0.32;
      const tangential = isPrimary ? 0.33 : 0.25;
      const depth = isPrimary ? 0.33 : 0.25;

      hullParts.push(
        surfaceMasked(
          placed(
            roundedBox(radial, tangential, depth, 0.03),
            [cos * RING, sin * RING, 0],
            [0, 0, angle],
          ),
          isPrimary ? PRIMARY_BLANKET : BLANKET,
        ),
      );

      // Cuello al riel: el módulo está montado sobre la estructura, no flotando.
      structureParts.push(
        placed(
          new THREE.CylinderGeometry(0.052, 0.052, 0.16, 10),
          [
            cos * (RING - radial / 2 - 0.06),
            sin * (RING - radial / 2 - 0.06),
            0,
          ],
          [0, 0, angle - Math.PI / 2],
        ),
      );

      if (isPrimary) {
        // Escotilla y panel de servicio: el módulo principal es el que trabaja.
        structureParts.push(
          placed(
            new THREE.CylinderGeometry(0.062, 0.062, 0.05, 12),
            [cos * (RING + 0.04), sin * (RING + 0.04), depth / 2 + 0.02],
            [Math.PI / 2, 0, 0],
          ),
        );
        serviceParts.push(
          placed(
            new THREE.BoxGeometry(0.17, 0.15, 0.014),
            [cos * (RING - 0.09), sin * (RING - 0.09), depth / 2 + 0.008],
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
          Cuatro paneles alineados con los cuatro brazos repiten el mismo
          ritmo que ya cuentan brazos, grupos y campanas.

          Y van EN EL PLANO del anillo, no perpendiculares. Perpendiculares se
          veían de canto justo desde la pose del Hero: cuatro palos rayados
          saliendo del aro. En el plano prolongan el disco de la nave y
          aportan lo que ninguna otra pieza aporta, superficie plana grande.
        */
        hullParts.push(
          surfaceMasked(
            placed(
              new THREE.BoxGeometry(0.32, 0.36, 0.014),
              [cos * (RING + 0.35), sin * (RING + 0.35), 0],
              [0, 0, angle],
            ),
            RADIATOR,
          ),
        );
        structureParts.push(
          placed(
            new THREE.BoxGeometry(0.12, 0.032, 0.032),
            [cos * (RING + 0.24), sin * (RING + 0.24), 0],
            [0, 0, angle],
          ),
        );
      } else {
        if (slot > 0) {
          serviceParts.push(
            placed(
              new THREE.BoxGeometry(0.12, 0.11, 0.012),
              [cos * RING, sin * RING, depth / 2 + 0.007],
              [0, 0, angle],
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
    const dockZ = (group % 2 === 0 ? 1 : -1) * (0.33 / 2 + 0.075);
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
    placed(new THREE.SphereGeometry(0.023, 8, 6), [0, 0, 0.45]),
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
    radiators: GROUPS * 2,
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
 * Cooper Station: megaestructura habitada — un LUGAR, no una nave (F1.3).
 *
 * ── Qué deja atrás ────────────────────────────────────────────────────
 *
 * El planeta anillado con hábitat pequeño contaba «mundo memorable», pero sin
 * rótulo se leía planeta, no lugar habitado. El cilindro provisional ya lo
 * prohibía la dirección; esta fase retira también el planeta: la silueta la
 * pone la arquitectura.
 *
 * ── El orden de lectura ───────────────────────────────────────────────
 *
 * 1. **Gran arco.** 220° abiertos con el hueco hacia abajo y algo a la
 *    derecha: curva, arquitectura y vacío enorme en una sola línea. No
 *    cierra —una rueda cerrada sería otra Endurance.
 * 2. **Módulos repetidos.** Siete secciones habitables de tamaños distintos
 *    sobre el arco, alternando cara. La REPETICIÓN es el truco de escala:
 *    unidades pequeñas en serie hacen que el cerebro lea enorme sin contar
 *    edificios. Lo mismo hacen las tres microventanas por módulo.
 * 3. **Espina y montantes.** Una cuerda oscura une las puntas del arco con
 *    cuatro montantes; el contraste claro/oscuro dibuja la estructura.
 * 4. **Paneles, mástil y arco secundario.** Dos alas solares, un mástil con
 *    baliza y un fragmento de arco en un plano trasero: piezas de tamaño
 *    conocido y paralaje interno.
 * 5. **Microventanas cálidas.** Una tira diminuta por módulo: hay personas
 *    ahí sin dibujar ni una.
 *
 * Cinco draws —cerámica/aluminio, estructura, ventanas tenues, balizas y
 * ascensor—, uno más que el planeta con anillos y a cambio de que las ventanas
 * conserven su tono cálido sin clipear. El radio publicado vuelve a medir la
 * silueta entera: ya no hay hábitat lejano que podar, así que el encuadre no
 * se entera del cambio.
 */
function cooperModel(input: SceneBodyInput): BodyModel {
  const hull = bodyMaterial(input, KIND.station);
  const structure = bodyMaterial(input, STRUCTURE_KIND);
  const windows = bodyMaterial(input, COOPER_WINDOW_KIND, { accent: "#ffc27a" });
  const beacons = bodyMaterial(input, EMISSIVE_KIND, { accent: "#fff1d6" });
  const root = new THREE.Object3D();
  const assembly = new THREE.Object3D();
  assembly.name = "cooper-station-assembly";
  root.add(assembly);

  /* Acabados dentro del mismo draw, como la Endurance: la máscara viaja por
     vértice y el arco entero sale en una sola malla. */
  const CERAMIC = 0;
  const ALUMINUM = 1;
  const RECESS = 2;
  const SOLAR = 3;

  /* El hueco mira abajo y un poco a la derecha: apertura deliberada, no diana. */
  const ARC_R = 0.92;
  const ARC_START = (-18 * Math.PI) / 180;
  const ARC_SWEEP = (220 * Math.PI) / 180;

  const hullParts: THREE.BufferGeometry[] = [];
  const structureParts: THREE.BufferGeometry[] = [];
  const windowParts: THREE.BufferGeometry[] = [];
  const beaconParts: THREE.BufferGeometry[] = [];

  /* ── 1. Gran arco ──────────────────────────────────────────────────── */
  hullParts.push(
    surfaceMasked(
      placed(
        new THREE.TorusGeometry(ARC_R, 0.05, 8, 72, ARC_SWEEP),
        [0, 0, 0],
        [0, 0, ARC_START],
      ),
      ALUMINUM,
    ),
  );

  /* Puntas del arco: collar de atraque en cada extremo, que es donde una
     estación abierta recibe visitas. */
  const arcEnd = (angle: number): VectorTuple => [
    Math.cos(angle) * ARC_R,
    Math.sin(angle) * ARC_R,
    0,
  ];
  for (const angle of [ARC_START, ARC_START + ARC_SWEEP]) {
    const [tipX, tipY] = arcEnd(angle);
    hullParts.push(
      surfaceMasked(
        placed(
          new THREE.CylinderGeometry(0.055, 0.07, 0.1, 10),
          [tipX, tipY, 0],
          [0, 0, angle - Math.PI / 2],
        ),
        RECESS,
      ),
    );
    beaconParts.push(
      placed(new THREE.SphereGeometry(0.02, 7, 5), [tipX, tipY, 0.06]),
    );
  }

  /* ── 2. Módulos habitables ─────────────────────────────────────────── */
  const MODULE_LENGTHS = [0.16, 0.2, 0.14, 0.22, 0.15, 0.19, 0.13];
  const MODULE_COUNT = MODULE_LENGTHS.length;
  let windowCount = 0;
  for (let index = 0; index < MODULE_COUNT; index++) {
    const length = MODULE_LENGTHS[index];
    const progress = index / (MODULE_COUNT - 1);
    const angle = ARC_START + 0.14 + progress * (ARC_SWEEP - 0.28);
    const tilt = angle + Math.PI / 2;
    /* Alternan cara externa e interna del arco: la silueta deja de ser una
       cuenta regular sin perder el ritmo que vende la escala. */
    const radius = ARC_R + (index % 2 === 0 ? 0.045 : -0.03);
    const cx = Math.cos(angle) * radius;
    const cy = Math.sin(angle) * radius;
    const cos = Math.cos(tilt);
    const sin = Math.sin(tilt);
    hullParts.push(
      surfaceMasked(
        placed(roundedBox(length, 0.11, 0.13, 0.02), [cx, cy, 0], [0, 0, tilt]),
        index % 2 === 0 ? CERAMIC : ALUMINUM,
      ),
    );
    /* Cuello al arco: el módulo está montado, no flotando. */
    structureParts.push(
      placed(
        new THREE.BoxGeometry(0.05, 0.09, 0.06),
        [
          (Math.cos(angle) * (ARC_R + radius)) / 2,
          (Math.sin(angle) * (ARC_R + radius)) / 2,
          0,
        ],
        [0, 0, angle - Math.PI / 2],
      ),
    );
    /* Cinco microventanas por módulo, en la cara que mira a cámara (+Z): la
       tira cálida que dice «hay personas ahí». Siguen siendo micro —cada una
       cubre poco más de un píxel a tamaño de Hero—, pero cinco en serie por
       módulo dan el parpadeo cálido que tres aisladas no llegaban a sumar. */
    for (const slot of [-0.36, -0.18, 0, 0.18, 0.36]) {
      const along = slot * length;
      windowParts.push(
        placed(
          new THREE.BoxGeometry(0.032, 0.014, 0.008),
          [cx + along * cos, cy + along * sin, 0.069],
          [0, 0, tilt],
        ),
      );
      windowCount++;
    }
  }

  /* ── 3. Espina ─────────────────────────────────────────────────────── */
  const [tipAx, tipAy] = arcEnd(ARC_START);
  const [tipBx, tipBy] = arcEnd(ARC_START + ARC_SWEEP);
  const spineLength = Math.hypot(tipBx - tipAx, tipBy - tipAy);
  const spineAngle = Math.atan2(tipBy - tipAy, tipBx - tipAx);
  const spineMid: VectorTuple = [(tipAx + tipBx) / 2, (tipAy + tipBy) / 2, 0];
  structureParts.push(
    placed(
      new THREE.BoxGeometry(spineLength, 0.055, 0.055),
      spineMid,
      [0, 0, spineAngle],
    ),
  );
  /* Regla clara sobre la espina oscura: el contraste dibuja la línea. */
  hullParts.push(
    surfaceMasked(
      placed(
        new THREE.BoxGeometry(spineLength * 0.96, 0.02, 0.02),
        [spineMid[0], spineMid[1] + 0.038, 0],
        [0, 0, spineAngle],
      ),
      CERAMIC,
    ),
  );

  /* Cuatro montantes de la espina al arco: la celosía que los une en una sola
     estructura. Caen sobre el arco por construcción —el círculo superior a esa
     x está dentro del barrido del arco. */
  for (const fraction of [0.18, 0.39, 0.61, 0.82]) {
    const baseX = tipAx + (tipBx - tipAx) * fraction;
    const baseY = tipAy + (tipBy - tipAy) * fraction;
    structureParts.push(
      strut(
        new THREE.Vector3(baseX, baseY, 0),
        new THREE.Vector3(
          baseX,
          Math.sqrt(Math.max(ARC_R * ARC_R - baseX * baseX, 0.01)),
          0,
        ),
        0.032,
      ),
    );
  }

  /* Hub central con mástil: la aguja que confirma la escala contra el vacío. */
  hullParts.push(
    surfaceMasked(
      placed(
        new THREE.CylinderGeometry(0.07, 0.085, 0.14, 12),
        [spineMid[0], spineMid[1], 0],
        [Math.PI / 2, 0, 0],
      ),
      ALUMINUM,
    ),
    surfaceMasked(
      placed(
        new THREE.TorusGeometry(0.085, 0.016, 6, 20),
        [spineMid[0], spineMid[1], 0.05],
      ),
      CERAMIC,
    ),
  );
  structureParts.push(
    placed(
      new THREE.CylinderGeometry(0.013, 0.013, 0.95, 7),
      [spineMid[0], spineMid[1] + 0.475, 0],
    ),
  );
  beaconParts.push(
    placed(
      new THREE.SphereGeometry(0.022, 7, 5),
      [spineMid[0], spineMid[1] + 0.96, 0],
    ),
  );

  /* ── 4. Alas solares ───────────────────────────────────────────────── */
  for (const side of [-1, 1]) {
    hullParts.push(
      surfaceMasked(
        placed(
          new THREE.BoxGeometry(0.58, 0.018, 0.26),
          [spineMid[0] + side * 0.93, spineMid[1] - 0.02, 0],
          [0, 0, spineAngle],
        ),
        SOLAR,
      ),
    );
    structureParts.push(
      placed(
        new THREE.BoxGeometry(0.2, 0.03, 0.03),
        [spineMid[0] + side * 0.55, spineMid[1], 0],
        [0, 0, spineAngle],
      ),
    );
  }

  /* ── 5. Arco secundario ──────────────────────────────────────────────
     Un fragmento en un plano trasero: la pieza que da paralaje interno y rompe
     la simetría que le quedaba al conjunto. Los conectores caen sobre el arco
     principal por construcción —misma dirección radial, mismo radio. */
  const SECONDARY_CENTRE: VectorTuple = [-0.28, 0.42, -0.17];
  const SECONDARY_R = 0.5;
  hullParts.push(
    surfaceMasked(
      placed(
        new THREE.TorusGeometry(SECONDARY_R, 0.032, 6, 36, 1.15),
        SECONDARY_CENTRE,
        [0, 0, 0.55],
      ),
      ALUMINUM,
    ),
  );
  for (const angle of [0.7, 1.5]) {
    const foot = new THREE.Vector3(
      SECONDARY_CENTRE[0] + Math.cos(angle) * SECONDARY_R,
      SECONDARY_CENTRE[1] + Math.sin(angle) * SECONDARY_R,
      SECONDARY_CENTRE[2],
    );
    const outward = foot.clone().setZ(0).normalize();
    structureParts.push(
      strut(
        foot,
        new THREE.Vector3(outward.x * ARC_R, outward.y * ARC_R, -0.02),
        0.026,
      ),
    );
  }

  const hullMesh = mergedMesh(hullParts, hull);
  hullMesh.name = "cooper-station-hull";
  assembly.add(hullMesh);
  const structureMesh = mergedMesh(structureParts, structure);
  structureMesh.name = "cooper-station-truss";
  assembly.add(structureMesh);
  const windowMesh = mergedMesh(windowParts, windows);
  windowMesh.name = "cooper-station-windows";
  windowMesh.renderOrder = 2;
  assembly.add(windowMesh);
  const beaconMesh = mergedMesh(beaconParts, beacons);
  beaconMesh.name = "cooper-station-beacons";
  beaconMesh.renderOrder = 2;
  assembly.add(beaconMesh);

  /* El ascensor recorre la espina: la única traslación que queda en la escena.
     Un objeto artificial moviéndose entre módulos es escala habitada, no
     escala astronómica —el mismo motivo por el que el hábitat antiguo recorría
     su órbita—, y los cuerpos siguen congelados en su trayectoria. */
  const podMesh = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.06), hull);
  podMesh.name = "cooper-station-elevator";
  podMesh.position.set(spineMid[0], spineMid[1] + 0.07, 0.02);
  assembly.add(podMesh);

  assembly.userData.cooperStationArchitecture = {
    modules: MODULE_COUNT,
    /* 35 ventanas en módulos más 3 balizas: dos puntas y mástil. */
    windows: windowCount + 3,
    panels: 2,
    arcs: 2,
    struts: 6,
  };

  return {
    root,
    materials: [hull, structure, windows, beacons],
    animate(seconds) {
      /* Vaivén de actitud subgrado más ascensor en la espina. La silueta no se
         mueve de sitio: la orientación del arco ES información —si girara, la
         apertura dejaría de significar nada— así que no hay giro propio. */
      assembly.rotation.x = Math.sin(seconds * 0.063) * 0.008;
      assembly.rotation.y = Math.sin(seconds * 0.047) * 0.01;
      podMesh.position.x = spineMid[0] + Math.sin(seconds * 0.05) * 0.55;
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
 * ── Y por qué 39° y no 25° ──────────────────────────────────────────────────
 *
 * A 25° la caja llegaba CASI DE FRENTE. Su cara trasera caía a once píxeles de
 * la delantera, así que cada arista salía duplicada en pantalla: un haz de
 * barras paralelas en vez de un volumen. A 39° la fuga mide diecisiete
 * píxeles, el techo se abre y las dos caras dejan de confundirse. Es también lo
 * que pidió dirección de forma explícita — ni casi frontal, ni de canto.
 */
const TESSERACT_BOX_HALF: VectorTuple = [1.02, 0.23, 0.95];
const TESSERACT_BOX_SECTION = 0.155;
const TESSERACT_BOX_TILT: VectorTuple = [0.6, 0.44, 0.16];
/*
  Y un giro final SOBRE EL EJE DEL TÚNEL, que es casi el eje de vista: o sea, un
  giro en el plano de la pantalla. Va aparte y va el último porque hace un
  trabajo distinto del de la inclinación, y mezclarlos en un Euler los vuelve
  imposibles de ajustar por separado.

  Lo que corrige es un fallo de la primera captura: con la caja a 25° salía un
  ROMBO —cuatro esquinas arriba, abajo y a los lados— y un rombo perfecto se lee
  como una figura plana girada, no como un volumen. Con el giro las aristas
  vuelven a caer cerca de la horizontal y la vertical, y entonces la caja se lee
  como caja. Los grados que sobran de la horizontal son los que evitan lo
  contrario: una caja perfectamente a escuadra parece un icono.
*/
const TESSERACT_BOX_ROLL = 0.55;

/** Un punto del espacio de la caja, llevado al espacio del túnel. */
function boxPoint(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x, y, z)
    .applyEuler(new THREE.Euler(...TESSERACT_BOX_TILT))
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), TESSERACT_BOX_ROLL);
}

/**
 * Los tres marcos de la recursión, de fuera hacia dentro.
 *
 * La progresión es geométrica (0.585 → 0.415 → 0.285, o sea ~0.71 por paso) y
 * eso NO es un detalle: una serie con razón constante es lo que el ojo
 * reconoce como «lo mismo, más adentro» en vez de como tres piezas distintas.
 * La dirección lo pidió literalmente —marco, otro espacio dentro, otro dentro,
 * vacío— y una razón constante es su forma numérica.
 *
 * Lo que rompe el túnel son los otros campos: cada marco gira en sentido
 * contrario al anterior (`twist`), se inclina fuera de su plano (`tilt`), se
 * sale unas centésimas del eje (`shift`) y reparte anchos distintos entre sus
 * cuatro barras (`widths`). Sin eso saldría un túnel cuadrado, que es
 * exactamente lo que la dirección prohíbe.
 *
 * Los giros son PEQUEÑOS —de 4 a 6°, unos 10° entre marcos consecutivos— y ésa
 * es la mitad difícil del ajuste. Con 7, −9 y 6 grados la diferencia entre
 * marcos llegaba a 16° y, sumada a los 21° que el conjunto ya gira contra la
 * caja, el interior dejaba de leerse como una serie: parecían dos cuadrados
 * girados sin relación. La rareza tiene que notarse y no puede tapar la
 * recursión, que es literalmente lo que pidió dirección.
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
    twist: (6 * Math.PI) / 180,
    width: 0.092,
    depth: 0.09,
    shift: [0.025, -0.018],
    tilt: [-0.04, 0.035],
    widths: [1.06, 0.95, 1.03, 0.97],
  },
  {
    halfX: 0.5,
    halfZ: 0.455,
    y: -0.16,
    twist: (-4 * Math.PI) / 180,
    width: 0.08,
    depth: 0.078,
    shift: [-0.032, 0.024],
    tilt: [0.045, -0.038],
    widths: [0.96, 1.07, 0.98, 1.04],
  },
  {
    halfX: 0.345,
    halfZ: 0.31,
    y: -0.42,
    twist: (5 * Math.PI) / 180,
    width: 0.07,
    depth: 0.068,
    shift: [0.022, 0.028],
    tilt: [-0.035, 0.06],
    widths: [1.04, 0.97, 1.06, 0.95],
  },
] as const satisfies readonly TesseractRing[];

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
 * Tesseracto: un cubo imposible que por dentro no termina.
 *
 * ── De dónde viene ──────────────────────────────────────────────────────────
 *
 * Primero fue un wireframe brillante («demo de Three.js»); después dos placas
 * torsionadas, que se dejaban entender; después siete marcos en caída con cinco
 * pórticos y cinco extensiones. Esa última fallaba por acumulación: a 55 px de
 * radio, diecisiete elementos independientes no suman arquitectura recursiva,
 * suman LÍNEAS CRUZADAS. Y las extensiones largas repartidas en cinco
 * direcciones convertían la silueta en una estrella o una antena.
 *
 * ── La regla de esta versión ────────────────────────────────────────────────
 *
 * **Menos piezas, más profundidad.** Cuatro capas y sólo cuatro:
 *
 *   1.   una CAJA exterior de vigas gruesas, que da la silueta y el volumen;
 *   2-4. tres MARCOS en progresión geométrica cayendo hacia dentro;
 *
 * y en el centro, vacío de verdad por el que pasan las estrellas.
 *
 * La complejidad va DENTRO. Fuera hay una caja de siete aristas —marco de
 * delante y techo—, un panel de suelo al fondo que le da cara y masa, y dos
 * espolones cortos que mueren dentro de la esfera de sus propias esquinas, así
 * que no tocan la silueta ni el radio publicado.
 *
 * ── Las dos contradicciones ─────────────────────────────────────────────────
 *
 * Dos fuertes y legibles, no veinte pequeñas. Una para cada distancia:
 *
 * · **La arista partida**, que es la del Hero. Uno de los cuatro lados del
 *   marco de delante se interrumpe a media altura y continúa desplazado hacia
 *   dentro y a otra profundidad: la arista se mete detrás del cuerpo y sale por
 *   donde no debía. Cambia la SILUETA, así que se lee a 55 px.
 * · **El puente que no llega**, que es la de cerca. Baja del tercer marco hacia
 *   el cuarto, se para al 58 % del camino y termina en un nodo facetado
 *   flotando en el aire. Un destello sin soporte, justo donde la barra debería
 *   continuar.
 *
 * Y un tercer detalle silencioso: la caja está girada contra el eje de la
 * recursión, así que el espacio de dentro no está alineado con lo que lo
 * contiene.
 *
 * Hubo una tercera, una viga que cruzaba el cuerpo entera y reaparecía
 * desplazada al otro lado. Se retiró: a tamaño de Hero sus dos tramos no se
 * leían como una viga rota sino como dos palos sueltos junto al cuerpo, y el
 * precio —silueta sucia— era mayor que lo que aportaba.
 *
 * ── Luz ─────────────────────────────────────────────────────────────────────
 *
 * La jerarquía luminosa lleva el ojo hacia adentro y es la mitad del diseño:
 * la caja no emite nada —sólo devuelve algún filo metálico—, y las ranuras de
 * tungsteno suben marco a marco hasta el fondo. Fuera oscuro, dentro brasa.
 *
 * Tres draws con un solo material opaco y sin texturas.
 */
function tesseractModel(input: SceneBodyInput): BodyModel {
  /*
    Un solo material opaco para todo el cuerpo: el grafito, el filo cálido, la
    oclusión de cavidad y las ranuras de tungsteno salen del mismo shader con
    la máscara de superficie. Sin transparencias, sin segundo material.
  */
  const structure = bodyMaterial(input, KIND.tesseract);
  const root = new THREE.Object3D();

  const [ring2, ring3, ring4] = TESSERACT_RINGS;
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
    el movimiento del cuerpo vive en los dos grupos interiores. Eso también
    garantiza que la deriva ambiental no pueda destruir la silueta.
  */
  const shell = mergedMesh(
    [
      /*
        La caja, incompleta a propósito — y la incompletitud está ELEGIDA, no
        repartida al azar.

        Quedan SIETE aristas de las doce, y las siete están elegidas — con la
        proyección medida, no a ojo (ver más abajo):

        · el marco de delante entero —cuatro lados, uno de ellos partido—, que
          es lo que sostiene la silueta y por tanto lo último que se toca;
        · los dos montantes del lado por el que la caja fuga en pantalla y la
          arista del fondo que los une: un TECHO POCO PROFUNDO hacia arriba y a
          la izquierda.

        Elegir el lado NO es indiferente, y costó dos capturas. La caja fuga
        hacia arriba-izquierda, así que un techo montado sobre cualquier otra
        arista se dibuja POR ENCIMA del interior en vez de por fuera: era el haz
        de barras paralelas que salía a la derecha. Montado sobre la arista
        superior, la fuga cae fuera del marco y se lee como espesor.

        Marco más techo es exactamente el dibujo que pidió dirección para la
        silueta: un rectángulo con su fuga, ancho, alto y fondo de un vistazo.
        Todo lo demás sobra, y sobra por una razón medida en captura: una caja
        completa proyecta las aristas de su cara trasera POR DENTRO de la
        delantera, justo encima de donde vive la recursión. Con doce aristas los
        tres marcos interiores competían con cuatro líneas que no eran suyas y
        el centro se volvía un enredo; con nueve seguía habiendo un haz de
        barras paralelas a la derecha. Con siete, el interior queda limpio para
        lo que tiene que verse — y la caja no cierra, que es lo que se buscaba.

        La PROFUNDIDAD de la caja también bajó, de 0.72 a 0.46, y por lo mismo:
        cuanto más honda, más lejos cae el techo de su marco y más se parecen
        las dos aristas largas a dos barras sueltas. Poco fondo se lee como
        espesor —que es lo que tiene que parecer— y deja el sitio hacia atrás
        para la recursión, que sí lo usa: los dos marcos más hondos salen por
        detrás de la caja. Lo de dentro es más profundo que lo de fuera, y eso
        también es parte del truco.
      */
      ...boxFrame(TESSERACT_BOX_HALF, TESSERACT_BOX_SECTION, [
        true,
        false,
        false,
        false,
        true,
        true,
        false,
        false,
        true,
        true,
        true,
        false,
      ]).map(tilted),
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
    EL FONDO: la cuarta capa, donde vive el calor del objeto.

    Es el marco más pequeño y el más caliente: sus ranuras de tungsteno son la
    única luz fuerte del cuerpo y están al final del recorrido, que es lo que
    lleva el ojo hacia adentro. Dentro de él no hay nada — ni núcleo, ni
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

  /* Contrato semántico de la geometría. Los tests fijan la lectura —cuántas
     capas, cuánto puente, cuánta contradicción y que el centro esté vacío— sin
     acoplarse a cada coordenada artística. */
  root.userData.tesseractArchitecture = {
    /* La caja más los tres marcos: cuatro capas y ni una más. */
    visualLayers: 1 + TESSERACT_RINGS.length,
    recursiveRings: TESSERACT_RINGS.length,
    structuralBridges: 3,
    shellExtensions: 2,
    interruptedBeams: 2,
    /* Marcos 2, 3 y 4: tres escalones de tungsteno, de fuera hacia dentro. */
    emissiveTiers: 3,
    centralVoid: true,
    closedOuterCube: false,
  };

  return {
    root,
    materials: [structure],
    /*
      DERIVA AMBIENTAL, no animación.

      El cuerpo no gira sobre su eje —`SPIN_RATE.tesseract` es cero— y en reposo
      tiene que funcionar prácticamente quieto: la identidad sale de la
      geometría, no de hacerla girar como un salvapantallas. Lo que queda son
      dos oscilaciones de ±3° y centésimas de unidad con periodos
      inconmensurables (11.3, 9.4, 13.7 y 8.2 s): los marcos medios avanzan
      mientras el fondo retrocede, así que las relaciones entre piezas se
      rehacen sin que ninguna configuración dure — y sin que la caja se mueva ni
      un grado.
    */
    animate(seconds) {
      const wave = (period: number, phase = 0) =>
        Math.sin((seconds * Math.PI * 2) / period + phase);

      mid.rotation.set(0, -0.1 + wave(11.3) * 0.055, 0);
      mid.position.set(0, wave(9.4, 1) * 0.018, 0);

      // El fondo va en contra: cuando los medios avanzan, retrocede.
      deep.rotation.set(0, 0.06 + wave(13.7, Math.PI) * 0.04, 0);
      deep.position.set(0, wave(8.2) * 0.012, 0);
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
    case "station":
      return cooperModel(input);
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
 * Una pieza puede EXCLUIRSE. El mecanismo queda para futuros detalles lejanos:
 * antes lo usaba el hábitat orbital de Cooper, que vivía a dos radios de su
 * mundo y arrastraba el blanco de clic y el rótulo hasta una mota que nadie
 * veía. Desde F1.3 la estación ES la silueta —arco, espina y paneles— y el
 * radio la mide entera, que es lo que conserva el encuadre sin tocarlo.
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
    if (node.userData.excludeFromRadius) return;
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
 * El dorso apunta al punto medio entre la cámara y Gargantúa: se ve al 70 % de
 * su área y recibe dos tercios de la luz de clave. Ése es el compromiso —ni
 * planta iluminada de canto ni tres cuartos a oscuras—, y es lo que cumple la
 * dirección de arte de que Gargantúa la ilumine de verdad.
 *
 * La proa va en el plano del dorso, hacia la derecha del cuadro: apunta a la
 * Endurance. La nave pequeña señalando a la nave grande cuenta un viaje sin
 * que nada se mueva.
 *
 * Se calcula una vez al cargar el módulo; el cuerpo ya no gira, así que esta
 * pose es toda su orientación.
 */
const RANGER_ATTITUDE = (() => {
  const top = new THREE.Vector3(0.337, 0.918, 0.229).normalize();
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
    llega oblicuo. Con la pose anterior el anillo quedaba a 60° de frontal —una
    elipse aplastada donde no cabía leer ni un brazo—; a 48° la circunferencia
    se reconoce, los cuatro brazos separan sus grupos y el núcleo sigue
    asomando por delante del plano.
  */
  if (visual === "ship") return target.set(0.3, 0.2, -0.08);
  // Cooper es un arco abierto en el plano XY mirando a +Z: se presenta de
  // frente con una ligera oblicuidad para que el arco secundario trasero dé
  // paralaje interno. La apertura queda abajo a la derecha.
  if (visual === "station") return target.set(0.38, 0.28, -0.12);
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
  /*
    CERO, como la Ranger y por el mismo motivo desde el lado contrario.

    La estación tiene apertura, proa de visita y babor: una megaestructura con
    el hueco hacia abajo que rota sobre su eje afirma que su orientación no
    significa nada, y además convierte la apertura —que es información— en
    ruido. Le quedan el vaivén subgrado y el ascensor de la espina, dentro del
    modelo. Ver `cooperModel`.
  */
  station: 0,
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
  station: 1.6,
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
  tesseract: 1.153,
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
