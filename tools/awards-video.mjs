/**
 * Vídeo para los formularios de premios: home → travesía → un mundo → vuelta,
 * desde producción, con GPU real y ventana visible, a 1920×1080.
 *
 * Graba con `Page.startScreencast` de CDP (fotogramas JPEG con su marca de
 * tiempo real) y monta el vídeo con el ffmpeg que trae Playwright, a 60 fps
 * constantes: cada fotograma dura lo que duró en pantalla, así que un tirón
 * del navegador se ve como tirón y no se disimula. El script imprime la tasa
 * de fotogramas REAL que consiguió el screencast; si baja de ~50 fps en la
 * travesía, el vídeo no sirve de portada y hay que repetirlo con la máquina
 * libre.
 *
 * Uso:
 *   node tools/awards-video.mjs <carpeta-de-salida> [base]
 *
 * Respeta las trampas de medición de AGENTS.md igual que `awards-shots.mjs`.
 */
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

const [outArg = "../jonas-orbit-premios/capturas", base = "https://jonasjavier.dev"] = process.argv.slice(2);
const outDir = resolve(outArg);
const framesDir = resolve(outDir, "_frames");
rmSync(framesDir, { recursive: true, force: true });
mkdirSync(framesDir, { recursive: true });

const FFMPEG = resolve(homedir(), "AppData/Local/ms-playwright/ffmpeg-1011/ffmpeg-win64.exe");
const WIDTH = 1920;
const HEIGHT = 1080;

const browser = await chromium.launch({ headless: false, args: ["--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--hide-scrollbars", `--window-size=${WIDTH},${HEIGHT + 120}`] });
const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1, reducedMotion: "no-preference", locale: "en-US" });
await context.addInitScript(() => {
  localStorage.setItem("jonas-orbit:reducir-efectos", "false");
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

// ── Montaje ──────────────────────────────────────────────────────────────
if (frames.length < 10) throw new Error("Screencast sin fotogramas");
const duration = frames.at(-1).t - frames[0].t;
const fps = frames.length / duration;
console.log(`fotogramas: ${frames.length} en ${duration.toFixed(1)} s → ${fps.toFixed(1)} fps reales`);
const list = frames
  .map((frame, i) => {
    const next = frames[i + 1];
    const dur = next ? Math.max(next.t - frame.t, 1 / 120) : 1 / 60;
    return `file '${frame.file.replace(/\\/g, "/")}'\nduration ${dur.toFixed(5)}`;
  })
  .join("\n");
const listFile = resolve(framesDir, "frames.txt");
writeFileSync(listFile, `${list}\nfile '${frames.at(-1).file.replace(/\\/g, "/")}'\n`);
const output = resolve(outDir, `video-home-voyage-projects-${WIDTH}x${HEIGHT}-60fps.mp4`);
execFileSync(FFMPEG, ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-vf", `scale=${WIDTH}:${HEIGHT},format=yuv420p`, "-r", "60", "-fps_mode", "cfr", "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-movflags", "+faststart", output], { stdio: "inherit" });
console.log(output);
rmSync(framesDir, { recursive: true, force: true });
