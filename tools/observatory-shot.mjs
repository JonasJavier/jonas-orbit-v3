/**
 * Recorrido capturado del Observatorio, con vídeo.
 *
 * `shot.mjs` captura el hero: una pose fija de una escena que nadie toca. El
 * Observatorio es lo contrario —un instrumento que se manipula— y por eso no se
 * puede juzgar con una imagen suelta. Esto recorre la sesión entera: reposo,
 * instrumentación, arrastre, zoom, los tres instrumentos de INSPECCIONAR y la
 * vuelta al preset; deja ocho PNG numerados y un `.webm` de todo el recorrido.
 *
 * El vídeo no es un adorno: la mitad de las decisiones del pase visual —si el
 * gesto lleva el espécimen con la mano, si el modo cine molesta, si la figura
 * tiene ritmo— no existen en una captura estática.
 *
 * Cuatro cosas que conviene saber, tres heredadas de `shot.mjs`:
 *
 *   · SwiftShader para tener WebGL por software, y `reducir-efectos: false` en
 *     localStorage porque casi todo equipo de desarrollo reporta
 *     `prefers-reduced-motion` y el interruptor global lo respeta.
 *   · `deviceScaleFactor` se queda en 1: a 2, el Tesseracto regenera su
 *     geometría cada fotograma por software y no converge en ningún timeout.
 *   · Aquí `networkidle` SÍ resuelve, al contrario que en el hero. El bucle del
 *     Observatorio es bajo demanda: en reposo deja de dibujar, así que la red
 *     queda ociosa de verdad. Es el primer sitio del proyecto donde se nota esa
 *     diferencia de arquitectura.
 *   · Los botones se buscan con `exact: true`. Sin él, «Datos» casa también con
 *     cualquier rótulo que lo contenga — la misma trampa que costó una entrega
 *     en los tests de la Ranger.
 *
 * Uso:
 *   node tools/observatory-shot.mjs <carpeta-destino> [objeto] [url-base]
 *
 * Ejemplo:
 *   npm run dev
 *   node tools/observatory-shot.mjs .shots/observatorio tesseracto
 */

import { chromium } from "@playwright/test";
import { mkdirSync, readdirSync, renameSync } from "node:fs";
import { join } from "node:path";

const OUT = process.argv[2];
if (!OUT) {
  console.error(
    "Falta la carpeta de destino.\n" +
      "  node tools/observatory-shot.mjs <carpeta> [objeto] [url-base]",
  );
  process.exit(1);
}

const OBJETO = process.argv[3] ?? "tesseracto";
const BASE = process.argv[4] ?? "http://localhost:3000";
const URL = `${BASE}/es/experimentos/observatorio/${OBJETO}`;

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--use-gl=angle",
  ],
});

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  reducedMotion: "no-preference",
  recordVideo: { dir: OUT, size: { width: 1440, height: 900 } },
});

const page = await context.newPage();
await page.addInitScript(() => {
  localStorage.setItem("jonas-orbit:reducir-efectos", "false");
});

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector(".observatory__canvas", { timeout: 30_000 });
// Margen de asentamiento: por software, los primeros fotogramas del Tesseracto
// llegan a cuentagotas y la figura todavía no tiene su pose.
await page.waitForTimeout(6_000);

const boton = (nombre) => page.getByRole("button", { name: nombre, exact: true });
const paso = async (nombre, espera = 900) => {
  await page.waitForTimeout(espera);
  await page.screenshot({ path: join(OUT, `${nombre}.png`) });
};

// 1 · Reposo. Sin tocar nada, el modo cine ya ha atenuado la instrumentación:
//     es la vista que debería sentirse como un laboratorio y no como un visor.
await paso("01-limpia", 4_000);

// 2 · Cualquier gesto devuelve el cromo.
await page.mouse.move(720, 450);
await paso("02-instrumentacion", 400);

// 3 · El arrastre: la cámara rodea al espécimen. Y como la luz es el origen del
//     mundo, rodearlo CAMBIA su iluminación — eso es lo que hay que juzgar.
await page.mouse.move(720, 450);
await page.mouse.down();
for (let i = 1; i <= 24; i++) {
  await page.mouse.move(720 + i * 9, 450 + Math.sin(i / 5) * 24);
  await page.waitForTimeout(45);
}
await page.mouse.up();
await paso("03-arrastre", 600);

// 4 · Rueda.
await page.mouse.wheel(0, -420);
await paso("04-zoom");

// 5 · DATOS. Las métricas viven aquí dentro y no en la vista normal.
await boton("Datos").click();
await paso("05-datos", 700);
await boton("Datos").click();

// 6 · BLOOM apagado: la prueba de oficio del contrato visual — un cuerpo que
//     pierde su identidad sin glow no está terminado.
await boton("Bloom").click();
await paso("06-sin-bloom");
await boton("Bloom").click();

// 7 · MATERIAL: el material sin su emisión, vía `uEmission`.
await boton("Material").click();
await paso("07-sin-emision");
await boton("Material").click();

// 8 · Reajustar: vuelta exacta a la pose del preset.
await boton("Reajustar").click();
await paso("08-reajustada", 1_200);

// El vídeo sólo se escribe al cerrar el contexto, y con un nombre de hash.
await context.close();
await browser.close();

const video = readdirSync(OUT).find((name) => name.endsWith(".webm"));
if (video) renameSync(join(OUT, video), join(OUT, "00-interaccion.webm"));

console.log(`Observatorio · ${OBJETO}: ocho capturas y un vídeo en ${OUT}`);
