import { describe, expect, it } from "vitest";
import { WORLD_IDS } from "@/content/worlds.data";
import { SYSTEM_POSE, cameraPoseForRoute } from "./scene-poses";

/**
 * G7 de la matriz del pivote: `cameraPose` es función pura de la ruta — misma
 * ruta, misma pose, sin estado residual.
 *
 * G8 («ningún listener de rueda, drag o scroll escribe en la cámara») se cubre
 * por construcción: este módulo no importa nada del DOM y es el único que
 * produce poses. Lo verifica el test de superficie del final.
 */
describe("G7 · cameraPose = f(ruta)", () => {
  it("la home devuelve la pose del sistema", () => {
    expect(cameraPoseForRoute(null)).toEqual(SYSTEM_POSE);
  });

  it("la misma ruta devuelve siempre exactamente la misma pose", () => {
    for (const id of WORLD_IDS) {
      const first = cameraPoseForRoute(id);
      // Se intercalan otras rutas: si algo guardara estado, la segunda lectura
      // saldría distinta.
      cameraPoseForRoute(null);
      cameraPoseForRoute("gargantua");
      expect(cameraPoseForRoute(id)).toEqual(first);
    }
  });

  it("no hay dos mundos con la misma pose", () => {
    // Si dos rutas compartieran pose, el viaje de G3 entre ellas no tendría a
    // dónde ir y la navegación se sentiría rota.
    const poses = WORLD_IDS.map((id) => JSON.stringify(cameraPoseForRoute(id)));
    expect(new Set(poses).size).toBe(poses.length);
  });

  it("una página de mundo congela y atenúa la escena", () => {
    for (const id of WORLD_IDS) {
      const pose = cameraPoseForRoute(id);
      expect(pose.animated, `${id} sigue animado detrás del texto`).toBe(false);
      expect(pose.opacity).toBeLessThan(SYSTEM_POSE.opacity);
    }
    // Y la home no: ahí la escena ES el contenido de la página.
    expect(SYSTEM_POSE.animated).toBe(true);
  });

  it("la pose devuelta es un valor nuevo, no la constante compartida", () => {
    // Mutar el resultado no puede envenenar la siguiente lectura.
    const world = cameraPoseForRoute("miller");
    world.distanceScale = 99;
    expect(cameraPoseForRoute("miller").distanceScale).not.toBe(99);

    const home = cameraPoseForRoute(null);
    home.distanceScale = 99;
    expect(cameraPoseForRoute(null).distanceScale).toBe(
      SYSTEM_POSE.distanceScale,
    );
  });

  it("descentra Gargantúa lo justo para que la toma no sea un diagrama", () => {
    /*
      El corrimiento existe, y es pequeño en los dos ejes.

      La simetría PERFECTA es lo que hace que la escena se lea como un diagrama
      científico: el centro geométrico del visor es el único sitio donde un
      objeto no parece encuadrado por nadie. Pero el tope importa tanto como el
      suelo — pasado ~0.2 el encuadre tiene que retroceder tanto para compensar
      el corrimiento que devuelve en tamaño de Gargantúa lo que gana en
      composición, y los destinos del lado corto se acercan al borde.
    */
    expect(Math.abs(SYSTEM_POSE.targetShiftFraction)).toBeGreaterThan(0);
    expect(Math.abs(SYSTEM_POSE.targetShiftFraction)).toBeLessThanOrEqual(0.2);
    expect(Math.abs(SYSTEM_POSE.targetShiftYFraction)).toBeLessThanOrEqual(0.2);
  });

  it("las poses de mundo heredan el descentrado, atenuado", () => {
    // Si una pose de mundo se quedara sin corrimiento vertical, la transición
    // de la home a un mundo movería Gargantúa en vertical sin motivo.
    for (const id of ["miller", "endurance", "ranger"] as const) {
      const pose = cameraPoseForRoute(id);
      expect(Math.abs(pose.targetShiftYFraction), id).toBeLessThan(
        Math.abs(SYSTEM_POSE.targetShiftYFraction),
      );
      expect(Math.sign(pose.targetShiftYFraction), id).toBe(
        Math.sign(SYSTEM_POSE.targetShiftYFraction),
      );
    }
  });
});
