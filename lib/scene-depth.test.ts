import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { orbitalPosition } from "@/components/scene/bodies";
import { WORLD_IDS, worldsData, type WorldId } from "@/content/worlds.data";
import { SYSTEM_POSE } from "./scene-poses";
import { bodyDepthLayerFor, placeBodyOnDepthLayer } from "./scene-depth";

/**
 * Distancia efectiva de un cuerpo a la cámara de la home, en rs.
 *
 * La capa de profundidad por sí sola dejó de valer como orden de planos el día
 * que un destino cambió de fase: la fase hunde o adelanta el cuerpo en el eje
 * de vista mucho más de lo que lo hace su capa. Miller, por ejemplo, tiene la
 * segunda capa más alta (+5) y sigue siendo el segundo cuerpo MÁS LEJANO,
 * porque su fase lo deja doce radios por detrás del plano del origen.
 *
 * Así que lo que se comprueba es la distancia que de verdad decide qué se ve
 * delante de qué, no el número suelto que la ajusta.
 */
const FRAME_DISTANCE = 76;

function effectiveDistance(id: Exclude<WorldId, "gargantua">): number {
  const elevation = (SYSTEM_POSE.elevation * Math.PI) / 180;
  const azimuth = (SYSTEM_POSE.azimuth * Math.PI) / 180;
  const camera = new THREE.Vector3(
    Math.cos(elevation) * Math.sin(azimuth),
    Math.sin(elevation),
    Math.cos(elevation) * Math.cos(azimuth),
  ).multiplyScalar(FRAME_DISTANCE);

  const position = orbitalPosition(
    worldsData[id].placement,
    0,
    new THREE.Vector3(),
  );
  return position.distanceTo(camera) - bodyDepthLayerFor(id);
}

describe("capas de profundidad del System Map 3D", () => {
  it("separa foreground, midground y background sin mover Gargantúa", () => {
    expect(bodyDepthLayerFor("gargantua")).toBe(0);

    // Del plano cercano al fondo. Cinco cuerpos, cinco distancias distintas:
    // si dos empataran volverían a leerse como calcomanías del mismo cristal.
    const order = [
      "ranger",
      "endurance",
      "edmunds",
      "miller",
      "tesseract",
    ] as const;
    expect([...order].sort()).toEqual(
      WORLD_IDS.filter((id) => id !== "gargantua")
        .slice()
        .sort(),
    );

    const distances = order.map(effectiveDistance);
    for (let i = 1; i < distances.length; i++) {
      expect(
        distances[i],
        `${order[i]} debería estar más lejos que ${order[i - 1]}`,
      ).toBeGreaterThan(distances[i - 1] + 5);
    }
  });

  it("cambia distancia y escala sin mover el centro proyectado", () => {
    const camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.1, 300);
    camera.position.set(0, 22, 72);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    const base = new THREE.Vector3(27, -4, 8);
    const baseProjection = base.clone().project(camera);
    const foreground = placeBodyOnDepthLayer(
      base,
      camera.position,
      8,
      new THREE.Vector3(),
    );
    const background = placeBodyOnDepthLayer(
      base,
      camera.position,
      -7,
      new THREE.Vector3(),
    );

    for (const layered of [foreground, background]) {
      const projected = layered.clone().project(camera);
      expect(projected.x).toBeCloseTo(baseProjection.x, 6);
      expect(projected.y).toBeCloseTo(baseProjection.y, 6);
    }
    expect(camera.position.distanceTo(foreground)).toBeCloseTo(
      camera.position.distanceTo(base) - 8,
      6,
    );
    expect(camera.position.distanceTo(background)).toBeCloseTo(
      camera.position.distanceTo(base) + 7,
      6,
    );
  });
});
