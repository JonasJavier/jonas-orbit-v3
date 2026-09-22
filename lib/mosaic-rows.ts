/** Cómo se reparte un sector del mosaico de Edmunds en filas justificadas.
 *
 * El mosaico no puede ser multi-columna: CSS reparte las obras por columnas
 * buscando columnas de la MISMA altura, y con fotos que no se pueden cortar
 * —unas apaisadas y otras el doble de altas— el equilibrio falla y el sector
 * termina en columnas a medias, con huecos negros de cientos de píxeles.
 *
 * Una fila justificada no tiene ese fallo por construcción: las obras de una
 * fila comparten altura, sus anchos son proporcionales a su relación de
 * aspecto y la fila ocupa el ancho ENTERO. Lo único que hay que decidir es
 * dónde se corta, y eso es esta función. No hay «resto»: la última fila se
 * decide con el mismo criterio que las demás, así que también va llena.
 *
 * El corte es una programación dinámica sobre el orden de las obras —que es
 * curaduría y no se toca—: cada fila cuesta lo que se separa del objetivo al
 * cuadrado, y el reparto elegido es el más barato de todos. `target` es la
 * suma de relaciones de aspecto que cabe en una fila, o sea cuántas fotos
 * cuadradas caben de lado a lado, y de él sale la altura de la fila; el número
 * de filas no se decide aparte, sale solo.
 *
 * Los topes son los que evitan las filas feas, y son penalizaciones y no
 * prohibiciones porque un sector puede no tener ningún reparto que las cumpla:
 * `maxPerRow` impide que ocho carteles verticales entren en la misma fila
 * convertidos en astillas; `maxRatio` impide la fila achatada —dos apaisadas
 * juntas en un teléfono dejan 90 px de alto y el cartel que las acompaña en
 * 71 px de ancho—; y `minSolo` impide que una obra estrecha se quede sola
 * ocupando el ancho entero, que es lo que la estira hasta la altura de la
 * página. */
export type MosaicScale = { readonly key: string; readonly target: number; readonly maxPerRow: number; readonly maxRatio: number; readonly minSolo: number };

/** Un juego de cortes por ancho de pantalla; la hoja de estilo enciende el que
 * toca (`.edmunds-mosaic-cut[data-at~="w"]`) y apaga los otros dos. El
 * objetivo apunta al MEDIO de su banda de anchos, porque unos mismos cortes
 * sirven para todo un tramo de ventanas. Las bandas son cinco y no tres porque
 * la altura de una fila la fija el ancho disponible: con una sola banda de
 * teléfono, de 320 px a 700 px, la misma fila pasa de 137 px a 950 px de alto.
 * En el teléfono ninguna fila pasa de dos obras. */
export const MOSAIC_SCALES: readonly MosaicScale[] = [
  { key: "xl", target: 4.4, maxPerRow: 5, maxRatio: 5.6, minSolo: 2.4 },
  { key: "lg", target: 3.4, maxPerRow: 4, maxRatio: 4.4, minSolo: 2 },
  { key: "md", target: 2.4, maxPerRow: 3, maxRatio: 3.2, minSolo: 1.5 },
  { key: "sm", target: 1.7, maxPerRow: 2, maxRatio: 2.25, minSolo: 0.9 },
  { key: "xs", target: 1.25, maxPerRow: 2, maxRatio: 1.75, minSolo: 0.5 },
];

/** Lo que cuesta una fila que se salta un tope. Domina cualquier diferencia
 * de encaje sin llegar a hacer imposible el reparto. */
const PENALTY = 1e4;

/** Índices donde empieza una fila nueva, sin el 0. */
export function mosaicRows(ratios: readonly number[], scale: MosaicScale): number[] {
  const count = ratios.length;
  if (count < 2) return [];
  const prefix = [0];
  for (const ratio of ratios) prefix.push(prefix[prefix.length - 1] + ratio);
  // cost[i]: lo más barato que se pueden repartir las primeras i obras.
  const cost = new Float64Array(count + 1).fill(Infinity);
  const cut = new Int32Array(count + 1);
  cost[0] = 0;
  for (let taken = 1; taken <= count; taken += 1) {
    for (let length = 1; length <= Math.min(scale.maxPerRow, taken); length += 1) {
      const start = taken - length;
      if (cost[start] === Infinity) continue;
      const sum = prefix[taken] - prefix[start];
      const gap = sum - scale.target;
      const squat = sum > scale.maxRatio;
      const tall = length === 1 && sum < scale.minSolo;
      const candidate = cost[start] + gap * gap + (squat || tall ? PENALTY : 0);
      if (candidate < cost[taken]) {
        cost[taken] = candidate;
        cut[taken] = start;
      }
    }
  }

  const breaks: number[] = [];
  for (let taken = cut[count]; taken > 0; taken = cut[taken]) breaks.unshift(taken);
  return breaks;
}
