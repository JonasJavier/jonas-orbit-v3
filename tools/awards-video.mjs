/**
 * Vídeo para los formularios de premios: home → travesía → un mundo → vuelta,
 * desde producción, con GPU real y ventana visible, a 1920×1080.
 *
 * Graba con `Page.startScreencast` de CDP (fotogramas JPEG con su marca de
 * tiempo real) y monta el vídeo con el ffmpeg que trae Playwright a 60 fps
 * constantes: cada ranura de 1/60 s lleva el último fotograma que estaba en
 * pantalla, así que un tirón del navegador se ve como tirón y no se
 * disimula. El script imprime la tasa de fotogramas REAL que consiguió el
 * screencast (en una integrada AMD salió ~31 fps: la escena va a ~36); si el
 * formulario exige 60 fps de verdad hay que grabarlo en una máquina con GPU
 * dedicada.
 *
 * El ffmpeg de Playwright sólo trae el códec VP8 y el demuxer `image2pipe`
 * (ni libx264 ni `concat`): la salida es WebM. Vimeo y YouTube lo aceptan tal
 * cual; para un MP4 hace falta un ffmpeg completo (`ffmpeg -i video.webm
 * -c:v libx264 -crf 17 video.mp4`).
 *
 * Uso:
 *   node tools/awards-video.mjs <carpeta-de-salida> [base] [--solo-montaje]
 *
 * `--solo-montaje` no graba: monta los fotogramas que quedaron en `_frames/`
 * de una grabación anterior.
 *
 * Respeta las trampas de medición de AGENTS.md igual que `awards-shots.mjs`
 * (y, como él, NO escribe `reducir-efectos`).
 */
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const montajeSolo = args.includes("--solo-montaje");
const [outArg = "../jonas-orbit-premios/capturas", base = "https://jonasjavier.dev"] = args.filter((a) => !a.startsWith("--"));
const outDir = resolve(outArg);
const framesDir = resolve(outDir, "_frames");
const framesList = resolve(framesDir, "frames.json");
if (!montajeSolo) {
  rmSync(framesDir, { recursive: true, force: true });
  mkdirSync(framesDir, { recursive: true });
}

const FFMPEG = resolve(homedir(), "AppData/Local/ms-playwright/ffmpeg-1011/ffmpeg-win64.exe");
const WIDTH = 1920;
const HEIGHT = 1080;

async function record() {
const browser = await chromium.launch({ headless: false, args: ["--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--hide-scrollbars", `--window-size=${WIDTH},${HEIGHT + 120}`] });
const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1, reducedMotion: "no-preference", locale: "en-US" });
// Sin `reducir-efectos = "false"`: esa clave fuerza el nivel `orbit` (ver
// `awards-shots.mjs`); con reduced-motion en `no-preference` no hace falta.
await context.addInitScript(() => {
  localStorage.setItem("jonas-orbit:explorar-visto", "1");
});
const page = await context.newPage();
await page.goto(`${base.replace(/\/$/, "")}/en`, { waitUntil: "load", timeout: 120000 });

const renderer = await page.evaluate(() => {
  const gl = document.createElement("canvas").getContext("webgl2");
  const info = gl?.getExtension("WEBGL_debug_renderer_info");
  return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "sin WebGL2";
});
if (/swiftshader|software|llvmpipe/i.test(renderer)) throw new Error(`Renderizador no válido: ${renderer}`);
console.log("renderer:", renderer);

// Un gesto real: retira la burbuja del audio y arma el sonido como en una visita.
await page.mouse.move(WIDTH - 10, HEIGHT / 2);
await page.keyboard.press("Shift");
await page.waitForFunction(() => document.documentElement.dataset.sceneLive === "true", null, { timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(5000);

const cdp = await context.newCDPSession(page);
const frames = [];
let index = 0;
cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
  const file = resolve(framesDir, `f${String(index++).padStart(5, "0")}.jpg`);
  writeFileSync(file, Buffer.from(data, "base64"));
  frames.push({ file, t: metadata.timestamp });
  await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: WIDTH, maxHeight: HEIGHT, everyNthFrame: 1 });

// ── Coreografía (≈30 s) ──────────────────────────────────────────────────
await page.waitForTimeout(5000); // la home quieta, el disco enrollándose
const rail = page.locator(".nav-rail__link[data-rail-world='endurance']");
const box = await rail.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 40 });
await page.waitForTimeout(1200);
await rail.click();
await page.waitForURL(/\/en\/projects/, { timeout: 30000 });
await page.waitForTimeout(5000); // la mesa de Proyectos
await page.mouse.wheel(0, 500);
await page.waitForTimeout(2500);
await page.mouse.wheel(0, -500);
await page.waitForTimeout(1500);
const back = page.locator("a[href='/en']").first();
const backBox = await back.boundingBox();
if (backBox) await page.mouse.move(backBox.x + backBox.width / 2, backBox.y + backBox.height / 2, { steps: 30 });
await page.waitForTimeout(800);
await page.goto(`${base.replace(/\/$/, "")}/en`, { waitUntil: "load" }).catch(() => {});
await page.waitForFunction(() => document.documentElement.dataset.sceneLive === "true", null, { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(6000);

await cdp.send("Page.stopScreencast");
await page.waitForTimeout(500);
await browser.close();
writeFileSync(framesList, JSON.stringify(frames));
return frames;
}

// ── Montaje ──────────────────────────────────────────────────────────────
const frames = montajeSolo && existsSync(framesList) ? JSON.parse(readFileSync(framesList, "utf8")) : await record();
if (frames.length < 10) throw new Error("Screencast sin fotogramas");
const duration = frames.at(-1).t - frames[0].t;
const fps = frames.length / duration;
console.log(`fotogramas: ${frames.length} en ${duration.toFixed(1)} s → ${fps.toFixed(1)} fps reales`);

// Ranuras de 1/60 s: cada una lleva el último fotograma que estaba en pantalla.
const FPS = 60;
const slots = [];
let cursor = 0;
for (let t = frames[0].t; t <= frames.at(-1).t; t += 1 / FPS) {
  while (cursor + 1 < frames.length && frames[cursor + 1].t <= t) cursor += 1;
  slots.push(frames[cursor].file);
}
const output = resolve(outDir, `video-home-voyage-projects-${WIDTH}x${HEIGHT}-60fps.webm`);
// El ffmpeg de Playwright tampoco trae el protocolo `pipe`: los JPEG de cada
// ranura van pegados uno tras otro en un archivo y `image2pipe` los lee de ahí.
const stream = resolve(framesDir, "slots.mjpeg");
const cache = new Map();
const chunks = [];
for (const file of slots) {
  if (!cache.has(file)) cache.set(file, readFileSync(file));
  chunks.push(cache.get(file));
}
writeFileSync(stream, Buffer.concat(chunks));
const ffmpeg = spawn(FFMPEG, ["-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", stream, "-vf", `scale=${WIDTH}:${HEIGHT}`, "-pix_fmt", "yuv420p", "-c:v", "libvpx", "-b:v", "14M", "-maxrate", "20M", "-bufsize", "30M", "-deadline", "good", "-cpu-used", "1", "-auto-alt-ref", "1", "-lag-in-frames", "16", output], { stdio: ["ignore", "inherit", "inherit"] });
await new Promise((done, fail) => ffmpeg.on("close", (code) => (code === 0 ? done() : fail(new Error(`ffmpeg salió con ${code}`)))));
console.log(`${output}  (${slots.length} ranuras a ${FPS} fps, ${(slots.length / FPS).toFixed(1)} s)`);
rmSync(framesDir, { recursive: true, force: true });
