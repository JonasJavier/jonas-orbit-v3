import { hit, openAudio } from "./audio-bus";

/**
 * La paleta de sonidos de interacción del sitio.
 *
 * ── Qué es y qué no es ──────────────────────────────────────────────────────
 *
 * Catorce recetas y UN renderizador. Cada receta es una lista de voces —unas
 * tonales, otras de ruido filtrado— con sus frecuencias y sus envolventes, y
 * nada más. No hay archivos, por lo mismo que la travesía no los tiene: cero
 * bytes de transferencia y ninguna licencia que justificar.
 *
 * El criterio es el de un instrumento, no el de una aplicación: **nada suena
 * como una notificación**. Los mandos tienen muescas, las superficies se
 * despliegan, el agua gotea y los motores arrancan. Lo que se oye es lo que el
 * objeto haría, no un aviso de que has pulsado algo.
 *
 * ── Los números viven aquí ──────────────────────────────────────────────────
 *
 * Igual que `voyage-audio.ts`: `SFX` es un objeto plano que `sfx.test.ts`
 * recorre para demostrar sin tarjeta de sonido que ninguna voz se pasa de la
 * unidad, que ninguna rampa exponencial arranca en cero y que ningún efecto de
 * interfaz dura más de lo que dura el gesto que lo dispara.
 *
 * ── La regla de la separación ───────────────────────────────────────────────
 *
 * Cada receta trae su `gap`: cuánto tiene que pasar como mínimo entre dos
 * disparos suyos. Sin eso, cruzar el mapa con el ratón dispara seis veces el
 * mismo blip en doscientos milisegundos y deja de ser un instrumento para ser
 * una ametralladora. Es el único estado que guarda este módulo.
 */

export type SfxName =
  | "proximity"
  | "detent"
  | "deploy"
  | "stow"
  | "sweep"
  | "open"
  | "close"
  | "drop"
  | "acquire"
  | "lock"
  | "mount"
  | "ignite"
  | "transmit"
  | "reject"
  | "confirm";

interface SfxTone {
  shape: OscillatorType;
  /** Hz al arrancar y al terminar la caída. Iguales = nota tenida. */
  from: number;
  to: number;
  attack: number;
  decay: number;
  gain: number;
  /** Retardo desde el disparo, en segundos. */
  delay?: number;
  /** Batido del par, en cents. Sin esto la voz es una sola. */
  detune?: number;
}

interface SfxNoise {
  filter: BiquadFilterType;
  from: number;
  to: number;
  q: number;
  attack: number;
  decay: number;
  gain: number;
  delay?: number;
}

interface Sfx {
  /** Separación mínima entre dos disparos del mismo efecto, en ms. */
  gap: number;
  /** Peso dentro del bus, antes del volumen del visitante. */
  level: number;
  tones: SfxTone[];
  noises: SfxNoise[];
}

export const SFX: Readonly<Record<SfxName, Sfx>> = {
  /*
    Sintonizar un canal en la Ranger. Nació como el blip de apuntar del mapa y
    ahí ya no está —el dueño lo rechazó dos veces y trajo una grabación, ver
    `audio-samples.ts`—, pero en la cabina sigue siendo lo que toca: un dial de
    radio buscando una frecuencia es exactamente un tono corto y afinado, y ahí
    quien pone la altura es el canal.

    Conserva lo que se aprendió al suavizarlo, que vale para cualquier efecto
    de la paleta: un oído registra como AVISO el ataque de pocos milisegundos
    (un clic), los armónicos impares en la banda de 2-4 kHz y un chasquido de
    aire encima. Seno, 16 ms de ataque y un rastro de ruido, nada más.
  */
  proximity: {
    gap: 110,
    level: 0.07,
    tones: [{ shape: "sine", from: 1046, to: 1100, attack: 0.016, decay: 0.24, gain: 0.5 }],
    noises: [{ filter: "highpass", from: 2600, to: 4200, q: 0.7, attack: 0.018, decay: 0.07, gain: 0.05 }],
  },

  /**
   * Una muesca de un mando. Seco, corto, mecánico: madera, no plástico.
   *
   * Sube a 0.36 tras medirlo: un mando que el visitante DECIDE pulsar no puede
   * sonar menos que un cuerpo por el que sólo pasa el ratón.
   */
  detent: {
    gap: 40,
    level: 0.36,
    tones: [{ shape: "square", from: 880, to: 660, attack: 0.002, decay: 0.045, gain: 0.22 }],
    noises: [{ filter: "bandpass", from: 2400, to: 1500, q: 2.4, attack: 0.001, decay: 0.06, gain: 0.4 }],
  },

  /** La consola se despliega: algo sube y se abre. */
  deploy: {
    gap: 120,
    level: 0.32,
    tones: [
      { shape: "sawtooth", from: 180, to: 420, attack: 0.01, decay: 0.34, gain: 0.2, detune: 9 },
      { shape: "triangle", from: 720, to: 1080, attack: 0.02, decay: 0.3, gain: 0.12, delay: 0.06 },
    ],
    noises: [{ filter: "lowpass", from: 400, to: 3200, q: 1, attack: 0.02, decay: 0.32, gain: 0.3 }],
  },

  /** Y se repliega: el mismo gesto del revés. */
  stow: {
    gap: 120,
    level: 0.3,
    tones: [{ shape: "sawtooth", from: 420, to: 170, attack: 0.008, decay: 0.26, gain: 0.18, detune: 9 }],
    noises: [{ filter: "lowpass", from: 3000, to: 420, q: 1, attack: 0.01, decay: 0.24, gain: 0.26 }],
  },

  /*
    El anillo de Edmunds gira. Dos bandas de ruido que se cruzan —una sube y la
    otra baja— porque una sola barrida en un sentido suena a cortina y no a una
    masa que pasa por delante.
  */
  sweep: {
    /*
      Calibrado contra el resto de la paleta, no a ojo: con `level` 0.24 y las
      Q originales medía 0,011 de pico, la MITAD que cualquier otra receta y
      un tercio del blip de proximidad. Girar el anillo es un gesto mucho
      mayor que apuntar algo, así que no puede sonar menos. Dos palancas: el
      peso, y abrir las campanas —una Q alta sobre ruido deja pasar muy poca
      energía, y aquí lo que se busca es aire, no un silbido afinado.
    */
    gap: 70,
    level: 0.46,
    tones: [],
    noises: [
      { filter: "bandpass", from: 700, to: 2600, q: 0.85, attack: 0.03, decay: 0.22, gain: 0.5 },
      { filter: "bandpass", from: 2600, to: 900, q: 1.1, attack: 0.06, decay: 0.2, gain: 0.25, delay: 0.05 },
    ],
  },

  /** El visor se abre sobre la obra. */
  open: {
    gap: 120,
    level: 0.3,
    tones: [{ shape: "sine", from: 220, to: 440, attack: 0.02, decay: 0.4, gain: 0.22 }],
    noises: [{ filter: "lowpass", from: 600, to: 4200, q: 0.8, attack: 0.02, decay: 0.36, gain: 0.26 }],
  },

  /** Y se cierra. */
  close: {
    gap: 120,
    level: 0.28,
    tones: [{ shape: "sine", from: 400, to: 180, attack: 0.01, decay: 0.28, gain: 0.2 }],
    noises: [{ filter: "lowpass", from: 3600, to: 500, q: 0.8, attack: 0.01, decay: 0.22, gain: 0.22 }],
  },

  /*
    Una gota. El tono SUBE, y ése es el detalle que la hace agua: al cerrarse la
    cavidad que deja la gota, su resonancia se acorta y la nota trepa. Una gota
    que baja de tono suena a videojuego.
  */
  drop: {
    gap: 260,
    level: 0.28,
    tones: [{ shape: "sine", from: 640, to: 1560, attack: 0.002, decay: 0.1, gain: 0.6 }],
    noises: [{ filter: "bandpass", from: 1800, to: 3000, q: 3, attack: 0.001, decay: 0.03, gain: 0.2 }],
  },

  /* ── El encendido del instrumento, en tres golpes ascendentes ─────────── */

  /** `ADQUIRIENDO`: el aparato mira. */
  acquire: {
    gap: 0,
    level: 0.3,
    tones: [{ shape: "square", from: 520, to: 520, attack: 0.004, decay: 0.09, gain: 0.3 }],
    noises: [{ filter: "bandpass", from: 1400, to: 1100, q: 3, attack: 0.002, decay: 0.07, gain: 0.3 }],
  },

  /** `BLOQUEO`: engancha, y lo confirma en quinta. */
  lock: {
    gap: 0,
    level: 0.32,
    tones: [
      { shape: "square", from: 700, to: 700, attack: 0.004, decay: 0.1, gain: 0.34 },
      { shape: "square", from: 1050, to: 1050, attack: 0.004, decay: 0.08, gain: 0.18, delay: 0.03 },
    ],
    noises: [{ filter: "bandpass", from: 1900, to: 1500, q: 3, attack: 0.002, decay: 0.08, gain: 0.26 }],
  },

  /** `MONTANDO`: la máquina se pone en marcha de verdad. */
  mount: {
    gap: 0,
    level: 0.34,
    tones: [
      { shape: "sawtooth", from: 160, to: 320, attack: 0.02, decay: 0.5, gain: 0.26, detune: 12 },
      { shape: "triangle", from: 960, to: 1440, attack: 0.03, decay: 0.45, gain: 0.14, delay: 0.04 },
    ],
    noises: [{ filter: "lowpass", from: 300, to: 3600, q: 1.1, attack: 0.03, decay: 0.5, gain: 0.3 }],
  },

  /** Los motores de la Ranger. Lo único de la paleta que pasa del segundo. */
  ignite: {
    gap: 300,
    level: 0.4,
    tones: [
      { shape: "sawtooth", from: 38, to: 96, attack: 0.08, decay: 1.2, gain: 0.5, detune: 14 },
      { shape: "sine", from: 70, to: 150, attack: 0.1, decay: 1, gain: 0.3 },
    ],
    noises: [{ filter: "lowpass", from: 180, to: 1800, q: 1.2, attack: 0.12, decay: 1.3, gain: 0.45 }],
  },

  /** El mensaje sale: dos pulsos que suben y aire que se va hacia arriba. */
  transmit: {
    gap: 300,
    level: 0.32,
    tones: [
      { shape: "sine", from: 880, to: 880, attack: 0.005, decay: 0.1, gain: 0.34 },
      { shape: "sine", from: 1320, to: 1320, attack: 0.005, decay: 0.14, gain: 0.3, delay: 0.1 },
    ],
    noises: [{ filter: "highpass", from: 1200, to: 6000, q: 0.8, attack: 0.02, decay: 0.5, gain: 0.18 }],
  },

  /*
    Algo no salió. Dos notas que BAJAN, graves y sin filo: un error es una
    información, no un castigo. Nada de disonancia ni de pitido agudo.
  */
  reject: {
    gap: 300,
    level: 0.28,
    tones: [
      { shape: "triangle", from: 330, to: 330, attack: 0.005, decay: 0.1, gain: 0.3 },
      { shape: "triangle", from: 247, to: 247, attack: 0.006, decay: 0.2, gain: 0.3, delay: 0.09 },
    ],
    noises: [],
  },

  /** El audio se enciende. Es la única receta que se oye a sí misma. */
  confirm: {
    gap: 400,
    level: 0.3,
    tones: [
      { shape: "sine", from: 660, to: 660, attack: 0.006, decay: 0.12, gain: 0.3 },
      { shape: "sine", from: 990, to: 990, attack: 0.006, decay: 0.22, gain: 0.26, delay: 0.08 },
    ],
    noises: [],
  },
};

/** Cuánto dura una receta, de su disparo a su último cero. */
export function sfxDuration(name: SfxName): number {
  const spec = SFX[name];
  let longest = 0;
  for (const tone of spec.tones) {
    longest = Math.max(longest, (tone.delay ?? 0) + tone.attack + tone.decay * 1.15);
  }
  for (const noise of spec.noises) {
    longest = Math.max(longest, (noise.delay ?? 0) + noise.attack + noise.decay * 1.15);
  }
  return longest;
}

/** El único estado del módulo: cuándo sonó cada receta por última vez. */
const lastPlayed = new Map<SfxName, number>();

export interface SfxOptions {
  /** Multiplica TODAS las frecuencias, tonos y filtros: sube la receta entera. */
  pitch?: number;
  /** Escala el peso de la receta, para un mismo efecto más o menos presente. */
  level?: number;
}

/**
 * Dispara una receta. No devuelve nada y nunca lanza: si el audio está
 * apagado, la pestaña oculta, el navegador todavía sin gesto o el equipo sin
 * Web Audio, simplemente no suena y la interfaz sigue igual.
 */
export function playSfx(name: SfxName, options: SfxOptions = {}): void {
  const spec = SFX[name];
  const pitch = options.pitch ?? 1;

  if (spec.gap > 0) {
    // `Date.now()` y no `performance.now()`: aquí sólo se compara consigo
    // mismo y no hay ningún gesto que medir.
    const now = Date.now();
    const previous = lastPlayed.get(name);
    if (previous !== undefined && now - previous < spec.gap) return;
    lastPlayed.set(name, now);
  }

  const session = openAudio(spec.level * (options.level ?? 1), sfxDuration(name));
  if (!session) return;
  const { context, now, out } = session;

  for (const tone of spec.tones) {
    const at = now + (tone.delay ?? 0);
    const gain = context.createGain();
    hit(gain.gain, tone.gain, at, tone.attack, tone.decay);
    gain.connect(out);
    // Un par desafinado en vez de una voz sola: el batido es lo que separa un
    // mando mecánico de un tono de teléfono.
    const sides = tone.detune ? [-1, 1] : [0];
    for (const side of sides) {
      const osc = context.createOscillator();
      osc.type = tone.shape;
      osc.detune.value = ((tone.detune ?? 0) / 2) * side;
      osc.frequency.setValueAtTime(tone.from * pitch, at);
      if (tone.to !== tone.from) {
        osc.frequency.exponentialRampToValueAtTime(
          tone.to * pitch,
          at + tone.attack + tone.decay,
        );
      }
      osc.connect(gain);
      osc.start(at);
      osc.stop(at + tone.attack + tone.decay * 1.15 + 0.02);
    }
  }

  for (const layer of spec.noises) {
    const at = now + (layer.delay ?? 0);
    const source = session.noise();
    const filter = context.createBiquadFilter();
    filter.type = layer.filter;
    filter.Q.value = layer.q;
    filter.frequency.setValueAtTime(layer.from * pitch, at);
    if (layer.to !== layer.from) {
      filter.frequency.exponentialRampToValueAtTime(
        layer.to * pitch,
        at + layer.attack + layer.decay,
      );
    }
    const gain = context.createGain();
    hit(gain.gain, layer.gain, at, layer.attack, layer.decay);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    source.start(at);
    source.stop(at + layer.attack + layer.decay * 1.15 + 0.02);
  }
}
