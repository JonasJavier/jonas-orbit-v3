/**
 * Estabilidad temporal del raymarch: ¿el disco AVANZA o HIERVE?
 *
 * Es la medida que decide si un cambio en el shader es aceptable, porque el
 * defecto que más delata un raymarcher no se ve en una captura fija: es el
 * microdetalle centelleando entre fotogramas.
 *
 * Dos cosas que hay que saber para que el número signifique algo:
 *
 *   · EL HUECO ENTRE CAPTURAS. Bajo SwiftShader un fotograma tarda del orden de
 *     un segundo. Con 180 ms las dos capturas caen sobre EL MISMO render y la
 *     diferencia sale 0.00 — que se lee como estabilidad perfecta y en realidad
 *     es no haber muestreado nada. De ahí el 1.5 s.
 *   · LA CIFRA QUE VALE ES LA RELATIVA: energía de alta frecuencia del diff
 *     dividida por su media. Un diff grande pero suave es material avanzando
 *     (bien); uno pequeño pero moteado es microdetalle hirviendo (mal). El diff
 *     medio a secas no distingue las dos cosas.
 *
 * Deja además el diff amplificado ×10 en <tag>-diff.png: si sale laminar es
 * advección, si sale con grano es hervor.
 *
 * Uso:
 *   node tools/stability.mjs [tag] [url]
 */
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const tag = process.argv[2] ?? "estab";
const url = process.argv[3] ?? "http://localhost:3100/es";
const dir = resolve(process.env.SHOTS_DIR ?? ".shots");
mkdirSync(dir, { recursive: true });

// Sólo el disco: los cuerpos y sus rótulos se mueven por su cuenta y
// contaminarían la medida.
const CLIP = { x: 330, y: 300, width: 700, height: 340 };
const GAP = 1500;

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
  // `reducir-efectos = "false"` es lo que lee `useForcedEffects()`. La clave
  // anterior, `efectos-forzados`, no la lee nadie desde el pase de movimiento
  // unificado: con ella esta herramienta medía el perfil plano.
  localStorage.setItem("jonas-orbit:reducir-efectos", "false"),
);
await page.goto(url, { waitUntil: "load", timeout: 120000 });
await page.waitForTimeout(16000);

const frames = [];
for (let i = 0; i < 4; i++) {
  const buf = await page.screenshot({ clip: CLIP, timeout: 180000 });
  frames.push(await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true }));
  await page.waitForTimeout(GAP);
}
await browser.close();

const { width: w, height: h } = frames[0].info;

function report(name, a, b) {
  const n = w * h;
  const d = new Float32Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    d[i] = Math.abs(a.data[i] - b.data[i]);
    sum += d[i];
  }
  let lap = 0;
  let m = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      lap += Math.abs(4 * d[i] - d[i - 1] - d[i + 1] - d[i - w] - d[i + w]);
      m++;
    }
  }
  const mean = sum / n;
  const hf = lap / m;
  console.log(
    `${tag} ${name}: diff medio ${mean.toFixed(2)}/255 · alta frecuencia ${hf.toFixed(2)} · relativa ${(hf / mean).toFixed(3)}`,
  );
  return d;
}

const first = report("0->1", frames[0], frames[1]);
report("1->2", frames[1], frames[2]);
report("2->3", frames[2], frames[3]);

const vis = Buffer.alloc(w * h);
for (let i = 0; i < w * h; i++) vis[i] = Math.min(255, first[i] * 10);
await sharp(vis, { raw: { width: w, height: h, channels: 1 } }).toFile(
  `${dir}/${tag}-diff.png`,
);
console.log(`${dir}/${tag}-diff.png (diff ×10)`);
