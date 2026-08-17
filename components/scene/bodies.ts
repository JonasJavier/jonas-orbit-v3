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
 * a 25-51 rs del agujero apenas se nota.
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
 * ── La luz ──────────────────────────────────────────────────────────────────
 *
 * No hay `THREE.Light` en toda la escena. La única fuente del sistema es el
 * disco de acreción, así que cada cuerpo se ilumina desde el origen con una
 * intensidad que cae con la distancia. Es una línea de shader y es lo que hace
 * que el sistema se lea como un sistema y no como seis esferas flotando.
 */

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

  /* Rayas de panel para las estructuras: una nave no tiene ruido geológico. */
  float panels(vec3 p, float density) {
    float bands = abs(fract(p.y * density) - 0.5);
    float ribs = abs(fract((p.x + p.z) * density * 0.5) - 0.5);
    return smoothstep(0.06, 0.16, min(bands, ribs));
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
      exactamente el aspecto «de plástico». A la distancia a la que se ven estos
      cuerpos apenas hay superficie que mirar — lo que se lee es la silueta, la
      media luna encendida y el filo de atmósfera. Todo el presupuesto de shader
      va ahí.
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
      /* Tesseracto: no es un planeta. Cristal con las aristas encendidas. */
      float edge = pow(1.0 - max(dot(normal, view), 0.0), 1.6);
      albedo = mix(vec3(0.05, 0.07, 0.13), uSecondary * 0.4, edge);
      emissive = uAccent * (0.35 + 0.65 * edge) * (0.7 + 0.3 * sin(uTime * 0.9));
      gloss = 0.6;
    } else if (uKind == 3) {
      /* Cooper Station: cilindro habitado, ventanas encendidas.
         A esta distancia los paneles no se resuelven; lo que se ve son las
         LUCES. Por eso pesan más que la superficie. */
      float p = panels(vLocal * 2.0, 3.0);
      albedo = mix(vec3(0.20, 0.22, 0.27), vec3(0.55, 0.59, 0.66), p);
      emissive = uSecondary * (1.0 - p) * 0.8;
      gloss = 0.55;
    } else if (uKind == 4) {
      /* Endurance: el anillo de módulos. Casco claro y juntas oscuras. */
      float p = panels(vLocal * 3.0, 4.5);
      albedo = mix(vec3(0.15, 0.16, 0.2), vec3(0.72, 0.74, 0.78), p);
      emissive = uSecondary * (1.0 - p) * 0.42;
      gloss = 0.6;
    } else {
      /* Ranger: nave pequeña con baliza. Late, para que se encuentre. */
      float pulse = 0.5 + 0.5 * sin(uTime * 2.6);
      albedo = vec3(0.2, 0.21, 0.26);
      emissive = uAccent * (0.5 + 1.1 * pulse) * smoothstep(0.05, 0.55, fresnel);
      gloss = 0.6;
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
      return new THREE.SphereGeometry(1, 40, 28);
    case "tesseract":
      // Un cubo, no una esfera: el tesseracto es la única estructura del
      // sistema que no es ni mundo ni nave.
      return new THREE.BoxGeometry(1.35, 1.35, 1.35);
    case "station":
      return new THREE.CylinderGeometry(0.62, 0.62, 2.3, 28, 1);
    case "ship":
      // El anillo de la Endurance. Doce módulos serían doce mallas; el toro con
      // rayas de panel los sugiere por una fracción del coste.
      return new THREE.TorusGeometry(1, 0.3, 12, 30);
    case "beacon":
      return new THREE.ConeGeometry(0.52, 1.9, 14);
    default:
      return new THREE.SphereGeometry(1, 16, 12);
  }
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
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  placement: WorldStructuralData["placement"];
  /** Radio en rs, ya con la escala aplicada: lo usa el blanco de clic. */
  radius: number;
  /** Eje de giro propio, en radianes por segundo. */
  spin: number;
}

/** Crea la malla de un cuerpo. Devuelve `null` para Gargantúa: la dibuja el
 *  raymarch y no tiene geometría. */
export function createBody(input: SceneBodyInput): SceneBody | null {
  const kind = KIND[input.visual];
  if (kind < 0) return null;

  const geometry = geometryFor(input.visual);
  const material = new THREE.ShaderMaterial({
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

  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.setScalar(input.placement.size);
  // El anillo de la Endurance va de canto respecto de su avance, como en la
  // película; el resto conserva su orientación natural.
  if (input.visual === "ship") mesh.rotation.x = Math.PI / 2.6;
  if (input.visual === "beacon") mesh.rotation.z = Math.PI / 2;

  return {
    id: input.id,
    mesh,
    material,
    placement: input.placement,
    radius: input.placement.size,
    // Las estructuras giran despacio; los mundos, un poco más rápido.
    spin: input.visual === "water" || input.visual === "desert" ? 0.055 : 0.02,
  };
}

export function disposeBody(body: SceneBody) {
  body.mesh.geometry.dispose();
  body.material.dispose();
}
