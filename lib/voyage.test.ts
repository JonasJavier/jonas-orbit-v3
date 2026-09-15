import { describe, expect, it } from "vitest";
import { WORLD_IDS } from "@/content/worlds.data";
import {
  VOYAGE_FLAVOURS,
  VOYAGE_FULL,
  VOYAGE_SHORT,
  sampleVoyage,
  voyageFlavourFor,
  voyageTimeline,
  voyageTintFor,
} from "./voyage";

/**
 * La línea de tiempo de la travesía es un contrato del dueño: cuatro fases,
 * entre 2,2 y 2,8 s en total, la ruta cambia en el pico de la distorsión y
 * quien tiene el movimiento apagado ve medio segundo, no dos y medio.
 */
describe("travesía · línea de tiempo", () => {
  it("la completa dura entre 2,2 y 2,8 s y sus fases van en orden", () => {
    const total = VOYAGE_FULL.push + VOYAGE_FULL.arrive;
    expect(total).toBeGreaterThanOrEqual(2.2);
    expect(total).toBeLessThanOrEqual(2.8);

    expect(VOYAGE_FULL.lock).toBeGreaterThan(0);
    expect(VOYAGE_FULL.lock).toBeLessThan(VOYAGE_FULL.warpStart);
    expect(VOYAGE_FULL.warpStart).toBeLessThan(VOYAGE_FULL.approach);
    expect(VOYAGE_FULL.approach).toBeLessThan(VOYAGE_FULL.push);
    // La luz se enciende dentro del despegue, nunca antes de la distorsión.
    expect(VOYAGE_FULL.push - VOYAGE_FULL.flashLead).toBeGreaterThan(
      VOYAGE_FULL.warpStart,
    );
  });

  it("la reducida cambia de ruta en menos de medio segundo", () => {
    expect(VOYAGE_SHORT.push).toBeLessThanOrEqual(0.5);
    expect(VOYAGE_SHORT.push).toBeGreaterThanOrEqual(0.3);
    expect(VOYAGE_SHORT.push + VOYAGE_SHORT.arrive).toBeLessThanOrEqual(0.6);
    expect(voyageTimeline("short")).toBe(VOYAGE_SHORT);
    expect(voyageTimeline("full")).toBe(VOYAGE_FULL);
  });

  it("la espera al router está acotada en los dos modos", () => {
    // G10: si la página nueva no llega, la luz se retira igual.
    expect(VOYAGE_FULL.arriveCap).toBeLessThanOrEqual(1.5);
    expect(VOYAGE_SHORT.arriveCap).toBeLessThanOrEqual(1.5);
  });
});

describe("travesía · muestra por fotograma", () => {
  it("en reposo todo vale cero", () => {
    const sample = sampleVoyage(0);
    expect(sample).toMatchObject({
      progress: 0,
      phase: "lock",
      lock: 0,
      approach: 0,
      warp: 0,
      flash: 0,
    });
    // Un tiempo negativo (reloj adelantado) se trata como el arranque.
    expect(sampleVoyage(-1)).toEqual(sample);
  });

  it("recorre las cuatro fases del dueño en su orden", () => {
    expect(sampleVoyage(0.2).phase).toBe("lock");
    expect(sampleVoyage(0.7).phase).toBe("approach");
    expect(sampleVoyage(1.5).phase).toBe("warp");
    expect(sampleVoyage(VOYAGE_FULL.push).phase).toBe("breakthrough");
  });

  it("cada curva llega a 1 en su instante y no vuelve atrás", () => {
    expect(sampleVoyage(VOYAGE_FULL.lock).lock).toBeCloseTo(1, 6);
    expect(sampleVoyage(VOYAGE_FULL.approach).approach).toBeCloseTo(1, 6);
    expect(sampleVoyage(VOYAGE_FULL.push).warp).toBeCloseTo(1, 6);
    expect(sampleVoyage(VOYAGE_FULL.push).flash).toBeCloseTo(1, 6);
    expect(sampleVoyage(VOYAGE_FULL.push).progress).toBe(1);

    let previous = sampleVoyage(0);
    for (let t = 0.01; t <= 3; t += 0.01) {
      const next = sampleVoyage(t);
      for (const key of ["lock", "approach", "warp", "flash", "progress"] as const) {
        expect(next[key], `${key} retrocede en t=${t}`).toBeGreaterThanOrEqual(
          previous[key] - 1e-9,
        );
        expect(next[key]).toBeGreaterThanOrEqual(0);
        expect(next[key]).toBeLessThanOrEqual(1);
      }
      previous = next;
    }
  });

  it("la aceleración es exponencial: la mitad del tiempo no es la mitad del camino", () => {
    const half = VOYAGE_FULL.lock + (VOYAGE_FULL.approach - VOYAGE_FULL.lock) / 2;
    // Con un easing lineal saldría 0.5. Aquí el cuerpo se queda quieto al
    // principio y crece de golpe al final, que es lo que vende la velocidad.
    expect(sampleVoyage(half).approach).toBeLessThan(0.25);
  });

  it("la distorsión no empieza hasta que el cuerpo ya está creciendo", () => {
    expect(sampleVoyage(VOYAGE_FULL.warpStart - 0.01).warp).toBe(0);
    expect(sampleVoyage(VOYAGE_FULL.warpStart).approach).toBeGreaterThan(0.3);
    // …y la luz del cruce no se enciende hasta el final de la distorsión.
    expect(sampleVoyage(VOYAGE_FULL.push - VOYAGE_FULL.flashLead - 0.01).flash).toBe(0);
    expect(sampleVoyage(VOYAGE_FULL.push - VOYAGE_FULL.flashLead - 0.01).warp).toBeGreaterThan(0.85);
  });

  it("acepta la línea reducida con la misma forma", () => {
    const sample = sampleVoyage(VOYAGE_SHORT.push, VOYAGE_SHORT);
    expect(sample.progress).toBe(1);
    expect(sample.flash).toBeCloseTo(1, 6);
  });
});

describe("travesía · sabor por destino", () => {
  it("los seis mundos tienen sabor y acento", () => {
    for (const id of WORLD_IDS) {
      const flavour = voyageFlavourFor(id);
      expect(flavour).toBe(VOYAGE_FLAVOURS[id]);
      for (const value of Object.values(flavour)) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
      const tint = voyageTintFor(id);
      expect(tint.hex).toMatch(/^#[0-9a-f]{6}$/i);
      for (const channel of tint.linear) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(1);
      }
    }
  });

  it("cada destino deja una huella distinta al final", () => {
    // Gargantúa: lente máxima y negro dominante. Miller: líquido. Tesseracto:
    // retícula. Es la parte de la travesía que convierte la navegación en
    // parte del universo narrativo, no una animación entre páginas.
    expect(VOYAGE_FLAVOURS.gargantua.lens).toBe(1);
    expect(VOYAGE_FLAVOURS.gargantua.dark).toBe(1);
    expect(VOYAGE_FLAVOURS.miller.liquid).toBe(1);
    expect(VOYAGE_FLAVOURS.tesseract.grid).toBe(1);
    const signatures = WORLD_IDS.map((id) => JSON.stringify(VOYAGE_FLAVOURS[id]));
    expect(new Set(signatures).size).toBe(signatures.length);
  });

  it("el acento en lineal es más oscuro que en sRGB salvo en los extremos", () => {
    const tint = voyageTintFor("miller");
    // #55d9ff: el canal rojo (0x55 = 0.333) baja a ~0.09 en lineal.
    expect(tint.linear[0]).toBeLessThan(0.34);
    expect(tint.linear[2]).toBeCloseTo(1, 6);
  });
});
