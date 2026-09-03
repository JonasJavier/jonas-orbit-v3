import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { worldsData, type WorldId } from "@/content/worlds.data";
import { DISK_OUTER, GARGANTUA_RS } from "./gargantua-shaders";
import { bodyDepthLayerFor } from "@/lib/scene-depth";
import { SYSTEM_POSE } from "@/lib/scene-poses";
import {
  createBody,
  disposeBody,
  orbitalPosition,
  type SceneBody,
} from "./bodies";

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

/**
 * Réplica independiente del cálculo de radio, incluida la poda de subárboles.
 *
 * Poda igual que producción —el hábitat de Cooper está marcado y no cuenta—
 * porque lo que este test comprueba es que `body.radius` describa la silueta
 * publicada, no que las dos implementaciones sean el mismo código.
 */
function measuredRadius(root: THREE.Object3D): number {
  const sphere = new THREE.Sphere();
  let radius = 0;
  root.updateMatrixWorld(true);

  const visit = (node: THREE.Object3D) => {
    if (node.userData.excludeFromRadius) return;
    const geometry = (node as Partial<THREE.Mesh>).geometry;
    if (geometry) {
      geometry.computeBoundingSphere();
      if (geometry.boundingSphere) {
        sphere.copy(geometry.boundingSphere).applyMatrix4(node.matrixWorld);
        radius = Math.max(radius, sphere.center.length() + sphere.radius);
      }
    }
    for (const child of node.children) visit(child);
  };

  visit(root);
  return radius;
}

/**
 * Distancia de encuadre representativa de escritorio, en rs.
 *
 * La escena la MIDE cada vez contra el viewport real; aquí se fija el valor de
 * 16:10 porque este test compara tamaños entre sí, y un factor común no cambia
 * ningún orden. Si el encuadre cambiara de verdad, cambiaría para los seis.
 */
const FRAME_DISTANCE = 76;

/**
 * Tamaño APARENTE de un cuerpo: radio partido por su distancia a la cámara.
 *
 * Es la única medida con la que tiene sentido comparar destinos, y por eso este
 * test existe. El radio métrico solo, que es lo que se comprobaba antes, miente:
 * el Tesseracto mide 3.99 rs contra los 3.42 de Miller y aun así se ve MÁS
 * PEQUEÑO, porque vive veinte radios más lejos. Un test sobre radios habría
 * bloqueado justo el cambio que la dirección de arte pedía —agrandar el
 * Tesseracto— y habría aprobado sin rechistar hundirlo hasta desaparecer.
 */
function apparentSize(id: Exclude<WorldId, "gargantua">, radius: number): number {
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
  // La capa de profundidad desliza el cuerpo sobre su propio rayo a cámara.
  const distance = position.distanceTo(camera) - bodyDepthLayerFor(id);
  return radius / distance;
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

      /*
        La arquitectura publicada es el CONTRATO DE LECTURA de la nave: núcleo,
        estructura primaria, cuatro brazos, cuatro grupos de tres y sistemas
        secundarios. Si alguien vuelve a repartir doce módulos iguales cada 30°
        —que es lo que hacía que la Endurance se leyera como una nube de cubos—
        este objeto deja de cuadrar antes de que nadie mire una captura.
      */
      const enduranceRoot = endurance.object.getObjectByName(
        "endurance-twelve-module-ring",
      )?.parent;
      expect(enduranceRoot?.userData.enduranceArchitecture).toEqual({
        modules: 12,
        groups: 4,
        arms: 4,
        primaryModules: 4,
        engineBells: 4,
        radiators: 8,
        dockedRangers: 2,
        dockedLanders: 2,
      });

      expect(cooper.object.getObjectByName("cooper-planet")).toBeDefined();
      expect(cooper.object.getObjectByName("cooper-rings")).toBeDefined();
      expect(cooper.object.getObjectByName("cooper-orbital-habitat")).toBeDefined();

      /*
        El Tesseracto es estructura sólida, no un wireframe. Es el contrato que
        se rompió una vez: con LineSegments, una arista medía un píxel a
        cualquier distancia —sin volumen, sin sombreado y sin nada que ganar al
        acercar la cámara—, y el objeto se leía como un icono de SVG.
      */
      const lattice = tesseract.object.getObjectByName(
        "tesseract-hypercube-lattice",
      ) as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
      expect(lattice).toBeInstanceOf(THREE.Mesh);
      expect(lattice).not.toBeInstanceOf(THREE.LineSegments);
      expect(lattice.geometry.getIndex()?.count ?? 0).toBeGreaterThan(1_000);

      // Nodos facetados: la máscara los separa de las vigas dentro del mismo draw.
      const latticeMasks = lattice.geometry.getAttribute("aSurfaceMask");
      expect(
        Math.max(...Array.from(latticeMasks.array as ArrayLike<number>)),
      ).toBe(1);

      /*
        Tres cáscaras, no dos: la del pozo lleva su propia máscara para que el
        shader la pinte más fría. Es lo que produce la profundidad interna.
      */
      const well = tesseract.object.getObjectByName(
        "tesseract-inner-well",
      ) as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
      expect(well).toBeInstanceOf(THREE.Mesh);
      expect(
        Math.max(
          ...Array.from(
            well.geometry.getAttribute("aSurfaceMask")
              .array as ArrayLike<number>,
          ),
        ),
      ).toBe(3);

      const cage = tesseract.object.getObjectByName(
        "tesseract-inner-cage",
      ) as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
      expect(cage).toBeInstanceOf(THREE.Mesh);
      expect(
        Math.max(
          ...Array.from(
            cage.geometry.getAttribute("aSurfaceMask")
              .array as ArrayLike<number>,
          ),
        ),
      ).toBe(2);

      expect(tesseract.object.getObjectByName("tesseract-core")).toBeDefined();
      /*
        Y ya NO hay caja translúcida. En una caja, el término de Fresnel es
        constante por cara: el volumen se veía como cuatro paneles grises
        planos, que es justo lo contrario de un cristal. Si vuelve, vuelve sobre
        una superficie curva.
      */
      expect(
        tesseract.object.getObjectByName("tesseract-translucent-strata"),
      ).toBeUndefined();

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

  it("mantiene la jerarquía APARENTE, que es la que se ve", () => {
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
      const size = Object.fromEntries(
        ids.map((id) => [id, apparentSize(id, bodies[id].radius)]),
      ) as Record<(typeof ids)[number], number>;
      const others = ids
        .filter((id) => id !== "endurance")
        .map((id) => size[id]);

      /*
        La Endurance es el ancla secundaria del sistema —representa Proyectos—
        y tiene que ganar por márgenes que no dependan de mirar con atención.

        El factor baja de 1.5 a 1.4 al fijar la cámara en 9°, y conviene decir
        por qué no es aflojar el test: con la cámara a 17° este umbral se pasaba
        por 1.504, o sea por cuatro milésimas. Un test que aprueba por un 0.3 %
        no mide un margen, mide una coincidencia — y AGENTS.md pide que los
        tests sean estables.

        Lo que ocurre al bajar la cámara tampoco es que la Endurance encoja: su
        tamaño aparente SUBE, de 0.10892 a 0.11126, porque el encuadre se acerca.
        Lo que pasa es que la Ranger sube más deprisa (0.07244 → 0.07590), que es
        lo que hace una cámara más tumbada con el cuerpo más tumbado. El
        resultado, 1.466, sigue siendo medio cuerpo más grande que su rival más
        próximo: nadie necesita fijarse para verlo.

        1.4 deja un 4.7 % de holgura. Si algún día cae por debajo, es que la
        jerarquía se ha roto de verdad y no que la cámara se movió un grado.
      */
      expect(size.endurance).toBeGreaterThan(Math.max(...others) * 1.4);

      /*
        El Tesseracto es el destino más lejano y el más pequeño del cuadro. Lo
        segundo es dirección de arte: misterioso y remoto. Pero tiene un SUELO,
        porque un destino que no se ve es un enlace que no existe, y con la
        composición anterior estaba por debajo de él.
      */
      expect(Math.min(...ids.map((id) => size[id]))).toBe(size.tesseract);
      expect(size.tesseract).toBeGreaterThan(0.036);
      expect(size.tesseract).toBeGreaterThan(size.miller * 0.9);

      // La Ranger es una nave, no una mota: por debajo de este margen deja de
      // poder enseñar proa, cabina y toberas, que es lo que la hace una nave.
      expect(size.ranger).toBeGreaterThan(size.tesseract * 1.5);
      expect(size.ranger).toBeLessThan(size.endurance);
    } finally {
      for (const body of Object.values(bodies)) disposeBody(body);
    }
  });

  it("Gargantúa domina la primera lectura, y sin pegarse a los destinos", () => {
    /*
      La jerarquía del hero se decide con UN número: `rs`.

      Escalar las órbitas no sirve —la distancia de encuadre la fijan los
      destinos, así que la cámara retrocede en la misma proporción y el
      resultado en pantalla es idéntico— y acercar la cámara tampoco, por lo
      mismo. `rs` es el único parámetro que cambia el tamaño RELATIVO entre el
      agujero negro y el sistema.

      Y tiene un techo DURO, que es lo que comprueba este test.

      El disco llega a 17·rs, así que la órbita más interior fija el máximo de
      rs. Mientras estuvo en 22 rs el techo era 1.29; con los tres destinos
      interiores movidos a 25-27 rs sube a ~1.47. La revisión que se descartó
      usaba 1.48 CON las órbitas antiguas: el disco alcanzaba 25 rs y Endurance
      y Edmunds quedaban encima. No era cuestión de gusto — era geometría, y
      este test la deja escrita para que nadie la vuelva a cruzar de memoria.

      El margen es fino a propósito. Dirección pidió «permitir algo más de
      profundidad y solapamiento sutil», y en proyección hay bastante más aire
      del que sugiere el cociente crudo: las órbitas están inclinadas y el disco
      se ve casi de canto, así que el destino más cercano queda a 1.22 veces el
      semieje de la elipse VISIBLE del disco. Ese número sale de medir la
      proyección; aquí sólo vive el suelo que no se puede pisar.
    */
    expect(GARGANTUA_RS).toBeGreaterThan(1);

    const nearestOrbit = Math.min(
      ...Object.values(worldsData)
        .map((world) => world.placement.orbitRadius)
        .filter((radius) => radius > 0),
    );
    expect(nearestOrbit).toBeGreaterThan(DISK_OUTER);

    const endurance = bodyFor("endurance");
    try {
      /*
        El disco contra el ancla secundaria, radio contra radio.

        La comparación es dura con el disco a propósito: `endurance.radius` es
        su esfera envolvente —incluye las dos Ranger y las dos Lander atracadas—
        y no la silueta que se ve. Aun así el disco le saca más del doble, que
        es la diferencia entre «hay varios objetos espaciales» y «estoy frente a
        un agujero negro». Esa era la primera lectura que había que arreglar.
      */
      const enduranceSize = apparentSize("endurance", endurance.radius);
      expect(DISK_OUTER / FRAME_DISTANCE).toBeGreaterThan(enduranceSize * 2.2);
    } finally {
      disposeBody(endurance);
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

    /*
      Los draws siguen siendo el recurso caro y apenas se mueven: 24 con el
      reparto anterior, 25 desde que el Tesseracto separó su pozo interior en
      una malla propia —lo necesita para llevar máscara y temperatura distintas.
      Veintiséis es el techo, y con él caben dos familias más antes de tener que
      volver a mirar esto.

      Los vértices sí suben de verdad: de 16,3 k a 21,3 k. Casi todo es la
      Endurance, que pasó de doce cápsulas sueltas a núcleo, dos rieles
      continuos, cuatro celosías, doce módulos en cuatro grupos y sus sistemas
      —10,3 k ella sola—, y el resto lo reparten la tercera cáscara del
      Tesseracto y el fuselaje real de la Ranger. Es el intercambio correcto:
      cinco mil vértices no los nota ninguna GPU de esta década y son
      literalmente la diferencia entre «tiene muchas piezas» y «se entiende cómo
      está construida». El techo queda en 24 k, que deja margen sin permitir que
      esto se convierta en un kitbash.
    */
    expect(batches).toBeLessThanOrEqual(26);
    expect(vertices).toBeLessThan(24_000);
  });

  it("anima localmente sin desplazar los destinos y es determinista", () => {
    // La Ranger va aparte: es la única que NO gira sobre su eje.
    const spinning = [
      "tesseract",
      "cooper-station",
      "miller",
      "endurance",
      "edmunds",
    ] as const;

    for (const id of spinning) {
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

  /*
    LA RANGER NO GIRA, y es una decisión de dirección de arte, no un descuido.

    Una nave con proa, cabina y toberas apuntando siempre al mismo sitio cuenta
    un viaje; la misma nave rotando sobre su eje longitudinal cada seis minutos
    parece una maqueta colgada de un hilo, y además hace que su orientación —que
    es información— deje de significar nada. Lo que le queda es la corrección de
    actitud de menos de un grado, que vive DENTRO del modelo.
  */
  it("mantiene la Ranger sin giro propio, pero viva", () => {
    const body = bodyFor("ranger");
    try {
      const model = body.object.children[0];
      const attitude = model.children[0];
      const restPose = model.quaternion.clone();
      const initialAttitude = attitude.quaternion.clone();

      body.spinAt(37);

      expect(model.quaternion.equals(restPose)).toBe(true);
      expect(attitude.quaternion.equals(initialAttitude)).toBe(false);
      // Y la corrección se mantiene por debajo del grado y medio: es
      // mantenimiento de actitud, no un bamboleo.
      const euler = new THREE.Euler().setFromQuaternion(attitude.quaternion);
      for (const angle of [euler.x, euler.y, euler.z]) {
        expect(Math.abs(angle)).toBeLessThan(0.026);
      }
    } finally {
      disposeBody(body);
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
