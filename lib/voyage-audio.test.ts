import { describe, expect, it } from "vitest";
import { worldsData, type WorldId } from "@/content/worlds.data";
import { VOYAGE_FULL, VOYAGE_SHORT } from "./voyage";
import { voyageSoundFor, type VoyageSound } from "./voyage-audio";

/**
 * La partitura de la travesía, sin tarjeta de sonido.
 *
 * Es el mismo trato que `voyage.test.ts` hace con la línea de tiempo: lo que
 * se puede escribir como números se comprueba como números. Aquí eso cubre
 * tres contratos que a oído sólo se notan cuando ya están rotos — que el golpe
 * cae con el fogonazo y no después, que ninguna rampa exponencial toca el cero
 * (en Web Audio eso es una excepción, no un silencio) y que los seis destinos
 * suenan de verdad distinto.
 */

const IDS = Object.keys(worldsData) as WorldId[];

/** Todo lo que el reproductor mete en una rampa exponencial. */
function ramped(sound: VoyageSound): number[] {
  return [
    ...sound.latch.flatMap((blip) => [blip.frequency, blip.gain, blip.decay]),
    sound.fall.subFrom,
    sound.fall.subTo,
    sound.fall.subGain,
    sound.fall.airFrom,
    sound.fall.airTo,
    sound.fall.airGain,
    sound.warp.sweepFrom,
    sound.warp.sweepTo,
    sound.warp.sweepGain,
    sound.warp.toneFrom,
    sound.warp.toneTo,
    sound.warp.toneGain,
    sound.cross.impactGain,
    sound.cross.impactDecay,
    sound.cross.thumpFrom,
    sound.cross.thumpTo,
    sound.cross.thumpGain,
    sound.cross.thumpDecay,
    sound.cross.tailFrequency,
    sound.cross.tailGain,
    sound.cross.tailDecay,
  ];
}

describe("travesía · sonido", () => {
  it("cae sobre la línea de tiempo de la travesía completa", () => {
    for (const id of IDS) {
      const sound = voyageSoundFor(id, "full");

      // El pestillo entero cabe dentro del bloqueo de objetivo.
      for (const blip of sound.latch) {
        expect(blip.at).toBeGreaterThanOrEqual(0);
        expect(blip.at).toBeLessThan(VOYAGE_FULL.lock);
      }
      expect(sound.latch).toHaveLength(2);

      // La caída acompaña a la aceleración, y la distorsión a la distorsión.
      expect(sound.fall.start).toBe(VOYAGE_FULL.lock);
      expect(sound.fall.end).toBe(VOYAGE_FULL.approach);
      expect(sound.warp.start).toBe(VOYAGE_FULL.warpStart);
      expect(sound.warp.end).toBe(VOYAGE_FULL.push);

      // El golpe suena con la LUZ, no con el cambio de ruta: 200 ms antes.
      expect(sound.cross.at).toBeCloseTo(VOYAGE_FULL.push - VOYAGE_FULL.flashLead, 6);

      // La cola puede pasar de la llegada —el mundo nuevo entra con ella—
      // pero no puede quedarse sonando sobre la página.
      expect(sound.duration).toBeGreaterThan(VOYAGE_FULL.push);
      expect(sound.duration).toBeLessThan(3.2);
    }
  });

  it("no mete un cero en ninguna rampa exponencial ni se pasa de la unidad", () => {
    for (const mode of ["full", "short"] as const) {
      for (const id of IDS) {
        for (const value of ramped(voyageSoundFor(id, mode))) {
          expect(Number.isFinite(value)).toBe(true);
          expect(value).toBeGreaterThan(0);
        }
      }
    }
  });

  it("mantiene cada capa por debajo de la unidad", () => {
    for (const mode of ["full", "short"] as const) {
      for (const id of IDS) {
        const sound = voyageSoundFor(id, mode);
        const gains = [
          ...sound.latch.map((blip) => blip.gain),
          sound.fall.subGain,
          sound.fall.airGain,
          sound.warp.sweepGain,
          sound.warp.toneGain,
          sound.cross.impactGain,
          sound.cross.thumpGain,
          sound.cross.tailGain,
        ];
        for (const gain of gains) expect(gain).toBeLessThanOrEqual(1);
      }
    }
  });

  it("suena distinto en los seis destinos", () => {
    const seen = new Set<string>();
    for (const id of IDS) seen.add(JSON.stringify(voyageSoundFor(id, "full")));
    expect(seen.size).toBe(IDS.length);
  });

  it("sólo Gargantúa se desploma; los demás suben de tono al distorsionar", () => {
    for (const id of IDS) {
      const { warp } = voyageSoundFor(id, "full");
      if (id === "gargantua") {
        // Una octava y media hacia abajo: es el pozo de gravedad, y es el
        // mismo número que le da `lens: 1` en el shader.
        expect(warp.toneTo).toBeLessThan(warp.toneFrom * 0.5);
      } else {
        expect(warp.toneTo).toBeGreaterThan(warp.toneFrom);
      }
    }
  });

  it("reparte los cuatro sabores por donde se ven", () => {
    const gargantua = voyageSoundFor("gargantua", "full");
    const miller = voyageSoundFor("miller", "full");
    const tesseract = voyageSoundFor("tesseract", "full");
    const endurance = voyageSoundFor("endurance", "full");

    // Negro: el filtro maestro sólo se cierra del todo en Gargantúa.
    expect(gargantua.warp.close).toBe(1);
    expect(miller.warp.close).toBe(0);
    // Líquido: Miller es el único con resonancia de agua y vibrato entero.
    expect(miller.warp.sweepQ).toBeGreaterThan(endurance.warp.sweepQ * 3);
    expect(miller.warp.wobbleDepth).toBeGreaterThan(0);
    expect(endurance.warp.wobbleDepth).toBe(0);
    // Retícula: onda cuadrada, par casi sin batido y confirmación en octava.
    expect(tesseract.warp.shape).toBe("square");
    expect(endurance.warp.shape).toBe("sawtooth");
    expect(tesseract.warp.detune).toBeLessThan(endurance.warp.detune);
    expect(tesseract.latch[1].frequency / tesseract.latch[0].frequency).toBe(2);
    expect(endurance.latch[1].frequency / endurance.latch[0].frequency).toBe(1.5);
    // Lente: el golpe del cruce pesa más y dura más cuanto más se dobla la luz.
    expect(gargantua.cross.thumpGain).toBeGreaterThan(endurance.cross.thumpGain);
    expect(gargantua.cross.thumpDecay).toBeGreaterThan(endurance.cross.thumpDecay);
  });

  it("la versión reducida no tiene distorsión, ni dos golpes, ni cola larga", () => {
    for (const id of IDS) {
      const sound = voyageSoundFor(id, "short");
      const full = voyageSoundFor(id, "full");

      // Sin escena viva no hay espacio-tiempo que doblar: el reproductor se
      // salta la capa entera porque el tramo tiene longitud cero.
      expect(sound.warp.end).toBe(sound.warp.start);
      expect(VOYAGE_SHORT.warpStart).toBe(VOYAGE_SHORT.push);

      expect(sound.latch).toHaveLength(1);
      expect(sound.cross.at).toBeCloseTo(VOYAGE_SHORT.push - VOYAGE_SHORT.flashLead, 6);
      // Medio segundo de cortesía no puede dejar un segundo de resonancia.
      expect(sound.duration).toBeLessThan(0.8);
      // Y suena más bajo que el despegue completo, en todas sus capas.
      expect(sound.cross.impactGain).toBeLessThan(full.cross.impactGain);
      expect(sound.cross.thumpGain).toBeLessThan(full.cross.thumpGain);
      expect(sound.fall.subGain).toBeLessThan(full.fall.subGain);
    }
  });
});
