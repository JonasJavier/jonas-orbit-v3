export interface StarPoint {
  x: number;
  y: number;
  radius: number;
  depth: number;
  opacity: number;
  tone: "amber" | "cyan" | "white";
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function createStarPoints(width: number, height: number): StarPoint[] {
  const count = Math.round(
    Math.min(190, Math.max(72, (width * height) / 8_500)),
  );
  const random = seededRandom(
    Math.round(width) * 31 + Math.round(height) * 17 + 7,
  );

  return Array.from({ length: count }, (_, index) => ({
    x: random(),
    y: random(),
    radius: 0.45 + random() * (index % 13 === 0 ? 1.5 : 0.8),
    depth: 0.2 + random() * 0.8,
    opacity: 0.22 + random() * 0.68,
    tone: index % 17 === 0 ? "amber" : index % 11 === 0 ? "cyan" : "white",
  }));
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return { r: 197, g: 140, b: 255 };
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function wrapped(value: number, size: number) {
  return ((value % size) + size) % size;
}

export function drawStarfield({
  context,
  width,
  height,
  stars,
  globalProgress,
  worldProgress,
  accent,
}: {
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
  stars: readonly StarPoint[];
  globalProgress: number;
  worldProgress: number;
  accent: string;
}) {
  context.clearRect(0, 0, width, height);
  const tones = {
    white: "238, 243, 255",
    cyan: "127, 229, 255",
    amber: "242, 200, 121",
  } as const;

  for (const star of stars) {
    const x = wrapped(
      star.x * width + globalProgress * width * 0.035 * star.depth,
      width,
    );
    const y = wrapped(
      star.y * height - globalProgress * height * 0.38 * star.depth,
      height,
    );
    context.beginPath();
    context.fillStyle = `rgba(${tones[star.tone]}, ${star.opacity})`;
    context.arc(x, y, star.radius, 0, Math.PI * 2);
    context.fill();
  }

  const rgb = hexToRgb(accent);
  const orbitX = width * (0.78 + (worldProgress - 0.5) * 0.04);
  const orbitY = height * (0.28 + globalProgress * 0.42);
  const orbitRadius = Math.min(width, height) * 0.2;
  context.save();
  context.translate(orbitX, orbitY);
  context.rotate(-0.28 + worldProgress * 0.22);
  context.scale(1, 0.36);
  context.beginPath();
  context.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.16)`;
  context.lineWidth = 1;
  context.arc(0, 0, orbitRadius, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}
