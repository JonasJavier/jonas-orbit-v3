import { describe, expect, it } from "vitest";
import { isLightEffectsMode } from "./effects-mode";

describe("isLightEffectsMode — override explícito del perfil ligero", () => {
  it("activa el perfil ligero con la forma documentada en el plan", () => {
    expect(isLightEffectsMode("?no3d=1")).toBe(true);
  });

  it("acepta el parámetro sin valor", () => {
    // Un visitante que escriba `?no3d` a mano espera que funcione.
    expect(isLightEffectsMode("?no3d")).toBe(true);
    expect(isLightEffectsMode("?no3d=")).toBe(true);
  });

  it("permite apagarlo explícitamente", () => {
    expect(isLightEffectsMode("?no3d=0")).toBe(false);
    expect(isLightEffectsMode("?no3d=false")).toBe(false);
  });

  it("no se activa sin el parámetro", () => {
    expect(isLightEffectsMode("")).toBe(false);
    expect(isLightEffectsMode("?")).toBe(false);
    expect(isLightEffectsMode("?utm_source=linkedin")).toBe(false);
  });

  it("convive con otros parámetros en cualquier orden", () => {
    expect(isLightEffectsMode("?utm_source=linkedin&no3d=1")).toBe(true);
    expect(isLightEffectsMode("?no3d=1&utm_source=linkedin")).toBe(true);
  });

  it("no confunde parámetros de nombre parecido", () => {
    // Sin esto, un futuro `?no3device=...` encendería el perfil ligero por error.
    expect(isLightEffectsMode("?no3d_debug=1")).toBe(false);
    expect(isLightEffectsMode("?xno3d=1")).toBe(false);
  });
});
