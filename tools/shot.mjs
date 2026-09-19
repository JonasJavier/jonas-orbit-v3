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
 * `--reloj=<segundos>` clava el reloj de la escena en un instante. Existe porque
 * el disco de Gargantúa ENVEJECE —su enrollado depende del tiempo transcurrido—
 * y su fallo tardaba minutos en salir, así que una captura del arranque no dice
 * nada sobre las seis horas. Con esto, «a las seis horas» son quince segundos.
 * `--sin-acumular` apaga la acumulación temporal, para separar lo que dibuja el
 * shader en UN cuadro de lo que deposita el promediado de ocho muestras encima.
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
const withoutAccumulation = flags.has("--sin-acumular");
const clockFlag = [...flags].find((f) => f.startsWith("--reloj="));
const clock = clockFlag ? Number(clockFlag.slice("--reloj=".length)) : null;
if (clockFlag && !Number.isFinite(clock)) {
  console.error(`reloj ilegible: ${clockFlag}`);
  process.exit(1);
}
const withoutLabels = flags.has("--sin-rotulos");
const flat = flags.has("--flat");
const dimension = (name, fallback) => {
  const option = [...flags].find((flag) => flag.startsWith(`--${name}=`));
  const value = option ? Number(option.split("=")[1]) : fallback;
  if (!Number.isInteger(value) || value < 240 || value > 4096) throw new Error(`Invalid ${name}`);
  return value;
};
const dir = resolve(process.env.SHOTS_DIR ?? ".shots");
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const context = await browser.newContext({
  viewport: { width: dimension("width", 1440), height: dimension("height", 860) },
  deviceScaleFactor: 1,
  reducedMotion: flat ? "reduce" : "no-preference",
});
const page = await context.newPage();
page.on("pageerror", (e) => console.error("[page error]", e.message));
await page.addInitScript(
  ({ glow, reloj, acumular, flat }) => {
    /*
      El interruptor global, encendido a propósito.

      La clave es `reducir-efectos = "false"`, que es lo que lee
      `useForcedEffects()`. Antes aquí se escribía `efectos-forzados`, una clave
      que el pase de movimiento unificado (2026-09-13) retiró y que hoy no lee
      NADIE: desde entonces esta herramienta capturaba el perfil plano —el atlas
      en SVG— en vez de la escena, y no se notó porque la imagen sigue saliendo.
      Una captura del cuerpo equivocado no es una captura mala, es una medición
      de otra cosa.
    */
    if (!flat) localStorage.setItem("jonas-orbit:reducir-efectos", "false");
    // La escena lee el banco UNA vez al montarse, así que tiene que estar
    // escrito antes de que corra un solo script de la página.
    const banco = {};
    if (!glow) {
      banco.bloom = 0;
      banco.emision = 0;
    }
    if (reloj !== null) banco.reloj = reloj;
    if (!acumular) banco.acumular = false;
    if (Object.keys(banco).length) {
      localStorage.setItem("jonas-orbit:banco-visual", JSON.stringify(banco));
    }
  },
  { glow: !withoutGlow, reloj: clock, acumular: !withoutAccumulation, flat },
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
