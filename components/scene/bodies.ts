import * as THREE from "three";
import type { WorldId, WorldStructuralData } from "@/content/worlds.data";

/**
 * Los seis cuerpos que orbitan Gargantúa.
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
 * Un cuerpo que pasa por detrás del disco debería desaparecer. No lo hacemos, y
 * es deliberado: **cada destino tiene que estar siempre visible y pulsable.**
 * Un planeta que se esconde medio minuto detrás del disco es un enlace que
 * desaparece del menú, y eso es un fallo de accesibilidad, no un detalle de
 * realismo. La inexactitud se ve una vez cada varias vueltas y se lee como una
 * silueta recortada contra el disco.
 *
 * ── Forma real, y además resplandor ─────────────────────────────────────────
 *
 * Hubo una versión en la que las cuatro estructuras —tesseracto, estación,
 * Endurance y Ranger— no eran malla sino un punto de luz con su destello. El
 * motivo era bueno (a veinte píxeles un cilindro sin textura es un rectángulo
 * gris) pero el resultado en pantalla no: con el núcleo cayendo como
 * `(1-d)^12`, lo que quedaba era una chincheta de seis píxeles dentro de un
 * anillo de interfaz vacío. Cuatro de los siete destinos no tenían cuerpo.
 *
 * El problema real no era la geometría, era el TAMAÑO. Con la cámara donde
 * está ahora cada cuerpo ocupa entre 11 y 58 px de radio según por dónde ande
 * su órbita, y eso es sitio de sobra para leer una silueta. Así que vuelven las
 * seis mallas, y el resplandor se queda — pero detrás, como halo, que es lo que
 * hace de verdad una fuente brillante vista a través de una óptica.
 *
 * ── La luz ──────────────────────────────────────────────────────────────────
 *
 * No hay `THREE.Light` en toda la escena. La única fuente del sistema es el
 * disco de acreción, así que cada cuerpo se ilumina desde el origen con una
 * intensidad que cae con la distancia. Es una línea de shader y es lo que hace
 * que el sistema se lea como un sistema y no como seis esferas flotando.
 */

/**
 * Periodo orbital del cuerpo de referencia (25 rs), en segundos. El resto sale
 * de la tercera ley de Kepler (T ∝ r^1.5), así que el sistema se mueve como un
 * sistema: lo de dentro corre, lo de fuera se arrastra.
 *
 * Deliberadamente enorme. «Órbitas lentas de verdad» significa que en la visita
 * típica un cuerpo recorre una fracción pequeña de su vuelta: la escena está
 * viva, no agitada. Con el cinturón actual las vueltas van de 2.6 a 4.9 minutos.
 */
const INNER_PERIOD_S = 210;

export function orbitalPeriod(placement: WorldStructuralData["placement"]): number {
  return INNER_PERIOD_S * Math.pow(placement.orbitRadius / 25, 1.5);
}

/**
 * Posición de un cuerpo en su órbita para un instante dado. Pura.
 *
 * Vive aquí y no en la escena porque ahora tiene dos consumidores: el bucle que
 * mueve los cuerpos y el constructor de la traza orbital, que necesita muestrear
 * la MISMA curva. Duplicar la fórmula sería garantizar que un día la traza deje
 * de coincidir con el cuerpo que la recorre.
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
 * Lo que además de forma tiene RESPLANDOR.
 *
 * Son las cuatro cosas construidas del sistema. Un mundo se ve porque el disco
 * lo ilumina; una nave se ve porque ella misma emite, y a esta distancia ese
 * brillo desborda su silueta. El halo va detrás de la malla, no en su lugar.
 */
const GLOWING = new Set<WorldStructuralData["visual"]>([
  "tesseract",
  "station",
  "ship",
  "beacon",
]);

/**
 * El cuad del halo siempre mira a cámara y se construye en espacio de vista: no
 * hace falta girar nada por fotograma ni saber dónde está la cámara.
 *
 * Ojo con el detalle que lo hace inmune al giro propio del cuerpo: el centro
 * sale de la TRASLACIÓN de `modelMatrix`, así que el grupo puede rotar todo lo
 * que quiera y el halo no se entera.
 */
const GLOW_VERTEX = /* glsl */ `
  uniform float uSize;
  varying vec2 vQuad;

  void main() {
    vQuad = position.xy;
    vec3 centre = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vec4 viewCentre = viewMatrix * vec4(centre, 1.0);
    viewCentre.xy += position.xy * uSize;
    gl_Position = projectionMatrix * viewCentre;
  }
`;

const GLOW_FRAGMENT = /* glsl */ `
  uniform vec3 uAccent;
  uniform vec3 uSecondary;
  uniform float uTime;
  uniform float uFocus;
  uniform float uPulse;
  uniform float uSize;

  varying vec2 vQuad;

  void main() {
    float d = length(vQuad);
    if (d > 1.0) discard;

    /* Sin núcleo duro: el cuerpo real ya está dibujado encima. Esto es sólo el
       resplandor que una fuente brillante deja alrededor de su silueta, y por
       eso cae suave en vez de concentrarse en un punto. La versión anterior
       llevaba un núcleo (1-d)^12 porque ENTONCES el halo era el cuerpo; ahora
       ese núcleo sería una mancha tapando la malla. */
    float wide = pow(max(0.0, 1.0 - d), 3.2);
    float tight = pow(max(0.0, 1.0 - d), 10.0);

    /* Dos púas finas en cruz. Es el detalle que dice «esto brilla de verdad» y
       no «alguien ha pegado un degradado radial». */
    float spikes =
      pow(max(0.0, 1.0 - abs(vQuad.x) * 1.05), 30.0) * exp(-abs(vQuad.y) * 11.0) +
      pow(max(0.0, 1.0 - abs(vQuad.y) * 1.05), 30.0) * exp(-abs(vQuad.x) * 11.0);

    /*
      Latido lento y desincronizado por cuerpo: el sistema respira en vez de
      parpadear a la vez. La baliza de la Ranger late más.

      El periodo pasó de 3.9 s a 15 s y la profundidad se partió por dos. A 3.9 s
      esto no era respirar, era parpadear: seis destellos por minuto en cada
      estructura, y con cuatro estructuras el borde del cuadro no paraba quieto
      nunca. Lo que aporta atmósfera es el latido que se nota sin poder seguirlo.
    */
    float breath = 1.0 + uPulse * 0.14 * sin(uTime * 0.42 + uSize * 9.0);

    vec3 colour = mix(uAccent, uSecondary, 0.28);
    float energy = (wide * 0.24 + tight * 0.46 + spikes * 0.26) * breath;
    energy *= 1.0 + uFocus * 1.6;

    gl_FragColor = vec4(colour * energy, 1.0);
  }
`;

/**
 * La traza de la órbita.
 *
 * ── Qué problema resuelve ───────────────────────────────────────────────────
 *
 * Dos a la vez, y por eso existe. El primero es de composición: seis cuerpos
 * pequeños sobre un fondo negro no forman un sistema, forman una constelación
 * arbitraria. Con su elipse debajo, cada uno pasa a estar EN un sitio — se ve de
 * dónde viene y a dónde va, y las seis elipses anidadas son lo que dibuja la
 * profundidad del conjunto. El segundo es de interacción: el hover necesitaba un
 * acuse de recibo, y el que había era un aro de interfaz pegado encima del
 * planeta. Encender su órbita dice lo mismo con el vocabulario de la escena.
 *
 * En reposo está casi apagada (8.5 % sobre negro): se intuye, no se lee. Al
 * apuntar un destino su órbita sube a 50 % y ninguna otra se mueve.
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

  varying float vSide;
  varying vec3 vWorld;

  void main() {
    vSide = aSide;

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
  uniform vec3 uCamPos;
  uniform float uFocus;
  uniform float uTime;
  uniform float uOrbitRadius;

  varying float vSide;
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
    float fade = mix(1.0, 0.12, depth);

    /*
      En reposo la traza es CASI GRIS, y esa es la corrección que más cambia la
      escena.

      Con las seis elipses a pleno color —ámbar, cian, violeta, naranja— lo
      primero que leía el ojo no era el agujero negro: era una maraña de líneas
      cruzándose. Seis trazas saturadas no dibujan un sistema, dibujan un
      ESQUEMA. El color es información de estado, así que se guarda para el
      estado: en reposo la órbita es una cuerda de acero apenas visible, y sólo
      recupera el color de su mundo la que estás apuntando. El salto de reposo a
      foco es de más de diez veces, así que no hace falta ningún adorno para
      saber cuál está activa.
    */
    vec3 reposo = mix(vec3(0.44, 0.50, 0.62), uAccent, 0.22);
    vec3 tinte = mix(reposo, uAccent, uFocus);
    float energy = mix(0.042, 0.55, uFocus) * fade * edge;

    /* Aditivo sobre negro: el alfa va a 1 y la energía viaja en el color, igual
       que en el halo. Con la energía también en alfa se elevaría al cuadrado. */
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
    float day = smoothstep(-0.16, 0.42, ndl);
    /* Oscurecimiento de limbo: el borde del disco iluminado cae un poco. */
    float limb = 0.55 + 0.45 * pow(max(dot(normal, view), 0.0), 0.4);
    float diffuse = day * limb;
    float fresnel = pow(1.0 - max(dot(normal, view), 0.0), 3.0);

    /* Ámbar del disco para la clave; azul tenue del fondo estelar para el
       relleno, que es lo que impide que la cara noche sea un agujero recortado. */
    vec3 key = vec3(1.0, 0.72, 0.42) * uLightIntensity;
    vec3 fill = vec3(0.055, 0.075, 0.14);

    vec3 albedo;
    float gloss = 0.0;
    vec3 emissive = vec3(0.0);
    /* Atmósfera: color del halo y cuánto pesa. Cero en lo que no tiene aire. */
    vec3 atmosphere = vec3(0.0);
    float atmosphereWeight = 0.0;

    if (uKind == 0) {
      /* Miller: mundo oceánico. Bandas de nube sobre agua profunda. */
      float clouds = fbm(vLocal * 3.4 + vec3(0.0, uTime * 0.02, 0.0));
      float ocean = smoothstep(0.42, 0.62, fbm(vLocal * 2.1));
      albedo = mix(vec3(0.02, 0.13, 0.29), vec3(0.10, 0.42, 0.58), ocean);
      albedo = mix(albedo, vec3(0.88, 0.94, 1.0), smoothstep(0.55, 0.78, clouds) * 0.7);
      gloss = 0.85 * (1.0 - ocean);
      /* Un mundo de agua tiene aire, y ese filo azul es la mitad de la lectura. */
      atmosphere = vec3(0.35, 0.62, 1.0);
      atmosphereWeight = 1.0;
    } else if (uKind == 1) {
      /* Edmunds: desierto en calma, el mundo habitable del final. */
      float dunes = fbm(vLocal * 4.2);
      albedo = mix(vec3(0.30, 0.15, 0.09), vec3(0.66, 0.42, 0.24), dunes);
      albedo = mix(albedo, vec3(0.80, 0.66, 0.48), smoothstep(0.62, 0.8, dunes));
      gloss = 0.05;
      /* Atmósfera fina y polvorienta: menos pronunciada que la de Miller. */
      atmosphere = vec3(1.0, 0.66, 0.42);
      atmosphereWeight = 0.55;
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
        Cooper Station: cilindro habitado.

        Casco claro, muy especular —es metal pulido bajo una pared de luz— y
        una retícula de ventanas encendidas que es lo que de verdad delata que
        ahí vive gente. Las ventanas pesan más que la superficie porque a esta
        distancia son lo único que se resuelve.
      */
      float p = panels(vLocal * 1.6, 1.15);
      albedo = mix(vec3(0.26, 0.28, 0.33), vec3(0.68, 0.71, 0.78), p);
      emissive = uSecondary * (1.0 - p) * 1.15;
      gloss = 0.7;
    } else if (uKind == 4) {
      /*
        Endurance: el anillo de doce módulos.

        Los módulos se marcan con la coordenada ANGULAR del toro, no con rayas
        en espacio de objeto. Es la diferencia entre un detalle cuya frecuencia
        está acotada por construcción —doce por vuelta, siempre— y uno que se
        convierte en moiré en cuanto el cuerpo se aleja. Aquel tejido de cuadros
        del primer intento salía justo de ahí.
      */
      float ring = atan(vLocal.y, vLocal.x);
      float module = smoothstep(0.25, 0.75, 0.5 + 0.5 * cos(ring * 12.0));
      albedo = mix(vec3(0.17, 0.18, 0.22), vec3(0.74, 0.76, 0.80), module);
      /* Una luz de posición por módulo, en las juntas. */
      emissive = uSecondary * pow(1.0 - module, 3.0) * 0.9;
      gloss = 0.72;
    } else {
      /*
        Ranger: la nave pequeña. Casco mate y baliza que late, para que se
        encuentre — es el cuerpo más lejano y el más pequeño del sistema.
      */
      // La baliza latía a 2.6 rad/s — 2.4 destellos por segundo. Eso no es una
      // baliza de navegación, es un aviso de alarma, y era el movimiento más
      // nervioso de toda la escena. A 0.55 rad/s da una vuelta cada 11 s.
      float pulse = 0.5 + 0.5 * sin(uTime * 0.55);
      albedo = vec3(0.28, 0.30, 0.36);
      emissive = uAccent * (0.50 + 0.75 * pulse) * smoothstep(0.05, 0.55, fresnel);
      gloss = 0.65;
    }

    /*
      El tesseracto sale por aquí y no toca nada más.

      Su malla son aristas (EdgesGeometry), que NO traen atributo de normal:
      todo lo que sigue —difuso, especular, fresnel, atmósfera— saldría NaN y
      pintaría basura. Y tampoco tendría sentido: una retícula no tiene cara
      iluminada, solo brilla.
    */
    if (uKind == 2) {
      gl_FragColor = vec4(emissive + uAccent * uFocus * 1.2, 1.0);
      return;
    }

    vec3 color = albedo * (key * diffuse + fill);

    /* Especular del disco: una banda estrecha, no un punto de estudio.
       Ojo con el nombre de la variable: half es palabra reservada en GLSL. */
    vec3 halfVec = normalize(toLight + view);
    float spec = pow(max(dot(normal, halfVec), 0.0), 42.0) * gloss * day;
    color += key * spec * 0.9;

    /*
      Atmósfera. Se acumula hacia el borde Y hacia la cara iluminada, que es la
      dispersión real: el filo brillante aparece donde la luz atraviesa más aire.
      Un poco desborda a la cara noche, como el amanecer visto desde órbita.
    */
    float rim = pow(1.0 - max(dot(normal, view), 0.0), 2.2);
    float scatter = rim * smoothstep(-0.45, 0.5, ndl);
    color += atmosphere * atmosphereWeight * scatter * uLightIntensity * 0.75;

    /* Borde encendido por el disco, para todo lo demás: es lo que separa al
       cuerpo del fondo negro sin dibujarle un contorno. */
    color += uAccent * fresnel * 0.14 * uLightIntensity * (0.35 + 0.65 * day);
    color += emissive;

    /* Foco: al enfocar un destino, su cuerpo se enciende. La cámara no se
       mueve — es el contrato de §3 — así que toda la respuesta es luz. */
    color += uAccent * uFocus * (0.35 + fresnel * 1.1);

    gl_FragColor = vec4(color, 1.0);
  }
`;

function geometryFor(visual: WorldStructuralData["visual"]): THREE.BufferGeometry {
  switch (visual) {
    case "water":
    case "desert":
      return new THREE.SphereGeometry(1, 48, 32);
    case "tesseract":
      // Solo las aristas del cubo. Ver el comentario del shader: como sólido
      // era un cuadrado de color, y como retícula se reconoce al instante.
      return new THREE.EdgesGeometry(new THREE.BoxGeometry(1.3, 1.3, 1.3));
    case "station":
      return new THREE.CylinderGeometry(0.62, 0.62, 2.3, 32, 1);
    case "ship":
      // El anillo de la Endurance. Doce módulos serían doce mallas; el toro con
      // sus marcas angulares los sugiere por una fracción del coste.
      return new THREE.TorusGeometry(1, 0.3, 16, 48);
    case "beacon":
      return new THREE.ConeGeometry(0.52, 1.9, 18);
    default:
      return new THREE.SphereGeometry(1, 16, 12);
  }
}

/**
 * Orientación de reposo del cuerpo, ANTES de su giro propio.
 *
 * Vive en el grupo y no en la malla porque el giro va en la malla: así el
 * cuerpo gira sobre su propio eje —el anillo de la Endurance rueda en su
 * plano— en vez de bambolearse alrededor del eje del mundo, que es lo que sale
 * cuando se compone al revés.
 */
function restOrientation(visual: WorldStructuralData["visual"], target: THREE.Euler) {
  // El anillo de la Endurance va de canto respecto de su avance, como en la
  // película; la Ranger apunta con el morro por delante.
  if (visual === "ship") return target.set(Math.PI / 3.6, 0, 0);
  if (visual === "beacon") return target.set(0, 0, Math.PI / 2);
  return target.set(0, 0, 0);
}

/**
 * Eje del giro propio, en el espacio LOCAL de la malla.
 *
 * ── El bug que corrige ──────────────────────────────────────────────────────
 *
 * Antes había un solo eje, Y, para los seis cuerpos, y para el anillo de la
 * Endurance eso era sencillamente el eje equivocado. `TorusGeometry` construye
 * el aro en el plano XY barriendo el tubo alrededor de **Z**: su eje de simetría
 * es Z, no Y. Al girarlo sobre Y, el anillo no rodaba en su plano — daba
 * volteretas de canto, pasando de aro a línea y vuelta a aro cada media vuelta.
 *
 * Era literalmente uno de los «planetas se mueven raro», y el más visible de
 * todos porque la Endurance es de los cuerpos grandes. El comentario del código
 * decía «rueda en su plano»; el código hacía lo contrario.
 *
 * El resto ya estaba bien y se deja como estaba: el cilindro de Cooper Station y
 * el cono de la Ranger tienen su eje en Y por construcción, y una esfera o una
 * retícula giran igual sobre cualquiera.
 */
function spinAxis(visual: WorldStructuralData["visual"]): THREE.Vector3 {
  return visual === "ship"
    ? new THREE.Vector3(0, 0, 1)
    : new THREE.Vector3(0, 1, 0);
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
  const indices: number[] = [];

  const point = new THREE.Vector3();
  const ahead = new THREE.Vector3();
  const tangent = new THREE.Vector3();

  for (let i = 0; i < ORBIT_SAMPLES; i++) {
    const t = (i / ORBIT_SAMPLES) * period;
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
  /** Lo que se mueve por la órbita: contiene la malla y, si lo lleva, el halo. */
  object: THREE.Object3D;
  /**
   * La traza de la órbita. Va aparte del cuerpo y NO cuelga de él: es geometría
   * fija en el espacio del sistema y el cuerpo la recorre. Colgarla del objeto
   * que se mueve la habría arrastrado consigo, que es exactamente lo contrario.
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

  const materials: THREE.ShaderMaterial[] = [];
  const object = new THREE.Object3D();
  restOrientation(input.visual, object.rotation);

  const surface = new THREE.ShaderMaterial({
    vertexShader: BODY_VERTEX,
    fragmentShader: BODY_FRAGMENT,
    uniforms: {
      uAccent: { value: new THREE.Color(input.accent) },
      uSecondary: { value: new THREE.Color(input.secondary) },
      uCamPos: { value: new THREE.Vector3() },
      uLightIntensity: { value: 1 },
      uTime: { value: 0 },
      uFocus: { value: 0 },
      uKind: { value: kind },
    },
  });
  materials.push(surface);

  const geometry = geometryFor(input.visual);
  // El tesseracto se dibuja como líneas, no como superficie: es lo único del
  // sistema cuya identidad está en su dibujo y no en su volumen.
  const mesh =
    input.visual === "tesseract"
      ? new THREE.LineSegments(geometry, surface)
      : new THREE.Mesh(geometry, surface);
  mesh.scale.setScalar(input.placement.size);
  object.add(mesh);

  if (GLOWING.has(input.visual)) {
    // El halo desborda la silueta lo justo para leerse como brillo propio. A
    // 4.2 —lo que valía cuando el halo ERA el cuerpo— se comía al vecino.
    const glow = new THREE.ShaderMaterial({
      vertexShader: GLOW_VERTEX,
      fragmentShader: GLOW_FRAGMENT,
      transparent: true,
      // Sin escritura de profundidad y con mezcla aditiva: dos halos cercanos
      // se suman en vez de recortarse, y al cruzarse con el disco de Gargantúa
      // se funden con él en lugar de pegarse encima.
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uAccent: { value: new THREE.Color(input.accent) },
        uSecondary: { value: new THREE.Color(input.secondary) },
        uSize: { value: input.placement.size * 2.3 },
        uTime: { value: 0 },
        uFocus: { value: 0 },
        // La baliza de la Ranger late; una estación habitada apenas.
        uPulse: { value: input.visual === "beacon" ? 1 : 0.25 },
      },
    });
    materials.push(glow);

    const halo = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), glow);
    // Después de la malla: es transparente y aditivo.
    halo.renderOrder = 1;
    object.add(halo);
  }

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
  materials.push(orbitMaterial);
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
    object,
    orbit,
    materials,
    placement: input.placement,
    radius: input.placement.size,
    spinAt(seconds) {
      // En el eje LOCAL de la malla, que es lo que hace que el anillo de la
      // Endurance ruede en su plano en vez de cabecear.
      mesh.quaternion.setFromAxisAngle(axis, spin * seconds);
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
