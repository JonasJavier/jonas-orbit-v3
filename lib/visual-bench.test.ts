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
      bloom: 0,
      emission: 0,
    });
  });

  it("acepta cada canal por separado y conserva el otro en producción", () => {
    expect(parseVisualBench('{"bloom":0}')).toEqual({ bloom: 0, emission: 1 });
    expect(parseVisualBench('{"emision":0.25}')).toEqual({
      bloom: 1,
      emission: 0.25,
    });
  });

  it("recorta a [0,1] y descarta lo que no sea un número finito", () => {
    expect(parseVisualBench('{"bloom":9,"emision":-3}')).toEqual({
      bloom: 1,
      emission: 0,
    });
    // Un canal ilegible no arrastra al otro: cada uno cae a producción solo.
    expect(parseVisualBench('{"bloom":"0","emision":0.5}')).toEqual({
      bloom: 1,
      emission: 0.5,
    });
  });
});
