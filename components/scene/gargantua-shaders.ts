/**
 * Shaders de Gargantúa — raymarch de geodésicas nulas de Schwarzschild.
 *
 * Vienen del spike de G0 sin un solo cambio en la física: el spike existía
 * justamente para llegar a esto y el gate era que se pareciera a la película a
 * 60 fps. Lo único que se retiró al traerlo fue el andamiaje de medición.
 *
 * Los cinco hallazgos de G0 que este archivo encarna (§9 del plan): la sombra
 * aparente está en √27/2 ≈ 2.6 rs, el borde interior del disco en 1.58 es lo
 * que decide si el anillo de fotones parece dibujado, el bloom es quien pone
 * gris la sombra (nunca se toca la geodésica para arreglar el glow), y el rango
 * dinámico del disco hay que comprimirlo ANTES de ACES.
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
 * Unidades: el radio de Schwarzschild es un PARÁMETRO (`uRs`), no una constante
 * del shader. Todo lo demás se deriva de él: horizonte r = rs, esfera de
 * fotones 1.5·rs, sombra aparente b = √27/2·rs, ISCO 3·rs.
 */

/**
 * Masa aparente de Gargantúa frente al sistema de destinos.
 *
 * ── Por qué esto es lo ÚNICO que mueve la jerarquía ─────────────────────────
 *
 * La tentación es agrandar el sistema —subir los radios orbitales— o acercar la
 * cámara. Ninguna de las dos hace nada, y está medido: la distancia de encuadre
 * la fijan los destinos, así que escalar las órbitas hace retroceder la cámara
 * exactamente en la misma proporción y el resultado en pantalla es idéntico. Es
 * un zoom, no una decisión de composición.
 *
 * `rs` sí, porque es el único número que cambia el TAMAÑO RELATIVO entre el
 * agujero negro y los destinos sin tocar la distancia de encuadre. Y su precio
 * está medido también: el cuerpo más cercano pasa de estar a 1.61 veces el
 * borde visible del disco a estar a 1.23. Por debajo de ~1.15 los destinos
 * empiezan a leerse pegados al disco, que es exactamente el fallo de la
 * revisión anterior — allí `rs` valía 1.48 y la razón caía a 1.09.
 *
 * ── Por qué 1.40 y no el techo de 1.29 de la revisión anterior ──────────────
 *
 * Aquel techo era real pero dependía de una premisa: que ningún destino podía
 * solaparse con el disco. Dirección levantó esa premisa —«permitir algo más de
 * profundidad y solapamiento sutil», Fase 1— y con ella se levantó el techo.
 *
 * La otra mitad la pone el reparto de las órbitas. Los tres destinos interiores
 * se movieron hacia fuera (ver `worlds.data.ts`), así que el más cercano ya no
 * está a 22 rs sino a 25. Con el disco en 17·rs = 23.8, sigue por fuera.
 *
 * Resultado medido en 16:9: el disco visible pasa del 32.9 % del ancho —el
 * original— al 45.7 %, y el destino más cercano queda a 1.22 veces el semieje
 * de la elipse visible del disco, prácticamente el mismo aire que antes. El
 * agujero negro crece un 39 % y NO se come el sistema.
 */
export const GARGANTUA_RS = 1.4;

/**
 * Radios del disco, en unidades de mundo.
 *
 * Van atados a `GARGANTUA_RS` porque el disco de un agujero negro no es una
 * decoración de tamaño libre: su borde interior es la última órbita estable y
 * sale de la masa. Subir rs y dejar el disco quieto sería pintar un disco que
 * no le corresponde a esa sombra.
 */
export const DISK_INNER = 1.58 * GARGANTUA_RS;
export const DISK_OUTER = 17 * GARGANTUA_RS;

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

/**
 * fbm con corte POR OCTAVA según la huella del píxel.
 *
 * Es el antialias de verdad del disco, y el sitio donde el primer intento se
 * equivocó de granularidad: apagar el campo entero según su frecuencia base no
 * sirve de nada, porque la que aliasea es la última octava — está 8.4 veces más
 * arriba. Con la base resuelta a diez píxeles por celda, esa octava mide media
 * decena de píxeles... por debajo del píxel. Eso es exactamente el ruido que
 * hierve al alejarse o al bajar el DPR.
 *
 * cells es cuántas celdas de la octava base caben en una huella de píxel. Cada
 * octava se desvanece hacia su MEDIA cuando la suya cruza ese límite, así que el
 * campo pierde detalle en vez de convertirlo en centelleo. No cuesta ni una
 * evaluación de ruido más: son cuatro smoothstep.
 */
float fbmAA(vec2 p, float cells) {
  float value = 0.0;
  float amplitude = 0.5;
  float scale = 1.0;
  for (int i = 0; i < 4; i++) {
    float fade = 1.0 - smoothstep(0.30, 0.95, cells * scale);
    value += amplitude * mix(0.5, valueNoise(p), fade);
    p *= 2.03;
    scale *= 2.03;
    amplitude *= 0.5;
  }
  return value;
}

/**
 * fbmAA de TRES octavas, para los campos de microdetalle.
 *
 * La cuarta octava de un campo fino está, por construcción, 8.4 veces por
 * encima de su base: a la escala a la que se muestrea el grano del disco eso
 * cae por debajo del píxel en casi todo el cuadro, así que su única
 * contribución real es centelleo. El corte por huella la apagaba de todos
 * modos en la mayoría de los píxeles; quitarla del bucle ahorra la evaluación
 * y de paso elimina el borde de esa transición.
 */
float fbmAA3(vec2 p, float cells) {
  float value = 0.0;
  float amplitude = 0.5;
  float scale = 1.0;
  for (int i = 0; i < 3; i++) {
    float fade = 1.0 - smoothstep(0.30, 0.95, cells * scale);
    value += amplitude * mix(0.5, valueNoise(p), fade);
    p *= 2.03;
    scale *= 2.03;
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
/** Radio de Schwarzschild de esta toma. Ver GARGANTUA_RS. */
uniform float uRs;
/**
 * Ángulo que cubre un píxel en vertical, en radianes.
 *
 * Es el antialias del disco. fwidth() no sirve aquí: diskSample se llama
 * DENTRO del bucle de integración, bajo una rama que no es uniforme en el quad,
 * y ahí las derivadas de pantalla son comportamiento indefinido. Con este
 * ángulo y la distancia al punto sale la huella del píxel en unidades de mundo,
 * que es lo mismo que da fwidth pero calculado a mano y siempre válido.
 */
uniform float uPixelScale;
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
const float DISK_GAIN = 5.9;
const float HIGHLIGHT_KNEE = 9.6;

// ---------------------------------------------------------------------------
// Fondo: estrellas + velo de nebulosa. Se evalúa UNA vez por rayo, al escapar.
// ---------------------------------------------------------------------------

/** Una estrella por celda del retículo 3D, y solo en una fracción de las
 *  celdas. Al ser 3D no hay acumulación en los polos, y como el lente magnifica
 *  brutalmente la vecindad del anillo, ahí las estrellas se estiran en arcos
 *  solas: es el anillo de Einstein del fondo, y no hay que dibujarlo. */
float starLayer(vec3 dir, float scale, float density, float bright) {
  vec3 cell = floor(dir * scale);
  vec3 h = hash33(cell);
  float present = step(1.0 - density, h.z);

  // La distancia se mide ENTRE DIRECCIONES, no entre puntos del retículo. Medir
  // en 3D parecía equivalente y no lo es: la esfera de muestreo corta la
  // gaussiana de la estrella por un plano que casi nunca pasa por su centro, y
  // esa sección es un anillo. De ahí salían rayas y arcos en vez de puntos.
  vec3 starDir = normalize(cell + 0.5 + (h - 0.5) * 0.9);
  float d = length(dir - starDir) * scale;

  // Muchas diminutas y unas pocas legibles. El brillo conserva una cola corta:
  // suficiente para dar profundidad, sin fabricar copos blancos ni competir
  // con el disco cuando el lente las estira.
  float magnitude = 0.30 + 0.80 * pow(h.y, 12.0) * bright;
  return present * magnitude * exp(-d * d * 245.0);
}

vec3 skySample(vec3 dir, float lensing) {
  /*
    EL ESTIRAMIENTO SE RESERVA PARA LA VECINDAD DEL AGUJERO (2026-09-06).

    El fondo entero participaba del remolino y eso rompía la jerarquía de la
    primera lectura: el ojo encontraba antes el cielo que los cuerpos. Medido
    con tools/star-streaks.mjs sobre el render —no estimado—, el anillo de
    250-400 px alrededor de la sombra tenía estrellas de aspecto 4.6 y la
    periferia, más allá de 550 px, todavía 1.8. Ahí fuera la magnificación
    tangencial del lente no llega al 15 %: lo que alargaba las manchas de la
    periferia era, sobre todo, que se les aplicaba la MISMA mezcla de dirección
    desviada que a las de dentro.

    lensing llega ya medido desde el integrador: es cuánto se ha desviado ESE
    rayo, así que la puerta la abre la física y no una máscara de pantalla.
    Fuera, la cola brillante de la magnitud paga un 22 % — son las estrellas
    grandes las que dejan trazo, y el campo fino no se toca. El velo de nebulosa
    también, porque es lo único continuo que el lente puede curvar y por tanto
    la otra mitad de la sensación de remolino.
  */
  // Tres escalas perceptuales. La capa lejana aporta densidad subpíxel; la media
  // establece paralaje óptico por el lente; la cercana se reserva para muy pocos
  // puntos con más presencia. El campo sigue siendo negro y el disco continúa
  // ocultándolo naturalmente donde domina su luminancia.
  float bright = mix(0.58, 1.0, lensing);
  vec3 color = vec3(0.0);
  /* Y las dos escalas gruesas pagan además un peso, porque el trazo largo lo
     dejan ellas: una estrella de la capa fina no llega a tres píxeles ni
     estirada. Medido con tools/star-streaks.mjs sobre el render, los trazos de
     la periferia —manchas de aspecto > 1.7 Y más de 5 px de largo— son casi
     todos de la escala 44. */
  color += starLayer(dir, 44.0, 0.100, bright)
         * vec3(1.00, 0.97, 0.92) * 0.48 * mix(0.58, 1.0, lensing);
  color += starLayer(dir, 112.0, 0.150, bright)
         * vec3(0.88, 0.93, 1.00) * 0.33 * mix(0.72, 1.0, lensing);
  color += starLayer(dir, 246.0, 0.205, bright)
         * vec3(1.00, 0.93, 0.84) * 0.19 * mix(0.90, 1.0, lensing);
  // Cuarta escala, la más fina: densidad subpíxel que rellena el cielo entre
  // las tres anteriores. Sin ella, subir sólo el brillo daba estrellas más
  // gordas en vez de un cielo más poblado, que es lo que se pedía. Es EL campo
  // fino, así que se queda entera: lo que se retira de la periferia son los
  // trazos grandes, no el cielo.
  color += starLayer(dir, 520.0, 0.235, 1.0) * vec3(0.94, 0.96, 1.00) * 0.10;

  // Velo muy tenue. Existe para que el lente tenga algo continuo que curvar
  // además de puntos: sin él la distorsión del fondo es casi invisible.
  vec2 sph = vec2(atan(dir.z, dir.x), asin(clamp(dir.y, -1.0, 1.0)));
  float cloud = fbm(vec2(sph.x * 1.15, sph.y * 2.3) * 1.7);
  float veil = smoothstep(0.54, 1.00, cloud);
  color += mix(vec3(0.014, 0.024, 0.041), vec3(0.043, 0.022, 0.012), cloud)
         * veil * 0.32 * mix(0.74, 1.0, lensing);

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
vec3 diskSample(vec3 hit, vec3 dir, float order, float travelled, out float alpha) {
  float r = length(hit);
  float span = max(uDiskOuter - uDiskInner, 1e-3);
  float t = clamp((r - uDiskInner) / span, 0.0, 1.0);
  /* Coordenada radial logarítmica. Es la natural de un disco —el material se
     comprime hacia dentro de forma multiplicativa, no aditiva— y es la que
     mantiene acotada la cizalla del marco corrotado, ver abajo. */
  float logR = log(r / uDiskInner);

  /*
    MARCO CORROTADO, y aquí estaba el generador de mármol.

    La versión anterior era pitch = 2.35 + 1.7·ruido(r·0.80), con ese pitch
    multiplicando a log(r). Da igual lo bien que suene «el paso ondula con el
    radio»: lo que decide la apariencia es la DERIVADA del ángulo respecto al
    radio, porque es la que dice cuánto se comprime radialmente el ruido que se
    muestrea en ese marco.

        twist = pitch(r)·log(r/rin)  ⇒  r·dtwist/dr = pitch + logR·dpitch/dlogR

    Con el ruido a frecuencia 0.80 en unidades de MUNDO, dpitch/dlogR llegaba a
    valer varias decenas en el disco exterior y ese término alcanzaba tres
    cifras. Una anisotropía de 100:1 aplicada a un fbm isótropo es, literalmente,
    la receta del mármol y de la veta de madera: era eso, y no el número de
    octavas, lo que llenaba el disco de vetas finas paralelas.

    Ahora la ondulación se muestrea en logR y con la amplitud acotada, así que
    r·dtwist/dr se queda en [1.1, 5.1] en todo el disco: la inclinación de las
    corrientes sigue variando —de unos 42° a unos 11° respecto a la tangente—
    pero la compresión radial estira el material sin triturarlo.
  */
  /*
    VELOCIDAD ANGULAR: Kepler, exponente 1.5, sin mezclas.

    Hubo una version con un termino de exponente 0.55 mezclado al 45 % que subia
    el borde exterior unas cinco veces. Queda aqui escrito por que se probo y por
    que se retiro, para que nadie lo vuelva a proponer sin saber el precio.

    El motivo de probarlo es real y medible: con Kepler puro la relacion entre el
    borde interior y el exterior es de 35 a 1, y a r = 17 rs la velocidad angular
    vale 0.0085 rad/s — unos 2.5 pixeles por segundo en un cuadro de 1440. El
    INTERIOR del disco fluye visiblemente mientras su CONTORNO se queda donde
    esta, asi que en movimiento la silueta exterior parece fija y solo se mueve
    la textura de dentro.

    Y aun asi se retira, porque esa relacion 35 a 1 no es un parametro: es la
    tercera ley de Kepler, y es de donde sale la sensacion de escala. Aplanarla
    acerca el disco a un solido en rotacion, que es justo lo que un disco de
    acrecion no es.

    Conviene separar dos cosas que es facil confundir:

      · el EXPONENTE es fisica — fija la relacion entre radios y no se toca;
      · el COEFICIENTE global de abajo (uTime · omega · 0.30) no lo es — dice
        cuantos segundos simulados pasan por segundo real, y en un agujero
        supermasivo como este el periodo orbital en la ISCO son HORAS, asi que
        cualquier movimiento visible ya es una aceleracion enorme y arbitraria.

    O sea que la palanca honesta para dar mas movimiento es ese 0.30, no el
    exponente. Su techo lo pone el borde interior: subirlo lo bastante para que
    el exterior derive de forma clara convierte el interior en una rueda girando,
    y con la acumulacion temporal de la escena empieza a dejar estela. Ese es el
    intercambio real, y es de Kepler, no del shader.
  */
  float omega = pow(uDiskInner / r, 1.5);

  /*
    ENROLLADO GLOBAL vs CIZALLA LOCAL. Son dos números distintos y se estaban
    fijando con uno solo.

    La cizalla LOCAL —d(twist)/d(logR)— es la que estira el ruido y produce la
    lectura de flujo tangencial. El enrollado GLOBAL —la integral de esa cizalla
    a lo largo del radio— es la que hace que una masa macro barra media vuelta
    mientras cae hacia dentro, y es exactamente el gesto de espiral de galaxia.

    Con pitch constante a 3.10 los dos iban atados: cizalla 3.10 en todas partes
    y 3.10 × ln(17/1.58) = 7.4 rad de enrollado, o sea 1.17 vueltas de disco. De
    ahí salía la curva macro que conducía al centro por la izquierda.

    Ahora la tasa OSCILA en logR alrededor de una media baja. La media fija el
    enrollado (1.15 × 2.376 = 2.7 rad, 0.43 vueltas: un tercio del anterior) y la
    oscilación devuelve la cizalla local donde hace falta —llega a 2.5, así que
    el material se sigue estirando en tangencial— pero se cancela a lo largo del
    radio en vez de acumularse. El resultado es flujo en bandas, no un remolino.

    La primitiva de la tasa es analítica: ∫(a + b·cos(kx+φ))dx = a·x + (b/k)·sin(kx+φ).
    Nada de esto cuesta una evaluación de ruido más que antes.
  */
  const float WIND_MEAN = 1.15;
  const float WIND_SWING = 1.35;
  const float WIND_FREQ = 2.40;
  float pitchNoise = 0.55 * (valueNoise(vec2(logR * 0.50, 3.7)) - 0.5);
  float wind = WIND_MEAN * logR
             + (WIND_SWING / WIND_FREQ)
               * (sin(logR * WIND_FREQ + 1.3) - sin(1.3));
  /*
    HUELLA DE PÍXEL sobre el PLANO DEL DISCO, no a lo largo del rayo.

    La versión anterior medía travelled · uPixelScale, que es el diámetro del
    haz de un píxel — correcto para una superficie encarada a la cámara y
    equivocado para ésta. El disco es un plano y el rayo lo corta oblicuamente:
    la mancha que el píxel proyecta sobre él es una ELIPSE cuyo eje largo vale
    el diámetro del haz dividido por |dir.y|. A 17° de elevación eso ya son 3.4
    veces más de lo que se estaba estimando en la imagen directa, y en los rayos
    que forman el arco lensado —que cruzan el plano casi rasantes— es un orden
    de magnitud.

    Ahí estaban las dos mitades del mismo problema: el disco primario aliaseaba
    porque se filtraba de menos, y la imagen lensada había que APLANARLA a mano
    (el viejo soften de 0.42 por orden) para que no hirviera. Aplanarla era
    justo lo que la convertía en una banda de humo pegada encima en vez de en el
    mismo material doblado.

    Se usa la media geométrica √slant y no el eje largo: es la aproximación
    isótropa estándar de una huella anisótropa y no borra la estructura radial,
    que aquí es la que cuenta.
  */
  /*
    Y el exponente es 0.24, no 0.5.

    La media geométrica pura (√slant, exponente 0.5) es lo correcto para UN
    fotograma. Aquí no hay un fotograma: la cámara es fija y el raymarch se
    acumula sobre ocho posiciones de Halton (ver TEMPORAL_BLEND en scene.ts), o
    sea que el muestreo efectivo ya está ocho veces por encima del que ve el
    filtro. Con 0.5 el disco interior perdía casi todo su microdetalle —el grano
    quedaba al 10 % de amplitud justo en la zona más brillante, que es la que más
    se mira— y el resultado era una mancha lisa donde tiene que haber estriado.
    Con 0.24 la huella crece lo justo para matar el hervor de los arcos rasantes
    sin borrar el material.
  */
  float slant = min(1.0 / max(abs(dir.y), 0.085), 8.0);
  float footprint = travelled * uPixelScale * pow(slant, 0.24);

  /*
    ÉPOCAS CRUZADAS: el disco AVANZA, pero no ENVEJECE.

    ── El fallo que esto sustituye ────────────────────────────────────────────

    La versión anterior era: twist += uTime · omega · 0.30, con uTime corriendo
    desde el montaje y sin techo. Como omega depende del radio, ese término no
    es un giro del plano: es una CIZALLA, y su magnitud

        q = r · ∂twist/∂r = 1.5 · uTime · spin = 0.45 · uTime · omega

    crece linealmente con el tiempo y sin límite. En el borde interior omega
    vale 1, así que a los 16 segundos q ya iguala TODO el presupuesto de cizalla
    de diseño (WIND_SWING), al minuto lo cuadruplica y al cuarto de hora lo
    multiplica por sesenta. El ruido, isótropo en el marco corrotado, acaba
    estirado en tangencial hasta volverse anillos concéntricos con una
    separación radial muy por debajo del píxel — y como el corte por huella no
    conocía ese factor, entraban sin filtrar. Eso, promediado por la acumulación
    temporal, es lo que se veía como «historial apilado»: bandas duras, anillo
    de fotones sobreacumulado y centro lavado.

    El comentario de las octavas finas de más abajo intentaba prevenirlo
    enrollándolas a 0.45. Eso divide la bomba por 2.2; no la desactiva.

    ── Por qué no se arregla bajando el 0.30 ──────────────────────────────────

    Porque el problema no es la velocidad, es que la deformación se INTEGRA.
    Bajar el coeficiente a la mitad solo tarda el doble en llegar al mismo sitio.
    Y no hay una fase continua que lo evite: si el enrollado avanza a un ritmo
    que varía 35 a 1 entre el borde interior y el exterior, la diferencia entre
    los dos crece sin cota por definición. Acotarla exige romper la continuidad
    en algún punto, y la única forma de romperla sin que se vea es tener DOS
    copias desfasadas y cruzarlas.

    ── El reloj ───────────────────────────────────────────────────────────────

    Dos épocas desfasadas media vuelta sobre un diente de sierra de periodo
    EPOCH. La edad de cada una vive en [-EPOCH/2, +EPOCH/2] por construcción, así
    que su cizalla está acotada y NUNCA vuelve a crecer:

        |q| ≤ 1.5 · (EPOCH/2) · spin = 0.225 · EPOCH · omega

    Y el peso es triangular, suavizado: vale 1 en edad cero y 0 justo en el
    extremo de la edad. Eso es lo que hace que el reciclado sea invisible — la
    copia que más deformada está es exactamente la que no se ve. El peor caso
    VISIBLE no es el extremo sino el cruce, donde las dos van a |edad| = EPOCH/4
    con peso 0.5:

        q(cruce) = 0.1125 · EPOCH · omega

    Con EPOCH = 40 eso son 4.5 en el borde interior y 1.6 a dos radios internos,
    del orden del presupuesto de diseño en casi todo el disco.

    El suavizado del peso importa y no es adorno. El triángulo crudo tiene la
    derivada rota en la cresta y en el cero, y esa rotura se lee como un tirón
    en el movimiento. smoothstep la quita, y además conserva la partición de la
    unidad —smoothstep(x) + smoothstep(1-x) = 1 exactamente—, así que las dos
    copias siempre suman uno y el brillo no puede respirar con el ciclo.

    ── Dónde se cruzan ────────────────────────────────────────────────────────

    En el CAMPO, no en la radiancia. Se mezclan fabric, carriles y macro —que
    son densidad y material— y sobre el resultado corre UNA sola vez la
    respuesta no lineal de temperatura y emisión. Cruzar dos radiancias ya
    formadas haría respirar la luminancia con el ciclo y empujaría píxeles por
    encima del umbral del bloom cada media época.

    ── Y de propina, la precisión ─────────────────────────────────────────────

    twist deja de crecer sin techo, así que cos(twist) y sin(twist) trabajan
    siempre sobre un argumento pequeño. La deriva de precisión a las horas de
    sesión desaparece por construcción, no por suerte.

    EPOCH es una perilla ARTÍSTICA, no de seguridad: cuánto llega a enrollarse
    el disco antes de reciclar. Quien sostiene la corrección es el AA de abajo,
    que ahora conoce la cizalla. Subir EPOCH da un disco más devanado, no un
    disco roto.
  */
  const float EPOCH = 20.0;
  /*
    Exponente del filtro sobre la cizalla. Ver la nota larga en streamsRaw: es
    el mismo compromiso que pow(slant, 0.24), medido con tools/stability.mjs.
  */
  const float AA_SHEAR = 0.5;

  float spin = omega * 0.30;
  float windStatic = wind + pitchNoise * logR;
  float cycle = uTime / EPOCH;

  /*
    Los CINCO campos que cruzan la costura. Son los que el resto de diskSample
    consume aguas abajo, y los cinco son densidad o material — nunca radiancia.
    Esa es la costura: se mezclan aquí y la respuesta no lineal de temperatura y
    emisión corre UNA sola vez sobre el resultado.
  */
  /*
    El peso de la época 0 sale FUERA del bucle: la época 1 es su complemento
    exacto, así que calcularlo dos veces sería calcular lo mismo dos veces.
  */
  float w0 = smoothstep(0.0, 1.0, 1.0 - 2.0 * abs(fract(cycle) - 0.5));

  float fabricSum = 0.0;
  float laneSum = 0.0;
  float macroSum = 0.0;
  float streamSum = 0.0;
  float waSum = 0.0;

  for (int k = 0; k < 2; k++) {
    float ph = fract(cycle + float(k) * 0.5);
    float age = (ph - 0.5) * EPOCH;
    float weight = k == 0 ? w0 : 1.0 - w0;

    float twist = windStatic + age * spin;

    // Cizalla tangencial de ESTA época, y su elongación de huella. Cada copia
    // tiene la suya: filtrar las dos por el máximo acotado borraría de más justo
    // en la que está en edad cero, que es la que más pesa.
    float q = 1.5 * age * spin;
    float stretch = sqrt(1.0 + q * q);
    // El marco fino va a 0.45 × twist, así que su cizalla es 0.45 × q.
    float stretchFine = sqrt(1.0 + 0.2025 * q * q);

    // Se muestrea el ruido en el plano CARTESIANO contrarrotado, no en (φ, r):
    // así no hay costura en φ = ±π, que es el artefacto clásico de los discos
    // procedurales, y la cizalla estira los filamentos sola.
    float c = cos(twist);
    float s = sin(twist);
    vec2 sheared = vec2(c * hit.x + s * hit.z, -s * hit.x + c * hit.z);

    // Las octavas finas se enrollan más despacio que las gruesas: mantiene la
    // escala pequeña por debajo de la gruesa dentro de la época.
    float cf = cos(twist * 0.45);
    float sf = sin(twist * 0.45);
    vec2 shearedFine = vec2(cf * hit.x + sf * hit.z, -sf * hit.x + cf * hit.z);


    // Deformación de dominio en DOS escalas. La fina —dos fbm de tres octavas—
    // convierte bandas concéntricas limpias en turbulencia con discontinuidades;
    // la gruesa dobla el patrón por ZONAS, de modo que el disco no tiene una
    // geometría global que el ojo pueda seguir dando la vuelta entera.
    float wa = fbm3(sheared * 0.26);
    float wb = fbm3(sheared * 0.26 + 31.7);

    /*
      JERARQUÍA RADIAL, y ahora manda sobre TODAS las escalas.

      La corrección anterior se quedó a medio camino: el ruido pasó de frecuencia
      fija a compress entre 1.95 y 0.58, un factor 3.4 sobre un rango de radios de
      10.8. En unidades ANGULARES —que son las que ve el ojo— eso deja al exterior
      con 3.2 veces MÁS detalle que al interior, exactamente lo contrario de lo que
      cuenta un disco de acreción y buena parte de la lectura de «vetas».

      Con 2.60 → 0.44 el factor es 5.9 sobre 10.8: la frecuencia angular queda casi
      plana y la radial cae hacia fuera. El exterior se abre en corrientes anchas y
      lentas; el interior queda comprimido.

      Se calcula aquí arriba porque también escala el campo macro, y ése era el
      fallo del primer intento: con el macro a frecuencia fija en unidades de
      mundo, su longitud de onda era varias veces el radio interior y TODO el disco
      interno —justo la zona más brillante, la que más se mira— caía dentro de una
      sola celda. Por eso el núcleo salía liso: no era el antialias, era que ahí no
      había campo que variase.
    */
    float compress = mix(2.60, 0.44, smoothstep(0.02, 0.82, t + (wa - 0.5) * 0.22));
    float streamFreq = 0.62 * compress;

    /*
      CAMPO MACRO. Es la pieza que faltaba, y la que decide la lectura.

      Todo lo que había —deformación, corrientes, grano, carriles, cortes— vivía
      entre λ ≈ 6 y λ ≈ 0.27 en unidades de mundo, sobre un disco de 48 de
      diámetro. Ni un solo campo describía la escala de las MASAS, y por eso el
      resultado era densidad procedural uniforme: mucha estructura pequeña
      repartida por igual, ningún sitio donde el material se acumule y ninguno
      donde falte.

      Éste va a un sexto de la frecuencia de las corrientes, y con ellas: λ ≈ 4 en
      el borde interior y λ ≈ 23 en el exterior, o sea masas que ocupan siempre una
      fracción parecida del contorno a cualquier radio. Como se muestrea en el
      marco corrotado nacen ya estiradas a lo largo de la dirección orbital: son
      corrientes anchas que se funden y se bifurcan, no manchas.

      Sale casi por el precio de nada: sus dos primeras evaluaciones son las mismas
      que antes se gastaban sólo en desplazar el dominio.
    */
    /*
      Y el macro se muestrea en el marco POCO enrollado (shearedFine, 0.45 × twist),
      no en el completo.

      Es la otra mitad del remolino. Las corrientes finas pueden —y deben— ir muy
      cizalladas: eso es lo que las hace parecer material rápido. Pero una MASA de
      un cuarto de disco cizallada igual se convierte en un brazo espiral, que es
      justo la forma que el ojo reconoce como galaxia. Sampleándola en el marco que
      ya existe para las octavas finas, su enrollado cae a 0.45 × 0.43 = 0.19
      vueltas: las masas salen como bandas tangenciales largas en vez de como
      brazos que caen hacia el centro. Cuesta cero — ese marco ya estaba calculado.
    */
    vec2 macroP = shearedFine * (0.105 * compress);
    float m1 = valueNoise(macroP + 4.1);
    float m2 = valueNoise(macroP + 19.3);
    vec2 coarse = vec2(m1, m2) - 0.5;
    float macro = m1 * 0.62 + valueNoise(macroP * 2.35 + 12.7) * 0.38;

    /*
      Deformación de dominio, fina y gruesa. La amplitud de la gruesa va como
      1/compress a propósito: así el desplazamiento vale siempre la misma fracción
      de la longitud de onda del campo que lo genera, y su jacobiano —o sea la
      frecuencia extra que introduce— se queda constante en todo el disco en vez de
      dispararse hacia dentro, que es donde menos píxeles hay para resolverla.
    */
    vec2 warped = sheared
                + (vec2(wa, wb) - 0.5) * 2.6
                + coarse * (2.5 / compress);

    /*
      LA DEFORMACIÓN DE DOMINIO MULTIPLICA LA FRECUENCIA REAL, y el corte por
      huella no lo sabía.

      fbmAA recibe cuántas celdas de la octava base caben en un píxel, y se le
      pasaba la frecuencia NOMINAL. Pero el campo no se muestrea en sheared, se
      muestrea en warped, y el jacobiano de esa deformación vale del orden de 1.6
      (1.55 del término fino más 0.39 del grueso, sumados sobre la identidad). O
      sea que la frecuencia que llega a la pantalla es bastante más alta que la que
      se estaba filtrando, y de ahí salía el hervor residual al bajar el DPR. La
      constante es una estimación del jacobiano, no un fudge: cambia si cambian las
      dos amplitudes de arriba.
    */
    const float WARP_GAIN = 1.05;

    /*
      Y las corrientes son de cresta, no de bulto: el valor absoluto plegado del
      fbm —ruido «ridged»— da filamentos que se BIFURCAN y se cortan solos donde
      el campo cruza el pliegue. Pesa menos que antes (0.38 en vez de 0.45) porque
      la cresta es un multiplicador de alta frecuencia, y era parte de lo que subía
      todos los detalles al mismo nivel de importancia.
    */
    /*
      Y AQUI ENTRA LA CIZALLA DE LA EPOCA, que es la mitad que faltaba.

      WARP_GAIN estima el jacobiano de la deformacion de dominio y nada mas. Pero
      el campo no se muestrea en el plano: se muestrea en un marco CONTRARROTADO
      por radio, y eso es una cizalla cuyo valor singular mayor vale stretch. La
      frecuencia que llega a la pantalla es esa cizalla por la nominal, y el filtro
      no lo sabia -- de ahi el aliasing que apilaba bandas concentricas.

      Va con EXPONENTE y no crudo. stretch es el eje LARGO de una huella
      anisotropa, y filtrar por el eje largo borra tambien la direccion corta: es
      exactamente el error que se corrigio arriba usando pow(slant, 0.24) en vez
      de raiz de slant. Aqui el exponente es mas alto que el de slant porque esta
      cizalla es la que de verdad rompia la imagen, no una geometria de vista fija.
    */
    float streamsRaw = fbmAA(
      warped * streamFreq,
      footprint * streamFreq * WARP_GAIN * pow(stretch, AA_SHEAR)
    );
    float ridged = 1.0 - abs(streamsRaw * 2.0 - 1.0);
    float streams = mix(streamsRaw, ridged, 0.38);

    /*
      MICROFILAMENTOS: sólo dentro, y con peso decreciente.

      El grano tenía peso fijo 0.38 en todo el disco y cuatro octavas. Sumado a
      unas corrientes ya trituradas por la cizalla, daba un espectro casi plano
      —cientos de líneas de importancia visual idéntica, que es la definición del
      defecto—. Ahora se desvanece hacia fuera: el disco exterior se queda con las
      corrientes anchas y el material comprimido de dentro conserva los estriados
      finos que transmiten velocidad.
    */
    float fine = mix(1.0, 0.30, smoothstep(0.12, 0.72, t));
    float grainFreq = 3.0 * mix(1.70, 0.50, t);
    float grain = fbmAA3(
      shearedFine * grainFreq + (wa - 0.5) * 1.4,
      footprint * grainFreq * WARP_GAIN * pow(stretchFine, AA_SHEAR)
    );

    float fabric = clamp(mix(streams, mix(streams, grain, 0.42), fine), 0.0, 1.0);

    /*
      INTERRUPCIONES. Ninguna corriente da la vuelta entera.

      Sale de campos ya calculados, así que es gratis. El término grueso pasa de
      la deformación al campo macro: los cortes dejan de estar repartidos con la
      misma frecuencia por todas partes y se agrupan en sectores, que es como se
      interrumpe un flujo de verdad.
    */
    float breakField = wb * 0.50 + macro * 0.22 + grain * 0.28;
    float breaks = smoothstep(0.22, 0.70, breakField);
    // Y la PROFUNDIDAD del corte también varía: con una profundidad fija el
    // resultado es un ritmo de «segmento, hueco» tan reconocible como la línea
    // continua que sustituye.
    /* Y la profundidad del corte afloja hacia fuera. Un corte que se lleva el
       58 % del material es razonable en el cuerpo denso del disco; en el extremo,
       donde ya queda poco, parte la silueta en dos puas y deja una muesca entre
       ellas. Esa muesca es la brecha del borde izquierdo. */
    float breakDepth = mix(
      mix(0.86, 0.42, smoothstep(0.34, 0.86, wa)),
      0.82,
      smoothstep(0.50, 0.92, t)
    );
    fabric *= mix(breakDepth, 1.0, breaks);

    // Los carriles de polvo van a escala mayor que los filamentos y ABSORBEN, no
    // solo oscurecen. Bajan de 0.20 a 0.145 para quedar del tamaño de las masas
    // macro y no del de las corrientes: un carril tan fino como el material que
    // cruza no se lee como polvo por delante, se lee como una raya más.
    /*
      Y ABSORBEN DE VERDAD. En la referencia el disco primario no es plasma luminoso
      con vetas: es una banda de polvo OSCURA atravesada por material caliente, y
      los carriles negros que la cortan son el rasgo que más dice «materia en caída»
      y menos dice «textura procedural». La ventana se estrecha —era
      smoothstep(0.26, 0.68), tan suave que sólo teñía— para que haya carril y
      no-carril en vez de un degradado continuo.
    */
    float lanes = fbm3(warped * 0.145 + 11.3) * 0.58 + macro * 0.42;
    fabricSum += fabric * weight;
    laneSum += lanes * weight;
    macroSum += macro * weight;
    streamSum += streams * weight;
    waSum += wa * weight;
  }

  /*
    Los pesos suman exactamente uno, así que la mezcla ya está hecha; lo que
    queda es leerla. No hace falta normalizar.

    Aquí se probó una mezcla que preserva la varianza —dividir la desviación por
    sqrt(w^2+(1-w)^2)— porque cruzar dos campos decorrelacionados al 50/50 se
    lleva media varianza y las ventanas smoothstep de abajo traducen eso a un
    desplazamiento de media. Se retiró MEDIDA: subió la ondulación del ciclo de
    6.1 % a 7.4 %. El motivo es que la varianza no es el término dominante — el
    perfil medido no es simétrico respecto al cruce, así que lo que manda no es
    el peso sino que las dos copias son realizaciones DISTINTAS del campo y su
    brillo medio no coincide. Una corrección que amplifica desviaciones amplifica
    también ésa. La palanca contra esa diferencia es EPOCH, no la normalización.
  */
  float fabric = fabricSum;
  float macro = macroSum;
  float streams = streamSum;
  float wa = waSum;

  // La ventana de los carriles se aplica DESPUÉS de mezclar: cruzar dos máscaras
  // ya recortadas es cruzar dos respuestas no lineales, que es justo lo que la
  // costura existe para evitar.
  float laneMask = smoothstep(0.31, 0.63, laneSum);


  /*
    LAS IMÁGENES LENSADAS SON EL MISMO MATERIAL, y el soften de antes era
    quien las convertía en otra cosa.

    Valía 0.42 por orden con techo 0.62: la gran imagen de arriba llegaba
    aplanada un 42 % hacia un gris uniforme y el arco de abajo un 62 %. El
    resultado es exactamente el defecto que se ve — un óvalo de humo liso
    envolviendo la sombra, que el ojo lee como una capa añadida encima y no como
    el disco doblado por el espacio-tiempo.

    Existía por una razón real: a esa compresión un píxel promedia decenas de
    radios de disco y sin filtrar hierve. Pero eso es un problema de HUELLA, y la
    huella ahora se mide bien (√slant, arriba) — en los rayos rasantes que forman
    los arcos vale un orden de magnitud más que en la imagen directa, así que el
    filtrado sale del mismo mecanismo que filtra todo lo demás.

    Queda un residuo pequeño, 0.12 por orden con techo 0.24, por lo único que la
    huella no captura: la magnificación diverge cerca de la curva crítica y ahí
    ninguna estimación local basta. Con eso, las imágenes lensadas conservan
    textura, dirección orbital, cortes, masas y asimetría Doppler.
  */
  /*
    JERARQUÍA DE ÓRDENES, y el reparto anterior era plano.

    soften valía order·0.12 y nada más: los tres cruces salían con la misma
    energía y la misma opacidad, sólo con algo menos de textura. En pantalla eso
    son tres arcos concéntricos de peso parecido debajo de la sombra — aro 1, aro
    2, aro 3 — y contar aros es ver el ray marcher.

    La física dice otra cosa. Cada media vuelta extra alrededor del agujero
    demagnifica la imagen por un factor e^{-π} ≈ 0.043 en anchura: la sucesión de
    imágenes de orden superior no es una escalera suave, es una caída
    exponencial que se apelotona contra la curva crítica. Estaban saliendo
    demasiado gordas y demasiado brillantes, no demasiado nítidas.

    Así que la energía cae exponencial a partir de la segunda imagen. El 1.8 es
    mucho más suave que el e^{-π} real: la idea es que se intuyan, no que
    desaparezcan.

    ── Y ORDER 1 NO PODÍA QUEDAR EXENTO DEL TODO ──────────────────────────────

    El reparto anterior dejaba intactas la imagen directa Y la primera lensada,
    porque las dos daban higher = 0. La intención era buena —la primera lensada
    tiene que verse— pero el efecto secundario era el defecto que quedaba: las
    líneas NARANJA de debajo de la sombra son la primera imagen lensada del disco
    EXTERIOR, y esa parte no hace falta para que la primera imagen tenga
    presencia. Su presencia la da el material interior, que es el crema brillante
    pegado a la sombra.

    Por eso el reparto pasa a depender de lensed y no de higher: la imagen
    directa sigue exenta —order 0, el disco primario no se toca— pero cualquier
    imagen lensada pierde su contribución exterior de forma progresiva. Lo que se
    va es el aro naranja contable; lo que se queda es la luz acumulándose bajo la
    sombra.
  */
  float lensed = min(order, 3.0);
  float higher = max(order - 1.0, 0.0);
  float orderFade = exp(-higher * 1.8);
  /* La primera lensada también se ablanda un poco (0.18): pierde microdetalle,
     que es parte de lo que la hacía identificable como pieza aparte. */
  float soften = clamp(order * 0.18 + higher * 0.28, 0.0, 0.70);

  /*
    Y los ordenes superiores se PEGAN a la curva critica.

    Geometricamente estan donde estan y eso no se toca. Lo que si se puede es
    repartir su peso: la imagen de orden n del material EXTERIOR esta mucho mas
    demagnificada que la del interior, asi que darle a un orden alto tanto peso
    en el borde del disco como en la ISCO es regalarle una banda ancha que el ojo
    lee como un aro propio, con su propio color — y como el tinte va con el
    radio, esa banda sale naranja o cobre y se separa cromaticamente del resto.

    Apagando la contribucion exterior de los ordenes altos, lo que queda de ellos
    vive cerca del borde interior: se comprimen contra la curva critica, se
    funden con la imagen principal y pierden la identidad naranja. La primera
    imagen lensada (order 1, higher = 0) no se entera de nada de esto.
  */
  float outerFade = 1.0 - smoothstep(0.10, 0.55, t) * clamp(lensed * 0.42, 0.0, 0.84);
  fabric = mix(fabric, 0.52, soften);
  laneMask = mix(laneMask, 0.60, soften);

  /*
    COHESIÓN DE LA BANDA PRIMARIA, y el problema que resuelve es de PRODUCTO.

    La densidad se construye multiplicando tres campos independientes, cada uno
    con su propio suelo: la textura (0.10), las masas macro (0.34) y los carriles
    de polvo (0.07). Por separado ninguno es agresivo. Pero cuando los tres
    coinciden en su valle —y con campos independientes eso ocurre— el producto
    vale 0.10 · 0.34 · 0.07 = 0.0024, el 0.09 % del máximo. Con el camino óptico
    de esta cámara eso da una opacidad del 0.8 %: transparente. En pantalla no se
    lee como plasma tenue, se lee como si le hubieran recortado un trozo al
    disco, y en movimiento algunos fotogramas abren una ventana negra limpia
    dentro del flujo frontal.

    El arreglo NO es subir la densidad media —eso devuelve la banda uniforme que
    tanto costó quitar— sino impedir que los tres suelos se multipliquen hasta
    cero, y sólo donde importa. En la banda primaria los suelos suben y los
    techos bajan un pelo, así que la MEDIA apenas se mueve (+19 %) mientras el
    producto de los tres valles sube 8.9 veces: los huecos siguen siendo huecos,
    pero con filamento residual dentro en vez de fondo.

    Hacia fuera la cohesión cae a 0.35 y el disco exterior conserva su derecho a
    grandes regiones casi vacías, que es lo que lo hace fragmentario. Ese 0.35 no
    es cero a propósito: es lo que le da CONTEXTO al streamer exterior de la
    izquierda. Sobresalir de la elipse es correcto —un disco de acreción no tiene
    borde duro— pero sin nada tenue alrededor deja de leerse como una corriente
    que se aleja y pasa a leerse como un trozo suelto.
  */
  /* La rampa se estira de (0.28, 0.70) a (0.34, 0.82). No sube el suelo del
     disco exterior —sigue en 0.35 al final— sino que retrasa su caida, y eso es
     justo el radio intermedio donde vive el material que une la banda principal
     con el streamer de la izquierda. Sin ese tramo la hebra nace ya despegada y
     el ojo la lee como una linea aparte; con el, nace del disco. */
  /* El suelo lejano sube de 0.35 a 0.52 y la rampa llega hasta 0.94. Las dos
     iteraciones anteriores lo dejaron corto: el extremo izquierdo seguia
     leyendose como un elemento aparte porque la cohesion se agotaba justo antes
     de llegar a el. Con 0.52 el ultimo tramo de la silueta conserva material de
     union y el borde deja de ser una pieza suelta. Sube densidad ahi, y es
     deliberado: unir el extremo era el objetivo. */
  float cohesion = mix(1.0, 0.52, smoothstep(0.38, 0.94, t));

  /*
    GROSOR VARIABLE. La ventana que convierte textura en densidad se mueve con
    el campo grueso, así que unos filamentos salen anchos y otros finos. Con una
    ventana fija todos tenían el mismo calibre, y un calibre constante es media
    firma de «procedural».
  */
  float gauge = (wa - 0.5) * 0.17;
  float density = mix(mix(0.10, 0.24, cohesion), 2.48, smoothstep(0.28 + gauge, 0.74 + gauge, fabric));

  /*
    MASAS Y HUECOS. El campo macro entra aquí como envolvente multiplicativa.

    Es lo que rompe la densidad uniforme: sectores enteros del disco quedan a una
    sexta parte de la densidad —huecos por los que se ve el negro y el material
    de detrás— y otros la multiplican por más de uno y medio. La turbulencia
    sigue estando en todas partes, pero ya no importa lo mismo en todas partes, y
    ésa es la jerarquía que faltaba: primero se ven las masas, después las
    corrientes, y sólo al mirar aparecen los filamentos.
  */
  /*
    Y la ventana del macro se ENSANCHA dentro de la banda.

    Con smoothstep(0.24, 0.76) el campo macro se satura: la mayor parte de sus
    píxeles acaba pegada al suelo o al techo, así que una sola celda macro por
    debajo de 0.24 apaga de golpe una zona entera del tamaño de un sexto del
    disco. Eso es exactamente la ventana negra grande del flujo frontal — no la
    abre la turbulencia, la abre UNA celda. Abriendo la ventana a (0.12, 0.88) la
    misma celda entra en su valle de forma gradual y deja un degradado en vez de
    un borde. Fuera de la banda se conserva el contraste original.
  */
  /* Y dentro de la banda la ventana se abre casi entera, (0.06, 0.94): con ella
     el macro deja de ser un interruptor y pasa a ser una rampa, asi que la
     region oscura de la derecha conserva su valle pero lo recorre con
     filamentos en vez de con un borde. El suelo sube de 0.55 a 0.66 por lo
     mismo: no para cerrar el hueco, para que dentro del hueco haya algo. Fuera
     de la banda se conserva el contraste original y el disco exterior sigue
     pudiendo vaciarse. */
  float mass = smoothstep(mix(0.24, 0.06, cohesion), mix(0.76, 0.94, cohesion), macro);
  /*
    Y EL SUELO DE LAS MASAS LLEVA TEXTURA, que es distinto de subirlo.

    Dentro de una zona macro en su valle, la densidad se quedaba en su suelo y el
    suelo era un número: plano. Por eso la región oscura de la derecha se veía
    tenue pero LISA, y por eso la tentación era subirla — lo que habría matado el
    contraste entre el lado incandescente y el lado oscuro, que es de lo mejor
    que tiene esta versión.

    Modulando el suelo con fabric aparecen filamentos DENTRO del hueco sin
    tocar su nivel: el factor promedia 0.95, así que la densidad media de la zona
    se queda donde estaba y lo único que cambia es que deja de ser uniforme.
  */
  density *= mix(mix(0.34, 0.78, cohesion) * mix(0.55, 1.35, fabric), 1.48, mass);
  /* El carril de polvo tambien afloja hacia fuera, y por una razon fisica: un
     carril OSCURECE porque hay polvo que absorbe, y en el extremo del disco no
     queda material suficiente para absorber nada. Mantenerlo ahi a plena
     potencia es lo que convierte una veta en un tajo que corta el borde. */
  float laneFloor = mix(mix(0.07, 0.20, cohesion), 0.58, smoothstep(0.52, 0.94, t));
  density *= mix(laneFloor, 1.0, laneMask);

  // Borde interior corto (el material se precipita). La anchura importa más de
  // lo que parece: el anillo de fotones ES la imagen lensada de ese borde, así
  // que un corte a navaja se proyecta como un círculo perfecto de anchura
  // constante y se lee como un contorno dibujado encima.
  density *= smoothstep(0.0, 0.08, t);

  /*
    Y EL EXTERIOR SE DESHILACHA, no termina en una corona.

    El radio donde muere el material varía con el campo turbulento y pesa sobre
    todo el MACRO, así que son sectores enteros los que terminan antes o alcanzan
    mucho más lejos: el disco se pierde en negro por streamers en vez de por una
    franja marrón de grosor constante.

    ── EL SIGNO ESTABA AL REVÉS ────────────────────────────────────────────────

    Era t + (shred - 0.5), con shred = streams·0.42 + macro·0.58. Un argumento
    mayor muere antes, así que la regla que se estaba aplicando era:

        mucho material en la vecindad  →  el disco termina PRONTO
        vecindad vacía                 →  el disco llega MUY LEJOS

    Justo del revés. Y el defecto que producía es exactamente el que se ve en el
    borde izquierdo: en un sector donde el macro está en su valle, todo el
    material de alrededor desaparece —porque el macro también multiplica la
    densidad— pero el corte radial le regala a ese mismo sector el alcance
    máximo. Lo que sobrevive es una hebra sola en el radio exterior, y a 9° de
    elevación una hebra en el radio exterior se proyecta como una línea larga,
    fina y casi horizontal: la gramática de una órbita, no la de un chorro de
    plasma. Con la escena llena de trayectorias dibujadas, esa confusión es
    especialmente cara.

    Invertido, el alcance sigue al material: un sector con masa llega lejos —y
    llega ANCHO, porque el macro que lo sostiene mide entre 8 y 23 unidades de
    mundo, así que arrastra vecindad consigo— y un sector vacío se apaga cerca.
    No cambia la media: el campo es simétrico alrededor de 0.5, sólo cambia QUÉ
    sectores se quedan largos.
  */
  /* El reparto pasa de 0.38/0.62 a 0.55/0.45 a favor de las corrientes.
     Con el macro mandando, el radio donde muere el material varía de forma muy
     suave a lo largo del contorno, y eso es justo lo que producía la cinta: un
     borde limpio de grosor casi constante estirándose hacia la izquierda.
     Dándole más peso a streams —que es el campo fino— el borde se rompe a
     escala de filamento y la cinta se deshace en hebras. La forma general no
     cambia: la sigue decidiendo el macro con casi la mitad del peso. */
  float reach = mix(streams * 0.55 + macro * 0.45, 0.5, soften);
  /* Y el corte se adelanta de (0.50, 1.06) a (0.43, 0.99). Es la compensacion
     exacta de invertir el signo: antes alcance y densidad se anulaban —llegaba
     lejos lo escaso— y ahora se refuerzan —llega lejos lo denso—, asi que a
     igualdad de corte el disco integra mas material. Medido, unos tres puntos de
     area en la banda. Adelantar el corte lo devuelve sin tocar la densidad de
     nada: el disco exterior termina un pelo antes, no mas gordo. */
  density *= 1.0 - smoothstep(0.43, 0.99, t - (reach - 0.5) * 0.64);

  /*
    Y una hebra suelta se disipa en vez de seguir kilómetros.

    Invertir el signo evita FABRICAR hebras aisladas, pero no borra las que el
    ruido produzca por su cuenta. Esto es el criterio que faltaba, escrito tal
    cual: lejos del centro, el material sólo existe si su VECINDAD existe. mass
    es la medida de vecindad —viene del campo macro, que es el único que describe
    la escala de las masas— así que donde la vecindad se ha ido, lo que quede se
    apaga progresivamente en vez de continuar como una raya de grosor constante.

    Sólo RESTA densidad, y sólo en el tercio exterior: no sube la media de nada,
    y de hecho compensa un poco la subida de la pasada anterior justo donde esa
    subida no hacía falta. El deshilachado, el grosor variable y la dirección
    orbital se conservan enteros — lo que desaparece es la continuidad de lo que
    ya no tiene con qué continuar.
  */
  /* La ventana se corre de (0.48, 0.92) a (0.60, 0.88) y el peso sube a 0.90, y
     las dos cosas van juntas: empezar mas tarde deja intacto el radio donde la
     hebra NACE —que es donde hacia falta pegamento, no tijera— y terminar antes
     y con mas fuerza hace que la PUNTA se disuelva en vez de continuar. Es la
     forma que se buscaba: nace del disco, se estira, adelgaza y se disipa, en
     lugar de mantener grosor constante durante muchos radios. */
  /* Y la puerta afloja: de 0.90 a 0.70, con la ventana corrida a (0.66, 0.94).
     En la pasada anterior se apreto para que la PUNTA se disipara, y funciono
     demasiado bien — disipar la punta y pegarla al disco son objetivos opuestos,
     y el que manda ahora es el segundo. Sigue existiendo el criterio de que el
     material aislado pierde presencia, solo que con menos mano. */
  /* La ventana se corre a (0.72, 0.96): el arranque más tardío deja que la
     unión con el cuerpo principal conserve grosor y complejidad, y la caída se
     concentra en el último tramo. Denso primero, filamentos después. */
  float lonely = smoothstep(0.72, 0.96, t) * (1.0 - mass);
  density *= 1.0 - lonely * 0.52;

  // La caída exponencial por orden entra en la DENSIDAD, no en la emisión: así
  // las imágenes de orden alto pierden a la vez brillo y opacidad, y dejan de
  // tapar lo que tienen detrás. Un arco que además es translúcido deja de
  // leerse como un aro y pasa a leerse como un reflejo del mismo material.
  density *= orderFade * outerFade;

  // Camino óptico: un rayo rasante atraviesa mucho más material que uno
  // perpendicular. Es un cociente, no una textura, y es lo que hace que el disco
  // se lea VOLUMÉTRICO de canto y translúcido de plano.
  /*
    Y el TECHO del camino óptico rasante era la otra causa de los aros sólidos.

    El tope estaba en |dir.y| ≥ 0.05, o sea camino óptico hasta ×20. Los rayos
    que forman las imágenes de orden superior cruzan el plano casi paralelos a
    él, así que caían todos en el tope: con ×20, cualquier densidad razonable
    satura alpha a 1 y el arco sale opaco, brillante y además tapando lo que hay
    detrás. Tres bandas opacas concéntricas es exactamente lo que se veía.

    El tope existe porque el disco aquí es un plano sin grosor y sin él la
    integral diverge; pero 0.05 era demasiado permisivo. A 0.13 el camino máximo
    baja a ×7.7, que es lo que atravesaría un disco de grosor realista. La imagen
    directa no se entera —a 9° de elevación |dir.y| vale 0.156, por encima del
    tope— y los arcos lensados pasan de opacos a translúcidos.

    El coeficiente sube de 0.40 a 0.52 para devolver al disco primario la
    opacidad que el tope más bajo le quita de paso.
  */
  float grazing = 1.0 / max(abs(dir.y), 0.13);
  alpha = 1.0 - exp(-density * grazing * 0.52);

  /*
    RAMPA TÉRMICA: blanco incandescente → crema → oro cálido → ámbar → cobre →
    naranja quemado.

    La anterior estaba desaturada de origen —el tramo medio era (1.00, 0.84,
    0.58) y el siguiente (0.94, 0.59, 0.28)— y ACES le quita saturación otra vez
    a todo lo que se acerca al blanco. Encadenando las dos pérdidas, el disco
    entero salía beige y gris: ni oro ni ámbar en ninguna parte, y eso lo alejaba
    de la referencia más que ninguna otra cosa.

    Los colores de aquí son los que hay que ver DESPUÉS del tone mapping, así que
    entran bastante más saturados de lo que se quiere ver. No hay azul en ningún
    tramo: el corrimiento al azul del lado que se acerca es real en física pero
    enfría justo la zona que tiene que leerse incandescente.
  */
  /*
    Y los tramos NO se solapan, que era el motivo del beige.

    Las ventanas iban 0.00-0.07, 0.05-0.22, 0.20-0.52, 0.52-1.00: cada mezcla
    empezaba a tirar hacia el color siguiente antes de que la anterior hubiera
    llegado al suyo. Así el oro nunca existe —se queda a medio camino entre crema
    y ámbar— y el ámbar nunca existe —se queda entre oro y cobre—. Interpolar en
    RGB lineal entre dos colores saturados pasa además por un centro desaturado,
    de modo que ese «a medio camino» permanente es literalmente beige.

    Ahora cada transición TERMINA antes de que arranque la siguiente, así que hay
    mesetas donde el color es el que dice ser: oro puro en t ∈ [0.11, 0.15],
    ámbar puro en [0.30, 0.36], cobre puro en [0.58, 0.64]. No sube la saturación
    global ni la exposición: sólo deja de promediar los tramos entre sí.
  */
  vec3 tint = vec3(1.00, 0.98, 0.93);
  tint = mix(tint, vec3(1.00, 0.84, 0.46), smoothstep(0.015, 0.11, t));
  tint = mix(tint, vec3(1.00, 0.60, 0.20), smoothstep(0.15, 0.30, t));
  tint = mix(tint, vec3(0.86, 0.34, 0.09), smoothstep(0.36, 0.58, t));
  tint = mix(tint, vec3(0.46, 0.15, 0.04), smoothstep(0.64, 1.00, t));
  // El polvo enfría el color, pero el grueso del oscurecimiento lo hacen la
  // opacidad y la función fuente.
  tint *= mix(0.52, 1.0, laneMask);

  // Corrimiento al rojo gravitacional (siempre) y beaming relativista (según el
  // interruptor). El material orbita a v = √(rs / 2(r − rs)) medido por un
  // observador estático local: 0.5c en la ISCO, y de ahí para arriba.
  float v = min(sqrt(0.5 * uRs / max(r - uRs, 0.30 * uRs)), 0.80);
  vec3 flow = normalize(vec3(hit.z, 0.0, -hit.x));
  float mu = dot(flow, -dir);
  float gamma = inversesqrt(max(1.0 - v * v, 1e-3));
  float beaming = 1.0 / max(gamma * (1.0 - v * mu), 1e-3);
  float gravity = sqrt(max(1.0 - uRs / r, 0.0));
  float g = gravity * mix(1.0, beaming, uDoppler);

  /*
    ASIMETRÍA. El exponente físico del beaming bolométrico es 4; aquí 3.4.

    Sube de 3.1 y el techo pasa de 4.4 a 6.6. La referencia tiene una asimetría
    brutal y el lado que se acerca llega a quemarse; lo que no puede pasar es que
    el otro lado se convierta en un recorte negro, y de eso se encarga el suelo.
    Baja a 0.13 —el lado que se aleja pierde más brillo— pero el material que hay
    ahí conserva estructura: densidad, masas y carriles son multiplicativos y
    sobreviven a cualquier nivel de exposición.
  */
  float boost = clamp(pow(g, 3.3), 0.24, 6.6);

  /*
    Y la asimetría también es de COLOR. El recorrido buscado es continuo —crema,
    oro cálido, ámbar, cobre, ámbar quemado— y no un corte entre un lado blanco y
    otro marrón. Por eso el empuje hacia el cobre pesa menos que el empuje hacia
    el crema: al lado que se aleja lo oscurece sobre todo boost, no el tinte.
    Escalado por uDoppler para que el interruptor apague el efecto entero.
  */
  float doppler = clamp((g - 1.0) * 1.15, -1.0, 1.0);
  /* Baja de 0.34 a 0.20: el empuje al crema lavaba justo el oro y el ámbar del
     lado que se acerca, que es donde más superficie ocupan. El lado approaching
     no pierde intensidad por esto — la pone boost, que llega a 6.6, y ACES ya
     blanquea solo lo que satura. Lo que se recupera es el color de todo lo que
     NO satura, que es la mayor parte. */
  tint = mix(tint, vec3(1.00, 0.98, 0.93), max(doppler, 0.0) * 0.20 * uDoppler);
  tint = mix(tint, vec3(0.62, 0.29, 0.10), max(-doppler, 0.0) * 0.46 * uDoppler);

  /*
    Y los ordenes superiores pierden identidad cromatica propia.

    No es un retoque de paleta: la rampa global no se toca. Es que un orden alto
    comprime decenas de radios de disco en pocos pixeles, asi que su color deberia
    ser el PROMEDIO de todo lo que apila, y un promedio de crema, oro, ambar y
    cobre es un crema calido — no una linea naranja. Pintarlo con el tinte del
    radio exacto donde cayo el cruce es lo que le daba a cada aro inferior un
    color propio y lo separaba visualmente del resto.

    Empujarlos hacia ese crema los funde entre si y con la imagen principal, que
    es justo la lectura que se busca: la misma masa de plasma doblada, no bandas
    apiladas de colores distintos. La primera imagen lensada queda intacta.
  */
  tint = mix(tint, vec3(1.00, 0.94, 0.86), clamp(lensed * 0.22, 0.0, 0.62));

  /*
    PERFIL RADIAL: exponente 1.62, ni el bolométrico ni el 1.15 de antes.

    El bolométrico deja el borde interior 40 veces por encima del exterior y el
    tone mapping no tiene sitio para los dos: el disco exterior se apaga a marrón
    y el conjunto se lee como un núcleo brillante con una cola muerta. Pero 1.15
    se pasaba al otro lado — con la energía casi igualada en todo el radio, los
    brazos exteriores competían en brillo con el material interior y el resultado
    era una espiral plana, o sea una galaxia.

    A 1.62 el exterior queda al 2.2 % del interior en vez de al 5.3 %: el ojo ve
    primero un plano de plasma incandescente pegado a la sombra y unos streamers
    de cobre perdiéndose fuera, que es la jerarquía de energía de la referencia —
    allí lo blanco vive junto al horizonte y dentro de las imágenes lensadas, y
    todo el disco primario lejano es una banda oscura de óxido. El exterior no
    desaparece: deja de mandar.
  */
  float heat = pow(uDiskInner / r, 1.62);

  /*
    FUNCIÓN FUENTE: la misma textura que la opacidad, MÁS las masas macro.

    Cuando el camino óptico satura (alpha → 1) la densidad deja de importar: con
    una fuente uniforme, toda la banda brillante colapsa a un blanco plano. Al
    modular también la emisión, la estructura sobrevive DENTRO del blanco, y
    físicamente es lo correcto — los grumos densos están más calientes.

    El factor macro es lo que produce las grandes diferencias de energía que
    faltaban: una masa densa no sólo tapa más, además emite tres veces más que un
    hueco. De ahí salen las zonas quemadas concentradas en lugar de una
    exposición uniforme por todo el disco.
  */
  /* Los suelos suben con la cohesión igual que en la densidad, y por el mismo
     motivo: subir sólo la opacidad de un hueco no lo saca del negro si lo que
     hay dentro no emite. Con los dos a la vez, el fondo de un hueco de la banda
     primaria pasa de 1.4·10⁻⁴ del pico a 3·10⁻³ — sigue siendo oscurísimo, pero
     ya tiene estructura que mirar en vez de ser fondo. */
  float source = mix(mix(0.30, 0.42, cohesion), 1.85, fabric)
               * mix(mix(mix(0.34, 0.48, cohesion), 0.72, smoothstep(0.52, 0.94, t)), 1.0, laneMask)
               * mix(mix(0.45, 0.80, cohesion), 1.40, mass);

  vec3 emission = tint * heat * boost * source * DISK_GAIN;

  // Rodillo de altas luces, ANTES del bloom y del tone mapping. ACES aplana todo
  // lo que pase de ~3, así que un disco que llega a 28 entrega su mitad brillante
  // como una mancha sin gradiente. Esto comprime la meseta dejando que el núcleo
  // siga clipando: el pico se mantiene incandescente y el resto recupera
  // pendiente donde dibujar la textura. Se usa el canal máximo y no la luminancia
  // para no desplazar el tono al comprimir.
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
  /* Camino recorrido por el rayo. Es lo que hace crecer la huella del píxel, y
     en un espacio curvo no coincide con la distancia a la cámara. */
  float travelled = 0.0;
  bool escaped = false;
  bool captured = false;

  for (int i = 0; i < MAX_STEPS; i++) {
    float r2 = dot(pos, pos);
    float r = sqrt(r2);

    if (r < uRs) { captured = true; break; }
    // Dentro de la esfera de fotones y entrando: no hay retorno posible. Es
    // exacto, no una heurística, y ahorra las ~40 iteraciones agónicas que un
    // rayo capturado pasa asintotándose al horizonte.
    if (r < 1.5 * uRs && dot(pos, dir) < 0.0) { captured = true; break; }
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
      min(uStepScale * r2 * invH, 0.55 * (r - uRs) + 0.02 * uRs) * relax,
      0.02,
      9.0
    );

    vec3 acc = -1.5 * uRs * h2 * pos / (r2 * r2 * r);
    vec3 nextPos = pos + dir * dt + 0.5 * acc * (dt * dt);
    float n2 = dot(nextPos, nextPos);
    vec3 nextAcc = -1.5 * uRs * h2 * nextPos / (n2 * n2 * sqrt(n2));
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
          travelled + dt * f,
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
    travelled += dt;
  }

  // Solo los rayos que escapan ven cielo. Los capturados y los que agotan pasos
  // (el hilo justo alrededor del anillo de fotones, donde la órbita da vueltas)
  // se quedan con lo que hayan acumulado del disco.
  if (escaped && transmit > 0.002) {
    /*
      DÓNDE SE CURVA EL CIELO, y por qué el mando es el PARÁMETRO DE IMPACTO.

      La primera versión de esta puerta comparaba la dirección de salida con la
      de entrada —cuánto se ha desviado este rayo— y no funcionó: medida sobre
      el render, valía 0.88 en las esquinas y 1.00 en el centro, o sea que no
      separaba nada. El motivo es que el integrador no renormaliza dir, así que
      1 - dot(straight, dir) mezcla el ángulo con la DERIVA DE MÓDULO del
      leapfrog, que es del orden de medio punto porcentual y no depende de la
      posición en pantalla. Normalizar tampoco lo arregla del todo: lo que queda
      es el error angular acumulado en cinco mil pasos, que también es casi
      constante. Una puerta construida sobre el residuo numérico del integrador
      es una puerta que no se abre.

      El parámetro de impacto no tiene ese problema porque se conoce ANTES de
      integrar: es la distancia a la que el rayo pasaría del centro si no
      hubiera gravedad, y es exactamente la variable de la que depende la
      deflexión (alfa = 2·rs/b). Se calcula con un producto vectorial y no tiene
      error acumulado de ninguna clase.

      Los dos números, en radios de Schwarzschild y para el encuadre de
      1440×860: la puerta está entera hasta b = 17 rs —que son los 340 px
      alrededor de la sombra, donde el estiramiento ES la escena— y cerrada en
      b = 30 rs, unos 560 px. Las esquinas quedan en 35-40 rs, o sea fuera.
    */
    float impact = length(cross(uCamPos, straight));
    float lensing = 1.0 - smoothstep(uRs * 17.0, uRs * 30.0, impact);
    vec3 skyDir = normalize(
      mix(straight, dir, uSkyLens * mix(0.72, 1.0, lensing))
    );
    color += transmit * skySample(skyDir, lensing);
  }

  /*
    NO HAY TERMINO DE ANILLO DE FOTONES, y quitarlo es el arreglo.

    Había una línea analítica en el parámetro de impacto crítico, b = √27/2·rs,
    que existía para «recuperar el filo» que la compresión de altas luces y ACES
    se comían. La intención era buena y el número es correcto —la convención de
    unidades del integrador es rs = 2GM/c², con horizonte en r = rs, esfera de
    fotones en 1.5·rs y el término (3/2)·rs·u² en la geodésica, así que b crítico
    = 3√3·GM/c² = (√27/2)·rs ≈ 2.598·rs— pero el resultado era indefendible:

    b es constante sobre una circunferencia EXACTA de la pantalla, y una
    circunferencia exacta de un píxel de ancho es un círculo dibujado encima. Da
    igual con qué se module: mientras el material lensado rodee la sombra por los
    cuatro costados, la modulación por luminancia deja el trazo completo. Era el
    elemento más gráfico del cuadro y el que primero delataba el render.

    El filo lo dibuja quien tiene que dibujarlo: el apilamiento de imágenes de
    orden superior que produce la propia integración. Ese apilamiento hereda
    textura, cortes, masas y asimetría del material —ahora de verdad, con soften
    casi a cero— así que el borde de la sombra sale irregular, más brillante
    donde el material se acerca y apagado donde se aleja, que es como se ve en la
    referencia. Menos código y mejor modelo.
  */

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
