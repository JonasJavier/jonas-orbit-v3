/**
 * Estabilidad temporal, con el hueco entre capturas ajustado a lo que tarda
 * SwiftShader en producir un fotograma nuevo (≈1 s). Con 180 ms las dos
 * capturas caen sobre el MISMO render y la diferencia sale 0, que no es
 * estabilidad perfecta sino no haber muestreado nada.
 *
 * La cifra que importa es la RELATIVA: energía de alta frecuencia del diff
 * dividida por su media. Un diff grande pero suave es material avanzando; un
 * diff pequeño pero moteado es microdetalle hirviendo. Sólo lo segundo es un
 * defecto.
 */
import { chromium } from "@playwright/test";
import sharp from "sharp";

const dir =
  "C:/Users/hachi/AppData/Local/Temp/claude/C--Users-hachi-OneDrive-Documentos-GitHub-jonas-orbit-v3/ac55f263-aed7-4843-9d19-2a49dafb4c8b/scratchpad/shots";
const tag = process.argv[2] ?? "estab";
const CLIP = { x: 330, y: 300, width: 700, height: 340 };

const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 860 },
  deviceScaleFactor: 1,
  reducedMotion: "no-preference",
});
const page = await ctx.newPage();
await page.addInitScript(() =>
  localStorage.setItem("jonas-orbit:efectos-forzados", "true"),
);
await page.goto("http://localhost:3100/es", { waitUntil: "load", timeout: 120000 });
await page.waitForTimeout(16000);

const frames = [];
for (let i = 0; i < 4; i++) {
  const buf = await page.screenshot({ clip: CLIP, timeout: 180000 });
  frames.push(await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true }));
  await page.waitForTimeout(1500);
}
await browser.close();

const { width: w, height: h } = frames[0].info;
function report(name, x, y) {
  const n = w * h;
  const d = new Float32Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    d[i] = Math.abs(x.data[i] - y.data[i]);
    sum += d[i];
  }
  let lap = 0;
  let m = 0;
  for (let yy = 1; yy < h - 1; yy++) {
    for (let xx = 1; xx < w - 1; xx++) {
      const i = yy * w + xx;
      lap += Math.abs(4 * d[i] - d[i - 1] - d[i + 1] - d[i - w] - d[i + w]);
      m++;
    }
  }
  const mean = sum / n;
  const hf = lap / m;
  console.log(
    `${tag} ${name}: diff medio ${mean.toFixed(2)}/255 · alta frecuencia ${hf.toFixed(2)} · relativa ${(hf / mean).toFixed(3)}`,
  );
  return { d, mean };
}

const r = report("0->1", frames[0], frames[1]);
report("1->2", frames[1], frames[2]);
report("2->3", frames[2], frames[3]);

// Imagen del diff, x10, para poder mirar si es advección o moteado.
const vis = Buffer.alloc(w * h);
for (let i = 0; i < w * h; i++) vis[i] = Math.min(255, r.d[i] * 10);
await sharp(vis, { raw: { width: w, height: h, channels: 1 } }).toFile(
  `${dir}/${tag}-diff.png`,
);
console.log(`${tag}-diff.png`);
