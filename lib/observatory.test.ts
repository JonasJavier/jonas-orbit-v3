import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { WORLD_IDS, worldsData, type WorldId } from "@/content/worlds.data";
import {
  cameraBasis,
  hasTurnInstrument,
  keyScreenDirection,
  lightGeometry,
  lightPlacement,
  OBSERVATION_PRESETS,
  ORIGIN_DISTANCE_RADII,
  PENDING_VISUAL_CALIBRATION,
  observationLightIntensity,
  observationPlacement,
  type ObservationInstrument,
  type ObservationPreset,
  type Vec3,
} from "./observatory";

/**
 * O3 de la matriz del Observatorio: cada `WorldId` tiene preset de observación y
 * ninguno escribe un parámetro de material.
 *
 * Y, sobre todo, la garantía que hace que la columna `KEY` de la tabla del §6
 * sea un DATO y no una descripción literaria: el ángulo que promete cada preset
 * es el que sale de la geometría.
 */

const SOLIDS = WORLD_IDS.filter(
  (id): id is Exclude<WorldId, "gargantua"> => id !== "gargantua",
);

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function norm(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

function unit(v: Vec3): Vec3 {
  const n = norm(v);
  return [v[0] / n, v[1] / n, v[2] / n];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

const ORIGIN: Vec3 = [0, 0, 0];

describe("presets de observación", () => {
  it("cubre los cinco sólidos y deja fuera a Gargantúa", () => {
    // La ausencia de Gargantúa es la misma que en `createBody`, que devuelve
    // `null` para ella: no tiene malla y no recibe ninguna luz añadida. Se
    // observa por vistas curadas, que son otro contrato.
    expect(Object.keys(OBSERVATION_PRESETS).sort()).toEqual([...SOLIDS].sort());
    expect(SOLIDS).toHaveLength(5);
    expect(Object.keys(OBSERVATION_PRESETS)).not.toContain("gargantua");
  });

  it("ningún preset puede escribir un parámetro de material", () => {
    /*
      La regla del §6: el Observatorio cambia las condiciones de observación,
      nunca la identidad material. Eso se garantiza aquí por FORMA — si algún
      día alguien añade `albedo`, `nightFloor` o `diffuseExponent` a un preset
      para «que se vea mejor aislado», este test cae antes de que el cambio
      llegue a una captura.
    */
    const allowed = new Set<keyof ObservationPreset>([
      "keyAngle",
      "keyAzimuth",
      "environment",
      "rim",
      "instruments",
      /*
        `boundsFill` entra al montar el segundo espécimen, y entra porque es una
        condición de OBSERVACIÓN: dice a qué distancia se pone la cámara, igual
        que `keyAngle` dice desde dónde llega la luz. No toca el material.

        La lista se amplía a mano a propósito. Esta prueba no está para impedir
        que el preset crezca, sino para que cada campo nuevo tenga que pasar por
        aquí y alguien diga en voz alta de cuál de las dos familias es.
      */
      "boundsFill",
    ]);
    for (const id of SOLIDS) {
      for (const key of Object.keys(OBSERVATION_PRESETS[id])) {
        expect(allowed.has(key as keyof ObservationPreset), `${id}.${key}`).toBe(
          true,
        );
      }
    }
  });

  it("sólo ofrece MATERIAL donde el cuerpo tiene emisión que apagar", () => {
    /*
      Verificado en el shader: `emissive` sólo se escribe dentro de la rama
      `uKind == 8`, que sale por `return`. Miller, Edmunds, los cascos, la
      estructura y el servicio no tienen término emisivo, así que un instrumento
      de «apagar la emisión» no cambiaría un solo píxel sobre ellos.

      El laboratorio adapta sus instrumentos a la muestra: un botón que no hace
      nada es peor que un botón ausente.
    */
    const withMaterial = SOLIDS.filter((id) =>
      OBSERVATION_PRESETS[id].instruments.includes("material"),
    );
    expect(withMaterial.sort()).toEqual(["endurance", "ranger", "tesseract"]);
  });

  it("no ofrece más instrumentos que los tres de la V1", () => {
    /*
      `ESTRUCTURA` (alambre / normales) sale de la V1 como deuda: es el único
      que exige construir un sistema entero desde cero —no hay alambre ni
      normales en el repositorio— y la V1 no tiene por qué demostrar la visión
      completa de una vez.

      La lista se escribe aquí con su tipo para que añadir un instrumento nuevo
      sea una decisión consciente y no un `push` suelto en la tabla: cualquier
      valor fuera de ella cae aquí, incluido un simple error de escritura.
    */
    const V1: readonly ObservationInstrument[] = ["bloom", "material", "datos"];
    for (const id of SOLIDS) {
      const { instruments } = OBSERVATION_PRESETS[id];
      expect(instruments.length, id).toBeGreaterThan(0);
      for (const instrument of instruments) {
        expect(V1, `${id}: ${instrument}`).toContain(instrument);
      }
      expect(new Set(instruments).size, `${id} repite instrumento`).toBe(
        instruments.length,
      );
    }
  });

  it("sólo el Tesseracto lleva rim, y es sutil", () => {
    // Excepción declarada: cristal casi negro, fuera del material común, contra
    // fondo oscuro y sin vecinos. Si el rim llega a leerse como una luz, está
    // mal calibrado.
    for (const id of SOLIDS) {
      const { rim } = OBSERVATION_PRESETS[id];
      if (id === "tesseract") {
        expect(rim).toBeGreaterThan(0);
        expect(rim).toBeLessThan(0.25);
      } else {
        expect(rim, id).toBe(0);
      }
    }
  });

  it("el ambiente existe pero no puede levantar el terminador", () => {
    // Es ambiente, no un fill. Un valor alto borraría la cara noche, que es
    // justo lo que cada material decide por su cuenta.
    for (const id of SOLIDS) {
      const { environment } = OBSERVATION_PRESETS[id];
      expect(environment, id).toBeGreaterThan(0);
      expect(environment, id).toBeLessThanOrEqual(0.1);
    }
  });
});

describe("colocación", () => {
  const RADIUS = 2.4;
  const FRAMING = RADIUS * 2.9; // ~40° de campo

  it("el ángulo de luz que promete el preset es el que sale de la geometría", () => {
    /*
      ÉSTA es la garantía del módulo. La luz no es configurable: es el origen
      del mundo. Así que el ángulo entre «hacia la luz» y «hacia la cámara»,
      medido EN el espécimen, tiene que ser exactamente `keyAngle` — si no, la
      columna KEY de la tabla del §6 no significa nada.
    */
    for (const id of SOLIDS) {
      const { body, camera, preset } = observationPlacement(id, RADIUS, FRAMING);
      const toLight = unit(sub(ORIGIN, body));
      const toCamera = unit(sub(camera, body));
      const degrees = (Math.acos(dot(toLight, toCamera)) * 180) / Math.PI;
      expect(degrees, id).toBeCloseTo(preset.keyAngle, 6);
    }
  });

  it("el espécimen nunca se coloca en el origen", () => {
    /*
      La trampa que decide todo el módulo: en el origen, `toLight = -normal` y
      `ndl = -1` en todo el disco. El cuerpo queda a oscuras y `uLightIntensity`
      no lo arregla, porque multiplica una clave que no llega.
    */
    for (const id of SOLIDS) {
      const { body } = observationPlacement(id, RADIUS, FRAMING);
      expect(norm(body), id).toBeGreaterThan(RADIUS);
    }
  });

  it("la luz llega tan paralela como en el System Map", () => {
    // Si el origen queda cerca, la luz se abre en abanico sobre el cuerpo y el
    // material deja de comportarse como el del mapa. La razón de allí va de ~6
    // a ~13 radios.
    for (const id of SOLIDS) {
      const { body } = observationPlacement(id, RADIUS, FRAMING);
      expect(norm(body) / RADIUS, id).toBeCloseTo(ORIGIN_DISTANCE_RADII, 6);
    }
    expect(ORIGIN_DISTANCE_RADII).toBeGreaterThanOrEqual(6);
    expect(ORIGIN_DISTANCE_RADII).toBeLessThanOrEqual(13);
  });

  it("la cámara nunca cruza el origen ni se mete entre la luz y el espécimen", () => {
    // Con `keyAngle` pequeño la cámara avanza hacia el origen. Si lo pasara, la
    // única fuente del mundo quedaría a su espalda y por delante del cuerpo.
    for (const id of SOLIDS) {
      const { body, camera } = observationPlacement(id, RADIUS, FRAMING);
      expect(norm(camera), id).toBeGreaterThan(0);
      expect(norm(sub(camera, body)), id).toBeCloseTo(FRAMING, 6);
      // El origen se queda por detrás de la cámara, nunca entre ella y el cuerpo.
      expect(norm(body), id).toBeGreaterThan(FRAMING);
    }
  });

  it("es una función pura: misma entrada, misma salida", () => {
    for (const id of SOLIDS) {
      const first = observationPlacement(id, RADIUS, FRAMING);
      observationPlacement("miller", 9, 9);
      const second = observationPlacement(id, RADIUS, FRAMING);
      expect(second).toEqual(first);
    }
  });
});

describe("base de cámara", () => {
  const RADIUS = 2.4;
  const FRAMING = RADIUS * 2.9;

  it("es ortonormal para los cinco presets", () => {
    // Sin un `up` válido el encuadre no está determinado y «dónde cae la luz en
    // pantalla» no significa nada.
    for (const id of SOLIDS) {
      const { body, camera, up } = observationPlacement(id, RADIUS, FRAMING);
      const forward = unit(sub(body, camera));
      expect(norm(up), id).toBeCloseTo(1, 12);
      expect(dot(up, forward), id).toBeCloseTo(0, 12);
    }
  });

  it("sobrevive a la mirada alineada con el eje vertical del mundo", () => {
    /*
      No es un caso de laboratorio: `keyAngle 90` con `keyAzimuth 90` lo produce
      EXACTO, y la Ranger ya está en `keyAngle 90`. Sin eje de reserva el
      producto vectorial se anula y la base sale con NaN.

      Se prueba por aquí y no por un preset porque ninguno lo toca hoy — y una
      salvaguarda que no se puede ejercitar es una salvaguarda que nadie sabe si
      funciona.
    */
    for (const forward of [[0, 1, 0], [0, -1, 0]] as const) {
      const { right, up } = cameraBasis(forward);
      for (const component of [...right, ...up]) {
        expect(Number.isFinite(component)).toBe(true);
      }
      expect(norm(right)).toBeCloseTo(1, 12);
      expect(norm(up)).toBeCloseTo(1, 12);
      expect(dot(right, forward)).toBeCloseTo(0, 12);
    }
  });
});

describe("dónde cae la luz en pantalla", () => {
  const RADIUS = 2.4;
  const FRAMING = RADIUS * 2.9;

  it("su magnitud es el seno del ángulo de clave", () => {
    /*
      Invariante estructural, y a propósito NO se fijan los valores concretos:
      `keyAzimuth` está pendiente de calibración visual y clavar aquí «la luz
      cae a −0.76» convertiría cada ajuste artístico en un test roto.

      Lo que sí se puede afirmar siempre: la componente de la luz perpendicular
      al eje de cámara mide `sin(keyAngle)`. Si esto se rompe, la
      parametrización cambió sin que nadie lo dijera.
    */
    for (const id of SOLIDS) {
      const placement = observationPlacement(id, RADIUS, FRAMING);
      const { right, up } = keyScreenDirection(placement);
      const expected = Math.abs(
        Math.sin((placement.preset.keyAngle * Math.PI) / 180),
      );
      expect(Math.hypot(right, up), id).toBeCloseTo(expected, 12);
      expect(Math.abs(right), id).toBeLessThanOrEqual(1);
      expect(Math.abs(up), id).toBeLessThanOrEqual(1);
    }
  });

  it("devuelve una dirección de pantalla utilizable para calibrar", () => {
    /*
      Aquí NO se fija en qué lado cae la luz.

      Hubo una versión de este test que exigía que los cinco presets la
      dejasen a la izquierda. Era un error de categoría: dónde cae la luz en
      pantalla es una decisión visual sin aprobar —está en
      `PENDING_VISUAL_CALIBRATION`— y convertirla en test la habría blindado
      por accidente. El primer «quiero la luz arriba a la derecha» habría
      llegado con un test rojo defendiendo el estado provisional.

      Lo único que se afirma es que la función sirve para lo que existe: dar
      dos números finitos, en rango, con los que juzgar una captura.
    */
    for (const id of SOLIDS) {
      const { right, up } = keyScreenDirection(
        observationPlacement(id, RADIUS, FRAMING),
      );
      for (const [name, value] of [
        ["right", right],
        ["up", up],
      ] as const) {
        expect(Number.isFinite(value), `${id}.${name}`).toBe(true);
        expect(Math.abs(value), `${id}.${name}`).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("estado de calibración", () => {
  it("ninguna palanca visual está aprobada todavía", () => {
    /*
      CONTRATO VERIFICADO ✅ / CALIBRACIÓN VISUAL ⏳.

      Los tests de arriba demuestran que si un preset dice 55°, la geometría
      produce 55°. NO demuestran que 55° sea el ángulo correcto para la
      Endurance. Esta lista se vacía a medida que Jonás aprueba cada palanca
      sobre una captura; mientras tenga entradas, nadie puede dar los valores
      por buenos porque la suite esté verde.
    */
    expect(PENDING_VISUAL_CALIBRATION.length).toBeGreaterThan(0);
    expect([...PENDING_VISUAL_CALIBRATION]).toContain("ORIGIN_DISTANCE_RADII");
  });
});

describe("intensidad de clave", () => {
  it("reproduce la ley del System Map para cada cuerpo", () => {
    /*
      Se copia a propósito en vez de elegir un valor bonito para el visor: dice
      «a qué distancia del disco vive este cuerpo» y es parte de su identidad.
      Cambiarla sería alterar cómo se ve el material — lo que el §6 prohíbe.
    */
    for (const id of SOLIDS) {
      const { orbitRadius } = worldsData[id].placement;
      const expected = Math.min(
        1.66,
        Math.max(1.08, (25 / Math.max(orbitRadius, 1)) * 1.36),
      );
      expect(observationPlacement(id, 2, 5).lightIntensity, id).toBe(expected);
    }
  });

  it("se queda dentro de la banda del sistema", () => {
    // El suelo 1.08 existe porque un destino que no se ve es un enlace que no
    // existe; el techo 1.66 porque el interior no puede quemarse.
    for (const id of SOLIDS) {
      const value = observationLightIntensity(
        worldsData[id].placement.orbitRadius,
      );
      expect(value, id).toBeGreaterThanOrEqual(1.08);
      expect(value, id).toBeLessThanOrEqual(1.66);
    }
  });

  it("el cuerpo más interior recibe más luz que el más exterior", () => {
    // Endurance a 25 rs contra el Tesseracto a 32: es lo que ordena las capas.
    expect(observationLightIntensity(25)).toBeGreaterThan(
      observationLightIntensity(32),
    );
  });
});

/*
  O11 · El Observatorio y el contrato de cámara no se conocen.

  La enmienda del §2 es lo que hace LEGAL este visor: «el contrato de cámara
  rige la escena persistente; el Observatorio es otra escena, con otro canvas y
  otra cámara, a la que el visitante entra a propósito». La regla 6 del
  repositorio sigue intacta —`cameraPose = f(routeWorldId)`, sin OrbitControls,
  sin arrastre, sin rueda— y este visor no la incumple porque no es esa escena.

  Esa frontera se erosiona de una sola manera: que alguien importe una cosa
  desde la otra buscando reutilizar una pose o un límite de zoom. El día que eso
  pase, el Observatorio dejará de ser «otra escena» y pasará a ser un
  controlador de cámara sobre la escena persistente — que es exactamente lo que
  la regla 6 prohíbe, sólo que por la puerta de atrás.

  Se comprueba sobre las importaciones y no sobre el comportamiento porque el
  comportamiento no lo delata: las dos cosas seguirían funcionando.
*/
describe("O11 · frontera con el contrato de cámara", () => {
  const OBSERVATORY_SOURCES = [
    "lib/observatory.ts",
    /*
      Los tres del pase de Gargantúa entran en la lista, y el primero es el que
      más la necesita: `gargantua-views.ts` declara elevación, campo, roll y
      corrimiento — los mismos seis números que `SYSTEM_POSE`— y la tentación de
      importarlos en vez de declararlos es exactamente la erosión que esta
      prueba existe para impedir. La duplicación la vigila otro test, que sí
      puede conocer las dos orillas.
    */
    "lib/gargantua-views.ts",
    "components/scene/gargantua-observatory.ts",
    "components/scene/gargantua-render.ts",
    "components/scene/observatory-scene.ts",
    "components/scene/observatory-sky.ts",
    "components/scene/specimen-contract.ts",
    "components/observatory-viewer.tsx",
  ];

  it("ningún módulo del Observatorio importa scene-poses", () => {
    for (const source of OBSERVATORY_SOURCES) {
      const code = readFileSync(join(process.cwd(), source), "utf8");
      expect(code, `${source} importa el contrato de cámara`).not.toMatch(
        /from\s+["'][^"']*scene-poses/,
      );
    }
  });

  it("scene-poses no sabe que el Observatorio existe", () => {
    const code = readFileSync(
      join(process.cwd(), "lib/scene-poses.ts"),
      "utf8",
    );
    expect(code).not.toMatch(/observator/i);
  });
});

/**
 * ── EL INSTRUMENTO `LUZ` ────────────────────────────────────────────────────
 *
 * Es el mando nuevo de la V2 y el único del Observatorio que mueve el mundo, así
 * que es el que más necesita que su promesa esté escrita como prueba.
 *
 * La promesa es una frase: **la misma cara, el mismo encuadre, la misma
 * distancia, otra luz.** Aquí no hay una lámpara que arrastrar —la luz ES el
 * origen del mundo— así que lo que se mueve es el espécimen ALREDEDOR de ese
 * origen, con la cámara rígidamente enganchada a él. Eso es lo contrario de
 * orbitar, que mueve la cámara y deja el espécimen quieto.
 *
 * Las tres invariantes de abajo son esa frase, una por cláusula. Si alguien
 * reimplementara el mando moviendo la cámara —que es lo que parece más fácil—
 * caerían las tres a la vez.
 */
describe("la geometría de la luz", () => {
  /** La pose de casa del Tesseracto, que es la que usa el visor al abrir. */
  const casa = observationPlacement("tesseract", 1, 3.2);

  it("leer la luz de la pose de casa devuelve el ángulo del preset", () => {
    /*
      No es una tautología: `lightGeometry` no mira el preset. Mide el ángulo
      entre «hacia la luz» y «hacia la cámara» sobre las POSICIONES de mundo que
      produjo `observationPlacement`. Que los dos números coincidan es lo que
      demuestra que el dial va a enseñar la cámara real y no una copia del dato.
    */
    const medida = lightGeometry(casa.camera, casa.body, casa.up);
    expect(medida.key).toBeCloseTo(OBSERVATION_PRESETS.tesseract.keyAngle, 6);
  });

  it("colocar y volver a leer da el mismo par, para cualquier ángulo", () => {
    /*
      `lightPlacement` y `lightGeometry` son inversas, y eso no es elegancia: es
      lo que permite que el dial sea a la vez mando y lectura sin pelearse
      consigo mismo. Si la ida y la vuelta no fueran exactas, cada fotograma
      escribiría en el `<input>` un número ligeramente distinto del que acaba de
      poner el pulgar, y la aguja temblaría mientras se arrastra.
    */
    for (const key of [12, 45, 90, 134, 168]) {
      for (const roll of [-175, -90, -31, 0, 64, 179]) {
        const puesto = lightPlacement(casa.camera, casa.body, casa.up, {
          key,
          roll,
        });
        const leido = lightGeometry(puesto.camera, puesto.body, casa.up);
        expect(leido.key, `clave ${key}/${roll}`).toBeCloseTo(key, 6);
        expect(leido.roll, `giro ${key}/${roll}`).toBeCloseTo(roll, 6);
      }
    }
  });

  it("conserva la cámara respecto del espécimen, entera", () => {
    /*
      LA CLÁUSULA CENTRAL. El desplazamiento cámara-espécimen se arrastra tal
      cual en coordenadas de mundo, así que la cara que se ve, el encuadre y la
      distancia son exactamente los mismos antes y después. Es lo que convierte
      el mando en un instrumento: se puede sostener la pose y barrer la
      iluminación, que es la única variable que el §6 autoriza a tocar.
    */
    const antes: Vec3 = [
      casa.camera[0] - casa.body[0],
      casa.camera[1] - casa.body[1],
      casa.camera[2] - casa.body[2],
    ];
    const puesto = lightPlacement(casa.camera, casa.body, casa.up, {
      key: 38,
      roll: -120,
    });
    for (let i = 0; i < 3; i += 1) {
      expect(puesto.camera[i] - puesto.body[i]).toBeCloseTo(antes[i], 9);
    }
  });

  it("no cambia a qué distancia del origen vive el espécimen", () => {
    /*
      Y ésta es la que protege el MATERIAL. `ORIGIN_DISTANCE_RADII` gobierna cuán
      paralela llega la luz al cuerpo; si el mando lo moviera, el mando estaría
      cambiando el carácter de la iluminación además de su dirección, y eso ya no
      es una condición de observación. El espécimen se queda en su esfera.
    */
    const radio = Math.hypot(...casa.body);
    for (const key of [0, 74, 180]) {
      const puesto = lightPlacement(casa.camera, casa.body, casa.up, {
        key,
        roll: 20,
      });
      expect(Math.hypot(...puesto.body)).toBeCloseTo(radio, 9);
    }
  });

  it("acota la clave y no inventa una luz con el espécimen en el origen", () => {
    /*
      Fuera de 0-180 el ángulo entre dos direcciones no existe, así que el mando
      se satura en vez de dar la vuelta. Y con el espécimen en el origen no hay
      dirección de luz que medir —la luz ES el origen—: ahí devolver la pose
      intacta es lo único honesto, porque la alternativa es un NaN que llegaría
      entero hasta la pantalla.
    */
    const arriba = lightPlacement(casa.camera, casa.body, casa.up, {
      key: 260,
      roll: 0,
    });
    expect(lightGeometry(arriba.camera, arriba.body, casa.up).key).toBeCloseTo(
      180,
      6,
    );

    const origen = lightPlacement([0, 0, 3], [0, 0, 0], [0, 1, 0], {
      key: 90,
      roll: 0,
    });
    expect(origen.body).toEqual([0, 0, 0]);
    expect(lightGeometry([0, 0, 3], [0, 0, 0], [0, 1, 0])).toEqual({
      key: 0,
      roll: 0,
    });
  });

  it("el giro dice dónde cae la luz EN PANTALLA", () => {
    /*
      La convención, fijada aquí porque es la que hace el mando predecible: 0° es
      luz por la derecha del cuadro y +90° por arriba. Se comprueba contra
      `keyScreenDirection`, que es la función que el §6 ya usaba para responder
      «quiero la luz arriba a la derecha» — dos caminos al mismo sitio, y si
      alguna vez discreparan uno de los dos estaría mintiendo.
    */
    for (const roll of [0, 90, -90, 145]) {
      const puesto = lightPlacement(casa.camera, casa.body, casa.up, {
        key: 70,
        roll,
      });
      const pantalla = keyScreenDirection({
        ...casa,
        body: puesto.body,
        camera: puesto.camera,
      });
      expect(
        (Math.atan2(pantalla.up, pantalla.right) * 180) / Math.PI,
        `giro ${roll}`,
      ).toBeCloseTo(roll, 4);
    }
  });
});

describe("el eje de la figura", () => {
  /*
    LA FRONTERA DEL MANDO `EJE`, y las dos ausencias que la dibujan.

    El instrumento gira el espécimen sobre su propio eje: otra cara, la MISMA
    luz. Es el tercer gesto del laboratorio y el único que no cambia la
    geometría de iluminación, porque no mueve el cuerpo del sitio del mundo
    donde está.

    Gargantúa se queda fuera por lo de siempre —no hay malla que girar— y el
    Tesseracto por un motivo suyo que NO es técnico: su orientación de reposo es
    toda su lectura. Este test existe para que quitarlo de la lista cueste
    explicar por qué, que es lo que un comentario solo no consigue.
  */
  it("gira lo que tiene eje, y deja fuera a las dos que no lo tienen", () => {
    for (const id of ["endurance", "ranger", "miller", "edmunds"] as const) {
      expect(hasTurnInstrument(id), id).toBe(true);
    }
    expect(hasTurnInstrument("gargantua")).toBe(false);
    expect(hasTurnInstrument("tesseract")).toBe(false);
  });

  /*
    LA OTRA MITAD DEL CONTRATO NO SE PRUEBA AQUÍ, y conviene decir por qué en
    vez de escribir una prueba que no pueda fallar.

    «Girar la figura no cambia la luz» es cierto por AUSENCIA: `lightGeometry`
    recibe tres vectores del mundo —cámara, cuerpo y vertical— y la orientación
    del modelo no está entre ellos ni puede estarlo, porque este módulo no
    conoce three.js. Llamarla dos veces con los mismos argumentos para
    comprobar que da lo mismo sería comprobar que una función es una función.

    Lo que sí se puede romper es que el mando mueva algo que no debe, y eso se
    mide donde hay malla: `bodies.test.ts` fija que el eje pasa por el origen de
    la raíz —la envolvente no cambia, y con ella el encuadre— y
    `observatory-frames.test.ts` barre el círculo entero contra esa envolvente.
  */
});
