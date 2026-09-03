import * as THREE from "three";
import { worldsData, WORLD_IDS } from "./content/worlds.data.ts";
import { createBody, orbitalPosition } from "./components/scene/bodies.ts";
import { bodyDepthLayerFor } from "./lib/scene-depth.ts";

const FRAME_DISTANCE = 76;
const IDS = WORLD_IDS.filter((id) => id !== "gargantua");
const radii = {};
for (const id of IDS) {
  const w = worldsData[id];
  const b = createBody({ id, visual: w.visual, accent: w.accent, secondary: w.secondary, placement: w.placement });
  radii[id] = b.radius;
}

function apparent(id, elevDeg, placement) {
  const e = (elevDeg * Math.PI) / 180;
  const cam = new THREE.Vector3(0, Math.sin(e), Math.cos(e)).multiplyScalar(FRAME_DISTANCE);
  const pos = orbitalPosition(placement ?? worldsData[id].placement, 0, new THREE.Vector3());
  return radii[id] / (pos.distanceTo(cam) - bodyDepthLayerFor(id));
}

for (const elev of [17, 12, 9]) {
  const rows = IDS.map((id) => ({ id, s: apparent(id, elev) })).sort((a, b) => b.s - a.s);
  const end = rows.find((r) => r.id === "endurance").s;
  const rival = rows.filter((r) => r.id !== "endurance")[0];
  console.log(`elev ${elev}°: endurance ${end.toFixed(5)} · rival ${rival.id} ${rival.s.toFixed(5)} · ratio ${(end / rival.s).toFixed(3)}`);
}
console.log("\nradio de malla:", Object.fromEntries(IDS.map((i) => [i, +radii[i].toFixed(3)])));
