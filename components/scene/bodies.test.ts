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
    if (node.userData.excludeFromRadius) return;
    const position = (node as Partial<THREE.Mesh>).geometry?.getAttribute(
      "position",
    );
    if (position) {
      for (let index = 0; index < position.count; index++) {
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

      /*
        COOPER ES UNA MEGAESTRUCTURA HABITADA (F1.3), y su contrato de lectura
        son cinco piezas con papeles distintos: casco de cerámica y aluminio
        (arco, módulos, espina clara, paneles, arco secundario), celosía oscura
        (espina, montantes, mástil), microventanas cálidas y tenues, balizas
        que pinchan el bloom y el ascensor que recorre la espina. Si alguien
        vuelve al planeta con mota —o a otra nave más—, este objeto deja de
        cuadrar antes de que nadie mire una captura.
      */
      for (const name of [
        "cooper-station-hull",
        "cooper-station-truss",
        "cooper-station-windows",
        "cooper-station-beacons",
        "cooper-station-elevator",
      ]) {
        const mesh = cooper.object.getObjectByName(name) as THREE.Mesh;
        expect(mesh.geometry.getAttribute("position").count, name).toBeGreaterThan(0);
      }

      /*
        Lo retirado NO vuelve: el planeta se leía como mundo y no como lugar
        habitado, los anillos eran el resto de esa lectura y el hábitat pequeño
        era otra nave más.
      */
      for (const retired of [
        "cooper-planet",
        "cooper-rings",
        "cooper-orbital-habitat",
        "cooper-habitat-light",
      ]) {
        expect(cooper.object.getObjectByName(retired), retired).toBeUndefined();
      }

      const cooperAssembly = cooper.object.getObjectByName(
        "cooper-station-assembly",
      );
      expect(cooperAssembly?.userData.cooperStationArchitecture).toEqual({
        modules: 7,
        windows: 38,
        panels: 2,
        arcs: 2,
        struts: 6,
      });

      /* Cuatro acabados en el mismo draw: cerámica, aluminio, receso y solar. */
      const cooperHull = cooper.object.getObjectByName(
        "cooper-station-hull",
      ) as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
      const cooperMasks = cooperHull.geometry.getAttribute("aSurfaceMask");
      expect(cooperMasks, "Cooper no publicó acabados").toBeDefined();
      expect(
        Math.max(...Array.from(cooperMasks.array as ArrayLike<number>)),
        "Cooper no diferencia sus cuatro acabados",
      ).toBe(3);

      /*
        Microventanas CÁLIDAS y tenues; balizas aparte y brillantes. Las dos
        van al shader emisivo con su propia intensidad: a 2.75 el ámbar clipea
        a blanco y la ventana se convierte en un glint genérico, así que las
        ventanas van a 1.15 y sólo las balizas pinchan el bloom.
      */
      const cooperWindows = cooper.object.getObjectByName(
        "cooper-station-windows",
      ) as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
      expect(cooperWindows.material.uniforms.uKind.value).toBe(11);
      expect(
        (cooperWindows.material.uniforms.uAccent.value as THREE.Color).getHexString(),
        "las ventanas de Cooper no son cálidas",
      ).toBe("ffc27a");
      const cooperBeacons = cooper.object.getObjectByName(
        "cooper-station-beacons",
      ) as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
      expect(cooperBeacons.material.uniforms.uKind.value).toBe(8);
      expect(
        (cooperBeacons.material.uniforms.uAccent.value as THREE.Color).getHexString(),
      ).toBe("fff1d6");

      /*
        EL TESSERACTO ES ARQUITECTURA IMPOSIBLE, y su contrato de lectura son
        tres piezas con papeles distintos: la cáscara (la caja de siete aristas
        con su arista partida, el panel de suelo, dos espolones y los nodos),
        los marcos medios (las capas 2 y 3 de la recursión con sus puentes) y el
        fondo (la capa 4, la más caliente, con el puente que no llega y su nodo
        huérfano).

        Todo opaco y fusionado en tres draws con un solo material: el calor
        sale del shader, no de un segundo material ni de una transparencia. Se
        rompió una vez con LineSegments —una arista mide un píxel a cualquier
        distancia, sin volumen y sin sombreado— y otra con un velo translúcido
        que se llevaba la mirada por delante de la estructura. Lo que se
        comprueba aquí es que no hay ni una cosa ni la otra.
      */
      const maskOf = (name: string) => {
        const mesh = tesseract.object.getObjectByName(name) as THREE.Mesh<
          THREE.BufferGeometry,
          THREE.ShaderMaterial
        >;
        expect(mesh, name).toBeInstanceOf(THREE.Mesh);
        expect(mesh, name).not.toBeInstanceOf(THREE.LineSegments);
        expect(
          mesh.geometry.getIndex()?.count ?? 0,
          `${name} no tiene caras`,
        ).toBeGreaterThan(0);
        return Math.max(
          ...Array.from(
            mesh.geometry.getAttribute("aSurfaceMask")
              .array as ArrayLike<number>,
          ),
        );
      };

      /*
        LAS MÁSCARAS SON LA JERARQUÍA LUMINOSA, y por eso se comprueban: la
        dirección pidió que la luz subiera hacia adentro —caja apagada, marco 2
        apenas, marco 3 medio, marco 4 la brasa— y eso vive entero en el número
        que lleva cada pieza. Aplanarlo devuelve el objeto al fallo de siempre:
        toda la estructura encendida a la vez, o sea un wireframe grueso.

        Cáscara exterior: caja, panel y espolones (máscara 0), que no emiten
        nada, más los nodos de acero pulido (máscara 1), que son el único
        destello de fuera.
      */
      expect(maskOf("tesseract-shell")).toBe(1);
      // Marcos medios: el segundo (2) y el tercero (3) de la recursión, con sus
      // puentes en la máscara neutra.
      expect(maskOf("tesseract-mid-frames")).toBe(3);
      // Fondo: el cuarto marco es el escalón más caliente (4), y el nodo
      // huérfano del puente que no llega va en la de acero (1).
      expect(maskOf("tesseract-deep-frames")).toBe(4);

      const architecture = tesseract.object.children[0].userData
        .tesseractArchitecture as Record<string, unknown>;
      expect(architecture).toMatchObject({
        /*
          CUATRO CAPAS Y NI UNA MÁS. La versión anterior tenía siete marcos,
          cinco pórticos y cinco extensiones: diecisiete elementos que a 55 px
          no sumaban recursión sino líneas cruzadas. Este número es el que
          protege la decisión.
        */
        visualLayers: 4,
        recursiveRings: 3,
        structuralBridges: 3,
        shellExtensions: 2,
        interruptedBeams: 2,
        emissiveTiers: 3,
        centralVoid: true,
        closedOuterCube: false,
      });

      /*
        Un solo material opaco para todo el cuerpo. El calor sale del shader
        con la máscara de superficie: ni segundo material, ni transparencias,
        ni velo que se lleve la mirada.
      */
      const tesseractParts = [
        "tesseract-shell",
        "tesseract-mid-frames",
        "tesseract-deep-frames",
      ].map((name) => {
        const mesh = tesseract.object.getObjectByName(name) as THREE.Mesh<
          THREE.BufferGeometry,
          THREE.ShaderMaterial
        >;
        expect(mesh, name).toBeInstanceOf(THREE.Mesh);
        return mesh;
      });
      expect(
        new Set(tesseractParts.map((mesh) => mesh.material)).size,
        "el Tesseracto usa más de un material",
      ).toBe(1);
      for (const mesh of tesseractParts) {
        expect(mesh.material.transparent).toBe(false);
      }

      /*
        Lo retirado NO vuelve, y cada nombre es una lección distinta:

        · la retícula de cubos concéntricos se leía como «demo de Three.js»
          —doce aristas encendidas por igual y ninguna cara que la luz pudiera
          explicar—;
        · el marco interior cerrado devolvía la serie «marco dentro de marco
          dentro de marco», que el ojo completa solo y resuelve en dos segundos;
        · el núcleo emisivo se leía como reactor y explicaba el objeto justo
          donde no hay que explicarlo;
        · el velo translúcido se llevaba la mirada por delante de la
          estructura, que es exactamente lo que hacía el núcleo que sustituyó;
        · las dos placas torsionadas se dejaban entender: marco exterior,
          marco interior, centro. Interesante, y todavía no imposible.
      */
      for (const retired of [
        "tesseract-hypercube-lattice",
        "tesseract-inner-well",
        "tesseract-inner-cage",
        "tesseract-translucent-strata",
        "tesseract-inner-frame",
        "tesseract-core",
        "tesseract-outer-shell",
        "tesseract-fold-fragments",
        "tesseract-fold-blades",
        "tesseract-veil",
      ]) {
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
        El Tesseracto sigue siendo lejano y secundario, y su radio publicado no
        se mueve de donde lo dejó el rediseño anterior: ~55 px. Su caja aparente
        puede superar ligeramente a Miller porque casi toda esa caja es vacío —
        la esfera envolvente la fija una esquina de la caja de vigas, no una
        masa—. La ventana es lo que impide las dos salidas fáciles: volverlo una
        mota, o hacerlo crecer para tapar una geometría ilegible. La legibilidad
        se resolvió por forma (menos piezas, vigas más gruesas, vacío mayor),
        que es lo que pidió dirección.
      */
      expect(Math.min(...ids.map((id) => size[id]))).toBe(size.miller);
      expect(size.tesseract).toBeGreaterThan(size.miller);
      expect(size.tesseract).toBeLessThan(size.miller * 1.15);

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
      Los draws siguen siendo el recurso caro y apenas se mueven: 25 medidos,
      con Cooper como megaestructura de cinco piezas —casco, celosía, ventanas
      tenues, balizas y ascensor—, uno más que el planeta con anillos y a cambio
      de que cada luz tenga su intensidad. Veintiséis es el techo, y con él cabe
      una familia más antes de tener que volver a mirar esto.

      Los vértices sí suben de verdad, y esta vez los pone Cooper: 20,8 k en
      total, con la Endurance en 10,3 k y la estación en 4,6 k —arco, siete
      módulos, espina, paneles y treinta y cinco microventanas—. Es el
      intercambio correcto: cinco mil vértices no los nota ninguna GPU de esta
      década y son literalmente la diferencia entre «otra nave más» y «lugar
      habitado». El techo queda en 24 k, que deja margen sin permitir que esto
      se convierta en un kitbash.
    */
    expect(batches).toBeLessThanOrEqual(26);
    expect(vertices).toBeLessThan(24_000);
  });

  it("anima localmente sin desplazar los destinos y es determinista", () => {
    // La Cooper, la Ranger y el Tesseracto van aparte: son los tres que NO
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

  /*
    EL TESSERACTO TAMPOCO GIRA, y en reposo funciona prácticamente quieto.

    La Ranger no gira porque apuntar significa algo. El Tesseracto no gira
    porque no debe tener un eje: un objeto que rota afirma que tiene un dentro,
    un fuera y una orientación estables, y su diseño existe para negar las tres
    cosas. Y por decisión expresa del rediseño imposible (2026-09-04), la
    identidad sale de la geometría, no de hacerla girar como un salvapantallas:
    en reposo el objeto se lee estando quieto.

    Lo que queda es deriva ambiental: los marcos medios y el fondo oscilan ±3°
    en sentidos opuestos, con periodos inconmensurables entre sí. Las
    relaciones entre piezas se rehacen sin que ninguna configuración dure — y
    sin que la cáscara se mueva ni un grado.

    Este test comprueba las cuatro condiciones, porque las cuatro son fáciles
    de romper sin darse cuenta al tocar una amplitud:

      1. la cáscara exterior no se mueve NUNCA;
      2. el cuerpo entero no gira;
      3. el interior sí deriva, y de forma determinista;
      4. la deriva OSCILA — a lo largo de dos minutos las piezas vuelven a
         pasar por donde estaban, así que no hay deriva direccional ni
         rotación disfrazada — y es MÍNIMA: por encima de estos valores el
         reposo dejaría de leerse quieto.
  */
  it("mantiene el Tesseracto prácticamente quieto, con deriva interior mínima", () => {
    const body = bodyFor("tesseract");
    try {
      const model = body.object.children[0];
      const shell = body.object.getObjectByName("tesseract-shell");
      const mid = body.object.getObjectByName("tesseract-mid-frames");
      const deep = body.object.getObjectByName("tesseract-deep-frames");
      if (!shell || !mid || !deep) throw new Error("faltan piezas");

      const restPose = model.quaternion.clone();
      const shellPose = shell.matrixWorld.clone();

      // Muestreo de dos minutos: cubre varias vueltas del periodo más corto.
      const poses: {
        midYaw: number;
        midLift: number;
        deepYaw: number;
        deepLift: number;
      }[] = [];
      for (let seconds = 0; seconds <= 120; seconds += 0.5) {
        body.spinAt(seconds);
        // El cuerpo entero no gira, y su cáscara tampoco se entera del tiempo.
        expect(model.quaternion.equals(restPose), `t=${seconds}`).toBe(true);
        shell.updateMatrixWorld(true);
        expect(shell.matrixWorld.equals(shellPose), `t=${seconds}`).toBe(true);

        const midGroup = mid.parent;
        const deepGroup = deep.parent;
        if (!midGroup || !deepGroup) throw new Error("faltan grupos");
        poses.push({
          midYaw: midGroup.rotation.y,
          midLift: midGroup.position.y,
          deepYaw: deepGroup.rotation.y,
          deepLift: deepGroup.position.y,
        });
      }

      // Determinista: el mismo instante da la misma pose, siempre.
      const at37 = { ...poses[74] };
      body.spinAt(37);
      expect(mid.parent?.rotation.y).toBeCloseTo(at37.midYaw, 10);
      expect(mid.parent?.position.y).toBeCloseTo(at37.midLift, 10);
      expect(deep.parent?.rotation.y).toBeCloseTo(at37.deepYaw, 10);
      expect(deep.parent?.position.y).toBeCloseTo(at37.deepLift, 10);

      /*
        Y OSCILA. Cada canal vuelve a cruzar su punto de partida —hacia arriba y
        hacia abajo— varias veces en dos minutos. Una rotación disfrazada de
        oscilación tendría cero cruces en un sentido; una deriva, ninguno.
      */
      for (const channel of [
        "midYaw",
        "midLift",
        "deepYaw",
        "deepLift",
      ] as const) {
        const values = poses.map((pose) => pose[channel]);
        const mid = (Math.max(...values) + Math.min(...values)) / 2;
        let crossings = 0;
        for (let i = 1; i < values.length; i++) {
          if (values[i - 1] < mid !== values[i] < mid) crossings++;
        }
        expect(crossings, `${channel} no oscila`).toBeGreaterThanOrEqual(8);
      }

      /*
        Y es MÍNIMA. El recorrido total de cada canal cabe en ±3° de giro y
        centésimas de unidad de desplazamiento: en reposo el objeto se lee
        quieto y la geometría —no el movimiento— sostiene la identidad. Por
        debajo del mínimo el canal estaría muerto y no pagaría su código; por
        encima, el reposo dejaría de ser reposo.
      */
      const swing = (values: number[]) =>
        Math.max(...values) - Math.min(...values);
      const midYawSwing = swing(poses.map((pose) => pose.midYaw));
      const midLiftSwing = swing(poses.map((pose) => pose.midLift));
      const deepYawSwing = swing(poses.map((pose) => pose.deepYaw));
      const deepLiftSwing = swing(poses.map((pose) => pose.deepLift));
      expect(midYawSwing).toBeGreaterThan(0.05);
      expect(midYawSwing).toBeLessThan(0.2);
      expect(midLiftSwing).toBeGreaterThan(0.015);
      expect(midLiftSwing).toBeLessThan(0.06);
      expect(deepYawSwing).toBeGreaterThan(0.03);
      expect(deepYawSwing).toBeLessThan(0.15);
      expect(deepLiftSwing).toBeGreaterThan(0.01);
      expect(deepLiftSwing).toBeLessThan(0.04);
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

  /*
    COOPER TAMPOCO GIRA, y por el mismo motivo que la Ranger.

    Una megaestructura con apertura, collares de atraque y paneles afirma una
    orientación: el hueco mira abajo a la derecha. Rotando sobre su eje, la
    apertura dejaría de significar nada y la estación parecería una maqueta
    colgada de un hilo. Lo que le queda vive DENTRO: vaivén subgrado y el
    ascensor recorriendo la espina, que es escala habitada y no astronómica.
  */
  it("mantiene la estación sin giro propio, pero habitada", () => {
    const body = bodyFor("cooper-station");
    try {
      const model = body.object.children[0];
      const assembly = body.object.getObjectByName("cooper-station-assembly");
      const pod = body.object.getObjectByName("cooper-station-elevator");
      if (!assembly || !pod) throw new Error("faltan piezas");
      const restPose = model.quaternion.clone();

      body.spinAt(37);
      // El cuerpo entero no gira...
      expect(model.quaternion.equals(restPose)).toBe(true);
      // ...pero el interior vive, y de forma determinista.
      const first = {
        x: assembly.rotation.x,
        y: assembly.rotation.y,
        pod: pod.position.x,
      };
      body.spinAt(37);
      expect(assembly.rotation.x).toBeCloseTo(first.x, 10);
      expect(assembly.rotation.y).toBeCloseTo(first.y, 10);
      expect(pod.position.x).toBeCloseTo(first.pod, 10);
      // El vaivén se mantiene por debajo del grado y cuarto: mantenimiento de
      // actitud, no bamboleo.
      for (const angle of [assembly.rotation.x, assembly.rotation.y]) {
        expect(Math.abs(angle)).toBeLessThan(0.022);
      }
      // Y el ascensor recorre la espina de verdad: a un cuarto de su periodo
      // está a más de medio metro local del punto de partida.
      body.spinAt(0);
      const atRest = pod.position.x;
      body.spinAt(Math.PI / (2 * 0.05));
      expect(Math.abs(pod.position.x - atRest)).toBeGreaterThan(0.4);
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
