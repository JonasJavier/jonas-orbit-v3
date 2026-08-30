import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { worldsData, type WorldId } from "@/content/worlds.data";
import { createBody, disposeBody, type SceneBody } from "./bodies";

function bodyFor(id: Exclude<WorldId, "gargantua">): SceneBody {
  const world = worldsData[id];
  const body = createBody({
    id,
    visual: world.visual,
    accent: world.accent,
    secondary: world.secondary,
    placement: world.placement,
  });
  if (!body) throw new Error(`${id} no produjo geometría`);
  return body;
}

function measuredRadius(root: THREE.Object3D): number {
  const sphere = new THREE.Sphere();
  let radius = 0;
  root.updateMatrixWorld(true);
  root.traverse((node) => {
    const geometry = (node as Partial<THREE.Mesh>).geometry;
    if (!geometry) return;
    geometry.computeBoundingSphere();
    if (!geometry.boundingSphere) return;
    sphere.copy(geometry.boundingSphere).applyMatrix4(node.matrixWorld);
    radius = Math.max(radius, sphere.center.length() + sphere.radius);
  });
  return radius;
}

describe("cuerpos del Sistema Gargantúa", () => {
  it("construye identidades compuestas en vez de placeholders de una pieza", () => {
    const endurance = bodyFor("endurance");
    const cooper = bodyFor("cooper-station");
    const tesseract = bodyFor("tesseract");
    const ranger = bodyFor("ranger");

    try {
      expect(endurance.object.getObjectByName("endurance-hub-and-modules")).toBeDefined();
      expect(
        endurance.object.getObjectByName("endurance-spokes-and-partial-truss"),
      ).toBeDefined();
      expect(endurance.object.getObjectByName("endurance-navigation-lights")).toBeDefined();

      expect(cooper.object.getObjectByName("cooper-planet")).toBeDefined();
      expect(cooper.object.getObjectByName("cooper-rings")).toBeDefined();
      expect(cooper.object.getObjectByName("cooper-orbital-habitat")).toBeDefined();

      expect(tesseract.object.getObjectByName("tesseract-nested-frames")).toBeInstanceOf(
        THREE.LineSegments,
      );
      expect(tesseract.object.getObjectByName("tesseract-core")).toBeDefined();

      expect(ranger.object.getObjectByName("ranger-metallic-hull")).toBeDefined();
      expect(ranger.object.getObjectByName("ranger-violet-beacon")).toBeDefined();
    } finally {
      for (const body of [endurance, cooper, tesseract, ranger]) disposeBody(body);
    }
  });

  it("publica el radio geométrico real de cada modelo", () => {
    const ids = [
      "tesseract",
      "cooper-station",
      "miller",
      "endurance",
      "edmunds",
      "ranger",
    ] as const;

    for (const id of ids) {
      const body = bodyFor(id);
      try {
        expect(body.radius, id).toBeCloseTo(measuredRadius(body.object), 6);
      } finally {
        disposeBody(body);
      }
    }
  });

  it("limita el foco orbital a un arco alrededor del cuerpo", () => {
    const body = bodyFor("endurance");
    try {
      const geometry = (body.orbit as THREE.Mesh).geometry;
      const cue = geometry.getAttribute("aCue");
      const values = Array.from(cue.array as ArrayLike<number>);

      expect(values[0]).toBeCloseTo(1, 6);
      expect(Math.min(...values)).toBeCloseTo(0, 6);
      expect(values.filter((value) => value > 0.05).length).toBeLessThan(
        values.length / 3,
      );
    } finally {
      disposeBody(body);
    }
  });
});
