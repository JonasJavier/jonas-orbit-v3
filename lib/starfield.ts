type StarLayer = "far" | "mid" | "near";

export interface StarPoint {
  x: number;
  y: number;
  radius: number;
  depth: number;
  opacity: number;
  occlusion: number;
  layer: StarLayer;
  tone: "amber" | "cyan" | "white";
}

export const STARFIELD_FRAME_INTERVAL_MS = 66;

const LAYER_BUDGET = {
  far: { divisor: 1_150, min: 420, max: 1_650 },
  mid: { divisor: 5_600, min: 92, max: 340 },
  near: { divisor: 35_000, min: 12, max: 46 },
} as const;

const TONES = {
  white: "238, 243, 255",
  cyan: "161, 215, 239",
  amber: "244, 211, 163",
} as const;

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function countForLayer(
  layer: StarLayer,
  width: number,
  height: number,
) {
  const budget = LAYER_BUDGET[layer];
  return Math.round(
    Math.min(
      budget.max,
      Math.max(budget.min, (width * height) / budget.divisor),
    ),
  );
}

function gargantuaOcclusion(x: number, y: number) {
  // El disco ocupa el centro de la home. La elipse evita una mancha circular
  // artificial y deja que la densidad se recupere gradualmente hacia fuera.
  const dx = (x - 0.5) / 0.34;
  const dy = (y - 0.49) / 0.22;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance < 0.42) return 0.12;
  if (distance < 0.72) return 0.42;
  if (distance < 1) return 0.72;
  return 1;
}

function layerPoint(
  layer: StarLayer,
  index: number,
  random: () => number,
): StarPoint {
  const x = random();
  const y = random();
  const colorIndex = index + (layer === "far" ? 0 : layer === "mid" ? 5 : 9);
  const occlusion = gargantuaOcclusion(x, y);

  if (layer === "far") {
    return {
      x,
      y,
      radius: 0.18 + random() * 0.34,
      depth: 0,
      opacity: 0.2 + (index % 7) * 0.045,
      occlusion,
      layer,
      tone:
        colorIndex % 41 === 0
          ? "amber"
          : colorIndex % 29 === 0
            ? "cyan"
            : "white",
    };
  }

  if (layer === "mid") {
    return {
      x,
      y,
      radius: 0.38 + random() * 0.5,
      depth: 0.35 + random() * 0.2,
      opacity: 0.3 + (index % 5) * 0.085,
      occlusion,
      layer,
      tone:
        colorIndex % 23 === 0
          ? "amber"
          : colorIndex % 13 === 0
            ? "cyan"
            : "white",
    };
  }

  return {
    x,
    y,
    radius: 0.72 + random() * 0.7,
    depth: 0.72 + random() * 0.2,
    opacity: 0.16 + (index % 4) * 0.065,
    occlusion,
    layer,
    tone: colorIndex % 7 === 0 ? "cyan" : "white",
  };
}

/**
 * Crea el mismo cielo para el mismo viewport. El orden far → mid → near es
 * deliberado: minimiza cambios de estado del canvas y mantiene legible el
 * presupuesto de cada capa en herramientas de rendimiento y tests.
 */
export function createStarPoints(width: number, height: number): StarPoint[] {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  const random = seededRandom(safeWidth * 31 + safeHeight * 17 + 7);
  const stars: StarPoint[] = [];

  for (const layer of ["far", "mid", "near"] as const) {
    const count = countForLayer(layer, safeWidth, safeHeight);
    for (let index = 0; index < count; index += 1) {
      stars.push(layerPoint(layer, index, random));
    }
  }

  return stars;
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return { r: 115, g: 93, b: 151 };
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function wrapped(value: number, size: number) {
  return ((value % size) + size) % size;
}

function drawHaze(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  accent: string,
) {
  const navy = context.createRadialGradient(
    width * 0.73,
    height * 0.18,
    0,
    width * 0.73,
    height * 0.18,
    Math.max(width, height) * 0.72,
  );
  navy.addColorStop(0, "rgba(18, 35, 67, 0.105)");
  navy.addColorStop(1, "rgba(2, 6, 14, 0)");
  context.fillStyle = navy;
  context.fillRect(0, 0, width, height);

  const violet = context.createRadialGradient(
    width * 0.13,
    height * 0.67,
    0,
    width * 0.13,
    height * 0.67,
    Math.max(width, height) * 0.48,
  );
  violet.addColorStop(0, "rgba(87, 45, 117, 0.052)");
  violet.addColorStop(1, "rgba(9, 5, 17, 0)");
  context.fillStyle = violet;
  context.fillRect(0, 0, width, height);

  const rgb = hexToRgb(accent);
  const warm = context.createRadialGradient(
    width * 0.5,
    height * 0.49,
    0,
    width * 0.5,
    height * 0.49,
    Math.min(width, height) * 0.57,
  );
  warm.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.035)`);
  warm.addColorStop(0.55, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.012)`);
  warm.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
  context.fillStyle = warm;
  context.fillRect(0, 0, width, height);
}

export function drawStarfield({
  context,
  width,
  height,
  stars,
  globalProgress,
  parallaxX = 0,
  parallaxY = 0,
  accent,
}: {
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
  stars: readonly StarPoint[];
  globalProgress: number;
  parallaxX?: number;
  parallaxY?: number;
  accent: string;
}) {
  context.clearRect(0, 0, width, height);
  drawHaze(context, width, height, accent);

  for (const star of stars) {
    // FAR es realmente estático. MID y NEAR sólo recorren unos pocos píxeles
    // durante los tres minutos del ciclo, más un paralaje acotado del puntero.
    const drift =
      star.layer === "far" ? 0 : globalProgress * (star.layer === "mid" ? 3 : 7);
    const parallax =
      star.layer === "far" ? 0 : star.layer === "mid" ? 2.25 : 5.5;
    const x = wrapped(
      star.x * width + parallaxX * parallax + drift * star.depth,
      width,
    );
    const y = wrapped(
      star.y * height + parallaxY * parallax - drift * star.depth * 0.62,
      height,
    );
    const opacity = star.opacity * star.occlusion;
    const tone = TONES[star.tone];

    context.fillStyle = `rgba(${tone}, ${opacity})`;
    if (star.layer === "far") {
      const diameter = star.radius * 2;
      context.fillRect(x - star.radius, y - star.radius, diameter, diameter);
      continue;
    }

    context.beginPath();
    if (star.layer === "near") {
      context.fillStyle = `rgba(${tone}, ${opacity * 0.14})`;
      context.arc(x, y, star.radius * 2.35, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.fillStyle = `rgba(${tone}, ${opacity})`;
    }
    context.arc(x, y, star.radius, 0, Math.PI * 2);
    context.fill();
  }
}
