/**
 * Barrido de FASE del disco en un solo build.
 *
 * El defecto que hay que corregir aparece con distinta intensidad según dónde
 * esté el flujo, así que el before/after tiene que ser sobre el MISMO
 * fotograma. Parchea uTime para que lo lea de ?t= —parche temporal, se revierte
 * al final—, barre fases y mide en cada una cuánta área oscura hay DENTRO de la
 * envolvente del disco, que es la métrica del defecto.
 *
 *   node .tmpsplice/fase.mjs <etiqueta> [fases...]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const SCENE = "components/scene/system-scene.ts";
const SHOTS =
  "C:/Users/hachi/AppData/Local/Temp/claude/C--Users-hachi-OneDrive-Documentos-GitHub-jonas-orbit-v3/ac55f263-aed7-4843-9d19-2a49dafb4c8b/scratchpad/shots";
const tag = process.argv[2] ?? "fase";
const PHASES = process.argv.slice(3).map(Number);
const sh = (c, a, o = {}) => execFileSync(c, a, { stdio: "pipe", shell: true, ...o });

const FROM = "marchMaterial.uniforms.uTime.value = elapsed;";
const TO =
  'marchMaterial.uniforms.uTime.value = Number(new URLSearchParams(location.search).get("t") ?? "") || elapsed; // A/B: fase por query';

let server = null;
const kill = () => {
  if (!server) return;
  try {
    sh("taskkill", ["/F", "/T", "/PID", String(server.pid)], { stdio: "ignore" });
  } catch {}
  server = null;
};

try {
  const src = readFileSync(SCENE, "utf8");
  if (!src.includes(FROM)) throw new Error("no encuentro uTime");
  writeFileSync(SCENE, src.replace(FROM, TO));
  sh("npm", ["run", "build"], { stdio: "ignore" });

  kill();
  server = spawn("npx", ["next", "start", "-p", "3100"], { shell: true, stdio: "ignore" });
  for (let i = 0; i < 90; i++) {
    try {
      if ((await fetch("http://localhost:3100/es")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }

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

  // Banda del disco frontal, sin la sombra y sin los cuerpos de los extremos.
  const BAND = { x: 250, y: 355, width: 900, height: 190 };
  const SHADOW = { cx: 668 - BAND.x, cy: 448 - BAND.y, r: 95 };

  for (const t of PHASES) {
    await page.goto(`http://localhost:3100/es?t=${t}`, {
      waitUntil: "load",
      timeout: 120000,
    });
    await page.waitForTimeout(15000);
    await page.screenshot({ path: `${SHOTS}/${tag}-t${t}.png`, timeout: 180000 });
    const buf = await page.screenshot({ clip: BAND, timeout: 180000 });
    const { data, info } = await sharp(buf)
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let dark = 0;
    let tot = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        if (Math.hypot(x - SHADOW.cx, y - SHADOW.cy) < SHADOW.r) continue;
        tot++;
        if (data[y * info.width + x] < 14) dark++;
      }
    }
    console.log(`t=${String(t).padStart(3)}  area oscura en la banda: ${((100 * dark) / tot).toFixed(1)} %`);
  }
  await browser.close();
} finally {
  kill();
  sh("git", ["checkout", "--", SCENE]);
  console.log("system-scene.ts restaurado");
}
