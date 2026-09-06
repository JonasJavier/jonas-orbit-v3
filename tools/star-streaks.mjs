/**
 * Cuánto se ESTIRAN las estrellas del fondo, y a qué distancia del agujero.
 *
 * Nació de una discusión que no se podía cerrar mirando: el dueño veía «trazos
 * gravitacionales por toda la pantalla» y la aritmética del lente decía que en
 * la periferia la magnificación tangencial no llega al 15 %. Una de las dos
 * lecturas estaba mal, y la única forma de saber cuál era medir los blobs del
 * render en vez de discutirlos.
 *
 * Segmenta el cielo por umbral, descarta lo que no es estrella —el disco, los
 * seis cuerpos, el HUD— y saca de cada mancha la razón entre sus dos ejes
 * principales (momentos de segundo orden). Después las agrupa por anillos de
 * distancia a Gargantúa, que es la variable que importa: la dirección de arte
 * pide puntos fuera y estiramiento dentro.
 *
 *   node tools/star-streaks.mjs <captura> [más capturas...]
 *
 * La columna que se compara entre pasadas es ENERGÍA: la suma de brillo de las
 * manchas alargadas del anillo. El recuento solo no sirve —una estrella que se
 * acorta sigue contando— y el aspecto medio tampoco, porque no dice cuánto
 * ocupa en pantalla lo que se está viendo.
 */
import sharp from "sharp";
import { resolve } from "node:path";

const dir = resolve(process.env.SHOTS_DIR ?? ".shots");
const names = process.argv.slice(2);
if (names.length === 0) {
  console.error("uso: node tools/star-streaks.mjs <captura> [...]");
  process.exit(1);
}

/* Centro y radio de la sombra en el encuadre de 1440×860 que captura shot.mjs.
   Salen de tools/composition.mjs; aquí solo hacen falta para ordenar por
   anillos y para tapar el disco, así que no se leen de la escena. */
const CENTRE = { x: 668, y: 448 };
/* Máscaras: lo que NO es cielo. Elipses generosas alrededor del disco y de los
   seis destinos, más las bandas del HUD arriba y abajo. Cualquier cosa que
   toque una máscara se descarta entera. */
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
const THRESHOLD = 18; // sobre 255, luma
const RINGS = [0, 250, 400, 550, 1200];

function masked(x, y) {
  if (y < HUD_TOP || y > HUD_BOTTOM) return true;
  for (const m of MASKS) {
    const dx = (x - m.x) / m.rx;
    const dy = (y - m.y) / m.ry;
    if (dx * dx + dy * dy < 1) return true;
  }
  return false;
}

for (const name of names) {
  const file = resolve(dir, name.endsWith(".png") ? name : `${name}.png`);
  const { data, info } = await sharp(file)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  const seen = new Uint8Array(width * height);
  const blobs = [];
  const stack = new Int32Array(width * height);

  for (let start = 0; start < width * height; start += 1) {
    if (seen[start] || data[start] < THRESHOLD) continue;
    let top = 0;
    stack[top++] = start;
    seen[start] = 1;
    let count = 0;
    let energy = 0;
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    let touched = false;
    const points = [];
    while (top > 0) {
      const index = stack[--top];
      const x = index % width;
      const y = (index / width) | 0;
      if (masked(x, y)) touched = true;
      points.push(index);
      count += 1;
      energy += data[index];
      sx += x;
      sy += y;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const next = ny * width + nx;
        if (!seen[next] && data[next] >= THRESHOLD) {
          seen[next] = 1;
          stack[top++] = next;
        }
      }
    }
    // Manchas enormes son disco o cuerpo mal enmascarado; de 3 px no se puede
    // sacar un eje principal.
    if (touched || count < 6 || count > 1400) continue;
    const mx = sx / count;
    const my = sy / count;
    for (const index of points) {
      const dx = (index % width) - mx;
      const dy = ((index / width) | 0) - my;
      sxx += dx * dx;
      syy += dy * dy;
      sxy += dx * dy;
    }
    sxx /= count;
    syy /= count;
    sxy /= count;
    const trace = sxx + syy;
    const det = sxx * syy - sxy * sxy;
    const root = Math.sqrt(Math.max((trace * trace) / 4 - det, 0));
    /* Regularización de un doceavo, que es la varianza de la cuantización a
       píxel. Sin ella una mancha de un píxel de ancho da eje menor cero y el
       aspecto sale en cientos: el promedio del anillo dejaba de significar
       nada y el ruido de fondo mandaba sobre la medida. */
    const major = trace / 2 + root + 1 / 12;
    const minor = trace / 2 - root + 1 / 12;
    blobs.push({
      aspect: Math.sqrt(major / minor),
      length: Math.sqrt(major) * 2,
      energy,
      distance: Math.hypot(mx - CENTRE.x, my - CENTRE.y),
    });
  }

  /* TRAZO es lo que el ojo llama trazo: alargado Y largo. Una mancha de tres
     píxeles con aspecto 2 es un punto un poco oval y no la ve nadie; el
     recuento de «alargadas» a secas estaba dominado por ellas y por el ruido de
     cuantización, así que se movía menos que la pantalla. */
  const isStreak = (b) => b.aspect > 1.7 && b.length >= 5;
  console.log(`
${name} — ${blobs.length} estrellas`);
  console.log("anillo (px)      n   aspecto   largo px   trazos   energía trazo");
  for (let ring = 0; ring < RINGS.length - 1; ring += 1) {
    const inner = RINGS[ring];
    const outer = RINGS[ring + 1];
    const inside = blobs.filter((b) => b.distance >= inner && b.distance < outer);
    if (inside.length === 0) continue;
    const aspect =
      inside.reduce((sum, b) => sum + b.aspect, 0) / inside.length;
    const length = inside.reduce((sum, b) => sum + b.length, 0) / inside.length;
    const streaks = inside.filter(isStreak);
    const energy = streaks.reduce((sum, b) => sum + b.energy, 0);
    console.log(
      `${String(inner).padStart(5)}–${String(outer).padEnd(6)} ${String(inside.length).padStart(5)}   ${aspect.toFixed(2).padStart(6)}   ${length.toFixed(1).padStart(7)}   ${String(streaks.length).padStart(6)}   ${(energy / 1000).toFixed(1).padStart(11)} k`,
    );
  }
  /* Y la medida sin umbral, que es la que no se puede engañar: brillo TOTAL
     del cielo por anillo, contando sólo píxeles no enmascarados. Un umbral
     puede convertir una mancha redonda que se apaga en un núcleo alargado y
     contar MÁS trazo donde hay menos luz; esto no. */
  const ringLight = RINGS.slice(0, -1).map(() => ({ sum: 0, pixels: 0 }));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (masked(x, y)) continue;
      const distance = Math.hypot(x - CENTRE.x, y - CENTRE.y);
      for (let ring = 0; ring < RINGS.length - 1; ring += 1) {
        if (distance >= RINGS[ring] && distance < RINGS[ring + 1]) {
          ringLight[ring].sum += data[y * width + x];
          ringLight[ring].pixels += 1;
          break;
        }
      }
    }
  }
  console.log(
    `brillo medio del cielo: ${ringLight
      .map((r, i) =>
        r.pixels === 0
          ? null
          : `${RINGS[i]}–${RINGS[i + 1]} ${(r.sum / r.pixels).toFixed(3)}`,
      )
      .filter(Boolean)
      .join("   ")}`,
  );

  const split = (list) => {
    const streaks = list.filter(isStreak);
    return `${streaks.length} trazos · ${streaks.reduce((sum, b) => sum + b.energy, 0).toFixed(0)} de energía`;
  };
  console.log(`periferia (≥400 px): ${split(blobs.filter((b) => b.distance >= 400))}`);
  console.log(`núcleo    (<400 px): ${split(blobs.filter((b) => b.distance < 400))}`);
}
