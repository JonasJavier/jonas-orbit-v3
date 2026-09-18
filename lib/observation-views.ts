import type { WorldId } from "@/content/worlds.data";
import {
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
      distance: 1.1,
      study:
        "Contraluz. El aro, el eje y los cuatro radiadores se leen como estructura y no como superficie.",
    },
    {
      id: "operaciones",
      label: "Operaciones",
      /* Las toberas encendidas y las balizas son lo único emisivo de la nave
         (`endurance-operations.ts`), y sobre la cara noche es donde cuentan. */
      keyAngle: 128,
      study:
        "Contra la cara noche: las toberas encendidas y las balizas, que son lo único que la nave emite por sí misma y lo único que no depende de la luz.",
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
  /** Ángulo luz-mirada medido en el espécimen, 0-180°. */
  key: number;
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
 */
export function observationTelemetry(
  camera: Vec3,
  body: Vec3,
  radius: number,
): ObservationTelemetry {
  const view = sub(camera, body);
  const span = length(view);
  const toLight = length(body);

  /*
    Convención de `THREE.Spherical`: theta se mide desde +Z hacia +X. Se copia a
    propósito para que el número que se enseña sea el mismo que el que mueve el
    arrastre, y no dos azimuts distintos separados por noventa grados.
  */
  const azimuth = (Math.atan2(view[0], view[2]) * RAD + 360) % 360;
  const elevation = span > 0 ? Math.asin(view[1] / span) * RAD : 0;

  /*
    El ángulo de clave. `toLight` desde el espécimen es `-body` normalizado;
    `toCamera` es `view` normalizado. Con el espécimen en el origen no hay
    dirección de luz que medir, y ahí el número no existe: se devuelve 0 en vez
    de un NaN que llegaría hasta la pantalla.
  */
  const key =
    span > 0 && toLight > 0
      ? Math.acos(
          Math.min(
            1,
            Math.max(
              -1,
              (-body[0] * view[0] + -body[1] * view[1] + -body[2] * view[2]) /
                (toLight * span),
            ),
          ),
        ) * RAD
      : 0;

  return {
    azimuth,
    elevation,
    distance: radius > 0 ? span / radius : 0,
    key,
  };
}

/** El preset de un espécimen, para quien tiene un `WorldId` y no un id acotado. */
export function observationPreset(id: WorldId): ObservationPreset | null {
  return OBSERVATION_PRESETS[id as Exclude<WorldId, "gargantua">] ?? null;
}
