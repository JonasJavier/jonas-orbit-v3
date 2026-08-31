import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
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

      albedo = mix(vec3(0.23, 0.095, 0.05), vec3(0.60, 0.30, 0.14), continents);
      albedo = mix(albedo, vec3(0.78, 0.48, 0.25), terrain * 0.58);
      albedo = mix(albedo, vec3(0.91, 0.69, 0.48), ridges * terrain * 0.22);
      albedo = mix(albedo, vec3(0.76, 0.55, 0.39), haze * 0.24);
      gloss = 0.07 + haze * 0.04;
      atmosphere = vec3(1.0, 0.61, 0.34);
      atmosphereWeight = 0.88;
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
      /* Sombra muy contenida del plano de anillos. No requiere shadow map y
         hace que planeta y anillos pertenezcan al mismo objeto. */
      float ringOcclusion = 1.0 - smoothstep(0.055, 0.20, abs(vLocal.y));
      materialOcclusion = 1.0 - ringOcclusion * day * 0.28;
    } else if (uKind == 4) {
      /*
        Endurance: metal de módulos reales. La geometría ya dibuja las diez
        secciones, así que el material no necesita fingirlas con franjas.
      */
      float panel = panels(vLocal * 1.7, 1.35);
      float wear = fbm(vLocal * 6.0);
      albedo = mix(vec3(0.145, 0.16, 0.19), vec3(0.44, 0.46, 0.50), panel * 0.5);
      albedo *= 0.86 + wear * 0.22;
      gloss = 0.66;
      specularPower = 54.0;
      specularStrength = 1.05;
    } else if (uKind == 5) {
      /*
        Ranger: sólo casco metálico. El violeta no toca esta rama; vive en una
        esfera emisiva separada que funciona como baliza física y diminuta.
      */
      float plates = panels(vLocal * 2.1, 1.1);
      albedo = mix(vec3(0.16, 0.18, 0.21), vec3(0.48, 0.50, 0.53), plates * 0.42);
      gloss = 0.76;
      specularPower = 58.0;
      specularStrength = 1.08;
    } else if (uKind == 6) {
      /* Anillos de Cooper: pocas bandas minerales, finas y semitransparentes. */
      float ringRadius = length(vLocal.xy);
      float bands = 0.5 + 0.5 * cos((ringRadius - 0.82) * 66.0);
      float bandMask = smoothstep(0.18, 0.72, bands);
      if (bandMask < 0.08) discard;
      albedo = mix(vec3(0.15, 0.19, 0.22), vec3(0.50, 0.52, 0.50), bandMask);
      emissive = key * abs(ndl) * bandMask * 0.11;
      gloss = 0.34;
      outputAlpha = 0.28 + bandMask * 0.52;
    } else if (uKind == 7) {
      /* Trusses, ejes y hábitat: el mismo metal oscuro en todo el sistema. */
      float structure = panels(vLocal * 1.35, 1.0);
      albedo = mix(vec3(0.095, 0.11, 0.14), vec3(0.31, 0.33, 0.37), structure * 0.36);
      gloss = 0.58;
      specularPower = 52.0;
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

    /* Borde encendido por el disco, para todo lo demás: es lo que separa al
       cuerpo del fondo negro sin dibujarle un contorno. */
    float warmRim = fresnel * smoothstep(-0.25, 0.42, ndl);
    color += key * warmRim * 0.18;
    color += fill * fresnel * 0.32;
    color += emissive;

    /* Foco: al enfocar un destino, su cuerpo se enciende. La cámara no se
       mueve — es el contrato de §3 — así que toda la respuesta es luz. */
    color += uNavigation * uFocus * (0.055 + fresnel * 0.62);

    gl_FragColor = vec4(color, outputAlpha);
  }
`;

const NAVIGATION_COLOUR = "#7fe5ff";
const STRUCTURE_KIND = 7;
const EMISSIVE_KIND = 8;

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

/** Una malla por familia material: detalle real sin pagar un draw por módulo. */
function mergedMesh(
  geometries: THREE.BufferGeometry[],
  material: THREE.ShaderMaterial,
): THREE.Mesh {
  const geometry = mergeGeometries(geometries, false);
  for (const part of geometries) part.dispose();
  return new THREE.Mesh(geometry, material);
}

interface BodyModel {
  root: THREE.Object3D;
  materials: THREE.ShaderMaterial[];
}

function simpleWorld(input: SceneBodyInput, kind: number): BodyModel {
  const material = bodyMaterial(input, kind);
  const root = new THREE.Object3D();
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), material);
  sphere.name = `${input.id}-surface`;
  root.add(sphere);
  return { root, materials: [material] };
}

/**
 * Endurance original: un vehículo radial, no un toro decorado.
 *
 * Diez módulos independientes definen la silueta. El hub, los radios y dos
 * trusses parciales explican cómo se sostiene; el eje y la antena explican qué
 * hace. Sólo cuatro balizas emiten y todas caben en tres draws totales.
 */
function enduranceModel(input: SceneBodyInput): BodyModel {
  const hull = bodyMaterial(input, KIND.ship);
  const structure = bodyMaterial(input, STRUCTURE_KIND);
  const lights = bodyMaterial(input, EMISSIVE_KIND, { accent: input.secondary });
  const root = new THREE.Object3D();

  const hullParts: THREE.BufferGeometry[] = [
    placed(new THREE.CylinderGeometry(0.18, 0.18, 0.3, 16), [0, 0, 0], [Math.PI / 2, 0, 0]),
    placed(new THREE.CylinderGeometry(0.075, 0.075, 0.68, 12), [0, 0, 0.2], [Math.PI / 2, 0, 0]),
    placed(new THREE.ConeGeometry(0.13, 0.09, 12, 1, true), [0, 0, 0.58], [Math.PI / 2, 0, 0]),
  ];
  const structureParts: THREE.BufferGeometry[] = [
    placed(new THREE.TorusGeometry(0.67, 0.018, 6, 42, 2.48), [0, 0, 0], [0, 0, 0.22]),
    placed(
      new THREE.TorusGeometry(0.67, 0.018, 6, 42, 2.48),
      [0, 0, 0],
      [0, 0, Math.PI + 0.22],
    ),
  ];
  const lightParts: THREE.BufferGeometry[] = [];
  const modules = 10;

  for (let index = 0; index < modules; index++) {
    const angle = (index / modules) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const moduleRadius = 0.79;

    hullParts.push(
      placed(
        new THREE.BoxGeometry(0.3, 0.17, 0.18),
        [cos * moduleRadius, sin * moduleRadius, index % 2 === 0 ? 0.012 : -0.012],
        [0, 0, angle + Math.PI / 2],
      ),
    );
    structureParts.push(
      placed(
        new THREE.BoxGeometry(0.54, 0.044, 0.044),
        [cos * 0.44, sin * 0.44, 0],
        [0, 0, angle],
      ),
    );

    if (index % 3 === 0) {
      lightParts.push(
        placed(new THREE.SphereGeometry(0.027, 8, 6), [cos * 0.91, sin * 0.91, 0.055]),
      );
    }
  }

  const hullMesh = mergedMesh(hullParts, hull);
  hullMesh.name = "endurance-hub-and-modules";
  root.add(hullMesh);
  const structureMesh = mergedMesh(structureParts, structure);
  structureMesh.name = "endurance-spokes-and-partial-truss";
  root.add(structureMesh);
  const lightMesh = mergedMesh(lightParts, lights);
  lightMesh.name = "endurance-navigation-lights";
  lightMesh.renderOrder = 2;
  root.add(lightMesh);

  return { root, materials: [hull, structure, lights] };
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

  const planetMesh = new THREE.Mesh(new THREE.SphereGeometry(0.66, 48, 32), planet);
  planetMesh.name = "cooper-planet";
  root.add(planetMesh);

  const ringMesh = new THREE.Mesh(new THREE.RingGeometry(0.82, 1.18, 72, 3), rings);
  ringMesh.name = "cooper-rings";
  ringMesh.rotation.x = Math.PI / 2;
  ringMesh.renderOrder = 1;
  root.add(ringMesh);

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
  const habitatMesh = mergedMesh(habitatParts, habitat);
  habitatMesh.name = "cooper-orbital-habitat";
  root.add(habitatMesh);

  const habitatLight = new THREE.Mesh(
    placed(new THREE.SphereGeometry(0.03, 8, 6), [habitatCentre, 0.315, 0]),
    lights,
  );
  habitatLight.name = "cooper-habitat-light";
  habitatLight.renderOrder = 2;
  root.add(habitatLight);

  return { root, materials: [planet, rings, habitat, lights] };
}

function tesseractModel(input: SceneBodyInput): BodyModel {
  const frames = bodyMaterial(input, KIND.tesseract);
  const core = bodyMaterial(input, EMISSIVE_KIND, { accent: input.secondary });
  const root = new THREE.Object3D();
  const frameParts: THREE.BufferGeometry[] = [];
  const definitions: ReadonlyArray<readonly [number, VectorTuple]> = [
    [1.2, [0.04, 0.08, -0.04]],
    [0.88, [0.31, -0.23, 0.18]],
    [0.6, [-0.27, 0.38, 0.46]],
    [0.34, [0.52, 0.16, -0.32]],
  ];

  for (const [size, rotation] of definitions) {
    const box = new THREE.BoxGeometry(size, size, size);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    frameParts.push(placed(edges, [0, 0, 0], rotation));
  }

  const frameLines = new THREE.LineSegments(mergeGeometries(frameParts, false), frames);
  frameLines.name = "tesseract-nested-frames";
  for (const part of frameParts) part.dispose();
  frameLines.renderOrder = 1;
  root.add(frameLines);

  const coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), core);
  coreMesh.name = "tesseract-core";
  coreMesh.rotation.set(0.35, 0.2, 0.55);
  coreMesh.renderOrder = 2;
  root.add(coreMesh);

  return { root, materials: [frames, core] };
}

function rangerModel(input: SceneBodyInput): BodyModel {
  const hull = bodyMaterial(input, KIND.beacon);
  const beacon = bodyMaterial(input, EMISSIVE_KIND, { accent: input.accent });
  const root = new THREE.Object3D();

  const hullParts = [
    placed(new THREE.ConeGeometry(0.23, 1.25, 6), [0, 0, 0], [0, 0, -Math.PI / 2]),
    placed(new THREE.BoxGeometry(0.38, 0.055, 0.72), [-0.2, 0, 0]),
    placed(new THREE.BoxGeometry(0.32, 0.34, 0.055), [-0.42, 0.07, 0]),
    placed(new THREE.SphereGeometry(0.12, 12, 8), [0.13, 0.09, 0]),
    placed(
      new THREE.CylinderGeometry(0.16, 0.16, 0.18, 10),
      [-0.59, 0, 0],
      [0, 0, Math.PI / 2],
    ),
  ];
  const hullMesh = mergedMesh(hullParts, hull);
  hullMesh.name = "ranger-metallic-hull";
  root.add(hullMesh);

  const beaconMesh = new THREE.Mesh(
    placed(new THREE.SphereGeometry(0.042, 8, 6), [-0.33, 0.23, 0]),
    beacon,
  );
  beaconMesh.name = "ranger-violet-beacon";
  beaconMesh.renderOrder = 2;
  root.add(beaconMesh);

  return { root, materials: [hull, beacon] };
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
  if (visual === "ship") return target.set(Math.PI / 3.6, 0, 0);
  if (visual === "station") return target.set(0.28, 0, -0.18);
  if (visual === "tesseract") return target.set(0.12, 0.18, -0.08);
  if (visual === "beacon") return target.set(0.08, -0.2, -0.08);
  return target.set(0, 0, 0);
}

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
const ORBIT_SAMPLES = 192;

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

  // Las estructuras giran despacio; los mundos, un poco más rápido. Los dos
  // bajan un tercio respecto de la versión anterior: la escena pedía menos
  // movimiento y mejor, y un mundo que completa su vuelta en tres minutos se
  // lee como que gira sin que el giro llame la atención.
  const spin = input.visual === "water" || input.visual === "desert" ? 0.038 : 0.014;
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
