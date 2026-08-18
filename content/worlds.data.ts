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
 * Y hay una razón dura, no estética: **ninguna órbita puede proyectarse de
 * canto.** Una elipse degenerada pasa por el centro del cuadro, y ahí el cuerpo
 * cruza justo por delante de la sombra: su etiqueta cae sobre el agujero negro y
 * el destino se vuelve ilegible.
 *
 * ── La inclinación sola NO basta para garantizarlo ──────────────────────────
 *
 * Lo que decide el achatamiento en pantalla no es `inclination`, es su SUMA con
 * la elevación de la cámara. Con la cámara a elevación `e`, un cuerpo en
 * `(R·cos a, −R·sin a·sin i, R·sin a·cos i)` se proyecta sobre
 *
 *     x ∝ R·cos a           y ∝ −R·sin(i + e)·sin a
 *
 * así que el semieje menor de la elipse vale **R·|sin(i + e)|**, y la distancia
 * mínima del cuerpo al centro del cuadro es exactamente eso.
 *
 * De ahí salió un fallo real: con la cámara a 9° e inclinaciones NEGATIVAS de
 * −13° y −19°, la Ranger y Cooper Station daban `i + e` de −4° y −10°. Sus
 * elipses eran casi rectas y las dos pasaban por encima de la sombra en cada
 * vuelta — la Ranger llegaba a 22 px del centro con la sombra midiendo 30 px de
 * radio: literalmente por dentro. El viejo test (`|inclination| ≥ 10`) las daba
 * por buenas porque miraba la inclinación aislada.
 *
 * Ahora todas las inclinaciones son POSITIVAS y se suman a la elevación en vez
 * de restarle, y `worlds.data.test.ts` verifica el invariante de verdad:
 * R·|sin(i + e)| ≥ 4 radios de sombra. El más justo queda en 5.1.
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
 * blanco de clic no depende del tamaño real — lo da el relleno invisible del
 * enlace, así que un mundo diminuto sigue siendo pulsable con el pulgar.
 *
 * Pequeños, pero NO todos iguales. El reparto anterior iba de 1.15 a 1.9 rs:
 * una sexta parte de diferencia entre el mayor y el menor, que en pantalla es
 * ninguna. Seis cuerpos del mismo tamaño aparente no forman un sistema, forman
 * una fila de puntos. Ahora van de 0.95 a 2.25 — los dos mundos habitables
 * mandan, las estructuras son claramente menores y la Ranger es una mota con
 * baliza. La jerarquía de tamaños es la que dice qué mirar primero.
 *
 * ── La órbita EXTERIOR es lo que decide cuánto ocupa Gargantúa ──────────────
 *
 * Las órbitas van de 21 a 30 rs, todas fuera del disco de acreción (que termina
 * en 17 rs), y ese rango está elegido para que los siete quepan en el encuadre
 * fijo durante TODA su vuelta. Un destino fuera de cuadro sería inalcanzable.
 *
 * La escena calcula la distancia mínima a la que cabe el cuerpo MÁS EXTERIOR,
 * así que la Ranger es, ella sola, quien decide el tamaño del agujero negro en
 * pantalla. Venían de 25-51, luego de 21-37, y ahora de 21-32.
 *
 * ── Y el reparto de inclinaciones decide cuánto CUESTA ese encuadre ─────────
 *
 * Un cuerpo pide encuadre por dos lados a la vez: por ancho necesita R, y por
 * alto necesita R·|sin(i + e)| (ver el bloque de WorldPlacement). En un viewport
 * apaisado el alto es el lado caro — a 16:9, un radio vertical pesa 1.67 veces
 * más que el mismo radio horizontal.
 *
 * De ahí la regla que ordena la tabla: **inclinación alta por dentro, baja por
 * fuera.** El tesseracto se empina 39° porque a 21 rs eso apenas cuesta; la
 * Ranger se queda en 10° porque a 32 rs cada grado se paga caro. Con las seis
 * demandas verticales igualadas en torno a 17 rs, ninguna órbita desperdicia
 * encuadre por su cuenta y la cámara se acerca todo lo que el sistema permite.
 *
 * El efecto secundario es de dirección de arte y es el que más se nota: el
 * sistema deja de ser un anillo plano de seis puntos y se convierte en un
 * embudo — las órbitas interiores muy abiertas, las exteriores casi tumbadas
 * sobre el plano del disco. Eso es lo que se lee como PROFUNDIDAD.
 *
 * Cambiar cualquiera de estos radios mueve la cámara. No es un número decorativo.
 */
export const worldsData: Record<WorldId, WorldStructuralData> = {
  tesseract: {
    order: 1,
    cosmicName: "Tesseracto",
    accent: "#f2c879",
    secondary: "#73d7ff",
    visual: "tesseract",
    placement: { orbitRadius: 21, phase: 196, inclination: 39, size: 1.55 },
    sceneName: "scene-tesseract",
  },
  "cooper-station": {
    order: 2,
    cosmicName: "Cooper Station",
    accent: "#7fe5ff",
    secondary: "#a9b5ff",
    visual: "station",
    placement: { orbitRadius: 23, phase: 248, inclination: 31, size: 1.3 },
    sceneName: "scene-cooper-station",
  },
  miller: {
    order: 3,
    cosmicName: "Miller",
    accent: "#55d9ff",
    secondary: "#5e7dff",
    visual: "water",
    placement: { orbitRadius: 24.5, phase: 300, inclination: 25, size: 2.25 },
    sceneName: "scene-miller",
  },
  endurance: {
    order: 4,
    cosmicName: "Endurance",
    accent: "#f0bc72",
    secondary: "#7fe5ff",
    visual: "ship",
    placement: { orbitRadius: 26.5, phase: 350, inclination: 18, size: 1.95 },
    sceneName: "scene-endurance",
  },
  edmunds: {
    order: 5,
    cosmicName: "Edmunds",
    accent: "#ff9b6b",
    secondary: "#f5cf83",
    visual: "desert",
    placement: { orbitRadius: 28.5, phase: 68, inclination: 13, size: 2.0 },
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
    placement: { orbitRadius: 30, phase: 132, inclination: 10, size: 0.95 },
    sceneName: "scene-ranger",
  },
};
