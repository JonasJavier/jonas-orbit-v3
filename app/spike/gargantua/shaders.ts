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

/** Tres octavas, para los campos que solo aportan forma general: la deformación
 *  de dominio y los carriles de polvo. La cuarta octava ahí no se distingue y el
 *  disco se evalúa dos o tres veces por rayo, así que cada octava se paga. */
float fbm3(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 3; i++) {
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
/** Ángulo objetivo por paso de integración, en radianes. */
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

/**
 * Escala global del HDR del disco, y punto de rodilla del rodillo de altas
 * luces (ver diskSample). Suben JUNTOS a propósito.
 *
 * Para dar vida sin quemar, la exposición de ACES no se toca: se sube la
 * ganancia y se abre la rodilla en la misma proporción. Así los medios ganan
 * brillo de verdad (~+35 %) mientras el pico apenas se mueve, porque el rodillo
 * se lo come. Subir la exposición habría hecho lo contrario: aplanar el pico y
 * apenas mover los medios.
 */
const float DISK_GAIN = 5.2;
const float HIGHLIGHT_KNEE = 8.5;

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
  // ruido de sensor, no como cielo. El exponente sube a 9 para recortar las
  // gigantes blancas: estiradas por el lente eran lo que más competía con el
  // disco.
  float magnitude = 0.22 + 2.1 * pow(h.y, 9.0);
  return present * magnitude * exp(-d * d * 110.0);
}

vec3 skySample(vec3 dir) {
  // Campo DELIBERADAMENTE escaso y apagado. A 27 rs el encuadre entero cabe en
  // ~1.7 radios de Einstein: el lente estira cada estrella en un arco
  // tangencial. Eso es correcto y es bonito de fondo, pero con un campo denso
  // la pantalla se llena de arañazos y compite con el disco. Pocas y tenues, el
  // mismo cielo casi negro de las referencias.
  vec3 color = vec3(0.0);
  color += starLayer(dir, 38.0, 0.042) * vec3(1.00, 0.97, 0.92) * 0.40;
  color += starLayer(dir, 91.0, 0.032) * vec3(0.88, 0.93, 1.00) * 0.17;
  color += starLayer(dir, 197.0, 0.024) * vec3(1.00, 0.93, 0.84) * 0.09;

  // Velo muy tenue. Existe para que el lente tenga algo continuo que curvar
  // además de puntos: sin él la distorsión del fondo es casi invisible.
  vec2 sph = vec2(atan(dir.z, dir.x), asin(clamp(dir.y, -1.0, 1.0)));
  float cloud = fbm(vec2(sph.x * 1.15, sph.y * 2.3) * 1.7);
  float veil = smoothstep(0.54, 1.00, cloud);
  color += mix(vec3(0.012, 0.020, 0.034), vec3(0.036, 0.018, 0.010), cloud)
         * veil * 0.22;

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
 *
 * El tercer argumento (order) es el índice del cruce: 0 es la imagen directa,
 * 1 en adelante son las imágenes lensadas de orden superior.
 */
vec3 diskSample(vec3 hit, vec3 dir, float order, out float alpha) {
  float r = length(hit);
  float span = max(uDiskOuter - uDiskInner, 1e-3);
  float t = clamp((r - uDiskInner) / span, 0.0, 1.0);

  // Rotación diferencial kepleriana. El término en log(r) es una preespiral:
  // sin él el patrón nace isótropo y tarda medio minuto en enrollarse solo.
  //
  // El paso de esa espiral ONDULA con el radio. Sin esta ondulación el ángulo de
  // contrarrotación es una función suave y monótona de r, el ruido isótropo
  // muestreado en ese marco sale en arcos paralelos y el disco se lee como vetas
  // de madera. Una sola octava lo rompe.
  float omega = pow(uDiskInner / r, 1.5);
  float pitch = 2.35 + 1.7 * (valueNoise(vec2(r * 0.80, 3.7)) - 0.5);
  float twist = pitch * log(r / uDiskInner) + uTime * omega * 0.30;

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

  // Deformación de dominio: el ruido se muestrea en un espacio ya retorcido por
  // OTRO ruido. Cuesta dos fbm de tres octavas y es la diferencia entre bandas
  // concéntricas limpias y turbulencia con discontinuidades.
  float wa = fbm3(sheared * 0.26);
  float wb = fbm3(sheared * 0.26 + 31.7);
  vec2 warped = sheared + (vec2(wa, wb) - 0.5) * 2.8;

  float streams = fbm(warped * 0.70);
  float grain = fbm(shearedFine * 2.55 + (wa - 0.5) * 1.6);
  float fabric = clamp(streams * 0.58 + grain * 0.42, 0.0, 1.0);

  // Los carriles de polvo son la diferencia entre "humo naranja" y "material con
  // estructura": van a escala mayor que los filamentos y ABSORBEN, no solo
  // oscurecen. Mezclar el campo de deformación dentro de ellos los desalinea de
  // los filamentos, que es lo que los hace irregulares.
  float lanes = fbm3(warped * 0.20 + 11.3) * 0.62 + wb * 0.38;
  float laneMask = smoothstep(0.26, 0.68, lanes);

  // Las imágenes de orden superior pierden CONTRASTE, no geometría ni brillo.
  //
  // El arco inferior es la imagen lensada de la cara lejana, y ahí el lente
  // comprime decenas de radios del disco en unos pocos píxeles: los carriles de
  // polvo, que arriba se leen como material, abajo se apilan en líneas
  // concéntricas muy definidas y parece que hay un segundo disco entero debajo.
  // Aplanar la textura hacia su media conserva el arco y el anillo de fotones
  // exactamente donde están, y les quita la estratificación. Es además lo
  // honesto: a esa compresión, un píxel promedia mucho más disco del que puede
  // resolver.
  float soften = clamp(order * 0.5, 0.0, 0.7);
  fabric = mix(fabric, 0.52, soften);
  laneMask = mix(laneMask, 0.60, soften);

  float density = mix(0.10, 1.70, smoothstep(0.16, 0.90, fabric));
  density *= mix(0.05, 1.0, laneMask);
  // Borde interior corto (el material se precipita) y exterior difuso. La
  // anchura del interior importa más de lo que parece: el anillo de fotones ES
  // la imagen lensada de ese borde, así que un corte a navaja se proyecta como
  // un círculo perfecto de anchura constante y se lee como un contorno dibujado
  // encima. Con 0.08 el borde sigue siendo nítido pero el anillo hereda la
  // irregularidad del material.
  density *= smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.70, 1.0, t));

  // Camino óptico: un rayo rasante atraviesa mucho más material que uno
  // perpendicular. Es un cociente, no una textura, y es lo que hace que el
  // disco se lea VOLUMÉTRICO de canto y translúcido de plano.
  float grazing = 1.0 / max(abs(dir.y), 0.05);
  alpha = 1.0 - exp(-density * grazing * 0.40);

  // Rampa: white-hot → warm white → pale gold → amber → dark rust. Cuatro
  // tramos en vez de dos; con dos, todo el medio caía en un beige plano. Los
  // cortes están corridos hacia fuera respecto al primer intento: con la rampa
  // apretada contra el borde interior, el pálido dorado ocupaba un anillo
  // estrecho y el resto del disco se veía marrón.
  vec3 tint = mix(
    vec3(1.00, 0.98, 0.95),
    vec3(1.00, 0.93, 0.80),
    smoothstep(0.00, 0.10, t)
  );
  // Los dos tramos centrales van más saturados de lo que pide el ojo en el
  // código: ACES dessatura con fuerza todo lo que se acerca al blanco, y sin
  // este margen el dorado llega a pantalla como beige.
  tint = mix(tint, vec3(1.00, 0.79, 0.42), smoothstep(0.08, 0.30, t));
  tint = mix(tint, vec3(1.00, 0.54, 0.16), smoothstep(0.28, 0.62, t));
  tint = mix(tint, vec3(0.64, 0.28, 0.10), smoothstep(0.58, 1.00, t));
  // El polvo enfría el color, pero el grueso del oscurecimiento lo hacen la
  // opacidad y la función fuente. Multiplicarlo tres veces (aquí, en la densidad
  // y en la fuente) fue lo que dejó el disco apagado.
  tint *= mix(0.68, 1.0, laneMask);

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
  // El suelo del clamp sube a 0.20: el lado que se aleja seguía siendo el 22 %
  // de la asimetría, pero en pantalla caía tan abajo que se leía como zona
  // muerta y era la mitad de lo que hacía sentir el conjunto apagado.
  float boost = clamp(pow(g, 2.4), 0.20, 3.6);
  tint = mix(tint, tint * vec3(0.84, 0.93, 1.16), clamp((g - 1.0) * 0.85, 0.0, 1.0));

  // Perfil radial. Exponente 1.15, no el bolométrico: con el perfil físico el
  // borde interior está 40 veces por encima del exterior y el tone mapping no
  // tiene sitio para los dos — el disco exterior se apaga a marrón y el ojo lee
  // el conjunto como un núcleo brillante con una cola muerta. Sigue cayendo
  // hacia fuera; cae menos. Es la palanca que más "enciende" el disco entero
  // sin tocar ni la exposición ni el pico.
  float heat = pow(uDiskInner / r, 1.15);

  // La función fuente lleva la MISMA textura que la opacidad, y aquí está la
  // clave del punto quemado. Cuando el camino óptico satura (alpha → 1) la
  // densidad deja de importar: con una fuente uniforme, toda la banda brillante
  // colapsa a un blanco plano y desaparecen filamentos y polvo justo donde más
  // se miran. Modulando también la emisión, la estructura sobrevive DENTRO del
  // blanco. Físicamente es lo correcto además: los grumos densos están más
  // calientes, no solo más opacos.
  // Rango más ancho que antes: la vida se nota más en la SEPARACIÓN entre grumo
  // y hueco que en el nivel medio. Los grumos llegan más arriba y los carriles
  // caen más abajo, y el rodillo se encarga de que lo de arriba no se queme.
  float source = mix(0.42, 1.62, fabric) * mix(0.40, 1.0, laneMask);

  vec3 emission = tint * heat * boost * source * DISK_GAIN;

  // Rodillo de altas luces, ANTES del bloom y del tone mapping. ACES aplana
  // todo lo que pase de ~3, así que un disco que llega a 28 entrega su mitad
  // brillante como una mancha sin gradiente. Esto comprime la meseta dejando
  // que el núcleo siga clipando: el pico se mantiene incandescente y el resto
  // recupera pendiente donde dibujar la textura. Se usa el canal máximo y no la
  // luminancia para no desplazar el tono al comprimir.
  float peak = max(max(emission.r, emission.g), emission.b);
  float rolled = peak / (1.0 + peak / HIGHLIGHT_KNEE);
  return emission * (rolled / max(peak, 1e-4));
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
  bool captured = false;

  for (int i = 0; i < MAX_STEPS; i++) {
    float r2 = dot(pos, pos);
    float r = sqrt(r2);

    if (r < HORIZON) { captured = true; break; }
    // Dentro de la esfera de fotones y entrando: no hay retorno posible. Es
    // exacto, no una heurística, y ahorra las ~40 iteraciones agónicas que un
    // rayo capturado pasa asintotándose al horizonte.
    if (r < PHOTON_SPHERE && dot(pos, dir) < 0.0) { captured = true; break; }
    if (r > uSkyRadius) { escaped = true; break; }

    // El paso se elige por el ÁNGULO recorrido, no por la distancia.
    //
    // La regla anterior (dt ∝ r − rs) gastaba decenas de iteraciones cruzando el
    // vacío y aun así solo alcanzaba para ~4 vueltas junto a la esfera de
    // fotones. Los rayos con parámetro de impacto apenas por encima del crítico
    // necesitan muchas más: orbitan varias veces antes de escapar, y todos esos
    // cruces del plano ocurren por dentro del borde del disco, así que no
    // recogen luz hasta salir. Los que se quedaban sin presupuesto morían en
    // negro y dibujaban un ANILLO OSCURO pegado a la sombra — y el borde
    // exterior de ese anillo era la "línea dibujada" que parecía un contorno
    // falso alrededor del agujero.
    //
    // dφ = (h/r²)·dt, así que fijar dφ es fijar dt = dφ·r²/h. La segunda rama
    // cubre el rayo casi radial, donde h → 0 y no hay ángulo que recorrer.
    float invH = inversesqrt(max(h2, 1e-6));
    // Y el paso se RELAJA con las iteraciones ya gastadas: la primera pasada
    // decide dónde se ve el disco y necesita precisión; a la quinta vuelta el
    // rayo está en la región caótica, donde su salida exacta es irresoluble a
    // cualquier resolución de pantalla. Duplica las vueltas disponibles a coste
    // cero.
    float relax = 1.0 + 1.4 * float(i) / float(MAX_STEPS);
    float dt = clamp(
      min(uStepScale * r2 * invH, 0.55 * (r - HORIZON) + 0.02) * relax,
      0.02,
      9.0
    );

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
        vec3 emission = diskSample(
          hit,
          normalize(mix(dir, nextDir, f)),
          hits,
          alpha
        );
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

#ifdef DEBUG_RAYS
  // Clasificación del rayo, no imagen: rojo = agotó pasos · verde = cruces del
  // disco · azul = capturado · negro = escapó sin tocar nada.
  //
  // Se enciende añadiendo DEBUG_RAYS a los defines del material en scene.ts.
  // No es adorno: fue lo que identificó el falso "contorno" del anillo de
  // fotones. A ojo parecía presupuesto de pasos agotado; el pase mostró CERO
  // píxeles rojos y un anillo negro — rayos que escapaban sin cruzar el disco —
  // y eso apuntaba al borde interior, que era el parámetro culpable. Cualquier
  // duda futura sobre "por qué hay algo raro alrededor de la sombra" se
  // responde aquí en un render.
  gl_FragColor = vec4(
    (!escaped && !captured) ? 1.0 : 0.0,
    hits / 3.0,
    captured ? 1.0 : 0.0,
    1.0
  );
  return;
#endif

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
