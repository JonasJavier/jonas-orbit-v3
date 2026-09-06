/**
 * Polvo estelar del puntero.
 *
 * Es la única capa del sitio que responde al gesto en tiempo real, así que tiene
 * que leerse como un rastro de ceniza luminosa y no como un cursor con partículas
 * pegadas. Tres decisiones sostienen eso:
 *
 * 1. **Se dibuja con sprites de resplandor, no con círculos.** Un `arc()` de
 *    radio 1 con alfa 0.4 es literalmente invisible sobre un cielo negro con
 *    bruma; lo que se ve en pantalla es el HALO, no el núcleo. Los sprites se
 *    generan una vez por tono y se pintan con `drawImage`, que es más barato que
 *    un gradiente por partícula por varios órdenes de magnitud.
 * 2. **La estela se siembra sobre el TRAMO recorrido, no sobre un punto.** Con
 *    `velocidad × transcurrido` se reconstruye exactamente dónde estaba el
 *    puntero en la muestra anterior, y las motas se reparten por ese segmento.
 *    Emitirlas todas en la posición actual dejaba huecos en cuanto el ratón
 *    corría —a 1,2 px/ms salta ~20 px entre eventos— y el rastro salía a cuentas
 *    sueltas. Por lo mismo el número de motas sale de la DISTANCIA y no de la
 *    velocidad: lo que hay que cubrir es el hueco, y el hueco es distancia.
 * 3. **Nada se asigna durante `pointermove`.** Buffers tipados, anillo de
 *    reescritura y cero objetos por frame — el presupuesto de §8 del pivote.
 */

const STARDUST_POOL_CAPACITY = 420;
export const STARDUST_MIN_LIFETIME_MS = 520;
export const STARDUST_MAX_LIFETIME_MS = 1_020;

/**
 * El mapa plano conserva el polvo aprobado. WebGL usa su propia pasada.
 *
 * La pasada de WebGL nació como una versión atenuada de `flat` —menos alfa,
 * tamaño, vida y ráfaga— y sobre el cielo negro del perfil plano eso habría
 * bastado. Pero la escena real no es negra: el disco de Gargantúa ocupa el
 * centro del encuadre con naranjas casi saturados, y un blend aditivo sobre
 * casi-blanco no suma nada. El resultado era polvo que existía en el pool y no
 * en la pantalla.
 *
 * `fadePower` es el que decide cuánto DURA visible una mota, y por eso está
 * separado del resto. El apagado cuadrático (`remaining²`) gasta la mitad del
 * brillo en el primer tercio de vida: la mota nace, se apaga casi entera y
 * arrastra un rabo invisible durante el resto.
 *
 * Es también el único parámetro que mueve la permanencia PERCIBIDA. Subir
 * `maxLifetimeMs` alarga la vida en el pool y no se ve: la mota ya estaba por
 * debajo del umbral visible mucho antes de morir, así que los milisegundos
 * extra son todos invisibles. Medido a 500 ms de soltar el gesto, 900 ms y
 * 1000 ms de vida dan la misma pantalla. Lo que alarga el rastro es bajar el
 * exponente, que sube el brillo de todo el tramo medio de la vida a la vez.
 *
 * Con 1.2 la caída sigue siendo caída —no hay meseta, no hay rastro
 * permanente— y la mota se lee durante el tramo en que el ojo la está
 * siguiendo.
 *
 * ── Pase de instrumentación (2026-09-06) ───────────────────────────────────
 *
 * Y el perfil de WebGL da marcha atrás en casi todo lo anterior, por una razón
 * que no es de calibración sino de LENGUAJE. El rastro era la única pieza de la
 * escena que no hablaba de navegación: todo lo demás —el retículo, los
 * corchetes, el arco de la órbita, el raíl, el NAV TARGET— había convergido al
 * cian de instrumentación, y el polvo seguía siendo violeta, ancho y largo. Un
 * cursor de partículas magenta no dice cabina, dice portafolio creativo.
 *
 * Y era dominante: durante un barrido normal quedaban arcos violetas cruzando
 * el cuadro por zonas que la composición había dejado vacías a propósito, así
 * que el ojo seguía al ratón en vez de a Gargantúa. Un rastro que compite con
 * el sujeto de la escena no es respuesta, es ruido.
 *
 * Los cuatro números que lo arreglan, con la medida de cada uno:
 *
 *   · **Densidad al 21 %.** `trailStepPx` 6.5 → 24 y `maxBurst` 12 → 4. Lo que
 *     se compara no es la ráfaga sino las motas POR PÍXEL recorrido, que es lo
 *     que se ve: (1 + fineShare)/trailStepPx pasa de 0.269 a 0.056.
 *   · **Cola un 65 % más corta.** La vida baja a 250-440 ms y `fadePower`
 *     vuelve a 2. Los dos a la vez: la vida recorta el 56 % y el exponente
 *     acorta además el tramo VISIBLE de esa vida, de un 84 % a un 67 %.
 *   · **Motas menos de la mitad de grandes.** El radio medio de una mota de
 *     cuerpo cae de 1.73 a 0.87 px, y con `glowScale` 3.3 → 3 el sprite pasa de
 *     11.4 a 5.2 px de lado.
 *   · **Cian y blanco frío.** La ventana de tonos del perfil se mueve a la
 *     mitad fría de la paleta; ver `PARTICLE_TONES`.
 *
 * Lo que NO cambia: el retículo, que el dueño aprobó tal cual, y el perfil
 * `flat`, que sigue congelado byte a byte —su ventana de tonos es la de siempre
 * y su `fineShare` sigue en cero.
 *
 * `fineShare` añade una SEGUNDA clase de mota por encima de la anterior, no en
 * su lugar: por cada mota de cuerpo se siembran `fineShare` motas finas, con
 * una fracción del tamaño y su propio sprite. Sin ese sprite propio la idea no
 * funciona — el sprite de cuerpo tiene un halo ancho y una difusión larga, y
 * dibujado a dos píxeles no da una mota fina, da una mancha tenue. El sprite
 * fino concentra la energía en el núcleo justo para que a ese tamaño siga
 * leyéndose como un grano y no como suciedad. `flat` lleva `fineShare: 0` y
 * queda idéntico byte a byte.
 */
export const STARDUST_PROFILES = {
  flat: {
    capacity: STARDUST_POOL_CAPACITY,
    minLifetimeMs: STARDUST_MIN_LIFETIME_MS,
    maxLifetimeMs: STARDUST_MAX_LIFETIME_MS,
    peakAlpha: 0.92,
    trailStepPx: 6,
    maxBurst: 14,
    glowScale: 3.4,
    sizeBase: 0.72,
    sizePower: 2.2,
    sizeRange: 2.5,
    sizeSpeed: 1.1,
    fadePower: 2,
    fineShare: 0,
    fineSizeScale: 1,
    fineGlowScale: 3.4,
    toneFirst: 0,
    toneSpread: 3.24,
    toneLast: 3,
  },
  webgl: {
    capacity: 300,
    minLifetimeMs: 250,
    maxLifetimeMs: 440,
    peakAlpha: 0.7,
    trailStepPx: 24,
    maxBurst: 4,
    glowScale: 3,
    sizeBase: 0.38,
    sizePower: 2.3,
    sizeRange: 1.15,
    sizeSpeed: 0.45,
    fadePower: 2,
    fineShare: 0.34,
    fineSizeScale: 0.46,
    fineGlowScale: 2.6,
    toneFirst: 3,
    toneSpread: 3.3,
    toneLast: 5,
  },
} as const;

export type StardustProfile = keyof typeof STARDUST_PROFILES;
/**
 * Topes del tramo que se siembra hacia atrás. Existen para el caso raro —
 * puntero que vuelve a la ventana tras dos segundos fuera, pestaña que
 * recupera el foco— en el que «lo recorrido desde la última muestra» sería una
 * raya de media pantalla que el gesto nunca dibujó.
 */
const TRAIL_MAX_SPAN_MS = 64;
const TRAIL_MAX_TRAVEL_PX = 150;
interface StardustPool {
  readonly capacity: number;
  readonly active: Uint8Array;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  readonly age: Float32Array;
  readonly lifetime: Float32Array;
  readonly size: Float32Array;
  /** Desfase del centelleo. Sin él las 256 motas parpadean a la vez. */
  readonly phase: Float32Array;
  readonly tone: Uint8Array;
  /** 1 = mota fina: otro sprite y otra escala de dibujo. */
  readonly fine: Uint8Array;
  cursor: number;
  activeCount: number;
}

export function createStardustPool(
  capacity = STARDUST_POOL_CAPACITY,
): StardustPool {
  const safeCapacity = Math.max(1, Math.floor(capacity));
  return {
    capacity: safeCapacity,
    active: new Uint8Array(safeCapacity),
    x: new Float32Array(safeCapacity),
    y: new Float32Array(safeCapacity),
    vx: new Float32Array(safeCapacity),
    vy: new Float32Array(safeCapacity),
    age: new Float32Array(safeCapacity),
    lifetime: new Float32Array(safeCapacity),
    size: new Float32Array(safeCapacity),
    phase: new Float32Array(safeCapacity),
    tone: new Uint8Array(safeCapacity),
    fine: new Uint8Array(safeCapacity),
    cursor: 0,
    activeCount: 0,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Siembra el tramo recorrido desde la muestra anterior con un techo dependiente
 * del perfil, y
 * sobrescribe slots antiguos al alcanzar el techo del pool. Nunca asigna arrays
 * ni crea objetos durante `pointermove`.
 *
 * `elapsedMs` es el tiempo desde la muestra anterior — el mismo con el que se
 * calculó la velocidad. Ese emparejamiento no es casual: `velocidad × elapsed`
 * devuelve el punto de partida EXACTO, así que el segmento que se rellena es el
 * que el puntero recorrió de verdad, no una estimación.
 */
export function spawnStardust(
  pool: StardustPool,
  pointerX: number,
  pointerY: number,
  velocityX: number,
  velocityY: number,
  elapsedMs: number,
  random: () => number = Math.random,
  profile: StardustProfile = "flat",
) {
  const config = STARDUST_PROFILES[profile];
  const rawSpeed = Math.hypot(velocityX, velocityY);
  const speed = clamp(rawSpeed, 0, 1.5);
  // Umbral de gesto: por debajo, el puntero está quieto y un rastro permanente
  // bajo un ratón parado dejaría de ser respuesta para ser decoración.
  if (speed < 0.02) return 0;

  const span = Math.min(
    Math.max(0, elapsedMs),
    TRAIL_MAX_SPAN_MS,
    TRAIL_MAX_TRAVEL_PX / Math.max(rawSpeed, 1e-4),
  );
  const travel = rawSpeed * span;
  const count = clamp(
    1 + Math.floor(travel / config.trailStepPx),
    1,
    config.maxBurst,
  );
  // Las finas van ENCIMA de las de cuerpo, no en su lugar: el rastro que ya
  // estaba aprobado no pierde ni una mota, y el grano fino se suma. Cada grupo
  // se reparte por su cuenta a lo largo del tramo, así que las finas no caen
  // encima de las gruesas formando parejas.
  const fineCount = Math.round(count * config.fineShare);
  const total = count + fineCount;

  for (let particle = 0; particle < total; particle += 1) {
    const isFine = particle >= count;
    const groupIndex = isFine ? particle - count : particle;
    const groupSize = isFine ? fineCount : count;
    const index = pool.cursor;
    const wasActive = pool.active[index] === 1;
    const angle = random() * Math.PI * 2;
    // La fina se despega más de la línea y deriva algo más rápido. Pegada al
    // mismo eje que la gruesa sólo la engrosaría; separada es lo que convierte
    // el rastro en polvo levantado con dos calibres.
    const drift = (0.008 + random() * 0.03) * (isFine ? 1.5 : 1);
    // Dispersión y tamaño siguen una ley de potencias, no un uniforme: la
    // mayoría de las motas caen pegadas a la línea y son diminutas, y unas
    // pocas se salen y brillan. Con distribución uniforme salían todas iguales
    // y el rastro se leía como un collar de cuentas, que es justo lo contrario
    // de polvo.
    const spread =
      (0.5 + Math.pow(random(), 1.6) * (3.2 + speed * 2.4)) *
      (isFine ? 1.45 : 1);
    // Reparto a lo largo del tramo recién recorrido, no en un punto.
    const back = ((groupIndex + random()) / groupSize) * span;

    pool.active[index] = 1;
    pool.x[index] = pointerX - velocityX * back + Math.cos(angle) * spread;
    pool.y[index] = pointerY - velocityY * back + Math.sin(angle) * spread;
    // La mota hereda parte del gesto: sin esa herencia el rastro se queda
    // clavado donde nació y parece pintura, no polvo levantado.
    pool.vx[index] =
      Math.cos(angle) * drift + clamp(velocityX, -1.5, 1.5) * 0.055;
    pool.vy[index] =
      Math.sin(angle) * drift + clamp(velocityY, -1.5, 1.5) * 0.055;
    pool.age[index] = 0;
    pool.lifetime[index] =
      config.minLifetimeMs +
      random() * (config.maxLifetimeMs - config.minLifetimeMs);
    pool.size[index] =
      (config.sizeBase +
        Math.pow(random(), config.sizePower) *
          (config.sizeRange + speed * config.sizeSpeed)) *
      (isFine ? config.fineSizeScale : 1);
    pool.phase[index] = random() * Math.PI * 2;
    // La ventana de tonos es del PERFIL. En `flat`, violeta/magenta/rosa
    // dominan y el cian es una señal rara (1/12 aprox.); en WebGL no hay más
    // que frío. Ver la nota de la paleta en `PARTICLE_TONES`.
    pool.tone[index] = Math.min(
      config.toneLast,
      config.toneFirst + Math.floor(random() * config.toneSpread),
    );
    pool.fine[index] = isFine ? 1 : 0;

    if (!wasActive) pool.activeCount += 1;
    pool.cursor = (index + 1) % pool.capacity;
  }

  return total;
}

export function updateStardust(pool: StardustPool, deltaMs: number) {
  const elapsed = Math.max(0, deltaMs);
  const step = Math.min(elapsed, 50);
  const drag = Math.pow(0.974, step / 16.67);

  for (let index = 0; index < pool.capacity; index += 1) {
    if (pool.active[index] === 0) continue;
    pool.age[index] += elapsed;
    if (pool.age[index] >= pool.lifetime[index]) {
      pool.active[index] = 0;
      pool.activeCount -= 1;
      continue;
    }

    pool.x[index] += pool.vx[index] * step;
    pool.y[index] += pool.vy[index] * step;
    pool.vx[index] *= drag;
    pool.vy[index] *= drag;
  }

  return pool.activeCount;
}

/**
 * Paleta, en dos mitades que ningún perfil mezcla.
 *
 * Los tres primeros son el rastro violeta de `flat`, congelado. Del 3 en
 * adelante vive la mitad fría, que es la única que usa WebGL desde el pase de
 * instrumentación: el sistema de navegación ya había convergido al cian
 * —retículo, corchetes, arco de órbita, raíl, NAV TARGET— y el rastro era la
 * única pieza de la escena que seguía hablando en magenta. Un cursor de
 * partículas violeta pertenece a otro lenguaje visual; sobre una cabina no dice
 * precisión, dice portafolio creativo.
 *
 * El cian del 3 es el mismo que ya existía como señal rara en `flat`, así que
 * la mitad fría no estrena ningún color: hereda el que la navegación ya usaba y
 * lo continúa hacia el blanco.
 */
const PARTICLE_TONES = [
  "183, 126, 255",
  "236, 111, 203",
  "255, 154, 196",
  "126, 220, 255",
  "180, 232, 255",
  "226, 240, 255",
] as const;

/**
 * Sprites de resplandor, uno por tono, generados a la primera pintada.
 *
 * El lado es potencia de dos y generoso: el sprite se dibuja SIEMPRE reducido,
 * nunca ampliado, y así el halo no muestra las bandas del gradiente. Se cachean
 * a nivel de módulo porque el contenido no depende del pool ni del viewport.
 */
const SPRITE_SIDE = 64;

/**
 * Dos juegos de sprites, uno por calibre.
 *
 * El de cuerpo reparte la energía en un halo ancho: es lo que da el resplandor.
 * El fino la concentra en el núcleo, y no es una preferencia estética sino
 * aritmética de escala — una mota fina se dibuja a dos o tres píxeles, y a ese
 * tamaño el halo ancho ocupa medio píxel de gradiente y devuelve un gris sucio
 * en lugar de un grano. Con la caída corta el núcleo sobrevive al reescalado y
 * la mota se sigue leyendo como polvo.
 */
const SPRITE_STOPS = {
  body: [
    // Núcleo casi blanco: es lo que hace que se lea como una chispa y no como
    // una mancha de color. El tono aparece en el halo, que es lo que se ve.
    [0, "rgba(255, 255, 255, 0.98)"],
    [0.12, "0.92"],
    [0.3, "0.44"],
    [0.58, "0.13"],
    [1, "0"],
  ],
  fine: [
    [0, "rgba(255, 255, 255, 1)"],
    [0.26, "0.88"],
    [0.52, "0.3"],
    [1, "0"],
  ],
} as const;

let spriteCache: {
  readonly body: readonly HTMLCanvasElement[];
  readonly fine: readonly HTMLCanvasElement[];
} | null = null;
let spriteCacheFailed = false;

function buildSpriteSet(
  kind: keyof typeof SPRITE_STOPS,
): readonly HTMLCanvasElement[] | null {
  const sprites: HTMLCanvasElement[] = [];
  for (const tone of PARTICLE_TONES) {
    const canvas = document.createElement("canvas");
    canvas.width = SPRITE_SIDE;
    canvas.height = SPRITE_SIDE;
    const context = canvas.getContext("2d");
    if (!context) return null;

    const centre = SPRITE_SIDE / 2;
    const gradient = context.createRadialGradient(
      centre,
      centre,
      0,
      centre,
      centre,
      centre,
    );
    for (const [offset, value] of SPRITE_STOPS[kind]) {
      gradient.addColorStop(
        offset,
        value.startsWith("rgba") ? value : `rgba(${tone}, ${value})`,
      );
    }
    context.fillStyle = gradient;
    context.fillRect(0, 0, SPRITE_SIDE, SPRITE_SIDE);
    sprites.push(canvas);
  }

  return sprites;
}

function buildSprites() {
  if (spriteCache) return spriteCache;
  if (spriteCacheFailed || typeof document === "undefined") return null;

  const body = buildSpriteSet("body");
  const fine = body ? buildSpriteSet("fine") : null;
  if (!body || !fine) {
    spriteCacheFailed = true;
    return null;
  }

  spriteCache = { body, fine };
  return spriteCache;
}

export function drawStardust(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  pool: StardustPool,
  profile: StardustProfile = "flat",
) {
  const config = STARDUST_PROFILES[profile];
  context.clearRect(0, 0, width, height);
  if (pool.activeCount === 0) return;

  const sprites = buildSprites();

  context.save();
  // Aditivo: dos motas superpuestas suman luz, que es lo que hace un rastro y
  // no un montón de pegatinas semitransparentes apiladas.
  context.globalCompositeOperation = "lighter";

  for (let index = 0; index < pool.capacity; index += 1) {
    if (pool.active[index] === 0) continue;

    const life = pool.age[index] / pool.lifetime[index];
    const remaining = 1 - life;
    // Ataque corto y caída larga. Sin el ataque las motas aparecen de golpe con
    // todo su brillo justo bajo el cursor y el efecto se lee como parpadeo.
    const attack = Math.min(1, life / 0.09);
    const twinkle = 0.82 + 0.18 * Math.sin(pool.phase[index] + life * 9.4);
    const fade =
      config.fadePower === 2
        ? remaining * remaining
        : Math.pow(remaining, config.fadePower);
    const alpha = clamp(fade * attack * twinkle * config.peakAlpha, 0, 1);
    if (alpha <= 0.004) continue;

    // La mota se expande al morir: es lo que convierte la desaparición en una
    // dispersión y no en un apagón.
    const radius = pool.size[index] * (1 + life * 0.85);
    const tone = PARTICLE_TONES[pool.tone[index] ?? 0] ?? PARTICLE_TONES[0];

    if (sprites) {
      const isFine = pool.fine[index] === 1;
      const set = isFine ? sprites.fine : sprites.body;
      const side =
        radius * 2 * (isFine ? config.fineGlowScale : config.glowScale);
      const half = side / 2;
      context.globalAlpha = alpha;
      context.drawImage(
        set[pool.tone[index] ?? 0] ?? set[0],
        pool.x[index] - half,
        pool.y[index] - half,
        side,
        side,
      );
      continue;
    }

    // Sin sprites (canvas sin 2D en el entorno) se conserva la forma mínima:
    // el efecto pierde el halo, pero nunca desaparece en silencio.
    context.globalAlpha = 1;
    context.beginPath();
    context.fillStyle = `rgba(${tone}, ${alpha})`;
    context.arc(pool.x[index], pool.y[index], radius, 0, Math.PI * 2);
    context.fill();
  }

  context.globalAlpha = 1;
  context.restore();
}
