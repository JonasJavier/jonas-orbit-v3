import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const out = process.argv[2] ?? "shot";
const dir = process.argv[3] ?? "C:/Users/hachi/AppData/Local/Temp/claude/C--Users-hachi-OneDrive-Documentos-GitHub-jonas-orbit-v3/ac55f263-aed7-4843-9d19-2a49dafb4c8b/scratchpad/shots";
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 860 },
  deviceScaleFactor: 1,
  reducedMotion: "no-preference",
});
const page = await context.newPage();
page.on("console", (m) => { if (m.type() === "error") console.log("[console error]", m.text()); });
page.on("pageerror", (e) => console.log("[page error]", e.message));
await page.addInitScript(() => localStorage.setItem("jonas-orbit:efectos-forzados", "true"));
await page.goto("http://localhost:3100/es", { waitUntil: "load", timeout: 120000 });
await page.waitForTimeout(14000);
await page.screenshot({ path: `${dir}/${out}.png`, timeout: 180000 });
// Crop de Gargantúa: la sombra queda cerca del centro, ligeramente a la izquierda/abajo.
await page.screenshot({
  path: `${dir}/${out}-crop.png`,
  clip: { x: 330, y: 130, width: 780, height: 600 },
  timeout: 180000,
});
console.log("saved", `${dir}/${out}.png`);
await browser.close();
