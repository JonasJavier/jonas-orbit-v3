import { describe, expect, it } from "vitest";
import {
  validateWorldProse,
  type WorldProseLike,
  type WorldStructuralLike,
} from "./validate-worlds";
import { WORLD_IDS, worldsData, type WorldId } from "./worlds.data";

/**
 * Cobertura de las validaciones que ROMPEN el build (Appendix A):
 *  - A3: prosa faltante en idioma publicado → falla.
 *  - A4: orden narrativo repetido → falla.
 *  - A5: idioma NO publicado con huecos → NO falla.
 * Más los guardas de mundo duplicado y ancla duplicada (soporte de A22/A23).
 */

/** Construye una prosa válida para un mundo, con slug = id por defecto. */
function prose(
  id: WorldId,
  locale: string,
  slug: string = id,
): WorldProseLike {
  return { id, slug, locale };
}

/** Set completo de prosa para un idioma (los 7 mundos, slug = id). */
function fullLocale(locale: string): WorldProseLike[] {
  return WORLD_IDS.map((id) => prose(id, locale));
}

describe("validateWorldProse", () => {
  it("acepta un idioma publicado completo con datos válidos", () => {
    expect(() =>
      validateWorldProse(fullLocale("es"), ["es"], WORLD_IDS, worldsData),
    ).not.toThrow();
  });

  it("A3: falla si un idioma publicado no tiene prosa para todos los mundos", () => {
    const incompleto = fullLocale("es").filter((w) => w.id !== "miller");
    expect(() =>
      validateWorldProse(incompleto, ["es"], WORLD_IDS, worldsData),
    ).toThrow(/miller/);
  });

  it("A5: NO falla si un idioma NO publicado tiene huecos", () => {
    const entries = [...fullLocale("es"), prose("tesseract", "en")];
    expect(() =>
      validateWorldProse(entries, ["es"], WORLD_IDS, worldsData),
    ).not.toThrow();
  });

  it("A4: falla si dos mundos comparten el mismo orden narrativo", () => {
    const roto: Record<WorldId, WorldStructuralLike> = {
      ...worldsData,
      miller: { ...worldsData.miller, order: worldsData.endurance.order },
    };
    expect(() =>
      validateWorldProse(fullLocale("es"), ["es"], WORLD_IDS, roto),
    ).toThrow(/[Oo]rden narrativo repetido/);
  });

  it("falla si hay dos archivos para el mismo mundo+idioma", () => {
    const entries = [...fullLocale("es"), prose("miller", "es", "otro-slug")];
    expect(() =>
      validateWorldProse(entries, ["es"], WORLD_IDS, worldsData),
    ).toThrow(/[Dd]uplicado/);
  });

  it("falla si dos mundos comparten ancla (slug) en el mismo idioma", () => {
    const entries = fullLocale("es").map((w) =>
      w.id === "miller" ? { ...w, slug: "endurance" } : w,
    );
    expect(() =>
      validateWorldProse(entries, ["es"], WORLD_IDS, worldsData),
    ).toThrow(/[Aa]ncla duplicada/);
  });
});
