import type { WorldId } from "@/content/worlds.data";
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
 * ── Quién lo apaga ──────────────────────────────────────────────────────────
 *
 * El control de AUDIO de la bandeja, el mismo que la música. Es el principio
 * del interruptor único de movimiento aplicado al oído: **un solo mando para
 * todo lo que suena**. Si el visitante pausó o silenció, aquí no se oye nada.
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
   pestaña. Sin React, sin biblioteca, sin RAF — todo se programa de una vez
   en el reloj del `AudioContext`, que es el único reloj que no se salta un
   fotograma cuando la GPU se atasca.
   ═════════════════════════════════════════════════════════════════════════ */

/** Lo que el control de AUDIO de la bandeja dice sobre el sonido del sitio. */
interface VoyageAudioPreference {
  enabled: boolean;
  volume: number;
}

/** Cuánto dura el corte cuando el visitante salta la travesía o se cancela. */
const CUT = 0.09;

/*
  ── Las envolventes, y por qué no son exponenciales ────────────────────────

  La primera versión hinchaba y apagaba cada capa con
  `exponentialRampToValueAtTime` desde y hasta un épsilon, que es el idiom que
  se ve por todas partes. Medido en el navegador con un `ScriptProcessor` en el
  hilo de audio, la caída entera —de 0,4 s a 1,05 s, justo el tramo en el que
  la cámara se desploma— daba un RMS de 0,0009: SILENCIO. La razón es
  aritmética y conviene no volver a tropezar con ella: una exponencial de
  0,0001 a 0,55 multiplica por 5 500, así que a mitad de recorrido lleva sólo
  la raíz de eso —el 1,3 % del objetivo— y **todo el rango audible se apila en
  el último quinto del tiempo**. Lo mismo apagaba la cola del cruce a los
  250 ms de nacer.

  Así que: el hinchado va LINEAL en amplitud (dos tramos, que es lo que imita
  la potencia 2,6 de la aceleración sin desaparecer por el camino), y la caída
  va exponencial pero hasta −34 dB del pico, no hasta cero, con un corte lineal
  final. Una exponencial que termina en un valor real es una caída natural; una
  que persigue el cero se pasa la vida en él.
*/

/** Hinchado: dos tramos lineales que imitan la aceleración sin enmudecer. */
function swell(param: AudioParam, peak: number, from: number, until: number) {
  const span = Math.max(until - from, 0.001);
  param.setValueAtTime(0, from);
  param.linearRampToValueAtTime(peak * 0.22, from + span * 0.55);
  param.linearRampToValueAtTime(peak, until);
}

/** Golpe: ataque lineal, caída exponencial a −34 dB y corte limpio al cero. */
function hit(
  param: AudioParam,
  peak: number,
  at: number,
  attack: number,
  decay: number,
) {
  param.setValueAtTime(0, at);
  param.linearRampToValueAtTime(peak, at + attack);
  param.exponentialRampToValueAtTime(peak * 0.02, at + attack + decay);
  param.linearRampToValueAtTime(0, at + attack + decay * 1.15);
}

/** Retirada inmediata de una capa, sin el baile del épsilon. */
function cut(param: AudioParam, at: number) {
  param.cancelScheduledValues(at);
  param.setValueAtTime(param.value, at);
  param.linearRampToValueAtTime(0, at + CUT);
}

type Source = AudioScheduledSourceNode;

class VoyageAudio {
  private context: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  private master: GainNode | null = null;
  private close: BiquadFilterNode | null = null;
  private sources: Source[] = [];
  /** Envolventes de la caída y la distorsión: hay que poder cortarlas. */
  private departing: GainNode[] = [];
  private sound: VoyageSound | null = null;
  private crossed = false;
  private idleTimer: ReturnType<typeof setTimeout> | undefined;
  private preference: VoyageAudioPreference = { enabled: true, volume: 0.28 };

  /** El control de la bandeja publica aquí; un solo mando para todo lo que suena. */
  configure(preference: VoyageAudioPreference) {
    this.preference = preference;
    if (!preference.enabled || preference.volume <= 0) this.stop();
  }

  private audible(): boolean {
    return (
      this.preference.enabled &&
      this.preference.volume > 0 &&
      typeof AudioContext !== "undefined" &&
      // Un golpe en una pestaña que el visitante ya no mira es ruido.
      !(typeof document !== "undefined" && document.hidden)
    );
  }

  private ensure(): AudioContext | null {
    if (this.context) return this.context;
    try {
      const context = new AudioContext();
      this.context = context;
      const frames = Math.ceil(context.sampleRate * 3);
      const buffer = context.createBuffer(1, frames, context.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < frames; i++) channel[i] = Math.random() * 2 - 1;
      this.noise = buffer;
      return context;
    } catch {
      // Sin Web Audio el viaje sigue existiendo; simplemente no se oye.
      this.context = null;
      return null;
    }
  }

  private noiseSource(context: AudioContext): AudioBufferSourceNode {
    const source = context.createBufferSource();
    source.buffer = this.noise;
    source.loop = true;
    // Cada travesía entra por un punto distinto del ruido: dos viajes seguidos
    // al mismo mundo no son el mismo archivo sonando otra vez.
    source.playbackRate.value = 0.92 + Math.random() * 0.16;
    return source;
  }

  private keep<T extends Source>(source: T, start: number, stop: number): T {
    source.start(start);
    source.stop(stop);
    this.sources.push(source);
    return source;
  }

  /**
   * Arranca el sonido del despegue: pestillo, caída y distorsión. El cruce NO
   * se programa aquí —lo dispara `cross()`— porque el visitante puede cortar
   * la travesía en cualquier momento y el golpe tiene que sonar cuando de
   * verdad se cruza, no cuando estaba previsto.
   */
  depart(id: WorldId, mode: VoyageMode) {
    this.stop();
    if (!this.audible()) return;
    const context = this.ensure();
    if (!context) return;
    void context.resume().catch(() => {});
    clearTimeout(this.idleTimer);

    const sound = voyageSoundFor(id, mode);
    this.sound = sound;
    this.crossed = false;

    const t0 = context.currentTime + 0.01;
    const close = context.createBiquadFilter();
    close.type = "lowpass";
    close.frequency.setValueAtTime(20000, t0);
    close.Q.value = 0.7;
    const master = context.createGain();
    master.gain.value = this.preference.volume;
    master.connect(close);

    /*
      Un limitador al final, y no por gusto: en el cruce suenan a la vez el
      golpe (0,62), el sub (hasta 0,92) y la cola (0,26). A volumen 28 % eso
      mide 0,295 de pico y no pasa nada, pero el visitante puede subir el
      mando al 100 % y entonces la suma teórica se va por encima de 1 — o sea
      recorte, que en un golpe grave suena a chasquido roto y no a impacto.
      Con umbral en −4 dB y ataque de 3 ms el limitador sólo toca ese pico.
    */
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -4;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    close.connect(limiter);
    limiter.connect(context.destination);
    this.master = master;
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
      gain.connect(master);
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
    subGain.connect(master);
    this.departing.push(subGain);
    this.keep(sub, fallStart, t0 + sound.duration);

    const air = this.noiseSource(context);
    const airFilter = context.createBiquadFilter();
    airFilter.type = "lowpass";
    airFilter.Q.value = 1.1;
    airFilter.frequency.setValueAtTime(fall.airFrom, fallStart);
    airFilter.frequency.exponentialRampToValueAtTime(fall.airTo, fallEnd);
    const airGain = context.createGain();
    swell(airGain.gain, fall.airGain, fallStart, fallEnd);
    air.connect(airFilter);
    airFilter.connect(airGain);
    airGain.connect(master);
    this.departing.push(airGain);
    this.keep(air, fallStart, t0 + sound.duration);

    // ── La distorsión ─────────────────────────────────────────────────────
    const { warp } = sound;
    if (warp.end > warp.start) {
      const warpStart = t0 + warp.start;
      const warpEnd = t0 + warp.end;

      // El filtro maestro se cierra sólo si el destino tiene sabor negro.
      if (warp.close > 0) {
        close.frequency.setValueAtTime(20000, warpStart);
        close.frequency.exponentialRampToValueAtTime(
          20000 * Math.pow(0.055, warp.close),
          warpEnd,
        );
      }

      const sweep = this.noiseSource(context);
      const band = context.createBiquadFilter();
      band.type = "bandpass";
      band.Q.value = warp.sweepQ;
      band.frequency.setValueAtTime(warp.sweepFrom, warpStart);
      band.frequency.exponentialRampToValueAtTime(warp.sweepTo, warpEnd);
      const sweepGain = context.createGain();
      swell(sweepGain.gain, warp.sweepGain, warpStart, warpEnd);
      sweep.connect(band);
      band.connect(sweepGain);
      sweepGain.connect(master);
      this.departing.push(sweepGain);
      this.keep(sweep, warpStart, t0 + sound.duration);

      const toneGain = context.createGain();
      swell(toneGain.gain, warp.toneGain, warpStart, warpEnd);
      toneGain.connect(master);
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

  /**
   * El cruce. Lo llama el controlador cuando enciende la luz y también cuando
   * el visitante salta la travesía: en el segundo caso todo lo anterior se
   * corta en 90 ms y el golpe suena igual. Es idempotente por viaje.
   */
  cross() {
    const context = this.context;
    const master = this.master;
    const sound = this.sound;
    if (!context || !master || !sound || this.crossed) return;
    this.crossed = true;

    const now = context.currentTime;
    const { cross } = sound;

    // Lo que venía sonando se retira: el golpe necesita sitio.
    for (const gain of this.departing) cut(gain.gain, now);
    this.close?.frequency.cancelScheduledValues(now);

    const impact = this.noiseSource(context);
    const shape = context.createBiquadFilter();
    shape.type = "highpass";
    shape.frequency.setValueAtTime(140, now);
    shape.frequency.exponentialRampToValueAtTime(1800, now + cross.impactDecay);
    const impactGain = context.createGain();
    hit(impactGain.gain, cross.impactGain, now, 0.008, cross.impactDecay);
    impact.connect(shape);
    shape.connect(impactGain);
    impactGain.connect(master);
    this.keep(impact, now, now + cross.impactDecay + 0.02);

    const thump = context.createOscillator();
    thump.type = "sine";
    thump.frequency.setValueAtTime(cross.thumpFrom, now);
    thump.frequency.exponentialRampToValueAtTime(cross.thumpTo, now + cross.thumpDecay);
    const thumpGain = context.createGain();
    hit(thumpGain.gain, cross.thumpGain, now, 0.012, cross.thumpDecay);
    thump.connect(thumpGain);
    thumpGain.connect(master);
    this.keep(thump, now, now + cross.thumpDecay + 0.02);

    // La cola: el aire del otro lado, mientras la página nueva emerge.
    const tail = this.noiseSource(context);
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
    tailGain.connect(master);
    this.keep(tail, now, now + cross.tailDecay + 0.02);

    this.sleepIn(cross.tailDecay + Math.max(cross.impactDecay, cross.thumpDecay) + 0.4);
  }

  /** Corta el viaje en curso. Lo usan el desmontaje de la capa y los tests. */
  stop() {
    clearTimeout(this.idleTimer);
    this.idleTimer = undefined;
    const context = this.context;
    if (!context) {
      this.release();
      return;
    }
    const now = context.currentTime;
    if (this.master) cut(this.master.gain, now);
    for (const source of this.sources) {
      try {
        source.stop(now + CUT + 0.01);
      } catch {
        /* Una fuente que ya terminó no se puede reprogramar; no importa. */
      }
    }
    this.release();
    this.sleepIn(CUT + 0.3);
  }

  /** Suelta las referencias del viaje; los nodos ya programados se apagan solos. */
  private release() {
    this.sources = [];
    this.departing = [];
    this.master = null;
    this.close = null;
    this.sound = null;
    this.crossed = false;
  }

  /**
   * El contexto se suspende cuando no queda nada sonando. Un `AudioContext`
   * despierto mantiene ocupado un hilo de audio y en móvil eso se nota en la
   * batería; despertarlo cuesta un `resume()` que ya hace `depart()`.
   */
  private sleepIn(seconds: number) {
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.idleTimer = undefined;
      this.release();
      void this.context?.suspend().catch(() => {});
    }, Math.round(seconds * 1000));
  }
}

export const voyageAudio = new VoyageAudio();
