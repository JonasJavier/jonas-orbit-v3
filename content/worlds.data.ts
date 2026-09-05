/**
 * Datos estructurales de los 6 mundos — EXCLUSIVAMENTE neutrales al idioma.
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
  "miller",
  "endurance",
  "edmunds",
  "gargantua",
  "ranger",
] as const;

export type WorldId = (typeof WORLD_IDS)[number];

type WorldVisual =
  | "tesseract"
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
  /** Orden narrativo del viaje (1-6, único). */
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
 * ── Recomposición de los seis destinos (2026-09-04) ─────────────────────────
 *
 * Al retirar Cooper Station el cuadrante superior izquierdo se quedó sin nada:
 * medido sobre 1440×860, ningún cuerpo caía en x < 48 % con y < 50 %, y la masa
 * se repartía 34/66 entre izquierda y derecha. Con la mitad del cuadro vacía y
 * la otra mitad cargada, el sistema dejaba de leerse como un sistema.
 *
 * El arreglo NO es repartir los cinco cuerpos por igual. Es mover DOS —Miller
 * al hueco, Tesseracto a la derecha del eje— y afinar los otros tres:
 *
 * 1. **Miller cruza al superior izquierdo** (fase 337 → 235). Es el destino
 *    adecuado para esa esquina y el Tesseracto no lo era: un planeta con albedo
 *    y terminador se sostiene contra el campo de estrellas, mientras que una
 *    estructura de marcos oscuros ahí se lee como un icono suelto — que es
 *    exactamente lo que ya había pasado antes del intercambio con Cooper.
 * 2. **El Tesseracto se corre a la derecha del eje** (fase 279 → 298). Con
 *    Miller arriba a la izquierda, dejarlo centrado los habría convertido en
 *    dos objetos colgados de la misma banda superior; a 298 abre la diagonal
 *    Miller → Tesseracto → Endurance y sigue sin tocar el disco.
 * 3. **Endurance baja y se abre** (fase 45 → 42, inclinación 12 → 16): separa
 *    su silueta de la cola derecha del disco, que era donde se ensuciaba.
 * 4. **La Ranger sube y se centra** (fase 109 → 99, inclinación 23 → 16): se
 *    despega del borde inferior y del raíl sin dejar de ser el plano cercano.
 * 5. **Edmunds no se toca.** Ya era el ancla inferior izquierda.
 *
 * Y hay un efecto de segundo orden que importa tanto como las posiciones: el
 * encuadre se mide contra la envolvente de los cuerpos, así que recogerlos
 * ACERCA la cámara. Gargantúa pasa de 42 a 46 px de radio de sombra a 1440 px
 * sin tocar su `size` ni la pose — el sistema llena más cuadro porque ocupa
 * mejor el que tiene, no porque nada haya crecido.
 */
export const worldsData: Record<WorldId, WorldStructuralData> = {
  tesseract: {
    order: 1,
    cosmicName: "Tesseracto",
    accent: "#f2c879",
    secondary: "#73d7ff",
    visual: "tesseract",
    /* Sigue siendo el cuerpo más exterior (30 rs) y el más lejano en el eje de
       vista (capa −6 en `scene-depth.ts`): pequeño para su tamaño real, que es
       lo que lo mantiene anómalo. La fase 298 lo deja a la derecha del eje de
       la sombra y por encima del disco, sin tocarlo. */
    placement: { orbitRadius: 30, phase: 298, inclination: 26, size: 2.7 },
    sceneName: "scene-tesseract",
  },
  miller: {
    order: 2,
    cosmicName: "Miller",
    accent: "#55d9ff",
    secondary: "#5e7dff",
    visual: "water",
    /* El cuerpo que ocupa el hueco. Fase 235 y radio 28 lo llevan al superior
       izquierdo; la inclinación 58 es la que lo SUBE —la altura sale de
       −r·sen(fase)·sen(inclinación)— sin acercarlo al centro del cuadro. No
       sube más porque la altura es cara: el encuadre mide la envolvente de los
       cuerpos, y a 70° Gargantúa perdía un 11 % de radio de sombra para dejar
       sitio a un planeta pequeño. Lo que hacía falta —que el Tesseracto no se
       vea mayor que él— se compra por profundidad, no por altura: ver la capa
       de Miller en `lib/scene-depth.ts`. */
    placement: { orbitRadius: 28, phase: 235, inclination: 58, size: 3.05 },
    sceneName: "scene-miller",
  },
  endurance: {
    order: 3,
    cosmicName: "Endurance",
    accent: "#f0bc72",
    secondary: "#7fe5ff",
    visual: "ship",
    /* La pieza artificial grande, en el hemisferio derecho. Los tres grados y
       los cuatro de inclinación que se le quitaron a la composición anterior no
       la mueven de sitio: la bajan lo justo para que la cola derecha del disco
       pase por detrás y su silueta se recorte limpia contra el fondo. */
    placement: { orbitRadius: 25, phase: 42, inclination: 16, size: 5.15 },
    sceneName: "scene-endurance",
  },
  edmunds: {
    order: 4,
    cosmicName: "Edmunds",
    accent: "#ff9b6b",
    secondary: "#f5cf83",
    visual: "desert",
    /* Sin tocar. Es el ancla inferior izquierda y el contrapeso cálido de
       Miller: mismo lado del cuadro, mitad opuesta, más cerca de la cámara
       (capa +2) y por tanto más grande. Dos planetas, dos profundidades. */
    placement: { orbitRadius: 25.5, phase: 167, inclination: 56, size: 3 },
    sceneName: "scene-edmunds",
  },
  gargantua: {
    order: 5,
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
    order: 6,
    cosmicName: "Ranger",
    accent: "#c58cff",
    secondary: "#72ddff",
    visual: "beacon",
    /*
      El detalle de escala humana, y el cuerpo más cercano a la cámara (capa +7)
      — por eso una nave de 2 rs se dibuja más grande que un planeta de 3.

      Vive en el vacío de abajo, por delante del plano del disco. La fase 99 y
      la inclinación 16 la separan del borde inferior y del raíl: a 109/23
      quedaba a un 84 % del alto, con los rótulos de destinos justo debajo. El
      tamaño baja de 2.6 a 2.0 porque con seis cuerpos, y sin Cooper llenando el
      cuadro, a 2.6 dejaba de ser un detalle y empezaba a ser un sexto
      protagonista. El mapa plano usa esta misma fase: las dos vistas cuentan lo
      mismo.
    */
    placement: { orbitRadius: 24, phase: 99, inclination: 16, size: 2 },
    sceneName: "scene-ranger",
  },
};
