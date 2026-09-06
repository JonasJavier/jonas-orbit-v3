/**
 * Reparto de valores DENTRO del disco de un cuerpo, para discutir su material
 * con números en vez de con adjetivos.
 *
 * `disk-metrics.mjs` mide la banda de Gargantúa y `star-streaks.mjs` el cielo;
 * faltaba lo mismo para los cinco destinos secundarios, que es donde vive todo
 * el trabajo de `docs/design/world-visual-language.md`. La discusión típica de
 * ese documento —«el agua se hunde y el camino de luz se separa de ella»— es
 * exactamente una afirmación sobre el histograma, y hasta ahora se comprobaba
 * a ojo entre dos capturas.
 *
 * Recorta el círculo del cuerpo (con un margen de 1,5 px para no comerse el
 * antialias del borde contra el cielo) y saca de él:
 *
 *   · MEDIA y percentiles. El par que importa casi siempre es media contra
 *     p99.5: bajar la media subiendo el pico es «repartir el valor», que es el
 *     movimiento que pide la fase 1 del contrato visual. Bajar las dos es
 *     simplemente apagar el cuerpo, y no es lo mismo.
 *   · CROMA medio (saturación HSV). Sube cuando un mundo se va al color y baja
 *     cuando se va al valor. Un océano que se lee como océano tiene menos croma
 *     que uno que se lee como «bola azul».
 *   · HONDO y CLARO: qué fracción del disco cae por debajo de 25 y por encima
 *     de 140. Es la cifra de JERARQUÍA — cuánta superficie está de verdad en
 *     penumbra y cuánta compite con el reflejo principal.
 *
 * El centro y el radio no se adivinan: los imprime `composition.mjs`, que los
 * lee de las variables CSS que escribe la propia escena.
 *
 *   node tools/composition.mjs
 *   node tools/body-metrics.mjs --centro=429.8,222.6 --radio=46.6 antes despues
 */
import sharp from "sharp";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const flag = (name) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : null;
};
const centre = flag("centro");
const radius = Number(flag("radio"));
if (!centre || !Number.isFinite(radius)) {
  console.error("uso: node tools/body-metrics.mjs --centro=x,y --radio=r <captura...>");
  process.exit(1);
}
const [cx, cy] = centre.split(",").map(Number);
if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
  console.error(`centro ilegible: ${centre}`);
  process.exit(1);
}

const dir = resolve(process.env.SHOTS_DIR ?? ".shots");
const shots = args.filter((a) => !a.startsWith("--"));
if (shots.length === 0) {
  console.error("hace falta al menos una captura");
  process.exit(1);
}

async function measure(name) {
  const file = resolve(dir, `${name}.png`);
  if (!existsSync(file)) throw new Error(`no existe ${file}`);
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const inner = radius - 1.5;
  const lum = [];
  let chroma = 0;
  for (let y = Math.max(0, Math.floor(cy - radius)); y <= Math.min(info.height - 1, Math.ceil(cy + radius)); y++) {
    for (let x = Math.max(0, Math.floor(cx - radius)); x <= Math.min(info.width - 1, Math.ceil(cx + radius)); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > inner * inner) continue;
      const i = (info.width * y + x) * info.channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      lum.push(0.2126 * r + 0.7152 * g + 0.0722 * b);
      const max = Math.max(r, g, b);
      chroma += max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
    }
  }
  lum.sort((a, b) => a - b);
  const at = (p) => lum[Math.min(lum.length - 1, Math.round(p * (lum.length - 1)))];
  const share = (test) => +((lum.filter(test).length / lum.length) * 100).toFixed(1);
  return {
    captura: name,
    px: lum.length,
    media: +(lum.reduce((a, b) => a + b, 0) / lum.length).toFixed(1),
    p05: Math.round(at(0.05)),
    p50: Math.round(at(0.5)),
    p95: Math.round(at(0.95)),
    "p99.5": Math.round(at(0.995)),
    max: Math.round(at(1)),
    croma: +(chroma / lum.length).toFixed(3),
    "hondo<25": share((v) => v < 25),
    "claro>140": share((v) => v > 140),
  };
}

/**
 * Y cuánto se MUEVE la superficie entre dos instantes.
 *
 * Existe porque «el mar se mueve» es una afirmación que una captura no puede
 * sostener y dos sí. Compara píxel a píxel dentro del mismo disco y da la
 * diferencia media de luminancia y qué fracción del cuerpo cambia más de ocho
 * niveles — por debajo de eso el ojo no lo ve y el ruido de captura del runtime
 * software ya lo explica.
 *
 * Captura los dos instantes con el reloj clavado y sin acumulación temporal, o
 * estarás midiendo el promediado de ocho muestras en vez del shader:
 *
 *   node tools/shot.mjs t4 http://localhost:3100/es 13000 --reloj=4 --sin-acumular
 *   node tools/shot.mjs t10 http://localhost:3100/es 13000 --reloj=10 --sin-acumular
 *   node tools/body-metrics.mjs --centro=429.8,222.6 --radio=46.6 --difiere t4 t10
 *
 * AVISO, y costó dos pasadas descubrirlo: sobre un cuerpo que GIRA sobre su eje
 * —Miller, Edmunds y la Endurance— esta cifra NO mide la animación del
 * material. Está medido: con todo el campo de oleaje de Miller congelado, la
 * diferencia entre el segundo 4 y el 10 seguía siendo 11.7 de media y el 46 %
 * del disco. La rotación rígida cambia todos los píxeles y se come cualquier
 * señal del shader.
 *
 * Para aislar lo que decide el material hay que comparar DOS RENDERS DEL MISMO
 * INSTANTE que difieran sólo en el término que se investiga —la misma pose, la
 * misma rotación— y no dos instantes distintos.
 */
async function difference(a, b) {
  const read = async (name) =>
    sharp(resolve(dir, `${name}.png`)).raw().toBuffer({ resolveWithObject: true });
  const [first, second] = await Promise.all([read(a), read(b)]);
  const inner = radius - 1.5;
  let sum = 0;
  let moved = 0;
  let count = 0;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > inner * inner) continue;
      const i = (first.info.width * y + x) * first.info.channels;
      const j = (second.info.width * y + x) * second.info.channels;
      const la =
        0.2126 * first.data[i] + 0.7152 * first.data[i + 1] + 0.0722 * first.data[i + 2];
      const lb =
        0.2126 * second.data[j] + 0.7152 * second.data[j + 1] + 0.0722 * second.data[j + 2];
      const delta = Math.abs(la - lb);
      sum += delta;
      if (delta > 8) moved++;
      count++;
    }
  }
  return {
    par: `${a} → ${b}`,
    "|Δ| medio": +(sum / count).toFixed(2),
    "superficie que cambia >8": +((moved / count) * 100).toFixed(1),
  };
}

if (args.includes("--difiere")) {
  if (shots.length !== 2) {
    console.error("--difiere necesita exactamente dos capturas");
    process.exit(1);
  }
  console.table([await difference(shots[0], shots[1])]);
} else {
  const rows = [];
  for (const shot of shots) rows.push(await measure(shot));
  console.table(rows);
}
