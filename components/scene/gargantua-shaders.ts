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
// Modos de diagnóstico del banco visual, empaquetados en bits (ver
// diagnosticCode en lib/visual-bench.ts): 1 gris de densidad, 2 sólo la
// imagen directa, 4 sólo las lensadas. 0 es producción, y es una rama
// uniforme: el compilador la resuelve por invocación, no por píxel.
uniform float uDiag;

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
/*
  Y la rodilla BAJA de 9.6 a 5.5 (2026-09-12, en dos rondas), rompiendo a
  propósito la proporción de arriba.

  Con 9.6 la meseta del rodillo quedaba muy por encima del hombro de ACES: todo
  lo que pasaba de ~3.4 antes del rodillo salía blanco, y con un beaming que
  llega a 6.6 eso era la mitad interior del lado que se acerca — una mancha
  sin gradiente del tamaño de la sombra, iluminada como por un reflector. El
  pico sigue clipando (6.6 sobre ACES es blanco igual), pero la meseta cae
  sobre el hombro y ahí la textura de la función fuente vuelve a tener
  pendiente: el blanco puro pasa a ser una propiedad de los nudos, no de una
  región. Los medios apenas se mueven porque el rodillo casi no los toca.
*/
const float DISK_GAIN = 5.9;
/*
  5.5 → 4.2 (pase de borde, 2026-09-21). Con el enrollado a 0.60 el blanco
  recortado volvió a 2 177 px y el dueño lo leyó como demasiado: no de
  intensidad —el horizonte y el arco lensado tienen que quemar— sino de
  EXTENSIÓN, porque la cara lejana izquierda salía como una pared blanca
  lisa donde la referencia tiene crema con fibra y una franja fina quemada
  junto al agujero. La palanca es ésta y no la exposición ni el bloom, como
  fijó el pase final del 2026-09-12: la rodilla comprime la meseta y deja que
  el pico siga clipando, así que el blanco pierde anchura sin perder brillo
  en el horizonte y el crema recupera pendiente para dibujar sus carriles.
  Medido a 4.8 y a 4.2: el blanco ≥ 250 baja de 2 177 a 1 791 y a 1 268 px,
  todo él a menos de 1.7 radios de sombra del centro —no hay blanco puro en
  la cara lejana con ninguna rodilla; lo que ahí se lee como pared es la
  meseta ≥ 235, que baja de 6 009 a 4 745 px—. Se toma 4.2, que es la mitad
  del blanco que el dueño encontró excesivo.
*/
const float HIGHLIGHT_KNEE = 4.2;

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

vec3 skySample(vec3 dir, float lensing, float presence) {
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
  float bright = mix(0.58, 1.0, presence);
  vec3 color = vec3(0.0);
  /* Y las dos escalas gruesas pagan además un peso, porque el trazo largo lo
     dejan ellas: una estrella de la capa fina no llega a tres píxeles ni
     estirada. Medido con tools/star-streaks.mjs sobre el render, los trazos de
     la periferia —manchas de aspecto > 1.7 Y más de 5 px de largo— son casi
     todos de la escala 44. */
  color += starLayer(dir, 44.0, 0.100, bright)
         * vec3(1.00, 0.97, 0.92) * 0.48 * mix(0.58, 1.0, presence);
  color += starLayer(dir, 112.0, 0.150, bright)
         * vec3(0.88, 0.93, 1.00) * 0.33 * mix(0.72, 1.0, presence);
  color += starLayer(dir, 246.0, 0.205, bright)
         * vec3(1.00, 0.93, 0.84) * 0.19 * mix(0.90, 1.0, presence);
  // Cuarta escala, la más fina: densidad subpíxel que rellena el cielo entre
  // las tres anteriores. Sin ella, subir sólo el brillo daba estrellas más
  // gordas en vez de un cielo más poblado, que es lo que se pedía. Es EL campo
  // fino, así que se queda entera: lo que se retira de la periferia son los
  // trazos grandes, no el cielo.
  color += starLayer(dir, 520.0, 0.235, 1.0) * vec3(0.94, 0.96, 1.00) * 0.10;

  // Distant, static gas banks in world direction, without a spherical UV seam.
  // Only escaping rays see them: the shadow and the disk still occlude the sky.
  vec2 p = vec2(dir.x * 6.0, dir.y * 8.0);
  float warp = fbm3(p * 0.7 + vec2(4.7, 9.2));
  float gas = fbm(p * 1.8 + vec2(warp * 2.0, -warp));
  float filament = pow(max(0.0, gas - 0.24), 1.6);
  vec2 leftOffset = vec2((dir.x + 0.38) / 0.30,
                         (dir.y - 0.03 + dir.x * 0.25) / 0.23);
  vec2 rightOffset = vec2((dir.x - 0.42) / 0.32,
                          (dir.y + 0.30 - dir.x * 0.2) / 0.27);
  // pow(x, 2.0) is undefined for negative x in GLSL. Squared lengths are not.
  float leftBank = exp(-dot(leftOffset, leftOffset));
  float rightBank = exp(-dot(rightOffset, rightOffset));
  float dust = 0.3 + 0.7 * min(1.0, abs(gas - warp) * 7.0);
  vec3 gasColor = leftBank * vec3(0.11, 0.25, 0.44)
                + rightBank * vec3(0.24, 0.144, 0.38);
  color += gasColor * filament * dust * mix(1.0, 0.4, lensing);

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
/*
  ALTURA DE ESCALA DEL DISCO — lo unico que el material sabia del eje vertical
  era la inclinacion del RAYO, nunca la suya propia.

  Hasta aqui el disco era la superficie y = 0 y nada mas: el cruce se interpola
  exactamente a y = 0 y hit.y no se lee en ninguna parte del material. De ahi
  sale el tercer defecto del pase, y explica por que no se podia arreglar ni con
  exposicion ni con encuadre — un anillo de espesor CERO visto a 9 grados de
  elevacion proyecta una elipse cuyos extremos del eje mayor son puntas
  matematicas, porque el borde interior y el exterior convergen ahi.

  Un disco de acrecion real tiene altura, y la altura CRECE con el radio: el gas
  esta ligado mas debilmente lejos del agujero, asi que la misma presion lo
  infla mas. Es lo que hace que en la referencia las ansas sigan siendo una
  banda hasta salirse del cuadro en vez de cerrarse en un pico — ahi se mira una
  pared de material de varios radios de alto, no el canto de una hoja.

  Se declara como fraccion del radio y no en unidades de mundo para que sea la
  MISMA forma a cualquier escala: H/r pasa de 2.2 % junto al borde interior a
  6.5 % en el exterior. Son numeros bajos a proposito — un disco delgado sigue
  siendo delgado, y lo que se busca no es una rosquilla sino que la punta deje
  de ser un punto.
*/
/*
  Y EL CUERPO ES DELGADO; SÓLO EL BORDE SE ABOCINA (2026-09-19).

  La rampa lineal de 2.5 % a 9 % daba al disco medio una altura que a 9° de
  elevación se convierte en una travesía de varios radios —el canto que se
  quería para las ansas, pagado en todo el cuerpo—. La altura que importa para
  la silueta es la del ÚLTIMO tramo del radio, donde el disco termina; en el
  cuerpo, una capa gruesa sólo desenfoca en radial la textura que la referencia
  enseña nítida. Así que H/r se queda plano hasta el 60 % del radio y sube en
  el último 40 %, que es donde la travesía tiene que atravesar canto.
*/
float alturaEscala(float r) {
  float k = clamp((r - uDiskInner) / max(uDiskOuter - uDiskInner, 1e-3), 0.0, 1.0);
  return r * mix(0.025, 0.085, smoothstep(0.60, 1.0, k));
}

vec3 diskSample(vec3 hit, vec3 dir, float order, float travelled, out float alpha) {
  /*
    UNA IMAGEN DEL ENVÉS ES UNA IMAGEN LENSADA, cuente lo que cuente el índice.

    order sólo cuenta cruces DENTRO del disco. El rayo que pasa por debajo del
    borde cercano —o por su tramo exterior, que ya es casi transparente— no
    cruza nada, dobla bajo el agujero y sube hasta cortar el plano detrás: ese
    corte es el primero que cuenta, así que llegaba aquí como imagen directa y
    ninguno de los repartos de orden lo tocaba. Y ése es el arco inferior
    entero. Medido con un render de sólo orden 0 y otro de sólo órdenes altos
    (2026-09-12): los arcos de cobre concéntricos bajo la sombra —«una segunda
    copia circular del disco»— eran orden 0 en su totalidad; los órdenes altos
    sólo ponían el filo y el tramo que se ve A TRAVÉS de la banda frontal.

    La cámara está siempre por encima del plano, así que un cruce hacia ARRIBA
    es, por construcción, luz que ha dado la vuelta por debajo: se trata como
    primera imagen lensada y hereda su desvanecido exterior, su ablandado y su
    tinte. La imagen directa —banda frontal y arco superior, que cruzan hacia
    abajo— no se entera.
  */
  float under = step(0.0, dir.y);
  order = max(order, under);
  /*
    MODOS DE DIAGNÓSTICO (2026-09-20, pase de gramática común). Se decodifican
    con mod porque GLSL ES 1.0 no tiene operadores de bits. «Sólo directa»
    devuelve vacío en cualquier cruce lensado —sin alpha, para que el rayo
    siga—; «sólo lensada» conserva la OPACIDAD de la imagen directa y le quita
    la luz, así que lo que se ve es la contribución lensada tal como llega a
    la imagen final, con la banda frontal tapando lo que tapa. El gris de
    densidad se resuelve al final, donde ya existe la densidad.
  */
  bool diagDensidad = mod(uDiag, 2.0) >= 1.0;
  bool diagDirecta = mod(floor(uDiag * 0.5), 2.0) >= 1.0;
  bool diagLensada = uDiag >= 4.0;
  if (diagDirecta && order > 0.5) { alpha = 0.0; return vec3(0.0); }
  float diagLuz = (diagLensada && order < 0.5) ? 0.0 : 1.0;
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
  /*
    1.15 → 0.60 (pase de borde, 2026-09-21). El dueño marcó el contorno: «el
    borde izquierdo se ve unificado, forma de disco; el derecho deformado
    totalmente». Se midió con la silueta espejada del gris de densidad y se
    probaron por orden la envolvente, el techo y el suelo exteriores del
    macro y cinco fases azimutales del campo: ninguna movió la forma del
    borde derecho más de unos puntos. Lo que sí la movió fue INVERTIR el
    sentido del enrollado (prueba temporal, Q-quiral-dens): la corriente fina
    de la cara lejana y el lóbulo inferior cambiaron de lado enteros. O sea
    que no es una realización ni un lado: es la QUIRALIDAD de la espiral
    trailing vista a 9° de elevación, en la que el brazo que sale hacia fuera
    barre siempre hacia el ansa del mismo lado. La palanca sin lado es este
    enrollado GLOBAL, que es la integral de la cizalla: baja de 0.43 a 0.22
    vueltas. La cizalla LOCAL (WIND_SWING), que es la que estira los
    filamentos en tangencial, no cambia; lo que cambia es cuánto se lleva una
    masa alrededor del disco mientras cae, que es justo lo que descentraba
    las ansas.
  */
  const float WIND_MEAN = 0.60;
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
  /** Cuánta amplitud conserva el campo macro alrededor de su línea base: 1 es
   *  el campo crudo, 0 un disco sin masas. Ver la nota de macroRaw. */
  const float MACRO_SWING = 0.68;
  /*
    Exponente del filtro sobre la cizalla. Ver la nota larga en streamsRaw: es
    el mismo compromiso que pow(slant, 0.24), medido con tools/stability.mjs.
  */
  const float AA_SHEAR = 0.5;

  float spin = omega * 0.30;
  /* Fase azimutal del campo estático: gira la realización entera alrededor
     del disco. 0 es la de siempre. Ver el barrido del pase de borde. */
  const float DISK_PHASE = 0.00;
  float windStatic = wind + pitchNoise * logR + DISK_PHASE;
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

  /*
    LA DIRECCIÓN DEL FLUJO SE CONOCE ANTES DEL BUCLE (2026-09-19). mu —el
    coseno entre la velocidad orbital y el rayo— decide el beaming y la
    presencia por lado. Se calcula aquí porque los dos se necesitan más abajo
    y porque el pase de cohesión lo usó también dentro del bucle, para meter
    el grano como polvo oscuro en los carriles SÓLO del lado que se acerca:
    allí el material satura a blanco y lo único que sobrevive dentro del
    blanco es lo que absorbe.

    ── Y el polvo deja de tener lado (2026-09-20, pase de gramática común) ──

    Aquella puerta era un modificador MORFOLÓGICO por sector: cambiaba la
    topología del campo de carriles en una mitad del disco —hebras finas
    dentro del carril a la izquierda, carril liso a la derecha— y el encargo
    de este pase es que la gramática del material sea la misma en todo el
    contorno y que lo que separe los lados sea cómo se ve (beaming, tinte,
    profundidad óptica), no qué hay. Así que el polvo fino entra en los
    carriles en TODO el disco, con la misma ventana radial: en el lado
    claro sigue siendo lo único legible dentro del blanco, y en el oscuro
    rompe el canto de los carriles con la misma hebra. Medido antes de
    tocarlo: apagar uDoppler entero movía el gris de densidad 0.93 niveles
    de media, o sea que este término no era el que separaba los lados; se
    iguala por principio, no por efecto.
  */
  vec3 flow = normalize(vec3(hit.z, 0.0, -hit.x));
  float mu = dot(flow, -dir);
  float laneDust = smoothstep(0.08, 0.30, t);

  float fabricSum = 0.0;
  float laneSum = 0.0;
  float macroSum = 0.0;
  float macroRawSum = 0.0;
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
    float macroRaw = m1 * 0.62 + valueNoise(macroP * 2.35 + 12.7) * 0.38;
    /*
      EQUILIBRIO DE MACRO-DENSIDAD (2026-09-20, pase de gramática común, segunda
      entrega). El campo macro es estático —ver la nota de las épocas: la
      realización de edad cero se repite cada EPOCH— y en esta realización el
      ansa derecha cae en un valle ancho del componente de frecuencia más baja
      mientras la izquierda cae en una masa. En el gris de densidad, sin
      Doppler y antes del lensado, una mitad se leía LLENA y la otra VACÍA, y
      eso ya no es turbulencia: es la identidad permanente del disco. El dueño
      pidió limitar cuánto puede vaciar una región entera el componente de
      frecuencia más baja, sin simetría bilateral ni copiar ruido entre lados.

      La solución es estadística y sin lado: se le sube el SUELO al macro
      hacia una línea base estable (0.5, o sea el disco medio a ese radio; la
      variación radial la pone la envolvente) con MACRO_SWING, y sólo el
      suelo. Un valle de 0.15 pasa a 0.255; una masa de 0.85 sigue en 0.85.
      Se probó primero comprimir por los dos lados (mix hacia 0.5 también en
      las masas) y salió medido: las masas pierden techo, y como la densidad
      y la función fuente escalan con mass, el blanco recortado del cuadro
      caía de 1 715 a 1 319 px, que es justo lo que el dueño pidió no seguir
      perdiendo. Con el suelo solo, ningún valle puede vaciar media ansa y
      ninguna masa se apaga. El caos de escala menor no se toca: corrientes,
      grano, cortes y carriles son campos aparte, y el macro sigue entrando
      en ellos con su forma. La ENVOLVENTE lee el macro crudo (macroRaw,
      abajo, en reach): dónde muere el material y la silueta no cambian ni
      un píxel.
    */
    float macro = max(macroRaw, mix(0.5, macroRaw, MACRO_SWING));

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
    /* Y la cresta afloja hacia fuera (0.38 → 0.22 desde t 0.45 a 0.90, pase de
       cohesión): dentro fibra, fuera nube. En las ansas la proyección gira
       cualquier dirección dominante del ruido hasta leerse como barras
       radiales; una textura de bulto no tiene dirección que girar, que es lo
       que hace que en la referencia los brazos se adelgacen en nube y no en
       abanico. */
    float streams = mix(streamsRaw, ridged, mix(0.38, 0.22, smoothstep(0.45, 0.90, t)));

    /*
      MICROFILAMENTOS: sólo dentro, y con peso decreciente.

      El grano tenía peso fijo 0.38 en todo el disco y cuatro octavas. Sumado a
      unas corrientes ya trituradas por la cizalla, daba un espectro casi plano
      —cientos de líneas de importancia visual idéntica, que es la definición del
      defecto—. Ahora se desvanece hacia fuera: el disco exterior se queda con las
      corrientes anchas y el material comprimido de dentro conserva los estriados
      finos que transmiten velocidad.
    */
    /*
      Y el CARÁCTER del material cambia por sectores (2026-09-12). Con el peso
      del grano dependiendo sólo del radio, todas las bandas de un mismo radio
      tenían la misma textura y el disco se leía como una sola superficie
      coherente. Modulándolo con m2 —que ya está calculado y es de escala
      macro— unos sectores salen estriados y otros lisos y anchos, a igual
      radio. No es más ruido: es el mismo ruido repartido con criterio.
    */
    /*
      Y EL SUELO SUBE DE 0.30 A 0.55, con la frecuencia detras.

      El criterio de arriba —que el grano pese menos hacia fuera— sigue siendo
      bueno, pero estaba aplicado con una mano que se llevaba la textura entera:
      el factor radial caia 3.33 veces y el de sector otras 1.8, asi que el
      grano exterior se quedaba en el 16.5 % del interior. Y la FRECUENCIA caia
      con el, de 5.1 a 1.5, o sea que el disco exterior perdia a la vez cuanta
      textura tiene y a que escala. Dos decaimientos multiplicados dan lo que el
      dueno llama aerografiado: una banda marron sin nada dentro, que es el
      segundo de los tres defectos del pase.

      La regla que lo sustituye: EL BORDE PIERDE OPACIDAD ANTES QUE ESTRUCTURA.
      Quien apaga el disco exterior es la envolvente de la silueta, que
      multiplica la densidad; el grano no tiene por que ayudarla, y ayudandola
      convierte un gas tenue con filamentos en una mancha.

      No se vuelve al peso fijo de 0.38 en todo el radio, que es lo que producia
      el espectro plano —cientos de lineas de la misma importancia visual—: el
      grano sigue pesando menos fuera que dentro y sigue variando por sector con
      m2. Lo que cambia es cuanto menos.
    */
    /* Y la variación por sector se estrecha, 0.55-1.0 → 0.75-1.0 (2026-09-20,
       pase de gramática común). Con casi el doble de grano en unos sectores
       que en otros, un sector salía granulado y el vecino liso, y cuando uno
       cae a cada lado del agujero —que es lo que pasa con el campo estático de
       este disco— los dos lados se leen como dos familias de textura. Sigue
       habiendo sectores más estriados que otros; lo que no hay es sectores
       de otro material. */
    float fine = mix(1.0, 0.55, smoothstep(0.12, 0.72, t))
               * mix(0.75, 1.0, smoothstep(0.30, 0.70, m2));
    float grainFreq = 3.0 * mix(1.70, 0.85, t);
    float grain = fbmAA3(
      shearedFine * grainFreq + (wa - 0.5) * 1.4,
      /* El grano se filtra con más huella que las corrientes (exponente total
         0.40 sobre slant, no 0.24): en la banda frontal su celda radial mide
         menos de un píxel y lo que sobrevivía al filtro corto no era grano,
         era su componente tangencial aliaseada en hebras. */
      footprint * grainFreq * WARP_GAIN * pow(stretchFine, AA_SHEAR) * pow(slant, 0.16)
    );

    float fabric = clamp(mix(streams, mix(streams, grain, 0.42), fine), 0.0, 1.0);

    /*
      INTERRUPCIONES. Ninguna corriente da la vuelta entera.

      Sale de campos ya calculados, así que es gratis. El término grueso pasa de
      la deformación al campo macro: los cortes dejan de estar repartidos con la
      misma frecuencia por todas partes y se agrupan en sectores, que es como se
      interrumpe un flujo de verdad.
    */
    /*
      Y el macro SALE del campo de cortes (2026-09-20, pase de gramática
      común). Con macro·0.22 dentro, los cortes se agrupaban justo donde el
      macro está en su valle: los sectores VACÍOS salían además troceados en
      segmentos cortos y los DENSOS continuos, y ésa es una regla que hace
      que el material tenue sea de otra familia —hebras cortas, mota— que el
      denso —corrientes largas—. Medido en el gris de densidad de la vista
      canónica: el brazo que cae en el valle (derecha) se leía moteado y el
      que cae en la masa (izquierda) laminar, y apagar todos los términos por
      lado no lo cambiaba. Los cortes se siguen agrupando por sectores —wb es
      un campo de deformación con celdas de ~4 unidades— pero ya no por
      densidad: un flujo tenue se interrumpe con el mismo ritmo que uno denso.
    */
    float breakField = wb * 0.72 + grain * 0.28;
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
    /*
      Y EL POLVO DEJA DE SEGUIR AL MACRO (2026-09-20, pase de gramática común).

      Con macro·0.42 dentro del campo de carriles, el carril más ancho caía
      SIEMPRE donde el macro está en su valle: el mismo sector perdía densidad
      por la envolvente de masas y, encima, absorbía como polvo. Medido en el
      gris de densidad de la vista canónica, el brazo derecho lleva a r ≈ 10-11
      rs una franja de 1.2 rs de ancho en la que el gris cae a la décima parte
      —y casi todo lo pone laneAbs, no la densidad—, y ésa es la «depresión
      oscura» entre la corriente superior y el abanico que el dueño leía como
      dos materiales: masa clara de plasma a un lado y polvo opaco al otro.
      La MITAD de ese peso pasa a wb, el campo de deformación gruesa, que tiene
      celdas del mismo orden (≈4 unidades) y NO está correlado con las masas:
      con eso hay carriles también dentro de las masas —la referencia cruza su
      crema con polvo, no lo deja liso— y un valle deja de ser el doble de
      oscuro. Se probó primero con el macro fuera del todo y salió medido: el
      polvo caía entero sobre lo brillante y el blanco recortado del cuadro
      bajaba de 2 411 a 578 px, o sea un cuarto, con la cara lejana izquierda
      convertida en óxido. Eso ya no era redistribuir el polvo, era apagar el
      disco, y el blanco no es palanca de este pase. Con la mitad, el valle
      derecho se rellena y el crema conserva su núcleo. La escala de los
      carriles no cambia —sigue siendo la del fbm de 0.145— ni su ventana ni
      su absorción.
    */
    float lanes = fbm3(warped * 0.145 + 11.3) * 0.58 + mix(macro, wb, 0.5) * 0.42;
    // Y el grano entra en los carriles como polvo fino, en todo el disco: ver
    // la nota de laneDust, encima del bucle.
    lanes -= (grain - 0.5) * 0.22 * laneDust;
    fabricSum += fabric * weight;
    laneSum += lanes * weight;
    macroSum += macro * weight;
    macroRawSum += macroRaw * weight;
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
  float macroRaw = macroRawSum;
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
  /* 1.8 → 1.55 (2026-09-12): con el interior de la sombra apagado, el filo
     que la separa del disco lo dibujan los órdenes altos apilados contra la
     curva crítica, y con 1.8 salían tan tenues que el borde se leía difuso.
     Siguen siendo una caída exponencial —nadie cuenta aros— pero la línea
     existe. */
  float orderFade = exp(-higher * 1.3);
  /* La primera lensada también se ablanda un poco (0.18): pierde microdetalle,
     que es parte de lo que la hacía identificable como pieza aparte. */
  /* Y baja a 0.10 (2026-09-12): con 0.18 el arco inferior salía como una
     segunda copia lisa del disco, un aro regular sin cortes ni carriles. Con
     menos ablandado conserva sus interrupciones y sus masas, así que aparece y
     desaparece por tramos en vez de dar la vuelta entera. Los órdenes altos
     compensan con 0.32 y se quedan donde estaban. */
  float soften = clamp(order * 0.10 + higher * 0.32, 0.0, 0.70);

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
  /* 0.42 → 0.70 (2026-09-12): la primera lensada pierde casi todo su disco
     exterior. Lo que el ojo leía como «una segunda copia circular del disco»
     eran sus bandas de cobre —el disco lejano comprimido en arcos concéntricos
     del mismo color que la banda primaria—. Sin ellas el arco inferior es el
     material interior, fino y crema, y se lee como luz doblada, no como otro
     disco. Se mantiene un 30 % para que no termine en un filo seco. */
  /* Y la rampa se adelanta de (0.10, 0.55) a (0.08, 0.42): lo que seguía
     dibujando bandas concéntricas bajo la sombra era el ámbar de t 0.3-0.55,
     que la rampa anterior dejaba casi entero. El arco se queda con el oro y
     el crema interiores, que es lo que enseña la referencia. */
  /* Y el GROSOR del arco inferior varía a lo largo de él: la rampa se corre con
     el campo grueso sólo en los cruces del envés, así que unos tramos salen
     anchos y otros finos en vez de un aro de calibre constante. */
  float arcGauge = (wa - 0.5) * 0.14 * under;
  float outerFade = 1.0 - smoothstep(0.08 + arcGauge, 0.42 + arcGauge, t) * clamp(lensed * 0.70, 0.0, 0.90);
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
  /*
    PRESENCIA POR LADO (2026-09-12). El beaming ya reparte la LUZ —el lado que
    se acerca sale más de dos veces más luminoso en la imagen final— pero no la
    MATERIA: los dos lóbulos tenían la misma densidad, el mismo grosor y la
    misma extensión, y el ojo los leía como un objeto simétrico con un lado
    iluminado. Un disco real no es axisimétrico —modos m = 1, ondas de densidad—
    y aquí se toma la libertad, pequeña, de anclar esa asimetría al mismo lado
    que el beaming: un 12 % más de densidad hacia la cámara y un 12 % menos en
    el lado que se aleja. Es presencia, no brillo, y apaga con el interruptor.
  */
  // flow y mu se calculan antes del bucle de épocas. 0.12 → 0.08 (pase de
  // cohesión): con un 12 % de densidad extra el brazo que se acerca llegaba
  // más lejos y más roto que el otro, y la asimetría de PRESENCIA se leía como
  // dos familias de borde. La de luz la sigue poniendo boost.
  float presence = 1.0 + 0.08 * clamp(mu, -1.0, 1.0) * uDoppler;

  /*
    MICROVARIACIÓN DEL LADO QUE SE ALEJA (2026-09-12, ronda final). Con el
    beaming en su suelo, ese lado llega al tone mapping con poco rango y todo
    su detalle cae en la misma zona de cobre: se leía liso frente al drama del
    lado que se acerca. No se le mete más ruido; se le sube el CONTRASTE del
    mismo tejido —cortes más oscuros y filamentos más claros— y el calibre
    varía más. Ligado a mu y al interruptor del Doppler, como la presencia.
  */
  /*
    Y SE AFLOJA (2026-09-19, pase de cohesión): 0.35 → 0.15 de contraste, 0.3 →
    0.1 de calibre, y el pozo abajo de ×1.5 a ×1.15. Medido en la captura, en
    la línea media del brazo que se aleja se apilaban boost en su suelo (0.24),
    presencia 0.88, este contraste, el pozo, el tinte cobre y el valle macro del
    sector, y el producto dejaba el interior del brazo en L 14-29: una ZANJA
    negra de 200 px justo en la costura entre la mitad lejana y la cercana, que
    es lo que las partía en dos láminas. La referencia tiene ahí un resalte
    crema. La microvariación que pidió la ronda final sigue existiendo, pero
    ahora la ponen los carriles —que desde este pase absorben después del
    rodillo y cortan hasta el borde— y no un contraste que sólo actúa en un
    lado y le da una estadística de textura distinta.
  */
  /*
    ── Y SE RETIRA DEL TEJIDO (2026-09-20, pase de gramática común) ────────────

    El contraste extra del tejido y el calibre extra del lado que se aleja eran
    modificadores MORFOLÓGICOS —cambiaban la varianza de la textura y el ancho
    de los filamentos en una mitad del disco— y el principio de este pase es
    que el campo base (masas, turbulencia, escala y orientación de los
    filamentos, nudos, disolución del borde) sea el mismo en todo el contorno.
    receding se queda sólo para lo FOTOMÉTRICO: cuánto emite un nudo en el
    lado oscuro (knotLuz, abajo). Medido: con uDoppler apagado el gris de
    densidad cambiaba 0.93 niveles de media, así que estos dos términos no
    eran la causa de la asimetría; se retiran por principio y porque cada uno
    era un sitio donde un lado podía volver a separarse del otro.
  */
  float receding = clamp(-mu / 0.6, 0.0, 1.0) * uDoppler;

  float gauge = (wa - 0.5) * 0.22;
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
    NUDOS Y POZOS (2026-09-12): el disco tenía detalle pero, de lejos, se
    fundía en una superficie lisa — cada banda pesaba lo mismo que la vecina.
    Lo que falta no es ruido, es JERARQUÍA de excepciones: unos pocos nudos
    donde el material se apelotona y emite el doble, y unos pocos pozos oscuros
    dentro de las masas densas. Los dos salen de campos ya mezclados, así que no
    cuestan ni una evaluación de ruido y respetan la costura de las épocas. Y
    como la rodilla ya no sube todo a blanco, los nudos son los únicos que
    llegan a clipar: el blanco puro pasa a ser una propiedad suya.
  */
  /* Y los nudos pesan la mitad en el lado que se aleja (pase de cohesión):
     allí el material está en el suelo del beaming y un nudo que emite el
     doble no se funde con nada — sale como una mota blanca suelta sobre óxido
     oscuro, «sal» junto al agujero. En el lado que se acerca el mismo nudo
     clipa DENTRO del blanco y es el que da el blanco. */
  /* Y desde el pase de gramática común (2026-09-20) el nudo es el mismo a
     los dos lados en DENSIDAD —dónde se apelotona el material no depende de
     hacia dónde va— y lo que pierde en el lado que se aleja es sólo LUZ:
     knotLuz entra en la función fuente y knot en la densidad. El pozo también
     se iguala: el ×1.15 del lado oscuro ponía más agujeros en una mitad. */
  float knot = smoothstep(0.60, 0.90, fabric * 0.55 + macro * 0.45);
  float knotLuz = knot * (1.0 - 0.5 * receding);
  float pit = min(1.0, smoothstep(0.34, 0.14, fabric) * mass);

  /*
    EL ARCO INFERIOR SE ROMPE (2026-09-12, ronda final). Con el envés tratado
    como imagen lensada ya era fino y crema, pero seguía siendo un aro
    CONTINUO, y un aro continuo bajo la sombra delata el truco. La máscara
    apaga el arco donde el tejido y las masas del material están en su valle
    —los mismos campos que cortan la banda primaria, así que los huecos caen
    donde la materia falta de verdad— y deja un 18 % de traza para que se
    insinúe en vez de desaparecer a tajo. Sólo toca los cruces del envés.
  */
  float arcMask = mix(
    1.0,
    0.18 + 0.82 * smoothstep(0.24, 0.66, fabric * 0.55 + macro * 0.45),
    under
  );
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
  /*
    Y EL SUELO SE MODULA CON LAS CORRIENTES, NO CON EL TEJIDO (2026-09-20,
    pase de gramática común). fabric lleva dentro el grano —hasta un 42 %— y
    entra aquí LINEAL, mientras que en las masas la densidad la pone la
    ventana de arriba, que satura: dentro de una masa el grano desaparece en
    la meseta y dentro de un valle se ve entero como moteado. Dos mapeos
    distintos para el mismo campo son dos texturas distintas, y el gris de
    densidad las enseñaba a cada lado del agujero: valle moteado a la
    derecha, masa laminar a la izquierda. streams es el campo cizallado
    —fibra tangencial, la misma que dibuja las bandas de las masas—, así que
    con él los filamentos que aparecen dentro del hueco son de la misma
    familia que los de fuera. El rango baja de (0.55, 1.35) a (0.45, 1.25)
    porque streams promedia ~0.65 y fabric ~0.45: el factor sigue
    promediando ~0.97 y la densidad media del valle no se mueve.
  */
  density *= mix(mix(0.34, 0.78, cohesion) * mix(0.45, 1.25, streams), 1.48, mass);
  density *= (1.0 + 0.6 * knot) * (1.0 - 0.35 * pit) * presence * arcMask;
  /* El carril de polvo tambien afloja hacia fuera, y por una razon fisica: un
     carril OSCURECE porque hay polvo que absorbe, y en el extremo del disco no
     queda material suficiente para absorber nada. Mantenerlo ahi a plena
     potencia es lo que convierte una veta en un tajo que corta el borde. */
  /* Y EL CARRIL OCLUYE (2026-09-19). Con suelo 0.07-0.20 un carril era medio
     transparente: a densidad típica la opacidad caía de 0.97 a 0.52 y lo que
     hay detrás —el arco inferior, el cielo— se veía a través del polvo. En la
     referencia la banda frontal es lo más OPACO del cuadro y sus carriles son
     polvo que absorbe, no huecos: la base del arco superior y lo alto del
     inferior desaparecen detrás de ella. El suelo sube a 0.30-0.55 en el
     cuerpo; hacia fuera se queda en 0.50 para que siga cortando. La
     oscuridad del carril la pone ahora laneAbs, después del rodillo. */
  float laneFloor = mix(mix(0.30, 0.55, cohesion), 0.50, smoothstep(0.52, 0.94, t));
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
  // Con el macro CRUDO: la silueta no es de este pase (ver MACRO_SWING).
  float reach = mix(streams * 0.55 + macroRaw * 0.45, 0.5, soften);
  /*
    ── ENVOLVENTE Y TURBULENCIA, QUE ERAN UNA SOLA COSA Y SON DOS ──────────────

    Lo anterior era 1.0 - smoothstep(0.43, 0.99, t - (reach - 0.5) * 0.64): una
    ventana fija DESPLAZADA por el ruido. Escrito así, el ruido no modula la
    densidad dentro de una forma — el ruido ES la forma, porque el desplazamiento
    mueve los dos extremos de la caída a la vez y no está acotado por ninguna
    parte. De ahí salen los dos defectos del borde:

    · La silueta es un conjunto de nivel de reach, y reach es fbm. Un fbm se
      concentra alrededor de su media —las amplitudes caen a la mitad por
      octava—, así que su conjunto de nivel es casi circular. Un contorno casi
      circular y sin espesor, proyectado a 9° de elevación, converge en un PUNTO
      matemático en las ansas del eje mayor. Es la cuña.

    · Y el corte duro de uDiskOuter se alcanzaba con densidad viva. El álgebra:
      la densidad sólo llega a cero si t - desplazamiento >= 0.99, o sea si
      reach <= 0.5156. Pero la media de reach está por ENCIMA de ese umbral
      —ridged = 1 - |2x-1| lleva la media 0.469 de un fbm de cuatro octavas a
      ~0.94, y streams se queda en ~0.65— así que el sector típico llegaba al
      borde con el 1.6 % de su densidad y un sector denso con el 17.7 %. Ahí no
      hay una función que apaga el material: hay un if que lo recorta en una
      elipse perfecta.

    Medido antes de tocar nada, con tools/disk-silhouette.mjs sobre la vista
    canónica del laboratorio sin halo: el brazo que se aleja conserva el 16 % de
    la luz de su columna de pico justo donde el radio lo corta. El defecto no
    era una impresión.

    Ahora son dos funciones distintas con dos trabajos distintos:

      envolvente  → DÓNDE EXISTE el disco. Sólo depende de t, y el ruido la
                    perturba dentro de un rango ACOTADO que termina siempre por
                    debajo de 1. La densidad es cero antes del corte en todos los
                    acimuts, así que el if de uDiskOuter deja de poder
                    dibujar nada.
      turbulencia → CÓMO SE REPARTE el material dentro de ella, que es todo lo
                    demás de esta función y no cambia.

    El alcance sigue siguiendo al material —un sector denso llega más lejos, que
    es la corrección de signo de la nota de arriba y no se toca— pero ahora lo
    hace moviendo las DOS cosas por separado: dónde muere y cuánto tarda en
    morir. Un sector denso muere lejos Y tarda mucho, que es la forma que se
    busca: cuerpo, luego hebras, luego nada. Un sector vacío muere cerca y
    deprisa.
  */
  /** Dónde muere el material. El techo es 0.995 y no 1.0 a propósito: mientras
   *  sea menor que 1 la densidad es exactamente cero cuando el rayo llega al
   *  radio exterior, y el corte duro no puede recortar nada. */
  /* Y el techo sube de 0.86/0.995 a 0.90/0.999 cuando entra el grosor, porque
     con la capa quien termina el disco ya no es esta envolvente: es la COBERTURA
     de la travesia. Medido al reves, con la envolvente apretada, el grosor salia
     como un no-op —el perfil del brazo que se aleja no se movia ni un punto—
     porque la densidad ya valia cero donde la geometria de la capa empezaba a
     tener algo que decir. Las dos cosas se estorbaban. */
  float bordeFin = mix(0.90, 0.999, reach);
  /** Cuánto tarda en morir. Más largo donde hay material que disolver. */
  float bordeCaida = mix(0.34, 0.55, reach);
  density *= 1.0 - smoothstep(bordeFin - bordeCaida, bordeFin, t);

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
  /* Y la ventana se corre otra vez, a (0.78, 0.99), con el peso de 0.52 a 0.42.
     No es un retoque de gusto: con la envolvente acotada de arriba, la zona de
     disolucion del disco cae DENTRO de la ventana antigua, asi que este termino
     habia pasado de podar hebras terminales a podar la disolucion entera —
     justo lo que el borde nuevo existe para producir. El criterio de la nota de
     arriba se conserva, el material aislado sigue perdiendo presencia; lo que
     cambia es que ya no compite con la envolvente por decidir donde acaba el
     disco. */
  float lonely = smoothstep(0.78, 0.99, t) * (1.0 - mass);
  density *= 1.0 - lonely * 0.42;

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
  /* La imagen directa sube de 0.52 a 0.57 (ronda final): la banda frontal
     tapa algo más lo que pasa por detrás, que es la otra mitad de «arco
     inferior parcialmente escondido». El envés se queda en 0.52. */
  alpha = 1.0 - exp(-density * grazing * mix(0.57, 0.52, under));

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
  /*
    ── UNA SOLA FAMILIA DE TONO, Y LA RAMPA SIGUE AL MATERIAL (2026-09-19) ────

    Dos correcciones sobre la rampa de arriba, las dos medidas sobre la captura
    y sobre la referencia, y las dos en el mismo sitio porque se necesitan.

    1 · LA FAMILIA. Las paradas iban de oro (tono 42°) a ámbar (30°) a cobre
        (19°): cambiaban de familia por el camino, y ACES parte esa familia en
        dos según el lado de la rodilla. Por encima de ella el canal R clipa
        primero y el tono ROTA hacia amarillo con poca saturación —beige, por
        definición—; por debajo el mismo oro y el mismo ámbar se pintan fieles,
        o sea amarillo apagado: caqui. En la captura, el 32 % de los píxeles
        con color estaban por encima de 30° de tono, el 8 % eran beige y el
        3.6 % caqui; en el fotograma de referencia son el 1-2 %, el 0.1 % y
        el 0 %. Allí el tono deriva hacia el ROJO al apagarse —blanco cálido
        rosado, salmón, óxido, marrón— y nunca pasa por amarillo. Eso es lo
        que hace que «zona blanca / beige / marrón 1 / marrón 2» se lea como
        cuatro materiales aquí y como uno allí: no eran cuatro densidades,
        eran dos familias de tono a los dos lados de la rodilla.

        Así que todas las paradas se quedan en una familia —crema, salmón,
        óxido claro, óxido, umbría— prerrotadas hacia el rojo para que TRAS
        ACES caigan entre 18° y 32°. El valor no cambia: exposición, rodilla,
        boost y bloom no se tocan. El riesgo no es el beige de 2026-09-12
        —aquél era luz amarilla desaturada, y una luz salmón desaturada es el
        blanco caliente de la referencia— sino el rosa: la segunda parada no
        debe bajar de ~28° antes de ACES, y no baja.

    2 · LA COORDENADA. La rampa sólo sabía de radio, y a igual radio un nudo
        denso y un jirón tenue salían del mismo color: temper movía el tono
        ±3° donde el radio lo mueve 18°. Como la coordenada era t, cada
        frontera de color era una elipse iso-radio, y a 9° de elevación la
        banda frontal comprime t en ~80 filas de pantalla: las transiciones se
        apilaban como franjas HORIZONTALES mientras las masas y los carriles,
        rotos y cizallados, las atravesaban sin enterarse. Ahora la coordenada
        es temperatura local: una masa densa toma el color de un radio más
        interior, un carril el de uno más exterior, y las fronteras cromáticas
        serpentean con las masas —escala macro, 8-23 unidades— en vez de
        seguir el radio. Sigue siendo la misma paleta: se desplaza a lo largo
        de ella, no se mezcla hacia colores ajenos.
  */
  float tCol = clamp(
    t + 0.16 * (0.5 - mass) + 0.06 * (0.5 - fabric) + 0.08 * (1.0 - laneMask),
    0.0,
    1.0
  );
  vec3 tint = vec3(1.00, 0.97, 0.93);
  tint = mix(tint, vec3(1.00, 0.80, 0.60), smoothstep(0.015, 0.11, tCol));
  tint = mix(tint, vec3(0.98, 0.52, 0.30), smoothstep(0.15, 0.30, tCol));
  tint = mix(tint, vec3(0.84, 0.31, 0.12), smoothstep(0.36, 0.58, tCol));
  tint = mix(tint, vec3(0.44, 0.14, 0.05), smoothstep(0.64, 1.00, tCol));
  /*
    EL POLVO ABSORBE DESPUÉS DEL RODILLO. Aquí había un tint *= mix(0.52, 1,
    laneMask) y en la función fuente otro factor de carril: los dos entraban
    ANTES del rodillo de altas luces, y el rodillo comprime el cociente —en
    el núcleo que se acerca, un carril que emite el 21 % de su vecino sale de
    ACES al 94 % frente al 98 %—. Por eso la masa crema era lisa POR
    CONSTRUCCIÓN y su borde era a la vez borde de color y borde de textura:
    el «enganche». La absorción se aplica ahora a la salida, sobre la luz ya
    comprimida (laneAbs, abajo), que es además el orden físico: el polvo
    absorbe la luz que el emisor ya entrega.
  */

  /*
    TEMPERATURA POR MATERIAL (2026-09-12). La rampa de arriba sólo sabe de
    radio: a igual r, un nudo denso y un jirón tenue salían del mismo color, y
    eso es parte de lo que hacía que las bandas se leyeran como una sola
    superficie. Lo denso tira un poco al crema —está más caliente— y lo tenue
    al cobre. Es ligero a propósito: variación, no otra paleta.
  */
  /* Y pesa menos (0.22/0.28 → 0.14/0.18) desde que la coordenada de la rampa
     ya sigue al material: esto mezcla hacia dos colores fijos, y lo que
     mantiene la familia es desplazarse por la paleta, no salirse de ella. Los
     dos colores fijos entran también en la familia. */
  float temper = clamp((fabric - 0.5) * 0.9 + (mass - 0.5) * 0.5, -1.0, 1.0);
  tint = mix(tint, vec3(1.00, 0.96, 0.92), max(temper, 0.0) * 0.14);
  tint = mix(tint, vec3(0.78, 0.36, 0.20), max(-temper, 0.0) * 0.18);

  // Corrimiento al rojo gravitacional (siempre) y beaming relativista (según el
  // interruptor). El material orbita a v = √(rs / 2(r − rs)) medido por un
  // observador estático local: 0.5c en la ISCO, y de ahí para arriba.
  float v = min(sqrt(0.5 * uRs / max(r - uRs, 0.30 * uRs)), 0.80);
  // flow y mu se calculan arriba, junto a la presencia por lado.
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
  /* 0.46 → 0.54 (2026-09-12): el lado que se aleja tira algo más al cobre.
     Con la rodilla baja, ese lado ya no compite en blanco con el que se
     acerca, y el color es lo que termina de separarlos. */
  /* 0.54 → 0.40 y el color entra en la familia (2026-09-19): con las paradas
     de oro y ámbar, este empuje era lo que separaba los dos lados en PALETA
     —crema a la izquierda, óxido a la derecha— y el dueño lo leyó como «no
     hablan el mismo idioma». En la referencia el lado que se aleja es la
     misma familia, sólo más apagada: los separa el valor, que ya lo pone
     boost con 6.6 a 0.24, no el tono. */
  tint = mix(tint, vec3(0.60, 0.27, 0.13), max(-doppler, 0.0) * 0.40 * uDoppler);

  /*
    LA CARA LEJANA SE SUBORDINA (2026-09-19). El arco superior es la cara
    lejana del disco, imagen directa (orden 0: cruza el plano hacia abajo, ya
    pasado el agujero), y llevaba la rampa entera con su saturación entera:
    hacia fuera se volvía óxido saturado y competía en presencia con la banda
    frontal, que es lo que la convertía en «otra pieza». En la referencia esa
    mitad se DESATURA hacia gris rosado a radio grande —99/82/78, saturación
    0.21— y queda subordinada a la banda de polvo de delante; el ojo la lee
    como la misma hoja vista más de plano. La puerta es geométrica, no por
    orden: un cruce de orden 0 cuyo rayo se aleja del centro en el plano es
    cara lejana. No toca el valor —sólo la croma— ni las lensadas, que ya
    llevan su propio reparto.
  */
  // La puerta es suave en la componente radial del rayo: en las ansas el rayo
  // es tangente, el producto pasa por cero y un step conmutaría a ruido.
  float far = smoothstep(-0.15, 0.15, dot(normalize(hit.xz), dir.xz))
            * (1.0 - under) * (1.0 - min(order, 1.0));
  float farFade = far * smoothstep(0.25, 0.80, t);
  vec3 farGrey = vec3(dot(tint, vec3(0.30, 0.59, 0.11))) * vec3(1.0, 0.94, 0.90);
  tint = mix(tint, farGrey, 0.30 * farFade);

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
  tint = mix(tint, vec3(1.00, 0.93, 0.88), clamp(lensed * 0.22, 0.0, 0.62));

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
               * mix(mix(0.45, 0.80, cohesion), 1.40, mass)
               * (1.0 + 1.3 * knotLuz);
  /*
    Los carriles emiten menos dentro de la banda (0.34/0.48 → 0.30/0.40, ronda
    final; → 0.36/0.46 en el pase de cohesión, porque ahora entran DESPUÉS del
    rodillo y a esa altura el mismo número muerde el doble) y hacia fuera
    también cortan (0.72 → 0.55): en la referencia los carriles oscuros de la
    banda frontal llegan hasta el borde, y sin eso el brazo que se aleja se
    leía como una lámina sin nada dentro. Los pozos van por el mismo camino y
    por el mismo motivo: un pozo dentro de una masa clipada tiene que seguir
    siendo un pozo.
  */
  float laneSrc = mix(mix(0.36, 0.46, cohesion), 0.60, smoothstep(0.52, 0.94, t));
  float laneAbsRaw = mix(0.52, 1.0, laneMask) * mix(laneSrc, 1.0, laneMask)
                   * (1.0 - 0.55 * pit);
  /*
    EL POLVO SIGUE A LA MASA (2026-09-20, segunda entrega del pase de gramática
    común). Medido con el gris de densidad SIN esta absorción: el «gran valle»
    del ansa derecha no es un hueco de densidad —sin absorber, el gris de la
    columna a 320 px sube de 22-86 a 71-192— sino un carril de polvo ancho
    que cae justo donde la cara lejana y el brazo cercano se encuentran, y
    que a plena absorción borra la banda entera: «corriente arriba, masa
    abajo, nada en medio». Comprimir el macro (MACRO_SWING) no lo movía —el
    carril lo pone el fbm de 0.145— y cruzarlo con las corrientes tampoco
    (probado a 0.32: misma depresión, otra textura). Lo que faltaba es
    físico: el polvo viaja con el gas, así que la COLUMNA de polvo de un
    carril es proporcional a la masa que lo rodea. En una masa el carril
    absorbe como hasta ahora; en un valle del macro absorbe la mitad, y el
    valle deja de ser el doble de oscuro —menos gas Y polvo opaco— para ser
    lo que es: el mismo material, más tenue, con sus carriles dentro. Sin
    lado, sin tocar la ventana ni la escala de los carriles, y la banda
    frontal —que es masa— conserva sus carriles opacos.
  */
  float dustCol = mix(0.50, 1.0, mass);
  float laneAbs = 1.0 - (1.0 - laneAbsRaw) * dustCol;

  /*
    Y EL DESVANECIDO EXTERIOR DE LAS LENSADAS ENTRA TAMBIÉN EN LA EMISIÓN
    (2026-09-12), porque en la densidad sola no hacía nada donde importaba.

    outerFade multiplicaba únicamente la densidad, con la idea de que un arco
    perdiera brillo y opacidad a la vez. Pero los rayos que forman el arco
    inferior cruzan el plano rasantes, el camino óptico satura alpha a 1, y
    con alpha saturada la densidad deja de importar: el arco salía con toda su
    emisión aunque la densidad fuese un tercio. Medido: subir el desvanecido de
    0.42 a 0.70 cambió los arcos de cobre bajo la sombra en nada perceptible.
    Aplicado a la emisión, el material exterior de las imágenes lensadas se
    apaga de verdad y el arco inferior se queda con su tramo interior, fino y
    crema. La imagen directa no se entera: su outerFade vale 1.
  */
  vec3 emission = tint * heat * boost * source * DISK_GAIN
                * mix(1.0, outerFade, 0.85)
                // El envés se rompe (arcMask) y se insinúa (×0.80): ver arriba.
                * arcMask * mix(1.0, 0.80, under);

  // Rodillo de altas luces, ANTES del bloom y del tone mapping. ACES aplana todo
  // lo que pase de ~3, así que un disco que llega a 28 entrega su mitad brillante
  // como una mancha sin gradiente. Esto comprime la meseta dejando que el núcleo
  // siga clipando: el pico se mantiene incandescente y el resto recupera
  // pendiente donde dibujar la textura. Se usa el canal máximo y no la luminancia
  // para no desplazar el tono al comprimir.
  /*
    GRIS DE DENSIDAD (banco visual). Es el material y nada más: la densidad
    que decide la opacidad —con sus masas, nudos, pozos, presencia, carriles,
    envolvente y caída por orden— comprimida con Reinhard para que quepan a la
    vez un hueco y una masa, y con la absorción del polvo, que es medio
    óptico y no luz. Fuera quedan la rampa térmica, el perfil radial de
    energía, el beaming, el tinte Doppler, la función fuente y el rodillo:
    todo lo que es CÓMO SE VE el material y no QUÉ material hay. Comparar los
    dos lados aquí es comparar estadística de materia, que es la pregunta.
  */
  if (diagDensidad) {
    return vec3(density / (0.8 + density)) * laneAbs * diagLuz;
  }
  float peak = max(max(emission.r, emission.g), emission.b);
  float rolled = peak / (1.0 + peak / HIGHLIGHT_KNEE);
  // Y el polvo absorbe la luz ya comprimida: ver la nota de laneAbs.
  return emission * (rolled / max(peak, 1e-4)) * laneAbs * diagLuz;
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

  /*
    AUTORIDAD DE LA SOMBRA (2026-09-12): el interior de la curva crítica se
    apaga, y se sabe ANTES de integrar qué rayos viven dentro.

    El parámetro de impacto b = |r⃗ × d⃗| es una constante del rayo y decide su
    destino: por debajo de b = (√27/2)·rs el rayo cae al horizonte, sin
    excepción. Todo lo que un rayo condenado recoge del disco antes de caer se
    pinta, por construcción, DENTRO del disco de la sombra — y en el encuadre
    de 9° de elevación eso era mucho: los rayos apuntados a los flancos cruzan
    el plano a 1.6-2.6 rs, justo por encima del borde interior, y los de la
    mitad superior lo cruzan detrás del agujero a 2-5 rs. Medido en la captura
    de referencia, el negro de verdad medía 92 px de ancho sobre una sombra de
    142: el resto era crema lensada, un tercio de la sombra relleno de gris.

    Físicamente ese material existe, pero es la zona de caída —por dentro de la
    ISCO— y en un disco real casi no emite. Aquí el mismo criterio se aplica
    SÓLO a los rayos condenados: el material se desvanece por debajo de 2.4 rs
    y está entero a partir de 4.8. La banda primaria que cruza por delante de
    la mitad inferior de la sombra cruza el plano lejos y no se entera; el
    anillo de fotones y los arcos lensados viven en b > b crítico y tampoco.
    La rampa en b se abre en el 13 % exterior del radio para que el borde no
    sea una circunferencia: lo que queda ahí es el filo luminoso, y lo que se
    va es el relleno. (Era el 18 %; la ronda final lo aprieta porque el borde
    superior izquierdo del negro seguía leyéndose blando.)
  */
  float impact = sqrt(h2);
  float bCrit = 2.598076 * uRs;
  float doomed = 1.0 - smoothstep(bCrit * 0.87, bCrit * 0.99, impact);

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
      vec3 rumbo = normalize(mix(dir, nextDir, f));
      float hr = length(hit);
      /*
        ── LA TRAVESÍA DE LA CAPA: UNA MUESTRA, COLOCADA DONDE HAY ANILLO ─────

        El disco tiene altura de escala (alturaEscala), así que un rayo no lo
        cruza en un punto: lo atraviesa a lo largo de un tramo de media longitud
        media = H(r) / |dir.y| centrado en el cruce con y = 0. Lo que decide si
        ese rayo ve material no es el radio del PUNTO de cruce sino qué parte
        de la travesía cae dentro del anillo — y eso es lo que da a las ansas
        del eje mayor su altura: un rayo que cruza el plano ya fuera del borde
        exterior sigue habiendo atravesado el canto de la capa por encima.

        ── Por qué UNA muestra y no dos (2026-09-19, pase de cohesión) ────────

        La versión anterior tomaba dos muestras de Gauss a ±0.5774·media y las
        componía en orden. Medido en la vista canónica: con H = 9 % de r en el
        borde, media vale 13.7 unidades a 9° de elevación, así que las dos
        muestras de un mismo píxel leían el material a ~16 unidades de
        distancia sobre un disco de 21.6 de ancho. Eso no es volumen: es la
        misma textura dos veces, desplazada a lo largo del rayo, que en
        pantalla converge hacia el agujero. De ahí salía el «abanico
        radialmente barrido» de la banda frontal derecha, la neblina bajo la
        banda frontal y buena parte de la lectura «capa marrón por delante,
        capa clara detrás»: el dueño lo llamó «dos o tres capas superpuestas»
        y era literalmente eso. Y los filamentos tangenciales que la
        referencia enseña nítidos en la banda frontal no sobreviven a un
        desenfoque radial de ese tamaño.

        Ahora hay una muestra por travesía y la geometría de la capa entra por
        dos sitios distintos:

          · COBERTURA. Se resuelve analíticamente qué tramo [s0, s1] de la
            travesía cae dentro del anillo —dos raíces cuadradas— y el espesor
            óptico se escala por su fracción: alpha = 1 − (1 − alpha)^cobertura.
            Un cruce holgadamente dentro tiene cobertura 1 y es EXACTAMENTE el
            píxel de antes de la altura; el canto se desvanece con la altura
            que le queda, no con un if.
          · POSICIÓN. La muestra se toma en el cruce si el cruce está dentro
            del tramo, y si no, en el extremo del tramo tirado un 50 % hacia
            su centro: lo que se ve en el canto es el material del borde, no
            un vacío. Dentro del cuerpo del disco la muestra no se mueve.

        Coste: una llamada a diskSample por travesía, como antes del pase de
        silueta, más dos sqrt. La doble muestra costaba entre un 25 y un 30 %
        más por píxel y no compraba volumen.
      */
      float media = alturaEscala(hr) / max(abs(rumbo.y), 0.09);
      float hd = dot(hit, rumbo);
      float dOut = hd * hd - hr * hr + uDiskOuter * uDiskOuter;
      if (dOut > 0.0) {
        float sq = sqrt(dOut);
        float s0 = max(-hd - sq, -media);
        float s1 = min(-hd + sq, media);
        // El agujero interior recorta el tramo; de las dos piezas posibles se
        // conserva la más larga, que es la que puede tener material.
        float dIn = hd * hd - hr * hr + uDiskInner * uDiskInner;
        if (dIn > 0.0) {
          float sqi = sqrt(dIn);
          float a1 = min(s1, -hd - sqi);
          float b0 = max(s0, -hd + sqi);
          if (a1 - s0 >= s1 - b0) { s1 = a1; } else { s0 = b0; }
        }
        if (s1 > s0) {
          float cobertura = (s1 - s0) / (2.0 * media);
          float sm = clamp(0.0, s0, s1);
          vec3 punto = hit + rumbo * mix(sm, 0.5 * (s0 + s1), 0.5);
          float pr = length(punto);
          float alpha;
          vec3 emission = diskSample(punto, rumbo, hits, travelled + dt * f, alpha);
          float a = 1.0 - pow(max(1.0 - alpha, 0.0), cobertura);
          // Autoridad de la sombra: ver la nota de doomed, arriba. Sólo apaga
          // la EMISIÓN; la opacidad se queda, así que el rayo sigue muriendo
          // donde moría.
          float lip = smoothstep(uRs * 2.6, uRs * 4.6, pr);
          color += transmit * emission * a * mix(1.0, lip, doomed);
          transmit *= 1.0 - a;
          hits += 1.0;
          // Con las imágenes de orden superior apagadas el rayo muere en el
          // primer cruce: es la medida honesta de lo que cuesta el lensado.
          if (uSecondary < 0.5 && hits > 0.5) transmit = 0.0;
        }
      }
    }

    /*
      Y el rayo agotado deja de integrar, que es presupuesto que hasta ahora se
      tiraba. No habia ningun break por transmitancia: cuando transmit caia por
      debajo de 0.015 el cruce dejaba de evaluarse pero la integracion seguia
      hasta el cielo. Medido con un port del bucle, los pasos posteriores al
      primer impacto son el 13 % del total en la vista canonica y el 58 % en la
      vista SOMBRA. El umbral es 0.002 y no 0.015 a proposito: 0.002 es
      exactamente la puerta con la que el cielo se muestrea mas abajo, asi que
      por debajo de eso el rayo no puede aportar nada a ninguna parte.
    */
    if (transmit < 0.002) break;

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
      1440×860: la puerta está entera hasta b = 16 rs —que son los 320 px
      alrededor de la sombra, donde el estiramiento ES la escena— y cerrada en
      b = 23 rs, unos 430 px. Las esquinas quedan en 35-40 rs, o sea fuera.

      Cerraba en 30 rs (560 px) y se apretó a 23 midiendo: el anillo de 400-550
      px seguía dentro de la puerta y mantenía manchas de aspecto 2.3 — óvalos
      suaves, no arcos, pero suficientes para que un tercio del ancho del cuadro
      siguiera participando del remolino. A 23 ese anillo pasa a puntos y el de
      250-400, que es donde viven los arcos de verdad (aspecto 8), conserva la
      puerta casi entera.
    */
    // impact es sqrt(h2), calculado arriba del bucle: la misma cantidad, una
    // sola vez, y la comparte con la autoridad de la sombra.
    /*
      DOS PUERTAS, Y NO ES UNA POR CAPRICHO.

      El encargo tiene dos mitades que se comportan de forma opuesta:

      · La FORMA —que la estrella lejana sea un punto— la decide la mezcla de
        dirección, y una puerta estrecha ahí HACE DAÑO. La mezcla es un campo
        espacial, así que su propia pendiente entra en el jacobiano: al tapar la
        deflexión deprisa se añade una compresión radial que alarga las manchas
        justo por fuera de la rampa. Medido: con la puerta cerrando en 23 rs, el
        anillo de 400-550 px pasó de 2.15 a 2.63 de aspecto. Cuanto más suave la
        rampa, menos artefacto — por eso ésta cierra en 34 rs.
      · El BRILLO no tiene jacobiano. Se le puede poner una puerta tan estrecha
        como se quiera sin efectos secundarios, y es la que de verdad retira
        presencia del anillo medio: un óvalo más tenue deja de leerse como
        trazo aunque conserve su geometría.

      Así que la mezcla usa lensing (rampa larga, 16-34 rs) y la magnitud usa
      presence (rampa corta, 15-23 rs). Los arcos de 250-400 px, que son lo que
      hay que conservar, quedan dentro de las dos.
    */
    float lensing = 1.0 - smoothstep(uRs * 16.0, uRs * 34.0, impact);
    float presence = 1.0 - smoothstep(uRs * 15.0, uRs * 23.0, impact);
    /*
      FUERA DE LA PUERTA EL CIELO SE ENDEREZA, y ésta es la línea del encargo.

      «Que las estrellas alejadas sean predominantemente puntos casi estáticos y
      reservar los estiramientos para una región más próxima al agujero negro.»
      Eso es una petición sobre la FORMA, y el brillo no la puede cumplir: una
      estrella más tenue sigue siendo una estrella estirada. La primera pasada
      bajó la presencia luminosa de la periferia un 31 % y las manchas seguían
      midiendo 1.9 de aspecto.

      Quien decide la forma es esta mezcla, porque el estiramiento es su
      jacobiano: con skyDir = mix(straight, dir, s), la magnificación en cada
      eje vale (1-s) + s·μ. Con μ tangencial ≈ 1.38 y radial ≈ 0.73 —los que
      dan el 1.9 medido— la razón cae a 1.34 con s = 0.45 y a **1.19 con
      s = 0.28**, que ya es un punto. Dentro de la puerta s sigue valiendo 1 y
      los arcos no se tocan.

      Y que la causa era el lente hay que dejarlo escrito, porque se diagnosticó
      mal dos veces. tools/star-streaks.mjs mide la TANGENCIA: el ángulo entre
      el eje mayor de cada mancha y la perpendicular al radio que va a la
      sombra. El lente magnifica en tangencial, así que un arco gravitacional
      marca ~1.00; el ruido de muestreo del retículo de estrellas no sabe dónde
      está el agujero y marca ~0.64. La periferia marcaba **1.00 a 400-550 px y
      0.83 más allá**. Era el lente, hasta las esquinas.

      La primera versión de esta puerta no lo demostraba porque valía 1 en toda
      la pantalla —ver la nota del parámetro de impacto—, así que bajar esta
      mezcla no cambiaba nada y parecía que la causa era otra.
    */
    vec3 skyDir = normalize(
      mix(straight, dir, uSkyLens * mix(0.25, 1.0, lensing))
    );
    color += transmit * skySample(skyDir, lensing, presence);
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

/**
 * Guarda de la sombra: devuelve el negro que el bloom había rellenado.
 *
 * ── El problema, medido ──────────────────────────────────────────────────────
 *
 * Con el glow apagado, la sombra de Gargantúa es negro puro y su silueta corta
 * como un cuchillo. Con el glow encendido, el interior entero se llenaba de un
 * gris con degradado —claro por el lado del disco brillante, apagado por el
 * otro— y el agujero dejaba de leerse como un agujero: parecía una esfera gris
 * iluminada. No es un defecto del bloom, es su definición: la sombra está
 * rodeada de material incandescente por los cuatro costados, así que un radio
 * ancho recoge luz de todo su alrededor y la deposita justo en el único sitio
 * del cuadro donde por construcción no puede haber nada.
 *
 * Y el radio ancho no se toca: es lo que hace que el disco se sienta un
 * incendio y no una bombilla. Lo que se protege es el negro.
 *
 * ── Por qué necesita la imagen SIN bloom, y no un multiplicador ──────────────
 *
 * Oscurecer un disco de pantalla habría sido más barato y está mal. Dentro del
 * radio de la sombra sí hay luz legítima: los rayos con parámetro de impacto
 * por debajo del crítico caen al horizonte, pero muchos cruzan el plano del
 * disco ANTES de caer, y esos arcos lensados entran bastante hacia dentro por
 * arriba y por abajo. En la captura de referencia la zona negra de verdad mide
 * 118 px de ancho y sólo 73 de alto sobre un disco de sombra de ~142: el resto
 * es material real. Un multiplicador se lo habría comido.
 *
 * Así que la guarda mezcla hacia la imagen previa al bloom, que ya tiene ese
 * material con su valor exacto, y además sólo donde esa imagen estaba OSCURA.
 * El resultado es una regla que se puede decir en una frase: **el halo no puede
 * encender lo que estaba apagado, y no toca nada de lo que ya estaba
 * encendido.** El cielo negro de fuera del disco de la sombra conserva su halo
 * entero, porque la puerta espacial no llega hasta allí.
 */
export const SHADOW_GUARD_FRAGMENT = /* glsl */ `
precision highp float;

/** La imagen ya compuesta con el bloom encima. */
uniform sampler2D tDiffuse;
/** La misma imagen justo antes del bloom, guardada por el SavePass. */
uniform sampler2D tClean;
/** Centro de la sombra en coordenadas de textura. */
uniform vec2 uCentre;
/** Semiejes de la sombra, en las mismas unidades. */
uniform vec2 uRadius;
/** Fracción del radio hasta donde la guarda vale entera; de ahí se abre a cero. */
uniform float uInner;
/** Techo de la guarda: 1.0 retiraría el halo del todo. */
uniform float uAmount;
/** Luminancia lineal donde la guarda pasa de entera (x) a nula (y). */
uniform vec2 uDarkGate;

varying vec2 vUv;

void main() {
  vec3 bloomed = texture2D(tDiffuse, vUv).rgb;
  vec3 clean = texture2D(tClean, vUv).rgb;

  // Puerta espacial: dentro del disco de la sombra y con el borde abierto, para
  // que no aparezca una circunferencia dibujada — el mismo error que costó
  // retirar el término analítico del anillo de fotones.
  vec2 offset = (vUv - uCentre) / max(uRadius, vec2(1e-4));
  float inside = 1.0 - smoothstep(uInner, 1.0, length(offset));

  // Puerta de material: lo que ya emitía conserva su halo.
  float lum = dot(clean, vec3(0.2126, 0.7152, 0.0722));
  float dark = 1.0 - smoothstep(uDarkGate.x, uDarkGate.y, lum);

  gl_FragColor = vec4(mix(bloomed, clean, inside * dark * uAmount), 1.0);
}
`;
