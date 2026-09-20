import { describe, expect, it } from "vitest";
import {
  FULL_VISUAL_BENCH,
  diagnosticCode,
  parseVisualBench,
} from "./visual-bench";

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

/*
  Las tres capas de atmósfera del Observatorio.

  Son el campo con más riesgo de todo el banco, y el riesgo no es técnico: una
  atmósfera bien hecha es invisible por definición —el encargo pedía «tan sutil
  que probablemente sólo notes su ausencia al apagarlo»— así que el único modo
  de juzgarla es poder quitarla. Y en el momento en que existe un interruptor
  que la quita, existe la tentación de invertirlo y que sea el interruptor el
  que la PONE para la captura.

  Ahí se cruza la línea. Los factores del banco se clampan a [0,1] con 1 =
  producción: sólo pueden restar, así que son matemáticamente incapaces de
  halagar nada. Estos tests fijan que las capas tengan esa misma propiedad — si
  el defecto dejara de ser «todas encendidas», las tres capturas dejarían de
  ser evidencia de lo que recibe el visitante y pasarían a ser una demo.
*/
describe("capas de atmósfera", () => {
  it("por defecto están las tres, y el banco entero es producción", () => {
    expect(parseVisualBench(null).atmosphere).toEqual({
      stars: true,
      halo: true,
      marks: true,
    });
    expect(parseVisualBench("{}").atmosphere).toEqual(
      FULL_VISUAL_BENCH.atmosphere,
    );
  });

  it("solo un false literal apaga una capa", () => {
    expect(parseVisualBench('{"atmosfera":{"estrellas":false}}').atmosphere)
      .toEqual({ stars: false, halo: true, marks: true });
    for (const otro of ['"false"', "0", "null", "true"]) {
      expect(
        parseVisualBench(`{"atmosfera":{"halo":${otro}}}`).atmosphere.halo,
        otro,
      ).toBe(true);
    }
  });

  it("apaga las capas por separado, que es la pregunta que se hace sobre un fondo", () => {
    // No es «cuánta atmósfera» sino «cuál de las tres está haciendo el
    // trabajo». Un nivel de 0 a 3 no puede responder eso.
    const soloEstrellas = parseVisualBench(
      '{"atmosfera":{"halo":false,"marcas":false}}',
    ).atmosphere;
    expect(soloEstrellas).toEqual({ stars: true, halo: false, marks: false });
  });

  it("una atmósfera rota no deja al visitante sin fondo", () => {
    // Falla cerrado hacia producción, igual que el resto del parser.
    for (const roto of ['"todo"', "3", "null", "[]"]) {
      expect(
        parseVisualBench(`{"atmosfera":${roto}}`).atmosphere,
        roto,
      ).toEqual(FULL_VISUAL_BENCH.atmosphere);
    }
  });

  it("los modos de diagnóstico sólo se encienden con un true literal", () => {
    // Polaridad contraria a la atmósfera: cada modo QUITA una parte de la
    // imagen, así que nadie puede caer en él por un JSON a medias.
    expect(parseVisualBench(null).diagnostic).toEqual({
      density: false,
      direct: false,
      lensed: false,
    });
    for (const otro of ['"true"', "1", "null", "false"]) {
      expect(
        parseVisualBench(`{"diagnostico":{"densidad":${otro}}}`).diagnostic
          .density,
        otro,
      ).toBe(false);
    }
    for (const roto of ['"densidad"', "7", "null", "[]"]) {
      expect(
        parseVisualBench(`{"diagnostico":${roto}}`).diagnostic,
        roto,
      ).toEqual(FULL_VISUAL_BENCH.diagnostic);
    }
    expect(
      parseVisualBench('{"diagnostico":{"densidad":true,"lensado":true}}')
        .diagnostic,
    ).toEqual({ density: true, direct: false, lensed: true });
  });

  it("empaqueta los modos como bits para el uniforme del raymarch", () => {
    expect(diagnosticCode(FULL_VISUAL_BENCH)).toBe(0);
    expect(
      diagnosticCode(parseVisualBench('{"diagnostico":{"densidad":true}}')),
    ).toBe(1);
    expect(
      diagnosticCode(parseVisualBench('{"diagnostico":{"directo":true}}')),
    ).toBe(2);
    expect(
      diagnosticCode(
        parseVisualBench('{"diagnostico":{"densidad":true,"lensado":true}}'),
      ),
    ).toBe(5);
  });
});
