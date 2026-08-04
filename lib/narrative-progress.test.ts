import { afterEach, describe, expect, it } from "vitest";
import {
  calculateNarrativeProgress,
  getAnchorScrollTop,
  type NarrativeSectionMetric,
} from "./narrative-progress";
import {
  publishNarrativeProgress,
  resetNarrativeProgress,
  useNarrativeStore,
} from "./narrative-store";

const SECTIONS: NarrativeSectionMetric[] = [
  { id: "tesseract", top: 1_000, height: 1_000 },
  { id: "miller", top: 2_000, height: 1_000 },
  { id: "endurance", top: 3_000, height: 1_000 },
];

afterEach(() => resetNarrativeProgress());

describe("contrato scroll → estado narrativo", () => {
  it("A6 · calcula tope, mitad y fondo sin salir de rango", () => {
    const atTop = calculateNarrativeProgress({
      scrollY: 0,
      viewportHeight: 1_000,
      documentHeight: 4_000,
      scrollPaddingTop: 112,
      sections: SECTIONS,
    });
    expect(atTop).toEqual({
      worldIndex: 0,
      worldProgress: 0,
      globalProgress: 0,
      phase: "hero",
    });

    const atMiddle = calculateNarrativeProgress({
      scrollY: 2_080,
      viewportHeight: 1_000,
      documentHeight: 4_000,
      scrollPaddingTop: 112,
      sections: SECTIONS,
    });
    expect(atMiddle.worldIndex).toBe(1);
    expect(atMiddle.worldProgress).toBeCloseTo(0.5);
    expect(atMiddle.globalProgress).toBeCloseTo(2_080 / 3_000);
    expect(atMiddle.phase).toBe("world");

    const atBottom = calculateNarrativeProgress({
      scrollY: 3_000,
      viewportHeight: 1_000,
      documentHeight: 4_000,
      scrollPaddingTop: 112,
      sections: SECTIONS,
    });
    expect(atBottom).toEqual({
      worldIndex: 2,
      worldProgress: 1,
      globalProgress: 1,
      phase: "world",
    });
  });

  it("A7 · recalcula con métricas de resize sin acumular drift en el store", () => {
    const portrait = calculateNarrativeProgress({
      scrollY: 2_080,
      viewportHeight: 1_000,
      documentHeight: 4_000,
      scrollPaddingTop: 112,
      sections: SECTIONS,
    });
    publishNarrativeProgress({ ...portrait, worldId: "miller" });

    const landscapeInput = {
      scrollY: 1_720,
      viewportHeight: 800,
      documentHeight: 3_400,
      scrollPaddingTop: 96,
      sections: [
        { id: "tesseract", top: 800, height: 800 },
        { id: "miller", top: 1_600, height: 800 },
        { id: "endurance", top: 2_400, height: 800 },
      ] satisfies NarrativeSectionMetric[],
    };
    const firstRecalculation = calculateNarrativeProgress(landscapeInput);
    const secondRecalculation = calculateNarrativeProgress(landscapeInput);
    publishNarrativeProgress({
      ...secondRecalculation,
      worldId: "miller",
    });

    expect(firstRecalculation).toEqual(secondRecalculation);
    expect(useNarrativeStore.getState()).toEqual({
      ...secondRecalculation,
      worldId: "miller",
    });
    expect(secondRecalculation.worldIndex).toBe(1);
    expect(secondRecalculation.worldProgress).toBeCloseTo(0.57);
    expect(secondRecalculation.worldProgress).not.toBe(
      portrait.worldProgress,
    );
  });

  it("A8 · un salto por ancla publica directamente el mundo de destino", () => {
    const scrollY = getAnchorScrollTop(SECTIONS[1].top, 112);
    expect(scrollY).toBe(1_888);

    const snapshot = calculateNarrativeProgress({
      scrollY,
      viewportHeight: 1_000,
      documentHeight: 4_200,
      scrollPaddingTop: 112,
      sections: SECTIONS,
    });
    publishNarrativeProgress({ ...snapshot, worldId: "miller" });

    expect(snapshot.phase).toBe("world");
    expect(snapshot.worldIndex).toBe(1);
    expect(useNarrativeStore.getState().worldId).toBe("miller");
  });
});
