import type { WorldId } from "@/content/worlds.data";
import {
  lightGeometry,
  OBSERVATION_PRESETS,
  type ObservationPreset,
  type Vec3,
} from "./observatory";

/**
 * LAS VISTAS DE OBSERVACIÓN, y la telemetría que las acompaña.
 *
 * > No estamos mostrando los objetos más grandes. Estamos dando al visitante
 * > instrumentos para estudiarlos.
 * > — docs/design/tesseract-experimentos.md
 *
 * Una vista NO es un encuadre bonito. En este Observatorio sólo hay una fuente
 * de luz y **es el origen del mundo**, así que la única variable de observación
 * que existe de verdad es dónde se sienta uno respecto de ella. Por eso una
 * vista se define exactamente con los mismos dos números que el preset
 * —`keyAngle` y `keyAzimuth`— más la distancia: son las condiciones de
 * observación, no una cámara colocada a ojo.
 *
 * Esa restricción es lo que hace honesta la lista. Cada vista puede decir qué
 * revela porque lo que cambia es la GEOMETRÍA DE LA LUZ sobre un material que
 * no se toca, que es literalmente el §6:
 *
 * > El Observatorio puede cambiar las condiciones de observación, pero no puede
 * > alterar la identidad material del objeto para hacerlo funcionar.
 *
 * ── Lo que NO hay aquí, y por qué ───────────────────────────────────────────
 *
 * **Gargantúa no tiene vistas en este módulo.** El §7 diseña cuatro
 * —cinematográfica, lente, disco y sombra— pero eso es una especificación, no
 * código: Gargantúa no tiene malla, `createBody` devuelve `null` para ella y en
 * el catálogo figura como muestra sin montar. Publicar sus cuatro vistas aquí
 * sería exactamente lo que este archivo existe para impedir: un instrumento que
 * promete una capacidad que el modelo no tiene.
 *
 * **Y ninguna vista apaga una capa del modelo.** Esconder las facetas para
 * «estudiar el trazo» sería alterar la figura, no las condiciones. Lo que aísla
 * un canal es el instrumento `MATERIAL`, que escribe `uEmission` y está
 * declarado como diagnóstico.
 *
 * ── UNA VISTA PUEDE ALEJARSE, NUNCA ACERCARSE ──────────────────────────────
 *
 * La regla la impuso una captura. Había una vista `SECCIÓN` a 0,55 de la
 * distancia de encuadre —para estudiar la redondez del tubo de la arista— y lo
 * que salió no era una observación: era un recorte, con la figura cortada por
 * los cuatro lados.
 *
 * El motivo está medido y vive en `observatory-framing.test.ts`: la silueta del
 * Tesseracto ocupa entre el 54 % y el 86 % del alto según la fase de su
 * reconfiguración, **treinta y un puntos de banda**. Cualquier factor menor que
 * uno multiplica esa banda entera, así que una vista «de cerca» que quepa en la
 * pose delgada se sale del cuadro en la gruesa. No hay número que arregle eso,
 * porque el problema no es el número: es que la figura respira.
 *
 * Alejarse sí es seguro —nunca recorta— y por eso `SILUETA` puede pedir su aire.
 * Acercarse es trabajo del visitante con la rueda, que además puede volver.
 */

export interface ObservationView {
  /** Clave estable. Va al DOM y a las pruebas, nunca a la pantalla. */
  id: string;
  /** Lo que se lee en el mando. */
  label: string;
  /**
   * Qué propiedad del espécimen revela esta geometría de luz.
   *
   * No es un eslogan: cada una de estas frases se puede rastrear hasta una
   * línea del shader o del modelo. Si alguna deja de ser cierta al tocar el
   * material, hay que reescribirla o retirar la vista.
   */
  study: string;
  /** Ángulo luz-mirada, en grados. Ausente = el del preset. */
  keyAngle?: number;
  /** Azimut alrededor del eje de luz. Ausente = el del preset. */
  keyAzimuth?: number;
  /** Multiplicador sobre la distancia de encuadre. Ausente = 1. */
  distance?: number;
}

/**
 * Las vistas, por espécimen.
 *
 * La primera de cada lista es SIEMPRE la canónica y **no repite los números del
 * preset**: los omite, y quien resuelve la pose los lee de allí. Dos copias del
 * mismo ángulo acabarían discrepando el día que se calibre uno de los dos.
 */
export const OBSERVATION_VIEWS: Partial<
  Record<Exclude<WorldId, "gargantua">, readonly ObservationView[]>
> = {
  tesseract: [
    {
      id: "canonica",
      label: "Canónica",
      study:
        "La jerarquía en la cuarta dimensión: la celda cercana en W va gruesa y clara, la lejana fina y apagada. Sólo se separa con la luz detrás.",
    },
    {
      id: "rasante",
      label: "Rasante",
      /* `spectral * fresnel` en tesseract-model.ts: el vidrio de las facetas
         devuelve luz a la cámara cerca del rasante y casi nada de frente. */
      keyAngle: 92,
      study:
        "Las seis facetas de vidrio. Su reflejo Fresnel sólo vuelve a la cámara cerca del rasante; de frente el 4-cubo es puro canto.",
    },
    {
      id: "silueta",
      label: "Silueta",
      /* El Tesseracto es el único cuerpo con `rim`, y a contraluz puro es lo
         único que queda entre la figura y el negro. */
      keyAngle: 176,
      distance: 1.12,
      study:
        "Contraluz puro. Lo único que sostiene la figura contra el negro es su filo frío, el único del laboratorio.",
    },
  ],
  ranger: [
    {
      id: "canonica",
      label: "Canónica",
      study:
        "Contraluz alto: la nave tiene bloque propio en el shader y está escrito para esto. Lo que dibuja el borde de ataque, la cabina y las góndolas no es el difuso, es el filo.",
    },
    {
      id: "planta",
      label: "Planta",
      /* Cenital con la luz de lado. Es la dirección de máxima área proyectada
         del barrido —22.1 contra 20.2 de la canónica— y la única donde la
         flecha del ala y la deriva en V se leen como planta y no como canto. */
      keyAngle: 90,
      keyAzimuth: 80,
      distance: 1.15,
      study:
        "Desde arriba con la luz de lado. La flecha del ala, la deriva en V y el panelado de chapa, que es el único del sistema con remaches, y sólo aparecen con el terminador cruzando el dorso.",
    },
    {
      id: "propulsion",
      label: "Propulsión",
      /* Desde atrás y arriba: el eje de escape mira a la cámara (0.42) y sólo
         el 18 % del área vista recibe luz, que es la condición para que se vea
         lo que la nave emite en vez de lo que refleja. */
      keyAngle: 100,
      keyAzimuth: 135,
      study:
        "Por detrás y casi a oscuras: las dos campanas, sus plumas y las balizas. Escape blanco azulado y señal violeta son el mismo material separados por máscara de vértice, y son lo único que no depende de la luz.",
    },
    {
      id: "perfil",
      label: "Perfil",
      /* Través exacto por babor: el producto de la mirada con el costado vale
         -1.00, así que ni la proa ni el dorso aportan nada a la silueta. */
      keyAngle: 139,
      /* 190 y no -170, que es el mismo sitio: el contrato de las vistas acota
         el azimut a [0, 360) y una prueba lo vigila. */
      keyAzimuth: 190,
      distance: 1.1,
      study:
        "Través exacto, a contraluz. El fuselaje es un lifting body y no un tubo, y eso sólo se afirma de perfil: la quilla del escudo térmico por el canto y el ala reducida a su larguero.",
    },
  ],
  endurance: [
    {
      id: "canonica",
      label: "Canónica",
      study:
        "Tres cuartos: es donde separan las facetas y las cavidades del aluminio. De frente se aplana en una silueta.",
    },
    {
      id: "rasante",
      label: "Rasante",
      keyAngle: 88,
      study:
        "Luz casi tangente. El terminador parte la nave y deja ver que sus módulos no están en el mismo plano.",
    },
    {
      id: "silueta",
      label: "Silueta",
      keyAngle: 168,
      /*
        1.1 → 1.18, y no es un retoque de gusto: a 1.1 la nave TOCABA el borde
        inferior del cuadro (NDC y = -1.00 a 1440 x 900, medido proyectando la
        malla). Lo encontró el instrumento que trajo la Ranger —
        `observatory-frames.test.ts`— al pasarlo por las vistas que ya existían.
      */
      distance: 1.18,
      study:
        "Contraluz. La cadena de módulos, los dos brazos y las lanzaderas se leen como estructura y no como superficie.",
    },
    {
      id: "operaciones",
      label: "Operaciones",
      /* Las toberas encendidas y las balizas son lo único emisivo de la nave
         (`endurance-operations.ts`), y sobre la cara noche es donde cuentan. */
      keyAngle: 128,
      /* Igual que `SILUETA`, y peor: a distancia 1 se salía por arriba (y =
         +1.06). Era la vista que más lo notaba porque es la más cerrada. */
      distance: 1.14,
      study:
        "Contra la cara noche: las toberas encendidas y las balizas, que son lo único que la nave emite por sí misma y lo único que no depende de la luz.",
    },
  ],
  /*
    LOS DOS PLANETAS, Y LA VISTA QUE NO TIENEN.

    Ninguno de los dos lleva `SILUETA`, y no es un hueco por rellenar: es la
    conclusión medida del pase. Todo lo que enciende el canto de un cuerpo de
    `uKind == 0` o `uKind == 1` está cerrado por `ndl` —`airLit` en los dos— así
    que a contraluz no queda filo, queda un agujero. La nota larga está al pie
    de `OBSERVATION_PRESETS`.

    Y ninguna de estas seis vistas toca `distance`. Tampoco es olvido: la regla
    de arriba —«una vista puede alejarse, nunca acercarse»— existe porque la
    silueta del Tesseracto respira treinta y un puntos y cualquier factor menor
    que uno la recorta. Una esfera no respira. Es la única figura del catálogo
    cuya ocupación es la misma en todas sus vistas, así que el encuadre del
    preset vale para las tres sin corrección.
  */
  miller: [
    {
      id: "canonica",
      label: "Canónica",
      study:
        "Tres cuartos: el camino de luz cruza la cara iluminada con su cresta —ladera clara, seno oscuro y espuma intermitente— y el terminador devuelve el volumen que la luz frontal borra.",
    },
    {
      id: "espejo",
      label: "Espejo",
      /* Los 25° que fueron preset hasta este pase. Aquí el lóbulo del destello
         —`exp(-(alongOff²·9 + acrossOff²·110))`— cubre buena parte del
         hemisferio en vez de un filete, que es justo lo que se quiere ver. */
      keyAngle: 25,
      study:
        "Luz casi frontal. El camino de luz se abre en lámina y deja ver hasta dónde llega el campo de destellos, que es lo que dice que abajo hay agua y no gas. El precio es que no hay terminador: el cuerpo pierde volumen.",
    },
    {
      id: "corrientes",
      label: "Corrientes",
      /* 92 y no 90: `keyAngle 90` con `keyAzimuth 90` degenera la base de
         cámara, y aunque aquí el azimut es 20 y el módulo tiene eje de
         reserva, no hay motivo para sentarse en el caso límite. */
      keyAngle: 92,
      study:
        "El terminador cruzando el disco. Las bandas latitudinales pican la lámina y modulan el brillo, y el filo de aire llega a su máximo: se enciende mirando a la luz, no teniéndola detrás.",
    },
  ],
  edmunds: [
    {
      id: "canonica",
      label: "Canónica",
      study:
        "Tres cuartos: las seis provincias minerales y la cordillera, que está definida por PENDIENTE y no por altura. La sombra larga ya está ahí y todavía lleva luz el 69 % del ancho del cuerpo.",
    },
    {
      id: "rasante",
      label: "Rasante",
      /* Los 82° que fueron preset hasta este pase: la luz casi tangente es
         literalmente el instrumento de un campo definido por pendiente. Aquí
         paga sólo quien lo pide: el 39 % del ancho del cuerpo lleva luz. */
      keyAngle: 82,
      study:
        "Luz casi tangente. Es el único ángulo donde una pendiente se convierte en una sombra larga, y donde el limbo se trocea en cresta encendida, hueco y destello corto. A cambio, dos tercios del cuerpo caen a oscuras.",
    },
    {
      id: "provincias",
      label: "Provincias",
      /* Al revés que las otras dos: con la luz casi en el eje el sombreado se
         aplana y lo único que queda dibujando es el ALBEDO, o sea el campo
         analítico de provincias sin el relieve encima. */
      keyAngle: 30,
      study:
        "Luz casi frontal. Al aplanarse el sombreado, lo único que queda dibujando es el color: ocre, cobre, carbón, arcilla, arena y oliva apagado, separados del relieve que normalmente los tapa.",
    },
  ],
};

/** Las vistas de un espécimen, o una lista vacía si no tiene ninguna. */
export function observationViews(id: WorldId): readonly ObservationView[] {
  return (
    OBSERVATION_VIEWS[id as Exclude<WorldId, "gargantua">] ?? ([] as const)
  );
}

/**
 * Los tres números de una vista, ya resueltos contra su preset.
 *
 * Existe para que quien coloca la cámara no tenga que saber qué campos de una
 * vista son opcionales ni de dónde salen sus valores por defecto.
 */
export function resolveView(
  preset: ObservationPreset,
  view: ObservationView | undefined,
): { keyAngle: number; keyAzimuth: number; distance: number } {
  return {
    keyAngle: view?.keyAngle ?? preset.keyAngle,
    keyAzimuth: view?.keyAzimuth ?? preset.keyAzimuth,
    distance: view?.distance ?? 1,
  };
}

/**
 * LA TELEMETRÍA, medida sobre la cámara que hay.
 *
 * Los cuatro números describen la observación y **ninguno se teclea**: salen de
 * la posición real de la cámara respecto del espécimen y respecto de la luz. Es
 * la misma regla del §8 que gobierna `specimen-contract.ts`, aplicada a lo que
 * se mueve.
 *
 * `key` es el que de verdad significa algo aquí, y es el que ningún visor
 * gráfico enseña: el ángulo entre la luz y la mirada medido EN EL ESPÉCIMEN, o
 * sea la columna `KEY` de la tabla del §6. Al orbitar, ese número es lo que
 * está cambiando de verdad — no se está paseando alrededor de un objeto
 * iluminado de frente, se está eligiendo dónde sentarse respecto del disco.
 *
 * `distance` va en RADIOS DEL ESPÉCIMEN y no en unidades de mundo: las unidades
 * de mundo son radios de Schwarzschild del sistema y aquí no significan nada,
 * mientras que «a seis radios del objeto» es una distancia de observación.
 */
export interface ObservationTelemetry {
  /** Azimut alrededor del eje vertical del mundo, 0-360°. */
  azimuth: number;
  /** Elevación sobre el plano horizontal, -90 a +90°. */
  elevation: number;
  /** Distancia al espécimen, en radios suyos. */
  distance: number;
  /**
   * Campo de visión del instrumento, en grados.
   *
   * Sube aquí desde el handle, donde era una constante del aparato. Dejó de
   * serlo al montar Gargantúa: sus cuatro vistas curadas cambian de objetivo
   * —35° la cinematográfica, 16° la sombra— porque sin órbita ni zoom el campo
   * es la única forma que tiene una vista de acercarse. Una lectura que cambia
   * con la observación es telemetría, no una ficha técnica.
   */
  fov: number;
  /**
   * Ángulo luz-mirada medido en el espécimen, 0-180°.
   *
   * **Ausente en Gargantúa**, y la ausencia es el dato. Este número mide la
   * separación entre la luz y la mirada; allí la luz es el propio objeto, así
   * que no hay ángulo que medir y un cero sería una medición falsa. Es la misma
   * frontera que deja a Gargantúa fuera de `OBSERVATION_PRESETS`.
   */
  key?: number;
  /**
   * Dónde cae la luz en el reloj de la PANTALLA, -180 a 180°.
   *
   * Es la otra mitad de la geometría de luz, y entra en la telemetría porque
   * los mandos de `LUZ` no son un formulario: son una lectura que además se
   * puede arrastrar. Con `key` y `roll` publicados en cada fotograma, orbitar
   * mueve los dos diales solo — que es lo que dice que el aparato está
   * conectado a algo.
   */
  roll?: number;
  /**
   * El peso de la mezcla temporal de este fotograma. Sólo donde hay raymarch.
   *
   * Es una de las cuatro lecturas que el §8 pide para Gargantúa, y se publica
   * leyendo el uniform que el bucle acaba de escribir — no la constante de la
   * que sale. Con la acumulación desactivada no existe, y entonces no se
   * enseña: un 0.18 escrito de todas formas sería exactamente el dato tecleado
   * que ese párrafo prohíbe.
   */
  blend?: number;
  /** Fotogramas ya promediados en el historial. */
  accumulated?: number;
}

const RAD = 180 / Math.PI;

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function length(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

/**
 * Mide la observación.
 *
 * @param camera dónde está la cámara, en el mundo.
 * @param body   dónde está el espécimen, en el mundo. La luz es el ORIGEN, así
 *               que desde el espécimen la luz está en `normalize(-body)`.
 * @param radius radio del espécimen, en unidades de mundo.
 * @param up     la vertical de la cámara. Hace falta para el `roll`, que se
 *               mide en el marco de la PANTALLA y no en el del mundo.
 */
export function observationTelemetry(
  camera: Vec3,
  body: Vec3,
  radius: number,
  up: Vec3 = [0, 1, 0],
  fov = 40,
): ObservationTelemetry {
  const view = sub(camera, body);
  const span = length(view);

  /*
    Convención de `THREE.Spherical`: theta se mide desde +Z hacia +X. Se copia a
    propósito para que el número que se enseña sea el mismo que el que mueve el
    arrastre, y no dos azimuts distintos separados por noventa grados.
  */
  const azimuth = (Math.atan2(view[0], view[2]) * RAD + 360) % 360;
  const elevation = span > 0 ? Math.asin(view[1] / span) * RAD : 0;

  /*
    El ángulo de clave y el giro NO se calculan aquí: los da `lightGeometry`,
    que es el mismo módulo que los usa para COLOCAR la luz. Una sola fórmula
    para leer y para escribir es lo que impide que el dial y la lectura acaben
    discrepando medio grado — y con el espécimen en el origen aquél ya devuelve
    ceros en vez de un NaN, porque ahí no hay dirección de luz que medir.
  */
  const { key, roll } = lightGeometry(camera, body, up);

  return {
    azimuth,
    elevation,
    distance: radius > 0 ? span / radius : 0,
    fov,
    key,
    roll,
  };
}

/** El preset de un espécimen, para quien tiene un `WorldId` y no un id acotado. */
export function observationPreset(id: WorldId): ObservationPreset | null {
  return OBSERVATION_PRESETS[id as Exclude<WorldId, "gargantua">] ?? null;
}
