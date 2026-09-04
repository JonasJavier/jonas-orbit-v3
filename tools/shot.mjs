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
 *   node tools/shot.mjs <nombre> [url] [espera_ms] [--sin-glow] [--sin-rotulos]
 *
 * `--sin-glow` es el bloom-off test del contrato visual: apaga el bloom y los
 * emisivos de los cuerpos para juzgar silueta, volumen y material sin que el
 * halo tape una geometría floja (ver lib/visual-bench.ts). `--sin-rotulos`
 * retira el raíl y los nombres, que es la única forma de saber si un cuerpo se
 * reconoce sin que se lo digan.
 *
 * La carpeta de salida sale de SHOTS_DIR, y por defecto es .shots/ en la raíz
 * del repo (ignorada por git).
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith("--")));
const positional = args.filter((arg) => !arg.startsWith("--"));

const name = positional[0] ?? "shot";
const url = positional[1] ?? "http://localhost:3100/es";
const settle = Number(positional[2] ?? 15000);
const withoutGlow = flags.has("--sin-glow");
const withoutLabels = flags.has("--sin-rotulos");
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
await page.addInitScript(
  ({ glow }) => {
    localStorage.setItem("jonas-orbit:efectos-forzados", "true");
    // La escena lee el banco UNA vez al montarse, así que tiene que estar
    // escrito antes de que corra un solo script de la página.
    if (!glow) {
      localStorage.setItem(
        "jonas-orbit:banco-visual",
        JSON.stringify({ bloom: 0, emision: 0 }),
      );
    }
  },
  { glow: !withoutGlow },
);
await page.goto(url, { waitUntil: "load", timeout: 120000 });
if (withoutLabels) {
  // Sólo CSS, y sólo dentro de esta pestaña: el DOM del producto no se entera.
  await page.addStyleTag({
    content: ".system-map__label, .nav-rail { visibility: hidden !important; }",
  });
}
await page.waitForTimeout(settle);
await page.screenshot({ path: `${dir}/${name}.png`, timeout: 180000 });
await browser.close();
console.log(`${dir}/${name}.png`);
