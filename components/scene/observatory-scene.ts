import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import type { WorldId } from "@/content/worlds.data";
import {
  hasTurnInstrument,
  instrumentsFor,
  lightPlacement,
  observationPlacement,
  OBSERVATION_PRESETS,
  type LightGeometry,
  type ObservationInstrument,
} from "@/lib/observatory";
import {
  observationTelemetry,
  observationViews,
  resolveView,
  type ObservationTelemetry,
  type ObservationView,
} from "@/lib/observation-views";
import { sampleTesseract } from "@/lib/tesseract";
import { nearestEdge, probeDepth, type ProbeHit } from "@/lib/tesseract-probe";
import { readVisualBench } from "@/lib/visual-bench";
import { createBody, disposeBody, type SceneBodyInput } from "./bodies";
import { createGargantuaObservatory } from "./gargantua-observatory";
import type { QualityTier } from "./gargantua-render";
import { createObservatorySky } from "./observatory-sky";
import { specimenContract, type SpecimenContract } from "./specimen-contract";

/**
 * El Observatorio: un espécimen, su propia cámara y su propio bucle.
 *
 * > El contrato de cámara rige la escena persistente. El Observatorio es otra
 * > escena, con otro canvas y otra cámara, a la que el visitante entra a
 * > propósito.
 * > — docs/design/tesseract-experimentos.md §2
 *
 * Este archivo es el «driver» del §13: no reimplementa ningún material ni toca
 * `bodies.ts`. Construye el cuerpo con `createBody` —que ya lo devuelve aislado
 * y centrado en su propio origen—, lo coloca según el preset, y escribe cada
 * fotograma los MISMOS cuatro uniformes que escribe el bucle del System Map.
 * Si algún día esos cuatro cambian allí, cambian aquí: son el contrato real
 * entre la escena y los cuerpos.
 *
 * ── Lo que NO se dibuja ─────────────────────────────────────────────────────
 *
 * La cinta de órbita. `createBody` la devuelve en `body.orbit`, aparte del
 * cuerpo, y aquí simplemente no se añade: es una guía del mapa, no parte del
 * espécimen.
 *
 * ── Por qué el cuerpo no está en el centro del mundo ────────────────────────
 *
 * Porque la luz ES el origen del mundo (`toLight = normalize(-vPositionW)`).
 * Un cuerpo en el origen queda a oscuras. Toda la explicación y la matemática
 * viven en `lib/observatory.ts`; aquí sólo se consume.
 *
 * Consecuencia bonita y deliberada: al orbitar, el visitante cambia su ángulo
 * respecto de la ÚNICA luz que hay. No está paseando alrededor de un objeto
 * iluminado de frente, está eligiendo dónde sentarse respecto del disco. Es la
 * regla del §6 hecha interacción.
 */

/**
 * La exposición sí es la del System Map, y lo es a propósito: el tone mapping
 * es una función por píxel, así que da el MISMO valor de salida para el mismo
 * valor de entrada mida el espécimen 46 px o 700 px. Copiarla es lo que
 * garantiza que el material se lea igual aquí que en su sitio.
 */
export const BASE_EXPOSURE = 0.95;

/**
 * El bloom NO se copia, y ésta es la corrección del primer pase visual.
 *
 * ── Por qué las constantes del mapa no valen aquí ───────────────────────────
 *
 * `UnrealBloomPass` trabaja en ESPACIO DE PANTALLA: construye cinco mips y los
 * desenfoca con un kernel medido en píxeles del cuadro, no en unidades del
 * objeto. El kernel no cambia cuando el espécimen crece; el ÁREA DE FUENTE sí,
 * y va con el cuadrado. La punta del trazo euleriano mide un par de píxeles en
 * el mapa y unos setenta aquí, o sea del orden de mil veces más área brillante
 * alimentando el mismo filtro. Con los mismos números salía lo que Jonás
 * describió: no un material sofisticado, «una lamparita blanca pegada al
 * Tesseracto» viajando por las aristas.
 *
 * Y hay un multiplicador que lo agrava: la capa del trazo es aditiva y sin
 * prueba de profundidad, así que los seis lados del tubo —delanteros y
 * traseros— se suman. En la punta eso deja radiancias del orden de 17 contra un
 * umbral de 2.
 *
 * ── Qué se toca y qué no ────────────────────────────────────────────────────
 *
 * El umbral se queda en 2 justamente porque ahí está la frontera que mantiene
 * la figura limpia: por debajo sólo vive la punta, y bajarlo metería toda la
 * arista en el halo y convertiría el Tesseracto en niebla. Lo que cambia son
 * las dos palancas que sí describen el carácter del halo:
 *
 *  · `STRENGTH` escala la energía total. 0.6 → 0.26 es el «≈ 40 %» que pidió
 *    la dirección.
 *  · `RADIUS` REPARTE esa energía entre los mips sin cambiar su total —la suma
 *    de pesos de la pasada es 3.0 para cualquier radio—, así que subirlo mueve
 *    el halo de los mips finos a los gruesos. Es la diferencia exacta entre un
 *    flare puntual y un halo ambiental, que es la petición literal.
 *
 * ⏳ Calibración visual pendiente de veredicto sobre captura.
 */
const BLOOM_STRENGTH = 0.26;
const BLOOM_RADIUS = 0.74;
const BLOOM_THRESHOLD = 2;

export const FOV = 40;
/**
 * Qué fracción del alto del cuadro ocupa la ESFERA ENVOLVENTE del espécimen.
 *
 * El nombre importa, y el anterior —`FRAME_FILL`— mentía. El §5 pide que el
 * espécimen llene entre el 70 % y el 85 % del cuadro, y la constante valía 0.78
 * como si una cosa fuera la otra. Pero la fórmula de abajo parte de
 * `body.radius`, que es el radio de la ENVOLVENTE: un 4-cubo en alambre toca su
 * esfera envolvente en ocho vértices y en ningún sitio más, así que su silueta
 * ocupa bastante menos que el disco de esa esfera.
 *
 * ── Y no es un número, es un rango ──────────────────────────────────────────
 *
 * La reconfiguración 4D encoge y estira la silueta, así que medir la ocupación
 * sobre UNA captura da cualquier cosa entre el 54 % y el 86 %. Todas son
 * ciertas y ninguna sirve para calibrar.
 *
 * Peor: no se puede arreglar promediando un ciclo, porque el Tesseracto no
 * tiene ciclo. Su trazo sí —32 aristas en 18 s— pero su FORMA la deciden tres
 * rotaciones 4D a ritmos inconmensurables, así que la pose es cuasiperiódica y
 * no se repite nunca. Esa fue la corrección del primer pase visual: el barrido
 * de doce capturas daba media 71-72 % y parecía cerrado, y lo que medía era
 * doce instantes.
 *
 * La cifra buena la da `observatory-framing.test.ts`, que proyecta la geometría
 * de verdad sobre 12 000 instantes:
 *
 *   0.78 → media 58.5 %   (min 45.2, max 73.3)
 *   0.91 → media 69.0 %   (min 54.2, max 85.6)   ← +17.9 %
 *
 * Es el «+15-20 % de tamaño percibido» que pidió la dirección. La media queda a
 * un pelo por debajo del suelo del 70 % del §5 y el máximo a un pelo por encima
 * de su techo del 85 %, y eso está dicho en el test: una banda de quince puntos
 * no puede contener una figura que respira treinta y uno.
 *
 * ⏳ Calibración visual pendiente de veredicto. Y cuando entren los otros cinco,
 * este número NO se hereda: la relación entre envolvente y silueta es propia de
 * cada figura —Miller es una esfera y no tiene desfase; la Endurance lo tendrá
 * enorme, porque su envolvente la fijan las puntas de los radiadores—.
 */
export const BOUNDS_FILL = OBSERVATION_PRESETS.tesseract.boundsFill;

/** Topes del zoom, en múltiplos de la distancia de encuadre inicial. Acotado a
 *  propósito: esto es un instrumento de observación, no un vuelo libre. */
const ZOOM_NEAR = 0.45;
const ZOOM_FAR = 2.6;
/** Cuánto puede subir o bajar el visitante. Sin tope, el polo invierte la
 *  imagen y el gesto deja de tener sentido. */
const PITCH_LIMIT = 1.45;

/**
 * Lo que la sonda resuelve sobre el punto señalado.
 *
 * Todo medido: la arista y su eje salen de la topología del 4-cubo, la
 * profundidad del mismo array que reparte grosor y luz en el shader, y la
 * distancia de la cámara que hay. `screen` va en píxeles CSS del lienzo porque
 * la retícula se dibuja en el DOM y no en WebGL — unas marcas de un píxel no
 * justifican una pasada de render.
 */
/**
 * Lo único que la interfaz necesita saber de una vista.
 *
 * Las vistas de los sólidos y las de Gargantúa no comparten campos —unas
 * declaran geometría de luz y otras geometría de cámara— pero las dos tienen
 * que caber en el mismo mando. Esto es esa intersección, y es a propósito lo
 * más pequeña posible: en cuanto alguien meta aquí un ángulo, los dos
 * contratos empezarán a parecerse por la fuerza.
 */
export type ObservationViewSummary = Pick<
  ObservationView,
  "id" | "label" | "study"
>;

export interface ProbeReading extends ProbeHit {
  /** Profundidad en W del punto, 0 (lo más lejano de esta pose) a 1. */
  depth: number;
  /** Distancia de la cámara al punto, en radios del espécimen. */
  range: number;
  screen: { x: number; y: number };
}

export interface ObservatoryHandle {
  /** El contrato medido del espécimen. Va a `INSPECCIONAR / DATOS`, nunca a la
   *  vista normal. */
  readonly contract: SpecimenContract;
  /**
   * Las vistas curadas de este espécimen. Vacío si no tiene.
   *
   * Sólo el resumen —clave, rótulo y qué estudia— y no la vista entera. Las de
   * los sólidos llevan `keyAngle` y `keyAzimuth`, que son geometría de LUZ, y
   * las de Gargantúa llevan elevación, distancia y campo, que son geometría de
   * CÁMARA. Son dos contratos distintos porque son dos especímenes distintos, y
   * lo único que la interfaz necesita de los dos es lo que se lee en el mando.
   */
  readonly views: readonly ObservationViewSummary[];
  /** Si este espécimen admite sonda. Hoy sólo el Tesseracto: es el único cuya
   *  geometría se puede nombrar pieza a pieza sin inventar nada. */
  readonly canProbe: boolean;
  /**
   * Si el visitante puede llevar la cámara con la mano.
   *
   * **Falso sólo en Gargantúa** (§7), y no por rendimiento: durante el arrastre
   * se perdería el supermuestreo sobre ocho posiciones de Halton que paga su
   * acabado, y —lo que más pesa— una órbita libre garantiza que alguien acabará
   * mirando el pase visual final desde un ángulo que nadie encuadró.
   *
   * Se publica en vez de deducirse del espécimen porque la pista de abajo tiene
   * que decir la verdad sobre lo que se puede hacer AHORA, y «arrastra para
   * girar» sobre un lienzo que no escucha el puntero es la peor clase de
   * rótulo: uno que miente sin que nada falle.
   */
  readonly canOrbit: boolean;
  /**
   * Qué ofrece `INSPECCIONAR` sobre esta muestra.
   *
   * Lo publica el instrumento y no lo deduce la interfaz, por la misma razón
   * que las vistas: quien sabe si un mando va a hacer algo es quien lo va a
   * ejecutar. Y tiene que coincidir con lo que la cara servida promete en frío
   * —las dos salen de `instrumentsFor`— porque un aparato que promete apagado
   * lo que no da encendido es peor que uno mudo.
   */
  readonly instruments: readonly ObservationInstrument[];
  /** Coloca una de las vistas curadas. `0` es siempre la canónica. */
  setView(index: number): void;
  /**
   * Instrumento `LUZ`: mueve la ÚNICA lámpara que hay sin tocar el encuadre.
   *
   * No mueve la cámara respecto del espécimen — mueve el espécimen alrededor
   * del origen del mundo, que es donde vive la luz, con la cámara enganchada.
   * Misma cara, misma distancia, misma rotación de la figura, otra luz. Es la
   * variable que el §6 autoriza a tocar, y la única forma que tiene este visor
   * de ofrecerla sin inventarse una lámpara.
   */
  /**
   * AUSENTE EN GARGANTÚA, y su ausencia es la mitad del contrato de ese
   * espécimen: no hay lámpara que mover porque la lámpara ES el objeto. La
   * interfaz lo dice con un método opcional y no con un método que no hace
   * nada — un mando que existe y no obedece es peor que un mando que no está.
   */
  setLight?(light: LightGeometry): void;
  /**
   * Instrumento `EJE`: gira la FIGURA sobre su propio eje, en grados.
   *
   * El tercer gesto del laboratorio, y el único que enseña otra cara SIN tocar
   * la luz. Orbitar cambia la cara y la clave a la vez —la lámpara es el
   * origen—; `LUZ` cambia la clave y conserva la cara; esto cambia la cara y
   * conserva la clave, porque el cuerpo no se mueve del sitio del mundo donde
   * está: `lightGeometry` devuelve los mismos dos números antes y después.
   *
   * Absoluto y no incremental, por lo mismo que `spinAt`: el dial es una
   * posición, no un empujón, y `Reajustar` tiene que poder volver a cero sin
   * llevar la cuenta de cuánto se giró.
   *
   * **Ausente en Gargantúa y en el Tesseracto.** La primera no tiene malla que
   * girar; el segundo tiene su lectura entera en la orientación de reposo. El
   * motivo largo de los dos vive en `hasTurnInstrument`.
   */
  setTurn?(degrees: number): void;
  /** Enciende la sonda. Sin ella el puntero sólo gira el espécimen. */
  setProbe(enabled: boolean): void;
  /** Vuelve a la pose del preset. No es «movimiento» y por eso no depende del
   *  interruptor global. */
  reset(): void;
  /** Instrumento `BLOOM`: apagar el halo. La prueba de oficio del proyecto —un
   *  cuerpo que pierde su identidad sin glow no está terminado. */
  setBloom(enabled: boolean): void;
  /** Instrumento `MATERIAL`: el material sin su emisión, vía `uEmission`. Aísla
   *  un canal con fines diagnósticos; no altera un solo parámetro. */
  setEmission?(enabled: boolean): void;
  /**
   * Instrumento de física, sólo en Gargantúa: apaga una rama del raymarch.
   *
   * `uDoppler`, `uSecondary` y `uSkyLens` llevan escritos en el fragmento desde
   * que se escribió y hasta este pase valían 1 y no los tocaba nadie. Cada uno
   * retira una pieza concreta —el beaming y la asimetría, las imágenes de orden
   * superior, la curvatura del campo estelar— así que apagarlos es la cláusula
   * de inspección del §6 aplicada a un objeto sin material: aísla un canal con
   * fines diagnósticos y no altera ni un parámetro.
   */
  setPhysics?(uniform: "uDoppler" | "uSecondary" | "uSkyLens", on: boolean): void;
  /** El interruptor global. Gobierna el movimiento AUTÓNOMO, nunca la mano del
   *  visitante: rotar y acercar siguen funcionando con él apagado. */
  setMotion(enabled: boolean): void;
  dispose(): void;
}

export interface ObservatoryOptions {
  canvas: HTMLCanvasElement;
  world: SceneBodyInput;
  motion: boolean;
  /**
   * Nivel de calidad del raymarch. Sólo lo usa Gargantúa.
   *
   * Los cinco sólidos no lo necesitan —su coste lo fija la geometría, que no
   * tiene palancas— pero un raymarcher sí: píxeles y pasos. Llega desde el
   * visor porque es quien ya tiene el veredicto de capacidad, y así esta escena
   * no vuelve a preguntarle al navegador lo que la página ya sabe.
   */
  tier?: QualityTier;
  /**
   * El apretón de manos de llegada: se llama UNA vez, justo después del primer
   * `composer.render()` que de verdad ha pintado.
   *
   * No sirve el `.then()` del import dinámico —ahí sólo existe el contrato
   * medido, y el lienzo sigue vacío— ni sirve el primer `requestAnimationFrame`,
   * porque este bucle es bajo demanda y sale por `if (!dirty) return` antes de
   * dibujar. Sin esta llamada nadie de fuera puede saber cuándo hay imagen, y
   * ésa es exactamente la diferencia entre encender un instrumento y enseñar un
   * rectángulo negro mientras se monta.
   */
  onFirstFrame?: () => void;
  /**
   * El instrumento se rindió a mitad de un fotograma.
   *
   * Lo usa el camino de Gargantúa, que es el único con un bucle capaz de
   * fallar después de haber pintado: un raymarch con acumulación temporal
   * escribe en render targets de media precisión, y eso puede caerse en un
   * equipo que sí llegó a montar el contexto. Sin este aviso la pantalla se
   * queda con el último fotograma bueno y nada dice que el aparato está muerto
   * — que es peor que un rectángulo negro, porque parece que funciona.
   */
  onFailure?: (reason: string) => void;
  /**
   * La telemetría, en cada fotograma que se pinta.
   *
   * Va por callback y no por getter porque lo que describe es un movimiento: si
   * hubiera que preguntar, quien pregunta tendría que montar su propio bucle
   * junto al que ya existe. Y se llama DESPUÉS de colocar la cámara, así que lo
   * que publica es la cámara que se está dibujando y no la del fotograma
   * anterior.
   */
  onTelemetry?: (telemetry: ObservationTelemetry) => void;
  /** Lo que la sonda encuentra bajo el puntero, o `null` al señalar el vacío. */
  onProbe?: (reading: ProbeReading | null) => void;
}

export function createObservatoryScene(
  options: ObservatoryOptions,
): ObservatoryHandle | null {
  const { canvas, world, onFirstFrame, onTelemetry, onProbe } = options;

  /*
    GARGANTÚA SE VA POR OTRA PUERTA, y es la única que lo hace.

    Todo lo que hay debajo de esta línea da por supuesta una malla: `createBody`
    devuelve `null` para ella, `OBSERVATION_PRESETS` la excluye a propósito
    —no recibe ninguna luz añadida, §6— y `specimenContract` mide recorriendo un
    objeto que no existe. Forzarla por aquí habría exigido fingir que tiene
    posición, material y ángulo de clave.

    Se reparte en el borde y no dentro, para que el camino de los cinco sólidos
    no gane una sola rama por un espécimen que no es como ellos. Los dos
    caminos devuelven el mismo handle, que es lo que permite que el visor no se
    entere.
  */
  if (world.visual === "black-hole") {
    return createGargantuaObservatory({
      ...options,
      tier: options.tier ?? "orbit",
    });
  }

  const body = createBody(world);
  if (!body) return null;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
    failIfMajorPerformanceCaveat: false,
  });
  renderer.setClearColor(0x000000, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = BASE_EXPOSURE;

  const scene = new THREE.Scene();
  scene.add(body.object);

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 4000);

  /*
    El encuadre: a `d = r / sin(fov/2)` la ENVOLVENTE llena el alto exacto. Se
    divide por el `boundsFill` DEL PRESET para dejarle aire alrededor — un
    objeto que toca los bordes se lee como un recorte, no como una muestra.

    Del preset y no de una constante del driver: la relación entre la esfera
    envolvente y lo que se ve es propia de cada figura, así que un mismo número
    encuadra dos especímenes de dos tamaños distintos. Encuadrar la Endurance
    «como el Tesseracto» sería tratar el laboratorio como la página de un
    objeto, que es justo lo que este Observatorio no puede ser.
  */
  const id = world.id as Exclude<WorldId, "gargantua">;
  const preset = OBSERVATION_PRESETS[id];

  /**
   * La distancia de encuadre para una forma de cuadro dada.
   *
   * ── Y el alto no siempre es el que recorta ──────────────────────────────
   *
   * La fórmula de arriba es la de toda la vida y estaba a medias: `FOV` es el
   * campo VERTICAL, así que `sin(fov/2)` sólo dice cuánto cabe a lo alto. En un
   * cuadro apaisado eso basta —lo ancho sobra— y por eso nadie lo notó en año y
   * medio de capturas a 1440 x 900. En cuanto el cuadro se estrecha, el que
   * recorta es el ancho, y three.js no compensa: `PerspectiveCamera` conserva
   * el campo vertical y ESTRECHA el horizontal.
   *
   * Medido proyectando la geometría real a 375 x 812, que es el proyecto móvil
   * de la suite, ANTES de tocar esto:
   *
   *   Tesseracto   alto  83.4 %   ancho  180.9 %
   *   Endurance    alto  75.9 %   ancho  185.1 %
   *
   * O sea que en móvil los dos especímenes montados salían cortados por los dos
   * costados, casi al doble del cuadro. No es una regresión de este pase: lleva
   * ahí desde el primero, y sólo se ve donde nadie mide. Gargantúa no lo sufre
   * porque su encuadre SÍ conoce el aspecto (`gargantuaFraming`) — se escribió
   * al montarla, y esto es esa misma lección aplicada al camino de los sólidos.
   *
   * El arreglo es tomar el eje que de verdad recorta. Por construcción no mueve
   * ni un píxel de lo aprobado: con el cuadro apaisado el campo horizontal es
   * MAYOR que el vertical, su seno también, y el mínimo vuelve a ser el término
   * de siempre. Sólo cambia por debajo de un aspecto de 1.
   */
  function framingFor(aspect: number): number {
    const half = ((FOV / 2) * Math.PI) / 180;
    const halfWide = Math.atan(Math.max(aspect, 1e-3) * Math.tan(half));
    return (
      body!.radius /
      (preset.boundsFill * Math.min(Math.sin(half), Math.sin(halfWide)))
    );
  }

  /*
    Deja de ser constante, y por eso la esférica se reescala con ella: el
    visitante puede haber acercado la rueda antes de girar el teléfono, y lo que
    tiene que conservarse en ese giro es su ZOOM —la razón contra el encuadre—,
    no la distancia en unidades de mundo. `resize` hace ese reparto.
  */
  let framing = framingFor(1);
  const placement = observationPlacement(id, body.radius, framing);

  /*
    Dónde está el espécimen, y por tanto de dónde le llega la luz: la lámpara es
    el origen, así que `normalize(-target)` ES la dirección de la clave.

    Ya no es constante. El instrumento `LUZ` lo gira alrededor del origen —con
    la cámara rígidamente unida— para barrer la iluminación sin mover la
    observación. `homeTarget` guarda la pose del preset, que es a la que vuelven
    `Reajustar` y cualquier vista curada.
  */
  const target = new THREE.Vector3(...placement.body);
  const homeTarget = target.clone();
  body.object.position.copy(target);

  /*
    La órbita en coordenadas esféricas ALREDEDOR DEL ESPÉCIMEN, sembradas desde
    la pose del preset. Así «reajustar» es literalmente volver a estos tres
    números, y no hay un segundo camino por el que la cámara pueda llegar a un
    sitio que el preset no describa.
  */
  const home = new THREE.Vector3(...placement.camera).sub(target);
  const spherical = new THREE.Spherical().setFromVector3(home);
  const homeSpherical = spherical.clone();
  // Mutable: cada vista recalcula su vertical, porque el `up` sale de la
  // mirada y la mirada cambia con el ángulo de clave.
  const up = new THREE.Vector3(...placement.up);

  /*
    La atmósfera. Va en `scene` y NUNCA colgada de `body.object`, aunque ahí
    parecería más ordenado: `specimenContract` recorre `body.object` para medir
    el espécimen, así que el cielo subiría las «Llamadas de dibujo» del panel
    DATOS de 4 a 5 y el panel mentiría sobre la figura. El contrato mide lo que
    ES el espécimen, y el espacio de detrás no lo es.

    La dirección de la luz sale de la misma verdad que todo lo demás aquí: la
    luz es el origen del mundo, así que vista desde el espécimen está en
    `normalize(-target)`.
  */
  const sky = createObservatorySky(target.clone().negate());
  /**
   * Recoloca espécimen y cielo tras mover la luz.
   *
   * La cámara NO se toca aquí: vive en coordenadas esféricas relativas al
   * espécimen y `applyCamera` la reconstruye sumando el `target` nuevo. Ésa es
   * justo la propiedad que hace que mover la luz conserve el encuadre exacto —
   * el offset cámara-espécimen no se recalcula, se arrastra.
   */
  function placeSpecimen() {
    body!.object.position.copy(target);
    sky.setLight(target.clone().negate());
    dirty = true;
  }
  scene.add(sky.object);

  /*
    El banco visual, leído UNA vez al montar — no es reactivo, igual que en el
    System Map. El Observatorio era la única escena del proyecto que dibuja
    cuerpos sin honrarlo, y eso costaba dos cosas: no tenía `--reloj`, que su
    propia herramienta de captura reconocía como deuda, y no había forma de
    apagar una atmósfera cuyo mérito es justamente no notarse.
  */
  const bench = readVisualBench();
  sky.setLayers(bench.atmosphere);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(1, 1),
    BLOOM_STRENGTH,
    BLOOM_RADIUS,
    BLOOM_THRESHOLD,
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  /*
    LAS VISTAS CURADAS.

    Una vista es el MISMO cálculo de `observationPlacement` con otros dos
    ángulos: el espécimen no se mueve, el material no se toca y la luz sigue
    siendo el origen del mundo. Lo único que cambia es dónde se sienta el
    visitante respecto de la única lámpara que hay — que es la definición de
    «condiciones de observación» del §6, y por eso cada vista puede decir qué
    revela sin inventarse una capacidad.
  */
  const views = observationViews(world.id);

  /*
    LA SONDA, sólo donde se puede nombrar lo que se señala.
    
    El Tesseracto es hoy el único: su topología la publica `lib/tesseract.ts`
    —dieciséis vértices, treinta y dos aristas, cada una corriendo por uno de
    los cuatro ejes— y su pose sale de una función pura que se puede volver a
    evaluar aquí con los mismos segundos y los mismos bits. La Endurance tiene
    arquitectura contable pero sus piezas no llevan nombre en la malla, así que
    una sonda sobre ella sólo podría decir «un triángulo»: eso no es un
    instrumento, es un inspector.
  */
  const probeEdges =
    world.id === "tesseract"
      ? (body.object.getObjectByName("tesseract-crystal-edges") ?? null)
      : null;
  const probePoints = new Float32Array(48);
  const probeCells = new Float32Array(16);
  const probeScreen = new Float32Array(32);
  const probeVector = new THREE.Vector3();
  let probing = false;
  let pointerX = 0;
  let pointerY = 0;

  let motion = options.motion;
  /*
    EL GIRO PROPIO DE LA FIGURA, en grados, y por qué es una variable de esta
    escena y no del cuerpo.

    `SceneBody.turnTo` es absoluto —pone el cuaternión de la raíz— así que el
    modelo no lleva memoria de cuánto se le pidió. Aquí sí hace falta: el bucle
    llama a `animateAt` sesenta veces por segundo y `Reajustar` tiene que poder
    volver a casa. Cero es la orientación de reposo, que es la que encuadra el
    preset.

    Y no lo toca nada más. Ni orbitar, ni el zoom, ni las vistas curadas, ni el
    interruptor de movimiento: es el único número del aparato que sólo cambia
    cuando alguien lo pide, y por eso es el único mando de la consola que no es
    además una lectura.
  */
  let turn = 0;
  let emission = 1;
  let elapsed = 0;
  let last = 0;
  let frame = 0;
  let disposed = false;
  /** Si ya se avisó del primer fotograma pintado. Una vez y nunca más. */
  let painted = false;
  /** Render bajo demanda: se dibuja cuando algo cambió, no en bucle. */
  let dirty = true;
  let width = 0;
  let height = 0;

  function applyCamera() {
    spherical.makeSafe();
    camera.position.setFromSpherical(spherical).add(target);
    camera.up.copy(up);
    camera.lookAt(target);
    // La cáscara viaja con la cámara y no rota: rotación pura, traslación cero.
    // Eso es lo que la hace infinita — y lo que hace que no cueste un solo
    // redibujado extra, porque sólo cambia cuando ya se estaba redibujando.
    sky.follow(camera);
  }

  function resize(): boolean {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === width && h === height) return false;
    width = w;
    height = h;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    composer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    /*
      `composer.setSize` ya propaga a cada pasada el tamaño EFECTIVO —píxeles
      CSS por el dpr—, así que llamar después a `bloomPass.setSize(w, h)` lo
      pisaba con píxeles CSS y a dpr 2 los mips del bloom se construían a la
      mitad de la resolución que les toca: el kernel salía del doble de ancho
      en pantalla.

      No se veía porque `tools/observatory-shot.mjs` fija `deviceScaleFactor: 1`
      — la misma clase de coincidencia que escondió durante meses el marco del
      overlay a 1440 px. En una pantalla retina el bloom no era el de las
      capturas sobre las que se calibró.
    */
    composer.setSize(w, h);
    const aspect = h > 0 ? w / h : 1;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();

    /*
      El encuadre se rehace con la forma del cuadro, y la esférica se reescala
      con él. Se escala `radius` en vez de reasignarlo para conservar el zoom
      del visitante: si había acercado a 0.6 del encuadre, sigue a 0.6 del
      encuadre nuevo. `homeSpherical` viaja igual, o `Reajustar` devolvería la
      cámara a una distancia que ya no encuadra nada.
    */
    const wanted = framingFor(aspect);
    if (Math.abs(wanted - framing) > 1e-6) {
      const scale = wanted / framing;
      framing = wanted;
      spherical.radius *= scale;
      homeSpherical.radius *= scale;
    }
    return true;
  }

  /*
    Los CUATRO uniformes por fotograma, los mismos que escribe `updateBodies` en
    el System Map, y en el mismo orden de responsabilidad: `uTime` sin guarda
    porque todo material lo declara; el resto con `?.` porque no todos lo hacen.

    `uLightIntensity` sale del preset, que copia la ley del mapa: el espécimen
    conserva «a qué distancia del disco vive», que es parte de su identidad.
  */
  function writeUniforms() {
    for (const material of body!.materials) {
      const uniforms = material.uniforms;
      // Mismo reloj que la figura, o la pose y el trazo se desincronizan.
      uniforms.uTime.value = bench.clock ?? elapsed;
      uniforms.uCamPos?.value.copy(camera.position);
      if (uniforms.uLightIntensity) {
        uniforms.uLightIntensity.value = placement.lightIntensity;
      }
      if (uniforms.uEmission) uniforms.uEmission.value = emission;
    }
  }

  function renderFrame(timestamp: number) {
    if (disposed) return;
    frame = requestAnimationFrame(renderFrame);

    const delta = last ? Math.min((timestamp - last) / 1000, 0.05) : 0;
    last = timestamp;

    /*
      SÓLO el movimiento propio del espécimen: `animateAt`, nunca `spinAt`.

      El §3 retira el giro genérico en reposo —«un objeto que gira solo obliga a
      perseguirlo para mirarle una cara concreta»— pero conserva lo que es
      CONTENIDO: la reconfiguración del Tesseracto, el oleaje de Miller, los RCS
      y las balizas de la Endurance. Apagar el reloj entero apagaría las dos
      cosas, así que el giro se anula por espécimen y no por reloj, y eso es una
      diferencia deliberada con el System Map — allí un solo interruptor congela
      todo a la vez.

      Con el Tesseracto la distinción no se veía: su `SPIN_RATE` vale 0, así que
      los dos métodos daban el mismo resultado. La Endurance gira a 0.016 rad/s
      y es el primer espécimen donde llamar al equivocado se nota.
    */
    /*
      Con el reloj del banco clavado la figura NO avanza: `sampleTesseract` es
      función pura de los segundos, así que el mismo número da los mismos
      dieciséis vértices bit a bit, hoy y la semana que viene, en esta máquina
      y en otra. Es lo que hace comparables tres capturas tomadas en tres
      cargas distintas — y `elapsed`, que se acumula de deltas de rAF, no puede
      darlo: su valor a los diez segundos depende de cuántos fotogramas haya
      conseguido la GPU.
    */
    if (motion && bench.clock === null) {
      elapsed += delta;
      body!.animateAt(elapsed);
      dirty = true;
    }

    if (resize()) dirty = true;
    if (!dirty) return;
    dirty = false;

    applyCamera();
    writeUniforms();
    composer.render();

    /*
      La telemetría, después de colocar la cámara y de dibujar: lo que se
      publica es la cámara que se está viendo, no la del fotograma anterior.

      Y sólo en fotogramas que se PINTAN. El bucle es bajo demanda y ya salió
      por `if (!dirty) return` si nada cambió, así que en reposo esto no se
      llama ni una vez por segundo. Una lectura que se repite sola no es
      telemetría, es un temporizador.
    */
    onTelemetry?.(
      observationTelemetry(
        camera.position.toArray(),
        [target.x, target.y, target.z],
        body!.radius,
        // La vertical de verdad y no el eje +Y del mundo: las vistas curadas la
        // cambian, y con la equivocada el `roll` de la luz saldría torcido justo
        // en las poses donde el mando de `LUZ` más se usa.
        up.toArray() as [number, number, number],
        FOV,
      ),
    );
    if (probing) resolveProbe();

    /*
      Aquí y no antes. El aviso va DESPUÉS de `composer.render()` porque lo que
      se anuncia es que hay imagen, no que haya escena: entre construir el
      cuerpo y pintarlo hay una compilación de shaders que en un equipo modesto
      se mide en cientos de milisegundos.
    */
    if (!painted) {
      painted = true;
      onFirstFrame?.();
    }
  }

  /**
   * LA SONDA: qué arista hay bajo el puntero y qué se sabe de ella.
   *
   * Los dieciséis vértices se vuelven a muestrear aquí con los MISMOS segundos
   * que usó el modelo. No es una copia del estado: `sampleTesseract` es una
   * función pura, así que el mismo número da los mismos dieciséis vértices bit
   * a bit — es la misma propiedad que hace comparables las capturas del banco
   * visual. La alternativa —sacar el array del cierre del modelo— acoplaría el
   * visor a la implementación de la figura para no ganar nada.
   *
   * Después se proyectan a PÍXELES del lienzo, no a coordenadas normalizadas:
   * en normalizadas una ventana apaisada mide distinto a lo ancho que a lo
   * alto, y «la arista más cercana» dependería de la forma de la ventana.
   */
  function resolveProbe() {
    if (!probeEdges || !onProbe) return;
    sampleTesseract(bench.clock ?? elapsed, probePoints, probeCells);
    probeEdges.updateWorldMatrix(true, false);

    for (let vertex = 0; vertex < 16; vertex += 1) {
      probeVector
        .fromArray(probePoints, vertex * 3)
        .applyMatrix4(probeEdges.matrixWorld)
        .project(camera);
      probeScreen[vertex * 2] = ((probeVector.x + 1) / 2) * width;
      probeScreen[vertex * 2 + 1] = ((1 - probeVector.y) / 2) * height;
    }

    /*
      El radio de captura sale del tamaño del cuadro y no de un número fijo: en
      una ventana pequeña el espécimen ocupa menos píxeles, así que un alcance
      constante señalaría media figura. Un 3.2 % del lado menor es, medido,
      algo más que el grosor de una arista gruesa.
    */
    const hit = nearestEdge(
      probeScreen,
      pointerX,
      pointerY,
      Math.min(width, height) * 0.032,
    );
    if (!hit) {
      onProbe(null);
      return;
    }

    const x =
      probeScreen[hit.from * 2] * (1 - hit.t) + probeScreen[hit.to * 2] * hit.t;
    const y =
      probeScreen[hit.from * 2 + 1] * (1 - hit.t) +
      probeScreen[hit.to * 2 + 1] * hit.t;

    probeVector
      .fromArray(probePoints, hit.from * 3)
      .lerp(
        new THREE.Vector3().fromArray(probePoints, hit.to * 3),
        hit.t,
      )
      .applyMatrix4(probeEdges.matrixWorld);

    onProbe({
      ...hit,
      depth: probeDepth(probeCells, hit),
      range: probeVector.distanceTo(camera.position) / body!.radius,
      screen: { x, y },
    });
  }

  // ── El gesto del visitante ────────────────────────────────────────────────
  // Manipulación directa: vive fuera del interruptor de movimiento, que sólo
  // gobierna lo autónomo.

  let dragging: number | null = null;
  let lastX = 0;
  let lastY = 0;

  function onPointerDown(event: PointerEvent) {
    if (dragging !== null) return;
    dragging = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  }

  function trackPointer(event: PointerEvent) {
    if (!probing) return;
    const box = canvas.getBoundingClientRect();
    pointerX = event.clientX - box.left;
    pointerY = event.clientY - box.top;
    // La sonda se resuelve en el fotograma, no en el evento: un `pointermove`
    // llega hasta cinco veces por fotograma en un ratón moderno y proyectar
    // dieciséis vértices cinco veces para tirar cuatro resultados es trabajo
    // regalado.
    dirty = true;
  }

  function onPointerMove(event: PointerEvent) {
    trackPointer(event);
    if (dragging !== event.pointerId) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    // Media pantalla de arrastre ≈ media vuelta: el gesto lleva el espécimen
    // con la mano, sin aceleración ni inercia que lo conviertan en un juguete.
    spherical.theta -= (dx / Math.max(width, 1)) * Math.PI * 2;
    spherical.phi = THREE.MathUtils.clamp(
      spherical.phi - (dy / Math.max(height, 1)) * Math.PI,
      Math.PI / 2 - PITCH_LIMIT,
      Math.PI / 2 + PITCH_LIMIT,
    );
    dirty = true;
  }

  function endDrag(event: PointerEvent) {
    if (dragging !== event.pointerId) return;
    dragging = null;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault();
    spherical.radius = THREE.MathUtils.clamp(
      spherical.radius * (1 + Math.sign(event.deltaY) * 0.12),
      framing * ZOOM_NEAR,
      framing * ZOOM_FAR,
    );
    dirty = true;
  }

  /* Sacar el puntero del lienzo borra la lectura. Sin esto, la retícula se
     queda clavada donde estuvo y sigue afirmando una arista que ya nadie
     señala — una medición que sobrevive a su gesto es una medición falsa. */
  function onPointerLeave() {
    if (!probing) return;
    onProbe?.(null);
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  resize();
  applyCamera();
  body.animateAt(bench.clock ?? 0);
  frame = requestAnimationFrame(renderFrame);

  /**
   * Coloca una vista curada.
   *
   * Reusa `observationPlacement` con otros dos ángulos y otra distancia, y de
   * ahí saca cámara y vertical. No hay un segundo camino por el que la cámara
   * pueda llegar a un sitio que no describa el contrato de observación — que es
   * la misma invariante que ya protegía `reset()`.
   */
  function applyView(index: number) {
    const view = views[index];
    const resolved = resolveView(preset, view);
    /*
      Una vista es una CONDICIÓN DE OBSERVACIÓN completa, no un encuadre suelto:
      sus dos ángulos se declaran respecto de la luz canónica, así que aplicarla
      sobre una luz movida a mano daría un ángulo de clave que no es el que la
      vista promete. Se devuelve la lámpara a su sitio antes de colocar la
      cámara — y eso es lo que mantiene en pie la prueba que dice que elegir
      `RASANTE` lleva `CLAVE` a los 92° que la vista declara.

      LO QUE NO SE DEVUELVE ES LA CARA, y la asimetría con `Reajustar` es
      deliberada. La luz hay que devolverla porque sin eso la vista INCUMPLE su
      promesa: sus dos ángulos están declarados contra la luz canónica y sobre
      una luz movida a mano darían otro ángulo de clave. El giro de la figura no
      entra en ninguna de esas cuentas —ni en `keyAngle`, ni en `keyAzimuth`, ni
      en el encuadre, que sale de una envolvente invariante por rotación— así
      que devolverlo no corregiría nada y sí le quitaría al visitante lo que
      acababa de elegir. Se escoge la cara y se barren las vistas sobre ella;
      `Reajustar` sigue siendo el que devuelve las dos cosas.
    */
    target.copy(homeTarget);
    placeSpecimen();
    const pose = observationPlacement(
      id,
      body!.radius,
      framing * resolved.distance,
      resolved,
    );
    up.set(...pose.up);
    spherical.setFromVector3(
      new THREE.Vector3(...pose.camera).sub(target),
    );
    dirty = true;
  }

  /**
   * Gira la figura sobre su eje.
   *
   * Sólo se publica donde significa algo (`hasTurnInstrument`), y por eso se
   * ata al handle con un reparto condicional en vez de con un método que
   * compruebe el espécimen por dentro: el visor monta la fila SI el método
   * existe, igual que hace con `LUZ`. Un mando que existe y no obedece es peor
   * que un mando que no está.
   */
  function applyTurn(degrees: number) {
    turn = degrees;
    body!.turnTo(turn * (Math.PI / 180));
    dirty = true;
  }

  return {
    contract: specimenContract(body),
    views: views.map(({ id: key, label, study }) => ({ id: key, label, study })),
    canProbe: probeEdges !== null,
    canOrbit: true,
    instruments: instrumentsFor(world.id),
    ...(hasTurnInstrument(world.id) ? { setTurn: applyTurn } : {}),
    setView(index) {
      if (index < 0 || index >= views.length) return;
      applyView(index);
    },
    setLight(light) {
      /*
        LA CÁMARA SE RECONSTRUYE, NO SE LEE.

        `camera.position` sólo se actualiza dentro de `applyCamera`, o sea una
        vez por fotograma PINTADO. La fuente de verdad del encuadre es la
        esférica, y las dos se separan en cuanto llegan dos órdenes entre dos
        fotogramas — que es exactamente lo que hace una flecha del teclado
        mantenida, o el pulgar sobre el dial.

        Leyendo la posición vieja, cada orden conservaba un desplazamiento
        caducado y la luz acababa en un sitio que no era el pedido. Se vio en un
        barrido con flechas: el dial saltaba de 52° a 49° en una sola pulsación,
        porque el ángulo devuelto por la geometría ya no coincidía con el
        mandado y la lectura del fotograma siguiente lo sobrescribía. Reconstruir
        el desplazamiento desde la esférica hace la ida y la vuelta exactas por
        construcción, sin importar cuántas órdenes lleguen entre dos fotogramas.
      */
      spherical.makeSafe();
      const offset = new THREE.Vector3().setFromSpherical(spherical);
      const placed = lightPlacement(
        [target.x + offset.x, target.y + offset.y, target.z + offset.z],
        [target.x, target.y, target.z],
        up.toArray() as [number, number, number],
        light,
      );
      target.set(...placed.body);
      placeSpecimen();
    },
    setProbe(enabled) {
      probing = enabled && probeEdges !== null;
      // Apagarla tiene que borrar la lectura: una retícula que se queda
      // colgada donde estuvo el puntero es un dato mintiendo sobre el presente.
      if (!probing) onProbe?.(null);
      dirty = true;
    },
    reset() {
      /*
        Vuelve a la pose de casa Y a la vertical de casa. Antes sólo restauraba
        las tres coordenadas esféricas, que bastaba porque el `up` no cambiaba
        nunca; con las vistas sí cambia, y sin esta línea `Reajustar` dejaría el
        cuadro girado.
      */
      spherical.copy(homeSpherical);
      up.set(...placement.up);
      // Y la luz. `Reajustar` significa «la pose del preset», y desde que el
      // instrumento `LUZ` existe la pose incluye de dónde viene la clave.
      target.copy(homeTarget);
      /*
        Y la cara. Con el mando `EJE`, «la pose del preset» incluye también qué
        lado de la figura mira a la cámara: dejar el cuerpo girado y devolver
        todo lo demás daría una pose que ningún preset describe, que es justo lo
        que este botón existe para que no pueda pasar.

        Donde no hay mando esto no hace nada, porque `turn` no ha salido de cero
        en toda la vida del instrumento.
      */
      applyTurn(0);
      placeSpecimen();
    },
    setBloom(enabled) {
      bloomPass.enabled = enabled;
      dirty = true;
    },
    setEmission(enabled) {
      emission = enabled ? 1 : 0;
      dirty = true;
    },
    setMotion(enabled) {
      motion = enabled;
      // Reanudar sin `last` limpio daría un salto proporcional al tiempo que
      // estuvo apagado.
      last = 0;
      dirty = true;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endDrag);
      canvas.removeEventListener("pointercancel", endDrag);
      canvas.removeEventListener("wheel", onWheel);
      disposeBody(body);
      sky.dispose();
      bloomPass.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
