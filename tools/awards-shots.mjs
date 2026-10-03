/**
 * Capturas con calidad de portada para los formularios de premios (Awwwards,
 * CSS Design Awards, The FWA), desde producción, con GPU REAL.
 *
 * Difiere de `shot.mjs` en todo lo que una captura de portada exige y una de
 * prueba no:
 *
 *   · Navegador CON VENTANA y GPU de verdad. `shot.mjs` usa SwiftShader a
 *     propósito (la suite e2e también), y SwiftShader dibuja Gargantúa con
 *     bandeado y los cuerpos pixelados: vale para medir, no para enseñar. El
 *     script se niega a capturar si `WEBGL_debug_renderer_info` dice
 *     SwiftShader o «Software».
 *   · `deviceScaleFactor` 2 en escritorio (1440×900 → 2880×1800, 1920×1080 →
 *     3840×2160) y 3 en el teléfono (390×844 → 1170×2532). Con GPU real el
 *     raymarch lo aguanta.
 *   · Escena calentada: espera a `data-scene-live` y luego unos segundos de
 *     animación (el disco se enrolla y el bloom se asienta); fuentes cargadas
 *     (`document.fonts.ready`) e imágenes decodificadas.
 *   · Sin puntero (fuera del cuadro), sin la burbuja «CLICK TO LISTEN» (se
 *     hace un gesto antes, que es lo que la retira en una visita real) y sin
 *     el estado `armed` del audio.
 *
 * Trampas de medición que respeta (AGENTS.md): `jonas-orbit:reducir-efectos =
 * "false"` en localStorage, reduced-motion emulado en `no-preference` y rAF
 * vivo (la ventana está visible).
 *
 * Uso:
 *   node tools/awards-shots.mjs <carpeta-de-salida> [base] [--solo=home,projects]
 *
 * La carpeta de salida tiene que estar FUERA del repo (es público). Nombres:
 * `<premio>-<nn>-<ruta>-<ancho>x<alto>.png` los recorta después `crop.mjs` o
 * la herramienta de cada formulario.
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const positional = args.filter((a) => !a.startsWith("--"));
const outDir = resolve(positional[0] ?? "../jonas-orbit-premios/capturas");
const base = (positional[1] ?? "https://jonasjavier.dev").replace(/\/$/, "");
const only = [...flags].find((f) => f.startsWith("--solo="))?.slice(7).split(",");
mkdirSync(outDir, { recursive: true });

/** Qué se captura. `settle` son los segundos de animación tras la escena viva. */
const SHOTS = [
  { id: "home", path: "/en", settle: 8, scene: true },
  { id: "projects", path: "/en/projects", settle: 4 },
  { id: "project-omsta", path: "/en/projects/omsta", settle: 3 },
  { id: "observatory-gargantua", path: "/en/experiments/observatory/gargantua", settle: 8, scene: true },
  { id: "contact", path: "/en/contact", settle: 5 },
  { id: "about", path: "/en/about", settle: 3 },
  { id: "education", path: "/en/education", settle: 5 },
  { id: "creativity", path: "/en/creativity", settle: 4 },
  { id: "experiments", path: "/en/experiments", settle: 3 },
];
const DESKTOP = [
  { width: 1440, height: 900, dpr: 2 },
  { width: 1920, height: 1080, dpr: 2 },
];
const PHONE = { width: 390, height: 844, dpr: 3 };
const PHONE_SHOTS = ["home", "projects", "contact", "observatory-gargantua"];

const browser = await chromium.launch({ headless: false, args: ["--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--hide-scrollbars"] });

async function capture(shot, viewport, phone) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.dpr,
    isMobile: phone,
    hasTouch: phone,
    reducedMotion: "no-preference",
    locale: "en-US",
  });
  await context.addInitScript(() => {
    localStorage.setItem("jonas-orbit:reducir-efectos", "false");
    // La indicación «Toca para explorar» del teléfono ya se vio en otra visita.
    localStorage.setItem("jonas-orbit:explorar-visto", "1");
  });
  const page = await context.newPage();
  await page.goto(base + shot.path, { waitUntil: "load", timeout: 120000 });

  const renderer = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "sin WebGL2";
  });
  if (/swiftshader|software|llvmpipe/i.test(renderer) || renderer === "sin WebGL2") {
    throw new Error(`Renderizador no válido para portada: ${renderer}`);
  }

  // Un gesto real retira la burbuja del audio y arma el sonido como en una visita.
  await page.mouse.move(viewport.width - 8, viewport.height / 2);
  await page.keyboard.press("Shift");
  await page.mouse.move(viewport.width - 1, viewport.height - 1);

  if (shot.scene) {
    await page.waitForFunction(() => document.documentElement.dataset.sceneLive === "true", null, { timeout: 60000 });
  }
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    await Promise.all([...document.images].filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.decode().catch(() => {})));
  });
  await page.waitForTimeout(shot.settle * 1000);

  const name = `${shot.id}-${viewport.width * viewport.dpr}x${viewport.height * viewport.dpr}${phone ? "-phone" : ""}.png`;
  await page.screenshot({ path: resolve(outDir, name), timeout: 60000 });
  console.log(`${name}  (${renderer})`);
  await context.close();
}

for (const shot of SHOTS) {
  if (only && !only.includes(shot.id)) continue;
  for (const viewport of DESKTOP) await capture(shot, viewport, false);
  if (PHONE_SHOTS.includes(shot.id)) await capture(shot, PHONE, true);
}
await browser.close();
