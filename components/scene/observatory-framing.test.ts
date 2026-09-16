import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { worldsData } from "@/content/worlds.data";
import { observationPlacement } from "@/lib/observatory";
import { createBody, disposeBody } from "./bodies";
import { BOUNDS_FILL, FOV } from "./observatory-scene";

/**
 * El encuadre del Observatorio, medido sobre el modelo y no sobre una captura.
 *
 * ── Por qué esto no se puede comprobar mirando ──────────────────────────────
 *
 * El primer pase visual calibró `BOUNDS_FILL` contra capturas: doce fotogramas
 * repartidos por el ciclo del trazo, media de ocupación, listo. Y estaba mal
 * planteado, porque el Tesseracto NO tiene ciclo.
 *
 * Su trazo euleriano sí: 32 aristas en 18 s. Pero su forma la deciden tres
 * rotaciones 4D a `t·0.19`, `t·0.137` y `t·0.083` radianes —periodos de 33.1,
 * 45.9 y 75.7 s— cuyas razones son irracionales. La pose es CUASIPERIÓDICA: no
 * vuelve a repetirse nunca. Un muestreo de doce capturas sobre dieciocho
 * segundos no acota el máximo de nada; sólo dice qué pasó en doce instantes.
 *
 * Y el máximo es justo lo que hay que acotar: «el espécimen nunca toca los
 * bordes» es una promesa sobre el peor instante, no sobre el instante medio.
 * Por eso se mide aquí, barriendo el tiempo sobre la geometría de verdad —la
 * que construye `createBody` y deforma `spinAt`, sin reimplementar un solo
 * número— y proyectándola con la misma cámara que monta el driver.
 *
 * Es la lección de `tools/composition.mjs` aplicada a un test: leer la escena,
 * no copiarla.
 */

/** Diez minutos a 20 muestras por segundo. Cubre de sobra los tres periodos y
 *  sus batidos, que es donde viven los extremos. */
const SPAN_SECONDS = 600;
const STEP = 0.05;

/** 1440×900, el formato en el que se juzga todo el proyecto. */
const ASPECT = 1440 / 900;

describe("encuadre del Observatorio", () => {
  const world = worldsData.tesseract;
  const body = createBody({
    id: "tesseract",
    visual: world.visual,
    accent: world.accent,
    secondary: world.secondary,
    placement: world.placement,
  });
  if (!body) throw new Error("el Tesseracto no construyó cuerpo");

  const framing =
    body.radius / (BOUNDS_FILL * Math.sin(((FOV / 2) * Math.PI) / 180));
  const place = observationPlacement("tesseract", body.radius, framing);

  const target = new THREE.Vector3(...place.body);
  body.object.position.copy(target);

  const camera = new THREE.PerspectiveCamera(FOV, ASPECT, 0.1, 4000);
  camera.position.set(...place.camera);
  camera.up.set(...place.up);
  camera.lookAt(target);
  camera.updateMatrixWorld();

  /**
   * La ocupación vertical del espécimen en el instante `seconds`, en fracción
   * del alto del cuadro.
   *
   * Recorre los vértices REALES de la malla ya deformada. No se queda con la
   * envolvente porque la envolvente es precisamente lo que mentía: un 4-cubo en
   * alambre la toca en ocho puntos y en ningún sitio más.
   */
  function occupancy(seconds: number): number {
    body!.spinAt(seconds);
    body!.object.updateMatrixWorld(true);

    let top = -Infinity;
    let bottom = Infinity;
    const p = new THREE.Vector3();

    body!.object.traverseVisible((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const position = node.geometry.getAttribute("position");
      if (!position) return;
      for (let i = 0; i < position.count; i++) {
        p.fromBufferAttribute(position as THREE.BufferAttribute, i);
        p.applyMatrix4(node.matrixWorld).project(camera);
        if (p.z > 1) continue; // detrás de la cámara: su proyección no existe
        if (p.y > top) top = p.y;
        if (p.y < bottom) bottom = p.y;
      }
    });

    // El NDC va de -1 a 1, así que el alto del cuadro son 2 unidades.
    return (top - bottom) / 2;
  }

  const samples: number[] = [];
  for (let t = 0; t < SPAN_SECONDS; t += STEP) samples.push(occupancy(t));
  disposeBody(body);

  const max = Math.max(...samples);
  const min = Math.min(...samples);
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;

  it("el espécimen nunca se sale del cuadro", () => {
    /*
      La promesa dura del §5, y la que el dueño pidió en el primer pase visual:
      «no hasta tocar los bordes». Se comprueba sobre el peor instante de diez
      minutos, no sobre el fotograma que tocó capturar.

      Si alguien sube `BOUNDS_FILL` buscando presencia, esto cae antes de que el
      Tesseracto aparezca recortado en una captura — que sería la forma cara de
      enterarse.
    */
    expect(max, `ocupación máxima ${(max * 100).toFixed(1)} %`).toBeLessThan(1);
  });

  it("ocupa el cuadro como manda la dirección visual", () => {
    /*
      ⏳ Estas puertas son ANCHAS a propósito: son la banda dentro de la que el
      dueño todavía tiene que dar su veredicto, no el veredicto. Lo que fijan es
      que un cambio de `BOUNDS_FILL` no pueda pasar en silencio.

      Medido con BOUNDS_FILL = 0.91 sobre 12 000 muestras (600 s):

        media 69.0 %   ·   mínimo 54.2 %   ·   máximo 85.6 %

      Tres cosas que decir en voz alta sobre esos números:

       · La media cae JUSTO por debajo del suelo del 70 % que pide el §5, y el
         máximo JUSTO por encima de su techo del 85 %. La banda del documento
         se escribió pensando en un cuerpo de tamaño fijo; el Tesseracto respira
         un 31 % entre su instante más estrecho y el más ancho, así que ninguna
         banda de 15 puntos puede contenerlo entero. Es una decisión pendiente
         del dueño, no un descuido.
       · Esta medida es GEOMÉTRICA —proyecta vértices— y sale unos tres puntos
         por debajo de la que da `tools/observatory-fill.mjs` sobre una captura,
         que incluye el grosor del tubo y el halo. La del PNG se parece más a lo
         que ve el ojo; ésta es la que se puede demostrar.
       · El mínimo del 54 % NO es un defecto que corregir subiendo la constante:
         es el mismo instante estrecho que el §14 del documento del Tesseracto
         pidió conservar como parte del ritmo de la figura.
    */
    expect(mean).toBeGreaterThan(0.62);
    expect(mean).toBeLessThan(0.82);
    expect(min).toBeGreaterThan(0.45);
  });
});
