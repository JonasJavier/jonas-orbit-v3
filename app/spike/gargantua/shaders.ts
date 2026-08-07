/**
 * G0 · Shaders del spike de Gargantúa — CÓDIGO DESECHABLE.
 *
 * No importar desde el sitio. Al cerrar G0 esta carpeta se borra entera; lo que
 * sobreviva se reescribe dentro de la escena de G2 (docs/plans/sistema-gargantua.md §9).
 *
 * Enfoque aprobado en §6: lente por capas, no raymarching de la métrica de Kerr.
 *
 * Todo lo emisivo trabaja en HDR (valores muy por encima de 1) y el tone mapping
 * ACES los comprime al final. Es lo que produce el núcleo blanco incandescente
 * que cae a ámbar sin pintarlo a mano: si el disco se clampa a 1 en el shader,
 * queda naranja plano y el bloom no tiene de dónde agarrarse.
 */

/** Ruido de valor + fbm. Barato a propósito. */
const NOISE_CHUNK = /* glsl */ `
float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * valueNoise(p);
    p *= 2.03;
    amplitude *= 0.5;
  }
  return value;
}
`;

// ---------------------------------------------------------------------------
// Fondo — nebulosa tenue. Una sola esfera invertida; en producción esto es la
// textura de entorno horneada de §3, aquí es procedural para poder iterar.
// ---------------------------------------------------------------------------

export const NEBULA_VERTEX = /* glsl */ `
varying vec3 vDir;

void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const NEBULA_FRAGMENT = /* glsl */ `
precision mediump float;

uniform float uIntensity;

varying vec3 vDir;

${NOISE_CHUNK}

void main() {
  // Coordenadas esféricas: la deformación en los polos no importa porque la
  // cámara es fija y mira al ecuador.
  vec2 sph = vec2(atan(vDir.z, vDir.x), asin(clamp(vDir.y, -1.0, 1.0)));
  vec2 p = vec2(sph.x * 0.75, sph.y * 1.5);

  float clouds = fbm(p * 2.2);
  float detail = fbm(p * 5.5 + clouds);
  float mask = smoothstep(0.42, 0.95, clouds * 0.65 + detail * 0.35);

  vec3 teal = vec3(0.06, 0.15, 0.20);
  vec3 rust = vec3(0.20, 0.09, 0.05);
  vec3 color = mix(teal, rust, smoothstep(0.3, 0.8, detail));

  gl_FragColor = vec4(color * mask * uIntensity, 1.0);
}
`;

// ---------------------------------------------------------------------------
// Capa 1 — disco de acreción.
// ---------------------------------------------------------------------------

export const DISK_VERTEX = /* glsl */ `
varying vec3 vLocal;

void main() {
  vLocal = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const DISK_FRAGMENT = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uInner;
uniform float uOuter;
uniform vec3 uCamLocal;
uniform float uBeta;
uniform float uBrightness;
uniform float uDoppler;

varying vec3 vLocal;

${NOISE_CHUNK}

void main() {
  float r = length(vLocal.xy);
  float t = clamp((r - uInner) / (uOuter - uInner), 0.0, 1.0);
  float phi = atan(vLocal.y, vLocal.x);

  // Rotación diferencial kepleriana (omega ~ r^-3/2): el interior se enrolla
  // sobre sí mismo y el exterior casi no se mueve.
  float omega = pow(uInner / max(r, 0.001), 1.5);
  float swirl = phi + uTime * omega * 0.85;

  // Filamentos: tres escalas para que haya estructura fina cerca del borde
  // interior, que es donde el ojo la busca.
  vec2 q = vec2(swirl * 2.2, r * 1.5);
  float density = fbm(q * 1.6) * 0.5 + fbm(q * 4.2) * 0.32 + fbm(q * 9.5) * 0.18;
  density = pow(density, 1.45);

  // Carriles de polvo: bandas oscuras que ABSORBEN, a escala mayor que los
  // filamentos. Sin ellas el disco es un degradado continuo y se lee como humo;
  // con ellas se lee como material con estructura, que es lo que distingue las
  // referencias buenas de un render genérico.
  float lanes = fbm(vec2(swirl * 0.9, r * 0.75) * 1.2);
  density *= mix(0.28, 1.0, smoothstep(0.30, 0.72, lanes));

  // Rampa de temperatura. El blanco se reserva al borde interior.
  vec3 hot = vec3(1.00, 0.95, 0.88);
  vec3 mid = vec3(1.00, 0.66, 0.30);
  vec3 cool = vec3(0.72, 0.26, 0.08);
  vec3 color = mix(hot, mid, smoothstep(0.0, 0.30, t));
  color = mix(color, cool, smoothstep(0.28, 0.95, t));

  // Doppler beaming: el lado que gira HACIA la cámara se ve más brillante y más
  // azul. Un dot product, y es lo que más distingue "agujero negro genérico" de
  // "Gargantúa".
  vec3 position = vec3(vLocal.xy, 0.0);
  vec3 tangent = normalize(vec3(-sin(phi), cos(phi), 0.0));
  vec3 toCamera = normalize(uCamLocal - position);
  float mu = dot(tangent, toCamera);
  float beta = uBeta * sqrt(uInner / max(r, 0.001));
  float boost = clamp(pow(1.0 / (1.0 - beta * mu), 2.2), 0.45, 2.0);
  boost = mix(1.0, boost, uDoppler);
  color = mix(color, color * vec3(0.88, 0.94, 1.14), clamp(mu, 0.0, 1.0) * 0.28 * uDoppler);

  // Perfil de emisión HDR: el borde interior sale MUY por encima de 1 para que
  // ACES lo lleve a blanco y el bloom lo convierta en el envolvente luminoso.
  float heat = mix(2.8, 0.42, smoothstep(0.0, 0.62, t));
  float edge = smoothstep(0.0, 0.030, t) * (1.0 - smoothstep(0.74, 1.0, t));

  vec3 emission = color * heat * boost * density * edge * uBrightness;

  // Aditivo puro: el alfa no transporta información, todo va en el color.
  gl_FragColor = vec4(emission, 1.0);
}
`;

// ---------------------------------------------------------------------------
// Capas 2+3 — anillo de fotones e imagen lensada de la cara lejana del disco.
// ---------------------------------------------------------------------------

export const HALO_VERTEX = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const HALO_FRAGMENT = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uPhotonRadius;
uniform float uShadowRadius;
uniform float uBrightness;
uniform float uHalo;

varying vec2 vUv;

${NOISE_CHUNK}

void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float d = length(p);
  float angle = atan(p.y, p.x);

  // Anillo de fotones: un HILO. Va a HDR alto para que sea el bloom quien lo
  // convierta en el borde incandescente, no un trazo grueso pintado.
  float photon = exp(-pow((d - uPhotonRadius) / 0.0045, 2.0)) * 1.9;

  // Imagen lensada de la cara lejana: perfil asimétrico — arranca seco en el
  // borde de la sombra y decae hacia fuera. Una gaussiana simétrica leía como
  // un aro dibujado en vez de como material orbitando.
  float width = uShadowRadius * 0.26;
  float outward = max(0.0, d - uShadowRadius * 1.012);
  float band = exp(-pow(outward / width, 1.45));

  float swirl = fbm(vec2(angle * 2.6 + uTime * 0.32, d * 9.0)) * 0.6
              + fbm(vec2(angle * 6.1 - uTime * 0.18, d * 18.0)) * 0.4;

  // Arriba y abajo domina la imagen lensada; en los laterales se funde con el
  // disco directo, que ya está ahí.
  float topBottom = 0.20 + 0.80 * pow(abs(sin(angle)), 0.7);
  float arc = band * topBottom * (0.22 + 1.35 * swirl);

  // Nada de luz DENTRO de la sombra: por definición, de ahí no escapa nada.
  float outside = smoothstep(uShadowRadius * 0.992, uShadowRadius * 1.010, d);

  vec3 photonColor = vec3(1.0, 0.96, 0.90);
  vec3 arcColor = vec3(1.0, 0.72, 0.36);
  vec3 emission =
    (photonColor * photon + arcColor * arc * 1.9 * uHalo) * outside * uBrightness;

  gl_FragColor = vec4(emission, 1.0);
}
`;

// ---------------------------------------------------------------------------
// Capa 4 — distorsión gravitacional del FONDO (solo nivel `deep`).
//
// Se aplica únicamente a las estrellas y la nebulosa, que es donde el lensado
// se nota de verdad. El disco y el halo NO pasan por aquí: el anillo de fotones
// ya es, por definición, el resultado de esa curvatura, y lensarlo dos veces lo
// deformaba en huevo.
// ---------------------------------------------------------------------------

export const LENS_FRAGMENT = /* glsl */ `
precision highp float;

uniform sampler2D tDiffuse;
uniform vec2 uCenter;
uniform float uAspect;
uniform float uStrength;
uniform float uHorizon;

varying vec2 vUv;

void main() {
  vec2 delta = vUv - uCenter;
  delta.x *= uAspect;
  float r = length(delta);

  // Caída 1/r^2 acotada: sin el clamp el centro se va a infinito y aparece un
  // artefacto circular muy visible.
  float bend = min(uStrength / max(r * r, 1e-4), 0.32);
  vec2 offset = normalize(delta + 1e-6) * bend;
  offset.x /= uAspect;

  vec2 uv = clamp(vUv - offset, vec2(0.002), vec2(0.998));
  vec3 color = texture2D(tDiffuse, uv).rgb;

  // Detrás de la sombra no hay fondo visible.
  color *= smoothstep(uHorizon * 0.98, uHorizon * 1.04, r);

  gl_FragColor = vec4(color, 1.0);
}
`;

export const LENS_VERTEX = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

