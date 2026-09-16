import { describe, expect, it } from "vitest";
import { worldsData, type WorldId } from "@/content/worlds.data";
import { TESSERACT_PATH } from "@/lib/tesseract";
import { createBody, disposeBody, type SceneBody } from "./bodies";
import { specimenContract } from "./specimen-contract";

/**
 * O4 de la matriz del Observatorio: las lecturas salen del contrato del modelo,
 * no de literales.
 *
 * El test construye los cuerpos DE VERDAD y mide sobre ellos. Si mañana alguien
 * quita un radiador de la Endurance o una capa del Tesseracto, aquí no hay nada
 * que actualizar: el número cambia solo y lo que falla, si falla, es la guarda
 * de `bodies.test.ts`, que es donde debe fallar.
 */

const SOLIDS = (["tesseract", "miller", "endurance", "edmunds", "ranger"] as const)
  .map((id) => id satisfies Exclude<WorldId, "gargantua">);

function bodyFor(id: Exclude<WorldId, "gargantua">): SceneBody {
  const world = worldsData[id];
  const body = createBody({
    id,
    visual: world.visual,
    accent: world.accent,
    secondary: world.secondary,
    placement: world.placement,
  });
  if (!body) throw new Error(`${id} no construyó cuerpo`);
  return body;
}

function contractFor(id: Exclude<WorldId, "gargantua">) {
  const body = bodyFor(id);
  try {
    return specimenContract(body);
  } finally {
    disposeBody(body);
  }
}

describe("contrato del espécimen", () => {
  it("mide algo real en los cinco cuerpos", () => {
    for (const id of SOLIDS) {
      const contract = contractFor(id);
      expect(contract.draws, id).toBeGreaterThan(0);
      expect(contract.materials, id).toBeGreaterThan(0);
      expect(contract.vertices, id).toBeGreaterThan(0);
    }
  });

  it("no cuenta la cinta de órbita", () => {
    /*
      La cinta es una guía del System Map, no parte del cuerpo, y el
      Observatorio no la dibuja. Contarla inflaría el número que se le enseña al
      visitante.

      `body.materials` la incluye —es el quinto material de la Endurance—, así
      que el contrato tiene que medir MENOS materiales que esa lista. Ésa es
      justamente la diferencia que se comprueba aquí.
    */
    for (const id of SOLIDS) {
      const body = bodyFor(id);
      try {
        expect(specimenContract(body).materials, id).toBeLessThan(
          body.materials.length,
        );
      } finally {
        disposeBody(body);
      }
    }
  });

  it("la Endurance publica su arquitectura y la lee del modelo", () => {
    /*
      El contrato que ya existe: `userData.enduranceArchitecture`, vigilado por
      `bodies.test.ts`. Aquí sólo se comprueba que llega hasta el HUD sin que
      nadie lo transcriba por el camino.

      Y en particular los radiadores, que son el ejemplo por el que existe toda
      esta regla: durante el diseño de la página se escribió «8» de memoria.
    */
    const { architecture } = contractFor("endurance");
    expect(architecture).not.toBeNull();
    expect(architecture?.modules).toBe(12);
    expect(architecture?.radiators).toBe(4);
    expect(architecture?.radiators).not.toBe(8);
  });

  it("el Tesseracto deduce su topología del circuito, sin escribir el 16", () => {
    // Su figura la define `lib/tesseract.ts`; duplicar los conteos dentro de la
    // malla sería crear una segunda verdad.
    const { architecture } = contractFor("tesseract");
    expect(architecture?.edges).toBe(TESSERACT_PATH.length);
    expect(architecture?.vertices).toBe(16);
    expect(architecture?.facets).toBeGreaterThan(0);
  });

  it("Miller y Edmunds no tienen arquitectura, y eso es una conclusión", () => {
    /*
      No es un hueco por rellenar: son una esfera con un material. Toda su
      identidad vive en parámetros del shader —sitios de FBM, exponente de la
      ley difusa, suelo nocturno, escalas de oleaje— que son texto GLSL, no
      datos en ejecución.

      Copiarlos aquí a mano sería exactamente lo que este módulo existe para
      impedir. Sus lecturas propias tendrán que entrar como CONTENIDO, citando
      el documento de lenguaje visual, y no disfrazarse de medición.
    */
    for (const id of ["miller", "edmunds"] as const) {
      const contract = contractFor(id);
      expect(contract.architecture, id).toBeNull();
      expect(contract.materials, id).toBe(1);
    }
  });

  it("es determinista: dos construcciones miden lo mismo", () => {
    for (const id of SOLIDS) {
      expect(contractFor(id), id).toEqual(contractFor(id));
    }
  });

  it("el espécimen cabe en el presupuesto que ya vigila el System Map", () => {
    // Suma de los cinco sin sus cintas: tiene que quedar por debajo del tope
    // global de `bodies.test.ts`, que además incluye órbitas y el quad de
    // Gargantúa. Si esto se acercara, el que avisa primero es aquel test.
    const total = SOLIDS.reduce(
      (acc, id) => {
        const { draws, vertices } = contractFor(id);
        return { draws: acc.draws + draws, vertices: acc.vertices + vertices };
      },
      { draws: 0, vertices: 0 },
    );
    expect(total.draws).toBeLessThanOrEqual(20);
    expect(total.vertices).toBeLessThan(19_500);
  });
});
