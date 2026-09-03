/**
 * Captura del hero 3D en un navegador headless.
 *
 * Abrir la página a mano no sirve para juzgar la escena: la mayoría de equipos
 * de desarrollo reportan `prefers-reduced-motion` y sale el perfil plano, sin
 * canvas. Y el navegador headless por defecto no tiene GPU. Esto resuelve las
 * dos cosas: SwiftShader para tener WebGL por software y el interruptor de
 * efectos forzado por localStorage.
 *
 * Tres trampas, las tres costaron un intento cada una en su día:
 *
 *   · `networkidle` NUNCA resuelve — el requestAnimationFrame de la escena no
 *     para nunca, así que la red jamás queda ociosa. Hay que usar `load`.
 *   · `deviceScaleFactor: 2` hace que el raymarch por software tarde más que
 *     cualquier timeout razonable. Se queda en 1.
 *   · Sin esperar unos segundos se captura la transición de entrada, con
 *     Gargantúa todavía fuera de cuadro.
 *
 * Uso:
 *   npm run build && npx next start -p 3100
 *   node tools/shot.mjs <nombre> [url] [espera_ms]
 *
 * La carpeta de salida sale de SHOTS_DIR, y por defecto es .shots/ en la raíz
 * del repo (ignorada por git).
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const name = process.argv[2] ?? "shot";
const url = process.argv[3] ?? "http://localhost:3100/es";
const settle = Number(process.argv[4] ?? 15000);
const dir = resolve(process.env.SHOTS_DIR ?? ".shots");
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
page.on("pageerror", (e) => console.error("[page error]", e.message));
await page.addInitScript(() =>
  localStorage.setItem("jonas-orbit:efectos-forzados", "true"),
);
await page.goto(url, { waitUntil: "load", timeout: 120000 });
await page.waitForTimeout(settle);
await page.screenshot({ path: `${dir}/${name}.png`, timeout: 180000 });
await browser.close();
console.log(`${dir}/${name}.png`);
