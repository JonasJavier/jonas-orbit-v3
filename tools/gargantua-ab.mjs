/**
 * Captura A/B de Gargantúa en sus DOS superficies, con el reloj clavado.
 *
 * Nace en el pase de cohesión del disco (2026-09-19). El recorrido de
 * `observatory-shot.mjs` tarda cuatro minutos y deja trece capturas, de las
 * que un A/B del material usa UNA; y `shot.mjs` sólo sabe de la portada. Esto
 * hace lo mínimo que un A/B del shader necesita y nada más:
 *
 *   · laboratorio, vista canónica, con halo y sin halo;
 *   · portada, con halo y sin halo;
 *   · recortes a 1:1 y 2× de los dos brazos del laboratorio, que es donde se
 *     decide si el disco se lee como UNA masa o como capas.
 *
 * El reloj va clavado a 60 s en las cuatro, así que dos etiquetas distintas
 * sólo pueden diferir por el shader: es la condición para que la resta de dos
 * capturas signifique algo (ver la nota del A/B de física en
 * `observatory-shot.mjs`).
 *
 * ── Cómo se fuerza el asentamiento en un Chromium headless ──────────────────
 *
 * `requestAnimationFrame` deja de dispararse cuando nada fuerza un pintado, y
 * la imagen de Gargantúa es un promedio de 48 fotogramas. Esperar no sirve —
 * deja pasar tiempo, no fotogramas—; lo que sí fuerza un fotograma cada vez es
 * `page.screenshot()`. Así que antes de la captura buena se toman sesenta
 * capturas de ocho píxeles que no se guardan: cada una empuja un fotograma al
 * historial. Y se comprueba, no se supone: las dos últimas capturas enteras se
 * restan y la media tiene que estar en el suelo de ruido.
 *
 * Uso:
 *   node tools/gargantua-ab.mjs <etiqueta> [--base=http://localhost:3000]
 *                               [--reloj=60] [--solo=lab|home] [--centro=x,y]
 *
 * Deja todo en `.shots/cohesion/<etiqueta>/`.
 */
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const ETIQUETA = args.find((a) => !a.startsWith("--"));
if (!ETIQUETA) {
  console.error("uso: node tools/gargantua-ab.mjs <etiqueta> [--base=url] [--reloj=s] [--solo=lab|home]");
  process.exit(1);
}
const BASE = flag("base") ?? "http://localhost:3000";
const RELOJ = Number(flag("reloj") ?? 60);
const SOLO = flag("solo") ?? null;
/** Centro de la sombra en la vista canónica del laboratorio a 1440 × 900. */
const centro = flag("centro")?.split(",").map(Number);
const CX = centro?.[0] ?? 668;
const CY = centro?.[1] ?? 432;

const OUT = resolve(".shots/cohesion", ETIQUETA);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--use-gl=angle"],
});

/** Media de |Δ| entre dos PNG en gris. Es el mismo número que `shot-diff.mjs`. */
async function diferencia(a, b) {
  const [l, r] = await Promise.all(
    [a, b].map((p) => sharp(p).greyscale().raw().toBuffer({ resolveWithObject: true })),
  );
  let suma = 0;
  for (let i = 0; i < l.data.length; i++) suma += Math.abs(l.data[i] - r.data[i]);
  return suma / l.data.length;
}

/**
 * Empuja fotogramas al historial y captura cuando el promedio se ha asentado.
 * Devuelve la media |Δ| entre las dos últimas capturas enteras, que es la
 * prueba de que la imagen guardada es un promedio y no una muestra.
 */
async function capturarAsentada(page, destino) {
  const tmp = join(OUT, "_tmp.png");
  for (let i = 0; i < 60; i++) {
    await page.screenshot({
      path: tmp,
      clip: { x: 0, y: 0, width: 8, height: 8 },
      timeout: 120_000,
    });
  }
  const previa = join(OUT, "_previa.png");
  await page.screenshot({ path: previa, timeout: 120_000 });
  await page.screenshot({ path: destino, timeout: 120_000 });
  const ruido = await diferencia(previa, destino);
  rmSync(tmp, { force: true });
  rmSync(previa, { force: true });
  return ruido;
}

async function laboratorio(sinGlow) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.error("[page error]", e.message));
  // Un shader que no compila no lanza excepción: lo dice three por consola.
  page.on("console", (m) => {
    if (m.type() === "error") console.error("[console]", m.text().slice(0, 400));
  });
  await page.addInitScript(
    ({ reloj, bloom }) => {
      localStorage.setItem("jonas-orbit:reducir-efectos", "false");
      const banco = { reloj };
      if (bloom === 0) banco.bloom = 0;
      localStorage.setItem("jonas-orbit:banco-visual", JSON.stringify(banco));
    },
    { reloj: RELOJ, bloom: sinGlow ? 0 : 1 },
  );
  await page.goto(`${BASE}/es/experimentos/observatorio/gargantua`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.waitForSelector(".observatory__canvas", { timeout: 60_000 });
  // Sin tocar nada: el modo cine retira el cromo a los 3,5 s.
  await page.waitForTimeout(5_000);
  const nombre = sinGlow ? "lab-singlow" : "lab";
  const ruido = await capturarAsentada(page, join(OUT, `${nombre}.png`));
  await context.close();
  return ruido;
}

async function portada(sinGlow) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 860 },
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.error("[page error]", e.message));
  await page.addInitScript(
    ({ reloj, glow }) => {
      localStorage.setItem("jonas-orbit:reducir-efectos", "false");
      const banco = { reloj };
      if (!glow) {
        banco.bloom = 0;
        banco.emision = 0;
      }
      localStorage.setItem("jonas-orbit:banco-visual", JSON.stringify(banco));
    },
    { reloj: RELOJ, glow: !sinGlow },
  );
  await page.goto(`${BASE}/es`, { waitUntil: "load", timeout: 120_000 });
  /*
    La portada NO se fuerza fotograma a fotograma: su bucle no para nunca
    —`networkidle` jamás resuelve, ver `shot.mjs`— así que la acumulación se
    asienta sola con esperar. Y cada captura de la escena entera tarda varios
    segundos por software, de modo que sesenta pantallazos de ocho píxeles
    aquí no son un empujón, son minutos. Se espera como `shot.mjs` y se
    capturan dos seguidas para medir el ruido.
  */
  await page.waitForTimeout(15_000);
  const nombre = sinGlow ? "home-singlow" : "home";
  const previa = join(OUT, "_previa.png");
  await page.screenshot({ path: previa, timeout: 180_000 });
  await page.screenshot({ path: join(OUT, `${nombre}.png`), timeout: 180_000 });
  const ruido = await diferencia(previa, join(OUT, `${nombre}.png`));
  rmSync(previa, { force: true });
  await context.close();
  return ruido;
}

/** Recortes de los dos brazos del laboratorio, a 1:1 y a 2×. */
async function recortes() {
  const src = join(OUT, "lab.png");
  const zonas = {
    izq: { left: CX - 520, top: CY - 135, width: 520, height: 300 },
    der: { left: CX + 50, top: CY - 205, width: 560, height: 340 },
  };
  for (const [lado, zona] of Object.entries(zonas)) {
    await sharp(src).extract(zona).toFile(join(OUT, `lab-${lado}-1x.png`));
    await sharp(src)
      .extract(zona)
      .resize({ width: zona.width * 2, kernel: "lanczos3" })
      .toFile(join(OUT, `lab-${lado}-2x.png`));
  }
}

const informe = [];
if (SOLO !== "home") {
  informe.push(`lab        ruido ${(await laboratorio(false)).toFixed(3)}`);
  informe.push(`lab-singlow ruido ${(await laboratorio(true)).toFixed(3)}`);
  await recortes();
}
if (SOLO !== "lab") {
  informe.push(`home        ruido ${(await portada(false)).toFixed(3)}`);
  informe.push(`home-singlow ruido ${(await portada(true)).toFixed(3)}`);
}
await browser.close();

// El vídeo no se pide; por si algún contexto lo dejó, se limpia.
for (const f of readdirSync(OUT)) if (f.endsWith(".webm")) rmSync(join(OUT, f));

console.log(`Gargantúa A/B · ${ETIQUETA} · reloj ${RELOJ} s → ${OUT}`);
for (const linea of informe) console.log(`  ${linea}`);
