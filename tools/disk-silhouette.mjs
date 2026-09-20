/**
 * Perfil de luz del disco columna a columna: si el brazo termina en PUNTA o se
 * disuelve.
 *
 * `disk-metrics.mjs` cuenta pixeles por tramo de luminancia en una ventana fija
 * —«cuanto material hay»— y `gargantua-metrics.mjs --encuadre` da una caja
 * envolvente, que de una cuna y de una banda da exactamente lo mismo. La
 * pregunta de este pase es otra: COMO TERMINA el material hacia fuera.
 *
 * Una sola medida, y a proposito:
 *
 *   luz(x) = suma sobre la columna de max(0, luminancia - cielo)
 *
 * Es la luz total que aporta esa columna. No tiene umbral de material, no tiene
 * que decidir donde empieza ni donde acaba la banda, y no se la puede sesgar
 * eligiendo un numero. Se resume en `punta`: cuantos pixeles de ancho tarda el
 * perfil en bajar del 60 % de su maximo al 15 %. Una cuna geometrica da una
 * cifra pequena; un brazo que se disuelve por densidad, grande.
 *
 * ── Lo que esta herramienta NO mide, y por que ──────────────────────────────
 *
 * Se intentaron dos cifras mas —la dureza del canto superior y la rotura del
 * contorno— y se retiraron porque no se pudieron hacer fiables: en las columnas
 * de las ansas la banda frontal, el arco lensado y el halo se solapan de verdad,
 * asi que cualquier regla que intente extraer «el borde del disco» acaba
 * midiendo dos objetos distintos segun la columna. La primera version anclaba
 * en el pico y daba roturas de 83 px, que no es un contorno deshilachado sino un
 * instrumento saltando entre el arco y la banda. Para eso sirve el recorte a
 * 1:1 con `crop.mjs`, y el criterio es el ojo.
 *
 * Conviene leerla sobre una captura `--sin-glow`: el halo rellena el valle
 * entre la banda y el arco y aplana el perfil.
 *
 * Uso:
 *   node tools/disk-silhouette.mjs <captura> [mas...] [--centro=x,y] [--radio=R]
 *                                  [--hasta=px] [--perfil]
 */
import sharp from "sharp";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(process.env.SHOTS_DIR ?? ".shots");
const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const centre = flag("centro")?.split(",").map(Number);
const CX = centre?.[0] ?? 668;
const CY = centre?.[1] ?? 448;
const R = Number(flag("radio") ?? 95);
/*
  ALCANCE: hasta donde se mide, en pixeles desde el nucleo.

  No es un gusto: el disco NO PUEDE extenderse mas alla de DISK_OUTER = 17 rs, y
  la sombra que se pasa en `--radio` mide el parametro de impacto critico, que
  son 2.598 rs. Asi que el borde del disco esta en 17/2.598 = 6.54 radios de
  sombra y todo lo que se mida mas alla es cielo, nebulosa u otro cuerpo.

  Hace falta porque sin el la medida mentia hacia arriba: en la portada el brazo
  derecho lo pisa la Endurance y en el laboratorio lo pisa la nebulosa, asi que
  el perfil VOLVIA A SUBIR al alejarse del disco y la punta salia de 350 y 563 px
  cuando el disco ya se habia acabado.
*/
const ALCANCE = Number(flag("hasta") ?? Math.round(R * 6.6));
const PERFIL = args.includes("--perfil");
const captures = args.filter((a) => !a.startsWith("--"));

if (!captures.length) {
  console.error(
    "uso: node tools/disk-silhouette.mjs <captura> [...] [--centro=x,y] [--radio=R] [--hasta=px] [--perfil]",
  );
  process.exit(1);
}

/** Ventana vertical donde puede haber disco, en fraccion del alto. */
const TOP = 0.22;
const BOTTOM = 0.82;
/** El nucleo se excluye: dos radios de sombra a cada lado del centro. Ahi el
 *  disco satura y su perfil no dice nada de como termina el brazo. */
const CORE = 2.0;

for (const nombre of captures) {
  const path = `${dir}/${nombre}.png`;
  if (!existsSync(path)) {
    console.log(`${nombre}: no existe`);
    continue;
  }
  const { data, info } = await sharp(path)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const at = (x, y) => data[y * W + x];
  const y0 = Math.round(H * TOP);
  const y1 = Math.round(H * BOTTOM);

  const lados = {};
  for (const [etiqueta, desde, hasta, paso] of [
    ["izq", Math.round(CX - R * CORE), 0, -1],
    ["der", Math.round(CX + R * CORE), W - 1, 1],
  ]) {
    const tope = paso < 0 ? Math.max(hasta, desde - ALCANCE) : Math.min(hasta, desde + ALCANCE);
    const xs = [];
    for (let x = desde; paso < 0 ? x >= tope : x <= tope; x += paso) xs.push(x);

    // Cielo del lado: p10 de la ventana. Robusto porque la ventana es en su
    // mayor parte cielo, y es lo unico global que se usa.
    const todas = [];
    for (const x of xs) {
      for (let y = y0; y <= y1; y++) {
        const dx = x - CX;
        const dy = y - CY;
        if (dx * dx + dy * dy < R * R) continue;
        todas.push(at(x, y));
      }
    }
    todas.sort((a, b) => a - b);
    const cielo = todas[Math.round((todas.length - 1) * 0.1)];

    const luz = xs.map((x) => {
      const dx = x - CX;
      let suma = 0;
      for (let y = y0; y <= y1; y++) {
        const dy = y - CY;
        if (dx * dx + dy * dy < R * R) continue;
        suma += Math.max(0, at(x, y) - cielo);
      }
      return suma;
    });

    const pico = Math.max(0, ...luz);
    const ultima = (frac) => {
      let visto = -1;
      for (let i = 0; i < luz.length; i++) if (luz[i] >= pico * frac) visto = i;
      return visto;
    };
    const i60 = ultima(0.6);
    const i15 = ultima(0.15);
    lados[etiqueta] = {
      cielo,
      pico,
      luz,
      cuerpo: i60 >= 0 ? i60 : 0,
      borde: i15 >= 0 ? i15 : 0,
      punta: i60 >= 0 && i15 >= i60 ? i15 - i60 : 0,
    };
  }

  const fmt = (l) =>
    `cielo ${String(l.cielo).padStart(3)} · pico ${String(Math.round(l.pico)).padStart(6)} ` +
    `· cuerpo hasta ${String(l.cuerpo).padStart(3)} px · 15 % en ${String(l.borde).padStart(3)} px ` +
    `· punta ${String(l.punta).padStart(3)} px`;

  console.log(nombre);
  console.log(`  izq  ${fmt(lados.izq)}`);
  console.log(`  der  ${fmt(lados.der)}`);

  if (PERFIL) {
    for (const etiqueta of ["izq", "der"]) {
      const l = lados[etiqueta];
      const filas = [];
      for (let i = 0; i < l.luz.length; i += 20) {
        filas.push(`${i}:${l.pico ? Math.round((100 * l.luz[i]) / l.pico) : 0}`);
      }
      console.log(`  perfil ${etiqueta} (% del pico, px desde el nucleo) ${filas.join(" ")}`);
    }
  }
}
