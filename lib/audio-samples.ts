import { openAudio } from "./audio-bus";

/**
 * Los sonidos GRABADOS del sitio, por oposición a los sintetizados.
 *
 * ── Por qué existe este módulo y no una receta más en `sfx.ts` ──────────────
 *
 * `sfx.ts` es «catorce recetas y un renderizador, sin un solo archivo», y esa
 * frase es su identidad: números que se pueden leer, versionar y probar sin
 * tarjeta de sonido. Un archivo no es eso —es opaco, pesa bytes y tiene
 * procedencia— así que vive aparte en vez de disfrazarse de receta.
 *
 * Los trajo el dueño después de rechazar dos veces el blip sintetizado del
 * mapa. Es su sitio y es su oído: la decisión de qué suena es suya, y el
 * principio de «cero bytes» nunca fue un fin, era la forma de no arrastrar una
 * licencia por un pitido. Un sonido que le gusta vale los veintisiete kilos.
 *
 * ── Lo que NO cambia ────────────────────────────────────────────────────────
 *
 * Sigue colgando del bus, así que lo apaga el control de AUDIO como todo lo
 * demás, pasa por el mismo maestro y el mismo limitador, y no suena antes del
 * primer gesto ni con la pestaña oculta.
 */

const SOURCES = {
  /** Apuntar un cuerpo del mapa. 0,84 s, pico 0,378, RMS 0,055. */
  hover: "/audio/hover.mp3",
} as const;

type SampleName = keyof typeof SOURCES;

/**
 * Peso dentro del bus. El del blip se calibra contra la paleta sintetizada:
 * el efecto que más veces se oye en una visita tiene que sonar por debajo de
 * los que el visitante DECIDE disparar.
 *
 * El dueño lo bajó otro 60 % después de oírlo: 0,15 → 0,06, que a la salida da
 * **pico 0,0072** al volumen de fábrica —medido en el contexto del bus, no en
 * el de la banda sonora, que es otro—. Eso es menos de la quinta parte de
 * cualquier otra receta de la paleta. Es UN número y es suyo.
 *
 * El primer disparo de una sesión mide 0,0036, la mitad, y no es un fallo: el
 * limitador arranca frío. Ver la nota del limitador en `audio-bus.ts`.
 */
const LEVEL: Readonly<Record<SampleName, number>> = { hover: 0.06 };

/** Cuánto dura, para que el bus sepa cuándo puede dormirse. */
const SPAN: Readonly<Record<SampleName, number>> = { hover: 0.9 };

/**
 * Separación mínima entre dos disparos, en ms. La misma regla que en `sfx.ts`:
 * cruzar el mapa con el ratón no puede ametrallar. Aquí es algo mayor que la
 * del blip sintetizado porque la grabación tiene más cola.
 */
const GAP: Readonly<Record<SampleName, number>> = { hover: 140 };

const buffers = new Map<SampleName, AudioBuffer>();
const loading = new Map<SampleName, Promise<AudioBuffer | null>>();
const lastPlayed = new Map<SampleName, number>();

function decode(name: SampleName, context: AudioContext): Promise<AudioBuffer | null> {
  const already = loading.get(name);
  if (already) return already;
  const job = fetch(SOURCES[name])
    .then((response) => response.arrayBuffer())
    .then((bytes) => context.decodeAudioData(bytes))
    .then((buffer) => {
      buffers.set(name, buffer);
      return buffer;
    })
    .catch(() => {
      // Sin el archivo el sitio sigue igual, sólo que ese gesto no suena. Se
      // borra el intento para que el siguiente lo pueda reintentar.
      loading.delete(name);
      return null;
    });
  loading.set(name, job);
  return job;
}

function start(context: AudioContext, out: GainNode, buffer: AudioBuffer) {
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(out);
  source.start(context.currentTime);
}

/**
 * Dispara un sonido grabado. No devuelve nada y nunca lanza: si el audio está
 * apagado, la pestaña oculta o el navegador todavía sin gesto, no suena.
 *
 * La primera vez llega unos milisegundos tarde —hay que descargar y
 * descodificar— y eso es aceptable en un sonido que acompaña al puntero: nadie
 * mide el retardo de algo que él mismo acaba de rozar. Lo que NO sería
 * aceptable es perderse ese primer disparo, así que se reprograma al terminar
 * la descodificación en vez de descartarse.
 */
export function playSample(name: SampleName): void {
  const now = Date.now();
  const previous = lastPlayed.get(name);
  if (previous !== undefined && now - previous < GAP[name]) return;
  lastPlayed.set(name, now);

  const session = openAudio(LEVEL[name], SPAN[name]);
  if (!session) return;
  const { context, out } = session;

  const ready = buffers.get(name);
  if (ready) {
    start(context, out, ready);
    return;
  }
  void decode(name, context).then((buffer) => {
    if (buffer) start(context, out, buffer);
  });
}
