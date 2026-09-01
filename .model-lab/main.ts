/* Laboratorio temporal: cada cuerpo, grande, con el shader real. NO se publica. */
import * as THREE from "three";
import { createBody, orbitalPosition, type SceneBody } from "@/components/scene/bodies";
import { worldsData, type WorldId } from "@/content/worlds.data";

const IDS: Exclude<WorldId, "gargantua">[] = [
  "endurance",
  "ranger",
  "tesseract",
  "cooper-station",
  "miller",
  "edmunds",
];

const params = new URLSearchParams(location.search);
const only = params.get("only");
const spin = params.get("spin") === "1";
const seconds0 = Number(params.get("t") ?? 0);
const ids = only ? (only.split(",") as typeof IDS) : IDS;

const canvas = document.getElementById("c") as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x04060a, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.autoClear = false;

/* Cámara real de la home: elevación 17°, azimut 0, a ~120 rs. */
const HOME_CAM = new THREE.Vector3(0, Math.sin((17 * Math.PI) / 180), Math.cos((17 * Math.PI) / 180)).multiplyScalar(120);

interface Tile {
  id: WorldId;
  body: SceneBody;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  light: number;
}

const tiles: Tile[] = ids.map((id) => {
  const world = worldsData[id];
  const body = createBody({
    id,
    visual: world.visual,
    accent: world.accent,
    secondary: world.secondary,
    placement: world.placement,
  })!;
  const scene = new THREE.Scene();
  const position = orbitalPosition(world.placement, 0, new THREE.Vector3());
  body.object.position.copy(position);
  scene.add(body.object);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 4000);
  const direction = new THREE.Vector3().subVectors(HOME_CAM, position).normalize();
  const az = (Number(params.get("az") ?? 0) * Math.PI) / 180;
  const el = (Number(params.get("el") ?? 0) * Math.PI) / 180;
  direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), az);
  direction.applyAxisAngle(
    new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize(),
    el,
  );
  const zoom = Number(params.get("zoom") ?? 3.1);
  camera.position.copy(position).addScaledVector(direction, body.radius * zoom);
  camera.up.set(0, 1, 0);
  camera.lookAt(position);
  camera.rotateZ(-0.13);
  const light = Math.min(1.66, Math.max(1.08, (25 / Math.max(world.placement.orbitRadius, 1)) * 1.36));
  return { id, body, scene, camera, light };
});

const labels = document.getElementById("labels")!;
function layout() {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h);
  const columns = Math.min(tiles.length, tiles.length > 2 ? 3 : tiles.length);
  const rows = Math.ceil(tiles.length / columns);
  labels.innerHTML = "";
  tiles.forEach((tile, index) => {
    const cx = index % columns;
    const cy = Math.floor(index / columns);
    const tw = w / columns;
    const th = h / rows;
    tile.camera.aspect = tw / th;
    tile.camera.updateProjectionMatrix();
    const el = document.createElement("div");
    el.className = "lab";
    el.textContent = tile.id;
    el.style.left = `${cx * tw + 10}px`;
    el.style.top = `${cy * th + 8}px`;
    labels.append(el);
  });
}
addEventListener("resize", layout);
layout();

function frame(ms: number) {
  const seconds = seconds0 + (spin ? ms / 1000 : 0);
  const w = innerWidth;
  const h = innerHeight;
  const columns = Math.min(tiles.length, tiles.length > 2 ? 3 : tiles.length);
  const rows = Math.ceil(tiles.length / columns);
  renderer.setScissorTest(true);
  renderer.clear();
  tiles.forEach((tile, index) => {
    const cx = index % columns;
    const cy = Math.floor(index / columns);
    const tw = Math.floor(w / columns);
    const th = Math.floor(h / rows);
    const x = cx * tw;
    const y = h - (cy + 1) * th;
    renderer.setViewport(x, y, tw, th);
    renderer.setScissor(x, y, tw, th);
    tile.body.spinAt(seconds);
    for (const material of tile.body.materials) {
      material.uniforms.uTime.value = seconds;
      material.uniforms.uCamPos?.value.copy(tile.camera.position);
      if (material.uniforms.uLightIntensity) material.uniforms.uLightIntensity.value = tile.light;
    }
    renderer.render(tile.scene, tile.camera);
  });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

(window as any).lab = tiles;
