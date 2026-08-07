/**
 * G0 · Shaders del spike de Gargantúa — CÓDIGO DESECHABLE.
 *
 * No importar desde el sitio. Al cerrar G0 esta carpeta se borra entera; lo que
 * sobreviva se reescribe dentro de la escena de G2 (docs/plans/sistema-gargantua.md §9).
 *
 * ── Por qué esto ya no son cinco capas ────────────────────────────────────────
 *
 * §6 del pivote descartó el raymarching **de la métrica de Kerr**: integrar
 * geodésicas de un agujero en rotación, con arrastre de marcos, es lo que le
 * costó horas por frame a Double Negative. Eso sigue descartado.
 *
 * Lo que hay aquí es otra cosa: geodésicas nulas de **Schwarzschild**, que se
 * reducen a una única ecuación de órbita
 *
 *     d²u/dφ² = -u + (3/2)·rs·u²        (u = 1/r)
 *
 * y que en coordenadas cartesianas es una fuerza central pura:
 *
 *     a⃗ = -(3/2)·h²·r⃗ / r⁵             (h² = |r⃗ × v⃗|², constante del rayo)
 *
 * Un Verlet de dos líneas. Sesenta a cien pasos por píxel, sin texturas y sin
 * ramas divergentes. Cabe en el presupuesto, y a cambio TODO lo que las cinco
 * capas intentaban falsificar sale gratis y sale exacto: el anillo de fotones,
 * el arco de la cara lejana pasando por encima, la imagen secundaria por debajo,
 * la sombra al radio aparente correcto (√27/2·rs, no rs), el anillo de Einstein
 * de las estrellas del fondo y la oclusión mutua entre todo eso.
 *
 * La capa 2 del plan («anillo de Einstein horneado como billboard») era la que
 * no funcionaba: un plano no puede coserse con continuidad al disco real, y esa
 * costura es justo lo que delataba el render. Aquí no hay costura porque no hay
 * dos superficies: hay una sola, vista tres veces por el mismo rayo.
 *
 * Se mantiene íntegro el resto del contrato: cámara fija sin controlador, HDR +
 * ACES + bloom como responsables del blanco incandescente, y degradación por
 * nivel (aquí: número de pasos y DPR, no capas que se apagan).
 *
 * Unidades: radio de Schwarzschild rs = 1. Horizonte r = 1, esfera de fotones
 * r = 1.5, sombra aparente b = √27/2 ≈ 2.598, ISCO r = 3.
 */

/** Ruido de valor + fbm. Barato a propósito: solo se evalúa en los cruces del
 *  disco, que son dos o tres por rayo, no en cada paso de la integración. */
const NOISE_CHUNK = /* glsl */ `
// Hashes por multiplicación fraccionaria, NO por sin(). El clásico
// fract(sin(dot(...)) * 43758.5) recibe aquí argumentos de varios miles — el
// retículo de estrellas se muestrea a escala 200 — y a esa magnitud sin() se
// queda sin mantisa: las estrellas dejan de ser puntos independientes y salen
// alineadas en rayas diagonales. Estos se quedan siempre en [0,1).
float hash21(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

vec3 hash33(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
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

/** Cuad de pantalla completa. No hay matriz de proyección: cada píxel fabrica su
 *  propio rayo a partir de la base de la cámara, así que `position` ya está en
 *  espacio de recorte. */
export const GARGANTUA_VERTEX = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const GARGANTUA_FRAGMENT = /* glsl */ `
precision highp float;

// Base de cámara ortonormal + campo de visión vertical.
uniform vec3 uCamPos;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec3 uCamFwd;
uniform float uTanHalfFov;
uniform float uAspect;

uniform float uTime;
uniform float uDiskInner;
uniform float uDiskOuter;
uniform float uSkyRadius;
uniform float uStepScale;

// Interruptores del HUD. Son floats en [0,1] para poder mezclar en vez de
// ramificar: una rama por uniforme la resuelve el compilador, pero mezclar
// además permite estados intermedios si G2 quiere atenuar en vez de apagar.
uniform float uDoppler;
uniform float uSecondary;
uniform float uSkyLens;

// Acumulación temporal. Ver la cabecera de scene.ts: la cámara fija convierte
// el antialiasing en un promedio de fotogramas casi gratis.
uniform sampler2D tHistory;
uniform vec2 uJitter;
uniform float uBlend;

varying vec2 vUv;

${NOISE_CHUNK}

const float HORIZON = 1.0;
const float PHOTON_SPHERE = 1.5;

// ---------------------------------------------------------------------------
// Fondo: estrellas + velo de nebulosa. Se evalúa UNA vez por rayo, al escapar.
// ---------------------------------------------------------------------------

/** Una estrella por celda del retículo 3D, y solo en una fracción de las
 *  celdas. Al ser 3D no hay acumulación en los polos, y como el lente magnifica
 *  brutalmente la vecindad del anillo, ahí las estrellas se estiran en arcos
 *  solas: es el anillo de Einstein del fondo, y no hay que dibujarlo. */
float starLayer(vec3 dir, float scale, float density) {
  vec3 cell = floor(dir * scale);
  vec3 h = hash33(cell);
  float present = step(1.0 - density, h.z);

  // La distancia se mide ENTRE DIRECCIONES, no entre puntos del retículo. Medir
  // en 3D parecía equivalente y no lo es: la esfera de muestreo corta la
  // gaussiana de la estrella por un plano que casi nunca pasa por su centro, y
  // esa sección es un anillo. De ahí salían rayas y arcos en vez de puntos.
  vec3 starDir = normalize(cell + 0.5 + (h - 0.5) * 0.9);
  float d = length(dir - starDir) * scale;

  // Pocas muy brillantes, muchas apenas visibles: un campo uniforme se lee como
  // ruido de sensor, no como cielo.
  float magnitude = 0.35 + 4.2 * pow(h.y, 7.0);
  return present * magnitude * exp(-d * d * 110.0);
}

vec3 skySample(vec3 dir) {
  // Campo DELIBERADAMENTE escaso y apagado. A 27 rs el encuadre entero cabe en
  // ~1.7 radios de Einstein: el lente estira cada estrella en un arco
  // tangencial. Eso es correcto y es bonito de fondo, pero con un campo denso
  // la pantalla se llena de arañazos y compite con el disco. Pocas y tenues, el
  // mismo cielo casi negro de las referencias.
  vec3 color = vec3(0.0);
  color += starLayer(dir, 38.0, 0.085) * vec3(1.00, 0.97, 0.92) * 0.62;
  color += starLayer(dir, 91.0, 0.065) * vec3(0.88, 0.93, 1.00) * 0.30;
  color += starLayer(dir, 197.0, 0.050) * vec3(1.00, 0.93, 0.84) * 0.16;

  // Velo muy tenue. Existe para que el lente tenga algo continuo que curvar
  // además de puntos: sin él la distorsión del fondo es casi invisible.
  vec2 sph = vec2(atan(dir.z, dir.x), asin(clamp(dir.y, -1.0, 1.0)));
  float cloud = fbm(vec2(sph.x * 1.15, sph.y * 2.3) * 1.7);
  float veil = smoothstep(0.50, 0.99, cloud);
  color += mix(vec3(0.014, 0.024, 0.040), vec3(0.042, 0.021, 0.012), cloud)
         * veil * 0.34;

  return color;
}

// ---------------------------------------------------------------------------
// Disco de acreción. Se evalúa en el punto exacto donde el rayo cruza y = 0.
// ---------------------------------------------------------------------------

/**
 * Emisión HDR del disco y su opacidad.
 *
 * El primer argumento es el punto de cruce y el segundo la dirección del rayo
 * AHÍ, normalizada y apuntando de la cámara hacia el disco (el fotón real viaja
 * al revés: eso importa para el beaming).
 */
vec3 diskSample(vec3 hit, vec3 dir, out float alpha) {
  float r = length(hit);
  float span = max(uDiskOuter - uDiskInner, 1e-3);
  float t = clamp((r - uDiskInner) / span, 0.0, 1.0);

  // Rotación diferencial kepleriana. El término en log(r) es una preespiral:
  // sin él el patrón nace isótropo y tarda medio minuto en enrollarse solo.
  float omega = pow(uDiskInner / r, 1.5);
  float twist = 2.35 * log(r / uDiskInner) + uTime * omega * 0.30;

  // Se muestrea el ruido en el plano CARTESIANO contrarrotado, no en (φ, r):
  // así no hay costura en φ = ±π, que es el artefacto clásico de los discos
  // procedurales, y la cizalla estira los filamentos sola.
  float c = cos(twist);
  float s = sin(twist);
  vec2 sheared = vec2(c * hit.x + s * hit.z, -s * hit.x + c * hit.z);

  // Las octavas finas se enrollan más despacio que las gruesas. Es lo que evita
  // que a los pocos minutos la escala pequeña esté infinitamente devanada y
  // empiece a aliasear.
  float cf = cos(twist * 0.45);
  float sf = sin(twist * 0.45);
  vec2 shearedFine = vec2(cf * hit.x + sf * hit.z, -sf * hit.x + cf * hit.z);

  float streams = fbm(sheared * 0.62);
  float grain = fbm(shearedFine * 2.10 + streams);
  float lanes = fbm(sheared * 0.24 + 11.3);

  // Los carriles de polvo son la diferencia entre "humo naranja" y "material con
  // estructura": van a escala mayor que los filamentos y ABSORBEN, no solo
  // oscurecen. Es lo que más se parece a las referencias de cerca.
  float laneMask = smoothstep(0.28, 0.70, lanes);
  float density = mix(0.14, 1.55, smoothstep(0.18, 0.88, streams * 0.64 + grain * 0.36));
  density *= mix(0.07, 1.0, laneMask);
  // Borde interior casi cortado (el material se precipita) y exterior difuso.
  density *= smoothstep(0.0, 0.035, t) * (1.0 - smoothstep(0.70, 1.0, t));

  // Camino óptico: un rayo rasante atraviesa mucho más material que uno
  // perpendicular. Es un cociente, no una textura, y es lo que hace que el
  // disco se lea VOLUMÉTRICO de canto y translúcido de plano.
  float grazing = 1.0 / max(abs(dir.y), 0.05);
  alpha = 1.0 - exp(-density * grazing * 0.40);

  // Perfil radial de temperatura de un disco delgado.
  vec3 hot = vec3(1.00, 0.97, 0.92);
  vec3 mid = vec3(1.00, 0.80, 0.50);
  vec3 cool = vec3(0.94, 0.48, 0.18);
  vec3 tint = mix(hot, mid, smoothstep(0.0, 0.24, t));
  tint = mix(tint, cool, smoothstep(0.20, 0.92, t));
  tint *= mix(0.34, 1.0, laneMask);

  // Corrimiento al rojo gravitacional (siempre) y beaming relativista (según el
  // interruptor). El material orbita a v = √(rs / 2(r − rs)) medido por un
  // observador estático local: 0.5c en la ISCO, y de ahí para arriba.
  float v = min(sqrt(0.5 / max(r - HORIZON, 0.30)), 0.80);
  vec3 flow = normalize(vec3(hit.z, 0.0, -hit.x));
  float mu = dot(flow, -dir);
  float gamma = inversesqrt(max(1.0 - v * v, 1e-3));
  float beaming = 1.0 / max(gamma * (1.0 - v * mu), 1e-3);
  float gravity = sqrt(max(1.0 - HORIZON / r, 0.0));
  float g = gravity * mix(1.0, beaming, uDoppler);

  // El exponente físico del beaming bolométrico es 4. Se usa 2.4 a propósito:
  // con 4 la asimetría es tan violenta que medio disco desaparece, que es
  // exactamente por lo que la película lo atenuó.
  float boost = clamp(pow(g, 2.4), 0.09, 4.0);
  tint = mix(tint, tint * vec3(0.84, 0.93, 1.16), clamp((g - 1.0) * 0.85, 0.0, 1.0));

  float heat = pow(uDiskInner / r, 1.85);

  return tint * heat * boost * 7.0;
}

// ---------------------------------------------------------------------------
// Integración de la geodésica.
// ---------------------------------------------------------------------------

void main() {
  vec2 ndc = (vUv + uJitter) * 2.0 - 1.0;
  vec3 dir = normalize(
    uCamFwd
      + uCamRight * (ndc.x * uAspect * uTanHalfFov)
      + uCamUp * (ndc.y * uTanHalfFov)
  );
  vec3 straight = dir;
  vec3 pos = uCamPos;

  // h² = |r⃗ × v⃗|² es constante a lo largo de toda la trayectoria: se calcula
  // una vez y define la fuerza. Vale 0 para un rayo radial, que entonces cae
  // recto — sin casos especiales ni divisiones peligrosas.
  vec3 angular = cross(pos, dir);
  float h2 = dot(angular, angular);

  vec3 color = vec3(0.0);
  float transmit = 1.0;
  float hits = 0.0;
  bool escaped = false;

  for (int i = 0; i < MAX_STEPS; i++) {
    float r2 = dot(pos, pos);
    float r = sqrt(r2);

    if (r < HORIZON) break;
    // Dentro de la esfera de fotones y entrando: no hay retorno posible. Es
    // exacto, no una heurística, y ahorra las ~40 iteraciones agónicas que un
    // rayo capturado pasa asintotándose al horizonte.
    if (r < PHOTON_SPHERE && dot(pos, dir) < 0.0) break;
    if (r > uSkyRadius) { escaped = true; break; }

    // Paso proporcional a la distancia al horizonte: fino donde la trayectoria
    // se curva, grueso donde ya es una recta. Un paso fijo obligaría a elegir
    // entre precisión en el anillo y coste en el vacío.
    float dt = clamp(uStepScale * (r - HORIZON), 0.02, 8.0);

    vec3 acc = -1.5 * h2 * pos / (r2 * r2 * r);
    vec3 nextPos = pos + dir * dt + 0.5 * acc * (dt * dt);
    float n2 = dot(nextPos, nextPos);
    vec3 nextAcc = -1.5 * h2 * nextPos / (n2 * n2 * sqrt(n2));
    vec3 nextDir = dir + 0.5 * (acc + nextAcc) * dt;

    // Cruce del plano ecuatorial. Interpolar el punto exacto importa: con el
    // paso grueso del campo lejano, quedarse con el extremo del paso desplaza
    // el borde del disco varias décimas de rs.
    if (pos.y * nextPos.y < 0.0 && transmit > 0.015) {
      float f = pos.y / (pos.y - nextPos.y);
      vec3 hit = mix(pos, nextPos, f);
      float hr = length(hit);
      if (hr > uDiskInner && hr < uDiskOuter) {
        float alpha;
        vec3 emission = diskSample(hit, normalize(mix(dir, nextDir, f)), alpha);
        color += transmit * emission * alpha;
        transmit *= 1.0 - alpha;
        hits += 1.0;
        // Con las imágenes de orden superior apagadas el rayo muere en el
        // primer cruce: es la medida honesta de lo que cuesta el lensado.
        if (uSecondary < 0.5 && hits > 0.5) transmit = 0.0;
      }
    }

    pos = nextPos;
    dir = nextDir;
  }

  // Solo los rayos que escapan ven cielo. Los capturados y los que agotan pasos
  // (el hilo justo alrededor del anillo de fotones, donde la órbita da vueltas)
  // se quedan con lo que hayan acumulado del disco.
  if (escaped && transmit > 0.002) {
    vec3 skyDir = normalize(mix(straight, dir, uSkyLens));
    color += transmit * skySample(skyDir);
  }

  vec3 history = texture2D(tHistory, vUv).rgb;
  gl_FragColor = vec4(mix(history, color, uBlend), 1.0);
}
`;

/** Vuelca el búfer acumulado a la cadena de post-proceso. Existe solo porque el
 *  raymarch se dibuja fuera del composer, para poder hacer el ping-pong. */
export const DISPLAY_FRAGMENT = /* glsl */ `
precision highp float;

uniform sampler2D tHistory;

varying vec2 vUv;

void main() {
  gl_FragColor = vec4(texture2D(tHistory, vUv).rgb, 1.0);
}
`;
