import { describe, expect, it } from "vitest";
import { worldsData, type WorldId } from "@/content/worlds.data";
import { createBody, disposeBody } from "@/components/scene/bodies";
import { specimenContract } from "@/components/scene/specimen-contract";
import {
  architectureLabel,
  ARCHITECTURE_LABELS,
  RENDER_LABELS,
} from "./observatory-labels";

/**
 * El panel `DATOS` no puede enseñar una clave cruda ni dos filas que se llamen
 * igual. Los dos fallos aparecieron en la primera captura del Tesseracto:
 * `EDGES`, `RENDEREDFACETS`, y un «vértices» con 1 688 junto a otro con 16.
 */

const SOLIDS = ["tesseract", "miller", "endurance", "edmunds", "ranger"] as const;

function architectureKeys(id: Exclude<WorldId, "gargantua">): string[] {
  const world = worldsData[id];
  const body = createBody({
    id,
    visual: world.visual,
    accent: world.accent,
    secondary: world.secondary,
    placement: world.placement,
  });
  if (!body) throw new Error(`${id} no construyó cuerpo`);
  try {
    return Object.keys(specimenContract(body).architecture ?? {});
  } finally {
    disposeBody(body);
  }
}

describe("etiquetas del panel de datos", () => {
  it("toda clave que el modelo publique tiene nombre en español", () => {
    /*
      Éste es el guardrail de verdad: el contrato se DERIVA del modelo, así que
      añadir un conteo allí lo hace aparecer aquí solo. Sin este test, la
      primera noticia sería una clave en inglés dentro del HUD, en una captura,
      delante de quien esté mirando el portafolio.
    */
    for (const id of SOLIDS) {
      for (const key of architectureKeys(id)) {
        expect(
          ARCHITECTURE_LABELS[key],
          `${id}: la clave "${key}" no tiene etiqueta`,
        ).toBeDefined();
      }
    }
  });

  it("no hay dos etiquetas iguales entre dibujo y figura", () => {
    /*
      El fallo concreto de la primera captura: «Vértices» salía dos veces, una
      con los 1 688 de la malla y otra con los 16 del 4-cubo. Son dos cosas
      distintas y tenían el mismo nombre en la misma tabla.

      Se resolvió separándolas en dos familias Y dejando explícito que las de
      render son «de malla». Este test impide que vuelvan a colisionar.
    */
    const render = Object.values(RENDER_LABELS);
    const figure = Object.values(ARCHITECTURE_LABELS);
    for (const label of render) {
      expect(figure, `"${label}" colisiona entre Dibujo y Figura`).not.toContain(
        label,
      );
    }
    expect(new Set(figure).size, "etiquetas de figura repetidas").toBe(
      figure.length,
    );
  });

  it("no llama «caras» a las facetas que dibujamos", () => {
    // Seis de las veinticuatro caras cuadradas del hipercubo. Llamarlas «caras»
    // convertiría una decisión de nuestra representación en una afirmación
    // sobre la geometría matemática.
    const label = architectureLabel("renderedFacets");
    expect(label).toContain("renderizadas");
    expect(label.toLowerCase()).not.toBe("caras");
  });

  it("devuelve la clave cruda cuando nadie la ha nombrado", () => {
    // El respaldo es un fallo visible a propósito, no una red cómoda.
    expect(architectureLabel("conteoQueNadieTradujo")).toBe(
      "conteoQueNadieTradujo",
    );
  });
});
