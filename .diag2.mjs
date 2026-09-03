/**
 * Los dos invariantes que se rompen a 9°, calculados con el código real, para
 * saber QUE los rompe antes de decidir cómo arreglarlo.
 */
import * as THREE from "three";
import { worldsData, WORLD_IDS } from "./content/worlds.data.ts";
import { orbitalPosition } from "./components/scene/bodies.ts";
import { bodyDepthLayerFor } from "./lib/scene-depth.ts";

const FRAME_DISTANCE = 76;
const SHADOW = worldsData.gargantua.placement.size;
const IDS = WORLD_IDS.filter((id) => id !== "gargantua");

function apparent(id, elevDeg, placementOverride) {
  const e = (elevDeg * Math.PI) / 180;
  const camera = new THREE.Vector3(0, Math.sin(e), Math.cos(e)).multiplyScalar(
    FRAME_DISTANCE,
  );
  const placement = placementOverride ?? worldsData[id].placement;
  const pos = orbitalPosition(placement, 0, new THREE.Vector3());
  const d = pos.distanceTo(camera) - bodyDepthLayerFor(id);
  return worldsData[id].placement.size / d;
}

function clearance(id, elevDeg, placementOverride) {
  const p = placementOverride ?? worldsData[id].placement;
  return (
    (p.orbitRadius * Math.abs(Math.sin(((p.inclination + elevDeg) * Math.PI) / 180))) /
    SHADOW
  );
}

for (const elev of [17, 9]) {
  console.log(`\n=== elevacion ${elev}° ===`);
  const rows = IDS.map((id) => ({
    id,
    size: apparent(id, elev),
    clear: clearance(id, elev),
  })).sort((a, b) => b.size - a.size);
  const end = rows.find((r) => r.id === "endurance");
  const best = rows.filter((r) => r.id !== "endurance")[0];
  for (const r of rows) {
    console.log(
      `  ${r.id.padEnd(15)} tamaño ${r.size.toFixed(5)}  despeje ${r.clear.toFixed(2)}`,
    );
  }
  console.log(
    `  -> Endurance / mayor rival (${best.id}) = ${(end.size / best.size).toFixed(3)}  (pide > 1.5)`,
  );
}

// Barrido de la inclinacion de Endurance a 9°.
console.log("\n=== Endurance a 9°: barrido de inclinacion ===");
console.log("incl   despeje   tamaño     ratio vs rival");
for (let inc = 12; inc <= 26; inc += 1) {
  const p = { ...worldsData.endurance.placement, inclination: inc };
  const size = apparent("endurance", 9, p);
  const rival = Math.max(
    ...IDS.filter((id) => id !== "endurance").map((id) => apparent(id, 9)),
  );
  console.log(
    `${String(inc).padStart(4)}°  ${clearance("endurance", 9, p).toFixed(2).padStart(7)}   ${size.toFixed(5)}   ${(size / rival).toFixed(3)}`,
  );
}
