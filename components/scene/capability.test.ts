import { describe, expect, it } from "vitest";
import {
  detectLevel,
  evaluateCapabilities,
  type CapabilitySignals,
} from "./capability";

/** Equipo capaz y sin ninguna preferencia en contra. */
const capable: CapabilitySignals = {
  hasWebGL2: true,
  renderer: "angle (nvidia geforce rtx 3060 direct3d11)",
  reducedMotion: false,
  lightEffects: false,
  deviceMemory: 16,
  cores: 12,
  effectiveType: "4g",
  coarsePointer: false,
  viewportWidth: 1600,
  devicePixelRatio: 2,
};

describe("detectLevel — el gate de capacidad", () => {
  it("un escritorio capaz llega al nivel deep", () => {
    expect(detectLevel(capable)).toBe("deep");
  });

  describe("el modo plano es el punto de partida seguro", () => {
    it("sin WebGL2", () => {
      expect(detectLevel({ ...capable, hasWebGL2: false })).toBe("flat");
    });

    it("con prefers-reduced-motion", () => {
      expect(detectLevel({ ...capable, reducedMotion: true })).toBe("flat");
    });

    it("todo motivo de veto se puede nombrar", () => {
      // Una escena ausente y muda es indistinguible de una escena rota. Si un
      // veto nuevo llegara sin motivo propio, el visitante vería un vacío sin
      // explicación y yo no podría diagnosticarlo sin adivinar.
      const casos: Array<[Partial<CapabilitySignals>, string]> = [
        [{ hasWebGL2: false }, "sin-webgl2"],
        [{ reducedMotion: true }, "movimiento-reducido"],
        [{ lightEffects: true }, "perfil-ligero"],
        [{ renderer: "google swiftshader" }, "gpu-por-software"],
        [{ effectiveType: "2g" }, "red-lenta"],
        [{ deviceMemory: 2 }, "memoria-corta"],
      ];
      for (const [señal, motivo] of casos) {
        const veredicto = evaluateCapabilities({ ...capable, ...señal });
        expect(veredicto.level, motivo).toBe("flat");
        expect(veredicto.reason).toBe(motivo);
      }
    });

    it("sólo la ausencia de WebGL2 es irreversible", () => {
      expect(
        evaluateCapabilities({ ...capable, hasWebGL2: false }).canOverride,
      ).toBe(false);
      for (const señal of [
        { reducedMotion: true },
        { lightEffects: true },
        { renderer: "llvmpipe" },
        { deviceMemory: 2 },
      ]) {
        expect(
          evaluateCapabilities({ ...capable, ...señal }).canOverride,
          JSON.stringify(señal),
        ).toBe(true);
      }
    });

    it("una petición explícita puede activar movimiento, pero no fabricar WebGL2", () => {
      expect(
        detectLevel({ ...capable, reducedMotion: true, forced: true }),
      ).toBe("orbit");
      expect(detectLevel({ ...capable, hasWebGL2: false, forced: true })).toBe(
        "flat",
      );
    });

    it("una petición explícita sí puede superar heurísticas y un opt-out previo", () => {
      expect(
        detectLevel({ ...capable, lightEffects: true, forced: true }),
      ).toBe("orbit");
      expect(
        detectLevel({ ...capable, renderer: "llvmpipe", forced: true }),
      ).toBe("orbit");
    });

    it("con el perfil ligero pedido por el visitante", () => {
      expect(detectLevel({ ...capable, lightEffects: true })).toBe("flat");
    });

    it("con rasterizador por software", () => {
      // Sin GPU el raymarch no completa un fotograma: es rectángulo negro y
      // ventilador, no «va lento».
      for (const renderer of [
        "google swiftshader",
        "llvmpipe (llvm 15.0.7, 256 bits)",
        "microsoft basic render driver",
      ]) {
        expect(detectLevel({ ...capable, renderer }), renderer).toBe("flat");
      }
    });

    it("con red de 2g", () => {
      expect(detectLevel({ ...capable, effectiveType: "2g" })).toBe("flat");
      expect(detectLevel({ ...capable, effectiveType: "slow-2g" })).toBe("flat");
    });

    it("con memoria claramente corta", () => {
      expect(detectLevel({ ...capable, deviceMemory: 2 })).toBe("flat");
    });
  });

  describe("una señal ausente es neutral, nunca una pista en contra", () => {
    it("Safari no expone deviceMemory ni effectiveType y aun así llega a deep", () => {
      // Penalizar la ausencia habría mandado a `flat` a media población de
      // iPhone y de escritorio Apple, que es justo donde no hace falta.
      expect(
        detectLevel({
          ...capable,
          deviceMemory: undefined,
          effectiveType: undefined,
          cores: undefined,
        }),
      ).toBe("deep");
    });
  });

  describe("deep pide señales verdes, no ausencia de rojas", () => {
    it("un móvil potente se queda en orbit", () => {
      expect(
        detectLevel({
          ...capable,
          coarsePointer: true,
          viewportWidth: 412,
          cores: 8,
        }),
      ).toBe("orbit");
    });

    it("una ventana estrecha en escritorio se queda en orbit", () => {
      expect(detectLevel({ ...capable, viewportWidth: 900 })).toBe("orbit");
    });

    it("pocos núcleos se quedan en orbit", () => {
      expect(detectLevel({ ...capable, cores: 4 })).toBe("orbit");
    });
  });
});
