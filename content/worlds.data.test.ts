import { describe, expect, it } from "vitest";
import { SYSTEM_POSE } from "@/lib/scene-poses";
import { WORLD_IDS, worldsData } from "./worlds.data";

/** Radio aparente de la sombra de Gargantúa, √27/2 rs. */
const SHADOW = worldsData.gargantua.placement.size;

describe("worlds.data (estructura canónica)", () => {
  it("define exactamente 7 mundos, todos con datos estructurales", () => {
    expect(WORLD_IDS).toHaveLength(7);
    for (const id of WORLD_IDS) {
      expect(worldsData[id]).toBeDefined();
    }
  });

  it("los ids son únicos", () => {
    expect(new Set(WORLD_IDS).size).toBe(WORLD_IDS.length);
  });

  it("el orden narrativo es 1..7 sin repetir", () => {
    const orders = WORLD_IDS.map((id) => worldsData[id].order).sort(
      (a, b) => a - b,
    );
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("los colores son hex válidos", () => {
    const hex = /^#[0-9a-f]{6}$/i;
    for (const id of WORLD_IDS) {
      expect(worldsData[id].accent).toMatch(hex);
      expect(worldsData[id].secondary).toMatch(hex);
    }
  });

  it("cada cuerpo tiene una órbita válida dentro del sistema", () => {
    for (const id of WORLD_IDS) {
      const { placement } = worldsData[id];
      expect(placement.phase).toBeGreaterThanOrEqual(0);
      expect(placement.phase).toBeLessThan(360);
      expect(placement.orbitRadius).toBeGreaterThanOrEqual(0);
      expect(Math.abs(placement.inclination)).toBeLessThan(90);
      expect(placement.size).toBeGreaterThan(0);
    }
  });

  it("Gargantúa es el único cuerpo en el centro", () => {
    // Si otro mundo cayera en radio 0 se solaparía con el agujero negro y su
    // enlace sería inalcanzable con el ratón.
    const centred = WORLD_IDS.filter(
      (id) => worldsData[id].placement.orbitRadius === 0,
    );
    expect(centred).toEqual(["gargantua"]);
  });

  it("los cuerpos orbitan FUERA del disco de acreción", () => {
    // El disco llega a 17 rs. Un cuerpo por dentro atravesaría la zona que el
    // raymarch dibuja con física real y la composición delante se notaría.
    for (const id of WORLD_IDS) {
      const { orbitRadius } = worldsData[id].placement;
      if (orbitRadius === 0) continue;
      expect(orbitRadius, `${id} orbita dentro del disco`).toBeGreaterThan(18);
    }
  });

  it("ninguna órbita se ve de canto", () => {
    // Una órbita casi coplanar con el disco se proyecta como una línea que pasa
    // por el centro: el cuerpo cruzaría por delante de la sombra y su etiqueta
    // caería sobre el agujero negro, ilegible. Ver el comentario de
    // WorldPlacement — es el motivo por el que existe `inclination`.
    for (const id of WORLD_IDS) {
      const { orbitRadius, inclination } = worldsData[id].placement;
      if (orbitRadius === 0) continue;
      expect(
        Math.abs(inclination),
        `${id} tiene una órbita casi de canto`,
      ).toBeGreaterThanOrEqual(10);
    }
  });

  it("ningún cuerpo pasa por delante de la sombra de Gargantúa", () => {
    /*
      Este es el invariante DE VERDAD, y el de arriba no lo garantizaba.

      Lo que decide el achatamiento en pantalla no es la inclinación sola, es su
      suma con la elevación de la cámara: el semieje menor de la elipse que
      dibuja un cuerpo vale R·|sin(i + e)|, y esa cantidad es exactamente su
      distancia mínima al centro del cuadro (ver la deducción en worlds.data.ts).

      Con la cámara a 9° hubo dos órbitas con inclinación NEGATIVA —la Ranger a
      −13° y Cooper Station a −19°— que daban i + e de −4° y −10°. El test
      anterior las aprobaba porque miraba |inclination| ≥ 10 y las dos pasaban.
      En pantalla, la Ranger cruzaba a 22 px del centro con la sombra midiendo
      30 px de radio: por dentro. Su nombre caía sobre el agujero negro una vez
      por vuelta y el cuerpo se perdía contra el disco.

      El umbral baja de 4 a 3 al fijar la cámara en 9°, y baja MEDIDO, no para
      que el test pase.

      El 4 era un proxy: una fórmula que aproximaba «el cuerpo y su nombre
      despejan el horizonte». Con la cámara a 17° ese proxy daba 4.67 al cuerpo
      más justo; a 9° da 3.45, porque el despeje va como sin(i + e) y la
      elevación bajó ocho grados. Lo que hay que comprobar es si eso rompe la
      cosa REAL, y la cosa real se puede medir sobre el DOM ya posicionado por la
      escena, que es lo que se hizo (1440×860, perfil con efectos):

        cuerpo            al centro   hueco cuerpo-sombra   su etiqueta
        Cooper Station      209 px          106 px            259 px
        Ranger              278 px          153 px            346 px
        Endurance           357 px          189 px            532 px

      La sombra mide unos 75 px de radio visible. O sea que el destino más
      cercano deja 106 px de aire y la etiqueta ajena más próxima está a 259 px:
      no hay solape ni por asomo, y el que ata el test —Endurance, 3.45— es de
      los que más despejan en píxeles.

      Se baja a 3 y no a 3.4 para que haya margen otra vez: con 3.4 el reparto
      quedaría a un 1 % del umbral, que es como estaba el test de jerarquía
      aparente y no es un invariante, es una casualidad. Con 3 sigue atrapando de
      sobra el fallo para el que nació: las órbitas de inclinación NEGATIVA de la
      revisión anterior daban 0.7, y a 3 saltan igual.
    */
    for (const id of WORLD_IDS) {
      const { orbitRadius, inclination } = worldsData[id].placement;
      if (orbitRadius === 0) continue;

      const effective = ((inclination + SYSTEM_POSE.elevation) * Math.PI) / 180;
      const closest = orbitRadius * Math.abs(Math.sin(effective));

      expect(
        closest / SHADOW,
        `${id} pasa demasiado cerca del centro del cuadro`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("ningún par de cuerpos comparte órbita y fase", () => {
    // Dos cuerpos en la misma posición parecerían uno solo: un destino
    // desaparecería de la home sin que ningún otro test lo notara.
    const seen = new Set<string>();
    for (const id of WORLD_IDS) {
      const { phase, orbitRadius } = worldsData[id].placement;
      if (orbitRadius === 0) continue;
      const key = `${phase}:${orbitRadius}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});
