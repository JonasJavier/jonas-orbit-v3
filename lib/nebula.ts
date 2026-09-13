/** Distant gas, baked only on resize. No animation or full-size pixel buffer. */
const skies = new WeakMap<CanvasRenderingContext2D, HTMLCanvasElement>();

function hash(a: number, b: number) {
  let n = Math.imul(a, 374761393) + Math.imul(b, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function noise(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return (a + (b - a) * ux) * (1 - uy) + (c + (d - c) * ux) * uy;
}

function cloud(x: number, y: number) {
  let value = 0;
  let amplitude = 0.5;
  for (let octave = 0; octave < 5; octave++) {
    value += noise(x, y) * amplitude;
    x = x * 2.03 + 13.2;
    y = y * 2.03 + 7.9;
    amplitude *= 0.5;
  }
  return value;
}

export function drawNebula(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  // The long edge is bounded even at 4K; downsampling is part of the distant look.
  const scale = 640 / Math.max(width, height, 1);
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  let sky = skies.get(context);
  if (!sky || sky.width !== w || sky.height !== h) {
    sky = document.createElement("canvas");
    sky.width = w;
    sky.height = h;
    const paint = sky.getContext("2d");
    if (!paint) return;
    const pixels = paint.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const u = x / w;
        const v = y / h;
        const px = u * 6;
        const py = v * 4;
        const warp = cloud(px + 4.7, py + 9.2);
        const gas = cloud(px * 1.8 + warp * 2, py * 1.8 - warp);
        const filament = Math.pow(Math.max(0, gas - 0.24), 1.6);
        // Two broken banks, framing an open centre; mobile keeps both banks.
        const left = Math.exp(
          -(((u - 0.12) / 0.28) ** 2) - ((v - 0.32 + u * 0.25) / 0.26) ** 2,
        );
        const right = Math.exp(
          -(((u - 0.86) / 0.3) ** 2) - ((v - 0.65 - u * 0.2) / 0.3) ** 2,
        );
        const dust = 0.3 + 0.7 * Math.min(1, Math.abs(gas - warp) * 7);
        const density = filament * dust;
        const i = (y * w + x) * 4;
        const red = density * (left * 115 + right * 155);
        const green = density * (left * 205 + right * 135);
        const blue = density * (left * 285 + right * 255);
        // Preserve the same emission over black, but leave empty sky transparent.
        // An opaque black bake would dim the CSS atlas underneath this canvas.
        const alpha = Math.max(red, green, blue);
        if (alpha > 0) {
          pixels.data[i] = (red / alpha) * 255;
          pixels.data[i + 1] = (green / alpha) * 255;
          pixels.data[i + 2] = (blue / alpha) * 255;
          pixels.data[i + 3] = alpha;
        }
      }
    }
    paint.putImageData(pixels, 0, 0);
    skies.set(context, sky);
  }
  context.drawImage(sky, 0, 0, width, height);
}
