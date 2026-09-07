import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { worldsData, type WorldId } from "@/content/worlds.data";
import { DISK_OUTER, GARGANTUA_RS } from "./gargantua-shaders";
import { bodyDepthLayerFor, placeBodyOnDepthLayer } from "@/lib/scene-depth";
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
 * Poda igual que producción —hoy ningún cuerpo la usa, pero el mecanismo queda
 * para futuros detalles lejanos— porque lo que este test comprueba es que
 * `body.radius` describa la silueta publicada, no que las dos implementaciones
 * sean el mismo código.
 *
 * Mide el VÉRTICE MÁS LEJANO, que es lo que dice el contrato de `modelRadius`.
 * Antes replicaba su implementación —centro de la esfera envolvente más su
 * radio—, y esa cota sólo coincide con la silueta cuando la geometría es
 * compacta. Con la estructura de placas del Tesseracto se separaban un 20 %, y
 * el test daba verde porque estaba comprobando el mismo error dos veces.
 */
function measuredRadius(root: THREE.Object3D): number {
  const vertex = new THREE.Vector3();
  let radius = 0;
  root.updateMatrixWorld(true);

  const visit = (node: THREE.Object3D) => {
    const geometry = (node as Partial<THREE.Mesh>).geometry;
    const position = geometry?.getAttribute("position");
    if (position) {
      /* Las plumas de propulsión no son silueta: son luz emitida, y hacerlas
         contar hinchaba el blanco de clic y la distancia de encuadre hacia el
         vacío que hay detrás de un motor. La producción las poda por máscara y
         aquí se poda igual — la coincidencia que este test comprueba es la del
         RESULTADO, no la de las dos implementaciones. */
      const mask = geometry?.getAttribute("aSurfaceMask");
      for (let index = 0; index < position.count; index++) {
        if (mask && mask.getX(index) > 7.5) continue;
        radius = Math.max(
          radius,
          vertex
            .fromBufferAttribute(position as THREE.BufferAttribute, index)
            .applyMatrix4(node.matrixWorld)
            .length(),
        );
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
  it("conserva el vacío central y dos extensiones selectivas en Endurance", () => {
    const body = bodyFor("endurance");
    try {
      const mesh = body.object.getObjectByName("endurance-twelve-module-ring") as THREE.Mesh;
      const position = mesh.geometry.getAttribute("position");
      const mask = mesh.geometry.getAttribute("aSurfaceMask");
      const hub = new THREE.Box3();
      const panels = Array.from({ length: 4 }, () => new THREE.Box3());
      const vertex = new THREE.Vector3();
      for (let i = 0; i < position.count; i++) {
        vertex.fromBufferAttribute(position, i);
        if (mask.getX(i) === 1 && Math.hypot(vertex.x, vertex.y) < 0.5) {
          hub.expandByPoint(vertex);
        }
        if (mask.getX(i) === 3) {
          const angle = Math.atan2(vertex.y, vertex.x);
          const quadrant = ((Math.round(angle / (Math.PI / 2)) % 4) + 4) % 4;
          panels[quadrant].expandByPoint(vertex);
        }
      }
      const hubSize = hub.getSize(new THREE.Vector3());
      expect(hubSize.x).toBeLessThan(0.42);
      expect(hubSize.z / hubSize.x).toBeGreaterThan(2);
      const lengths = panels.map((panel, quadrant) => {
        const size = panel.getSize(new THREE.Vector3());
        return quadrant % 2 === 0 ? size.x : size.y;
      });
      expect(lengths.filter((length) => length > 0.44)).toHaveLength(2);
      expect(lengths.filter((length) => length < 0.38)).toHaveLength(2);
    } finally {
      disposeBody(body);
    }
  });

  it("construye identidades compuestas en vez de placeholders de una pieza", () => {
    const endurance = bodyFor("endurance");
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
        radiators: 4,
        dockedRangers: 2,
        dockedLanders: 2,
        /*
          El pase de fase 1 amplía el contrato con la propulsión visible. Está
          aquí y no en una captura porque es exactamente la clase de detalle que
          alguien retira «porque no se nota»: ocho toberas diminutas y cuatro
          brasas dentro de las campanas son lo que separa una nave en servicio
          de una maqueta bien iluminada, y su coste es cero draws — comparten
          material con las balizas y se distinguen por máscara de vértice.

          Y son DOS encendidas de ocho, no ocho: ese número está en el contrato
          porque es la diferencia entre una nave corrigiendo actitud y una nave
          con luces de feria.
        */
        manoeuvringPods: 4,
        manoeuvringNozzles: 4,
        rcsNozzles: 10,
        firingNozzles: 2,
        warmLights: 9,
        technicalLights: 4,
      });

      /*
        EL TESSERACTO ES UN HIPERCUBO DE CRISTAL, y su contrato de lectura son
        tres piezas con papeles distintos: el cristal (las treinta y dos
        aristas con volumen), el trazo (el lápiz emisivo que las recorre) y las
        membranas (seis caras a contraluz). Tres draws, uno menos que el
        corredor que sustituye.

        Se comprueba que son MALLAS y que tienen caras porque esto se rompió una
        vez con LineSegments: una arista de línea mide un píxel a cualquier
        distancia, no tiene volumen y no admite sombreado — o sea, el wireframe
        grueso que la dirección de arte lleva cuatro pases evitando.
      */
      const crystalParts = ["tesseract-crystal-edges", "tesseract-drawing-light", "tesseract-glass-facets", "tesseract-crossing-occluder"]
        .map((name) => {
          const mesh = tesseract.object.getObjectByName(name) as THREE.Mesh<
            THREE.BufferGeometry,
            THREE.ShaderMaterial
          >;
          expect(mesh, name).toBeInstanceOf(THREE.Mesh);
          expect(mesh, name).not.toBeInstanceOf(THREE.LineSegments);
          expect(mesh.geometry.getIndex()?.count, name).toBeGreaterThan(0);
          return mesh;
        });
      const [crystalEdges, drawingLight, , crossingOccluder] = crystalParts;
      /*
        Y no hay una cuarta pieza escondida. El presupuesto del cuerpo es su
        parte más fácil de perder: cada idea nueva llega pidiendo «sólo un
        mesh más».
      */
      let crystalMeshes = 0;
      tesseract.object.traverse((node) => { if (node instanceof THREE.Mesh) crystalMeshes++; });
      expect(crystalMeshes).toBe(4);
      /*
        EL BLOOM-OFF TEST, en forma de aserción. El cristal es OPACO y escribe
        profundidad: su silueta no depende del trazo, que es aditivo y se apaga
        entero con `uEmission`. Si alguien vuelve transparente esta capa, el
        cuerpo pasa a existir sólo mientras el lápiz pasa por delante.
      */
      expect(crystalEdges.material.transparent).toBe(false);
      expect(crystalEdges.material.depthWrite).toBe(true);
      expect(crystalEdges.material.uniforms.uEmission).toBeDefined();
      expect(drawingLight.material.blending).toBe(THREE.AdditiveBlending);
      expect(drawingLight.material.depthWrite).toBe(false);
      /*
        LA CUARTA CAPA NO SE VE, Y ÉSA ES SU DEFINICIÓN. El tubo gordo de la
        oclusión existe para que una arista que pasa por detrás se interrumpa
        unos píxeles alrededor del cruce en vez de justo debajo. En el momento
        en que escriba color deja de ser un auxiliar de profundidad y pasa a ser
        un contorno grueso alrededor de cada arista: la jaula, otra vez.

        Y va la PRIMERA. Escribir profundidad después del cristal no serviría de
        nada, porque para entonces el cristal ya se dibujó.
      */
      expect(crossingOccluder.material.colorWrite).toBe(false);
      expect(crossingOccluder.material.depthWrite).toBe(true);
      expect(crossingOccluder.renderOrder).toBeLessThan(crystalEdges.renderOrder);
      /*
        Lo retirado NO vuelve: el corredor de marcos y sus umbrales contaban
        una arquitectura recorrible, que es lo contrario de una figura de
        cuatro dimensiones proyectada.
      */
      for (const retired of ["tesseract-shell", "tesseract-mid-frames", "tesseract-deep-frames", "tesseract-threshold"]) {
        expect(tesseract.object.getObjectByName(retired), retired).toBeUndefined();
      }

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
      for (const body of [endurance, tesseract, ranger]) disposeBody(body);
    }
  });

  it("publica el radio geométrico real de cada modelo", () => {
    const ids = [
      "tesseract",
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
        El Tesseracto sigue siendo lejano y secundario. Lo que hay que impedir
        son las dos salidas fáciles: volverlo una mota, o hacerlo crecer para
        tapar una geometría ilegible.

        ── Por qué esto ya no se mide contra Miller (2026-09-04) ──────────────

        Antes la condición era `tesseract < miller · 1.15`. Miller era el cuerpo
        más pequeño y estaba quieto, así que servía de patrón. Dejó de estarlo:
        la recomposición de los seis destinos lo movió dos veces, y las dos
        veces saltó este test SIN QUE EL TESSERACTO HUBIERA CAMBIADO. Un test
        que se rompe cuando se mueve otro cuerpo no está midiendo el objeto que
        dice medir — está acoplando una garantía del MODELO a una variable de
        COMPOSICIÓN, y obliga a distorsionar la escena para volver a pasar.

        Se pinta lo que de verdad se quiere garantizar:

        1. El radio publicado del modelo, que es donde vive «ni mota ni
           inflado» y no depende de dónde esté el cuerpo.
        2. Un suelo absoluto de tamaño aparente, por si alguien lo manda a
           quince radios de distancia en vez de encogerlo.
        3. Su sitio en la jerarquía: por encima del planeta más lejano y por
           debajo de la Ranger, que es el techo que lo separa de dominar. Entre
           medias queda Edmunds, y que la esfera del Tesseracto la supere por
           un 2 % es precisamente lo que dice el párrafo de arriba: esa esfera
           es casi toda vacío entre vigas, no masa.

        La legibilidad se resolvió por forma (menos piezas, vigas más gruesas,
        vacío mayor), que es lo que pidió dirección.
      */
      /* La banda subió de [4.6, 5.0] a [4.8, 5.3] el 2026-09-04 —dirección pidió
         entre un 5 y un 8 % más de presencia para el Tesseracto, y `size` pasó
         de 2.7 a 2.87— y vuelve a [4.55, 5.05] el 2026-09-05, cuando el pase de
         autoridad de Gargantúa le quitó ese 5.6 % (`size` 2.87 → 2.71).

         Bajarla no es aflojar el test: la banda prohíbe que el cuerpo crezca o
         encoja sin que nadie lo decida, y aquí lo decidió el dueño. Lo que sí se
         conserva intacto es el resto del bloque —el suelo aparente y la
         jerarquía contra Miller, Edmunds y la Ranger—, que es donde vive de
         verdad «ni mota ni inflado». Sigue siendo una banda, no un número.

         El suelo baja otra vez a 4.47 el 2026-09-06 (§14 decies), cuando el
         dueño pide el 2 % que el tercer recorte dejó a deber: 4.667 → 4.574.
         Lo que se re-basa es el suelo, y lo que se conserva es el MARGEN —0.117
         rs antes, 0.104 ahora—, que es la parte que de verdad vigila. Con dos
         centésimas de holgura la banda no protege nada: se rompería sola al
         primer retoque de geometría, y la V3 del Tesseracto ya está pedida. */
      expect(bodies.tesseract.radius).toBeGreaterThan(4.47);
      expect(bodies.tesseract.radius).toBeLessThan(5.05);
      expect(size.tesseract).toBeGreaterThan(0.035);

      expect(Math.min(...ids.map((id) => size[id]))).toBe(size.miller);
      expect(size.tesseract).toBeGreaterThan(size.miller);

      // La Ranger es una nave, no una mota: por debajo de este margen deja de
      // poder enseñar proa, cabina y toberas, que es lo que la hace una nave.
      expect(size.ranger).toBeGreaterThan(size.tesseract);
      expect(size.ranger).toBeLessThan(size.endurance * 0.65);
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

    // El presupuesto incluye cinco cuerpos secundarios y el quad de Gargantúa.
    expect(batches).toBeLessThanOrEqual(20);
    expect(vertices).toBeLessThan(19_500);
  });

  it("anima localmente sin desplazar los destinos y es determinista", () => {
    // La Ranger y el Tesseracto van aparte: son los dos que NO
    // giran sobre su eje, cada uno por su motivo. Ver sus tests dedicados.
    const spinning = ["miller", "endurance", "edmunds"] as const;

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

  it("reconfigura el cristal sin mover el destino, inflar el radio ni crear buffers", () => {
    const body = bodyFor("tesseract");
    try {
      const model = body.object.children[0];
      const destination = body.object.position.clone();
      const mesh = body.object.getObjectByName("tesseract-crystal-edges") as THREE.Mesh;
      const attribute = mesh.geometry.getAttribute("position");
      const initial = Array.from(attribute.array);
      const rootPose = model.quaternion.clone();
      for (let seconds = 0; seconds <= 120; seconds += 0.5) {
        body.spinAt(seconds);
        expect(body.object.position).toEqual(destination);
        expect(model.quaternion.equals(rootPose)).toBe(true);
        expect(mesh.geometry.getAttribute("position")).toBe(attribute);
        expect(measuredRadius(body.object)).toBeLessThanOrEqual(body.radius + 0.00001);
      }
      body.spinAt(6);
      const sample = Array.from(attribute.array);
      expect(sample).not.toEqual(initial);
      body.spinAt(21600);
      expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
      expect(measuredRadius(body.object)).toBeLessThanOrEqual(body.radius + 0.00001);
      body.spinAt(6);
      expect(Array.from(attribute.array)).toEqual(sample);
    } finally {
      disposeBody(body);
    }
  });

  it("mueve geometría interior visible a escala hero en tres a siete segundos", () => {
    const body = bodyFor("tesseract");
    try {
      // Vista de referencia independiente del renderer: la misma pose canónica
      // y distancia representativa que el test de jerarquía, en un hero 1440×860.
      // Se miden píxeles CSS de vértices reales, sin usar emisión ni un glow que
      // pudiera hacer pasar una estructura inmóvil por una animación visible.
      const width = 1440;
      const height = 860;
      const camera = new THREE.PerspectiveCamera(SYSTEM_POSE.fov, width / height, 0.1, 400);
      const elevation = THREE.MathUtils.degToRad(SYSTEM_POSE.elevation);
      const azimuth = THREE.MathUtils.degToRad(SYSTEM_POSE.azimuth);
      camera.position.set(
        Math.cos(elevation) * Math.sin(azimuth),
        Math.sin(elevation),
        Math.cos(elevation) * Math.cos(azimuth),
      ).multiplyScalar(FRAME_DISTANCE);
      camera.lookAt(0, 0, 0);
      camera.rotateZ(SYSTEM_POSE.roll);
      camera.updateMatrixWorld(true);
      const position = orbitalPosition(worldsData.tesseract.placement, 0, new THREE.Vector3());
      placeBodyOnDepthLayer(position, camera.position, bodyDepthLayerFor("tesseract"), body.object.position);
      const names = ["tesseract-crystal-edges", "tesseract-drawing-light", "tesseract-glass-facets"];
      const meshes = names.map((name) => {
        const mesh = body.object.getObjectByName(name);
        if (!(mesh instanceof THREE.Mesh)) throw new Error(`falta ${name}`);
        return mesh;
      });
      const projectedAt = (seconds: number) => {
        body.spinAt(seconds);
        body.object.updateMatrixWorld(true);
        return meshes.map((mesh) => {
          const points: THREE.Vector2[] = [];
          const vertices = mesh.geometry.getAttribute("position");
          for (let index = 0; index < vertices.count; index++) {
            const point = new THREE.Vector3().fromBufferAttribute(vertices, index).applyMatrix4(mesh.matrixWorld).project(camera);
            points.push(new THREE.Vector2(point.x * width / 2, point.y * height / 2));
          }
          return points;
        });
      };
      for (const start of [0, 7, 14, 21]) {
        const before = projectedAt(start);
        const travel = names.map(() => 0);
        for (const after of [projectedAt(start + 3), projectedAt(start + 7)]) {
          for (let group = 0; group < meshes.length; group++) {
            const distances = before[group].map((point, vertex) => point.distanceTo(after[group][vertex])).sort((a, b) => a - b);
            // El percentil 75 exige que se mueva una parte sustancial del marco,
            // no sólo un vértice aislado o una punta fuera del campo visible.
            travel[group] = Math.max(travel[group], distances[Math.floor(distances.length * 0.75)]);
          }
        }
        for (let group = 0; group < meshes.length; group++) {
          expect(travel[group], `${names[group]} a partir de ${start}s`).toBeGreaterThan(1);
        }
      }
    } finally {
      disposeBody(body);
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

    Los cinco cuerpos comparten un único programa, así que lo que se paga —en
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

  /*
    LA RANGER TIENE QUE ESTAR ILUMINADA, y hasta hoy no lo estaba.

    Es el cuerpo más sensible del sistema a su propia actitud: es aerodinámico,
    así que casi toda su superficie mira al mismo sitio, y basta con inclinarlo
    un poco para que pase de encarar la luz a darle la espalda. La Endurance,
    con doce módulos, siempre tiene caras encaradas; la Ranger no.

    Su actitud se escribió como una constante calculada A MANO contra la
    posición que ocupaba entonces. La recomposición de seis destinos la movió,
    nadie rehízo el cálculo, y el dorso quedó en n·l = −0.09: de espaldas a la
    única fuente del sistema. El síntoma en pantalla era una nave azul oscura y
    plana, y lo engañoso es que parecía un problema de material — con el casco
    forzado a blanco puro se veía exactamente igual de oscura.

    Este test mide la geometría de luz contra la posición REAL, así que la
    próxima recomposición que vuelva a dejarla a oscuras falla aquí y no tres
    semanas después en una captura.

    Los suelos son flojos a propósito: en este sitio la luz y la cámara están a
    153°, así que ninguna actitud puede tener las dos cosas y lo que se fija es
    el compromiso, no un número bonito. El dorso va en la bisectriz, que es su
    óptimo: reparte n·l y n·v a partes iguales. Si alguien quiere más área vista
    tendrá que pagarlo en luz, y este test dice cuánto.
  */
  it("mantiene la Ranger encarada a la luz y a la cámara a la vez", () => {
    const camera = new THREE.Vector3(
      Math.cos(THREE.MathUtils.degToRad(SYSTEM_POSE.elevation)) *
        Math.sin(THREE.MathUtils.degToRad(SYSTEM_POSE.azimuth)),
      Math.sin(THREE.MathUtils.degToRad(SYSTEM_POSE.elevation)),
      Math.cos(THREE.MathUtils.degToRad(SYSTEM_POSE.elevation)) *
        Math.cos(THREE.MathUtils.degToRad(SYSTEM_POSE.azimuth)),
    ).multiplyScalar(FRAME_DISTANCE);

    const position = new THREE.Vector3();
    placeBodyOnDepthLayer(
      orbitalPosition(worldsData.ranger.placement, 0, new THREE.Vector3()),
      camera,
      bodyDepthLayerFor("ranger"),
      position,
    );

    const body = bodyFor("ranger");
    try {
      // Gargantúa está en el origen: la luz llega desde ahí, siempre.
      const toLight = position.clone().negate().normalize();
      const toCamera = camera.clone().sub(position).normalize();
      const back = new THREE.Vector3(0, 1, 0).applyEuler(body.object.rotation);

      /* El terminador satura a partir de 0.34 y arranca en −0.08: por debajo de
         0.15 el dorso entra en penumbra y la nave vuelve a ser una silueta. */
      expect(back.dot(toLight)).toBeGreaterThan(0.15);
      /* Y por debajo de 0.15 de cámara se vería de canto: nave iluminada que no
         se puede leer, que es el otro extremo del mismo error. */
      expect(back.dot(toCamera)).toBeGreaterThan(0.15);
    } finally {
      disposeBody(body);
    }
  });
});
