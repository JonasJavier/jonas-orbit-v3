/**
 * Datos estructurales de los 7 mundos — EXCLUSIVAMENTE neutrales al idioma.
 *
 * La identidad canónica es WorldId: tipada, inmutable e independiente de las
 * URLs. La prosa localizada vive en content/{locale}/worlds/*.mdx y se une a
 * esta estructura vía getWorld(id, locale) en lib/worlds.ts. Las URLs/anclas
 * pueden cambiar o localizarse sin romper la relación con la escena.
 *
 * Aquí NUNCA va texto visible al usuario (títulos, narrativa, alt, CTAs).
 * Sólo viven identidad técnica y parámetros estructurales de la escena.
 */
export const WORLD_IDS = [
  "tesseract",
  "cooper-station",
  "miller",
  "endurance",
  "edmunds",
  "gargantua",
  "ranger",
] as const;

export type WorldId = (typeof WORLD_IDS)[number];

type WorldVisual =
  | "tesseract"
  | "station"
  | "water"
  | "ship"
  | "desert"
  | "black-hole"
  | "beacon";

/**
 * Disposición estática de un destino sobre su trayectoria de referencia.
 *
 * Todas las distancias usan radios de Schwarzschild (rs = 1), la misma unidad
 * del shader. `orbitRadius`, `phase` e `inclination` ya no describen un tour:
 * fijan la composición aprobada y permiten construir la guía orbital tenue que
 * responde al target. La cámara conserva el invariante geométrico que evita que
 * una trayectoria proyectada atraviese la sombra de Gargantúa.
 */
interface WorldPlacement {
  /** Radio de la trayectoria en rs. 0 = el centro (solo Gargantúa). */
  orbitRadius: number;
  /** Fase fija de dirección de arte sobre la trayectoria, en grados. */
  phase: number;
  /** Inclinación de su plano de referencia respecto al disco, en grados. */
  inclination: number;
  /** Escala nominal del modelo en rs. */
  size: number;
}

export interface WorldStructuralData {
  /** Orden narrativo del viaje (1-7, único). */
  order: number;
  /** Nombre cósmico propio (idéntico en todos los idiomas). */
  cosmicName: string;
  /** Color de acento principal (hex). */
  accent: string;
  /** Color secundario (hex). */
  secondary: string;
  /** Modelo visual del planeta. */
  visual: WorldVisual;
  /** Sitio del cuerpo en el sistema. */
  placement: WorldPlacement;
  /** Nombre interno de la escena para la capa 3D (G2+). */
  sceneName: string;
}

/**
 * Escala y encuadre del sistema.
 *
 * Gargantúa manda; Endurance es el segundo ancla y los demás destinos conservan
 * una jerarquía clara. Los blancos de interacción no dependen de la geometría:
 * el DOM mantiene áreas accesibles de 44 px. Cambiar radio, fase, inclinación o
 * escala altera cámara, proyección, brackets y colisiones de etiquetas, así que
 * estos valores son decisiones de composición, no telemetría decorativa.
 *
 * ── Reparto radial (2026-09-01) ─────────────────────────────────────────────
 *
 * Los tres destinos interiores —Endurance, Edmunds y Miller— estaban en 22-23.5
 * rs, y ahí topaban con el disco en cuanto Gargantúa creció. Pasan a 25-27 y eso
 * compra dos cosas a la vez, no una:
 *
 * 1. **Sitio para el disco.** El borde exterior llega a 17·rs; a 25 rs el
 *    destino más cercano vuelve a estar por fuera con rs = 1.40.
 * 2. **Espacio negativo lateral.** Los cuerpos pasan de ocupar el 53 % del
 *    ancho del cuadro al 59 %, y el lado derecho —el más vacío— lo llena Miller
 *    sin añadir ni un objeto nuevo.
 *
 * Y NO cuesta distancia de cámara: el encuadre lo fijan Cooper (30) y el
 * Tesseracto (33), que no se han movido. Mover los interiores hacia fuera es
 * gratis mientras no pasen de los exteriores — es la única forma de reencuadrar
 * el sistema sin que la cámara retroceda y lo anule.
 */
export const worldsData: Record<WorldId, WorldStructuralData> = {
  tesseract: {
    order: 1,
    cosmicName: "Tesseracto",
    accent: "#f2c879",
    secondary: "#73d7ff",
    visual: "tesseract",
    placement: { orbitRadius: 33, phase: 233, inclination: 20, size: 2.7 },
    sceneName: "scene-tesseract",
  },
  "cooper-station": {
    order: 2,
    cosmicName: "Cooper Station",
    accent: "#7fe5ff",
    secondary: "#a9b5ff",
    visual: "station",
    placement: { orbitRadius: 30, phase: 272, inclination: 26, size: 2.6 },
    sceneName: "scene-cooper-station",
  },
  miller: {
    order: 3,
    cosmicName: "Miller",
    accent: "#55d9ff",
    secondary: "#5e7dff",
    visual: "water",
    /* 27, no 23.5. Miller cae en el lado derecho del cuadro, que era el más
       vacío, y a la vez es uno de los tres destinos que tenían que salir del
       camino del disco ampliado. Ver la nota de reparto radial más abajo. */
    placement: { orbitRadius: 27, phase: 337, inclination: 38, size: 3.05 },
    sceneName: "scene-miller",
  },
  endurance: {
    order: 4,
    cosmicName: "Endurance",
    accent: "#f0bc72",
    secondary: "#7fe5ff",
    visual: "ship",
    placement: { orbitRadius: 25, phase: 45, inclination: 12, size: 5.15 },
    sceneName: "scene-endurance",
  },
  edmunds: {
    order: 5,
    cosmicName: "Edmunds",
    accent: "#ff9b6b",
    secondary: "#f5cf83",
    visual: "desert",
    placement: { orbitRadius: 25.5, phase: 167, inclination: 56, size: 3 },
    sceneName: "scene-edmunds",
  },
  gargantua: {
    order: 6,
    cosmicName: "Gargantúa",
    accent: "#ffb45c",
    secondary: "#d8e6ff",
    visual: "black-hole",
    // El centro del sistema, y por eso el único sin órbita: la home ES este
    // cuerpo. Que el laboratorio viva en el agujero negro no es decoración —
    // los experimentos del propio build son literalmente lo que se ve al llegar.
    // `size` es el radio APARENTE de la sombra, √27/2 ≈ 2.6 rs, que es lo que
    // el raymarch dibuja y por tanto lo que hay que hacer pulsable.
    placement: { orbitRadius: 0, phase: 0, inclination: 0, size: 2.598 },
    sceneName: "scene-gargantua",
  },
  ranger: {
    order: 7,
    cosmicName: "Ranger",
    accent: "#c58cff",
    secondary: "#72ddff",
    visual: "beacon",
    /*
      Estaba en el extremo izquierdo del cuadro (fase 180, radio 30): pegada al
      borde, sola, alineada con el centro y en el punto de la trayectoria MÁS
      lejano a la cámara. Tres problemas de una vez —composición desequilibrada,
      cuerpo pequeño y el único hueco grande del encuadre sin ocupar.

      Fase 105 con radio 24 la lleva al vacío de abajo, por delante del plano
      del disco: gana un tercio de tamaño aparente sin tocar su escala, apunta
      hacia Gargantúa en diagonal y cierra el triángulo con Endurance y Edmunds.
      El mapa plano usa esta misma fase, así que las dos vistas siguen contando
      lo mismo.
    */
    placement: { orbitRadius: 24, phase: 105, inclination: 23, size: 2.6 },
    sceneName: "scene-ranger",
  },
};
