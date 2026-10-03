/**
 * El bus de audio del sitio: un solo `AudioContext` para todos los EFECTOS.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 *
 * La travesía estrenó síntesis con su propio contexto. En cuanto el sonido se
 * extiende al mapa, a Miller, a Edmunds, al Observatorio y a la Ranger, «cada
 * efecto con su contexto» se convierte en seis hilos de audio despiertos, seis
 * limitadores y seis sitios donde acordarse de mirar si el visitante silenció.
 * Un navegador además tiene un techo de contextos por pestaña.
 *
 * Así que hay UNO. Lo abre el primer efecto que suene, lo cierra el silencio, y
 * todo el mundo cuelga de la misma cadena:
 *
 *     efecto → out (nodo propio) → master (volumen) → limitador → salida
 *
 * La **banda sonora es la excepción**, y conviene saberlo antes de medir nada:
 * `soundtrack.ts` tiene su propio `AudioContext` porque lo que reproduce es un
 * `<audio>` con controles del visitante y su propio volumen, no un efecto. Son
 * dos contextos, y en la portada el de la música es el PRIMERO que se crea:
 * una sonda enganchada «al contexto» a secas mide la música y no el bus.
 *
 * ── Quién lo apaga ──────────────────────────────────────────────────────────
 *
 * El control de AUDIO de la bandeja, y nadie más. Es el principio del
 * interruptor único aplicado al oído: **un solo mando para todo lo que suena**.
 * El interruptor de MOVIMIENTO no entra — un sonido no se mueve, y quien apaga
 * el movimiento suele estar evitando mareo, no ruido.
 *
 * ── La activación, que es de lo que nadie se acuerda ────────────────────────
 *
 * Un navegador no deja sonar nada hasta que el visitante ha tocado la página, y
 * **pasar el ratón por encima NO cuenta**: `pointermove` no es activación. Por
 * eso el bus se despierta con el primer `pointerdown` o `keydown` reales, y
 * mientras tanto lo que se pida simplemente no suena. Es correcto que sea así:
 * un sitio que hace ruido antes de que lo toques es un sitio roto.
 */

/** Lo que el control de AUDIO de la bandeja dice sobre el sonido del sitio. */
interface AudioPreference {
  enabled: boolean;
  volume: number;
}

/*
  ── Las envolventes, y por qué no son exponenciales ────────────────────────

  El idiom que se ve por todas partes es hinchar y apagar cada capa con
  `exponentialRampToValueAtTime` desde y hasta un épsilon, porque una
  exponencial no puede tocar el cero. Es un error, y no se oye como un error:
  se oye como que no hay sonido.

  Medido en el navegador con un `ScriptProcessor` en el hilo de audio, la fase
  de caída de la travesía —de 0,4 s a 1,05 s, justo el tramo en el que la
  cámara se desploma— daba un RMS de 0,0009: SILENCIO. La aritmética conviene
  no volver a tropezarla: una exponencial de 0,0001 a 0,55 multiplica por
  5 500, así que a mitad de recorrido lleva sólo la raíz de eso —el 1,3 % del
  objetivo— y **todo el rango audible se apila en el último quinto del tiempo**.

  Así que: el hinchado va LINEAL en amplitud, y la caída va exponencial pero
  hasta −34 dB del pico, no hasta cero, con un corte lineal final. Una
  exponencial que termina en un valor real es una caída natural; una que
  persigue el cero se pasa la vida en él.
*/

/** Cuánto dura un corte cuando algo se cancela a mitad. */
export const CUT = 0.09;

/** Hinchado: dos tramos lineales que suben sin enmudecer por el camino. */
export function swell(
  param: AudioParam,
  peak: number,
  from: number,
  until: number,
) {
  const span = Math.max(until - from, 0.001);
  param.setValueAtTime(0, from);
  param.linearRampToValueAtTime(peak * 0.22, from + span * 0.55);
  param.linearRampToValueAtTime(peak, until);
}

/** Golpe: ataque lineal, caída exponencial a −34 dB y corte limpio al cero. */
export function hit(
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
export function cut(param: AudioParam, at: number) {
  param.cancelScheduledValues(at);
  param.setValueAtTime(param.value, at);
  param.linearRampToValueAtTime(0, at + CUT);
}

/** Lo que recibe un efecto para construirse. */
export interface AudioSession {
  context: AudioContext;
  /** Instante en el que programar. Todo lo del efecto cuelga de `out`. */
  now: number;
  /** El nodo del efecto. Conectar aquí y olvidarse: el bus no lo guarda. */
  out: GainNode;
  /** Una fuente de ruido nueva sobre el búfer compartido. */
  noise(): AudioBufferSourceNode;
}

const GESTURES = ["pointerdown", "keydown", "touchstart"] as const;

/** Segundos que el bus sigue despierto tras el último sonido. Ver `keepAwake`. */
const IDLE_SLEEP = 45;

/**
 * Margen con el que se programa un sonido cuando el contexto venía DORMIDO.
 *
 * Es la corrección de un defecto medido, y la regla que deja: **el primer
 * sonido después de una suspensión se pierde si se programa contra el reloj
 * congelado**. `resume()` es asíncrono y `currentTime` no avanza mientras el
 * contexto duerme, así que una envolvente de 200 ms programada en `currentTime`
 * ya ha caducado para cuando el hilo de audio vuelve. Medido: de quince
 * recetas disparadas en fila, la PRIMERA de cada tanda daba pico 0,00000 y las
 * catorce siguientes sonaban.
 *
 * Ochenta milisegundos son de sobra para que el hilo despierte y quedan por
 * debajo de lo que se percibe como retardo en un mando. Sólo se pagan al
 * despertar: con el bus ya en marcha se programa en el instante.
 */
const WAKE_LOOKAHEAD = 0.08;

class AudioBus {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private preference: AudioPreference = { enabled: true, volume: 0.28 };
  private idleTimer: ReturnType<typeof setTimeout> | undefined;
  /** Fuentes sostenidas vivas (ambientes). Con una sola, el bus no duerme. */
  private holds = 0;
  private armed = false;
  private gestured = false;
  /*
    Quién quiere enterarse de que el bus ha cambiado de humor. Lo necesitan las
    fuentes SOSTENIDAS —el mar de Miller— y no los disparos: un efecto de un
    cuarto de segundo se limita a no sonar, pero un ambiente tiene que saber
    cuándo montarse y cuándo retirarse. Se avisa al silenciar, al volver a
    encender, al ocultar la pestaña y en el primer gesto real del visitante.
  */
  private listeners = new Set<() => void>();

  /**
   * El control de la bandeja publica aquí. Silenciar corta el bus entero: no
   * hay un segundo sitio donde acordarse de mirar.
   */
  configure(preference: AudioPreference) {
    this.preference = preference;
    this.arm();
    if (!this.audible()) {
      this.silence();
      this.emit();
      return;
    }
    this.restore();
    this.emit();
  }

  /** Devuelve el maestro al volumen del visitante tras un corte. */
  private restore() {
    if (!this.master || !this.context) return;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(this.preference.volume, now + 0.08);
  }

  /*
    Un navegador sólo deja sonar después de un gesto real, y el puntero
    moviéndose no lo es. Se escucha una vez, en captura y pasivo, y no se
    suelta nunca: el visitante puede silenciar y volver a encender, y el
    permiso del navegador sigue siendo el mismo.
  */
  private arm() {
    if (this.armed || typeof window === "undefined") return;
    this.armed = true;
    const mark = () => {
      const first = !this.gestured;
      this.gestured = true;
      void this.context?.resume().catch(() => {});
      // El primer gesto es la única noticia que convierte «no puedo sonar» en
      // «ya puedo»: los ambientes que se quedaron fuera vuelven a intentarlo.
      if (first) this.emit();
    };
    for (const type of GESTURES) {
      window.addEventListener(type, mark, { capture: true, passive: true });
    }
    document.addEventListener("visibilitychange", () => {
      // Ocultar la pestaña CORTA el maestro a cero, así que volver tiene que
      // devolverlo: sin esta línea el sitio se quedaba mudo para siempre
      // después de cambiar de pestaña una sola vez.
      if (document.hidden) this.silence();
      else if (this.audible()) {
        void this.context?.resume().catch(() => {});
        this.restore();
      }
      this.emit();
    });
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    for (const listener of this.listeners) listener();
  }

  audible(): boolean {
    return (
      this.preference.enabled &&
      this.preference.volume > 0 &&
      typeof AudioContext !== "undefined" &&
      // Sonar en una pestaña que el visitante ya no mira es ruido.
      !(typeof document !== "undefined" && document.hidden)
    );
  }

  private ensure(): AudioContext | null {
    if (this.context) return this.context;
    try {
      const context = new AudioContext();
      const frames = Math.ceil(context.sampleRate * 3);
      const buffer = context.createBuffer(1, frames, context.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < frames; i++) channel[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buffer;

      const master = context.createGain();
      master.gain.value = this.preference.volume;

      /*
        Un limitador al final, y no por gusto: varias capas suenan a la vez —el
        golpe de un cruce lleva impacto, sub y cola— y a volumen 28 % eso mide
        0,3 de pico, pero el visitante puede subir el mando al 100 % y entonces
        la suma se va por encima de 1. Recorte, que en un grave suena a
        chasquido roto y no a impacto.

        Y una advertencia para quien vaya a MEDIR algo de este bus: **un
        `DynamicsCompressorNode` no es transparente por debajo de su umbral.**
        Medido en un `OfflineAudioContext` con esta misma cadena y un golpe a
        −44 dB, o sea cuarenta decibelios por debajo del umbral: sin limitador
        sale 0,00635, que es la aritmética exacta; con él sale **0,00722**, un
        +1,1 dB de realce fijo. Y si el golpe cae en el primer medio segundo de
        un contexto recién creado sale **0,00365**, la mitad, porque el
        detector arranca frío y se suelta en su `release`. Los tres números son
        reproducibles a cinco decimales. O sea: la aritmética de la cadena
        predice el ORDEN, no el dígito, y el primer sonido de una sesión no
        sirve como muestra.
      */
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -4;
      limiter.knee.value = 6;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.25;

      master.connect(limiter);
      limiter.connect(context.destination);
      this.context = context;
      this.master = master;
      return context;
    } catch {
      // Sin Web Audio el sitio entero sigue funcionando; simplemente no suena.
      this.context = null;
      return null;
    }
  }

  /**
   * Abre una sesión para un efecto. `level` es su peso dentro del bus y
   * `seconds` cuánto va a durar, que es lo que decide cuándo dormir.
   *
   * Devuelve `null` cuando no se puede o no se debe sonar: sin Web Audio, con
   * el audio apagado, con la pestaña oculta o antes del primer gesto real.
   */
  open(level: number, seconds: number): AudioSession | null {
    if (!this.audible()) return null;
    // Antes del primer gesto no hay nada que pueda sonar, y crear el contexto
    // sólo para que el navegador lo rechace imprime «The AudioContext was not
    // allowed to start» en cada página con ambiente (las cinco de mundo, QA
    // 2026-10-02). El primer gesto avisa (`emit`) y el ambiente vuelve a pedir.
    if (!this.gestured && !this.context) return null;
    const context = this.ensure();
    if (!context || !this.master) return null;
    // Antes del primer gesto el contexto está suspendido y lo programado se
    // amontonaría para soltarse de golpe cuando despierte.
    const asleep = context.state !== "running";
    if (!this.gestured && asleep) return null;
    if (asleep) void context.resume().catch(() => {});

    const out = context.createGain();
    out.gain.value = Math.max(0, level);
    out.connect(this.master);
    this.keepAwake(seconds);

    return {
      context,
      // Ver `WAKE_LOOKAHEAD`: despertando hay que dejarle sitio al hilo de
      // audio, o esta primera envolvente no llega a sonar.
      now: context.currentTime + (asleep ? WAKE_LOOKAHEAD : 0),
      out,
      noise: () => {
        const source = context.createBufferSource();
        source.buffer = this.noiseBuffer;
        source.loop = true;
        // Cada disparo entra por un punto distinto del ruido: dos efectos
        // seguidos no son el mismo archivo sonando otra vez.
        source.playbackRate.value = 0.92 + Math.random() * 0.16;
        return source;
      },
    };
  }

  /** Una fuente sostenida (un ambiente) pide que el bus no se duerma. */
  hold(): () => void {
    this.holds++;
    this.keepAwake(0);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.holds = Math.max(0, this.holds - 1);
      this.keepAwake(0.6);
    };
  }

  /**
   * El contexto se suspende cuando lleva un rato sin nada que sonar.
   *
   * ── Por qué DOCE segundos y no medio ───────────────────────────────────
   *
   * Un `AudioContext` despierto ocupa un hilo de audio y en móvil eso se nota
   * en la batería, así que la primera versión lo suspendía 400 ms después del
   * último sonido. Medido en el navegador: de seis blips de proximidad
   * disparados con 620 ms entre ellos, **sólo dos llegaron a producir audio**.
   * Los otros cuatro cayeron en un contexto suspendido.
   *
   * La causa es que `resume()` es ASÍNCRONO y `currentTime` no avanza mientras
   * el contexto duerme: el efecto programa su envolvente contra un reloj
   * congelado y, para cuando el hilo de audio vuelve, la ventana de 200 ms ya
   * no existe. Un sonido de interfaz es demasiado corto para sobrevivir a eso.
   *
   * Cuarenta y cinco segundos cubren de sobra cualquier sesión de interacción
   * y siguen durmiendo una página que el visitante dejó abierta. El ahorro de
   * verdad lo da ocultar la pestaña, que corta el bus en el acto. Y para que
   * dormirse no vuelva a costar un sonido, el que despierta al bus se programa
   * con `WAKE_LOOKAHEAD`.
   */
  private keepAwake(seconds: number) {
    clearTimeout(this.idleTimer);
    this.idleTimer = undefined;
    if (this.holds > 0) return;
    this.idleTimer = setTimeout(
      () => {
        this.idleTimer = undefined;
        if (this.holds === 0) void this.context?.suspend().catch(() => {});
      },
      Math.round((Math.max(seconds, 0) + IDLE_SLEEP) * 1000),
    );
  }

  /** Silencio inmediato: el mando se apagó. */
  private silence() {
    clearTimeout(this.idleTimer);
    this.idleTimer = undefined;
    const context = this.context;
    if (!context || !this.master) return;
    cut(this.master.gain, context.currentTime);
    setTimeout(() => {
      if (!this.audible()) void this.context?.suspend().catch(() => {});
    }, Math.round(CUT * 1000) + 40);
  }
}

const bus = new AudioBus();

/** Lo llama el control de AUDIO de la bandeja. Nadie más. */
export function configureAudio(preference: AudioPreference) {
  bus.configure(preference);
}

/** Abre una sesión, o devuelve `null` si en este momento no se debe sonar. */
export function openAudio(level: number, seconds: number): AudioSession | null {
  return bus.open(level, seconds);
}

/** ¿Se puede sonar ahora mismo? Para ambientes, que deciden si montarse. */
export function audioAwake(): boolean {
  return bus.audible();
}

/** Marca una fuente sostenida viva; el retorno la suelta. */
export function holdAudio(): () => void {
  return bus.hold();
}

/**
 * Avisa cuando el bus cambia de humor: al silenciar, al encender, al ocultar
 * la pestaña y en el primer gesto real. Lo usan los AMBIENTES, que tienen que
 * montarse y retirarse; un disparo suelto no lo necesita.
 */
export function subscribeAudio(listener: () => void): () => void {
  return bus.subscribe(listener);
}
