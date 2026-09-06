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
      /* El extremo profundo baja otro tercio (2026-09-06). Un océano sin fondo
         negro no se lee como profundo, y el fondo es lo que da la escala: si el
         agua más honda del cuerpo está a 0.078 de azul, el camino de luz sólo
         le saca tres paradas y la lectura vuelve a ser «bola azul con brillo».
         El contraste entre el agua honda y el reflejo es literalmente la única
         relación de valores que tiene este mundo. */
      albedo = mix(vec3(0.004, 0.017, 0.060), vec3(0.019, 0.086, 0.208), basin);
      /* Las bandas se pintan POCO a propósito: el dueño las pidió «muy
         sutiles», y una banda de color fuerte vuelve a leerse como nube. Lo que
         las hace visibles es la inclinación de la lámina, no el pigmento. */
      albedo = mix(albedo, vec3(0.062, 0.19, 0.376), shallow * 0.30);
      /* El acento somero es una VETA, no un continente: sale del cruce de la
         corriente con el bajío, así que sigue una dirección. */
      albedo = mix(
        albedo,
        vec3(0.126, 0.298, 0.472),
        shallow * smoothstep(0.62, 0.94, current) * 0.22
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
      /* Nube fría y apagada. Ni blanca ni cálida: es vapor sobre agua helada.
         Y pesa 0.16, no 0.26 (2026-09-06). Las masas pálidas eran el ÚNICO
         competidor del camino de luz, y a tamaño de hero competían y ganaban:
         lo primero que veía el ojo eran manchas claras sobre azul, que es la
         firma de un planeta nuboso. Bajarlas no quita meteorología —las bandas
         siguen ahí— sino que devuelve la jerarquía: el sitio más brillante del
         cuerpo tiene que ser el reflejo de Gargantúa, y sólo ése. */
      albedo = mix(albedo, vec3(0.398, 0.486, 0.588), cloudCover * 0.09);
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
      /*
        MACROFORMAS, y esto es lo que faltaba en la primera pasada.

        Subir la reflectancia hizo el hemisferio diurno visible; no lo hizo
        LEGIBLE. A la distancia del hero un planeta no se lee por su detalle
        sino por cuántas masas distintas se le distinguen, y aquí había una
        provincia grande peleándose con una escala media que la troceaba: el
        resultado era una mancha marrón con textura.

        Dos cambios y ninguno añade una llamada de ruido:

        1. **La provincia baja de 1.62 a 1.28 de frecuencia.** Menos formas y
           más grandes: cuatro masas sobre el disco en vez de siete.
        2. **La escala media deja de mandar sobre el color.** Modulaba el albedo
           un ±20 % y se comía los bordes de las provincias; ahora es ±12 % y
           trabaja de textura dentro de cada masa, que es su papel.

        Y aparece una cuarta macroforma, la CUENCA PÁLIDA: los valores bajos de
        la misma provincia, que antes se iban a umber oscuro sin más. Depósitos
        de polvo claro en el fondo de la cuenca son lo que un mundo seco tiene
        de verdad, y dan la cuarta masa que pedía la revisión. Cuesta un
        smoothstep, no un campo nuevo.
      */
      float provinces = fbm(vLocal * 1.28 + vec3(4.2, 1.1, 7.3));
      float terrain = fbm(vLocal * 4.6 + provinces * 1.9);
      float grain = noise(vLocal * 15.5);
      float pan = 1.0 - smoothstep(0.315, 0.368, provinces);
      float upland = smoothstep(0.43, 0.49, provinces);
      float plateau = smoothstep(0.52, 0.585, provinces + (terrain - 0.5) * 0.12);
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
      /* Relieve un 29 % más marcado (0.0105 → 0.0135). Lo que se pide ver en
         este cuerpo es ROCA, y la roca se lee por sombra propia: subir el
         albedo sin subir la pendiente iluminada devuelve una calcomanía más
         clara, no un planeta más seco. */
      reliefOffset = -dot(tangentSlope, lightLocal) * 0.0135 * (0.2 + upland);

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
      reliefOffset += clamp(-dot(geologicalSlope, lightLocal) * 0.028, -0.11, 0.11);

      /* Cuenca de umber, macizo rojizo, meseta de arena y provincia de hierro.
         Umbrales estrechos: bordes erosionados de roca, no algodón luminoso.

         ── Fase 1 (2026-09-05): +16 % de reflectancia en las cuatro ──────────

         La revisión mineral se pasó de frenada hacia el otro lado. Corregir un
         planeta que parecía incandescente bajando la reflectancia funciona
         hasta que el hemisferio iluminado deja de contar su material: en la
         captura, la mitad diurna se resolvía casi entera por debajo de 60 de
         luma y las cuatro provincias se leían como una sola mancha marrón.

         Las cuatro suben un 16 %, TODAS a la vez y sin tocar el tono. Eso es lo
         que hay que subrayar, porque es la diferencia entre lo que se pide y lo
         que se rechazó: aquí no vuelve el naranja: la relación entre umber,
         macizo, arena y hierro es exactamente la misma que antes, sólo que
         ocurre en un tramo de la escala donde el ojo puede verla. Un planeta
         seco y legible, no un planeta encendido. */
      albedo = mix(vec3(0.086, 0.052, 0.040), vec3(0.185, 0.104, 0.070), terrain);
      /* Cuenca de polvo claro: la macroforma que faltaba, y la más pálida del
         cuerpo. Va la primera para que las otras tres puedan pisarla. */
      albedo = mix(albedo, vec3(0.478, 0.388, 0.284), pan * 0.72);
      albedo = mix(albedo, vec3(0.458, 0.249, 0.140), upland);
      albedo = mix(albedo, vec3(0.596, 0.414, 0.248), plateau * 0.95);
      albedo = mix(albedo, vec3(0.285, 0.118, 0.070), ironMass * 0.9);
      /* Estratos erosionados de la escala media. Se desvanecen al dejar de
         resolverse; nunca sustituyen a las cuatro provincias principales. */
      float strataPhase = terrain * 48.0 + provinces * 14.0;
      float strata = sin(strataPhase);
      float strataVisible = 1.0 - smoothstep(0.7, 2.2, fwidth(strataPhase));
      albedo *= 1.0 - (0.5 + 0.5 * strata) * max(upland, pan * 0.8) * strataVisible * 0.24;
      /* +8 % de medios tonos y ni un punto de sombra. Sube el suelo del
         multiplicador, que es lo que toca la roca ya iluminada, y se deja la
         pendiente donde estaba: el terminador, los negros y el contraste entre
         provincias no se mueven. Se pidió más información en la luz, no menos
         sombra, y son dos cosas distintas. */
      albedo *= 0.95 + terrain * 0.24;

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
      albedo = mix(albedo, vec3(0.56, 0.425, 0.285), crest * crestFacing * 0.44);
      /* Y un punto menos de desaturación (0.94 → 0.975). El gris que se le
         restaba existía para evitar el planeta de fantasía; con la reflectancia
         donde estaba también se llevaba por delante la diferencia entre ocre,
         arena y hierro, que es justo lo que se pide ver. */
      float groundLuma = dot(albedo, vec3(0.2126, 0.7152, 0.0722));
      albedo = mix(vec3(groundLuma), albedo, 0.975);
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
      albedo = mix(albedo, vec3(0.082, 0.086, 0.094), seam * 0.74);
      gloss = mix(0.82, 0.26, microRoughness);
      specularPower = 62.0;
      specularStrength = 1.18;

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
        float chordwise = smoothstep(0.42, 0.5, abs(fract(vUv.y * 4.0) - 0.5));
        albedo = mix(vec3(0.300, 0.307, 0.318), vec3(0.780, 0.774, 0.758), 0.3 + smoothPlate * 0.45);
        albedo = mix(albedo, vec3(0.078, 0.083, 0.090), chordwise * 0.58);
        gloss = mix(0.5, 0.2, microRoughness);
        specularPower = 46.0;
        specularStrength = 0.82;
      } else if (vSurfaceMask > 1.5) {
        /* Tapa de servicio. Bajó de saturación: en naranja pleno eran lo
           primero que se veía de la nave, por delante de la proa. */
        albedo = mix(vec3(0.17, 0.075, 0.03), vec3(0.62, 0.31, 0.10), smoothPlate);
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
    if (uKind == 0) {
      diffuse = day * limb * (0.10 + 0.90 * pow(max(shadedNdl, 0.0), 0.55));
    }
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
    if (uKind == 0) nightFloor = 0.32;
    if (uKind == 1) nightFloor = 0.22;
    if (uKind == 4) nightFloor = 0.26;
    if (uKind == 5) nightFloor = 0.44;
    if (uKind == 2 || uKind == 7) nightFloor = 0.4;
    float nightFill = mix(nightFloor, 1.0, day);
    /* El Tesseracto no hereda el tinte azul del cielo. Su sombra conserva una
       reflexión neutra-cálida de acero ennegrecido; toda temperatura visible
       procede del mismo disco ámbar que ilumina el resto del sistema. */
    /* Y Edmunds tampoco hereda el azul entero del cielo. Es roca seca sin
       océano ni nube: lo que rebota en su cara noche es medio grado más cálido
       y bastante más flojo que el relleno común. El lavado azul que le cubría
       casi medio disco salía de aquí y de los dos filos de más abajo, no de la
       clave — por eso subir el albedo sin tocar esto no lo habría arreglado. */
    vec3 materialFill = uKind == 2
      ? vec3(0.024, 0.022, 0.019)
      : (uKind == 1 ? vec3(0.024, 0.025, 0.035) : fill);
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
      color += albedo * key * terminatorBand * (uKind == 1 ? 0.075 : 0.09);
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
      float oceanSeat = exp(-(alongOff2 * 1.7 + acrossOff2 * 22.0))
                      * gloss * day * waterGain;
      /* Más larga y más estrecha (2026-09-06): 7.5 → 6.4 a lo largo y 265 → 330
         a lo ancho. Un CAMINO de luz, no una mancha alargada — es la diferencia
         entre ver el reflejo de una fuente sobre agua y ver una nube con
         forma. La energía que pierde de ancho la recupera de peso. */
      float oceanSheet = exp(-(alongOff2 * 6.4 + acrossOff2 * 290.0))
                       * gloss * day * waterGain;
      float oceanGlint = exp(-(alongOff2 * 26.0 + acrossOff2 * 520.0))
                       * millerGlitterMask * day * mix(0.86, 1.34, waterFresnel);
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
      color += mix(key, vec3(0.34, 0.56, 0.88), 0.58)
             * oceanSeat * (0.3 + millerBands * 1.2) * 0.115;
      color += mix(key, vec3(0.42, 0.62, 0.92), 0.22) * oceanSheet * 0.66;
      color += mix(vec3(1.0, 0.92, 0.78), vec3(0.66, 0.86, 1.0), 0.3)
             * oceanGlint * 0.60;

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
      /* Más fino y más concentrado: exponente 11 → 14 y puerta desplazada, así
         que el arco vive sólo donde de verdad hay atmósfera atravesada por la
         luz. Lo que gana en peso (0.55 → 0.95) no lo gana en extensión — que es
         la diferencia entre una línea de aire y un halo. */
      float limbArc = pow(1.0 - max(dot(normal, view), 0.0), 14.0);
      float airLit = smoothstep(0.26, 0.94, ndl);
      color += vec3(0.62, 0.46, 0.30) * limbArc * airLit * uLightIntensity * 0.95;
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
    /* El filo cálido de Edmunds valía un 12 % del común —o sea, casi nada— y
       ésa era la mitad del problema: un planeta cuya única luz es un disco de
       acreción tenía menos relación visible con él que cualquier casco. Sube a
       0.34 con la puerta bajada, así que el borde que mira a Gargantúa se
       enciende de verdad. Sigue por debajo de un tercio del rim común: no es
       un contorno naranja, es el arco que cuenta de dónde viene la luz. */
    if (uKind == 1) warmRim *= 0.52 * smoothstep(0.08, 0.66, ndl);
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
    float commonRim = uKind == 4 ? 0.62 : (uKind == 0 ? 0.07 : 0.18);
    color += key * warmRim * (uKind == 2 ? tesseractRim : commonRim);
    /*
      Y el relleno de canto tampoco es igual para todos dentro del Tesseracto.
      Este término levanta el borde de CUALQUIER pieza mire donde mire, así que
      es el que más trabajaba en contra del marco trasero: por muy negro que sea
      su albedo, un canto levantado por igual lo devolvía al mismo plano que la
      caja de delante y el fondo dejaba de leerse como fondo.
    */
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
    float fillRim = uKind == 2 && vSurfaceMask > 4.5
      ? 0.26
      : (uKind == 1 ? 0.11 : (uKind == 0 ? 0.13 : 0.32));
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

      · focusTint — cuánto cian aguanta el cuerpo sin dejar de ser él. Los
        tres que ya vivían cerca de la paleta de navegación (agua, baliza y el
        ámbar propio del Tesseracto) lo conservan entero.
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
    vec3 focusColor = uKind == 2 ? vec3(1.0, 0.64, 0.34) : uNavigation;
    float focusTint = 1.0;
    float focusGain = 0.0;
    float focusEdge = 0.0;
    if (uKind == 1) { focusTint = 0.08; focusGain = 0.16; focusEdge = 0.11; }
    if (uKind == 4) { focusTint = 0.16; focusGain = 0.15; focusEdge = 0.30; }
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
 * la escribió; la poda, que es transversal, sí. Ocho está por encima de las
 * cinco máscaras del Tesseracto, que es el que más usa.
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
  /* El emisivo pasa a mezcla ADITIVA. Sin ella la pluma sería un cono opaco
     con un borde dibujado; con ella, y sin escribir profundidad, se suma sobre
     lo que haya detrás y se deshace en el negro. Las balizas no cambian de
     aspecto —emisivo puro sobre fondo oscuro suma igual que sustituye— y el
     batch sigue siendo uno solo porque el material declara `forceSinglePass`. */
  const lights = bodyMaterial(input, EMISSIVE_KIND, {
    accent: input.secondary,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    /* Pulsado, y es la diferencia de CARÁCTER con la Ranger. Un anillo de
       ciento y pico metros no viaja empujando: mantiene su orientación con
       impulsos cortos y espaciados. Dos antorchas permanentes decían lo
       contrario — que la nave está acelerando— y eso no es lo que hace. */
    pulsed: true,
  });
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

  /* ── Maniobra: cuatro toberas EN EL BORDE DEL ARO ──────────────────────────

     La primera versión las puso sobre el barril, y era la respuesta equivocada
     a la pregunta correcta. La pregunta —dónde caben unos propulsores que se
     vean— sigue estando bien planteada: la actitud de esta nave está medida y
     su proa da 0.645 con la cámara y −0.897 con Gargantúa, así que las cuatro
     campanas principales quedan enteramente detrás Y enteramente iluminadas.
     Invisibles las dos cosas; una brasa dentro de ellas sería geometría muerta.

     Lo que fallaba era la respuesta. Ocho toberas diminutas sobre el barril se
     perdían por dos motivos a la vez: son pequeñas, y están en la zona más
     ocupada del modelo — un punto de luz entre módulos, brazos y rieles es un
     píxel más. Y una pluma que sale del barril apunta hacia la cámara, donde
     el escorzo la convierte en una mancha redonda.

     El borde del aro resuelve las tres cosas:

     · **Se ve.** Contra negro, fuera de la silueta, sin nada alrededor.
     · **La pluma se despliega A LO ANCHO** en vez de venir de frente, porque
       sale casi tangente al aro. Es la diferencia entre leer una estela y ver
       un borrón.
     · **Es lo que haría una nave así.** El par de actitud de un anillo se da en
       el radio máximo; poner el control de actitud en el eje es tirar palanca.

     Van entre grupos, en los 46° de riel desnudo, para no pelearse con los
     radiadores. Cuatro toberas, y sólo DOS encendidas y opuestas: eso es un
     par puro, o sea una nave corrigiendo su giro. Con las cuatro a la vez no
     está maniobrando, está decorada. */
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

    if (index % 2 !== 0) return;

    /* Garganta y pluma del par activo. La rampa de máscara va sobre el eje X
       local de la geometría, así que la pluma se construye a lo largo de X y se
       gira después: `surfaceRamp` mide sobre coordenadas ya horneadas, y
       hornear la rotación primero haría que la rampa cruzara la pluma en
       diagonal. Se ramplea antes de colocar. */
    const throat = 0.14;
    const tip = 0.44;
    const plume = surfaceRamp(
      new THREE.CylinderGeometry(0.084, 0.034, tip - throat, 10, 1, true)
        .rotateZ(-Math.PI / 2)
        .translate((throat + tip) / 2, 0, 0),
      "x",
      throat,
      tip,
      PLUME_MASK,
    );
    lightParts.push(
      surfaceMasked(
        placed(
          new THREE.CircleGeometry(0.030, 9),
          [baseX + fireX * 0.142, baseY + fireY * 0.142, 0],
          [0, fire + Math.PI / 2, 0],
        ),
        1,
      ),
      placed(plume, [baseX, baseY, 0], [0, 0, fire]),
    );
  });

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
    /* Fase 1: propulsión visible. Cuatro grupos de maniobra de dos toberas cada
       uno sobre el barril, y las cuatro campanas principales con brasa dentro.
       Van en el contrato porque son lectura, no adorno: son lo que distingue una
       nave EN SERVICIO de una maqueta bien iluminada. */
    manoeuvringPods: 4,
    manoeuvringNozzles: 4,
    firingNozzles: 2,
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

/** Architectural corridor inspired by the owner's 2026-09-06 reference.
 * Its envelope is open and interlocked; seven connected thresholds converge
 * into an empty aperture. Four batches share the existing graphite shader. */
function tesseractModel(input: SceneBodyInput): BodyModel {
  const structure = bodyMaterial(input, KIND.tesseract);
  const root = new THREE.Object3D();
  const point = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const shellParts: THREE.BufferGeometry[] = [];
  const midParts: THREE.BufferGeometry[] = [];
  const deepParts: THREE.BufferGeometry[] = [];
  const thresholdParts: THREE.BufferGeometry[] = [];

  const corners = (hx: number, hz: number, y: number, twist: number, dx = 0, dz = 0) =>
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) =>
      point(x * hx, 0, z * hz)
        .applyAxisAngle(point(0, 1, 0), twist)
        .add(point(dx, y, dz)),
    );
  const portal = (
    target: THREE.BufferGeometry[], pts: THREE.Vector3[], width: number,
    mask: number, openSide = -1,
  ) => {
    for (let edge = 0; edge < 4; edge++) {
      const a = pts[edge];
      const b = pts[(edge + 1) % 4];
      if (edge === openSide) {
        target.push(surfaceMasked(strut(a, a.clone().lerp(b, 0.36), width), mask));
        target.push(surfaceMasked(strut(a.clone().lerp(b, 0.56), b, width), mask));
      } else {
        target.push(surfaceMasked(strut(a, b, width * (edge % 2 ? 1 : 0.82)), mask));
      }
    }
  };

  // Two staggered structural bays, plus a transverse incomplete bay. They
  // show front, side and rear surfaces instead of closing a perfect cube.
  const front = corners(0.98, 1.12, 0.30, -0.08, -0.035, 0.025);
  const rear = corners(1.04, 1.02, -0.48, 0.19, 0.06, -0.035);
  portal(shellParts, front, 0.15, 0, 0);
  portal(shellParts, rear, 0.09, 5, 2);
  for (let corner = 0; corner < 4; corner++) {
    shellParts.push(surfaceMasked(strut(front[corner], rear[corner], 0.075), 5));
  }
  // The reference's long planes: broad dark faces framed by narrow highlights.
  shellParts.push(surfaceMasked(placed(new THREE.BoxGeometry(0.22, 0.66, 1.58), [-0.99, -0.02, 0.10], [0.04, -0.08, 0.05]), 5));
  shellParts.push(surfaceMasked(placed(new THREE.BoxGeometry(1.36, 0.53, 0.12), [0.14, -0.10, 1.04], [-0.06, 0.10, 0]), 0));

  // Cantilevered L shapes cross the shell and continue beyond its edges.
  // No radial spikes: each extension belongs to a recognisable structural bay.
  const wings = [
    [point(-1.54, 0.08, -0.35), point(-0.74, 0.08, -0.35), point(-0.74, -0.49, -1.12)],
    [point(1.53, -0.20, 0.28), point(0.71, -0.20, 0.28), point(0.71, 0.38, 1.18)],
    [point(-0.24, -0.37, -1.48), point(0.38, -0.37, -1.48), point(0.38, 0.29, -0.76)],
    [point(0.20, 0.26, 1.49), point(-0.42, 0.26, 1.49), point(-0.42, -0.41, 0.84)],
  ];
  for (const [a, b, c] of wings) {
    shellParts.push(surfaceMasked(strut(a, b, 0.085), 0));
    shellParts.push(surfaceMasked(strut(b, c, 0.067), 5));
  }

  const sizes = [0.81, 0.635, 0.492, 0.377, 0.283, 0.205, 0.142];
  const levels = sizes.map((size, i) => corners(
    size, size * 1.08, 0.20 - i * 0.19,
    (i % 2 ? -0.045 : 0.035),
    0.012 * Math.sin(i * 1.2), 0.008 * Math.cos(i),
  ));
  for (let i = 0; i < levels.length; i++) {
    const target = i < 3 ? midParts : i < 5 ? deepParts : thresholdParts;
    const mask = i < 2 ? 2 : i < 3 ? 3 : i < 5 ? 4 : 4.25;
    portal(target, levels[i], Math.max(0.021, 0.059 - i * 0.006), mask);
    // Raking rails join corresponding corners; never cross the central void.
    const previous = i === 0 ? front : levels[i - 1];
    for (const corner of [0, 2]) {
      target.push(surfaceMasked(strut(previous[corner], levels[i][corner], Math.max(0.014, 0.035 - i * 0.003)), i < 3 ? 2 : 3));
    }
  }

  const shell = mergedMesh(shellParts, structure);
  shell.name = "tesseract-shell";
  root.add(shell);
  const mid = new THREE.Object3D();
  const deep = new THREE.Object3D();
  const threshold = new THREE.Object3D();
  const groups = [mid, deep, threshold];
  const parts = [midParts, deepParts, thresholdParts];
  const names = ["tesseract-mid-frames", "tesseract-deep-frames", "tesseract-threshold"];
  groups.forEach((group, i) => {
    const mesh = mergedMesh(parts[i], structure);
    mesh.name = names[i];
    group.add(mesh);
    root.add(group);
  });

  // Preserve the destination's occupied volume; only its internal architecture
  // changes. Normalise actual shell vertices, not an inflated bounding sphere.
  const vertices = shell.geometry.getAttribute("position");
  let shellRadius = 0;
  const vertex = new THREE.Vector3();
  for (let i = 0; i < vertices.count; i++) {
    shellRadius = Math.max(shellRadius, vertex.fromBufferAttribute(vertices, i).length());
  }
  const unitScale = 1.56 / shellRadius;
  root.traverse((node) => {
    if (node instanceof THREE.Mesh) node.geometry.scale(unitScale, unitScale, unitScale);
  });
  root.userData.tesseractArchitecture = {
    visualLayers: 9, recursiveRings: 7, structuralBridges: 14,
    shellExtensions: 4, interruptedBeams: 2, emissiveTiers: 4,
    rearFrame: true, depthRails: 4, sidePanels: 2,
    centralVoid: true, closedOuterCube: false,
  };

  return {
    root,
    materials: [structure],
    animate(seconds) {
      const wave = (period: number, phase = 0) => Math.sin(seconds * Math.PI * 2 / period + phase);
      // Oscillation, never accumulating spin. The shell is absolutely still.
      mid.rotation.set(wave(12.7, 0.6) * 0.035, 0.02 + wave(10.7) * 0.12, wave(14.3, 2.2) * 0.028);
      mid.position.set(wave(13.9) * 0.018, wave(9.4, 1) * 0.035, wave(11.9, 1.1) * 0.016);
      mid.scale.set(1 + wave(10.7, 0.7) * 0.045, 1, 1 - wave(10.7, 0.7) * 0.035);
      deep.rotation.set(wave(11.1, 2.4) * 0.055, -0.05 + wave(8.9, Math.PI) * 0.19, wave(13.7, 1.1) * 0.045);
      deep.position.set(wave(12.3, 2) * 0.02, wave(8.2) * 0.035, wave(10.1) * 0.018);
      deep.scale.set(1 + wave(8.9, 2.3) * 0.055, 1, 1 - wave(8.9, 2.3) * 0.04);
      threshold.rotation.set(wave(9.7, 0.7) * 0.025, 0.04 + wave(7.3, 2.1) * 0.24, wave(11.3, 2) * 0.02);
      threshold.position.set(wave(9.1, 1.7) * 0.008, wave(7.9) * 0.025, wave(10.9) * 0.007);
      threshold.scale.setScalar(1 + wave(7.3, 2.8) * 0.055);
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
    /* Bloque de maniobra de proa. Va en estructura —metal oscuro— para que la
       brasa que lleva encima tenga contra qué leerse: un punto de luz sobre
       chapa clara es una mota, sobre chapa oscura es una tobera. */
    ...[-1, 1].map((side) =>
      placed(
        new THREE.BoxGeometry(0.10, 0.055, 0.05),
        [0.42, 0.05, side * 0.125],
      ),
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
      placed(new THREE.SphereGeometry(0.021, 7, 5), [-0.2, -0.042, WING_SPAN + 0.02]),
      placed(new THREE.SphereGeometry(0.021, 7, 5), [-0.2, -0.042, -WING_SPAN - 0.02]),
      placed(new THREE.SphereGeometry(0.019, 7, 5), [0.75, 0.025, 0]),
      ...[-1, 1].map((side) =>
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
      ...[-1, 1].map((side) =>
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
      ...[-1, 1].map((side) =>
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
