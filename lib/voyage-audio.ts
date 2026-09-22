import type { WorldId } from "@/content/worlds.data";
import {
  CUT,
  cut,
  hit,
  openAudio,
  swell,
  type AudioSession,
} from "./audio-bus";
import {
  voyageFlavourFor,
  voyageTimeline,
  type VoyageFlavour,
  type VoyageMode,
} from "./voyage";

/**
 * El sonido de la travesía: lo que se oye al caer hacia un destino.
 *
 * ── Por qué se SINTETIZA y no es un archivo ─────────────────────────────────
 *
 * Por tres razones, y la tercera es la que manda:
 *
 * 1. **No hay licencia que justificar.** La banda sonora ya arrastra esa deuda
 *    (`docs/design/soundtrack.md`: «la aportación del archivo no acredita una
 *    licencia de publicación»). Un segundo archivo de origen ajeno la duplica.
 * 2. **No pesa nada.** Cero bytes de transferencia, contra los 7,44 MiB de la
 *    música. El presupuesto del §7 del plan no se toca.
 * 3. **Hay SEIS destinos, no uno.** `VOYAGE_FLAVOURS` ya le da a cada mundo
 *    cuatro números —lente, líquido, retícula, negro— que el shader usa para
 *    que Gargantúa se doble distinto a Miller. Un archivo grabado obliga a
 *    seis archivos o a un solo sonido para todos; una síntesis lee los mismos
 *    cuatro números y suena distinta por la misma razón por la que se ve
 *    distinta. **El sonido no acompaña al efecto: sale de sus mismos números.**
 *
 * ── Por qué los números viven aquí ──────────────────────────────────────────
 *
 * Por lo mismo que `voyage.ts`: para poder demostrarlos con un test unitario.
 * `voyageSoundFor()` es una función pura que devuelve la partitura completa
 * —instantes, frecuencias, envolventes— y el reproductor de abajo se limita a
 * renderizarla. Así se puede comprobar sin tarjeta de sonido que el golpe cae
 * en el pico de la distorsión, que ningún nivel se pasa de uno y que los seis
 * mundos suenan diferente.
 *
 * ── Quién lo apaga, y quién pone el contexto ───────────────────────────────
 *
 * `audio-bus.ts`, que es de donde cuelga esto y todo lo demás que suena: un
 * solo `AudioContext`, un solo maestro, un solo limitador y un solo sitio
 * donde se mira si el visitante silenció. Aquí sólo se construyen las voces.
 * El interruptor de MOVIMIENTO no entra: el sonido no se mueve, y quien viaja
 * en modo reducido oye la versión corta.
 */

/** Un golpe corto del pestillo de bloqueo. */
interface VoyageBlip {
  /** Segundos desde la activación. */
  at: number;
  frequency: number;
  /** Caída exponencial hasta el silencio. */
  decay: number;
  gain: number;
}

/** La partitura completa de una travesía. Todo en segundos, hercios y 0..1. */
export interface VoyageSound {
  /** Cuánto dura el sonido entero desde la activación. */
  duration: number;
  /** El pestillo: el instrumento engancha el objetivo. */
  latch: VoyageBlip[];
  /** La caída: el sub sube de tono y el aire se abre. */
  fall: {
    start: number;
    end: number;
    subFrom: number;
    subTo: number;
    subGain: number;
    airFrom: number;
    airTo: number;
    airGain: number;
  };
  /**
   * La distorsión del espacio-tiempo. Es la capa con carácter: aquí es donde
   * los cuatro sabores se oyen.
   *
   * `start === end` significa que este viaje no tiene distorsión (modo
   * reducido): el reproductor se salta la capa entera.
   */
  warp: {
    start: number;
    end: number;
    /** Barrido resonante sobre ruido: el espacio raspando. */
    sweepFrom: number;
    sweepTo: number;
    sweepQ: number;
    sweepGain: number;
    /** El par de osciladores que lleva la melodía del viaje. */
    toneFrom: number;
    toneTo: number;
    toneGain: number;
    /** Separación del par, en cents. */
    detune: number;
    /** Vibrato del sabor líquido: Hz y profundidad en cents. */
    wobbleRate: number;
    wobbleDepth: number;
    shape: OscillatorType;
    /** Cuánto cierra el filtro maestro al final, 0..1 (sabor negro). */
    close: number;
  };
  /** El cruce: el golpe que cubre el cambio de página, y su cola. */
  cross: {
    at: number;
    impactGain: number;
    impactDecay: number;
    thumpFrom: number;
    thumpTo: number;
    thumpGain: number;
    thumpDecay: number;
    tailFrequency: number;
    tailGain: number;
    tailDecay: number;
  };
}

/** Tono de partida del par, un sol grave. Todo lo demás se mide contra él. */
const TONE_ROOT = 196;

function blips(lock: number, flavour: VoyageFlavour, full: boolean): VoyageBlip[] {
  // El primero avisa; el segundo confirma. En modo reducido no hay tiempo
  // material para dos: el pestillo entero dura 120 ms.
  const first: VoyageBlip = { at: 0, frequency: 1320, decay: 0.085, gain: 0.5 };
  if (!full) return [{ ...first, gain: 0.34 }];
  return [
    first,
    {
      at: lock * 0.42,
      // La retícula confirma en octava —intervalo exacto, sin color— y el
      // resto en quinta. Es la misma decisión que cuantizar las estelas a 90°.
      frequency: 1320 * (flavour.grid > 0.5 ? 2 : 1.5),
      decay: 0.11,
      gain: 0.42,
    },
  ];
}

/**
 * La partitura de un destino.
 *
 * Los cuatro sabores se reparten así, y cada uno se oye por donde se ve:
 *
 * - **lente** → el tono CAE en vez de subir (Gargantúa se desploma una octava
 *   y media) y el golpe del cruce pega más fuerte y más largo. Es gravedad.
 * - **líquido** → resonancia alta y vibrato: el barrido suena a agua en vez de
 *   a aire. Miller es el único que lo lleva entero.
 * - **retícula** → onda cuadrada y par casi sin batido: el Tesseracto suena
 *   geométrico, sin color analógico.
 * - **negro** → el filtro maestro se cierra al final. Gargantúa se apaga; nadie
 *   más lo hace del todo.
 */
export function voyageSoundFor(id: WorldId, mode: VoyageMode): VoyageSound {
  const timeline = voyageTimeline(mode);
  const flavour = voyageFlavourFor(id);
  const full = mode === "full";
  const { lens, liquid, grid, dark } = flavour;

  // El cruce se oye donde se ENCIENDE la luz, no donde cambia la ruta: el
  // golpe tiene que llegar con el fogonazo, que es lo que el ojo ve.
  const crossAt = Math.max(0, timeline.push - timeline.flashLead);
  // En modo reducido el viaje es medio segundo de cortesía, no un despegue:
  // el golpe se sirve más bajo a propósito.
  const crossLevel = full ? 1 : 0.7;

  const impactDecay = full ? 0.42 : 0.26;
  // La cola del sub es lo que da peso al golpe, y con lente pesa más. En modo
  // reducido se recorta: un viaje de medio segundo no puede dejar un segundo
  // de resonancia detrás.
  const thumpDecay = full ? 0.5 + 0.35 * lens : 0.3 + 0.12 * lens;
  const tailDecay = full ? 0.9 : 0.34;
  const toneTo = TONE_ROOT * Math.pow(2, 1.45 - 2.6 * lens);

  return {
    duration: crossAt + Math.max(impactDecay, thumpDecay, tailDecay) + 0.12,
    latch: blips(timeline.lock, flavour, full),
    fall: {
      start: timeline.lock,
      end: timeline.approach,
      subFrom: 32,
      subTo: 52 + 30 * lens,
      subGain: full ? 0.55 : 0.3,
      airFrom: 220,
      airTo: 2600,
      airGain: full ? 0.38 : 0.26,
    },
    warp: {
      // Sin escena viva no hay distorsión que sonorizar: `warpStart` y `push`
      // coinciden en la línea reducida y el reproductor salta la capa.
      start: timeline.warpStart,
      end: timeline.push,
      sweepFrom: 320,
      sweepTo: 3400 * (1 - 0.7 * dark),
      sweepQ: 3.5 + 9.5 * liquid,
      sweepGain: 0.42,
      toneFrom: TONE_ROOT,
      toneTo,
      toneGain: 0.34,
      detune: grid > 0.5 ? 3 : 8 + 24 * liquid,
      wobbleRate: 4.8 + 2.4 * liquid,
      wobbleDepth: 60 * liquid,
      shape: grid > 0.5 ? "square" : "sawtooth",
      close: dark,
    },
    cross: {
      at: crossAt,
      impactGain: 0.62 * crossLevel,
      impactDecay,
      thumpFrom: 96 + 40 * lens,
      thumpTo: 30,
      thumpGain: (0.5 + 0.42 * lens) * crossLevel,
      thumpDecay,
      // La cola hereda el tono de llegada: el mundo al que se entra deja su
      // altura en el aire mientras la página emerge.
      tailFrequency: toneTo * 3.2,
      tailGain: 0.26 * crossLevel,
      tailDecay,
    },
  };
}

/* ═════════════════════════════════════════════════════════════════════════
   El reproductor

   Un módulo con estado, como el controlador: un viaje a la vez en toda la
   pestaña. Sin React, sin biblioteca, sin RAF — todo se programa en el reloj
   del `AudioContext`, que es el único que no se salta un fotograma cuando la
   GPU se atasca.

   El contexto, el maestro, el limitador y el búfer de ruido NO viven aquí:
   son del bus (`audio-bus.ts`), que es el que sabe si el visitante silenció.
   ═════════════════════════════════════════════════════════════════════════ */

type Source = AudioScheduledSourceNode;

class VoyageAudio {
  private session: AudioSession | null = null;
  private close: BiquadFilterNode | null = null;
  private sources: Source[] = [];
  /** Envolventes de la caída y la distorsión: hay que poder cortarlas. */
  private departing: GainNode[] = [];
  private sound: VoyageSound | null = null;
  private crossed = false;

  /**
   * Arranca el sonido del despegue: pestillo, caída y distorsión. El cruce NO
   * se programa aquí —lo dispara `cross()`— porque el visitante puede cortar
   * la travesía en cualquier momento y el golpe tiene que sonar cuando de
   * verdad se cruza, no cuando estaba previsto.
   */
  depart(id: WorldId, mode: VoyageMode) {
    this.stop();
    const sound = voyageSoundFor(id, mode);
    const session = openAudio(1, sound.duration);
    if (!session) return;

    this.session = session;
    this.sound = sound;
    this.crossed = false;

    const { context, out } = session;
    const t0 = session.now + 0.01;

    const close = context.createBiquadFilter();
    close.type = "lowpass";
    close.frequency.setValueAtTime(20000, t0);
    close.Q.value = 0.7;
    close.connect(out);
    this.close = close;

    // ── El pestillo ───────────────────────────────────────────────────────
    for (const blip of sound.latch) {
      const at = t0 + blip.at;
      const osc = context.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(blip.frequency, at);
      const band = context.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = blip.frequency;
      band.Q.value = 3.2;
      const gain = context.createGain();
      hit(gain.gain, blip.gain, at, 0.006, blip.decay);
      osc.connect(band);
      band.connect(gain);
      gain.connect(close);
      this.keep(osc, at, at + blip.decay + 0.02);
    }

    // ── La caída ──────────────────────────────────────────────────────────
    const { fall } = sound;
    const fallStart = t0 + fall.start;
    const fallEnd = t0 + fall.end;

    const sub = context.createOscillator();
    sub.type = "sine";
    sub.frequency.setValueAtTime(fall.subFrom, fallStart);
    sub.frequency.exponentialRampToValueAtTime(fall.subTo, fallEnd);
    const subGain = context.createGain();
    swell(subGain.gain, fall.subGain, fallStart, fallEnd);
    sub.connect(subGain);
    subGain.connect(close);
    this.departing.push(subGain);
    this.keep(sub, fallStart, t0 + sound.duration);

    const air = session.noise();
    const airFilter = context.createBiquadFilter();
    airFilter.type = "lowpass";
    airFilter.Q.value = 1.1;
    airFilter.frequency.setValueAtTime(fall.airFrom, fallStart);
    airFilter.frequency.exponentialRampToValueAtTime(fall.airTo, fallEnd);
    const airGain = context.createGain();
    swell(airGain.gain, fall.airGain, fallStart, fallEnd);
    air.connect(airFilter);
    airFilter.connect(airGain);
    airGain.connect(close);
    this.departing.push(airGain);
    this.keep(air, fallStart, t0 + sound.duration);

    // ── La distorsión ─────────────────────────────────────────────────────
    const { warp } = sound;
    if (warp.end > warp.start) {
      const warpStart = t0 + warp.start;
      const warpEnd = t0 + warp.end;

      // El filtro se cierra sólo si el destino tiene sabor negro.
      if (warp.close > 0) {
        close.frequency.setValueAtTime(20000, warpStart);
        close.frequency.exponentialRampToValueAtTime(
          20000 * Math.pow(0.055, warp.close),
          warpEnd,
        );
      }

      const sweep = session.noise();
      const band = context.createBiquadFilter();
      band.type = "bandpass";
      band.Q.value = warp.sweepQ;
      band.frequency.setValueAtTime(warp.sweepFrom, warpStart);
      band.frequency.exponentialRampToValueAtTime(warp.sweepTo, warpEnd);
      const sweepGain = context.createGain();
      swell(sweepGain.gain, warp.sweepGain, warpStart, warpEnd);
      sweep.connect(band);
      band.connect(sweepGain);
      sweepGain.connect(close);
      this.departing.push(sweepGain);
      this.keep(sweep, warpStart, t0 + sound.duration);

      const toneGain = context.createGain();
      swell(toneGain.gain, warp.toneGain, warpStart, warpEnd);
      toneGain.connect(close);
      this.departing.push(toneGain);

      // Vibrato compartido: un solo LFO para las dos voces del par, porque si
      // cada una lleva el suyo el batido deja de ser agua y se vuelve coro.
      let wobble: GainNode | null = null;
      if (warp.wobbleDepth > 0) {
        const lfo = context.createOscillator();
        lfo.type = "sine";
        lfo.frequency.value = warp.wobbleRate;
        const depth = context.createGain();
        depth.gain.setValueAtTime(0, warpStart);
        depth.gain.linearRampToValueAtTime(warp.wobbleDepth, warpEnd);
        lfo.connect(depth);
        wobble = depth;
        this.keep(lfo, warpStart, t0 + sound.duration);
      }

      for (const side of [-1, 1]) {
        const osc = context.createOscillator();
        osc.type = warp.shape;
        osc.detune.value = (warp.detune / 2) * side;
        osc.frequency.setValueAtTime(warp.toneFrom, warpStart);
        osc.frequency.exponentialRampToValueAtTime(warp.toneTo, warpEnd);
        wobble?.connect(osc.detune);
        osc.connect(toneGain);
        this.keep(osc, warpStart, t0 + sound.duration);
      }
    }
  }

  private keep<T extends Source>(source: T, start: number, stop: number): T {
    source.start(start);
    source.stop(stop);
    this.sources.push(source);
    return source;
  }

  /**
   * El cruce. Lo llama el controlador cuando enciende la luz y también cuando
   * el visitante salta la travesía: en el segundo caso todo lo anterior se
   * corta en 90 ms y el golpe suena igual. Es idempotente por viaje.
   */
  cross() {
    const session = this.session;
    const sound = this.sound;
    if (!session || !sound || this.crossed) return;
    this.crossed = true;

    const { context } = session;
    const target = this.close ?? session.out;
    const now = context.currentTime;
    const { cross } = sound;

    // Lo que venía sonando se retira: el golpe necesita sitio.
    for (const gain of this.departing) cut(gain.gain, now);
    this.close?.frequency.cancelScheduledValues(now);

    const impact = session.noise();
    const shape = context.createBiquadFilter();
    shape.type = "highpass";
    shape.frequency.setValueAtTime(140, now);
    shape.frequency.exponentialRampToValueAtTime(1800, now + cross.impactDecay);
    const impactGain = context.createGain();
    hit(impactGain.gain, cross.impactGain, now, 0.008, cross.impactDecay);
    impact.connect(shape);
    shape.connect(impactGain);
    impactGain.connect(target);
    this.keep(impact, now, now + cross.impactDecay + 0.02);

    const thump = context.createOscillator();
    thump.type = "sine";
    thump.frequency.setValueAtTime(cross.thumpFrom, now);
    thump.frequency.exponentialRampToValueAtTime(cross.thumpTo, now + cross.thumpDecay);
    const thumpGain = context.createGain();
    hit(thumpGain.gain, cross.thumpGain, now, 0.012, cross.thumpDecay);
    thump.connect(thumpGain);
    thumpGain.connect(target);
    this.keep(thump, now, now + cross.thumpDecay + 0.02);

    // La cola: el aire del otro lado, mientras la página nueva emerge.
    const tail = session.noise();
    const tailBand = context.createBiquadFilter();
    tailBand.type = "bandpass";
    tailBand.Q.value = 1.6;
    tailBand.frequency.setValueAtTime(cross.tailFrequency, now);
    tailBand.frequency.exponentialRampToValueAtTime(
      cross.tailFrequency * 0.45,
      now + cross.tailDecay,
    );
    const tailGain = context.createGain();
    hit(tailGain.gain, cross.tailGain, now, 0.05, cross.tailDecay);
    tail.connect(tailBand);
    tailBand.connect(tailGain);
    tailGain.connect(target);
    this.keep(tail, now, now + cross.tailDecay + 0.02);
  }

  /** Corta el viaje en curso. Lo usan el desmontaje de la capa y los tests. */
  stop() {
    const session = this.session;
    if (!session) {
      this.release();
      return;
    }
    const now = session.context.currentTime;
    cut(session.out.gain, now);
    for (const source of this.sources) {
      try {
        source.stop(now + CUT + 0.01);
      } catch {
        /* Una fuente que ya terminó no se puede reprogramar; no importa. */
      }
    }
    this.release();
  }

  /** Suelta las referencias; los nodos ya programados se apagan solos. */
  private release() {
    this.sources = [];
    this.departing = [];
    this.session = null;
    this.close = null;
    this.sound = null;
    this.crossed = false;
  }
}

export const voyageAudio = new VoyageAudio();
