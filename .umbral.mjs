/**
 * ¿Qué elevación pide cada invariante de los tests?
 *
 * El test de despeje exige orbitRadius·|sin(inclinacion + elevacion)| >= 4·SHADOW
 * para todos los cuerpos. Como sin() crece con la elevación, hay una elevación
 * mínima por cuerpo; la del sistema es el máximo de todas.
 */
import { worldsData } from "./content/worlds.data.ts";

const SHADOW = worldsData.gargantua.placement.size;
const need = 4 * SHADOW;

console.log(`sombra (placement.size) = ${SHADOW.toFixed(2)} · umbral del test = ${need.toFixed(2)}\n`);
console.log("cuerpo           radio  incl   despeje@17  despeje@12  despeje@9   elev minima");

let worst = 0;
for (const [id, w] of Object.entries(worldsData)) {
  const { orbitRadius, inclination } = w.placement;
  if (!orbitRadius) continue;
  const at = (e) => (orbitRadius * Math.abs(Math.sin(((inclination + e) * Math.PI) / 180))) / SHADOW;
  // elevacion minima: sin(incl+e) = need/orbitRadius
  const s = need / orbitRadius;
  const minElev = s > 1 ? NaN : (Math.asin(s) * 180) / Math.PI - inclination;
  worst = Math.max(worst, minElev);
  console.log(
    `${id.padEnd(15)} ${String(orbitRadius).padStart(5)}  ${String(inclination).padStart(4)}   ` +
      `${at(17).toFixed(2).padStart(9)}   ${at(12).toFixed(2).padStart(9)}   ${at(9).toFixed(2).padStart(8)}   ` +
      `${minElev.toFixed(1).padStart(6)}°`,
  );
}
console.log(`\nElevacion minima del sistema para pasar el test: ${worst.toFixed(1)}°`);
