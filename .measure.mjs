/**
 * Números para decidir la elevación.
 *
 * El aplanamiento del disco NO se mide: es geometría. El disco vive en y = 0,
 * así que su elipse proyectada tiene semieje mayor R y semieje menor R·sin(θ),
 * y la relación es exactamente 1/sin(θ). Medirlo sobre el píxel sólo añadiría
 * el error del umbral.
 *
 * Lo que sí hay que medir es el ZOOM: la escena recalcula la distancia de
 * encuadre con cada elevación —el sistema ocupa menos alto y la cámara se
 * acerca— y eso cambia el tamaño de todo. Se mide sobre Miller, que es un disco
 * brillante bien recortado sobre negro y de tamaño de mundo fijo: su diámetro en
 * píxeles va como 1/distancia.
 *
 * La sombra no sirve de referencia aquí: el bloom la rellena hasta 30-60 de 255
 * en el compuesto final, así que no tiene un borde que umbralizar.
 */
import sharp from "sharp";

const dir =
  "C:/Users/hachi/AppData/Local/Temp/claude/C--Users-hachi-OneDrive-Documentos-GitHub-jonas-orbit-v3/ac55f263-aed7-4843-9d19-2a49dafb4c8b/scratchpad/shots";
const W = 1440;

/** Componente conexa brillante más grande dentro de una caja. */
function blob(d, box, thr) {
  const seen = new Uint8Array(d.length);
  let best = null;
  for (let y = box.y0; y <= box.y1; y++) {
    for (let x = box.x0; x <= box.x1; x++) {
      const s = y * W + x;
      if (seen[s] || d[s] < thr) continue;
      const st = [s];
      seen[s] = 1;
      let n = 0, x0 = W, y0 = 1e9, x1 = -1, y1 = -1;
      while (st.length) {
        const i = st.pop();
        const ix = i % W, iy = (i / W) | 0;
        n++;
        if (ix < x0) x0 = ix;
        if (ix > x1) x1 = ix;
        if (iy < y0) y0 = iy;
        if (iy > y1) y1 = iy;
        for (const j of [i - 1, i + 1, i - W, i + W]) {
          if (j < 0 || j >= d.length || seen[j] || d[j] < thr) continue;
          const jx = j % W, jy = (j / W) | 0;
          if (jx < box.x0 || jx > box.x1 || jy < box.y0 || jy > box.y1) continue;
          seen[j] = 1;
          st.push(j);
        }
      }
      if (n > 400 && (!best || n > best.n)) best = { n, w: x1 - x0 + 1, h: y1 - y0 + 1, x0, y0 };
    }
  }
  return best;
}

// Cuadrante inferior izquierdo: ahí sólo está Miller, sin disco ni HUD.
const MILLER = { x0: 130, y0: 470, x1: 470, y1: 810 };

console.log("ang   elipse del disco   Miller ø   zoom vs 17°");
const rows = [];
for (const deg of [17, 12, 9]) {
  const { data } = await sharp(`${dir}/elev${deg}.png`)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const m = blob(data, MILLER, 55);
  const aspect = 1 / Math.sin((deg * Math.PI) / 180);
  rows.push({ deg, aspect, d: m ? m.w : 0 });
}
for (const r of rows) {
  console.log(
    `${String(r.deg).padStart(3)}°   ${r.aspect.toFixed(2).padStart(9)} : 1   ${String(r.d).padStart(5)} px   ${(r.d / rows[0].d).toFixed(3).padStart(6)}×`,
  );
}
