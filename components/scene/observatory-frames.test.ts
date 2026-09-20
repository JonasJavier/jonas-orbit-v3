import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { worldsData, type WorldId } from "@/content/worlds.data";
import { observationViews, resolveView } from "@/lib/observation-views";
import { OBSERVATION_PRESETS, observationPlacement } from "@/lib/observatory";
import { createBody, disposeBody } from "./bodies";
import { FOV } from "./observatory-scene";

/**
 * NINGUNA VISTA CORTA AL ESPÉCIMEN, en ninguno de los dos formatos.
 *
 * `observatory-framing.test.ts` comprueba la promesa del §5 —«no hasta tocar
 * los bordes»— sobre la POSE DEL PRESET del Tesseracto, barriendo su
 * reconfiguración 4D. Esto es la otra mitad, y nació con la Ranger: las vistas
 * curadas mueven la cámara a sitios que el preset no describe, y el ancho del
 * cuadro no lo miraba nadie.
 *
 * Las dos ausencias costaron un defecto cada una, y los dos llevaban meses:
 *
 *  · **En móvil se salían los dos especímenes montados.** `FOV` es el campo
 *    VERTICAL, así que la distancia de encuadre sólo sabía cuánto cabe a lo
 *    alto; `PerspectiveCamera` conserva ese campo y ESTRECHA el horizontal, de
 *    modo que a 375 x 812 el Tesseracto ocupaba el 181 % del ancho y la
 *    Endurance el 185 %. Arreglado en `framingFor`, que toma el eje que de
 *    verdad recorta.
 *  · **Dos vistas de la Endurance se salían en ESCRITORIO**: `SILUETA` tocaba
 *    el borde inferior (y = -1.00) y `OPERACIONES` se salía por arriba (+1.06),
 *    justo la vista cuyo tema son las toberas encendidas. Arreglado subiendo su
 *    `distance`.
 *
 * ── Por qué se mide el CASCO y no todo ──────────────────────────────────────
 *
 * La pluma de escape queda FUERA de la promesa, y a propósito: `modelRadius` la
 * poda del radio del cuerpo porque «una nave no ocupa más espacio por encender
 * un motor», así que el encuadre no la conoce y no puede prometer nada sobre
 * ella. Medido, en móvil se sale del cuadro en dos vistas de la Ranger —las dos
 * que la miran de través— y es la lectura correcta: un chorro que cruza el
 * borde se lee como chorro. Lo que no puede salirse nunca es la chapa.
 */

/** Los dos formatos de la suite: el que se juzga y el que aprieta. */
const FORMATOS = [
  ["escritorio", 1440 / 900],
  ["móvil", 375 / 812],
] as const;

const DEG = Math.PI / 180;

/** Lo que no es casco: luz emitida, que el radio del cuerpo ya excluye. */
const EMISIVO = /beacon|lights/i;

/**
 * La distancia de encuadre del driver, repetida aquí a propósito.
 *
 * Es la misma decisión que toma `observatory-framing.test.ts` al recalcular la
 * suya: importar la del driver exigiría arrancar un `WebGLRenderer`, y lo que
 * se quiere comprobar es la FÓRMULA contra la geometría, no que dos llamadas
 * devuelvan el mismo número.
 */
function framingFor(radius: number, boundsFill: number, aspect: number): number {
  const half = (FOV / 2) * DEG;
  const halfWide = Math.atan(aspect * Math.tan(half));
  return radius / (boundsFill * Math.min(Math.sin(half), Math.sin(halfWide)));
}

describe("el cuadro del Observatorio", () => {
  const montados = ["tesseract", "endurance", "ranger"] as const;

  for (const id of montados) {
    const world = worldsData[id];
    const preset = OBSERVATION_PRESETS[id as Exclude<WorldId, "gargantua">];
    const vistas = observationViews(id);

    for (const [formato, aspect] of FORMATOS) {
      it(`${world.cosmicName} cabe entera en ${formato}`, () => {
        const body = createBody({
          id,
          visual: world.visual,
          accent: world.accent,
          secondary: world.secondary,
          placement: world.placement,
        });
        if (!body) throw new Error(`${id} no construyó cuerpo`);

        try {
          /*
            El instante no es cualquiera: 16.5 s es la pose que el dueño marcó
            como buena al calibrar el ritmo del Tesseracto, y la que clavan
            todas las herramientas de captura. Aquí importa poco —la Ranger y la
            Endurance no cambian de silueta— pero medir en el mismo sitio en el
            que se captura es lo que deja comparar un número con una imagen.
          */
          body.animateAt(16.5);

          const base = framingFor(body.radius, preset.boundsFill, aspect);
          // Sin vistas curadas se comprueba la pose del preset, que es lo que
          // ve quien entra: `undefined` es exactamente eso para `resolveView`.
          const lista = vistas.length ? vistas : [undefined];

          for (const vista of lista) {
            const resuelta = resolveView(preset, vista);
            const place = observationPlacement(
              id as Exclude<WorldId, "gargantua">,
              body.radius,
              base * resuelta.distance,
              resuelta,
            );

            const target = new THREE.Vector3(...place.body);
            body.object.position.copy(target);
            body.object.updateMatrixWorld(true);

            const camera = new THREE.PerspectiveCamera(FOV, aspect, 0.1, 4000);
            camera.position.set(...place.camera);
            camera.up.set(...place.up);
            camera.lookAt(target);
            camera.updateMatrixWorld();

            let fuera = 0;
            const p = new THREE.Vector3();
            body.object.traverseVisible((node) => {
              if (!(node instanceof THREE.Mesh) || EMISIVO.test(node.name)) return;
              const position = node.geometry.getAttribute("position");
              if (!position) return;
              for (let i = 0; i < position.count; i++) {
                p.fromBufferAttribute(position as THREE.BufferAttribute, i)
                  .applyMatrix4(node.matrixWorld)
                  .project(camera);
                if (p.z > 1) continue; // detrás de la cámara: no se proyecta
                fuera = Math.max(fuera, Math.abs(p.x), Math.abs(p.y));
              }
            });

            /*
              0.98 y no 1.00. El borde exacto no es una promesa que se pueda
              cumplir —un vértice a 0.999 ya se come el antialias— y además el
              margen es lo que distingue «cabe» de «cabe de milagro»: la
              Endurance estaba en 1.00 clavado y eso es un recorte, no un ajuste
              apretado. El peor de los doce casos deja hoy un 5 % de aire.
            */
            expect(
              fuera,
              `${id}/${vista?.id ?? "preset"} en ${formato}: llega a ${fuera.toFixed(2)} del centro`,
            ).toBeLessThan(0.98);
          }
        } finally {
          disposeBody(body);
        }
      });
    }
  }
});
