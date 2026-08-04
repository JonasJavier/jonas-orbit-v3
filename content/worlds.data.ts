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

interface WorldOrbit {
  /** Radio relativo de la órbita (unidades de layout, heredado de v2). */
  size: number;
  /** Duración de una vuelta completa, en segundos. */
  duration: number;
  /** Desfase inicial de la animación, en segundos (negativo = ya en curso). */
  delay: number;
  /** Diámetro relativo del planeta. */
  planetSize: number;
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
  /** Parámetros de órbita para la capa visual. */
  orbit: WorldOrbit;
  /** Nombre interno de la escena para la capa 3D (F2B+). */
  sceneName: string;
}

export const worldsData: Record<WorldId, WorldStructuralData> = {
  tesseract: {
    order: 1,
    cosmicName: "Tesseracto",
    accent: "#f2c879",
    secondary: "#73d7ff",
    visual: "tesseract",
    orbit: { size: 34, duration: 38, delay: -7, planetSize: 32 },
    sceneName: "scene-tesseract",
  },
  "cooper-station": {
    order: 2,
    cosmicName: "Cooper Station",
    accent: "#7fe5ff",
    secondary: "#a9b5ff",
    visual: "station",
    orbit: { size: 48, duration: 50, delay: -21, planetSize: 28 },
    sceneName: "scene-cooper-station",
  },
  miller: {
    order: 3,
    cosmicName: "Miller",
    accent: "#55d9ff",
    secondary: "#5e7dff",
    visual: "water",
    orbit: { size: 48, duration: 50, delay: -4, planetSize: 36 },
    sceneName: "scene-miller",
  },
  endurance: {
    order: 4,
    cosmicName: "Endurance",
    accent: "#f0bc72",
    secondary: "#7fe5ff",
    visual: "ship",
    orbit: { size: 62, duration: 64, delay: -35, planetSize: 30 },
    sceneName: "scene-endurance",
  },
  edmunds: {
    order: 5,
    cosmicName: "Edmunds",
    accent: "#ff9b6b",
    secondary: "#f5cf83",
    visual: "desert",
    orbit: { size: 62, duration: 64, delay: -9, planetSize: 38 },
    sceneName: "scene-edmunds",
  },
  gargantua: {
    order: 6,
    cosmicName: "Gargantúa",
    accent: "#ffb45c",
    secondary: "#d8e6ff",
    visual: "black-hole",
    orbit: { size: 76, duration: 82, delay: -48, planetSize: 34 },
    sceneName: "scene-gargantua",
  },
  ranger: {
    order: 7,
    cosmicName: "Ranger",
    accent: "#c58cff",
    secondary: "#72ddff",
    visual: "beacon",
    orbit: { size: 76, duration: 82, delay: -16, planetSize: 26 },
    sceneName: "scene-ranger",
  },
};
