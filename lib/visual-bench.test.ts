import { describe, expect, it } from "vitest";
import { FULL_VISUAL_BENCH, parseVisualBench } from "./visual-bench";

/*
  El banco de pruebas apaga el bloom y los emisivos para juzgar material y
  silueta. Vive en el almacenamiento local y hay que escribirlo a mano, así que
  el valor que llega al parser es EXACTAMENTE lo que alguien tecleó — o lo que
  quedó a medias de una sesión anterior.

  Por eso lo único que este módulo no puede hacer es fallar ABIERTO. Un JSON
  roto, un número fuera de rango o una clave con el nombre cambiado tienen que
  devolver producción: bloom y emisión al 1. Lo contrario sería un sitio real
  sin bloom porque alguien dejó una llave sin cerrar.
*/
describe("banco de pruebas visual", () => {
  it("devuelve producción cuando no hay nada escrito", () => {
    expect(parseVisualBench(null)).toEqual(FULL_VISUAL_BENCH);
    expect(parseVisualBench("")).toEqual(FULL_VISUAL_BENCH);
  });

  it("falla cerrado hacia producción ante cualquier entrada inservible", () => {
    for (const roto of [
      "{",
      "no soy json",
      "null",
      "42",
      '"bloom=0"',
      "[0, 0]",
    ]) {
      expect(parseVisualBench(roto), roto).toEqual(FULL_VISUAL_BENCH);
    }
  });

  it("apaga los dos canales cuando se piden los dos", () => {
    expect(parseVisualBench('{"bloom":0,"emision":0}')).toEqual({
      ...FULL_VISUAL_BENCH,
      bloom: 0,
      emission: 0,
    });
  });

  it("acepta cada canal por separado y conserva el otro en producción", () => {
    expect(parseVisualBench('{"bloom":0}')).toEqual({
      ...FULL_VISUAL_BENCH,
      bloom: 0,
    });
    expect(parseVisualBench('{"emision":0.25}')).toEqual({
      ...FULL_VISUAL_BENCH,
      emission: 0.25,
    });
  });

  it("recorta a [0,1] y descarta lo que no sea un número finito", () => {
    expect(parseVisualBench('{"bloom":9,"emision":-3}')).toEqual({
      ...FULL_VISUAL_BENCH,
      bloom: 1,
      emission: 0,
    });
    // Un canal ilegible no arrastra al otro: cada uno cae a producción solo.
    expect(parseVisualBench('{"bloom":"0","emision":0.5}')).toEqual({
      ...FULL_VISUAL_BENCH,
      emission: 0.5,
    });
  });
});

/*
  El reloj y la acumulación son los dos mandos que hacen auditable el
  envejecimiento del disco. Se prueban aparte de los factores porque su regla de
  rango es OTRA: el reloj no se recorta a [0,1] —seis horas son 21600 segundos—
  y la acumulación es un booleano, no un multiplicador. Confundir las dos reglas
  fue justo lo que estuvo a punto de dejar el reloj clavado en 1 segundo.
*/
describe("reloj clavado y acumulación", () => {
  it("deja el reloj corriendo y la acumulación puesta cuando no se piden", () => {
    expect(parseVisualBench("{}")).toEqual(FULL_VISUAL_BENCH);
    expect(parseVisualBench('{"bloom":0}').clock).toBeNull();
    expect(parseVisualBench('{"bloom":0}').accumulate).toBe(true);
  });

  it("acepta el rango entero de instantes de la matriz de aceptación", () => {
    for (const segundos of [0, 60, 180, 900, 3600, 21600]) {
      expect(parseVisualBench(`{"reloj":${segundos}}`).clock).toBe(segundos);
    }
  });

  it("rechaza relojes que no son un instante", () => {
    for (const roto of ['"600"', "-1", "null", "true"]) {
      expect(parseVisualBench(`{"reloj":${roto}}`).clock, roto).toBeNull();
    }
  });

  it("solo un false literal apaga la acumulación", () => {
    expect(parseVisualBench('{"acumular":false}').accumulate).toBe(false);
    for (const otro of ['"false"', "0", "null", "true"]) {
      expect(parseVisualBench(`{"acumular":${otro}}`).accumulate, otro).toBe(
        true,
      );
    }
  });
});
