import { readFileSync } from "node:fs";
import { join } from "node:path";
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
          "endurance-radial-trusses-connectors-and-engines",
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
        "endurance-radial-trusses-connectors-and-engines",
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
        primaryModules: 4,
        spokes: 4,
        dockedRangers: 2,
        dockedLanders: 2,
      });

      expect(cooper.object.getObjectByName("cooper-planet")).toBeDefined();
      expect(cooper.object.getObjectByName("cooper-rings")).toBeDefined();
      expect(cooper.object.getObjectByName("cooper-orbital-habitat")).toBeDefined();

      expect(tesseract.object.getObjectByName("tesseract-nested-frames")).toBeInstanceOf(
        THREE.LineSegments,
      );
      expect(
        tesseract.object.getObjectByName("tesseract-translucent-strata"),
      ).toBeDefined();
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
      expect(secondaryAnchor).toBeGreaterThan(
        Math.max(...majorWorlds, bodies.ranger.radius),
      );
      // Ranger deja de ser la mota más pequeña, pero sigue claramente
      // subordinada a Endurance. El Tesseracto conserva la lectura lejana.
      expect(bodies.ranger.radius).toBeGreaterThan(4);
      expect(bodies.ranger.radius).toBeGreaterThan(bodies.tesseract.radius);
      expect(Math.min(...majorWorlds)).toBeGreaterThan(bodies.tesseract.radius);
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
            const materials = Array.isArray(renderable.material)
              ? renderable.material
              : renderable.material
                ? [renderable.material]
                : [];
            for (const material of materials) {
              const doubleTransparentPass =
                material.transparent &&
                material.side === THREE.DoubleSide &&
                !material.forceSinglePass;
              batches += doubleTransparentPass ? 2 : 1;
            }
            vertices += renderable.geometry.getAttribute("position")?.count ?? 0;
          });
        }
      } finally {
        disposeBody(body);
      }
    }

    // El Tesseracto gana una única familia translúcida para profundidad real;
    // sigue siendo un draw fusionado, no una pila de paneles independientes.
    expect(batches).toBeLessThanOrEqual(24);
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

  /*
    PRESUPUESTO DE RUIDO DEL SHADER.

    Los seis cuerpos comparten un único programa, así que lo que se paga —en
    compilación y por píxel— es el número de SITIOS de llamada a fbm, no el de
    materiales. Cada llamada son cuatro octavas por ocho hash: 32 evaluaciones.

    El techo está medido, no estimado. Con dieciséis sitios, montar la escena en
    el runtime software que usa CI pasaba de 1,7 s a entre 46 y 60 s con tres
    workers en paralelo, y A28 llegaba a agotar su timeout de 30 s. En una GPU
    real no se nota; por eso este test existe: es la única red que atrapa la
    regresión antes de que salga como un E2E intermitente.

    Si hace falta más detalle, el camino es noise() de una octava —que a alta
    frecuencia se ve igual— y no una llamada más a fbm.
  */
  it("mantiene el presupuesto de ruido del shader de cuerpos", () => {
    // Vitest corre desde la raíz del repo: en jsdom `import.meta.url` no es
    // una URL de archivo, así que la ruta se compone desde el cwd.
    const source = readFileSync(
      join(process.cwd(), "components/scene/bodies.ts"),
      "utf8",
    );
    const start = source.indexOf("const BODY_FRAGMENT");
    // El literal de plantilla acaba en su propio backtick de cierre.
    const shader = source.slice(start, source.indexOf("\n`;", start));
    const callSites =
      (shader.match(/fbm\(/g) ?? []).length -
      // La definición misma no es un sitio de llamada.
      (shader.match(/float fbm\(/g) ?? []).length;

    expect(callSites).toBeLessThanOrEqual(12);
  });
});
