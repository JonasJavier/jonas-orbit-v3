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
 * arrastra un rabo invisible durante el resto. Con exponente 1.55 la caída
 * sigue siendo caída —no hay meseta, no hay rastro permanente— pero la mota se
 * lee durante el tramo en que el ojo la está siguiendo.
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
  },
  webgl: {
    capacity: 340,
    minLifetimeMs: 470,
    maxLifetimeMs: 900,
    peakAlpha: 0.88,
    trailStepPx: 6.5,
    maxBurst: 12,
    glowScale: 3.3,
    sizeBase: 0.74,
    sizePower: 2.3,
    sizeRange: 2.3,
    sizeSpeed: 0.95,
    fadePower: 1.55,
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

  for (let particle = 0; particle < count; particle += 1) {
    const index = pool.cursor;
    const wasActive = pool.active[index] === 1;
    const angle = random() * Math.PI * 2;
    const drift = 0.008 + random() * 0.03;
    // Dispersión y tamaño siguen una ley de potencias, no un uniforme: la
    // mayoría de las motas caen pegadas a la línea y son diminutas, y unas
    // pocas se salen y brillan. Con distribución uniforme salían todas iguales
    // y el rastro se leía como un collar de cuentas, que es justo lo contrario
    // de polvo.
    const spread = 0.5 + Math.pow(random(), 1.6) * (3.2 + speed * 2.4);
    // Reparto a lo largo del tramo recién recorrido, no en un punto.
    const back = ((particle + random()) / count) * span;

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
      config.sizeBase +
      Math.pow(random(), config.sizePower) *
        (config.sizeRange + speed * config.sizeSpeed);
    pool.phase[index] = random() * Math.PI * 2;
    // Violet/magenta/pink dominan; el cyan es una señal rara (1/12 aprox.).
    pool.tone[index] = Math.min(3, Math.floor(random() * 3.24));

    if (!wasActive) pool.activeCount += 1;
    pool.cursor = (index + 1) % pool.capacity;
  }

  return count;
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

const PARTICLE_TONES = [
  "183, 126, 255",
  "236, 111, 203",
  "255, 154, 196",
  "126, 220, 255",
] as const;

/**
 * Sprites de resplandor, uno por tono, generados a la primera pintada.
 *
 * El lado es potencia de dos y generoso: el sprite se dibuja SIEMPRE reducido,
 * nunca ampliado, y así el halo no muestra las bandas del gradiente. Se cachean
 * a nivel de módulo porque el contenido no depende del pool ni del viewport.
 */
const SPRITE_SIDE = 64;
let spriteCache: readonly HTMLCanvasElement[] | null = null;
let spriteCacheFailed = false;

function buildSprites(): readonly HTMLCanvasElement[] | null {
  if (spriteCache) return spriteCache;
  if (spriteCacheFailed || typeof document === "undefined") return null;

  const sprites: HTMLCanvasElement[] = [];
  for (const tone of PARTICLE_TONES) {
    const canvas = document.createElement("canvas");
    canvas.width = SPRITE_SIDE;
    canvas.height = SPRITE_SIDE;
    const context = canvas.getContext("2d");
    if (!context) {
      spriteCacheFailed = true;
      return null;
    }

    const centre = SPRITE_SIDE / 2;
    const gradient = context.createRadialGradient(
      centre,
      centre,
      0,
      centre,
      centre,
      centre,
    );
    // Núcleo casi blanco: es lo que hace que se lea como una chispa y no como
    // una mancha de color. El tono aparece en el halo, que es lo que se ve.
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.98)");
    gradient.addColorStop(0.12, `rgba(${tone}, 0.92)`);
    gradient.addColorStop(0.3, `rgba(${tone}, 0.44)`);
    gradient.addColorStop(0.58, `rgba(${tone}, 0.13)`);
    gradient.addColorStop(1, `rgba(${tone}, 0)`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, SPRITE_SIDE, SPRITE_SIDE);
    sprites.push(canvas);
  }

  spriteCache = sprites;
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
      const side = radius * 2 * config.glowScale;
      const half = side / 2;
      context.globalAlpha = alpha;
      context.drawImage(
        sprites[pool.tone[index] ?? 0] ?? sprites[0],
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
