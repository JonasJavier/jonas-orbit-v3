import { describe, expect, it } from "vitest";
import {
  OBSERVATION_VIEWS,
  observationTelemetry,
  observationViews,
  observationPreset,
  resolveView,
} from "./observation-views";
import {
  OBSERVATION_ORDER,
  OBSERVATION_PRESETS,
  observationPlacement,
} from "./observatory";

/**
 * Las vistas y la telemetría son datos y aritmética, así que se pueden demostrar
 * sin escena, sin GPU y sin DOM — igual que los presets.
 *
 * Lo que se fija aquí no es que una vista se vea bien: es que ninguna prometa
 * una capacidad que el modelo no tiene, y que los cuatro números que se enseñan
 * salgan de la cámara y no de un teclado.
 */

describe("las vistas de observación", () => {
  it("sólo existen donde hay espécimen que observar", () => {
    /*
      Gargantúa NO puede tener vistas aquí. El §7 diseña cuatro —cinematográfica,
      lente, disco y sombra— pero eso es una especificación: no tiene malla,
      `createBody` devuelve `null` y en el catálogo figura sin montar. Una lista
      de vistas para ella sería un instrumento prometiendo lo que no hay.
    */
    expect(observationViews("gargantua")).toHaveLength(0);
    expect(observationViews("tesseract").length).toBeGreaterThan(1);
    expect(observationViews("endurance").length).toBeGreaterThan(1);
  });

  it("la canónica no repite los números del preset", () => {
    /*
      La invariante que impide dos fuentes para el mismo ángulo. Si alguien
      calibra `keyAngle` en el preset y la vista lleva su propia copia, la
      canónica deja de ser la pose del espécimen sin que nadie se entere.
    */
    for (const [id, views] of Object.entries(OBSERVATION_VIEWS)) {
      const canonical = views[0];
      expect(canonical.id, id).toBe("canonica");
      expect(canonical.keyAngle, id).toBeUndefined();
      expect(canonical.keyAzimuth, id).toBeUndefined();
      expect(canonical.distance, id).toBeUndefined();
    }
  });

  it("cada vista dice qué estudia, y ninguna se repite", () => {
    for (const id of OBSERVATION_ORDER) {
      const views = observationViews(id);
      const keys = new Set(views.map((view) => view.id));
      expect(keys.size, id).toBe(views.length);
      for (const view of views) {
        expect(view.study.length, `${id}/${view.id}`).toBeGreaterThan(20);
        expect(view.label.length, `${id}/${view.id}`).toBeGreaterThan(2);
      }
    }
  });

  it("los ángulos resueltos caen dentro del contrato del preset", () => {
    for (const id of OBSERVATION_ORDER) {
      const preset = observationPreset(id);
      if (!preset) continue;
      for (const view of observationViews(id)) {
        const { keyAngle, keyAzimuth, distance } = resolveView(preset, view);
        expect(keyAngle, `${id}/${view.id}`).toBeGreaterThanOrEqual(0);
        expect(keyAngle, `${id}/${view.id}`).toBeLessThanOrEqual(180);
        expect(keyAzimuth, `${id}/${view.id}`).toBeGreaterThanOrEqual(0);
        expect(keyAzimuth, `${id}/${view.id}`).toBeLessThan(360);
        /*
          NINGUNA VISTA SE ACERCA, y esto es la regla escrita como prueba.

          La silueta del Tesseracto ocupa entre el 54 % y el 86 % del alto según
          la fase de su reconfiguración —treinta y un puntos—, así que un factor
          menor que uno multiplica esa banda entera y la pose gruesa se sale del
          cuadro. Costó una captura: una vista `SECCIÓN` a 0,55 salía cortada por
          los cuatro lados. Alejarse nunca recorta; acercarse es trabajo de la
          rueda, que además sabe volver.
        */
        expect(distance, `${id}/${view.id}`).toBeGreaterThanOrEqual(1);
        // Y el tope de alejamiento del visor: una vista fuera de él sería una
        // pose a la que el visitante no puede regresar.
        expect(distance, `${id}/${view.id}`).toBeLessThanOrEqual(2.6);
      }
    }
  });

  it("observationPreset devuelve null donde no hay preset", () => {
    expect(observationPreset("gargantua")).toBeNull();
    expect(observationPreset("tesseract")).toBe(OBSERVATION_PRESETS.tesseract);
  });
});

describe("la telemetría", () => {
  /**
   * LA PRUEBA QUE VALE: el `KEY` que se enseña es el `keyAngle` del preset.
   *
   * No es una tautología. La telemetría no lee el preset — mide el ángulo entre
   * la luz y la mirada sobre las POSICIONES de mundo que produce
   * `observationPlacement`. Que los dos números coincidan en la pose de casa es
   * lo que demuestra que la lectura describe la cámara de verdad, y no que
   * alguien haya copiado el dato de un sitio a otro.
   */
  it("en la pose de casa reproduce el ángulo de clave del preset", () => {
    for (const id of ["tesseract", "endurance", "ranger", "miller", "edmunds"] as const) {
      const placement = observationPlacement(id, 1, 3.2);
      const measured = observationTelemetry(placement.camera, placement.body, 1);
      expect(measured.key, id).toBeCloseTo(OBSERVATION_PRESETS[id].keyAngle, 4);
    }
  });

  it("la distancia va en radios del espécimen", () => {
    const measured = observationTelemetry([0, 0, 6], [0, 0, 0], 2);
    expect(measured.distance).toBeCloseTo(3, 6);
  });

  it("elevación y azimut siguen la convención del arrastre", () => {
    // `THREE.Spherical`: theta se mide desde +Z hacia +X.
    expect(observationTelemetry([0, 0, 5], [0, 0, 0], 1).azimuth).toBeCloseTo(0, 6);
    expect(observationTelemetry([5, 0, 0], [0, 0, 0], 1).azimuth).toBeCloseTo(90, 6);
    expect(observationTelemetry([0, 5, 0], [0, 0, 0], 1).elevation).toBeCloseTo(90, 6);
    expect(observationTelemetry([0, -5, 0], [0, 0, 0], 1).elevation).toBeCloseTo(-90, 6);
  });

  it("con el espécimen en el origen no inventa un ángulo de clave", () => {
    /*
      Ahí no hay dirección de luz que medir —la luz ES el origen— y la
      alternativa a devolver 0 es un NaN que llegaría intacto hasta la pantalla.
    */
    expect(observationTelemetry([0, 0, 4], [0, 0, 0], 1).key).toBe(0);
  });
});
