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

  // Muchas diminutas y unas pocas legibles. El brillo conserva una cola corta:
  // suficiente para dar profundidad, sin fabricar copos blancos ni competir
  // con el disco cuando el lente las estira.
  float magnitude = 0.30 + 0.80 * pow(h.y, 12.0);
  return present * magnitude * exp(-d * d * 245.0);
}

vec3 skySample(vec3 dir) {
  // Tres escalas perceptuales. La capa lejana aporta densidad subpíxel; la media
  // establece paralaje óptico por el lente; la cercana se reserva para muy pocos
  // puntos con más presencia. El campo sigue siendo negro y el disco continúa
  // ocultándolo naturalmente donde domina su luminancia.
  vec3 color = vec3(0.0);
  color += starLayer(dir, 44.0, 0.100) * vec3(1.00, 0.97, 0.92) * 0.48;
  color += starLayer(dir, 112.0, 0.150) * vec3(0.88, 0.93, 1.00) * 0.33;
  color += starLayer(dir, 246.0, 0.205) * vec3(1.00, 0.93, 0.84) * 0.19;
  // Cuarta escala, la más fina: densidad subpíxel que rellena el cielo entre
  // las tres anteriores. Sin ella, subir sólo el brillo daba estrellas más
  // gordas en vez de un cielo más poblado, que es lo que se pedía.
  color += starLayer(dir, 520.0, 0.235) * vec3(0.94, 0.96, 1.00) * 0.10;

  // Velo muy tenue. Existe para que el lente tenga algo continuo que curvar
  // además de puntos: sin él la distorsión del fondo es casi invisible.
  vec2 sph = vec2(atan(dir.z, dir.x), asin(clamp(dir.y, -1.0, 1.0)));
  float cloud = fbm(vec2(sph.x * 1.15, sph.y * 2.3) * 1.7);
  float veil = smoothstep(0.54, 1.00, cloud);
  color += mix(vec3(0.014, 0.024, 0.041), vec3(0.043, 0.022, 0.012), cloud)
         * veil * 0.32;

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

  /*
    HUELLA DE PÍXEL en unidades de mundo. Con ella se apaga cada campo de ruido
    ANTES de que su longitud de onda baje del píxel, que es de donde salen el
    shimmer y el moiré. Subir el DPR resolvería lo mismo pagándolo en GPU.
  */
  /*
    Y la huella se mide sobre el CAMINO RECORRIDO, no sobre la cuerda.

    Un haz de un píxel diverge con el ángulo uPixelScale a lo largo de su
    trayectoria; en un espacio curvo esa trayectoria es más larga que la línea
    recta entre cámara y punto, y mucho más en los rayos que dan media vuelta
    alrededor del agujero — que son justamente los que forman la imagen lensada
    y los que peor aliasean. Usar la cuerda subestimaría la huella justo donde
    hace falta. El error es cero en el disco primario, donde ambas coinciden.
  */
  float footprint = travelled * uPixelScale;

  // Deformación de dominio en DOS escalas.
  //
  // La fina —dos fbm de tres octavas— es la de siempre: convierte bandas
  // concéntricas limpias en turbulencia con discontinuidades. La gruesa es
  // nueva y resuelve otra cosa: el paso de la espiral era el mismo en todo el
  // contorno, así que a cualquier radio las corrientes tenían la misma
  // inclinación y el ojo podía seguirlas dando la vuelta entera. Un
  // desplazamiento de escala muy grande dobla el patrón por ZONAS, y el disco
  // deja de tener una geometría global que seguir. Cuesta dos valueNoise, no
  // dos fbm: a esa escala las octavas siguientes no se distinguen.
  float wa = fbm3(sheared * 0.26);
  float wb = fbm3(sheared * 0.26 + 31.7);
  vec2 coarse = vec2(
    valueNoise(sheared * 0.052 + 4.1),
    valueNoise(sheared * 0.052 + 19.3)
  ) - 0.5;
  vec2 warped = sheared + (vec2(wa, wb) - 0.5) * 2.8 + coarse * 11.0;

  /*
    JERARQUÍA DE FRECUENCIA POR RADIO, y estaba invertida.

    El ruido se muestreaba a frecuencia fija en unidades de MUNDO. A radio r la
    circunferencia mide 2πr, así que una frecuencia fija da más estructura
    angular cuanto más lejos: el exterior salía fino y el interior ancho, justo
    al revés de lo que cuenta un disco de acreción. Ahí estaba buena parte de la
    lectura de «anillos pintados».

    Ahora la frecuencia sube hacia dentro: el material cercano al horizonte se
    lee comprimido y estirado —que es lo que transmite velocidad— y el exterior
    se abre en corrientes anchas y lentas.
  */
  /* Y la transición NO puede ser una función limpia del radio: sus isocurvas
     serían circunferencias y volveríamos a tener zonas concéntricas, que es la
     lectura que se está intentando quitar. Perturbarla con el campo de
     deformación ya calculado hace que la frontera entre «fino» y «ancho»
     serpentee, y el cambio se percibe sin poder señalar dónde ocurre. */
  float compress = mix(1.95, 0.58, smoothstep(0.02, 0.80, t + (wa - 0.5) * 0.24));
  float streamFreq = 0.70 * compress;

  /*
    Y las corrientes son de cresta, no de bulto.

    fbm da manchas suaves; su valor absoluto plegado —ruido «ridged»— da
    filamentos con cresta afilada que se BIFURCAN y se cortan solos donde el
    campo cruza el pliegue. Es el mismo coste y es la diferencia entre curvas
    dibujadas sobre una superficie y material fluyendo.
  */
  float streamsRaw = fbmAA(warped * streamFreq, footprint * streamFreq);
  float ridged = 1.0 - abs(streamsRaw * 2.0 - 1.0);
  /* MEZCLA, no sustitución. Sólo cresta convierte el disco en filigrana y se
     pierde el flujo; el bulto suave conserva la corriente y la cresta le pone
     las bifurcaciones encima. El orbital sigue mandando. */
  float streams = mix(streamsRaw, ridged, 0.45);

  float grainFreq = 2.55 * mix(1.45, 0.68, t);
  float grain = fbmAA(
    shearedFine * grainFreq + (wa - 0.5) * 1.6,
    footprint * grainFreq
  );

  float fabric = clamp(streams * 0.62 + grain * 0.38, 0.0, 1.0);

  /*
    INTERRUPCIONES. Ninguna corriente da la vuelta entera.

    Sale de campos ya calculados, así que es gratis: donde la deformación gruesa
    y la fina coinciden en valle, el material se adelgaza hasta casi desaparecer
    y la corriente se corta. El ojo pierde el hilo, que es exactamente lo que se
    busca — la estructura dominante sigue la dirección orbital, pero no hay una
    sola línea que se pueda seguir de un extremo al otro.
  */
  float breakField = wb * 0.44 + (coarse.x + 0.5) * 0.34 + grain * 0.22;
  float breaks = smoothstep(0.22, 0.70, breakField);
  /*
    Y la PROFUNDIDAD del corte también varía.

    Con una profundidad fija el resultado es un ritmo de «segmento, hueco,
    segmento, hueco» tan reconocible como la línea continua que sustituye —sólo
    que troceada. Modulándola con otro campo, unos cortes apenas adelgazan la
    corriente y otros la interrumpen del todo, y a veces dos corrientes vecinas
    se funden porque ninguna de las dos se corta ahí.
  */
  float breakDepth = mix(0.80, 0.30, smoothstep(0.34, 0.86, wa));
  fabric *= mix(breakDepth, 1.0, breaks);

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
  /* 0.42 por orden, con techo 0.62 en vez de 0.7: las imágenes lensadas pierden
     contraste y detalle fino de forma progresiva, pero no llegan a ser una
     banda lisa. Tienen que reconocerse como el MISMO material deformado. */
  float soften = clamp(order * 0.42, 0.0, 0.62);
  fabric = mix(fabric, 0.52, soften);
  laneMask = mix(laneMask, 0.60, soften);

  /*
    GROSOR VARIABLE. La ventana que convierte textura en densidad se mueve con
    el campo grueso, así que unos filamentos salen anchos y otros finos. Con una
    ventana fija todos tenían el mismo calibre, y un calibre constante es media
    firma de «procedural»: en un fluido real el grosor de una corriente depende
    de cuánto material arrastra.
  */
  /*
    Y la ventana se ESTRECHA: 0.20-0.80 en vez de 0.16-0.90.

    Al mezclar cresta con bulto e interrumpir las corrientes, el campo perdió
    recorrido y quedó apretado alrededor de su media. Con la ventana ancha eso
    se traduce en mucha densidad intermedia repartida por todas partes, que es
    exactamente la lectura de humo o nebulosa. Estrechándola vuelve a haber
    filamento y hueco: material rápido, no niebla.
  */
  float gauge = (wa - 0.5) * 0.17;
  float density = mix(0.08, 1.85, smoothstep(0.20 + gauge, 0.80 + gauge, fabric));
  density *= mix(0.05, 1.0, laneMask);

  // Borde interior corto (el material se precipita). La anchura importa más de
  // lo que parece: el anillo de fotones ES la imagen lensada de ese borde, así
  // que un corte a navaja se proyecta como un círculo perfecto de anchura
  // constante y se lee como un contorno dibujado encima. Con 0.08 el borde
  // sigue siendo nítido pero el anillo hereda la irregularidad del material.
  density *= smoothstep(0.0, 0.08, t);

  /*
    Y EL EXTERIOR SE DESHILACHA, no termina en una corona.

    El corte anterior era un smoothstep limpio sobre el radio: el disco acababa
    en una frontera del mismo grosor en todo el contorno y, con el tinte oscuro
    de esa zona, el conjunto se leía como una franja marrón pegada alrededor del
    disco brillante — textura, no material.

    Ahora el radio donde muere el material varía con el propio campo turbulento.
    Unas corrientes llegan mucho más lejos que otras, el borde deja de existir
    como línea y el disco se pierde en negro por filamentos. Se aplana con
    soften igual que la textura: en la imagen lensada, un borde deshilachado
    comprimido en pocos píxeles vuelve a ser ruido.
  */
  /* Pesa más streams que wb a propósito: streams se muestrea en el marco
     contrarrotado, así que los jirones del borde PROLONGAN la dirección del
     flujo en vez de ser una nube alrededor del disco. */
  float shred = mix(streams * 0.62 + wb * 0.38, 0.5, soften);
  density *= 1.0 - smoothstep(0.44, 1.0, t + (shred - 0.5) * 0.5);

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
    vec3(1.00, 0.985, 0.96),
    vec3(1.00, 0.95, 0.84),
    smoothstep(0.00, 0.10, t)
  );
  // Los dos tramos centrales conservan calor antes de ACES, que dessatura con
  // fuerza todo lo que se acerca al blanco. La rampa evita amarillo puro: el
  // recorrido visible es crema, oro pálido y ámbar contenido.
  tint = mix(tint, vec3(1.00, 0.84, 0.58), smoothstep(0.08, 0.30, t));
  tint = mix(tint, vec3(0.94, 0.59, 0.28), smoothstep(0.28, 0.66, t));
  /* El cobre entra más tarde y llega menos lejos: ya no tiene que describir una
     corona entera, sólo los filamentos que sobreviven ahí fuera. */
  tint = mix(tint, vec3(0.60, 0.30, 0.14), smoothstep(0.66, 1.00, t));
  // El polvo enfría el color, pero el grueso del oscurecimiento lo hacen la
  // opacidad y la función fuente. Multiplicarlo tres veces (aquí, en la densidad
  // y en la fuente) fue lo que dejó el disco apagado.
  tint *= mix(0.68, 1.0, laneMask);

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
    ASIMETRÍA. El exponente físico del beaming bolométrico es 4; aquí 3.1.

    Con 4 la asimetría es tan violenta que medio disco desaparece —por eso la
    película lo atenuó—, pero 2.4 se quedaba corto en la otra dirección: el
    disco salía casi simétrico y eso es lo que delataba una textura procedural
    girada. A 3.1, con el suelo bajado a 0.11, un lateral es inequívocamente más
    caliente que el opuesto y Gargantúa gana DIRECCIÓN.
  */
  /* El suelo se queda en 0.16 y no más abajo: por debajo, el lado que se aleja
     deja de tener MATERIAL —se convierte en un recorte oscuro— y la asimetría
     pasa de dar dirección a comerse media superficie. Ahí sigue habiendo
     estructura que ver, sólo que en ámbar quemado. */
  float boost = clamp(pow(g, 3.1), 0.16, 4.4);

  /*
    Y la asimetría también es de COLOR, no sólo de brillo.

    Antes el único desplazamiento cromático era un tinte azulado sobre el lado
    que se acerca: correcto en física —es corrimiento al azul— y equivocado en
    lectura, porque enfriaba justo la zona que tiene que verse incandescente. El
    recorrido que se busca es el de la película: crema casi blanco donde el
    material viene hacia la cámara, cobre profundo donde se va.

    Escalado por uDoppler para que el interruptor siga apagando el efecto
    entero: sin él, con el beaming desactivado g cae por debajo de 1 en todo el
    disco y el conjunto se iría a cobre.
  */
  /* El recorrido buscado es continuo —crema, oro cálido, ámbar, cobre, ámbar
     quemado— y no un corte entre un lado blanco y otro marrón. Por eso el
     empuje hacia el cobre pesa menos que el empuje hacia el crema: el lado que
     se aleja lo oscurece sobre todo boost, no el tinte. */
  float doppler = clamp((g - 1.0) * 1.15, -1.0, 1.0);
  tint = mix(tint, vec3(1.00, 0.97, 0.90), max(doppler, 0.0) * 0.58 * uDoppler);
  tint = mix(tint, vec3(0.66, 0.34, 0.15), max(-doppler, 0.0) * 0.42 * uDoppler);

  // Perfil radial. Exponente 1.15, no el bolométrico: con el perfil físico el
  // borde interior está 40 veces por encima del exterior y el tone mapping no
  // tiene sitio para los dos — el disco exterior se apaga a marrón y el ojo lee
  // el conjunto como un núcleo brillante con una cola muerta. Sigue cayendo
  // hacia fuera; cae menos. Es la palanca que más "enciende" el disco entero
  // sin tocar ni la exposición ni el pico.
  /* Sube de 1.15 a 1.32. Con el borde exterior ya deshilachado, que el material
     lejano caiga más deprisa no deja una cola marrón muerta: deja filamentos
     tenues perdiéndose en negro, que es lo que se busca. Y refuerza la lectura
     de energía creciente hacia el horizonte. */
  float heat = pow(uDiskInner / r, 1.2);

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
  /* Parámetro de impacto del rayo: la distancia a la que pasaría del centro si
     el espacio fuese plano. Lo usa el anillo de fotones, al final. */
  float impact = sqrt(h2);

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
    vec3 skyDir = normalize(mix(straight, dir, uSkyLens));
    color += transmit * skySample(skyDir);
  }

  /*
    EL ANILLO DE FOTONES ES UN FILO, no un halo.

    La integración ya lo produce —es el apilamiento de las imágenes de orden
    superior— pero después de la compresión de altas luces y de ACES su último
    subpíxel se pierde, y lo que queda alrededor de la sombra es un borde grueso
    y difuso. Este término lo recupera: una sola línea en el parámetro de
    impacto crítico, b = √27/2 · rs, que sale de la misma métrica que todo lo
    demás y no es un adorno colocado a ojo.

    Aquí fwidth() SÍ es legítimo: estamos fuera del bucle, en flujo uniforme.
    Y es justo lo que hace falta — la anchura del filo se adapta a la
    resolución, así que no se convierte en escalera al bajar el DPR ni en un
    círculo de varios píxeles al subirlo. Se apaga en los rayos que no vieron
    disco, para que no dibuje un contorno sobre el cielo vacío.
  */
  /*
    Convención de unidades, explícita porque aquí es fácil equivocarse:
    uRs es el radio de SCHWARZSCHILD, rs = 2GM/c². Lo confirma el resto del
    integrador — horizonte en r = rs, esfera de fotones en 1.5·rs, y el término
    de la geodésica (3/2)·rs·u². Con esa convención el parámetro de impacto
    crítico es b = 3√3·GM/c² = (3√3/2)·rs = (√27/2)·rs ≈ 2.598·rs.
  */
  float criticalImpact = 0.5 * sqrt(27.0) * uRs;
  float ringWidth = max(fwidth(impact), 0.0016 * uRs);
  float photonRing = 1.0 - smoothstep(
    ringWidth * 0.6,
    ringWidth * 1.9,
    abs(impact - criticalImpact)
  );

  /*
    Dos condiciones para que no se lea como un círculo dibujado encima.

    La primera es que NO entre en la sombra. La mitad interior del filo cae por
    dentro de b crítico, y ahí el rayo está capturado: dejarlo pintar convertiría
    el borde del agujero en un halo. Excluir los rayos capturados deja el anillo
    estrictamente por fuera y la masa central absolutamente limpia, que es
    justo su valor — el negro tiene que ser negro.

    La segunda es que herede la escena en vez de superponerse a ella. Su
    intensidad se modula con la luminancia ya acumulada en ese píxel, que lleva
    dentro el beaming y el lensado: el anillo brilla donde el borde interior
    lensado brilla y se apaga donde ese material está en sombra. No hace falta
    que sea igual de visible en los 360°; un anillo uniforme sería exactamente
    el gráfico que no queremos.
  */
  float ringLuma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color += vec3(1.0, 0.95, 0.86)
         * photonRing
         * (captured ? 0.0 : 1.0)
         * smoothstep(0.2, 1.2, hits)
         * (0.35 + 2.4 * ringLuma);

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
