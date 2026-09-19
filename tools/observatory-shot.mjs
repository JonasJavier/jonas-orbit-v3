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
 * ── El barrido de ciclo ─────────────────────────────────────────────────────
 *
 * `--ciclo=N` hace otra cosa distinta: en vez del recorrido, captura N
 * fotogramas repartidos por el ciclo de animación del espécimen, todos en la
 * pose del preset. Existe porque «cuánto ocupa el espécimen» NO es un número
 * en el Tesseracto — su silueta encoge y crece con la reconfiguración 4D, y
 * medida sobre una captura suelta la cifra sale entre el 57 % y el 70 % según
 * el instante que toque. Calibrar el encuadre contra un fotograma es calibrar
 * contra el azar.
 *
 * Uso:
 *   node tools/observatory-shot.mjs <carpeta-destino> [objeto] [url-base]
 *   node tools/observatory-shot.mjs <carpeta-destino> [objeto] --ciclo=12
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

const args = process.argv.slice(3);
const sueltos = args.filter((a) => !a.startsWith("--"));
const cicloFlag = args.find((a) => a.startsWith("--ciclo="));
const relojFlag = args.find((a) => a.startsWith("--reloj="));
/** Modo A/B/C de atmósfera: tres cargas, un reloj, cero diferencias más. */
const ATMOSFERA = args.includes("--atmosfera");
/** Modo órbita: sólo cámara. Ni un instrumento, ni un interruptor. */
const ORBITA = args.includes("--orbita");
/**
 * El instante que se clava. 16.5 s no es arbitrario: `lib/tesseract.ts` lo
 * documenta como una de las poses que el dueño marcó como BUENAS cuando se
 * calibró el ritmo de la figura.
 */
const RELOJ = relojFlag ? Number(relojFlag.split("=")[1]) : 16.5;
/** Fotogramas del barrido de ciclo, o 0 para el recorrido normal. */
const CICLO = cicloFlag ? Number(cicloFlag.split("=")[1]) : 0;

const OBJETO = sueltos[0] ?? "tesseracto";
const BASE = sueltos[1] ?? "http://localhost:3000";
const URL = `${BASE}/es/experimentos/observatorio/${OBJETO}`;

/** El circuito euleriano del Tesseracto recorre sus 32 aristas en 18 s, y la
 *  reconfiguración interior comparte ese reloj. Un ciclo = 18 s. */
const CICLO_MS = 18_000;

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
/**
 * Despliega la consola.
 *
 * Desde el pase de los dos modos el aparato arranca en `OBSERVAR` —sólo el
 * espécimen y la mano— y todos los instrumentos viven en `ESTUDIO`. La consola
 * plegada va `inert`, así que sin esta llamada los clics de abajo no fallan por
 * un selector equivocado: no llegan.
 */
const abrirEstudio = async () => {
  await page.getByRole("radio", { name: "Estudio", exact: true }).click();
  await page.waitForTimeout(500);
};
const paso = async (nombre, espera = 900) => {
  await page.waitForTimeout(espera);
  await page.screenshot({ path: join(OUT, `${nombre}.png`) });
};

if (ATMOSFERA) {
  /*
    Las tres capturas del pase de atmósfera, y la razón de que sean tres CARGAS
    y no tres pulsaciones.

    El requisito es «mismo frame, mismo instante y mismo estado de chrome». La
    tentación es quedarse en la misma página y conmutar en caliente, pero eso
    sólo garantiza el instante DENTRO de esa ejecución: el `elapsed` congelado
    es el que tocó ese día, así que las mismas tres capturas la semana que
    viene son otra pose y la comparación no se puede rehacer.

    El determinismo no sale de quedarse en la página, sale de NOMBRAR el
    instante. `sampleTesseract` es una función pura de los segundos —y el trazo
    euleriano también—, así que con `reloj` clavado el mismo número da los
    mismos dieciséis vértices bit a bit, hoy, la semana que viene y en otra
    máquina. Lo que no puede darlo es `elapsed`, que se acumula de deltas de
    rAF: su valor a los diez segundos depende de cuántos fotogramas haya
    conseguido la GPU.

    Todo lo demás se mantiene solo: nadie toca el arrastre ni la rueda, así que
    la cámara sale de la pose del preset en las tres; y nadie mueve el puntero,
    así que el modo cine ha atenuado igual en las tres.
  */
  const capas = [
    ["A-negro", { estrellas: false, halo: false, marcas: false }],
    ["B-estrellas", { estrellas: true, halo: false, marcas: false }],
    ["C-completa", { estrellas: true, halo: true, marcas: true }],
  ];

  for (const [nombre, atmosfera] of capas) {
    await page.evaluate(
      ([atmosfera, reloj]) => {
        localStorage.setItem(
          "jonas-orbit:banco-visual",
          JSON.stringify({ reloj, atmosfera }),
        );
      },
      [atmosfera, RELOJ],
    );
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector(".observatory__canvas", { timeout: 30_000 });
    await paso(nombre, 7_000);
  }

  await context.close();
  await browser.close();
  console.log(
    `Observatorio · ${OBJETO}: A/B/C de atmósfera en ${OUT}, reloj clavado en ${RELOJ} s`,
  );
  process.exit(0);
}

if (ORBITA) {
  /*
    El clip de órbita, y por qué no reutiliza el recorrido normal.

    Este modo se queda en `OBSERVAR` a propósito: no despliega la consola ni
    toca un instrumento, que es exactamente lo que necesita.

    Lo que hay que juzgar aquí es una sola pregunta: **¿el cielo se comporta
    como espacio o como un fondo pegado a la pantalla?** Eso no se ve en una
    imagen fija y se contamina con cualquier otra cosa que pase en el cuadro,
    así que este modo no toca un solo instrumento: ni DATOS, ni BLOOM, ni
    MATERIAL, ni el interruptor de movimiento. Sólo la mano sobre el lienzo.

    Dos tramos, y cada uno responde a una mitad de la pregunta:

     · ÓRBITA. La cámara rota alrededor del espécimen. La cáscara del cielo
       viaja con la cámara pero NO rota, así que el campo tiene que barrer el
       cuadro. Si se quedara quieto sería papel pintado.
     · ZOOM. La cámara se acerca y se aleja. Ahora la cáscara se traslada CON
       ella, así que el cielo no puede cambiar de escala ni moverse. Un fondo a
       distancia finita sí lo haría, y eso se lee como el interior de una sala.

    Las dos cosas juntas son la definición de «infinitamente lejos», y las dos
    se pueden medir sobre el contacto: `observatory-atmosfera.mjs --movimiento`.

    El contacto va en pasos PEQUEÑOS y regulares —40 px de arrastre, o sea 10°
    de cámara— porque la medida de barrido correlaciona dos fotogramas
    consecutivos: con saltos grandes el campo sale entero de cuadro entre uno y
    otro y no hay nada que correlacionar.
  */
  const CX = 720;
  const CY = 450;
  const PASOS = 10;
  const PASO_PX = 40;

  await page.waitForTimeout(2_000);

  // Tramo 1 · órbita en pasos medibles, con el contacto de fotogramas.
  await page.mouse.move(CX, CY);
  await page.mouse.down();
  for (let i = 0; i < PASOS; i++) {
    await paso(`orbita-${String(i).padStart(2, "0")}`, 260);
    await page.mouse.move(CX + (i + 1) * PASO_PX, CY);
  }
  await page.mouse.up();

  // Tramo 2 · órbita continua, sólo para el vídeo: lo que vería un visitante.
  await page.mouse.move(CX, CY);
  await page.mouse.down();
  for (let i = 1; i <= 90; i++) {
    await page.mouse.move(CX - i * 8, CY + Math.sin(i / 14) * 70);
    await page.waitForTimeout(28);
  }
  await page.mouse.up();
  await page.waitForTimeout(700);

  // Tramo 3 · zoom. El cielo NO puede seguirlo.
  await paso("zoom-00-antes", 400);
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, -240);
    await page.waitForTimeout(160);
  }
  await paso("zoom-01-cerca", 700);
  for (let i = 0; i < 10; i++) {
    await page.mouse.wheel(0, 240);
    await page.waitForTimeout(160);
  }
  await paso("zoom-02-lejos", 700);

  await context.close();
  await browser.close();
  const clip = readdirSync(OUT).find((name) => name.endsWith(".webm"));
  if (clip) renameSync(join(OUT, clip), join(OUT, "00-orbita.webm"));
  console.log(
    `Observatorio · ${OBJETO}: clip de órbita y ${PASOS} fotogramas de contacto en ${OUT}`,
  );
  process.exit(0);
}

if (CICLO > 0) {
  /*
    Barrido de ciclo: la misma pose de cámara, N instantes de la animación.

    Nada de tocar la cámara ni los instrumentos — lo único que cambia entre dos
    capturas es el reloj del espécimen, que es justo la variable que confunde
    cualquier medida de encuadre hecha sobre un fotograma suelto.
  */
  for (let i = 0; i < CICLO; i++) {
    await paso(`ciclo-${String(i).padStart(2, "0")}`, CICLO_MS / CICLO);
  }
  await context.close();
  await browser.close();
  console.log(
    `Observatorio · ${OBJETO}: ${CICLO} fotogramas de un ciclo en ${OUT}`,
  );
  process.exit(0);
}

// 1 · OBSERVAR en reposo. Sin tocar nada, el modo cine ya se ha llevado todo lo
//     que no dice dónde estás: queda el espécimen, su nombre y la salida.
await paso("01-limpia", 4_000);

// 2 · Cualquier gesto devuelve la identidad y la barra del aparato. Sigue sin
//     haber un solo instrumento a la vista, y ése es el modo por defecto.
await page.mouse.move(720, 450);
await paso("02-observar", 400);

// 3 · ESTUDIO: la consola se despliega bajo su alféizar.
await abrirEstudio();
await paso("03-estudio", 900);

// 4 · El arrastre: la cámara rodea al espécimen. Y como la luz es el origen del
//     mundo, rodearlo CAMBIA su iluminación — eso es lo que hay que juzgar.
//     Los dos diales de `LUZ` lo dicen moviéndose solos.
await page.mouse.move(720, 450);
await page.mouse.down();
for (let i = 1; i <= 24; i++) {
  await page.mouse.move(720 + i * 9, 450 + Math.sin(i / 5) * 24);
  await page.waitForTimeout(45);
}
await page.mouse.up();
await paso("04-arrastre", 600);

// 5 · Rueda.
await page.mouse.wheel(0, -420);
await paso("05-zoom");

/*
  6 y 7 · LUZ. El instrumento que sostiene la pose y barre la iluminación.

  Se mueve por TECLADO y no arrastrando el dial: un `<input type="range">` se
  recorre con las flechas grado a grado, así que la captura cae en un ángulo
  nombrable en vez de en el que toque el píxel donde se soltó el ratón. Y la
  prueba de que el mando hace lo que dice está en la fila de al lado: `AZ`, `EL`
  y `DIST` tienen que salir idénticos en las dos.
*/
const clave = page.getByRole("slider", { name: /clave/i });
await clave.focus();
for (let i = 0; i < 25; i++) await page.keyboard.press("ArrowRight");
await paso("06-luz-contraluz", 900);
for (let i = 0; i < 100; i++) await page.keyboard.press("ArrowLeft");
await paso("07-luz-frontal", 900);
await boton("Reajustar").click();
await page.waitForTimeout(600);

// 8 · DATOS. Las métricas viven aquí dentro y no en la vista normal.
await boton("Datos").click();
await paso("08-datos", 700);
await boton("Datos").click();

// 9 · BLOOM apagado: la prueba de oficio del contrato visual — un cuerpo que
//     pierde su identidad sin glow no está terminado.
await boton("Bloom").click();
await paso("09-sin-bloom");
await boton("Bloom").click();

// 10 · MATERIAL: el material sin su emisión, vía `uEmission`.
await boton("Material").click();
await paso("10-sin-emision");
await boton("Material").click();

// 11 · Reajustar: vuelta exacta a la pose del preset, luz incluida.
await boton("Reajustar").click();
await paso("11-reajustada", 1_200);

/*
  12 y 13 · El A/B de verdad, con el reloj congelado.

  Los pasos 5 y 9 de arriba NO sirven para comparar bloom encendido contra
  apagado: entre uno y otro el Tesseracto sigue reconfigurándose, así que son
  dos poses 4D distintas y la diferencia medida mezcla las dos cosas. Es
  exactamente la trampa que documenta `body-metrics.mjs` para un cuerpo que
  gira — «para aislar lo que decide el material, compara dos renders del MISMO
  instante».

  El Observatorio no tiene `--reloj` como `shot.mjs`, pero tiene algo mejor: el
  interruptor global de movimiento congela `elapsed` sin tocar la cámara ni la
  mano del visitante. Apagarlo deja las dos capturas en el mismo fotograma de
  la animación y con el mismo encuadre, que es la única forma de que la resta
  signifique algo.
*/
const movimiento = page.getByRole("button", { name: "Desactivar movimiento" });
if (await movimiento.count()) {
  await movimiento.first().click();
  await paso("12-ab-bloom", 1_400);
  await boton("Bloom").click();
  await paso("13-ab-sin-bloom", 900);
  await boton("Bloom").click();
}

// El vídeo sólo se escribe al cerrar el contexto, y con un nombre de hash.
await context.close();
await browser.close();

const video = readdirSync(OUT).find((name) => name.endsWith(".webm"));
if (video) renameSync(join(OUT, video), join(OUT, "00-interaccion.webm"));

console.log(`Observatorio · ${OBJETO}: trece capturas y un vídeo en ${OUT}`);
