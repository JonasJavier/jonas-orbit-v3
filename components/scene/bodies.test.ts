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
      expect(
        endurance.object.getObjectByName("endurance-twelve-module-ring"),
      ).toBeDefined();
      expect(
        endurance.object.getObjectByName(
          "endurance-single-spoke-connectors-and-engines",
        ),
      ).toBeDefined();
      expect(
        endurance.object.getObjectByName("endurance-service-panels"),
      ).toBeDefined();
      expect(
        endurance.object.getObjectByName("endurance-airlock-lights"),
      ).toBeDefined();

      for (const name of [
        "endurance-twelve-module-ring",
        "endurance-single-spoke-connectors-and-engines",
        "endurance-service-panels",
        "endurance-airlock-lights",
      ]) {
        const mesh = endurance.object.getObjectByName(name) as THREE.Mesh;
        expect(mesh.geometry.getAttribute("position").count, name).toBeGreaterThan(0);
      }

      const enduranceRoot = endurance.object.getObjectByName(
        "endurance-twelve-module-ring",
      )?.parent;
      expect(enduranceRoot?.userData.enduranceArchitecture).toEqual({
        modules: 12,
        engineModules: 4,
        spokes: 1,
        dockedRangers: 2,
        dockedLanders: 2,
      });

      expect(cooper.object.getObjectByName("cooper-planet")).toBeDefined();
      expect(cooper.object.getObjectByName("cooper-rings")).toBeDefined();
      expect(cooper.object.getObjectByName("cooper-orbital-habitat")).toBeDefined();

      expect(tesseract.object.getObjectByName("tesseract-nested-frames")).toBeInstanceOf(
        THREE.LineSegments,
      );
      expect(tesseract.object.getObjectByName("tesseract-core")).toBeDefined();

      expect(ranger.object.getObjectByName("ranger-metallic-hull")).toBeDefined();
      expect(
        ranger.object.getObjectByName("ranger-heat-shield-and-engines"),
      ).toBeDefined();
      expect(ranger.object.getObjectByName("ranger-violet-beacon")).toBeDefined();

      const enduranceHull = endurance.object.getObjectByName(
        "endurance-twelve-module-ring",
      ) as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
      const rangerHull = ranger.object.getObjectByName(
        "ranger-metallic-hull",
      ) as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;

      for (const [name, mesh, textureName] of [
        ["Endurance", enduranceHull, "endurance-thermal-surface"],
        ["Ranger", rangerHull, "ranger-thermal-surface"],
      ] as const) {
        const texture = mesh.material.uniforms.uSurfaceMap.value as THREE.DataTexture;
        expect(texture, name).toBeInstanceOf(THREE.DataTexture);
        expect(texture.name, name).toBe(textureName);
        expect(texture.image.width, name).toBe(128);
        expect(texture.image.height, name).toBe(128);

        const masks = mesh.geometry.getAttribute("aSurfaceMask");
        expect(masks, `${name} no publicó máscaras de acabado`).toBeDefined();
        expect(
          Math.max(...Array.from(masks.array as ArrayLike<number>)),
          `${name} no diferencia sus piezas especiales`,
        ).toBeGreaterThanOrEqual(2);
      }
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

  it("mantiene la jerarquía de escala sin igualar todos los destinos", () => {
    const ids = [
      "tesseract",
      "cooper-station",
      "miller",
      "endurance",
      "edmunds",
      "ranger",
    ] as const;
    const bodies = Object.fromEntries(ids.map((id) => [id, bodyFor(id)])) as Record<
      (typeof ids)[number],
      SceneBody
    >;

    try {
      const secondaryAnchor = bodies.endurance.radius;
      const majorWorlds = [
        bodies["cooper-station"].radius,
        bodies.miller.radius,
        bodies.edmunds.radius,
      ];
      const distantObjects = [bodies.tesseract.radius, bodies.ranger.radius];

      expect(secondaryAnchor).toBeGreaterThan(Math.max(...majorWorlds));
      expect(Math.min(...majorWorlds)).toBeGreaterThan(Math.max(...distantObjects));
      expect(bodies.tesseract.radius).toBeGreaterThan(bodies.ranger.radius);
    } finally {
      for (const body of Object.values(bodies)) disposeBody(body);
    }
  });

  it("conserva los modelos compuestos en un presupuesto de batches pequeño", () => {
    const ids = [
      "tesseract",
      "cooper-station",
      "miller",
      "endurance",
      "edmunds",
      "ranger",
    ] as const;
    let batches = 1; // Quad de Gargantúa; los pases de post no son geometría de mundos.
    let vertices = 4;

    for (const id of ids) {
      const body = bodyFor(id);
      try {
        for (const root of [body.object, body.orbit]) {
          root.traverse((node) => {
            const renderable = node as Partial<THREE.Mesh>;
            if (!renderable.geometry) return;
            batches += 1;
            vertices += renderable.geometry.getAttribute("position")?.count ?? 0;
          });
        }
      } finally {
        disposeBody(body);
      }
    }

    // Endurance gana una familia material para paneles de servicio y Ranger un
    // vientre térmico separado: dos draws con lectura real, no greeble suelto.
    expect(batches).toBeLessThanOrEqual(23);
    expect(vertices).toBeLessThan(15_000);
  });

  it("anima localmente sin desplazar los destinos y es determinista", () => {
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
        const destination = body.object.position.clone();
        const model = body.object.children[0];
        const initial = model.quaternion.clone();

        body.spinAt(37);
        const first = model.quaternion.clone();
        body.spinAt(37);

        expect(body.object.position, id).toEqual(destination);
        expect(model.quaternion.equals(first), id).toBe(true);
        expect(first.equals(initial), id).toBe(false);
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
