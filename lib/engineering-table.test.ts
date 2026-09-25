import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Project } from "./projects";
import { getF1AProjects } from "./projects";
import {
  DIAGRAM_BOX,
  initialNode,
  laneForTechnology,
  NODE_HALF_WIDTH,
  NODE_ROW_FILL,
  projectFromHash,
  ringOffset,
  ringPose,
  screenSources,
  statusReadout,
  tableArchitecture,
  tableProject,
  tableScreens,
  type TableArchitecture,
  type TableEdge,
  type TableNode,
} from "./engineering-table";

/**
 * LA MESA DE INGENIERÍA — la parte pura (`docs/design/endurance-proyectos.md`
 * §11, P2 y P11).
 *
 * Todo lo que la mesa dispone —qué pantalla va en qué puesto, cómo gira el
 * tambor, dónde cae cada nodo y qué forma tiene cada línea, qué cifras se
 * leen— se deriva aquí de los datos. Si alguna de estas pruebas necesitara un
 * número escrito por proyecto, P2 estaría roto: el sexto proyecto llegaría sin
 * mesa.
 *
 * Los proyectos de las pruebas son INVENTADOS y sin parecido con el catálogo;
 * lo que se comprueba del catálogo real va aparte, al final, y es sólo lo que
 * tiene que ser verdad de cualquier proyecto publicado.
 */

type Prose = Project["prose"];

/**
 * Un proyecto INVENTADO: una destacada y tres de galería —dos de escritorio y
 * una de teléfono en medio—, dos nodos con pantalla y dos sin ella, y una sola
 * decisión.
 */
function fixture(overrides: Partial<Record<keyof Prose, unknown>> = {}): Project {
  const prose = {
    id: "network",
    slug: "ficticio",
    locale: "es",
    title: "Ficticio — Un sistema de prueba",
    eyebrow: "Prueba",
    summary: "Resumen.",
    statusLabel: "Listo",
    role: "Todo",
    problem: "Problema.",
    contribution: "Contribución.",
    decision: "La decisión de la ficha.",
    technologies: ["React", "Django REST Framework", "PostgreSQL", "Railway"],
    highlights: ["Uno"],
    featuredImage: { src: "/media/projects/x/00.png", alt: "Portada", caption: "Portada." },
    gallery: [
      { src: "/media/projects/x/01.png", alt: "Uno", caption: "Nota uno." },
      { src: "/media/projects/x/02.png", alt: "Dos", caption: "Nota dos.", frame: "mobile" as const },
      { src: "/media/projects/x/03.png", alt: "Tres", caption: "Nota tres." },
    ],
    architecture: {
      nodes: [
        { id: "portada", label: "Portada", lane: "cliente" as const, screen: "/media/projects/x/00.png" },
        { id: "movil", label: "Móvil", lane: "cliente" as const, screen: "/media/projects/x/02.png" },
        { id: "api", label: "API", lane: "servicio" as const, decision: "Sólo lectura." },
        { id: "db", label: "PostgreSQL", lane: "datos" as const },
      ],
      edges: [
        ["portada", "api"],
        ["api", "db"],
      ],
    },
    seoTitle: "t",
    seoDescription: "d",
    body: "",
    path: "es/projects/ficticio",
    ...overrides,
  } as unknown as Prose;
  return { id: "network", order: 1, phase: "f1a", kind: "brief", status: "ready-for-production", prose };
}

/** Una galería inventada: sólo capturas de escritorio, `n` de ellas. */
function desktops(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    src: `/media/projects/x/g${i}.png`,
    alt: `G${i}`,
    caption: `Nota g${i}.`,
  }));
}

/** Un carril de servicio inventado con las aristas que se le pidan. */
function serviceLane(ids: string[], edges: [string, string][]) {
  return fixture({
    architecture: {
      nodes: ids.map((id) => ({ id, label: id.toUpperCase(), lane: "servicio" as const })),
      edges,
    },
  }).prose;
}

const byId = (nodes: readonly TableNode[]) => Object.fromEntries(nodes.map((node) => [node.id, node]));
const edge = (edges: readonly TableEdge[], from: string, to: string) =>
  edges.find((entry) => entry.from === from && entry.to === to) as TableEdge;
/** La x por la que baja un corchete: el primer punto de control de su curva. */
const arcOut = (d: string) => Number(/Q(-?[\d.]+)/.exec(d)?.[1]);

/* ── Pantallas: los puestos de Resultado salen de los datos (P2) ──────────── */

describe("tableScreens · puestos de Resultado (P2)", () => {
  const prose = fixture().prose;
  const screens = tableScreens(prose, tableArchitecture(prose));
  const slot = (name: string) => screens.find((screen) => screen.slot === name);

  /*
    Garantiza que la composición de Resultado —destacada al centro, teléfono a
    la izquierda, siguiente de escritorio a la derecha— se DERIVA de la ficha.
    Evita volver a poses escritas a mano por proyecto.
  */
  it("la destacada va al centro, el primer teléfono a la izquierda y la primera de escritorio a la derecha", () => {
    expect(screens.map((screen) => [screen.src.slice(-6), screen.slot])).toEqual([
      ["00.png", "main"],
      ["01.png", "right"],
      ["02.png", "left"],
      // Lo que no cabe en el arco espera dentro de la mesa hasta Diseño.
      ["03.png", null],
    ]);
    expect(screens.map((screen) => screen.index)).toEqual([0, 1, 2, 3]);
    expect(screens[0].featured).toBe(true);
    expect(screens.slice(1).every((screen) => !screen.featured)).toBe(true);
  });

  /*
    Garantiza que un proyecto sin captura de teléfono no deja un hueco a la
    izquierda: la ocupa la segunda de escritorio. Evita un arco cojo en las
    fichas que sólo tienen escritorio.
  */
  it("sin teléfono, la izquierda la ocupa la segunda captura de escritorio", () => {
    const noPhone = fixture({ gallery: desktops(3) }).prose;
    const list = tableScreens(noPhone, tableArchitecture(noPhone));
    expect(list.map((screen) => screen.slot)).toEqual(["main", "right", "left", null]);
    expect(list.every((screen) => screen.frame === "desktop")).toBe(true);
  });

  /*
    Garantiza que una galería corta sólo ocupa los puestos que puede llenar.
    Evita un puesto asignado a una captura inexistente (A18).
  */
  it("una galería corta sólo llena los puestos que tiene; sin galería queda la destacada sola", () => {
    const phoneOnly = fixture({ gallery: [{ src: "/media/projects/x/m.png", alt: "M", caption: "", frame: "mobile" }] }).prose;
    expect(tableScreens(phoneOnly, tableArchitecture(phoneOnly)).map((screen) => screen.slot)).toEqual(["main", "left"]);
    const oneDesktop = fixture({ gallery: desktops(1) }).prose;
    expect(tableScreens(oneDesktop, tableArchitecture(oneDesktop)).map((screen) => screen.slot)).toEqual(["main", "right"]);
    const alone = fixture({ gallery: undefined }).prose;
    expect(tableScreens(alone, tableArchitecture(alone)).map((screen) => screen.slot)).toEqual(["main"]);
  });

  /*
    Garantiza la geometría del arco: la destacada de frente y a escala entera,
    las laterales a cada lado y giradas HACIA quien mira, y lo que no tiene
    puesto apagado. Evita que un cambio de poses cruce los lados o encienda las
    que esperan dentro de la mesa.
  */
  it("la pose de cada puesto: centro de frente, laterales giradas hacia dentro, el resto apagado", () => {
    const main = slot("main")!.poses.resultado;
    const left = slot("left")!.poses.resultado;
    const right = slot("right")!.poses.resultado;
    expect(main).toMatchObject({ ry: 0, s: 1, o: 1 });
    expect(left.x).toBeLessThan(main.x);
    expect(right.x).toBeGreaterThan(main.x);
    expect(left.ry).toBeGreaterThan(0);
    expect(right.ry).toBeLessThan(0);
    for (const pose of [left, right]) {
      expect(pose.s).toBeLessThanOrEqual(main.s);
      expect(pose.o).toBeGreaterThan(0);
    }
    expect(screens.find((screen) => screen.slot === null)!.poses.resultado.o).toBe(0);
  });

  /*
    Garantiza que en Ingeniería las pantallas vuelven a la mesa: se hunden bajo
    SU puesto, encogen y se apagan, para que el esquema ocupe el sitio. Evita
    capturas encendidas tapando el sistema.
  */
  it("en Ingeniería cada pantalla se hunde bajo su propio puesto y se apaga", () => {
    for (const screen of screens) {
      const { resultado, ingenieria } = screen.poses;
      expect(ingenieria.o, screen.src).toBe(0);
      expect(ingenieria.x, screen.src).toBe(resultado.x);
      expect(ingenieria.y, screen.src).toBeGreaterThan(resultado.y);
      expect(ingenieria.s, screen.src).toBeLessThan(resultado.s);
    }
  });

  /*
    Garantiza que cada captura conserva su alt, su nota y su aparato, y sabe a
    qué nodo del sistema corresponde. Evita perder el texto de una pantalla
    (regla 7) o desengancharla de su nodo.
  */
  it("conserva alt, nota y marco, y enlaza la pantalla con su nodo", () => {
    expect(screens[2]).toMatchObject({ alt: "Dos", caption: "Nota dos.", frame: "mobile", nodeId: "movil" });
    expect(screens[0]).toMatchObject({ alt: "Portada", frame: "desktop", nodeId: "portada" });
    expect(screens[1].nodeId).toBeNull();
    // Sin peldaños en el manifiesto, el marco reserva la proporción de su aparato.
    expect(screens[2].sources).toMatchObject({ width: 390, height: 844 });
  });
});

/* ── Diseño: el tambor ────────────────────────────────────────────────────── */

describe("ringOffset · el tambor da la vuelta por el lado corto (P2)", () => {
  /*
    Garantiza que la distancia a la elegida se mide por el lado corto del
    tambor. Evita que la última pantalla aparezca a +7 de la primera (fuera de
    escena) en vez de a −1 (su vecina).
  */
  it("con ocho pantallas, la octava está a −1 de la primera y la segunda a +1", () => {
    expect(ringOffset(7, 0, 8)).toBe(-1);
    expect(ringOffset(1, 0, 8)).toBe(1);
    expect(ringOffset(0, 7, 8)).toBe(1);
    expect(ringOffset(3, 3, 8)).toBe(0);
    expect(ringOffset(0, 0, 1)).toBe(0);
  });

  /*
    Garantiza las dos propiedades del tambor para cualquier tamaño: nunca más
    lejos que media vuelta, y la distancia lleva de vuelta a la pantalla. Evita
    un tambor que salta o que pierde pantallas en un recuento distinto.
  */
  it("para cualquier tamaño: nunca más de media vuelta y siempre vuelve a su pantalla", () => {
    for (let total = 1; total <= 9; total++) {
      for (let front = 0; front < total; front++) {
        for (let index = 0; index < total; index++) {
          const rel = ringOffset(index, front, total);
          expect(Math.abs(rel)).toBeLessThanOrEqual(total / 2);
          expect((((front + rel) % total) + total) % total).toBe(index);
        }
      }
    }
  });
});

describe("ringPose · la pose de cada puesto del tambor (P2)", () => {
  const center = ringPose(0, "desktop").x;

  /*
    Garantiza que la elegida está delante, de frente y encendida. Evita un
    carrete en el que la pantalla que se lee llega girada o atenuada.
  */
  it("la elegida va de frente, delante del todo y encendida, cerca del centro del escenario", () => {
    const front = ringPose(0, "desktop");
    expect(front).toMatchObject({ ry: 0, z: 0, o: 1 });
    expect(Math.abs(center)).toBeLessThan(0.1);
    expect(ringPose(0, "mobile").x).toBe(center);
  });

  /*
    Garantiza que el tambor es simétrico: la vecina de la izquierda es el
    reflejo de la de la derecha. Evita un carrete torcido hacia un lado.
  */
  it("es simétrico alrededor de la elegida", () => {
    for (const frame of ["desktop", "mobile"] as const) {
      for (const k of [1, 2, 3]) {
        const right = ringPose(k, frame);
        const left = ringPose(-k, frame);
        expect(left.x - center).toBeCloseTo(-(right.x - center), 6);
        expect(left.ry).toBe(-right.ry);
        expect(left).toMatchObject({ y: right.y, z: right.z, s: right.s, o: right.o });
      }
    }
    // La vecina de la derecha va a la derecha y su giro adelanta el canto
    // interior, el que da a la elegida (por eso se retira; ver `ringPose`).
    expect(ringPose(1, "desktop").x).toBeGreaterThan(center);
    expect(ringPose(1, "desktop").ry).toBeGreaterThan(0);
    expect(ringPose(-1, "desktop").x).toBeLessThan(center);
  });

  /*
    Garantiza que cuanto más lejos, más atrás, más pequeña y más apagada, y que
    a partir de tres puestos se apaga del todo (el componente la marca
    `data-far`). Evita vecinas que atraviesan a la elegida o un tambor de ocho
    pantallas encendidas a la vez.
  */
  it("cuanto más lejos, más atrás, más pequeña y más apagada; a tres puestos, apagada", () => {
    for (const frame of ["desktop", "mobile"] as const) {
      const poses = [0, 1, 2, 3].map((k) => ringPose(k, frame));
      for (let k = 1; k < poses.length; k++) {
        expect(poses[k].z, `${frame} ${k}`).toBeLessThan(poses[k - 1].z);
        expect(poses[k].o, `${frame} ${k}`).toBeLessThanOrEqual(poses[k - 1].o);
        expect(poses[k].s, `${frame} ${k}`).toBeLessThanOrEqual(poses[k - 1].s);
      }
      expect(poses[0].s).toBeGreaterThan(poses[1].s);
      expect(poses[3].o).toBe(0);
      // Más allá de tres no hay más poses: se queda donde la tercera.
      expect(ringPose(6, frame)).toEqual(poses[3]);
      // Ninguna escala pasa de la natural.
      expect(poses.every((pose) => pose.s <= 1)).toBe(true);
    }
    // El teléfono ya es estrecho: fuera del frente encoge menos que el escritorio.
    expect(ringPose(1, "mobile").s).toBeGreaterThan(ringPose(1, "desktop").s);
  });
});

/* ── Ingeniería: el esquema por carriles ──────────────────────────────────── */

describe("tableArchitecture · esquema declarado (P2, P11)", () => {
  const architecture = tableArchitecture(fixture().prose);
  const nodes = byId(architecture.nodes);

  /*
    Garantiza la rejilla del esquema: una columna por carril en el orden fijo,
    tantas filas como el carril más poblado y los carriles cortos centrados.
    Evita cajas montadas o un esquema que crece con la ventana en vez de con el
    sistema.
  */
  it("una columna por carril, filas del carril más poblado y carriles cortos centrados", () => {
    expect(architecture.derived).toBe(false);
    expect(architecture.rows).toBe(2);
    expect(architecture.lanes).toEqual([
      { lane: "cliente", count: 2 },
      { lane: "servicio", count: 1 },
      { lane: "datos", count: 1 },
      { lane: "infraestructura", count: 0 },
    ]);
    expect([nodes.portada.col, nodes.api.col, nodes.db.col]).toEqual([0, 1, 2]);
    expect([nodes.portada.row, nodes.movil.row]).toEqual([0, 1]);
    // Un carril de un nodo cae a media altura del de dos.
    expect(nodes.api.row).toBe(0.5);
    expect(nodes.db.row).toBe(0.5);
  });

  /*
    Garantiza que cada nodo sabe con quién se conecta, por su rótulo, y que su
    pantalla le da miniatura y aparato. Evita un inspector vacío o una
    miniatura que no es la de su pantalla.
  */
  it("cada nodo lleva sus entradas y salidas por rótulo, su decisión y la miniatura de su pantalla", () => {
    expect(nodes.api).toMatchObject({ inputs: ["Portada"], outputs: ["PostgreSQL"], decision: "Sólo lectura." });
    expect(nodes.portada).toMatchObject({ inputs: [], outputs: ["API"], frame: "desktop" });
    // Sin peldaños en el manifiesto, la miniatura es la propia captura.
    expect(nodes.portada.thumb).toBe("/media/projects/x/00.png");
    expect(nodes.movil).toMatchObject({ frame: "mobile", decision: null, inputs: [], outputs: [] });
    expect(nodes.db).toMatchObject({ screen: null, thumb: null, frame: null });
  });

  /*
    Garantiza UNA línea por arista declarada, y ninguna hacia un nodo que no
    existe. Evita un esquema decorativo que no corresponde al MDX (P12, en su
    parte pura).
  */
  it("una línea por arista declarada; una arista huérfana no se dibuja", () => {
    expect(architecture.edges.map((entry) => [entry.from, entry.to, entry.shape])).toEqual([
      ["portada", "api", "cross"],
      ["api", "db", "cross"],
    ]);
    const orphan = tableArchitecture(
      fixture({
        architecture: {
          nodes: [{ id: "a", label: "A", lane: "cliente" }, { id: "b", label: "B", lane: "servicio" }],
          edges: [["a", "b"], ["a", "fantasma"]],
        },
      }).prose,
    );
    expect(orphan.edges.map((entry) => `${entry.from}>${entry.to}`)).toEqual(["a>b"]);
    expect(byId(orphan.nodes).a.outputs).toEqual(["B"]);
  });

  /*
    Garantiza que dentro de un carril las cadenas quedan seguidas aunque el MDX
    las declare desordenadas, que cada eslabón es un conector corto y que un
    salto es un corchete; y que dos corchetes del mismo carril no se montan: el
    más largo va más afuera. Evita arcos que cruzan medio carril por un orden
    de escritura.
  */
  it("las cadenas de un carril quedan seguidas: eslabones cortos, saltos en corchete y el largo por fuera", () => {
    const lane = tableArchitecture(
      serviceLane(
        ["d", "x", "a", "c", "b"],
        [["a", "b"], ["b", "c"], ["c", "d"], ["a", "c"], ["a", "d"]],
      ),
    );
    // El orden del MDX manda entre raíces; la cadena a → b → c → d va seguida.
    const order = [...lane.nodes].sort((l, r) => l.row - r.row).map((node) => node.id);
    expect(order).toEqual(["x", "a", "b", "c", "d"]);
    expect(lane.rows).toBe(5);
    expect(edge(lane.edges, "a", "b").shape).toBe("adjacent");
    expect(edge(lane.edges, "b", "c").shape).toBe("adjacent");
    expect(edge(lane.edges, "c", "d").shape).toBe("adjacent");
    expect(edge(lane.edges, "a", "c").shape).toBe("arc");
    expect(edge(lane.edges, "a", "d").shape).toBe("arc");
    expect(arcOut(edge(lane.edges, "a", "d").d)).toBeLessThan(arcOut(edge(lane.edges, "a", "c").d));
    // Un conector corto es vertical; entre carriles, una curva.
    expect(edge(lane.edges, "a", "b").d).toMatch(/^M[\d.]+ [\d.]+V[\d.]+$/);
    for (const entry of lane.edges) expect(entry.d, `${entry.from}>${entry.to}`).not.toMatch(/NaN/);
  });
});

describe("tableArchitecture · esquema derivado del stack (P2, §6)", () => {
  /*
    Garantiza la rama «stack + decisión»: una ficha sin `architecture` se
    dibuja con un nodo por tecnología en su carril (la tabla fija de
    `laneForTechnology`), sin una sola arista y marcada `derived`. Evita que la
    página invente un flujo que la ficha no describe (regla 8).
  */
  it("un nodo por tecnología en su carril, sin aristas, sin decisiones y sin repetir", () => {
    const derived = tableArchitecture(
      fixture({
        architecture: undefined,
        technologies: ["React", "TypeScript", "Django", "PostgreSQL", "Railway", "React"],
      }).prose,
    );
    expect(derived.derived).toBe(true);
    expect(derived.edges).toEqual([]);
    expect(derived.nodes.map((node) => [node.id, node.label, node.lane])).toEqual([
      ["react", "React", "cliente"],
      ["typescript", "TypeScript", "cliente"],
      ["django", "Django", "servicio"],
      ["postgresql", "PostgreSQL", "datos"],
      ["railway", "Railway", "infraestructura"],
    ]);
    for (const node of derived.nodes) {
      expect(node.lane).toBe(laneForTechnology(node.label));
      expect(node).toMatchObject({ screen: null, thumb: null, decision: null, inputs: [], outputs: [] });
    }
    expect(derived.rows).toBe(2);
  });
});

describe("laneForTechnology", () => {
  /*
    Garantiza la tabla fija del §6, y que lo desconocido cae en servicio. Evita
    que una tecnología nueva rompa el esquema derivado.
  */
  it("es la tabla fija del §6 y lo desconocido cae en servicio", () => {
    expect(laneForTechnology("React 19")).toBe("cliente");
    expect(laneForTechnology("Vite")).toBe("cliente");
    expect(laneForTechnology("TypeScript")).toBe("cliente");
    expect(laneForTechnology("Django 5.2")).toBe("servicio");
    expect(laneForTechnology("PostgreSQL")).toBe("datos");
    expect(laneForTechnology("Redis")).toBe("datos");
    expect(laneForTechnology("Railway")).toBe("infraestructura");
    expect(laneForTechnology("WhatsApp")).toBe("infraestructura");
    expect(laneForTechnology("Un motor raro")).toBe("servicio");
  });
});

describe("initialNode", () => {
  /*
    Garantiza que el inspector abre en el primer módulo CON decisión, en orden
    de carriles, y que sin decisiones abre en el primero. Evita un inspector
    que entra en blanco o en un módulo que no tiene nada que contar.
  */
  it("el primero con decisión; sin decisiones, el primero; sin nodos, ninguno", () => {
    expect(initialNode(tableArchitecture(fixture().prose))).toBe("api");
    expect(initialNode(tableArchitecture(fixture({ architecture: undefined }).prose))).toBe("react");
    const empty: TableArchitecture = { rows: 1, nodes: [], edges: [], lanes: [], derived: true };
    expect(initialNode(empty)).toBeNull();
  });
});

/* ── Capturas ─────────────────────────────────────────────────────────────── */

describe("screenSources", () => {
  /*
    Garantiza que una captura sin peldaños medidos se sirve tal cual, con la
    proporción de reposo de su aparato. Evita un `srcset` que lista archivos
    que no existen y un marco que salta al cargar.
  */
  it("una captura sin peldaños registrados se sirve tal cual, con su proporción de reposo", () => {
    expect(screenSources("/media/projects/x/00.png", "desktop")).toEqual({
      src: "/media/projects/x/00.png",
      srcSet: "",
      thumb: "/media/projects/x/00.png",
      width: 1440,
      height: 900,
    });
    expect(screenSources("/media/projects/x/02.png", "mobile")).toMatchObject({ width: 390, height: 844 });
  });

  /*
    Garantiza que una captura real lleva los peldaños MEDIDOS del manifiesto:
    el mayor por defecto, todos en el `srcset` y el menor como miniatura.
    Evita capturas blandas (P9) y peldaños inventados.
  */
  it("una captura real lleva sus peldaños medidos: el mayor por defecto y el menor de miniatura", () => {
    const phone = screenSources("/media/projects/omsta/50-mobile-dashboard.png", "mobile");
    expect(phone).toEqual({
      src: "/media/projects/omsta/50-mobile-dashboard-390.webp",
      srcSet: "/media/projects/omsta/50-mobile-dashboard-390.webp 390w",
      thumb: "/media/projects/omsta/50-mobile-dashboard-390.webp",
      width: 390,
      height: 844,
    });
    const desktop = screenSources("/media/projects/omsta/01-dashboard-panel-ejecutivo.png", "desktop");
    expect(desktop.srcSet.split(", ")).toEqual([480, 720, 960, 1440].map(
      (step) => `/media/projects/omsta/01-dashboard-panel-ejecutivo-${step}.webp ${step}w`,
    ));
    expect(desktop.src).toMatch(/-1440\.webp$/);
    expect(desktop.thumb).toMatch(/-480\.webp$/);
  });
});

/* ── El proyecto entero ──────────────────────────────────────────────────── */

describe("tableProject (P11)", () => {
  /*
    Garantiza que el nombre es el título cortado en la raya y que lo que dice
    qué es sale de la cola del título o, sin raya, de la antetitular. Evita un
    campo nuevo de contenido (§15.2.7) y un corte en un guion corriente.
  */
  it("nombre y descriptor salen del título del autor: cortado en la raya, o la antetitular", () => {
    const split = tableProject(fixture(), "/es/proyectos");
    expect(split).toMatchObject({ name: "Ficticio", descriptor: "Un sistema de prueba", title: "Ficticio — Un sistema de prueba" });
    const whole = tableProject(fixture({ title: "Ficticio" }), "/es/proyectos");
    expect(whole).toMatchObject({ name: "Ficticio", descriptor: "Prueba" });
    const hyphen = tableProject(fixture({ title: "Uno - Dos" }), "/es/proyectos");
    expect(hyphen).toMatchObject({ name: "Uno - Dos", descriptor: "Prueba" });
  });

  /*
    Garantiza que las cifras que se leen (pantallas, módulos, conexiones,
    decisiones) se CUENTAN de los datos. Evita el «8 radiadores» otra vez (O4).
  */
  it("las cifras se cuentan de los datos", () => {
    const project = tableProject(fixture(), "/es/proyectos");
    expect(project.counts).toEqual({ screens: 4, modules: 4, connections: 2, decisions: 1 });
    const derived = tableProject(fixture({ architecture: undefined, gallery: undefined }), "/es/proyectos");
    expect(derived.counts).toEqual({ screens: 1, modules: 4, connections: 0, decisions: 0 });
  });

  /*
    Garantiza que lo que cruza al componente cliente es serializable y no
    lleva el cuerpo MDX compilado, y que la salida al caso completo es su ruta
    localizada. Evita arrastrar el caso entero al bundle de la mesa.
  */
  it("es serializable, sin cuerpo MDX, con su ruta al caso y sus enlaces", () => {
    const links = [{ label: "Ver", href: "https://ejemplo.test", kind: "repository" as const }];
    const project = tableProject(fixture({ links }), "/es/proyectos");
    expect(JSON.parse(JSON.stringify(project))).toEqual(project);
    expect(project).not.toHaveProperty("body");
    expect(project.href).toBe("/es/proyectos/ficticio");
    expect(project.links).toEqual(links);
    expect(project.links[0]).not.toBe(links[0]);
    expect(tableProject(fixture(), "/es/proyectos").links).toEqual([]);
  });
});

describe("statusReadout y hash", () => {
  /* Garantiza que el estado se traduce de la identidad estructural, sin inventar uno. */
  it("traduce el estado estructural sin inventar uno", () => {
    expect(statusReadout("production")).toBe("En producción");
    expect(statusReadout("ready-for-production")).toBe("Listo para producción");
    expect(statusReadout("in-development")).toBe("En desarrollo");
  });

  /*
    Garantiza que el hash elige un proyecto de la mesa y que lo que no lo es se
    rechaza (el componente cae entonces en el primero). Evita una mesa vacía
    por un enlace viejo.
  */
  it("resuelve el proyecto de un hash y rechaza lo que no está en la mesa", () => {
    const projects = getF1AProjects("es").map((project) => tableProject(project, "/es/proyectos"));
    expect(projectFromHash("#omsta", projects)?.id).toBe("omsta");
    expect(projectFromHash("omsta", projects)?.id).toBe("omsta");
    expect(projectFromHash("#nada", projects)).toBeNull();
    expect(projectFromHash("", projects)).toBeNull();
  });
});

/* ── El catálogo real ────────────────────────────────────────────────────── */

describe("el catálogo real sobre la mesa", () => {
  const catalog = getF1AProjects("es");
  const projects = catalog.map((project) => tableProject(project, "/es/proyectos"));
  const find = (id: string) => projects.find((project) => project.id === id)!;

  /*
    Garantiza el nombre corto y el descriptor de los cinco proyectos
    publicados. Evita un muelle que no cabe a 1440 con los títulos enteros.
  */
  it("nombre corto y descriptor de los cinco proyectos", () => {
    expect(projects.map((project) => project.name)).toEqual([
      "OMSTA",
      "Izak's Photos",
      "Wiki Universe",
      "Network 3.0",
      "Delicaté 4.0",
    ]);
    expect(find("omsta").descriptor).toBe("ERP para una agencia de viajes");
    for (const project of catalog.filter((entry) => !entry.prose.title.includes("—"))) {
      expect(find(project.id).descriptor, project.id).toBe(project.prose.eyebrow);
    }
  });

  /*
    Garantiza que las cifras de cada proyecto real salen de su MDX, y que todo
    caso completo trae su sistema declarado con decisiones. Evita cifras
    escritas a mano y un caso completo con el esquema derivado.
  */
  it("las cifras de cada proyecto son las de su MDX (P11)", () => {
    for (const { id, kind, prose } of catalog) {
      const project = find(id);
      const declared = prose.architecture;
      expect(project.counts.screens, id).toBe(1 + (prose.gallery?.length ?? 0));
      if (declared) {
        expect(project.counts.modules, id).toBe(declared.nodes.length);
        expect(project.counts.connections, id).toBe(declared.edges.length);
        expect(project.counts.decisions, id).toBe(declared.nodes.filter((node) => node.decision).length);
      }
      if (kind === "case-study") {
        expect(project.architecture.derived, id).toBe(false);
        expect(project.counts.modules, id).toBeGreaterThanOrEqual(4);
        expect(project.counts.decisions, id).toBeGreaterThanOrEqual(1);
      }
    }
  });

  /*
    Garantiza el orden por cadenas con el sistema más largo del catálogo: el
    carril de servicio de OMSTA lee de corrido CRM → reservas → facturación →
    pagos → contabilidad → ledger → DGII, con nómina y sucursales detrás.
    Evita que el orden de escritura del MDX parta la cadena en arcos.
  */
  it("OMSTA: el carril de servicio lee la cadena de corrido y el inspector abre en Pagos", () => {
    const { architecture } = find("omsta");
    const service = architecture.nodes
      .filter((node) => node.lane === "servicio")
      .sort((l, r) => l.row - r.row)
      .map((node) => node.id);
    expect(service).toEqual([
      "crm",
      "reservas",
      "facturacion",
      "pagos",
      "contabilidad",
      "ledger",
      "dgii",
      "nomina",
      "sucursales",
    ]);
    expect(architecture.rows).toBe(service.length);
    expect(edge(architecture.edges, "crm", "reservas").shape).toBe("adjacent");
    expect(edge(architecture.edges, "crm", "pagos").shape).toBe("arc");
    expect(edge(architecture.edges, "panel", "reservas").shape).toBe("cross");
    expect(initialNode(architecture)).toBe("pagos");
  });

  /*
    Garantiza que ningún trazado del catálogo sale roto y que cada nodo con
    pantalla lleva su miniatura WebP. Evita líneas invisibles por un NaN y
    miniaturas de PNG a tamaño completo.
  */
  it("todo trazado es válido y todo nodo con pantalla tiene miniatura WebP", () => {
    for (const project of projects) {
      for (const entry of project.architecture.edges) {
        expect(entry.d, `${project.id} ${entry.from}>${entry.to}`).toMatch(/^M/);
        expect(entry.d, `${project.id} ${entry.from}>${entry.to}`).not.toMatch(/NaN|Infinity/);
      }
      for (const node of project.architecture.nodes.filter((entry) => entry.screen)) {
        expect(node.thumb, `${project.id} ${node.id}`).toMatch(/\.webp$/);
      }
    }
  });

  /*
    Garantiza que ninguna línea pasa por DEBAJO de una caja que no es la suya:
    una arista que salta carriles rodea los intermedios por una media fila
    libre. Evita que el esquema diga conexiones que el MDX no declara
    (carrito → WhatsApp, en Delicaté, atravesaba Administración y PostgreSQL).
  */
  it("ninguna línea atraviesa una caja ajena", () => {
    for (const project of projects) {
      const { nodes, edges, rows } = project.architecture;
      const rowHeight = DIAGRAM_BOX / rows;
      const half = (rowHeight * NODE_ROW_FILL) / 2;
      for (const edge of edges) {
        const points = samplePath(edge.d);
        for (const node of nodes.filter((entry) => entry.id !== edge.from && entry.id !== edge.to)) {
          const cx = (DIAGRAM_BOX / 4) * (node.col + 0.5);
          const cy = rowHeight * (node.row + 0.5);
          const inside = points.some(
            (point) =>
              point.x > cx - NODE_HALF_WIDTH + 1 &&
              point.x < cx + NODE_HALF_WIDTH - 1 &&
              point.y > cy - half + 1 &&
              point.y < cy + half - 1,
          );
          expect(inside, `${project.id}: ${edge.from} → ${edge.to} cruza ${node.id}`).toBe(false);
        }
      }
    }
  });

  /*
    Garantiza que toda pantalla real tiene peldaños medidos y que cada peldaño
    que lista su `srcset` existe en `public/`. Evita capturas blandas (P9) y un
    `srcset` que apunta a un 404.
  */
  it("toda pantalla real tiene peldaños WebP y todos existen en public/", () => {
    for (const project of projects) {
      expect(project.screens.filter((screen) => screen.slot === "main"), project.id).toHaveLength(1);
      for (const screen of project.screens) {
        expect(screen.sources.srcSet, screen.src).not.toBe("");
        for (const candidate of screen.sources.srcSet.split(", ")) {
          const file = candidate.split(" ")[0];
          expect(existsSync(join(process.cwd(), "public", file)), file).toBe(true);
        }
      }
    }
  });

  /* Garantiza que «Explorar proyecto» lleva a la ruta localizada del caso (A20). */
  it("el caso completo enlaza a su ruta localizada", () => {
    for (const { id, prose } of catalog) {
      expect(find(id).href).toBe(`/es/proyectos/${prose.slug}`);
    }
  });
});

/**
 * Puntos a lo largo de un trazado del esquema, con los mismos mandatos que
 * escribe `edgePath` (M, L, H, V, Q, C en absoluto): veinte por tramo.
 */
function samplePath(d: string): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  let x = 0;
  let y = 0;
  for (const [, command, rest] of d.matchAll(/([MLHVQC])([^MLHVQC]*)/g)) {
    const n = rest.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    const steps = Array.from({ length: 21 }, (_, k) => k / 20);
    if (command === "M") {
      [x, y] = n;
      points.push({ x, y });
    } else if (command === "L" || command === "H" || command === "V") {
      const tx = command === "V" ? x : n[0];
      const ty = command === "H" ? y : command === "V" ? n[0] : n[1];
      for (const t of steps) points.push({ x: x + (tx - x) * t, y: y + (ty - y) * t });
      [x, y] = [tx, ty];
    } else if (command === "Q") {
      const [qx, qy, tx, ty] = n;
      for (const t of steps) {
        const u = 1 - t;
        points.push({ x: u * u * x + 2 * u * t * qx + t * t * tx, y: u * u * y + 2 * u * t * qy + t * t * ty });
      }
      [x, y] = [tx, ty];
    } else {
      const [ax, ay, bx, by, tx, ty] = n;
      for (const t of steps) {
        const u = 1 - t;
        points.push({
          x: u * u * u * x + 3 * u * u * t * ax + 3 * u * t * t * bx + t * t * t * tx,
          y: u * u * u * y + 3 * u * u * t * ay + 3 * u * t * t * by + t * t * t * ty,
        });
      }
      [x, y] = [tx, ty];
    }
  }
  return points;
}
