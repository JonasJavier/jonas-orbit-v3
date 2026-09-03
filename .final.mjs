/**
 * Entregables de la pasada de 9°: captura completa, crop, clip en movimiento y
 * medida de estabilidad.
 *
 * El hueco entre fotogramas es de 1.5 s y no de 180 ms por una razón medida:
 * bajo SwiftShader un fotograma tarda del orden de un segundo, así que dos
 * capturas separadas 180 ms caen sobre EL MISMO render y la diferencia sale
 * cero. Eso no es estabilidad perfecta, es no haber muestreado nada.
 */
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const dir =
  "C:/Users/hachi/AppData/Local/Temp/claude/C--Users-hachi-OneDrive-Documentos-GitHub-jonas-orbit-v3/ac55f263-aed7-4843-9d19-2a49dafb4c8b/scratchpad/shots";
const tag = process.argv[2] ?? "final";

const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 860 },
  deviceScaleFactor: 1,
  reducedMotion: "no-preference",
});
const page = await context.newPage();
await page.addInitScript(() =>
  localStorage.setItem("jonas-orbit:efectos-forzados", "true"),
);
await page.goto("http://localhost:3100/es", { waitUntil: "load", timeout: 120000 });
await page.waitForTimeout(16000);

await page.screenshot({ path: `${dir}/${tag}.png`, timeout: 180000 });

const CROP = { x: 300, y: 250, width: 840, height: 420 };
await page.screenshot({ path: `${dir}/${tag}-crop.png`, clip: CROP, timeout: 180000 });

// --- Clip en movimiento ----------------------------------------------------
const GW = 560;
const frames = [];
for (let i = 0; i < 10; i++) {
  const buf = await page.screenshot({ clip: CROP, timeout: 180000 });
  frames.push(await sharp(buf).resize({ width: GW }).removeAlpha().raw().toBuffer());
  await page.waitForTimeout(1500);
}
await browser.close();

const GH = Math.round((CROP.height / CROP.width) * GW);
try {
  await sharp(Buffer.concat(frames), {
    raw: { width: GW, height: GH * frames.length, channels: 3 },
    pageHeight: GH,
  })
    .gif({ loop: 0, delay: 130 })
    .toFile(`${dir}/${tag}-clip.gif`);
  console.log(`${tag}-clip.gif  ${GW}x${GH} · ${frames.length} fotogramas`);
} catch (e) {
  console.log("gif animado no disponible:", e.message);
  const sheet = await sharp(Buffer.concat(frames.slice(0, 4)), {
    raw: { width: GW, height: GH * 4, channels: 3 },
  })
    .png()
    .toBuffer();
  writeFileSync(`${dir}/${tag}-tira.png`, sheet);
  console.log(`${tag}-tira.png (contacto de 4 fotogramas)`);
}

// --- Estabilidad: energia de ALTA FRECUENCIA del diff -----------------------
function metric(a, b) {
  const n = a.length;
  const d = new Float32Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    d[i] = Math.abs(a[i * 3] - b[i * 3]);
    sum += d[i];
  }
  let lap = 0;
  let m = 0;
  for (let y = 1; y < GH - 1; y++) {
    for (let x = 1; x < GW - 1; x++) {
      const i = y * GW + x;
      lap += Math.abs(4 * d[i] - d[i - 1] - d[i + 1] - d[i - GW] - d[i + GW]);
      m++;
    }
  }
  return { mean: sum / n, hf: lap / m };
}
for (let i = 0; i + 1 < 4; i++) {
  const r = metric(frames[i], frames[i + 1]);
  console.log(
    `estabilidad ${i}->${i + 1}: diff medio ${r.mean.toFixed(2)}/255 · alta frecuencia ${r.hf.toFixed(2)} · relativa ${(r.hf / r.mean).toFixed(3)}`,
  );
}
