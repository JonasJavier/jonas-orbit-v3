/**
 * El reparto del cielo: cuánto hay de negro, cuánto de estrella y cuánto de gas.
 *
 * Nació de un encargo que venía ya en porcentajes: «la versión ideal estaría
 * más cerca de 80 % negro / 12 % estrellas / 8 % nebulosa, y ahora mismo la
 * sensación se acerca más a 60/20/20». Discutir eso mirando no se puede, y
 * `star-streaks.mjs` no sirve: mide la FORMA de las manchas, no cuánto ocupa
 * cada cosa.
 *
 * Cuatro medidas. Las tres primeras separan fondo de estrella por la misma
 * vía: el velo de gas es de baja frecuencia por construcción y una estrella es
 * un pico de dos o tres píxeles, así que la mediana de un bloque de 16 px da
 * el NIVEL DE FONDO y lo que sobresale de él es estrella.
 *
 *   · negro    — % del área de cielo cuyo fondo no llega al umbral. Es el
 *                «espacio profundo» del encargo, y sube quitando gas, no
 *                quitando estrellas.
 *   · energía  — reparto de la luz total del cielo entre estrellas y fondo.
 *                Es la medida que responde al 12/8, porque la estrella ocupa
 *                poquísima área y aun así manda en la primera lectura.
 *   · tercios  — nivel medio del fondo en cada tercio del ancho, por canal.
 *                Los dos bancos de gas son de colores distintos y el encargo
 *                los trata por separado: el azul se conserva, el morado baja.
 *   · núcleos  — la media CRUDA de dos cajas que caen sobre la masa de cada
 *                banco. Es la que se compara entre pasadas: el tercio entero
 *                diluye el banco con cielo vacío y con el velo del disco, y
 *                una calibración leída ahí se equivoca por un factor de dos.
 *
 * Las máscaras son las de `star-streaks.mjs` —disco, seis cuerpos y las bandas
 * del HUD—, porque la pregunta es la misma: qué parte del cuadro es cielo.
 *
 *   node tools/sky-budget.mjs <captura> [más capturas...]
 */
import sharp from "sharp";
import { resolve } from "node:path";

const dir = resolve(process.env.SHOTS_DIR ?? ".shots");
const names = process.argv.slice(2);
if (names.length === 0) {
  console.error("uso: node tools/sky-budget.mjs <captura> [...]");
  process.exit(1);
}

const MASKS = [
  { x: 668, y: 448, rx: 430, ry: 210 }, // disco de acreción y su brillo
  { x: 430, y: 223, rx: 80, ry: 80 },   // miller
  { x: 854, y: 180, rx: 95, ry: 95 },   // tesseracto
  { x: 1093, y: 546, rx: 185, ry: 185 },// endurance
  { x: 222, y: 607, rx: 90, ry: 90 },   // edmunds
  { x: 627, y: 689, rx: 110, ry: 110 }, // ranger
];
const HUD_TOP = 56;
const HUD_BOTTOM = 780;
/** Lado del bloque cuya mediana define el nivel de fondo. Dieciséis píxeles son
 *  mucho más que una estrella y mucho menos que un banco de gas. */
const BLOCK = 16;
/** Sobre la mediana del bloque: por encima es estrella. */
const STAR_OVER = 6;
/** Por debajo de esto el fondo es negro de espacio profundo. */
const BLACK_FLOOR = 4;

function masked(x, y) {
  if (y < HUD_TOP || y > HUD_BOTTOM) return true;
  for (const m of MASKS) {
    const dx = (x - m.x) / m.rx;
    const dy = (y - m.y) / m.ry;
    if (dx * dx + dy * dy < 1) return true;
  }
  return false;
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1];
}

for (const name of names) {
  const file = name.endsWith(".png") ? name : `${name}.png`;
  const image = sharp(resolve(dir, file));
  const { width, height } = await image.metadata();
  const { data } = await image.raw().toBuffer({ resolveWithObject: true });
  const channels = data.length / (width * height);

  const luma = new Float32Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    const o = i * channels;
    luma[i] = 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2];
  }

  // Nivel de fondo por bloque. La mediana ignora los picos por construcción.
  const cols = Math.ceil(width / BLOCK);
  const rows = Math.ceil(height / BLOCK);
  const level = new Float32Array(cols * rows);
  for (let by = 0; by < rows; by += 1) {
    for (let bx = 0; bx < cols; bx += 1) {
      const sample = [];
      for (let y = by * BLOCK; y < Math.min(height, (by + 1) * BLOCK); y += 1) {
        for (let x = bx * BLOCK; x < Math.min(width, (bx + 1) * BLOCK); x += 1) {
          if (!masked(x, y)) sample.push(luma[y * width + x]);
        }
      }
      level[by * cols + bx] = median(sample);
    }
  }

  let sky = 0;
  let black = 0;
  let starEnergy = 0;
  let backEnergy = 0;
  let starArea = 0;
  const banks = [
    { name: "izq", from: 0, to: width / 3, r: 0, g: 0, b: 0, n: 0 },
    { name: "cen", from: width / 3, to: (2 * width) / 3, r: 0, g: 0, b: 0, n: 0 },
    { name: "der", from: (2 * width) / 3, to: width, r: 0, g: 0, b: 0, n: 0 },
  ];
  /* Y los dos NÚCLEOS de gas, que es lo que de verdad se compara entre pasadas.
     El tercio entero diluye el banco con cielo vacío y con el velo del disco;
     estas dos cajas caen sobre la masa de cada uno. Son del encuadre de
     1440×860 y no se enmascaran: dentro no hay ni disco ni cuerpo. */
  const CORES = {
    azul: { x0: 0, y0: 60, x1: 320, y1: 320 },
    morado: { x0: 1240, y0: 90, x1: 1440, y1: 770 },
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (masked(x, y)) continue;
      const i = y * width + x;
      const back = level[((y / BLOCK) | 0) * cols + ((x / BLOCK) | 0)];
      sky += 1;
      if (back < BLACK_FLOOR) black += 1;
      const over = luma[i] - back;
      if (over > STAR_OVER) {
        starEnergy += over;
        starArea += 1;
        backEnergy += back;
      } else {
        backEnergy += luma[i];
      }
      const o = i * channels;
      for (const bank of banks) {
        if (x >= bank.from && x < bank.to && over <= STAR_OVER) {
          bank.r += data[o];
          bank.g += data[o + 1];
          bank.b += data[o + 2];
          bank.n += 1;
        }
      }
    }
  }

  const total = starEnergy + backEnergy || 1;
  console.log(`${file} — ${sky} px de cielo`);
  console.log(
    `  negro (fondo < ${BLACK_FLOOR}): ${((black / sky) * 100).toFixed(1)} %` +
      `   ·   área de estrella: ${((starArea / sky) * 100).toFixed(2)} %`,
  );
  console.log(
    `  energía: estrellas ${((starEnergy / total) * 100).toFixed(1)} %` +
      `   ·   fondo (gas + velo) ${((backEnergy / total) * 100).toFixed(1)} %`,
  );
  for (const bank of banks) {
    const n = bank.n || 1;
    console.log(
      `  tercio ${bank.name}: R ${(bank.r / n).toFixed(2)}` +
        `  G ${(bank.g / n).toFixed(2)}  B ${(bank.b / n).toFixed(2)}` +
        `  (luma ${((0.2126 * bank.r + 0.7152 * bank.g + 0.0722 * bank.b) / n).toFixed(2)})`,
    );
  }
  for (const [name, box] of Object.entries(CORES)) {
    if (box.x1 > width || box.y1 > height) continue;
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let y = box.y0; y < box.y1; y += 1) {
      for (let x = box.x0; x < box.x1; x += 1) {
        const o = (y * width + x) * channels;
        r += data[o];
        g += data[o + 1];
        b += data[o + 2];
        n += 1;
      }
    }
    n = n || 1;
    console.log(
      `  núcleo ${name}: R ${(r / n).toFixed(2)}  G ${(g / n).toFixed(2)}` +
        `  B ${(b / n).toFixed(2)}` +
        `  (luma ${((0.2126 * r + 0.7152 * g + 0.0722 * b) / n).toFixed(3)})`,
    );
  }
}
