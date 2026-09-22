/**
 * El campo estelar de la cubierta de Edmunds.
 *
 * La cubierta pintaba sus estrellas con `navigation-stars.svg`, que es el
 * mosaico de la NAVBAR: 640 × 160, medio centenar de puntos del mismo calibre
 * y opacidad .38. Estirado a un viewport entero daba dos cosas malas a la vez
 * — todas las estrellas iguales, y el mosaico repitiéndose cuatro veces a lo
 * ancho — así que el cielo se leía como un papel pintado y no como una noche.
 *
 * Lo que hace que un campo estelar parezca real no es la cantidad: es el
 * REPARTO DE MAGNITUD. En un cielo de verdad la inmensa mayoría de lo que se
 * ve está al borde de no verse, y media docena mandan sobre el cuadro. Aquí el
 * reparto sale de `Math.pow(azar, 2.6)`: el exponente empuja la población
 * hacia el extremo débil, y radio y opacidad salen del MISMO número, porque
 * una estrella pequeña y brillante no existe — lo que varía es cuánta luz
 * llega, y eso se ve a la vez en tamaño aparente y en intensidad.
 *
 * Tres detalles más, cada uno por un motivo:
 *
 *   · La banda lechosa no es un velo pintado: es DENSIDAD. Una franja
 *     diagonal donde caben dos veces y media más estrellas débiles. Un velo de
 *     baja frecuencia dibujado en el mosaico se delataría al repetirse; la
 *     densidad no, porque no tiene borde.
 *   · Las notables llevan halo y cuatro púas. Las púas son de la ÓPTICA, no
 *     del cielo, y por eso convencen: el ojo las lee como «esto se ha mirado
 *     con una lente».
 *   · El color va en una ventana estrecha alrededor del blanco azulado, con
 *     unas pocas cálidas. Saturar el campo estelar lo convierte en confeti.
 *
 * El mosaico es de 1200 × 750: a 1440 px de ancho se repite una vez y pico, y
 * la capa lejana lo escala a 1900 px, con lo que no llega a repetirse. La
 * semilla está fijada, así que el archivo es reproducible.
 *
 *   node tools/prepare-edmunds-sky.mjs
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const WIDTH = 1200;
const HEIGHT = 750;
const STARS = 340;
/** Cuántas veces más densa es la banda lechosa que el resto del cuadro. */
const BAND_GAIN = 2.5;
const BAND_ANGLE = -21;
const BAND_HALF_WIDTH = 150;
const NOTABLE = 9;

/** LCG con semilla fija: el mosaico tiene que salir igual en cada máquina. */
let seed = 20260922;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

/** Blanco azulado casi siempre; unas pocas cálidas, que es lo que hay. */
const TINTS = [
  ["#ffffff", 38],
  ["#e2ebff", 24],
  ["#ccdcff", 16],
  ["#b6ccff", 8],
  ["#9fbcf5", 4],
  ["#ffe6c8", 6],
  ["#ffd3a6", 4],
];
const TOTAL_WEIGHT = TINTS.reduce((sum, [, weight]) => sum + weight, 0);
const tint = () => {
  let pick = rand() * TOTAL_WEIGHT;
  for (const [colour, weight] of TINTS) {
    pick -= weight;
    if (pick <= 0) return colour;
  }
  return "#ffffff";
};

/** Distancia al eje de la banda, en píxeles. */
const bandDistance = (x, y) => {
  const radians = (BAND_ANGLE * Math.PI) / 180;
  return Math.abs(-Math.sin(radians) * (x - WIDTH / 2) + Math.cos(radians) * (y - HEIGHT * 0.42));
};

const round = (value, places = 2) => Number(value.toFixed(places));
const parts = [];

for (let i = 0; i < STARS; i += 1) {
  const x = rand() * WIDTH;
  const y = rand() * HEIGHT;
  // La banda no añade estrellas nuevas: acepta más de las que se proponen.
  const inBand = bandDistance(x, y) < BAND_HALF_WIDTH * (0.6 + rand() * 0.8);
  if (!inBand && rand() > 1 / BAND_GAIN) continue;
  const magnitude = Math.pow(rand(), 2.6);
  // El suelo del radio NO es cosmético: por debajo de medio píxel la estrella
  // se reparte entre dos píxeles y pierde brillo con el CUADRADO del radio, así
  // que una débil de r = 0.3 no llega al cuadro. La magnitud la lleva la
  // opacidad, que sí es lineal; el radio sólo dice cuánto ocupa.
  const radius = 0.58 + magnitude * 1.05;
  const opacity = 0.26 + magnitude * 0.72;
  parts.push(`<circle cx="${round(x, 1)}" cy="${round(y, 1)}" r="${round(radius)}" fill="${tint()}" opacity="${round(opacity)}"/>`);
}

for (let i = 0; i < NOTABLE; i += 1) {
  const x = rand() * WIDTH;
  const y = rand() * HEIGHT;
  const radius = 1.4 + rand() * 0.7;
  const spike = radius * 5.5;
  const colour = rand() > 0.82 ? "#ffe0bd" : "#ffffff";
  parts.push(
    `<g><circle cx="${round(x, 1)}" cy="${round(y, 1)}" r="${round(radius * 3.4)}" fill="${colour}" opacity=".1"/>` +
      `<ellipse cx="${round(x, 1)}" cy="${round(y, 1)}" rx="${round(spike)}" ry=".38" fill="${colour}" opacity=".34"/>` +
      `<ellipse cx="${round(x, 1)}" cy="${round(y, 1)}" rx=".38" ry="${round(spike)}" fill="${colour}" opacity=".34"/>` +
      `<circle cx="${round(x, 1)}" cy="${round(y, 1)}" r="${round(radius)}" fill="${colour}"/></g>`,
  );
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" fill="none">\n  ${parts.join("\n  ")}\n</svg>\n`;
const out = resolve("public/brand/edmunds-night-stars.svg");
writeFileSync(out, svg, "utf8");
console.log(`${out} — ${parts.length} estrellas (${NOTABLE} notables), ${(svg.length / 1024).toFixed(1)} KiB`);
