/**
 * Cuánto del cuadro ocupa REALMENTE el espécimen, leído de la captura.
 *
 * Existe por una discrepancia concreta: el driver del Observatorio calcula su
 * distancia para que el espécimen llene el 78 % del alto, y sobre la captura el
 * Tesseracto ocupaba el 60 %. Ninguno de los dos números estaba mal — medían
 * cosas distintas.
 *
 * La fórmula del encuadre parte de `body.radius`, que es el radio de la ESFERA
 * ENVOLVENTE. Un 4-cubo en alambre toca esa esfera en ocho vértices y en ningún
 * sitio más, así que su silueta proyectada es bastante menor que el disco de la
 * esfera, y además ENCOGE Y CRECE con la pose 4D. «El 78 % de la envolvente» y
 * «el 78 % de lo que se ve» no son la misma frase.
 *
 * De ahí este script: la constante se calibra contra lo que mide el ojo, que en
 * un repositorio es lo que mide un PNG.
 *
 * ── Cómo separa el espécimen del cromo ──────────────────────────────────────
 *
 * No por márgenes fijos, que se rompen en cuanto la interfaz se mueve. Busca la
 * TIRA CONTIGUA más larga de filas encendidas, tolerando huecos cortos: el
 * espécimen es un único blob vertical y los rótulos son bandas sueltas separadas
 * por negro. Aun así conviene medir sobre una captura en reposo, donde el modo
 * cine ya ha atenuado la instrumentación.
 *
 * Uso:
 *   node tools/observatory-fill.mjs <captura...> [--umbral=24] [--hueco=6]
 *
 * Ejemplo:
 *   node tools/observatory-fill.mjs obs-antes/01-limpia obs-final/01-limpia
 */

import sharp from "sharp";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(process.env.SHOTS_DIR ?? ".shots");

const args = process.argv.slice(2);
const flag = (nombre, porDefecto) => {
  const encontrado = args.find((a) => a.startsWith(`--${nombre}=`));
  return encontrado ? Number(encontrado.split("=")[1]) : porDefecto;
};

/** Por debajo de esto es fondo. El negro del Observatorio es 0 de verdad. */
const UMBRAL = flag("umbral", 24);
/** Filas apagadas que no rompen la tira: un alambre tiene huecos. */
const HUECO = flag("hueco", 6);
/** Píxeles encendidos mínimos para llamar «encendida» a una fila. */
const MINIMO = flag("minimo", 2);

const nombres = args.filter((a) => !a.startsWith("--"));
if (nombres.length === 0) {
  console.error(
    "Falta al menos una captura.\n" +
      "  node tools/observatory-fill.mjs <captura...> [--umbral=24]",
  );
  process.exit(1);
}

/** La tira contigua más larga de índices encendidos, tolerando `HUECO`. */
function tiraMasLarga(encendidas) {
  let mejor = null;
  let inicio = -1;
  let fin = -1;
  for (let i = 0; i < encendidas.length; i++) {
    if (encendidas[i]) {
      if (inicio < 0) inicio = i;
      fin = i;
    } else if (inicio >= 0 && i - fin > HUECO) {
      if (!mejor || fin - inicio > mejor.fin - mejor.inicio) {
        mejor = { inicio, fin };
      }
      inicio = -1;
    }
  }
  if (inicio >= 0 && (!mejor || fin - inicio > mejor.fin - mejor.inicio)) {
    mejor = { inicio, fin };
  }
  return mejor;
}

for (const nombre of nombres) {
  const ruta = resolve(dir, `${nombre}.png`);
  if (!existsSync(ruta)) {
    console.error(`No existe ${ruta}`);
    process.exit(1);
  }

  const { data, info } = await sharp(ruta)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const filaCuenta = new Int32Array(height);
  const columnaCuenta = new Int32Array(width);
  let luz = 0;
  /*
    El NÚCLEO BLANCO es la cifra del bloom, y no el total de luz.

    «Una lamparita pegada al Tesseracto» no es un problema de cuánta luz hay en
    el cuadro —el trazo entero aporta más que la punta— sino de cuánta área
    llega a blanco saturado. Bajar la fuerza del bloom un 57 % mueve el total
    apenas un 13 %, porque casi todo el total lo pone la figura, que no bloomea.
    Lo que tiene que desplomarse es esto.
  */
  let blanco = 0;
  let casiBlanco = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      // Rec. 601, la misma que usan disk-metrics y body-metrics.
      const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (l > UMBRAL) {
        filaCuenta[y]++;
        columnaCuenta[x]++;
        luz += l;
      }
      if (l >= 250) blanco++;
      if (l >= 200) casiBlanco++;
    }
  }

  const bandaY = tiraMasLarga(Array.from(filaCuenta, (c) => c >= MINIMO));
  if (!bandaY) {
    console.log(`${nombre}: nada por encima de ${UMBRAL}`);
    continue;
  }

  // Las columnas se recuentan DENTRO de la banda vertical del espécimen, para
  // que un rótulo a media altura no ensanche la medida.
  const columnaEnBanda = new Int32Array(width);
  for (let y = bandaY.inicio; y <= bandaY.fin; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (l > UMBRAL) columnaEnBanda[x]++;
    }
  }
  const bandaX = tiraMasLarga(Array.from(columnaEnBanda, (c) => c >= MINIMO));

  const alto = bandaY.fin - bandaY.inicio + 1;
  const ancho = bandaX ? bandaX.fin - bandaX.inicio + 1 : 0;
  const centroY = (bandaY.inicio + bandaY.fin) / 2;
  const centroX = bandaX ? (bandaX.inicio + bandaX.fin) / 2 : 0;

  const pct = (v, total) => `${((v / total) * 100).toFixed(1)} %`;

  console.log(`\n── ${nombre} · ${width}×${height} ─────────────────────────`);
  console.log(`  alto ocupado    ${alto} px   ${pct(alto, height)} del cuadro`);
  console.log(`  ancho ocupado   ${ancho} px   ${pct(ancho, width)} del cuadro`);
  console.log(
    `  centro          ${centroX.toFixed(0)}, ${centroY.toFixed(0)}` +
      `   (cuadro: ${width / 2}, ${height / 2})`,
  );
  console.log(
    `  desvío vertical ${(centroY - height / 2).toFixed(0)} px` +
      `   ${pct(Math.abs(centroY - height / 2), height)} del alto`,
  );
  console.log(`  luz total       ${(luz / 1e6).toFixed(2)} Mlum`);
  console.log(
    `  núcleo ≥250     ${blanco} px` +
      `        ≥200  ${casiBlanco} px   ← la cifra del bloom`,
  );
}

console.log(
  "\nEl alto ocupado es la cifra de encuadre: la distancia de cámara va como" +
    "\n1/ocupación, así que para pasar de A a B basta multiplicar la constante" +
    "\npor B/A. El núcleo ≥250 es la del bloom: es el área que llega a blanco" +
    "\nsaturado, o sea el tamaño aparente de la «lamparita».\n",
);
