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
  varying vec3 vNormalW;
  varying vec3 vPositionW;
  varying vec3 vLocal;

  void main() {
    vLocal = position;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPositionW = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
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

  varying vec3 vNormalW;
  varying vec3 vPositionW;
  varying vec3 vLocal;

  /* Ruido de valor barato. No hay ni una textura en toda la escena: el
     presupuesto de red del plan es de 1,2 MB para texturas y aquí se gasta 0. */
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

    /*
      El TERMINADOR es lo que hace que una esfera parezca un mundo.

      El primer intento usaba lambert crudo más una envolvente ancha: el
      resultado era una bola uniformemente iluminada, sin cara noche, y eso es
      exactamente el aspecto «de plástico». Lo que se lee a esta distancia es la
      silueta, la media luna encendida y el filo de atmósfera. Todo el
      presupuesto de shader va ahí.
    */
    float day = smoothstep(-0.08, 0.34, ndl);
    /* Oscurecimiento de limbo: el borde del disco iluminado cae un poco. */
    float limb = 0.55 + 0.45 * pow(max(dot(normal, view), 0.0), 0.4);
    float diffuse = day * limb;
    float fresnel = pow(1.0 - max(dot(normal, view), 0.0), 3.0);

    /* Ámbar del disco para la clave; azul tenue del fondo estelar para el
       relleno, que es lo que impide que la cara noche sea un agujero recortado. */
    vec3 key = vec3(1.0, 0.84, 0.62) * uLightIntensity;
    /* Relleno del cielo estelar. Sube con el campo de estrellas: si el fondo
       tiene más luz, la cara noche recibe más rebote — bajarlo sería pintar
       cuerpos recortados sobre un cielo que ya no es negro. */
    vec3 fill = vec3(0.078, 0.101, 0.181);

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

    if (uKind == 0) {
      /* Miller: mundo oceánico. Bandas de nube sobre agua profunda. */
      float weather = fbm(vLocal * 3.4 + vec3(0.0, uTime * 0.02, 0.0));
      float stormBands = 0.5 + 0.5 * sin(vLocal.y * 17.0 + weather * 4.5);
      float ocean = fbm(vLocal * 2.1);
      float cloudCover = smoothstep(0.63, 0.82, weather * 0.72 + stormBands * 0.28);
      albedo = mix(vec3(0.012, 0.075, 0.18), vec3(0.045, 0.25, 0.35), ocean * 0.78);
      albedo = mix(albedo, vec3(0.55, 0.68, 0.76), cloudCover * 0.5);
      gloss = mix(0.88, 0.16, cloudCover);
      specularPower = 31.0;
      specularStrength = 1.02;
      /* Un mundo de agua tiene aire, y ese filo azul es la mitad de la lectura. */
      atmosphere = vec3(0.26, 0.54, 0.88);
      atmosphereWeight = 1.1;
    } else if (uKind == 1) {
      /*
        Edmunds: cobre, relieve y una capa de polvo alta. Dos escalas de terreno
        rompen la lectura de «bola marrón» sin acercarlo a una Tierra: continentes
        minerales grandes, crestas secas y haze parcial que deriva casi quieto.
      */
      float continents = fbm(vLocal * 1.75 + vec3(4.2, 1.1, 7.3));
      float terrain = fbm(vLocal * 5.4 + continents * 1.3);
      float ridges = 1.0 - abs(fbm(vLocal * 9.2) * 2.0 - 1.0);
      float haze = smoothstep(
        0.58,
        0.78,
        fbm(vLocal * 2.65 + vec3(uTime * 0.0025, 8.0, 2.0))
      );

      /* Depósitos minerales: la cuarta escala, fina y de alto contraste. Es la
         que impide que el planeta se lea como una textura uniforme al girar. */
      float veins = smoothstep(0.52, 0.74, fbm(vLocal * 13.5 + continents));
      /* Casquetes: no nieve, sales heladas. Rompen la monotonía del cobre y dan
         un eje visible — sin polos, una esfera girando no tiene norte. */
      float polar = smoothstep(0.62, 0.93, abs(vLocal.y));

      albedo = mix(vec3(0.19, 0.075, 0.04), vec3(0.62, 0.30, 0.13), continents);
      albedo = mix(albedo, vec3(0.83, 0.5, 0.24), terrain * 0.62);
      albedo = mix(albedo, vec3(0.95, 0.72, 0.49), ridges * terrain * 0.26);
      albedo = mix(albedo, vec3(0.34, 0.17, 0.11), veins * 0.3);
      albedo = mix(albedo, vec3(0.78, 0.56, 0.4), haze * 0.26);
      albedo = mix(albedo, vec3(0.86, 0.85, 0.83), polar * 0.55);
      gloss = 0.07 + haze * 0.04 + polar * 0.2;
      specularPower = 26.0;
      atmosphere = vec3(1.0, 0.61, 0.34);
      atmosphereWeight = 0.95;
    } else if (uKind == 2) {
      /*
        Tesseracto: no es un planeta ni una nave, es una retícula.

        Como cubo sólido se leía a lo lejos como un cuadrado marrón — el objeto
        que peor funcionaba de los seis. Ahora la malla son sus ARISTAS, y este
        material solo tiene que hacerlas brillar. Una estructura que se
        reconoce por su dibujo, no por su superficie.
      */
      albedo = vec3(0.0);
      // Ámbar puro, no mezclado: mezclar el acento con el secundario daba un
      // blanco lavado que a este tamaño no se distinguía de una estrella.
      // La oscilación baja de ±27 % cada 8 s a ±12 % cada 24 s: la retícula
      // respira en vez de titilar.
      emissive = uAccent * (2.6 + 0.30 * sin(uTime * 0.26));
      gloss = 0.0;
    } else if (uKind == 3) {
      /*
        Cooper: planeta inventado, frío y ordenado. Las bandas son atmosféricas,
        no una copia de Saturno; el calor aparece sólo donde Gargantúa lo toca.
      */
      float weather = fbm(vLocal * 3.1 + vec3(0.0, uTime * 0.003, 0.0));
      float latitude = 0.5 + 0.5 * cos(vLocal.y * 13.0 + weather * 1.8);
      albedo = mix(vec3(0.055, 0.10, 0.15), vec3(0.24, 0.36, 0.43), weather);
      albedo = mix(albedo, vec3(0.42, 0.49, 0.52), latitude * 0.22);
      gloss = 0.24;
      specularPower = 34.0;
      atmosphere = vec3(0.31, 0.66, 0.78);
      atmosphereWeight = 0.9;
      /*
        Sombra del plano de anillos. No requiere shadow map y es lo que hace que
        planeta y anillos pertenezcan al mismo objeto en vez de ser dos piezas
        superpuestas. Se ensancha un poco y gana un núcleo más oscuro: con la
        franja anterior, apenas contenida, el anillo parecía pegado encima.
      */
      float ringOcclusion = 1.0 - smoothstep(0.045, 0.23, abs(vLocal.y));
      materialOcclusion = 1.0 - ringOcclusion * day * 0.42;
    } else if (uKind == 4) {
      /*
        Endurance: mantas térmicas y panel pintado, no metal cromado.

        La nave de la película comparte lenguaje con la ISS: blanco roto,
        costuras anchas, recesos grises y variación de roughness. A la escala
        del Hero las costuras finas sólo producen moiré, así que el patrón
        trabaja en bloques grandes y deja que la silueta cuente los módulos.
      */
      float blanket = panels(vLocal * 1.35, 1.05);
      float quilt = fbm(vLocal * 4.2 + vec3(2.7, 0.8, 5.1));
      albedo = mix(vec3(0.39, 0.40, 0.40), vec3(0.84, 0.83, 0.79), blanket * 0.66);
      albedo *= 0.92 + quilt * 0.15;
      gloss = 0.24 + blanket * 0.07;
      specularPower = 34.0;
      specularStrength = 0.66;
    } else if (uKind == 5) {
      /* Ranger: lifting body blanco con vientre oscuro separado en geometría. */
      float plates = panels(vLocal * 1.55, 1.0);
      float blanket = fbm(vLocal * 4.6 + vec3(4.0, 1.2, 0.5));
      albedo = mix(vec3(0.28, 0.31, 0.35), vec3(0.69, 0.72, 0.73), plates * 0.58);
      albedo *= 0.92 + blanket * 0.14;
      gloss = 0.4;
      specularPower = 42.0;
      specularStrength = 0.82;
    } else if (uKind == 6) {
      /*
        Anillos de Cooper: bandas minerales finas y semitransparentes.

        La novedad es la variación ANGULAR. Con bandas puramente concéntricas el
        anillo es axisimétrico, y un objeto axisimétrico girando sobre su eje es
        indistinguible de un objeto quieto — literalmente no hay movimiento que
        ver. Un grumo suave en φ, que además se desfasa con el radio, hace que la
        rotación exista en pantalla sin dibujar manchas.
      */
      float ringRadius = length(vLocal.xy);
      float ringAngle = atan(vLocal.y, vLocal.x);
      float bands = 0.5 + 0.5 * cos((ringRadius - 0.82) * 74.0);
      float clumps = 0.78 + 0.22 * sin(ringAngle * 5.0 + ringRadius * 17.0);
      /* La división: un hueco limpio entre el anillo interior y el exterior. */
      float gap = smoothstep(0.988, 1.012, ringRadius)
                * (1.0 - smoothstep(1.048, 1.072, ringRadius));
      float bandMask = smoothstep(0.16, 0.72, bands) * clumps * (1.0 - gap);
      if (bandMask < 0.07) discard;
      albedo = mix(vec3(0.17, 0.21, 0.25), vec3(0.58, 0.59, 0.56), bandMask);
      emissive = key * abs(ndl) * bandMask * 0.13;
      gloss = 0.34;
      outputAlpha = 0.24 + bandMask * 0.56;
    } else if (uKind == 7) {
      /* Trusses, ejes y hábitat: el mismo metal oscuro en todo el sistema. */
      float structure = panels(vLocal * 1.35, 1.0);
      albedo = mix(vec3(0.095, 0.11, 0.14), vec3(0.31, 0.33, 0.37), structure * 0.36);
      gloss = 0.58;
      specularPower = 52.0;
    } else if (uKind == 9) {
      /* Paneles de servicio de Endurance: naranja quemado, muy localizado. */
      float serviceWear = fbm(vLocal * 5.2 + vec3(1.1, 7.0, 3.4));
      albedo = mix(vec3(0.18, 0.075, 0.025), uAccent * 0.72, 0.55 + serviceWear * 0.22);
      gloss = 0.24;
      specularPower = 30.0;
      specularStrength = 0.62;
    } else {
      /* Luces de navegación y núcleo del Tesseracto: geometría, no halo global. */
      float pulse = 0.94 + 0.06 * sin(uTime * 0.55);
      albedo = vec3(0.0);
      emissive = uAccent * (2.75 + uFocus * 0.55) * pulse;
      gloss = 0.0;
    }

    /*
      El tesseracto sale por aquí y no toca nada más.

      Su malla son aristas (EdgesGeometry), que NO traen atributo de normal:
      todo lo que sigue —difuso, especular, fresnel, atmósfera— saldría NaN y
      pintaría basura. Y tampoco tendría sentido: una retícula no tiene cara
      iluminada, solo brilla.
    */
    if (uKind == 2 || uKind == 8) {
      gl_FragColor = vec4(emissive + uNavigation * uFocus * 0.75, 1.0);
      return;
    }

    vec3 color = albedo * (key * diffuse * materialOcclusion + fill);

    /* Especular del disco: una banda estrecha, no un punto de estudio.
       Ojo con el nombre de la variable: half es palabra reservada en GLSL. */
    vec3 halfVec = normalize(toLight + view);
    float specBase = max(dot(normal, halfVec), 0.0);
    float spec = pow(specBase, specularPower) * gloss * day * materialOcclusion;
    color += key * spec * specularStrength;

    /* Miller refleja una fuente EXTENSA: además del filo especular estrecho hay
       una lámina de luz más ancha sobre el océano. Las nubes ya bajan el brillo,
       así que la lectura sigue siendo agua y no una bola cromada. */
    if (uKind == 0) {
      float oceanSheen = pow(specBase, 11.0) * gloss * day;
      color += mix(key, vec3(0.45, 0.68, 1.0), 0.28) * oceanSheen * 0.26;
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
      Metales: una segunda reflexión, ancha y fría.

      El disco es una fuente ENORME, así que un casco metálico no devuelve sólo
      el filete especular estrecho: devuelve también una lámina suave que barre
      la superficie según gira. Sin ella, una nave metálica girando se ve como
      una silueta gris rotando —el giro no tiene nada a lo que agarrarse— y ése
      era justo el motivo de que la Endurance pareciera la única viva.
    */
    if (uKind == 4 || uKind == 5 || uKind == 7) {
      float sheen = pow(specBase, 6.0) * gloss * day;
      float coldRim = pow(1.0 - max(dot(normal, view), 0.0), 2.6)
                    * smoothstep(0.25, -0.55, ndl);

      if (uKind == 4) {
        /* Endurance no es azul: el fill frío sólo separa su canto. La manta
           conserva un rebote casi neutro como en la miniatura de producción. */
        color += albedo * vec3(0.048, 0.046, 0.042);
        color += mix(key, vec3(0.72, 0.75, 0.80), 0.22) * sheen * 0.24;
        color += vec3(0.18, 0.22, 0.30) * coldRim * 0.22;
      } else {
        color += mix(key, vec3(0.62, 0.76, 1.0), 0.42) * sheen * 0.3;
        /* Contraluz del campo estelar en el canto opuesto: separa el casco del
           negro por el lado que la clave no toca. */
        color += vec3(0.30, 0.42, 0.72) * coldRim * 0.34;
      }
    }

    /* Borde encendido por el disco, para todo lo demás: es lo que separa al
       cuerpo del fondo negro sin dibujarle un contorno. */
    float warmRim = fresnel * smoothstep(-0.25, 0.42, ndl);
    color += key * warmRim * 0.18;
    color += fill * fresnel * 0.32;
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
    color += uNavigation * uFocus * (0.032 + fresnel * 0.44);

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
  return new THREE.ShaderMaterial({
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
    },
  });
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
 * Endurance de Interstellar: silueta cinematográfica traducida a tiempo real.
 *
 * ── Qué fallaba en la versión anterior ──────────────────────────────────────
 *
 * La reconstrucción anterior tenía doce radios, dos toros y una espina. En el
 * frame se comprimía en una cruz: grande, pero ajena a la nave de la película.
 *
 * ── Lo que la hace legible ahora ────────────────────────────────────────────
 *
 * 1. **Doce cápsulas separadas.** El vacío entre módulos es parte de la forma.
 * 2. **Un solo spoke.** El gran centro vacío deja de parecer una rueda.
 * 3. **Full stack.** Dos Ranger y dos Lander cargan el hub compacto.
 * 4. **Cuatro bloques de motor.** Sus doce campanas cuentan ingeniería real.
 *
 * Cuatro draws: manta/panel, estructura, servicio y balizas. El detalle vive en
 * geometría fusionada, no en un kitbash de objetos independientes.
 */
function enduranceModel(input: SceneBodyInput): BodyModel {
  const hull = bodyMaterial(input, KIND.ship);
  const structure = bodyMaterial(input, STRUCTURE_KIND);
  const service = bodyMaterial(input, ENDURANCE_SERVICE_KIND, {
    accent: "#c0793d",
  });
  const lights = bodyMaterial(input, EMISSIVE_KIND, { accent: input.secondary });
  const root = new THREE.Object3D();

  const MODULES = 12;
  const RING = 0.78;
  const MODULE_RADIAL = 0.36;
  const MODULE_TANGENTIAL = 0.25;
  const MODULE_DEPTH = 0.22;
  const STEP = (Math.PI * 2) / MODULES;
  const ENGINE_MODULES = new Set([2, 4, 8, 10]);
  const LANDING_MODULES = new Set([1, 5, 7, 11]);
  const HABITAT_MODULES = new Set([0, 6]);

  const hullParts: THREE.BufferGeometry[] = [];
  const structureParts: THREE.BufferGeometry[] = [
    // Hub multipuerto compacto. El vacío central sigue dominando la lectura.
    placed(
      new THREE.CylinderGeometry(0.135, 0.135, 0.18, 12),
      [0, 0, 0],
      [Math.PI / 2, 0, 0],
    ),
    new THREE.TorusGeometry(0.17, 0.024, 5, 18),
    // Collars del único spoke, que se dibuja en manta clara más abajo.
    placed(
      new THREE.CylinderGeometry(0.064, 0.064, 0.055, 10),
      [0.18, 0, 0],
      [0, 0, -Math.PI / 2],
    ),
    placed(
      new THREE.CylinderGeometry(0.064, 0.064, 0.055, 10),
      [0.59, 0, 0],
      [0, 0, -Math.PI / 2],
    ),
  ];
  hullParts.push(
    // Casco claro del hub: pequeño frente al vacío, pero visible en el frame.
    placed(
      new THREE.CylinderGeometry(0.155, 0.155, 0.12, 12),
      [0, 0, 0],
      [Math.PI / 2, 0, 0],
    ),
    placed(
      new THREE.CylinderGeometry(0.048, 0.055, 0.6, 9),
      [0.38, 0, 0],
      [0, 0, -Math.PI / 2],
    ),
  );
  const serviceParts: THREE.BufferGeometry[] = [];
  const lightParts: THREE.BufferGeometry[] = [
    placed(new THREE.SphereGeometry(0.022, 8, 6), [0, 0.19, 0.07]),
    placed(new THREE.SphereGeometry(0.022, 8, 6), [0, -0.19, 0.07]),
  ];

  for (let index = 0; index < MODULES; index++) {
    // Índice 0 = las 12; sentido horario como el diagrama de producción.
    const angle = Math.PI / 2 - index * STEP;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const moduleDepth = LANDING_MODULES.has(index) ? 0.25 : MODULE_DEPTH;
    const moduleTangential = HABITAT_MODULES.has(index)
      ? 0.28
      : MODULE_TANGENTIAL;

    // Cápsulas radiales independientes. Los huecos entre ellas son parte del
    // modelo, no líneas pintadas sobre un aro continuo.
    hullParts.push(
      placed(
        roundedBox(MODULE_RADIAL, moduleTangential, moduleDepth, 0.025),
        [cos * RING, sin * RING, 0],
        [0, 0, angle],
      ),
    );

    if (LANDING_MODULES.has(index)) {
      hullParts.push(
        placed(
          new THREE.CylinderGeometry(0.085, 0.125, 0.13, 4),
          [cos * (RING + 0.22), sin * (RING + 0.22), 0],
          [0, 0, angle - Math.PI / 2],
        ),
      );
    }

    // Airlock entre cápsulas: doce segmentos describen el anillo sin toro.
    const connectorAngle = angle - STEP / 2;
    structureParts.push(
      placed(
        new THREE.CylinderGeometry(0.031, 0.031, 0.17, 7),
        [Math.cos(connectorAngle) * RING, Math.sin(connectorAngle) * RING, 0],
        [0, 0, connectorAngle],
      ),
    );
    structureParts.push(
      placed(
        new THREE.CylinderGeometry(0.055, 0.055, 0.045, 8),
        [cos * (RING - 0.2), sin * (RING - 0.2), 0],
        [0, 0, angle - Math.PI / 2],
      ),
    );

    // Cuatro módulos de motor, con tres campanas oscuras cada uno.
    if (ENGINE_MODULES.has(index)) {
      for (const tangentialOffset of [-0.075, 0, 0.075]) {
        const tangentX = -sin * tangentialOffset;
        const tangentY = cos * tangentialOffset;
        structureParts.push(
          placed(
            new THREE.CylinderGeometry(0.025, 0.047, 0.15, 9, 1, true),
            [
              cos * (RING + 0.25) + tangentX,
              sin * (RING + 0.25) + tangentY,
              -0.035,
            ],
            [0, 0, angle - Math.PI / 2],
          ),
        );
      }
      serviceParts.push(
        placed(
          new THREE.BoxGeometry(0.12, 0.12, 0.016),
          [cos * RING, sin * RING, moduleDepth / 2 + 0.009],
          [0, 0, angle],
        ),
      );
    }

    if (HABITAT_MODULES.has(index) || index === 3 || index === 9) {
      serviceParts.push(
        placed(
          new THREE.BoxGeometry(0.1, 0.15, 0.014),
          [cos * (RING - 0.03), sin * (RING - 0.03), moduleDepth / 2 + 0.008],
          [0, 0, angle],
        ),
      );
    }

    if (!ENGINE_MODULES.has(index) && index !== 3 && index !== 9) {
      structureParts.push(
        placed(
          new THREE.BoxGeometry(0.11, 0.12, 0.012),
          [cos * (RING - 0.03), sin * (RING - 0.03), moduleDepth / 2 + 0.008],
          [0, 0, angle],
        ),
      );
    }

    if (index % 3 === 0) {
      lightParts.push(
        placed(
          new THREE.SphereGeometry(0.018, 7, 5),
          [cos * (RING - 0.21), sin * (RING - 0.21), 0.075],
        ),
      );
    }
  }

  // Full stack: dos Ranger planos y dos Lander pesados alrededor del hub.
  hullParts.push(
    placed(foil(0.16, -0.16, 0.2, 0.025, -0.13, 0.045), [0, 0.22, 0.035]),
    placed(
      foil(0.16, -0.16, -0.2, 0.025, -0.13, 0.045),
      [0, -0.22, 0.035],
      [0, 0, Math.PI],
    ),
    placed(roundedBox(0.22, 0.15, 0.16, 0.022), [0.22, 0, -0.02]),
    placed(roundedBox(0.22, 0.15, 0.16, 0.022), [-0.22, 0, -0.02]),
  );
  structureParts.push(
    placed(new THREE.CylinderGeometry(0.022, 0.022, 0.34, 7)),
    placed(
      new THREE.CylinderGeometry(0.022, 0.022, 0.34, 7),
      [0, 0, 0],
      [0, 0, Math.PI / 2],
    ),
  );

  const hullMesh = mergedMesh(hullParts, hull);
  hullMesh.name = "endurance-twelve-module-ring";
  root.add(hullMesh);
  const structureMesh = mergedMesh(structureParts, structure);
  structureMesh.name = "endurance-single-spoke-connectors-and-engines";
  root.add(structureMesh);
  const serviceMesh = mergedMesh(serviceParts, service);
  serviceMesh.name = "endurance-service-panels";
  root.add(serviceMesh);
  const lightMesh = mergedMesh(lightParts, lights);
  lightMesh.name = "endurance-airlock-lights";
  lightMesh.renderOrder = 2;
  root.add(lightMesh);

  root.userData.enduranceArchitecture = {
    modules: MODULES,
    engineModules: ENGINE_MODULES.size,
    spokes: 1,
    dockedRangers: 2,
    dockedLanders: 2,
  };

  return { root, materials: [hull, structure, service, lights] };
}

/** Planeta anillado más un hábitat que orbita dentro del mismo modelo lógico. */
function cooperModel(input: SceneBodyInput): BodyModel {
  const planet = bodyMaterial(input, KIND.station);
  const rings = bodyMaterial(input, 6, {
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const habitat = bodyMaterial(input, STRUCTURE_KIND);
  const lights = bodyMaterial(input, EMISSIVE_KIND, { accent: NAVIGATION_COLOUR });
  const root = new THREE.Object3D();

  const planetMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.66, WORLD_SEGMENTS, WORLD_RINGS),
    planet,
  );
  planetMesh.name = "cooper-planet";
  root.add(planetMesh);

  /*
    Un anillo con DIVISIÓN, no una arandela.

    Una banda continua se lee como un disco de cartón: lo que da elegancia a un
    sistema de anillos es el hueco — el vacío entre el anillo interior y el
    exterior dice que ahí hay órbitas y no una pieza sólida. La división la abre
    el `discard` del shader y no una segunda malla, así que el anillo entero
    sigue costando UN draw y el borde del hueco sale antialiaseado por el mismo
    degradado que los bordes de las bandas.
  */
  const ringGroup = new THREE.Object3D();
  ringGroup.rotation.x = Math.PI / 2;
  root.add(ringGroup);

  const ringMesh = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.24, 72, 1), rings);
  ringMesh.name = "cooper-rings";
  ringMesh.renderOrder = 1;
  ringGroup.add(ringMesh);

  const habitatCentre = 1.29;
  const habitatParts = [
    placed(
      new THREE.TorusGeometry(0.12, 0.024, 6, 20),
      [habitatCentre, 0, 0],
      [0, Math.PI / 2, 0],
    ),
    placed(
      new THREE.CylinderGeometry(0.024, 0.024, 0.3, 8),
      [habitatCentre, 0, 0],
      [0, 0, Math.PI / 2],
    ),
    placed(new THREE.BoxGeometry(0.09, 0.065, 0.08), [habitatCentre, 0.13, 0]),
    placed(new THREE.BoxGeometry(0.09, 0.065, 0.08), [habitatCentre, -0.13, 0]),
    placed(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), [habitatCentre, 0.2, 0]),
  ];
  /*
    El hábitat va en su propio grupo porque RECORRE su órbita.

    Es el único movimiento de traslación que queda en toda la escena, y está
    justificado: un objeto artificial de cien metros dando una vuelta a un
    planeta en dos minutos es escala de nave, no escala astronómica. Los cuerpos
    siguen congelados en su trayectoria — esto es una pieza dentro de un cuerpo.
  */
  const habitatOrbit = new THREE.Object3D();
  root.add(habitatOrbit);

  const habitatMesh = mergedMesh(habitatParts, habitat);
  habitatMesh.name = "cooper-orbital-habitat";
  habitatOrbit.add(habitatMesh);

  const habitatLight = new THREE.Mesh(
    placed(new THREE.SphereGeometry(0.03, 8, 6), [habitatCentre, 0.315, 0]),
    lights,
  );
  habitatLight.name = "cooper-habitat-light";
  habitatLight.renderOrder = 2;
  habitatOrbit.add(habitatLight);

  return {
    root,
    materials: [planet, rings, habitat, lights],
    animate(seconds) {
      // El anillo gira en su propio plano; el hábitat recorre el suyo algo más
      // deprisa. Dos ritmos distintos es lo que impide que el conjunto parezca
      // una sola pieza rígida girando.
      ringGroup.rotation.z = seconds * 0.021;
      habitatOrbit.rotation.y = seconds * 0.052;
    },
  };
}

/**
 * Tesseracto: dos cáscaras de retícula que CONTRARROTAN.
 *
 * Antes eran cuatro marcos fusionados en una sola malla, y por tanto una pieza
 * rígida: girase como girase, seguía leyéndose como un objeto sólido con
 * aristas. Separarlo en dos cáscaras que giran en sentidos opuestos y a ritmos
 * distintos es lo que produce la lectura de espacio imposible — las aristas se
 * cruzan y se separan sin que nada se mueva de sitio.
 *
 * Sigue costando tres draws y sigue siendo el objeto más pequeño después de la
 * Ranger: no compite con Gargantúa, insinúa.
 */
function tesseractModel(input: SceneBodyInput): BodyModel {
  const frames = bodyMaterial(input, KIND.tesseract);
  const core = bodyMaterial(input, EMISSIVE_KIND, { accent: input.secondary });
  const root = new THREE.Object3D();

  function shell(
    definitions: ReadonlyArray<readonly [number, VectorTuple]>,
  ): THREE.LineSegments {
    const parts: THREE.BufferGeometry[] = [];
    for (const [size, rotation] of definitions) {
      const box = new THREE.BoxGeometry(size, size, size);
      const edges = new THREE.EdgesGeometry(box);
      box.dispose();
      parts.push(placed(edges, [0, 0, 0], rotation));
    }
    const lines = new THREE.LineSegments(mergeGeometries(parts, false), frames);
    for (const part of parts) part.dispose();
    lines.renderOrder = 1;
    return lines;
  }

  const outerShell = shell([
    [1.2, [0.04, 0.08, -0.04]],
    [0.88, [0.31, -0.23, 0.18]],
  ]);
  outerShell.name = "tesseract-nested-frames";
  root.add(outerShell);

  const innerShell = shell([
    [0.6, [-0.27, 0.38, 0.46]],
    [0.34, [0.52, 0.16, -0.32]],
  ]);
  innerShell.name = "tesseract-inner-frames";
  root.add(innerShell);

  const coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), core);
  coreMesh.name = "tesseract-core";
  coreMesh.rotation.set(0.35, 0.2, 0.55);
  coreMesh.renderOrder = 2;
  root.add(coreMesh);

  return {
    root,
    materials: [frames, core],
    animate(seconds) {
      outerShell.rotation.set(seconds * 0.021, seconds * 0.033, 0);
      innerShell.rotation.set(-seconds * 0.037, -seconds * 0.026, seconds * 0.014);
      coreMesh.rotation.set(0.35 + seconds * 0.05, 0.2 - seconds * 0.041, 0.55);
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
 * La iteración anterior ya tenía alas, pero conservaba fuselaje, cono y derivas
 * de caza. En pantalla se reconocía como avión, no como la Ranger de la película.
 *
 * ── Qué la hace legible ─────────────────────────────────────────────────────
 *
 * La Ranger se reconoce por su lifting body bajo, ancho y acolchado: planform de
 * manta, vientre negro de escudo térmico y cabina integrada. La flecha sigue
 * presente, pero ahora pertenece al cuerpo completo y no a dos alas añadidas.
 *
 * Se mantiene deliberadamente por debajo de los mundos y de la Endurance: la
 * jerarquía del sistema no cambia, cambia la calidad de la lectura.
 */
function rangerModel(input: SceneBodyInput): BodyModel {
  const hull = bodyMaterial(input, KIND.beacon);
  const structure = bodyMaterial(input, STRUCTURE_KIND);
  const beacon = bodyMaterial(input, EMISSIVE_KIND, { accent: input.accent });
  const root = new THREE.Object3D();
  // Grupo propio: el giro de `spinAt` va en la raíz, y la actitud aquí dentro.
  const craft = new THREE.Object3D();
  root.add(craft);

  // Marco local: +X proa, +Y arriba, +Z estribor.
  const hullParts = [
    // Volumen central bajo y ancho: lifting body, no fuselaje de caza.
    placed(
      new THREE.SphereGeometry(0.5, 18, 10).scale(1.34, 0.28, 0.58),
      [-0.03, 0.015, 0],
    ),
    // Planform de manta: el borde de ataque en flecha define la silueta.
    placed(
      foil(0.48, -0.5, 0.66, 0.06, -0.37, 0.085),
      [-0.02, -0.045, 0],
      [Math.PI / 2, 0, 0],
    ),
    placed(
      foil(0.48, -0.5, -0.66, 0.06, -0.37, 0.085),
      [-0.02, -0.045, 0],
      [Math.PI / 2, 0, 0],
    ),
    // Cabina acolchada, integrada en la superficie superior.
    placed(
      new THREE.SphereGeometry(0.13, 14, 8).scale(1.6, 0.48, 1.45),
      [0.21, 0.12, 0],
      [0, 0, -0.08],
    ),
    // Dos pequeñas derivas de popa, muy contenidas.
    placed(foil(-0.24, -0.48, 0.2, -0.39, -0.5, 0.028), [0, 0.02, 0.2]),
    placed(foil(-0.24, -0.48, 0.2, -0.39, -0.5, 0.028), [0, 0.02, -0.2]),
  ];
  const hullMesh = mergedMesh(hullParts, hull);
  hullMesh.name = "ranger-metallic-hull";
  craft.add(hullMesh);

  const structureMesh = mergedMesh(
    [
      // Escudo térmico negro: una segunda silueta apenas más pequeña bajo la
      // nave, visible en el canto y fiel al lenguaje del Shuttle.
      placed(
        foil(0.42, -0.46, 0.58, 0.04, -0.34, 0.05),
        [-0.03, -0.095, 0],
        [Math.PI / 2, 0, 0],
      ),
      placed(
        foil(0.42, -0.46, -0.58, 0.04, -0.34, 0.05),
        [-0.03, -0.095, 0],
        [Math.PI / 2, 0, 0],
      ),
      // Toberas gemelas, oscuras en reposo.
      placed(
        new THREE.CylinderGeometry(0.055, 0.082, 0.16, 10, 1, true),
        [-0.58, 0, 0.15],
        [0, 0, Math.PI / 2],
      ),
      placed(
        new THREE.CylinderGeometry(0.055, 0.082, 0.16, 10, 1, true),
        [-0.58, 0, -0.15],
        [0, 0, Math.PI / 2],
      ),
    ],
    structure,
  );
  structureMesh.name = "ranger-heat-shield-and-engines";
  craft.add(structureMesh);

  // Balizas: puntas de ala y luz de morro. Físicas y diminutas, como en el
  // resto del sistema: el bloom óptico las convierte en luz, no un degradado.
  const beaconMesh = mergedMesh(
    [
      placed(new THREE.SphereGeometry(0.032, 8, 6), [-0.13, -0.01, 0.65]),
      placed(new THREE.SphereGeometry(0.032, 8, 6), [-0.13, -0.01, -0.65]),
      placed(new THREE.SphereGeometry(0.026, 8, 6), [0.68, 0.01, 0]),
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

        Amplitud de ~1,2° y periodos de 47 y 71 segundos: dos senos primos entre
        sí, así que el gesto nunca se repite igual y nunca llega a leerse como
        una oscilación. Es la diferencia entre una nave que se sostiene sobre sus
        propulsores y una maqueta colgada de un hilo.
      */
      craft.rotation.z = Math.sin(seconds * 0.134) * 0.021;
      craft.rotation.y = Math.sin(seconds * 0.088) * 0.017;
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

/** Radio real desde el origen, ya con transforms y escala del modelo aplicados. */
function modelRadius(root: THREE.Object3D): number {
  const sphere = new THREE.Sphere();
  let radius = 0;
  root.updateMatrixWorld(true);
  root.traverse((node) => {
    const geometry = (node as Partial<THREE.Mesh>).geometry;
    if (!geometry) return;
    geometry.computeBoundingSphere();
    if (!geometry.boundingSphere) return;
    sphere.copy(geometry.boundingSphere).applyMatrix4(node.matrixWorld);
    radius = Math.max(radius, sphere.center.length() + sphere.radius);
  });
  return radius;
}

/**
 * Orientación de reposo del cuerpo, ANTES de su giro propio.
 *
 * Vive en el grupo y no en las piezas porque el giro va en la raíz del modelo:
 * así cada cuerpo gira sobre su propio eje en vez de bambolearse alrededor del
 * eje del mundo, que es lo que sale cuando se compone al revés.
 */
function restOrientation(visual: WorldStructuralData["visual"], target: THREE.Euler) {
  // Endurance enseña radios y módulos; Cooper inclina los anillos lo justo para
  // conservar la elipse; Ranger ofrece el perfil metálico, no un triángulo plano.
  // Endurance se muestra a 30°: conserva el círculo, enseña el grosor axial y
  // deja leer módulos/campanas. Más inclinación vuelve a comprimirla en una cruz.
  if (visual === "ship") return target.set(0.5, 0.16, -0.08);
  if (visual === "station") return target.set(0.28, 0, -0.18);
  if (visual === "tesseract") return target.set(0.12, 0.18, -0.08);
  // La Ranger enseña casi toda la planta de lifting body y sólo un canto del
  // escudo térmico: lo suficiente para que no parezca un icono plano.
  if (visual === "beacon") return target.set(0.24, -0.2, -0.1);
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
  station: 0.03,
  ship: 0.012,
  tesseract: 0.009,
  beacon: 0.011,
  "black-hole": 0,
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
  model.root.scale.setScalar(input.placement.size);
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
  for (const material of body.materials) material.dispose();
}
