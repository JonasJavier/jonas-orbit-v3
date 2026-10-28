/**
 * Los fondos de pantalla de Gargantúa: capturas 4K del simulador con GPU REAL,
 * sin el cromo del instrumento (2026-10-16).
 *
 * Son la materia prima de la entrada `gargantua-wallpapers` y la apuesta por
 * Google Imágenes («gargantua wallpaper 4k», «agujero negro de Interestelar»):
 * imágenes grandes, propias y con su página, no capturas de pantalla.
 *
 * Por qué no vale `observatory-shot.mjs`: usa SwiftShader a propósito (mide,
 * no enseña). Aquí, como en `awards-shots.mjs`, Chromium con ventana y
 * ANGLE/D3D11, y se niega a capturar con un renderizador por software.
 *
 * Resolución NATIVA, no escalada: con el encendido por defecto el gate
 * resuelve a `orbit` y el canvas se queda a DPR 1 aunque el contexto pida 2
 * (medido: 1920 × 1080 a DPR 2 daba un canvas de 1920 × 1080 estirado). Por
 * eso la ventana ES el 4K: 3840 × 2160 a DPR 1, y 1440 × 3120 el teléfono.
 * La composición no cambia: el encuadre depende del aspecto, no del tamaño
 * (`distanceForAspect`). La línea `canvas=` del registro lo comprueba.
 *
 * Cada vista se elige en ESTUDIO (las vistas son radios de la consola), se
 * vuelve a OBSERVAR, se oculta todo lo que no es el canvas y se espera a que
 * la acumulación asiente: cambiar de vista la tira entera.
 *
 * Los primeros planos (2026-10-27) son la vista LENTE capturada a 5120 × 2880
 * —el mismo encuadre, porque el aspecto no cambia, con más píxeles—, de la que
 * `prepare-wallpapers.mjs` recorta los cuadrados: Gargantúa llenando el cuadro
 * sin ampliar un solo píxel. Acercar la cámara no vale: las cuatro vistas son
 * el contrato (`lib/gargantua-views.ts`), y recortar no lo toca.
 *
 *   node tools/wallpaper-shots.mjs <carpeta-fuera-del-repo> [base] [vistas,separadas,por,comas]
 *
 * Después: `node tools/prepare-wallpapers.mjs <esa carpeta>`.
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const outDir = resolve(process.argv[2] ?? "../jonas-orbit-fondos");
const base = (process.argv[3] ?? "https://jonasjavier.dev").replace(/\/$/, "");
mkdirSync(outDir, { recursive: true });

const only = process.argv[4]?.split(",");
const URL = `${base}/es/experimentos/observatorio/gargantua`;
const SETTLE_MS = 14_000;

/** `vista`: rótulo del radio (sin tildes). `doppler: false` es la versión «de película». */
const SHOTS = [
  { id: "cinematic", vista: "cinematografica", doppler: true, phone: true },
  { id: "film", vista: "cinematografica", doppler: false, phone: false },
  { id: "lens", vista: "lente", doppler: true, phone: true },
  { id: "disk", vista: "disco", doppler: true, phone: false },
  { id: "shadow", vista: "sombra", doppler: true, phone: true },
  { id: "closeup", vista: "lente", doppler: true, phone: false, viewport: "closeup" },
];
const DESKTOP = { width: 3840, height: 2160, dpr: 1, suffix: "4k" };
const PHONE = { width: 1440, height: 3120, dpr: 1, suffix: "phone" };
const CLOSEUP = { width: 5120, height: 2880, dpr: 1, suffix: "5k" };

const sinTildes = (s) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const browser = await chromium.launch({
  headless: false,
  args: ["--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--hide-scrollbars", "--use-gl=angle", "--use-angle=d3d11"],
});

async function capture(shot, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.dpr,
    reducedMotion: "no-preference",
    locale: "es-ES",
  });
  await context.addInitScript(() => {
    localStorage.setItem("jonas-orbit:reducir-efectos", "false");
  });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: "load", timeout: 120_000 });

  const renderer = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "sin WebGL2";
  });
  if (/swiftshader|software|llvmpipe/i.test(renderer) || renderer === "sin WebGL2") {
    throw new Error(`Renderizador no válido para un fondo: ${renderer}`);
  }
  await page.waitForSelector('[data-state="nominal"]', { timeout: 60_000 });
  await page.waitForTimeout(2_000);

  await page.getByRole("radio", { name: "Estudio", exact: true }).click();
  await page.waitForTimeout(600);
  const mandos = page.getByRole("radio").filter({ hasNotText: /observar|estudio/i });
  const total = await mandos.count();
  let elegido = -1;
  for (let i = 0; i < total; i++) {
    if (sinTildes(await mandos.nth(i).textContent()).includes(shot.vista)) {
      elegido = i;
      break;
    }
  }
  if (elegido < 0) throw new Error(`No hay vista «${shot.vista}»`);
  await mandos.nth(elegido).click();
  if (!shot.doppler) {
    const doppler = page.getByRole("button", { name: /doppler/i }).or(page.getByRole("switch", { name: /doppler/i }));
    await doppler.first().click();
  }
  await page.waitForTimeout(600);
  await page.getByRole("radio", { name: "Observar", exact: true }).click();
  // Fuera del cuadro y quieto: la mano no deja rastro ni retícula.
  await page.mouse.move(viewport.width - 1, viewport.height - 1);
  await page.addStyleTag({
    // Todo invisible menos el canvas: también los interruptores de movimiento
    // y audio, que viven fuera de `.observatory`.
    content: "body * { visibility: hidden !important; } .observatory__canvas { visibility: visible !important; }",
  });
  await page.waitForTimeout(SETTLE_MS);

  const canvas = await page.evaluate(() => {
    const c = document.querySelector(".observatory__canvas");
    return c ? `${c.width}x${c.height}` : "sin canvas";
  });
  const name = `${shot.id}-${viewport.suffix}.png`;
  await page.screenshot({ path: resolve(outDir, name), timeout: 60_000 });
  console.log(`${name}  canvas=${canvas}  (${renderer})`);
  await context.close();
}

for (const shot of SHOTS) {
  if (only && !only.includes(shot.id)) continue;
  await capture(shot, shot.viewport === "closeup" ? CLOSEUP : DESKTOP);
  if (shot.phone) await capture(shot, PHONE);
}
await browser.close();
