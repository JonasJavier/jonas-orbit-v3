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
/** Modo movimiento: lee el contacto de `--orbita` en vez del A/B/C. */
const MOVIMIENTO = process.argv.includes("--movimiento");

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

/*
  ── Modo movimiento ─────────────────────────────────────────────────────────

  La pregunta que ninguna imagen fija puede contestar: ¿el cielo se comporta
  como espacio o está pegado a la pantalla?

  La respuesta tiene dos mitades y son opuestas, y por eso hace falta medir las
  dos. Un cielo infinito es **rotación pura y traslación cero**:

   · Al ORBITAR, la cámara rota contra una cáscara que no rota, así que el campo
     tiene que BARRER el cuadro. Barrido cero = papel pintado.
   · Al hacer ZOOM, la cáscara se traslada CON la cámara, así que el campo NO
     puede moverse ni cambiar de escala. Movimiento = fondo a distancia finita,
     que es lo que se lee como el interior de una habitación.

  Cada mitad se mide con la herramienta que le toca, y mezclarlas costó una
  falsa alarma: la órbita por correlación —hay que encontrar CUÁNTO se movió— y
  el zoom por resta píxel a píxel, porque ahí la respuesta correcta es «nada» y
  una correlación sobre un cuadro donde el espécimen ha crecido acaba siguiendo
  al espécimen.

  Y hay que leer las dos juntas. Un cielo pegado a la pantalla también daría
  cero en el zoom; lo que lo delata es que entonces la órbita daría cero
  también. Sólo **barrido grande en la órbita + inmovilidad exacta en el zoom**
  es un cielo infinito; cualquier otra combinación es otra cosa.
*/
function registro(X, y0, y1, x0, x1) {
  const filas = [];
  for (let y = y0; y < y1; y += 3) {
    const fila = [];
    for (let x = x0; x < x1; x += 2) {
      // Recortado: las aristas vivas del espécimen valen más de 200 y
      // dominarían la suma, y lo que se quiere correlacionar es el CIELO.
      fila.push(Math.min(60, X.luma[y * X.width + x]));
    }
    filas.push(fila);
  }
  return filas;
}

/** El desplazamiento que mejor superpone dos registros, en píxeles de pantalla. */
function desplazamiento(a, b, maxDx = 400) {
  let mejor = { dx: 0, dy: 0, coste: Infinity, enCero: 0, confianza: 0 };
  const alto = a.length;
  const ancho = a[0].length;
  for (let dy = -6; dy <= 6; dy += 2) {
    for (let px = -maxDx; px <= maxDx; px += 2) {
      const dx = px / 2;
      let coste = 0;
      let n = 0;
      for (let r = 0; r < alto; r++) {
        const rb = r + dy;
        if (rb < 0 || rb >= alto) continue;
        for (let c = 0; c < ancho; c++) {
          const cb = c + dx;
          if (cb < 0 || cb >= ancho) continue;
          coste += Math.abs(a[r][c] - b[rb][cb]);
          n++;
        }
      }
      if (n < ancho * alto * 0.5) continue;
      const medio = coste / n;
      if (px === 0 && dy === 0) mejor.enCero = medio;
      if (medio < mejor.coste) {
        mejor.dx = px;
        mejor.dy = dy * 3;
        mejor.coste = medio;
      }
    }
  }
  /*
    La CONFIANZA, y hace falta. Cuando el halo ya ha barrido fuera de la banda y
    sólo queda negro, la superficie de coste es plana: el mínimo cae donde sea y
    el script informa de un desplazamiento de cero con el mismo aplomo que de
    uno de doscientos. Eso pasó en los tres últimos pasos del primer contacto y
    parecía un cambio de comportamiento del cielo; era falta de señal.

    Se mide como cuánto mejora el mejor encaje respecto de no desplazar nada. Si
    la mejora es pequeña, no hay nada que seguir y el paso no cuenta.
  */
  mejor.confianza =
    mejor.enCero > 0 ? 1 - mejor.coste / mejor.enCero : 0;
  return mejor;
}

if (MOVIMIENTO) {
  const { readdirSync } = await import("node:fs");
  const nombres = readdirSync(carpeta)
    .filter((f) => /^orbita-\d+\.png$/.test(f))
    .sort();
  if (nombres.length < 2) {
    console.error(`Faltan los fotogramas de contacto en ${carpeta}. Genera el clip:
  node tools/observatory-shot.mjs ${carpeta} tesseracto --orbita`);
    process.exit(1);
  }

  const cuadros = [];
  for (const n of nombres) cuadros.push(await leer(n.replace(/\.png$/, "")));

  console.log(`
═══ Movimiento del cielo · ${carpeta}`);
  console.log(
    `    ${cuadros.length} fotogramas, 40 px de arrastre = 10° de cámara
`,
  );

  // La banda alta: casi todo cielo en cualquier pose, y es donde el campo tiene
  // más estructura para correlacionar.
  const banda = (X) => registro(X, 70, 250, 0, X.width);

  console.log("── BARRIDO EN ÓRBITA ────────────────────────────────────────");
  const barridos = [];
  for (let i = 1; i < cuadros.length; i++) {
    const d = desplazamiento(banda(cuadros[i - 1]), banda(cuadros[i]));
    /*
      Un cuarto de mejora. Con el listón en 0.06 entraba un paso al 14 % que
      valía −40 px y hundía la media hasta 191; con 0.25 entran los seis pasos
      sólidos y la media sale 217, que es a un 4 % de los 225 px que predice la
      geometría (10° de cámara ÷ 0.000776 rad por píxel). Cuando la medida y la
      trigonometría coinciden así, el listón está donde toca.
    */
    const fiable = d.confianza > 0.25;
    if (fiable) barridos.push(Math.abs(d.dx));
    console.log(
      `paso ${String(i).padStart(2, "0")}   ${String(d.dx).padStart(5)} px` +
        `   mejora ${(100 * d.confianza).toFixed(0)} %` +
        (fiable ? "" : "   (sin estructura que seguir: no cuenta)"),
    );
  }
  const medio = barridos.reduce((a, b) => a + b, 0) / Math.max(1, barridos.length);
  console.log(
    `\nbarrido medio  ${medio.toFixed(0)} px por cada 10° de cámara ` +
      `(${barridos.length} de ${cuadros.length - 1} pasos con señal)` +
      (medio > 60
        ? "\n               ✓ el cielo NO está pegado a la pantalla"
        : "\n               ⚠ papel pintado"),
  );

  // Las marcas de borde son CSS: tienen que quedarse clavadas mientras todo lo
  // demás gira. Es la otra mitad de «instrumento quieto, espécimen en marcha».
  const primera = cuadros[0];
  const ultima = cuadros[cuadros.length - 1];
  /*
    Medir la franja del calibre a secas no dice nada: DETRÁS de las marcas está
    el cielo, que durante la órbita cambia entero. La primera versión de esto
    informaba de «21.66 niveles de deriva» y lo que medía era el halo pasando
    por debajo.

    Hace falta un CONTROL: la misma medida sobre una franja vecina sin marcas.
    Si las dos cambian lo mismo, todo el cambio es del cielo y las marcas no se
    han movido; si la franja con marcas cambia bastante más, algo las arrastró.
  */
  const franja = (x0, x1) => {
    let suma = 0;
    let n = 0;
    for (let y = 250; y < 650; y++) {
      for (let x = x0; x < x1; x++) {
        const i = y * primera.width + x;
        suma += Math.abs(primera.luma[i] - ultima.luma[i]);
        n++;
      }
    }
    return suma / n;
  };
  const conMarcas = franja(14, 34);
  const control = franja(46, 66);
  console.log(
    "\n── MARCAS DE BORDE ──────────────────────────────────────────\n" +
      `franja del calibre   ${conMarcas.toFixed(2)} niveles de cambio\n` +
      `franja de control    ${control.toFixed(2)} niveles de cambio  (mismo cielo, sin marcas)` +
      (Math.abs(conMarcas - control) < Math.max(2, control * 0.35)
        ? "\n                     ✓ todo el cambio es del cielo: las marcas siguen clavadas"
        : "\n                     ⚠ la franja con marcas cambia de más"),
  );

  // El zoom, si el clip lo trae.
  const zoom = ["zoom-00-antes", "zoom-01-cerca", "zoom-02-lejos"].filter((n) =>
    existsSync(join(carpeta, `${n}.png`)),
  );
  if (zoom.length >= 2) {
    /*
      El zoom NO se mide por correlación, y eso costó una falsa alarma.

      La primera versión buscaba el desplazamiento en un parche izquierdo y otro
      derecho, y anunciaba «el cielo se mueve con el zoom: 160 px». Lo que
      pasaba es que al acercarse el espécimen crece hasta tragarse el parche, así
      que la correlación dejaba de seguir al cielo y seguía al Tesseracto.

      Para este caso hay una medida mucho mejor y sin interpretación posible: si
      la cáscara viaja con la cámara, dos niveles de zoom tienen que dar un
      cielo **idéntico píxel a píxel**. No parecido: idéntico. Así que se resta
      y se toma la MEDIANA del cuadro entero — robusta mientras el espécimen no
      ocupe la mitad, que no la ocupa— junto con el porcentaje de píxeles que no
      se mueven ni un nivel.

      Un fondo a distancia finita escalaría y casi ningún píxel coincidiría; uno
      pegado a la pantalla también daría cero aquí, pero entonces el barrido de
      la órbita habría dado cero también. Las dos medidas juntas son las que
      definen «infinitamente lejos»; ninguna de las dos lo hace sola.
    */
    console.log("\n── ZOOM · el cielo no puede seguir a la cámara ──────────────");
    const antes = await leer(zoom[0]);
    for (const n of zoom.slice(1)) {
      const despues = await leer(n);
      const diffs = [];
      let iguales = 0;
      let total = 0;
      for (let i = 0; i < antes.luma.length; i += 7) {
        const d = Math.abs(antes.luma[i] - despues.luma[i]);
        diffs.push(d);
        if (d <= 1) iguales++;
        total++;
      }
      const med = mediana(diffs);
      console.log(
        `${zoom[0]} → ${n.padEnd(14)} mediana ${med.toFixed(2)} niveles · ` +
          `${pct(iguales, total)} del cuadro sin cambiar` +
          (med <= 1
            ? "   ✓ el cielo no se movió ni escaló"
            : "   ⚠ el cielo sigue a la cámara"),
      );
    }
  }

  console.log();
  process.exit(0);
}

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
