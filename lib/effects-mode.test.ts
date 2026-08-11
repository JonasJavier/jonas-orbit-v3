import { describe, expect, it } from "vitest";
import {
  isLightEffectsMode,
  readLightEffectsParam,
  resolveLightEffectsMode,
} from "./effects-mode";

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

/**
 * Con 8 rutas reales el parámetro ya no sobrevive solo: el primer enlace lo
 * borra. Sin persistencia, quien pidió menos efectos los recuperaría sin
 * pedirlo — que es exactamente lo que §5 del pivote prohíbe.
 */
describe("resolveLightEffectsMode — la elección sobrevive a la navegación", () => {
  it("distingue 'no viene en la URL' de 'viene apagado'", () => {
    expect(readLightEffectsParam("?utm_source=linkedin")).toBeNull();
    expect(readLightEffectsParam("?no3d=0")).toBe(false);
    expect(readLightEffectsParam("?no3d=1")).toBe(true);
  });

  it("sin parámetro, manda lo que el visitante eligió antes", () => {
    expect(resolveLightEffectsMode("", "true")).toBe(true);
    expect(resolveLightEffectsMode("", "false")).toBe(false);
    expect(resolveLightEffectsMode("", null)).toBe(false);
  });

  it("con parámetro, la URL gana sobre lo recordado en ambos sentidos", () => {
    expect(resolveLightEffectsMode("?no3d=1", "false")).toBe(true);
    expect(resolveLightEffectsMode("?no3d=0", "true")).toBe(false);
  });

  it("un valor corrupto en el almacenamiento no enciende el perfil ligero", () => {
    expect(resolveLightEffectsMode("", "sí")).toBe(false);
    expect(resolveLightEffectsMode("", "1")).toBe(false);
  });
});
