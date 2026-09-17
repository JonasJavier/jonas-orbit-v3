/**
 * Cuánta atmósfera hay REALMENTE en la imagen, leída del A/B/C.
 *
 * Existe por un diagnóstico que costó un pase entero. La primera atmósfera del
 * Observatorio se calibró en radiancia lineal —«el halo por debajo de la mitad
 * del canto más débil del espécimen»— y sobre el papel era impecable. En la
 * captura no había nada: pasado por ACES y la codificación sRGB, aquel número
 * sale a **sRGB 0, 0, 1**, y en el centro del cuadro a 0, 0, 0.
 *
 * O sea que la discusión «se nota poco» era una discusión sobre una imagen
 * vacía, y no había forma de saberlo mirando el código. La lección general:
 * **cerca del negro, HDR y pantalla no son la misma escala**. La curva ACES
 * comprime tres décadas de radiancia en los diez primeros valores de sRGB, así
 * que una cota en unidades lineales no acota la imagen — la borra.
 *
 * De ahí este script. Mide en la única unidad en la que se puede discutir con
 * alguien que está delante de una pantalla: niveles de sRGB sobre el PNG.
 *
 * ── Qué mide, y por qué cada cosa ───────────────────────────────────────────
 *
 *  · SALTO A→C. La prueba que puso la dirección, literal: «si tengo que
 *    acercarme a la pantalla para descubrir qué cambió, sigue demasiado
 *    débil». Se da como diferencia media y como fracción de cuadro que cambia
 *    por encima de tres umbrales, porque un salto grande en pocos píxeles y uno
 *    pequeño en todo el cuadro se sienten distinto y la media sola los confunde.
 *  · JERARQUÍA. La referencia que dio la dirección —objeto 100 %, atmósfera
 *    25-35 %, instrumentación 10-15 %— medida contra el percentil 99.9 del
 *    cuadro, que son las aristas vivas del espécimen.
 *  · MAPA DE FONDO. La luma mediana del fondo en una rejilla de 3 × 3, que es
 *    el sandwich que dibujó la dirección puesto en números: negro arriba,
 *    azulado, masa, espécimen, azulado, negro.
 *  · CENSO DE ESTRELLAS. Máximos locales sobre el fondo, repartidos en tres
 *    calibres. «Muchas débiles, unas pocas medias, 2-3 referencias» es una
 *    distribución, y una distribución se cuenta.
 *  · JERARQUÍA 4D. El único número que puede decir que este pase ha estropeado
 *    algo ya aprobado. El Tesseracto separa sus dos celdas por brillo —cercana
 *    gruesa y clara, lejana fina y apagada— y un fondo azul del nivel de la
 *    lejana INVIERTE ese contraste: el canto deja de ser un hilo que brilla y
 *    pasa a ser un hilo oscuro.
 *
 *    Se dan dos números y hay que leerlos juntos, porque la primera versión de
 *    esta medida daba una conclusión falsa. Medía el contraste CON SIGNO y
 *    anunciaba «de +7.8 a −1.3»: una pérdida catastrófica. La imagen decía lo
 *    contrario — contra negro un canto casi negro es INVISIBLE, y contra el
 *    campo es una línea nítida—. Lo que se había medido era el cambio de
 *    polaridad, no el de legibilidad. El ojo lee el VALOR ABSOLUTO del
 *    contraste; el signo sólo dice si el canto brilla o recorta.
 *  · BANDEO. Cambios de nivel a lo largo de una línea que cruza el halo. Un
 *    degradado a pantalla completa sin dither bandea, y unos anillos
 *    concéntricos son exactamente el «círculo» que el encargo veta.
 *
 * Las tres capturas tienen que venir del mismo `--atmosfera` con el reloj
 * clavado: mismo instante, misma pose, mismo cromo. Si no, «coste 4D» compara
 * dos figuras distintas y no significa nada.
 *
 * Uso:
 *   node tools/observatory-atmosfera.mjs <carpeta>
 *
 * Ejemplo:
 *   node tools/observatory-atmosfera.mjs .shots/atmosfera-v2
 */

import sharp from "sharp";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const carpeta = resolve(process.argv[2] ?? ".shots/atmosfera");

const CAPAS = [
  ["A", "A-negro"],
  ["B", "B-estrellas"],
  ["C", "C-completa"],
];

async function leer(nombre) {
  const ruta = join(carpeta, `${nombre}.png`);
  if (!existsSync(ruta)) {
    console.error(`Falta ${ruta}. Genera el A/B/C primero:
  node tools/observatory-shot.mjs ${carpeta} tesseracto --atmosfera`);
    process.exit(1);
  }
  const { data, info } = await sharp(ruta)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  // Luma Rec.709 en el dominio de sRGB, a propósito: no se lineariza. Lo que
  // se quiere medir es cuánto ve un ojo delante del monitor, y la percepción
  // sigue el valor codificado mucho mejor que el lineal.
  const luma = new Float32Array(width * height);
  for (let i = 0, p = 0; i < luma.length; i++, p += 3) {
    luma[i] = 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2];
  }
  return { luma, rgb: data, width, height };
}

const pct = (n, total) => `${((100 * n) / total).toFixed(1)} %`;
const mediana = (xs) => {
  if (xs.length === 0) return 0;
  const s = Float64Array.from(xs).sort();
  return s[Math.floor(s.length / 2)];
};
const percentil = (xs, q) => {
  const s = Float64Array.from(xs).sort();
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};

const [A, B, C] = await Promise.all(CAPAS.map(([, f]) => leer(f)));
const { width, height } = A;
if (B.width !== width || C.width !== width || B.height !== height) {
  console.error("Las tres capturas tienen que medir lo mismo.");
  process.exit(1);
}
const N = width * height;

/*
  El fondo se define sobre A y no sobre cada imagen, y ése es el truco que hace
  comparable todo lo demás. En A el cielo está apagado, así que todo píxel a
  cero es cielo con certeza; y como las tres capturas comparten instante y pose,
  esos mismos índices son cielo en B y en C. Sin este ancla habría que segmentar
  el espécimen en una imagen donde el fondo ya no es negro, que es justo el
  problema que se quiere medir.
*/
const esFondo = new Uint8Array(N);
let fondoN = 0;
for (let i = 0; i < N; i++) {
  if (A.luma[i] < 0.5) {
    esFondo[i] = 1;
    fondoN++;
  }
}

console.log(`\n═══ Atmósfera del Observatorio · ${carpeta}`);
console.log(`    ${width} × ${height}, fondo = ${pct(fondoN, N)} del cuadro\n`);

// ── 1 · El salto A→C ────────────────────────────────────────────────────────
console.log("── SALTO A→C ────────────────────────────────────────────────");
for (const [nombre, X] of [
  ["A→B", B],
  ["A→C", C],
]) {
  let suma = 0;
  const arriba = [0, 0, 0];
  const umbrales = [2, 6, 12];
  for (let i = 0; i < N; i++) {
    if (!esFondo[i]) continue;
    const d = X.luma[i] - A.luma[i];
    suma += d;
    for (let u = 0; u < 3; u++) if (d >= umbrales[u]) arriba[u]++;
  }
  console.log(
    `${nombre}  media ${(suma / fondoN).toFixed(2)} niveles · ` +
      umbrales
        .map((u, k) => `≥${u}: ${pct(arriba[k], fondoN)}`)
        .join(" · "),
  );
}

// ── 2 · La jerarquía que pidió la dirección ─────────────────────────────────
const objeto = percentil(
  Array.from({ length: N }, (_, i) => C.luma[i]),
  0.999,
);
const fondoC = [];
const fondoA = [];
for (let i = 0; i < N; i++) {
  if (!esFondo[i]) continue;
  fondoC.push(C.luma[i]);
  fondoA.push(A.luma[i]);
}
const atmosferaTipica = percentil(fondoC, 0.75);
const atmosferaAlta = percentil(fondoC, 0.99);
console.log("\n── JERARQUÍA (objeto = p99.9 del cuadro) ────────────────────");
console.log(`objeto          ${objeto.toFixed(0)}  → 100 %`);
console.log(
  `atmósfera p75   ${atmosferaTipica.toFixed(1)}  → ` +
    `${((100 * atmosferaTipica) / objeto).toFixed(0)} %   (antes: ${percentil(fondoA, 0.75).toFixed(1)})`,
);
console.log(
  `atmósfera p99   ${atmosferaAlta.toFixed(1)}  → ` +
    `${((100 * atmosferaAlta) / objeto).toFixed(0)} %   (antes: ${percentil(fondoA, 0.99).toFixed(1)})`,
);

// ── 3 · El mapa del fondo, 3 × 3 ────────────────────────────────────────────
console.log("\n── MAPA DE FONDO · mediana de luma por tercio ───────────────");
for (const [etiqueta, X] of [
  ["A", A],
  ["C", C],
]) {
  const filas = [];
  for (let gy = 0; gy < 3; gy++) {
    const celdas = [];
    for (let gx = 0; gx < 3; gx++) {
      const vals = [];
      const y0 = Math.floor((gy * height) / 3);
      const y1 = Math.floor(((gy + 1) * height) / 3);
      const x0 = Math.floor((gx * width) / 3);
      const x1 = Math.floor(((gx + 1) * width) / 3);
      for (let y = y0; y < y1; y += 2) {
        for (let x = x0; x < x1; x += 2) {
          const i = y * width + x;
          if (esFondo[i]) vals.push(X.luma[i]);
        }
      }
      celdas.push(mediana(vals).toFixed(1).padStart(6));
    }
    filas.push(celdas.join(" "));
  }
  console.log(`${etiqueta}:  ${filas.join("\n    ")}`);
}

// ── 4 · Censo de estrellas ──────────────────────────────────────────────────
/*
  Máximo local estricto en una ventana de 5 × 5, sólo sobre fondo. La ventana
  es más ancha que el perfil de la estrella más gorda (2.1 px de sigma) para
  que una sola estrella no se cuente dos veces por antialiasing.
*/
function censo(X) {
  const cortes = [
    ["referencias (≥40)", 40],
    ["medias (≥18)", 18],
    ["débiles (≥5)", 5],
  ];
  const cuenta = cortes.map(() => 0);
  let pico = 0;
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      const i = y * width + x;
      if (!esFondo[i]) continue;
      const v = X.luma[i];
      if (v < 5) continue;
      let max = true;
      for (let dy = -2; dy <= 2 && max; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (X.luma[i + dy * width + dx] > v) {
            max = false;
            break;
          }
        }
      }
      if (!max) continue;
      if (v > pico) pico = v;
      for (let k = 0; k < cortes.length; k++) if (v >= cortes[k][1]) cuenta[k]++;
    }
  }
  return { cuenta, cortes, pico };
}
const censoB = censo(B);
console.log("\n── CENSO DE ESTRELLAS (sobre B) ─────────────────────────────");
censoB.cortes.forEach(([nombre], k) =>
  console.log(`${nombre.padEnd(20)} ${censoB.cuenta[k]}`),
);
console.log(`estrella más viva    ${censoB.pico.toFixed(0)} niveles`);

// ── 5 · El coste sobre la jerarquía 4D ──────────────────────────────────────
/*
  Los cantos flojos son los píxeles que en A —fondo negro puro— caen entre 2 y
  14: demasiado claros para ser fondo y demasiado apagados para ser la celda
  cercana. En C se les mide el contraste contra su fondo LOCAL, estimado con la
  mediana del cielo en una ventana de 15 × 15 alrededor. Un contraste que baja
  mucho o que cambia de signo significa que el halo se ha comido la celda
  lejana, que es lo único que este pase puede romper de lo ya aprobado.
*/
const R = 7;
let contrasteA = 0;
let contrasteC = 0;
let absA = 0;
let absC = 0;
let invertidos = 0;
let muestras = 0;
for (let y = R; y < height - R; y += 2) {
  for (let x = R; x < width - R; x += 2) {
    const i = y * width + x;
    if (esFondo[i]) continue;
    const a = A.luma[i];
    if (a < 2 || a > 14) continue;
    const vecinos = [];
    for (let dy = -R; dy <= R; dy += 2) {
      for (let dx = -R; dx <= R; dx += 2) {
        const j = i + dy * width + dx;
        if (esFondo[j]) vecinos.push(C.luma[j]);
      }
    }
    if (vecinos.length < 12) continue;
    const bg = mediana(vecinos);
    const dC = C.luma[i] - bg;
    contrasteA += a;
    contrasteC += dC;
    absA += Math.abs(a);
    absC += Math.abs(dC);
    if (dC < 0) invertidos++;
    muestras++;
  }
}
console.log("\n── JERARQUÍA 4D · cantos flojos de la celda lejana ──────────");
if (muestras === 0) {
  console.log("sin muestras: la pose no expone celda lejana reconocible");
} else {
  console.log(`muestras             ${muestras}`);
  console.log(
    `|contraste| en A     ${(absA / muestras).toFixed(2)} niveles  ← lo que ve el ojo`,
  );
  console.log(
    `|contraste| en C     ${(absC / muestras).toFixed(2)} niveles  ← lo que ve el ojo`,
  );
  console.log(
    `con signo            A ${(contrasteA / muestras).toFixed(2)}  →  C ${(contrasteC / muestras).toFixed(2)}`,
  );
  console.log(
    `cantos en silueta    ${pct(invertidos, muestras)} (más oscuros que su fondo, no invisibles)`,
  );
}

// ── 6 · Bandeo ──────────────────────────────────────────────────────────────
/*
  Una línea horizontal por el tercio superior, donde el halo tiene su mayor
  pendiente y no hay espécimen. Se cuentan cambios de nivel: pocos cambios sobre
  un recorrido grande significan mesetas planas, o sea anillos.
*/
function bandeo(X, y) {
  /*
    La medida buena es la MESETA MÁS LARGA EN LA PENDIENTE, y las dos mitades de
    esa frase costaron una lectura falsa cada una.

    Primero se comparaba el número de cambios con el recorrido por un umbral
    inventado, y eso marcaba en rojo un degradado perfectamente dithered. Un
    anillo no se ve por haber pocos cambios: se ve cuando hay una franja ancha
    de un solo valor con un escalón al lado.

    Y contando mesetas a secas volvía a fallar, por dos sitios. El negro real
    —medio cuadro al otro lado del halo— es un tramo enorme de ceros que no es
    un degradado. Y la CIMA DE LA LÍNEA también: donde la horizontal pasa por su
    punto más cercano al centro del halo la derivada es cero, así que el valor
    se queda clavado varias decenas de píxeles por geometría y no por falta de
    dither. Una cumbre de 116 px a valor 76 no es un anillo, es ese punto.

    Así que se mide sólo donde puede haber bandeo: entre el 15 % y el 85 % del
    recorrido de la línea, que es la pendiente.
  */
  const azul = [];
  for (let x = 0; x < width; x++) {
    const i = y * width + x;
    if (esFondo[i]) azul.push(X.rgb[i * 3 + 2]);
  }
  const min = Math.min(...azul);
  const max = Math.max(...azul);
  const bajo = min + 0.15 * (max - min);
  const alto = min + 0.85 * (max - min);

  let cambios = 0;
  let meseta = 0;
  let mayor = 0;
  let previo = null;
  for (const v of azul) {
    if (v < bajo || v > alto) {
      mayor = Math.max(mayor, meseta);
      meseta = 0;
      previo = null;
      continue;
    }
    if (previo !== null && v !== previo) {
      cambios++;
      mayor = Math.max(mayor, meseta);
      meseta = 0;
    }
    meseta++;
    previo = v;
  }
  return { cambios, span: max - min, meseta: Math.max(mayor, meseta) };
}
const linea = Math.floor(height * 0.22);
const bC = bandeo(C, linea);
console.log("\n── BANDEO · línea horizontal al 22 % de alto ────────────────");
console.log(
  `recorrido del azul   ${bC.span} niveles · ${bC.cambios} cambios · ` +
    `meseta mayor en pendiente ${bC.meseta} px` +
    (bC.meseta > 24 ? "   ⚠ anillo visible: revisa el dither" : "   ✓ sin anillos"),
);
console.log();
