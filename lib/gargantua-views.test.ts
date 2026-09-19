import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GARGANTUA_RS } from "@/components/scene/gargantua-shaders";
import { SYSTEM_POSE } from "./scene-poses";
import {
  distanceForAspect,
  ELEVATION_CEILING,
  ELEVATION_FLOOR,
  GARGANTUA_VIEWS,
  gargantuaFraming,
  gargantuaTelemetry,
  type GargantuaView,
} from "./gargantua-views";
import {
  GARGANTUA_INSTRUMENTS,
  hasLightInstrument,
  instrumentsFor,
  OBSERVATION_PRESETS,
} from "./observatory";

/**
 * O5 de la matriz del Observatorio, y el contrato propio de Gargantúa.
 *
 * > Gargantúa no expone órbita libre ni recibe luz añadida.
 * > — docs/design/tesseract-experimentos.md §12
 *
 * Era la única fila de la matriz sin implementar, y no por descuido: hasta este
 * pase no había nada que comprobar, porque Gargantúa no estaba montada. Ahora
 * sí, y las dos mitades de esa frase son dos clases de garantía distintas:
 *
 *  · **La luz** se comprueba aquí, sobre datos: no tiene preset, no tiene
 *    instrumento de luz y su telemetría no publica ángulo de clave.
 *  · **La órbita** se comprueba aquí en su mitad declarativa —el instrumento
 *    dice `canOrbit: false`— y en el navegador en la que importa: arrastrar el
 *    lienzo no mueve ni un número (`e2e/observatorio.spec.ts`). Un test de
 *    datos no puede demostrar que no hay un manejador de puntero.
 */

const DEG = Math.PI / 180;

/** La fracción del ALTO que ocupa la sombra: 2.598 rs sobre el campo. */
function shadowFraction(view: GargantuaView): number {
  return 2.598 / (view.distance * Math.tan((view.fov / 2) * DEG));
}

/** La fracción del SEMIANCHO que ocupa el disco: 17 rs sobre el campo. */
function diskFraction(view: GargantuaView, aspect = 1.6): number {
  return 17 / (view.distance * Math.tan((view.fov / 2) * DEG) * aspect);
}

describe("O5 · Gargantúa no recibe luz y no se orbita", () => {
  it("no tiene preset de observación, y esa ausencia es el contrato", () => {
    /*
      La misma frontera que `createBody`, que devuelve `null` para ella. Un
      preset declara `keyAngle`, `keyAzimuth`, `environment` y `rim`: las cuatro
      son formas de añadir o dirigir luz, y el §6 se lo prohíbe con todas las
      letras — «Gargantúa no recibe ninguna luz añadida. Nada. En ninguna
      vista». Darle un preset para que encajara en el molde de los cinco sólidos
      habría sido incumplirlo por comodidad de tipos.
    */
    expect(Object.keys(OBSERVATION_PRESETS)).not.toContain("gargantua");
  });

  it("no ofrece LUZ ni MATERIAL, y sí los tres de física", () => {
    expect(hasLightInstrument("gargantua")).toBe(false);
    // Y los otros cinco sí: si alguien invierte la condición, esto cae.
    for (const id of ["tesseract", "endurance", "ranger", "miller", "edmunds"] as const) {
      expect(hasLightInstrument(id), id).toBe(true);
    }

    const bank = instrumentsFor("gargantua");
    // `material` escribe `uEmission`, que vive en el shader común de los
    // cuerpos. Aquí no hay cuerpo: el botón no cambiaría un píxel.
    expect(bank).not.toContain("material");
    expect(bank).toEqual(GARGANTUA_INSTRUMENTS);
    /*
      Los tres que SÍ tiene son ramas reales del fragmento. Se comprueba contra
      el shader y no contra una lista escrita aquí: si alguien retira un
      uniforme, este test cae antes de que la interfaz ofrezca un mando muerto.
    */
    const shader = readFileSync(
      join(process.cwd(), "components/scene/gargantua-shaders.ts"),
      "utf8",
    );
    for (const [instrument, uniform] of [
      ["doppler", "uDoppler"],
      ["secundarias", "uSecondary"],
      ["lente", "uSkyLens"],
    ] as const) {
      expect(bank, instrument).toContain(instrument);
      expect(shader, uniform).toContain(`uniform float ${uniform};`);
      // Declarado Y usado: un uniforme que nadie lee es un mando que no hace
      // nada, que es peor que un mando ausente.
      expect(
        shader.split(uniform).length - 1,
        `${uniform} se declara pero no se usa`,
      ).toBeGreaterThan(1);
    }
  });

  it("su telemetría no publica ángulo de clave", () => {
    /*
      Un cero en esa casilla no sería un dato neutro. El ángulo de clave mide la
      separación entre la luz y la mirada, y aquí la luz es el propio objeto: no
      hay ángulo que medir, así que la lectura no existe. Es la regla del §8
      —nada de lo que parece medido puede estar tecleado— aplicada a una
      ausencia, que es donde más fácil es romperla.
    */
    const measured = gargantuaTelemetry(GARGANTUA_VIEWS[0], 1.6);
    expect(measured).not.toHaveProperty("key");
    expect(measured).not.toHaveProperty("roll");
    expect(measured.fov).toBe(GARGANTUA_VIEWS[0].fov);
  });
});

describe("las cuatro vistas curadas", () => {
  it("son exactamente cuatro, con id y rótulo propios", () => {
    expect(GARGANTUA_VIEWS).toHaveLength(4);
    expect(GARGANTUA_VIEWS.map((view) => view.id)).toEqual([
      "cinematografica",
      "lente",
      "disco",
      "sombra",
    ]);
    const labels = new Set(GARGANTUA_VIEWS.map((view) => view.label));
    expect(labels.size).toBe(4);
  });

  it("cada una dice qué estudia, y ninguna repite la frase", () => {
    const studies = new Set(GARGANTUA_VIEWS.map((view) => view.study));
    expect(studies.size).toBe(4);
    for (const view of GARGANTUA_VIEWS) {
      expect(view.study.length, view.id).toBeGreaterThan(40);
    }
  });

  it("ninguna baja del suelo de elevación que fijó el A/B de la home", () => {
    /*
      9° no es un mínimo técnico, es una decisión escrita en `scene-poses.ts`:
      por debajo se sigue aplanando la elipse, pero se persigue un fotograma
      concreto de Interstellar a costa de la composición propia. Y 17° es el
      techo del mismo A/B. Una vista nueva rompe esta banda sin querer — es
      justo lo que apetece hacer para «que se vea mejor el disco».
    */
    for (const view of GARGANTUA_VIEWS) {
      expect(view.elevation, view.id).toBeGreaterThanOrEqual(ELEVATION_FLOOR);
      expect(view.elevation, view.id).toBeLessThanOrEqual(ELEVATION_CEILING);
    }
  });

  it("las dos de conjunto encuadran el disco entero; las de detalle, no", () => {
    /*
      LA ARITMÉTICA DEL ENCUADRE, fijada aquí porque ya se rompió una vez.

      La primera versión eligió las distancias estimando —«más cerca para la
      lente»— y las dos vistas de detalle salieron siendo una pared de crema sin
      objeto dentro: a 26 rs el disco ocupa el 150 % del semiancho y el anillo
      de fotones desaparece debajo de su propia luz.

      Estos números son los que documenta el módulo. Si alguien cambia una
      distancia o un campo, este test cae y le obliga a actualizar la tabla — que
      es exactamente lo que hace falta, porque ya pasó que el comentario dijera
      34 / 15 mientras el código seguía en 38 / 18.
    */
    const by = (id: string) => GARGANTUA_VIEWS.find((v) => v.id === id)!;

    // De conjunto: el disco entero con el aire del §5.
    for (const id of ["cinematografica", "disco"]) {
      expect(diskFraction(by(id)), id).toBeGreaterThan(0.7);
      expect(diskFraction(by(id)), id).toBeLessThan(0.9);
    }

    // De detalle: el disco SE SALE, a propósito.
    for (const id of ["lente", "sombra"]) {
      expect(diskFraction(by(id)), id).toBeGreaterThan(1);
    }

    /*
      Y `SOMBRA` tiene que ser inconfundible con `LENTE`. Con las dos al mismo
      calibre daban la misma imagen, y dos vistas que enseñan lo mismo son una
      vista y un rótulo de más. El vacío tiene que dominar el cuadro: más de la
      mitad del alto, y bastante más que en la vista de al lado.
    */
    expect(shadowFraction(by("sombra"))).toBeGreaterThan(0.5);
    expect(shadowFraction(by("sombra"))).toBeGreaterThan(
      shadowFraction(by("lente")) * 1.4,
    );
  });

  it("la cinematográfica es la pose de la home, medida contra su fuente", () => {
    /*
      LA DUPLICACIÓN DECLARADA, y su única defensa posible.

      El §2 prohíbe que el Observatorio importe `scene-poses.ts` —hacerlo lo
      convertiría en un controlador sobre la escena persistente, que es lo que
      la regla 6 del repositorio veta— así que la vista canónica tiene que
      declarar sus propios números. Eso es una segunda fuente de verdad para la
      composición aprobada, y una segunda fuente sin vigilancia deriva.

      Un TEST sí puede conocer las dos orillas. Si alguien recalibra la pose de
      la home, esto cae y obliga a decidir a propósito si la vista la sigue.
    */
    const canonical = GARGANTUA_VIEWS[0];
    expect(canonical.elevation).toBe(SYSTEM_POSE.elevation);
    expect(canonical.azimuth).toBe(SYSTEM_POSE.azimuth);
    expect(canonical.fov).toBe(SYSTEM_POSE.fov);
    expect(canonical.roll).toBe(SYSTEM_POSE.roll);
    expect(canonical.shiftX).toBe(SYSTEM_POSE.targetShiftFraction);
    expect(canonical.shiftY).toBe(SYSTEM_POSE.targetShiftYFraction);
  });
});

describe("la geometría de cámara del raymarch", () => {
  const aspect = 1.6;

  it("entrega una base ortonormal que mira al agujero", () => {
    for (const view of GARGANTUA_VIEWS) {
      const { position, right, up, forward } = gargantuaFraming(view, aspect);

      const norm = (v: readonly number[]) => Math.hypot(...v);
      for (const [name, axis] of [
        ["right", right],
        ["up", up],
        ["forward", forward],
      ] as const) {
        expect(norm(axis), `${view.id}/${name}`).toBeCloseTo(1, 6);
      }

      const dot = (a: readonly number[], b: readonly number[]) =>
        a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      expect(dot(right, up), `${view.id}/right·up`).toBeCloseTo(0, 6);
      expect(dot(right, forward), `${view.id}/right·fwd`).toBeCloseTo(0, 6);
      expect(dot(up, forward), `${view.id}/up·fwd`).toBeCloseTo(0, 6);

      /*
        Y la mirada apunta al agujero, no a cualquier sitio. No exactamente al
        origen: el corrimiento de la composición aprobada lo descentra un poco a
        propósito, y ese poco está acotado —el §14 del documento del hero dice
        que el techo práctico ronda 0.2 del semicuadro—. Basta con que el origen
        esté por delante de la cámara y cerca del eje.
      */
      const toOrigin = position.map((c) => -c);
      const distance = norm(toOrigin);
      const cosine = dot(toOrigin.map((c) => c / distance), forward);
      expect(cosine, view.id).toBeGreaterThan(0.97);
    }
  });

  it("la distancia se lee en radios de Schwarzschild, no en unidades de mundo", () => {
    /*
      La unidad importa: `GARGANTUA_RS` vale 1.4 en el integrador, así que una
      cámara «a 42» está a 58.8 unidades de mundo. Publicar el número de mundo
      sería publicar una cifra que no significa nada — «a 42 radios del
      horizonte» sí, y es la única distancia comprobable contra un libro.
    */
    const view = GARGANTUA_VIEWS[0];
    const { position, radii } = gargantuaFraming(view, aspect);
    expect(radii).toBe(view.distance);
    expect(Math.hypot(...position)).toBeCloseTo(view.distance * GARGANTUA_RS, 6);
  });

  it("un viewport estrecho RETROCEDE, y uno ancho no se acerca", () => {
    /*
      El disco es una figura ancha: lo que se sale en un móvil en vertical son
      los lados. Mantener constante el semiancho del cuadro pide `d ∝ 1/aspecto`,
      y sólo hacia atrás — acercarse porque sobra sitio a los lados sacaría el
      disco por arriba y por abajo.
    */
    const vista = { distance: 40, fov: 20 };
    expect(distanceForAspect(vista, 1.6)).toBe(40);
    expect(distanceForAspect(vista, 2.4)).toBe(40);
    // 375 × 812 es el proyecto móvil de la suite: aspecto 0.46.
    expect(distanceForAspect(vista, 375 / 812)).toBeGreaterThan(40);
  });

  it("pero el retroceso tiene tope: la sombra no se vuelve una mancha", () => {
    /*
      La primera versión sólo tenía la regla de «que quepa el disco» y en un
      teléfono en vertical llevaba la cámara de 42 a 145 radios: el disco cabía
      entero y el espécimen quedaba en un borrón en medio del cielo. Cumplir la
      regla al pie de la letra producía lo que el §5 prohíbe.

      En 375 × 812 no se pueden tener las dos cosas, y de las dos manda la que
      hace de esto una muestra: que la sombra se lea. Se comprueba sobre las
      cuatro vistas, porque el tope depende del campo de cada una.
    */
    const movil = 375 / 812;
    for (const view of GARGANTUA_VIEWS) {
      const distancia = distanceForAspect(view, movil);
      const sombra = 2.598 / (distancia * Math.tan((view.fov / 2) * DEG));
      // Con holgura de coma flotante: el tope deja a `LENTE` clavada en el
      // suelo, y ahí 0.12 sale como 0.11999999999999998.
      expect(sombra, view.id).toBeGreaterThan(0.1199);
      // Y nunca se acerca más de lo declarado: el tope acota, no invierte.
      expect(distancia, view.id).toBeGreaterThanOrEqual(view.distance);
    }
  });

  it("cambiar de vista mueve la cámara y nunca el espécimen", () => {
    /*
      La invariante que separa a este espécimen de los otros cinco. En un sólido
      una vista MUEVE el cuerpo alrededor del origen, porque el origen es la
      lámpara y colocarlo es elegir el ángulo de luz. Aquí el cuerpo ES el
      origen y no se mueve nunca: si una vista pudiera desplazarlo, estaría
      moviendo la fuente de luz del sistema, que es justo lo que el §6 prohíbe.

      Se comprueba por la forma del módulo: no hay nada que devuelva una
      posición de espécimen, y todas las cámaras miran al mismo punto.
      */
    const distances = GARGANTUA_VIEWS.map(
      (view) => gargantuaFraming(view, aspect).radii * GARGANTUA_RS,
    );
    for (const [i, view] of GARGANTUA_VIEWS.entries()) {
      const { position } = gargantuaFraming(view, aspect);
      // Todas a su distancia declarada DEL ORIGEN: el agujero está en (0,0,0)
      // en las cuatro, y eso es lo que significa que no se mueve.
      expect(Math.hypot(...position), view.id).toBeCloseTo(distances[i], 6);
    }
  });
});
