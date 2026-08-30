export const STARDUST_POOL_CAPACITY = 112;
export const STARDUST_MIN_LIFETIME_MS = 320;
export const STARDUST_MAX_LIFETIME_MS = 680;

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
    tone: new Uint8Array(safeCapacity),
    cursor: 0,
    activeCount: 0,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Añade 1–5 motas según velocidad y sobrescribe slots antiguos al alcanzar el
 * techo. Nunca asigna arrays ni crea objetos durante pointermove.
 */
export function spawnStardust(
  pool: StardustPool,
  pointerX: number,
  pointerY: number,
  velocityX: number,
  velocityY: number,
  random: () => number = Math.random,
) {
  const speed = clamp(Math.hypot(velocityX, velocityY), 0, 1.5);
  if (speed < 0.025) return 0;

  const count = Math.min(5, 1 + Math.floor(speed / 0.27));
  for (let particle = 0; particle < count; particle += 1) {
    const index = pool.cursor;
    const wasActive = pool.active[index] === 1;
    const angle = random() * Math.PI * 2;
    const drift = 0.006 + random() * 0.022;
    const spread = 1.25 + random() * (2.8 + speed * 2.2);

    pool.active[index] = 1;
    pool.x[index] = pointerX + Math.cos(angle) * spread;
    pool.y[index] = pointerY + Math.sin(angle) * spread;
    pool.vx[index] =
      Math.cos(angle) * drift + clamp(velocityX, -1.5, 1.5) * 0.012;
    pool.vy[index] =
      Math.sin(angle) * drift + clamp(velocityY, -1.5, 1.5) * 0.012;
    pool.age[index] = 0;
    pool.lifetime[index] =
      STARDUST_MIN_LIFETIME_MS +
      random() * (STARDUST_MAX_LIFETIME_MS - STARDUST_MIN_LIFETIME_MS);
    pool.size[index] = 0.45 + random() * (0.65 + speed * 0.14);
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
  const drag = Math.pow(0.982, step / 16.67);

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

export function drawStardust(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  pool: StardustPool,
) {
  context.clearRect(0, 0, width, height);
  if (pool.activeCount === 0) return;

  context.save();
  context.globalCompositeOperation = "lighter";
  for (let index = 0; index < pool.capacity; index += 1) {
    if (pool.active[index] === 0) continue;
    const remaining = 1 - pool.age[index] / pool.lifetime[index];
    const opacity = remaining * remaining * 0.42;
    context.beginPath();
    const tone =
      PARTICLE_TONES[pool.tone[index] ?? 0] ?? PARTICLE_TONES[0];
    context.fillStyle = `rgba(${tone}, ${opacity})`;
    context.arc(pool.x[index], pool.y[index], pool.size[index], 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}
