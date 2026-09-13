import { describe, expect, it } from "vitest";
import {
  isLightEffectsMode,
  pointerLifeEnabled,
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
 * Con 7 rutas reales el parámetro ya no sobrevive solo: el primer enlace lo
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

/**
 * La avería que originó este bloque: pulsar «Activar escena 3D» encendía el
 * raymarch y dejaba apagados el cursor de navegación y el polvo estelar, porque
 * cada capa leía la preferencia por su cuenta y sólo una conocía la activación.
 * Media petición atendida se ve exactamente igual que un efecto roto.
 */
describe("pointerLifeEnabled — el consentimiento gobierna el conjunto", () => {
  it("hay respuesta al puntero cuando nada la desaconseja", () => {
    expect(
      pointerLifeEnabled({
        reducedMotion: false,
        lightEffects: false,
        forcedEffects: false,
      }),
    ).toBe(true);
  });

  it("se respeta por defecto tanto reduced-motion como el perfil ligero", () => {
    expect(
      pointerLifeEnabled({
        reducedMotion: true,
        lightEffects: false,
        forcedEffects: false,
      }),
    ).toBe(false);
    expect(
      pointerLifeEnabled({
        reducedMotion: false,
        lightEffects: true,
        forcedEffects: false,
      }),
    ).toBe(false);
  });

  it("la activación explícita recupera cursor y polvo incluso con reduced motion", () => {
    expect(
      pointerLifeEnabled({
        reducedMotion: true,
        lightEffects: false,
        forcedEffects: true,
      }),
    ).toBe(true);
    expect(
      pointerLifeEnabled({
        reducedMotion: true,
        lightEffects: true,
        forcedEffects: true,
      }),
    ).toBe(true);
  });

  it("la activación explícita sí supera el perfil ligero sin reduced motion", () => {
    expect(
      pointerLifeEnabled({
        reducedMotion: false,
        lightEffects: true,
        forcedEffects: true,
      }),
    ).toBe(true);
  });
});

/**
 * Un solo interruptor (2026-09-13): por defecto el movimiento está encendido,
 * `?no3d=1` sigue siendo la puerta al perfil ligero y la elección del icono
 * se recuerda con la misma clave de siempre.
 */
describe("movimiento por defecto", () => {
  it("sin URL ni recuerdo, el movimiento está encendido", () => {
    expect(resolveLightEffectsMode("", null)).toBe(false);
  });

  it("apagarlo con el icono equivale a recordar el perfil ligero", () => {
    expect(resolveLightEffectsMode("", "true")).toBe(true);
    expect(resolveLightEffectsMode("?no3d=0", "true")).toBe(false);
  });
});
