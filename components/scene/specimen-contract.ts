import * as THREE from "three";
import { TESSERACT_FACETS, TESSERACT_PATH } from "@/lib/tesseract";
import type { SceneBody } from "./bodies";

/**
 * Las lecturas del HUD del Observatorio, MEDIDAS del modelo ya construido.
 *
 * > Ninguna lectura del HUD se teclea. Toda lectura se deriva del modelo o del
 * > código que la produce.
 * > — docs/design/tesseract-experimentos.md §8
 *
 * La regla no es purismo. Durante el propio diseño de esta página alguien
 * escribió «8 radiadores» de memoria; el modelo dice 4. Un número escrito a mano
 * en una interfaz se separa del modelo el día que alguien toca el modelo, y
 * entonces el HUD miente con toda la autoridad de un dato.
 *
 * Aquí no puede pasar: `draws`, `materials` y `vertices` se cuentan recorriendo
 * el objeto real, y `architecture` sale de quien ya posee esos números — el
 * `userData` que publica el propio modelo, o el módulo que define la figura.
 * Este archivo no declara ni una constante de conteo.
 *
 * ── Dónde se enseña esto, que no es lo mismo que poder medirlo ──────────────
 *
 * Nada de lo que devuelve este módulo va en la vista normal del Observatorio.
 * `draws`, `materials` y `vertices` viven dentro de `INSPECCIONAR / DATOS`, y
 * sólo aparecen si el visitante los pide.
 *
 * La jerarquía de la página es: **primero el objeto, después el significado del
 * experimento, y sólo entonces las métricas.** Un `4 draws · 4 materiales ·
 * 1688 vértices` compitiendo con el espécimen convertiría un laboratorio en el
 * profiler de three.js, que es justo lo contrario de lo que esta página
 * pretende. Poder medir algo no es motivo para enseñarlo.
 */

export interface SpecimenContract {
  /**
   * Llamadas de dibujo del espécimen.
   *
   * Mismo criterio que el presupuesto del System Map, para que los dos números
   * se puedan comparar: un material transparente a dos caras sin
   * `forceSinglePass` cuenta doble, porque three.js lo pinta en dos pasadas.
   */
  draws: number;
  /** Materiales distintos que efectivamente pintan algo. */
  materials: number;
  /** Vértices de su geometría. */
  vertices: number;
  /**
   * Conteos propios de la figura, cuando existe alguien que los posea de verdad.
   *
   * `null` no es un hueco por rellenar con cualquier cosa: significa que ese
   * cuerpo no tiene estructura contable. Ver la nota de abajo sobre Miller y
   * Edmunds.
   */
  architecture: Readonly<Record<string, number>> | null;
  /**
   * Lo que define a un espécimen que NO es una malla. Sólo Gargantúa.
   *
   * Las tres cifras de arriba describen lo que cuesta pintar una geometría, y
   * sobre un raymarch de pantalla completa dicen la verdad y no dicen nada:
   * un cuad es un cuad. Lo que de verdad define a este objeto —dónde está su
   * horizonte, hasta dónde llega su disco y cuántos pasos da el integrador por
   * píxel— es esto, y es exactamente la fila que el §8 le reserva.
   *
   * Los tres salen del código que los usa: `GARGANTUA_RS`, `DISK_INNER` y
   * `DISK_OUTER` del módulo de shaders, y `steps` del mismo `define MAX_STEPS`
   * con el que se compila el material. La mezcla temporal no está aquí porque
   * cambia en cada fotograma: ésa es telemetría.
   */
  raymarch?: {
    /** Radio de Schwarzschild, en unidades del integrador. */
    rs: number;
    /** Borde interior del disco, en radios de Schwarzschild. */
    diskInner: number;
    /** Borde exterior del disco, en radios de Schwarzschild. */
    diskOuter: number;
    /** Pasos de integración por píxel, como máximo. */
    steps: number;
  };
}

/**
 * Mide el espécimen.
 *
 * Recorre SÓLO `body.object`, nunca `body.orbit`: el Observatorio no dibuja la
 * cinta de órbita —es una guía del mapa, no parte del cuerpo— y contarla
 * inflaría el número que se le enseña al visitante. Por el mismo motivo
 * `materials` no es `body.materials.length`, que incluye el material de esa
 * cinta.
 */
export function specimenContract(body: SceneBody): SpecimenContract {
  let draws = 0;
  let vertices = 0;
  const materials = new Set<THREE.Material>();
  let architecture: Readonly<Record<string, number>> | null = null;

  body.object.traverse((node) => {
    const own = readArchitecture(node.userData);
    if (own) architecture = own;

    const renderable = node as Partial<THREE.Mesh>;
    if (!renderable.geometry) return;

    const attached = Array.isArray(renderable.material)
      ? renderable.material
      : renderable.material
        ? [renderable.material]
        : [];

    for (const material of attached) {
      materials.add(material);
      const doubleTransparentPass =
        material.transparent &&
        material.side === THREE.DoubleSide &&
        !material.forceSinglePass;
      draws += doubleTransparentPass ? 2 : 1;
    }

    vertices += renderable.geometry.getAttribute("position")?.count ?? 0;
  });

  return {
    draws,
    materials: materials.size,
    vertices,
    architecture: architecture ?? architectureFor(body.id),
  };
}

/**
 * El `userData` de arquitectura que publique el propio modelo.
 *
 * Hoy sólo lo tiene la Endurance (`enduranceArchitecture`), y se busca por
 * sufijo en vez de por nombre exacto para que añadir `rangerArchitecture`
 * mañana no exija tocar este archivo.
 */
function readArchitecture(
  userData: Record<string, unknown>,
): Readonly<Record<string, number>> | null {
  for (const [key, value] of Object.entries(userData)) {
    if (!key.endsWith("Architecture") || typeof value !== "object" || !value) {
      continue;
    }
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.every(([, n]) => typeof n === "number")) {
      return Object.fromEntries(entries) as Record<string, number>;
    }
  }
  return null;
}

/**
 * Figuras cuyos conteos los posee un módulo, no el `userData` del modelo.
 *
 * El Tesseracto es el caso: su topología la define `lib/tesseract.ts` y no hay
 * motivo para duplicarla dentro de la malla. Los vértices se deducen del propio
 * circuito euleriano —el índice más alto que recorre, más uno— para que ni
 * siquiera ese 16 esté escrito en ninguna parte.
 *
 * ── Miller y Edmunds devuelven `null`, y es una conclusión, no una carencia ──
 *
 * No tienen estructura que contar: **son una esfera con un material**. Toda su
 * identidad vive en parámetros del shader —sitios de FBM, exponente de la ley
 * difusa, suelo nocturno, escalas de oleaje—, que son texto GLSL y no datos en
 * ejecución. Publicarlos aquí exigiría copiarlos a mano, que es exactamente lo
 * que este módulo existe para impedir. Sus lecturas específicas tendrán que
 * entrar como CONTENIDO —prosa en MDX, citando el documento de lenguaje
 * visual— y no disfrazarse de medición.
 */
function architectureFor(
  id: SceneBody["id"],
): Readonly<Record<string, number>> | null {
  if (id !== "tesseract") return null;
  const vertices =
    TESSERACT_PATH.reduce((top, [from, to]) => Math.max(top, from, to), 0) + 1;
  return {
    vertices,
    edges: TESSERACT_PATH.length,
    /*
      `renderedFacets`, no `facets`, y el nombre es la corrección.

      `TESSERACT_FACETS` son SEIS de las veinticuatro caras cuadradas del
      4-cubo: las que se rellenan de vidrio, porque «el vacío sigue siendo la
      superficie dominante» y la figura se lee por el canto. Llamar a ese 6
      «caras del Tesseracto» convertiría una decisión de nuestra representación
      en una afirmación sobre la geometría matemática — que es exactamente la
      clase de dato engañoso que este módulo existe para impedir, sólo que más
      difícil de detectar que «8 radiadores».

      Los vértices y las aristas sí son del 4-cubo: 16 y 32 son sus conteos
      reales, y aquí se deducen del circuito euleriano. El veinticuatro NO se
      publica desde aquí: no está en el código como dato, vive en la prosa de
      `lib/tesseract.ts`, y por la regla del §8 lo que es una decisión se cita,
      no se mide.
    */
    renderedFacets: TESSERACT_FACETS.length,
  };
}
