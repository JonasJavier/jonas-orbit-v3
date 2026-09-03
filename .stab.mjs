import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const dir =
  "C:/Users/hachi/AppData/Local/Temp/claude/C--Users-hachi-OneDrive-Documentos-GitHub-jonas-orbit-v3/ac55f263-aed7-4843-9d19-2a49dafb4c8b/scratchpad/shots";
mkdirSync(dir, { recursive: true });
const tag = process.argv[2] ?? "stab";

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

// Sólo el disco: fuera quedan Endurance y los planetas, que sí se mueven y
// contaminarían la medida.
const clip = { x: 360, y: 300, width: 620, height: 340 };
const shots = [];
for (let i = 0; i < 3; i++) {
  shots.push(await page.screenshot({ clip, timeout: 180000 }));
  await page.waitForTimeout(180);
}
await browser.close();

const frames = await Promise.all(
  shots.map((b) => sharp(b).greyscale().raw().toBuffer({ resolveWithObject: true })),
);

function report(name, x, y) {
  const { width: w, height: h } = x.info;
  const d = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    d[i] = Math.abs(x.data[i] - y.data[i]);
    sum += d[i];
  }
  // Energía de ALTA FRECUENCIA del diff, sin amplificar ni recortar: es la que
  // separa «el material ha avanzado» (diff suave) de «el microdetalle hierve»
  // (diff moteado). Normalizada por la media para que un disco más brillante no
  // puntúe peor sólo por serlo.
  let lap = 0;
  let n = 0;
  for (let y2 = 1; y2 < h - 1; y2++) {
    for (let x2 = 1; x2 < w - 1; x2++) {
      const i = y2 * w + x2;
      lap += Math.abs(4 * d[i] - d[i - 1] - d[i + 1] - d[i - w] - d[i + w]);
      n++;
    }
  }
  const mean = sum / d.length;
  console.log(
    `${tag} ${name}: diff medio ${mean.toFixed(2)}/255 · alta frecuencia ${(lap / n).toFixed(2)} · relativa ${(lap / n / mean).toFixed(3)}`,
  );
}

report("ab", frames[0], frames[1]);
report("bc", frames[1], frames[2]);
