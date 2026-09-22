import { describe, expect, it } from "vitest";
import { SFX, sfxDuration, type SfxName } from "./sfx";

/**
 * La paleta, sin tarjeta de sonido.
 *
 * Tres contratos que a oído sólo se notan cuando ya están rotos: que ninguna
 * rampa exponencial recibe un cero —en Web Audio eso es una excepción, no un
 * silencio—, que nada se pasa de la unidad antes del limitador, y que un
 * efecto de interfaz no dura más que el gesto que lo dispara.
 *
 * La escala del mapa se probaba aquí hasta que el blip de apuntar pasó a ser
 * una grabación (`audio-samples.ts`) y dejó de haber altura que repartir.
 */

const NAMES = Object.keys(SFX) as SfxName[];

describe("paleta de efectos", () => {
  it("no mete un cero ni un infinito en ninguna rampa exponencial", () => {
    for (const name of NAMES) {
      const spec = SFX[name];
      for (const tone of spec.tones) {
        for (const value of [tone.from, tone.to, tone.decay, tone.gain]) {
          expect(Number.isFinite(value), `${name} · tono`).toBe(true);
          expect(value, `${name} · tono`).toBeGreaterThan(0);
        }
        // El ataque sí puede ser corto, pero no cero: con cero el ataque y la
        // caída arrancan en el mismo instante y la exponencial recibe el valor
        // de partida sin haber subido nunca.
        expect(tone.attack, `${name} · ataque`).toBeGreaterThan(0);
      }
      for (const layer of spec.noises) {
        for (const value of [layer.from, layer.to, layer.q, layer.decay, layer.gain]) {
          expect(Number.isFinite(value), `${name} · ruido`).toBe(true);
          expect(value, `${name} · ruido`).toBeGreaterThan(0);
        }
        expect(layer.attack, `${name} · ataque de ruido`).toBeGreaterThan(0);
      }
    }
  });

  it("mantiene cada voz y cada receta por debajo de la unidad", () => {
    for (const name of NAMES) {
      const spec = SFX[name];
      expect(spec.level, name).toBeGreaterThan(0);
      expect(spec.level, name).toBeLessThanOrEqual(1);
      for (const tone of spec.tones) expect(tone.gain, name).toBeLessThanOrEqual(1);
      for (const layer of spec.noises) expect(layer.gain, name).toBeLessThanOrEqual(1);
    }
  });

  it("no deja ninguna receta muda", () => {
    for (const name of NAMES) {
      const spec = SFX[name];
      expect(spec.tones.length + spec.noises.length, name).toBeGreaterThan(0);
      expect(sfxDuration(name), name).toBeGreaterThan(0);
    }
  });

  it("dura lo que dura el gesto, y sólo los motores pasan del segundo", () => {
    for (const name of NAMES) {
      const duration = sfxDuration(name);
      if (name === "ignite") {
        // Un motor que arranca en un cuarto de segundo no es un motor.
        expect(duration).toBeGreaterThan(1);
        expect(duration).toBeLessThan(2.5);
      } else {
        expect(duration, name).toBeLessThan(0.75);
      }
    }
  });

  it("separa los efectos que se pueden repetir en ráfaga", () => {
    for (const name of NAMES) {
      expect(SFX[name].gap, name).toBeGreaterThanOrEqual(0);
    }
    /*
      Los tres del encendido van en `gap` 0 a propósito: son una secuencia de
      1,08 s disparada por un solo clic, no tres pulsaciones del visitante. Con
      separación, la tercera etapa podría caerse.
    */
    for (const name of ["acquire", "lock", "mount"] as const) {
      expect(SFX[name].gap, name).toBe(0);
    }
    // Los que cuelgan del puntero, en cambio, tienen que estar amortiguados:
    // cruzar el mapa o barrer una rejilla no puede ametrallar.
    expect(SFX.proximity.gap).toBeGreaterThanOrEqual(60);
    expect(SFX.drop.gap).toBeGreaterThanOrEqual(200);
    expect(SFX.sweep.gap).toBeGreaterThan(0);
  });

  it("hace del blip de proximidad el más discreto de todos", () => {
    // Cuelga del puntero, y lo que cuelga del puntero suena solo: si no es lo
    // más bajo de la paleta, es lo que convierte el sitio en un juguete.
    for (const name of NAMES) {
      if (name === "proximity") continue;
      expect(SFX.proximity.level, name).toBeLessThanOrEqual(SFX[name].level);
    }
  });
});
