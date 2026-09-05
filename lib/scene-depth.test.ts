import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { bodyDepthLayerFor, placeBodyOnDepthLayer } from "./scene-depth";

describe("capas de profundidad del System Map 3D", () => {
  it("separa foreground, midground y background sin mover Gargantúa", () => {
    expect(bodyDepthLayerFor("gargantua")).toBe(0);

    expect(bodyDepthLayerFor("ranger")).toBeGreaterThan(
      bodyDepthLayerFor("endurance"),
    );
    expect(bodyDepthLayerFor("endurance")).toBeGreaterThan(
      bodyDepthLayerFor("edmunds"),
    );
    expect(bodyDepthLayerFor("edmunds")).toBeGreaterThan(
      bodyDepthLayerFor("miller"),
    );
    expect(bodyDepthLayerFor("miller")).toBeGreaterThan(
      bodyDepthLayerFor("tesseract"),
    );
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
