import { describe, expect, it, vi } from "vitest";
import {
  detectLevel,
  evaluateCapabilities,
  isSoftwareRenderer,
  readSignals,
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

    it("el encendido por defecto supera reduced-motion, pero no a un equipo que no puede con la escena", () => {
      const byDefault = { ...capable, forced: true, explicit: false };
      expect(detectLevel({ ...byDefault, reducedMotion: true })).toBe("orbit");
      for (const [señal, reason] of [
        [{ renderer: "google swiftshader" }, "gpu-por-software"],
        [{ effectiveType: "2g" }, "red-lenta"],
        [{ deviceMemory: 2 }, "memoria-corta"],
      ] as const) {
        const verdict = evaluateCapabilities({ ...byDefault, ...señal });
        expect(verdict, JSON.stringify(señal)).toEqual({ level: "flat", reason, canOverride: true });
        // Pulsar el icono sí lo monta: es la salida que ofrece `canOverride`.
        expect(detectLevel({ ...byDefault, ...señal, explicit: true })).toBe("orbit");
      }
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

describe("readSignals — la sonda de WebGL", () => {
  it("el perfil ligero no crea un contexto hasta que se pide la escena", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    const createElement = vi.spyOn(document, "createElement");
    const canvases = () =>
      createElement.mock.calls.filter(([tag]) => tag === "canvas").length;

    const light = readSignals({ reducedMotion: false, lightEffects: true, forced: false });
    expect(canvases()).toBe(0);
    expect(evaluateCapabilities(light)).toMatchObject({ level: "flat", reason: "perfil-ligero" });

    readSignals({ reducedMotion: false, lightEffects: true, forced: true, explicit: true });
    expect(canvases()).toBe(1);
    createElement.mockRestore();
    vi.unstubAllGlobals();
  });
});

describe("isSoftwareRenderer — la escena pedida en una CPU pinta a media resolución", () => {
  it("reconoce los rasterizadores por software, no las GPU", () => {
    expect(isSoftwareRenderer("ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))")).toBe(true);
    expect(isSoftwareRenderer("llvmpipe (LLVM 15.0.7, 256 bits)")).toBe(true);
    expect(isSoftwareRenderer("ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11)")).toBe(false);
    expect(isSoftwareRenderer(null)).toBe(false);
  });
});
