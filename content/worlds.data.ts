/**
 * Datos estructurales de los 7 mundos — EXCLUSIVAMENTE neutrales al idioma.
 *
 * La identidad canónica es WorldId: tipada, inmutable e independiente de las
 * URLs. La prosa localizada vive en content/{locale}/worlds/*.mdx y se une a
 * esta estructura vía getWorld(id, locale) en lib/worlds.ts. Las URLs/anclas
 * pueden cambiar o localizarse sin romper la relación con la escena.
 *
 * Aquí NUNCA va texto visible al usuario (títulos, narrativa, alt, CTAs).
 * Los parámetros de cámara/efectos 3D se añadirán en F2B cuando existan.
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
 * Órbita del cuerpo dentro del Sistema Gargantúa.
 *
 * Todas las distancias van en **radios de Schwarzschild** (rs = 1), la misma
 * unidad que usa el shader del agujero negro: la sombra aparente está en
 * √27/2 ≈ 2.6 rs y el disco de acreción llega hasta 17 rs. Los cuerpos orbitan
 * fuera del disco.
 *
 * Sustituye a los parámetros `orbit` heredados de v2, que describían una órbita
 * animada en unidades de layout y no tenían ya ningún consumidor (regla 3:
 * cero huérfanos).
 *
 * ── Por qué cada órbita lleva inclinación ───────────────────────────────────
 *
 * El disco se ve casi de canto, así que siete cuerpos coplanares con él se
 * proyectarían sobre una misma línea horizontal: ilegibles como menú. Con
 * inclinaciones distintas, cada órbita se proyecta como una elipse propia
 * alrededor de Gargantúa y los siete destinos se separan en pantalla.
 *
 * Y hay una razón dura, no estética: **ninguna inclinación puede ser casi nula.**
 * Una órbita vista de canto proyecta una elipse degenerada que pasa por el
 * centro, y ahí el cuerpo cruzaría justo por delante de la sombra — su etiqueta
 * caería sobre el agujero negro y el destino sería ilegible. Con una elipse de
 * eje menor sano, el cuerpo nunca se proyecta sobre el centro. El test de
 * `worlds.data.test.ts` lo vigila.
 */
interface WorldPlacement {
  /** Radio orbital en rs. 0 = el centro del sistema (solo Gargantúa). */
  orbitRadius: number;
  /** Fase inicial sobre la órbita, en grados. */
  phase: number;
  /** Inclinación del plano orbital respecto al del disco, en grados. */
  inclination: number;
  /** Radio del cuerpo en rs. */
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
 * Escala del sistema.
 *
 * El primer intento agrandó los cuerpos para que fueran fáciles de pulsar, y el
 * resultado fue el contrario del buscado: seis maquetas flotando delante de la
 * cámara, compitiendo con el agujero negro y delatando que eran geometría.
 * **Un cuerpo grande no parece cercano, parece falso.**
 *
 * Ahora son pequeños, como se verían de verdad a decenas de radios de distancia:
 * un disco de luz con atmósfera y un borde encendido por el disco de acreción.
 * La identidad la lleva la etiqueta; el cuerpo aporta silueta y color. Y el
 * blanco de clic no depende del tamaño real — la escena le pone un suelo en
 * píxeles, así que un mundo diminuto sigue siendo pulsable con el pulgar.
 *
 * Las órbitas van de 25 a 51 rs, todas fuera del disco de acreción (que termina
 * en 17 rs), y ese rango está elegido para que los siete quepan en el encuadre
 * fijo durante TODA su vuelta. Un destino fuera de cuadro sería inalcanzable.
 */
export const worldsData: Record<WorldId, WorldStructuralData> = {
  tesseract: {
    order: 1,
    cosmicName: "Tesseracto",
    accent: "#f2c879",
    secondary: "#73d7ff",
    visual: "tesseract",
    placement: { orbitRadius: 25, phase: 205, inclination: 27, size: 0.95 },
    sceneName: "scene-tesseract",
  },
  "cooper-station": {
    order: 2,
    cosmicName: "Cooper Station",
    accent: "#7fe5ff",
    secondary: "#a9b5ff",
    visual: "station",
    placement: { orbitRadius: 31, phase: 260, inclination: -19, size: 0.8 },
    sceneName: "scene-cooper-station",
  },
  miller: {
    order: 3,
    cosmicName: "Miller",
    accent: "#55d9ff",
    secondary: "#5e7dff",
    visual: "water",
    placement: { orbitRadius: 36, phase: 318, inclination: 15, size: 1.15 },
    sceneName: "scene-miller",
  },
  endurance: {
    order: 4,
    cosmicName: "Endurance",
    accent: "#f0bc72",
    secondary: "#7fe5ff",
    visual: "ship",
    placement: { orbitRadius: 41, phase: 20, inclination: -31, size: 0.85 },
    sceneName: "scene-endurance",
  },
  edmunds: {
    order: 5,
    cosmicName: "Edmunds",
    accent: "#ff9b6b",
    secondary: "#f5cf83",
    visual: "desert",
    placement: { orbitRadius: 46, phase: 78, inclination: 23, size: 1.05 },
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
    placement: { orbitRadius: 51, phase: 142, inclination: -13, size: 0.62 },
    sceneName: "scene-ranger",
  },
};
