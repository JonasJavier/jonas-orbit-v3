import * as THREE from "three";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { GARGANTUA_VERTEX } from "./gargantua-shaders";

/**
 * El paso de pantalla completa de la travesía: la geometría del espacio se
 * dobla alrededor del destino.
 *
 * ── Dónde vive en la cadena ─────────────────────────────────────────────────
 *
 * Después del bloom y de la guarda de la sombra, antes del `OutputPass`. O
 * sea: recibe la imagen ENTERA en lineal HDR —raymarch, cuerpos y halo— y la
 * deforma antes del tone mapping. Por eso la aberración cromática y los arcos
 * de luz se comportan como luz y no como una calcomanía sobre el resultado.
 * Está deshabilitado en reposo: cuesta exactamente cero fuera de una travesía.
 *
 * ── Qué NO es ───────────────────────────────────────────────────────────────
 *
 * No es un túnel. No hay líneas blancas hacia atrás ni un cilindro azul con
 * estrellas. El centro de la distorsión es la posición PROYECTADA del destino,
 * no el centro de la pantalla, y lo que se dobla es la imagen que ya existía:
 * el campo de estrellas se estira en estelas radiales al acelerar, luego se
 * curva alrededor de un anillo de Einstein que abraza el limbo del cuerpo, la
 * imagen exterior se duplica girada en su interior, los arcos de luz se
 * rompen con ruido y los laterales se cierran envolviendo la cámara. La
 * aberración cromática es mínima a propósito: mucha convierte lo
 * cinematográfico en efecto de TikTok en dos décimas de segundo.
 *
 * ── Un solo paso, cuatro sabores ────────────────────────────────────────────
 *
 * `uFlavour` (lente, líquido, retícula, negro) es lo que cada mundo cambia
 * al final del viaje. Son multiplicadores dentro del mismo shader, no ramas:
 * Miller ondula como agua, Gargantúa curva más y se cierra en negro, el
 * Tesseracto cuantiza las estelas a 90°.
 */

const VOYAGE_FRAGMENT = /* glsl */ `
precision highp float;

uniform sampler2D tDiffuse;
/** Destino proyectado, en UV (0..1, origen abajo a la izquierda). */
uniform vec2 uCentre;
/** Radio aparente del destino, como fracción del ALTO del cuadro. */
uniform float uRadius;
uniform float uAspect;
uniform float uLock;
uniform float uApproach;
uniform float uWarp;
uniform float uFlash;
uniform float uTime;
/** Acento del destino, en RGB lineal. */
uniform vec3 uTint;
/** x lente · y líquido · z retícula · w negro. */
uniform vec4 uFlavour;

varying vec2 vUv;

const float PI = 3.14159265;

vec3 fetch(vec2 uv) {
  return texture2D(tDiffuse, clamp(uv, vec2(0.0), vec2(1.0))).rgb;
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

void main() {
  vec2 asp = vec2(uAspect, 1.0);
  // Coordenadas centradas en el destino, con el aspecto corregido: aquí un
  // círculo es un círculo.
  vec2 p = (vUv - uCentre) * asp;
  float r = length(p);
  float ang = atan(p.y, p.x);

  /*
    Lente gravitacional de masa puntual, en el plano de la imagen:
    beta = theta - thetaE² / theta. El anillo de Einstein se pone justo fuera
    del limbo del destino y crece con la distorsión; dentro del anillo el
    centro se COMPRIME (el cuerpo parece acercarse aún más) y fuera el campo
    se estira tangencialmente y se ve atraído hacia el anillo. Sobre el propio
    anillo la fuente es el centro: el limbo del cuerpo se convierte en un arco
    de su propia luz.
  */
  /*
    El anillo se mide sobre el limbo YA AMPLIADO. La compresión del centro
    agranda la imagen del cuerpo 1/(1 − 0.28·warp) veces; si el anillo se
    midiera sobre el radio proyectado sin ampliar, acabaría dibujado encima
    del planeta y no alrededor —fue lo primero que se vio al probarlo—.
  */
  float mag = 1.0 / (1.0 - 0.28 * uWarp);
  float limb = uRadius * mag;
  float rE = max(limb * 1.08, 0.06);
  float k = rE * rE;
  float strength = uWarp * (0.6 + 0.4 * uFlavour.x);
  // El pliegue entre la imagen comprimida y la lensada es gradual: estrecho
  // se leía como un segundo limbo dibujado dentro del planeta.
  float inside = 1.0 - smoothstep(rE * 0.70, rE * 1.02, r);
  float lensed = abs(r - k / max(r, 1e-3));
  float squeezed = r / mag;
  float rs = mix(r, mix(lensed, squeezed, inside), strength);

  // Torsión y oleaje del espacio. Con sabor líquido, más y más rápido.
  float liquid = 1.0 + 1.2 * uFlavour.y;
  float twist = uWarp * uWarp * sin(r * 22.0 * liquid - uTime * 5.0) * 0.09 * liquid;
  float ripple = uWarp * sin(ang * 6.0 + uTime * 3.2) * 0.010 * liquid;
  float angS = ang + twist * smoothstep(rE * 0.8, rE * 3.0, r);
  // Tesseracto: las direcciones se cuantizan a 90° y las estelas salen
  // ortogonales — las estrellas se vuelven retícula.
  float quant = (PI * 0.5) * floor(angS / (PI * 0.5) + 0.5);
  angS = mix(angS, quant, uFlavour.z * uWarp * 0.65);
  rs += ripple * smoothstep(rE * 0.9, rE * 2.5, r);
  vec2 dir = vec2(cos(angS), sin(angS));
  vec2 base = uCentre + dir * rs / asp;

  /*
    Estelas radiales hacia el centro. Es lo que hace que las estrellas se
    estiren al acelerar, y se reserva al campo lejano: el destino tiene que
    seguir reconociéndose mientras crece. Los tres canales se toman con un
    desplazamiento mínimo distinto — la aberración cromática, de muy poca
    amplitud y sólo durante la distorsión.
  */
  float stretch = (uApproach * uApproach * 0.09 + uWarp * 0.06)
    * smoothstep(rE * 0.9, rE * 2.2 + 0.25, r);
  vec2 rdir = vec2(cos(ang), sin(ang)) / asp;
  float split = uWarp * 0.0045;
  vec3 col = vec3(0.0);
  float wsum = 0.0;
  for (int i = 0; i < TAPS; i++) {
    float f = float(i) / float(TAPS - 1);
    float w = 1.0 - 0.6 * f;
    vec2 uv = base - rdir * (f * stretch);
    col.r += fetch(uv + rdir * split * (0.5 + f)).r * w;
    col.g += fetch(uv).g * w;
    col.b += fetch(uv - rdir * split * (0.5 + f)).b * w;
    wsum += w;
  }
  col /= wsum;

  // Imagen secundaria: el campo exterior aparece duplicado, girado y encogido,
  // pegado al interior del anillo. Estrellas dobles. Sólo FUERA del cuerpo:
  // sobre el planeta ampliado no aporta más que lavado.
  float ghostW = uWarp * uWarp * (1.0 - inside);
  vec2 gdir = vec2(cos(ang + 0.6 * uWarp), sin(ang + 0.6 * uWarp));
  vec3 ghost = fetch(uCentre + gdir * (rs * 0.72 + rE * 0.35) / asp);
  col += ghost * ghostW * 0.25;

  // El borde del anillo se oscurece: es donde la luz se dobla, y sin ese
  // negro los arcos no tienen sobre qué leerse.
  float rim = exp(-pow((r - rE * 1.03) / 0.035, 2.0));
  col *= 1.0 - 0.45 * rim * uWarp;

  // Arcos de luz sobre el anillo, rotos por ruido: nunca una circunferencia.
  float ringBand = exp(-pow((r - rE) / (0.010 + 0.012 * uWarp), 2.0));
  float arcNoise = vnoise(vec2(ang * 3.0 + uTime * 0.6, r * 30.0));
  float arcs = ringBand * smoothstep(0.35, 0.75, arcNoise) * uWarp * uWarp;
  col += mix(vec3(1.0), uTint, 0.6) * arcs * 1.3;

  // Los laterales envuelven la cámara: el cuadro se cierra desde fuera.
  float wrap = smoothstep(rE * 1.6 + 0.15, 1.35, r);
  col *= 1.0 - uWarp * (0.32 + 0.45 * uFlavour.w) * wrap;

  // Bloqueo de objetivo: el resto del cuadro baja un poco de intensidad.
  col *= 1.0 - uLock * 0.10 * smoothstep(rE * 1.5, rE * 4.0 + 0.3, r);

  /*
    El pestillo: un latido de exposición al enganchar el objetivo.

    uLock sube de 0 a 1 y se queda ahí, así que 4·u·(1−u) es un pulso exacto
    —cero al arrancar, cero al terminar, pico a los 80 ms— y no deja residuo
    durante el resto del viaje. Es la cámara cerrando el diafragma y volviendo,
    a la vez que los dos golpes del pestillo del audio.

    NO es un aro. Un círculo de interfaz dibujado encima de un cuerpo iluminado
    de verdad ya se rechazó una vez (endurance-navigation-interface §14) y la
    razón sigue en pie: sería instrumentación, no luz.
  */
  float latch = 4.0 * uLock * (1.0 - uLock);
  col *= 1.0 - 0.16 * latch;

  // Compresión luminosa: la luz se recoge hacia el centro justo antes del
  // cruce. La capa del DOM termina el trabajo sobre el cambio de página.
  float core = exp(-r * r / (rE * rE * 2.2 + 0.01));
  col += mix(vec3(1.0), uTint, 0.35) * uFlash * uFlash * (1.2 + 2.6 * core);

  gl_FragColor = vec4(col, 1.0);
}
`;

export interface VoyagePassUniforms {
  tDiffuse: THREE.IUniform<THREE.Texture | null>;
  uCentre: THREE.IUniform<THREE.Vector2>;
  uRadius: THREE.IUniform<number>;
  uAspect: THREE.IUniform<number>;
  uLock: THREE.IUniform<number>;
  uApproach: THREE.IUniform<number>;
  uWarp: THREE.IUniform<number>;
  uFlash: THREE.IUniform<number>;
  uTime: THREE.IUniform<number>;
  uTint: THREE.IUniform<THREE.Vector3>;
  uFlavour: THREE.IUniform<THREE.Vector4>;
}

/**
 * Muestras del desenfoque radial. Es el único coste variable del paso: cada
 * muestra son tres lecturas de textura. `orbit` (móvil) va con ocho y `deep`
 * con doce; la diferencia se ve en la finura de las estelas, no en la forma.
 */
export function createVoyagePass(taps: number): {
  pass: ShaderPass;
  uniforms: VoyagePassUniforms;
} {
  const uniforms: VoyagePassUniforms = {
    tDiffuse: { value: null },
    uCentre: { value: new THREE.Vector2(0.5, 0.5) },
    uRadius: { value: 0.1 },
    uAspect: { value: 1 },
    uLock: { value: 0 },
    uApproach: { value: 0 },
    uWarp: { value: 0 },
    uFlash: { value: 0 },
    uTime: { value: 0 },
    uTint: { value: new THREE.Vector3(1, 1, 1) },
    uFlavour: { value: new THREE.Vector4(0.4, 0, 0, 0) },
  };
  const pass = new ShaderPass({
    name: "Voyage",
    defines: { TAPS: Math.max(2, Math.round(taps)) },
    uniforms,
    vertexShader: GARGANTUA_VERTEX,
    fragmentShader: VOYAGE_FRAGMENT,
  });
  // En reposo no existe: el compositor salta los pasos deshabilitados.
  pass.enabled = false;
  // `ShaderPass` CLONA los uniformes que recibe: los que hay que escribir son
  // los suyos, no el objeto de arriba.
  return { pass, uniforms: pass.uniforms as unknown as VoyagePassUniforms };
}
