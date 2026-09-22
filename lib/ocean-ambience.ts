import { audioAwake, holdAudio, openAudio, subscribeAudio } from "./audio-bus";

/**
 * El mar de Miller: el único sonido SOSTENIDO del sitio.
 *
 * ── Qué es ─────────────────────────────────────────────────────────────────
 *
 * Una grabación de mar que trajo el dueño, de dos minutos, después de rechazar
 * el mar sintetizado. La versión anterior era ruido filtrado en tres capas con
 * dos lavados a periodos primos entre sí; la idea era buena y el resultado no
 * le gustó, que es el único veredicto que cuenta en un sonido. **Lo que era
 * defendible del sintetizador no lo salva: un mar que no suena a mar no es un
 * mar.** Aquello queda en el historial.
 *
 * ── Cómo se reproduce, y por qué no con `loop` ─────────────────────────────
 *
 * Va por `<audio>` y no por `AudioBuffer`: son 3,8 MB, que descargados enteros
 * y descodificados ocupan unos 43 MB de memoria para algo que sólo hace falta
 * según se oye. Un elemento se descarga progresivamente y se enchufa al bus
 * con `createMediaElementSource`, así que sigue pasando por el maestro y el
 * limitador y lo sigue apagando el control de AUDIO.
 *
 * `loop` no sirve, y esto es medido, no supuesto: **el archivo entra desde el
 * silencio y termina en silencio**. Los dos primeros segundos suben de RMS
 * 0,0003 a 0,009, y los últimos 3,4 s bajan hasta el cero digital. Con `loop`,
 * cada dos minutos el mar se iría y volvería —un bache de cinco segundos, que
 * es exactamente lo que delata un archivo—. Así que hay DOS elementos que se
 * cruzan: el que termina se apaga mientras el otro arranca desde `HEAD`, con
 * cinco segundos de solape. Un mar es estocástico y un cruce de cinco segundos
 * entre dos tramos suyos no tiene costura audible.
 *
 * ── Nivel ──────────────────────────────────────────────────────────────────
 *
 * `LEVEL` vale más que uno, y no es un error: la grabación viene bajísima
 * —RMS 0,007, pico 0,075— así que el número no dice cuánto suena, dice cuánto
 * hay que levantarla. Lo que se mide a la salida es lo que cuenta.
 *
 * ── Quién lo apaga ─────────────────────────────────────────────────────────
 *
 * El control de AUDIO, como todo. Y además se retira solo al ocultar la
 * pestaña o al salir de la página, porque un ambiente que sobrevive a su
 * habitación es un fallo, no una función.
 */

const SOURCE = "/audio/miller-ocean.mp3";

/** Dónde empieza el mar de verdad: antes de esto la grabación está entrando. */
const HEAD = 2;

/** Y dónde se acaba, contado desde el final: después de esto ya no hay nada. */
const TAIL = 3.4;

/** Solape entre una pasada y la siguiente. */
const CROSS = 5;

/** Por si los metadatos todavía no han llegado cuando toca decidir el cruce. */
const SPAN = 121.89;

/** Cuánto tarda el mar en entrar y en irse. Un mar no arranca de golpe. */
const FADE_IN = 3.2;
const FADE_OUT = 1.4;

/**
 * Ver la nota de nivel: la grabación viene a RMS 0,007, así que esto es un
 * factor de amplificación y no un peso.
 *
 * Tercera bajada a petición del dueño, y la última por ahora: 4 → 1,6, otro
 * 60 % menos. Medidos diez segundos continuos en el contexto del bus: **RMS
 * 0,0035 y pico 0,064** al volumen de fábrica, o sea **una quinta parte** de
 * RMS que el mar sintetizado con el que empezó todo esto (0,019). Aquí ya no
 * hay nada que deducir: el número es suyo.
 */
const LEVEL = 1.6;

interface Running {
  stop(): void;
}

interface Pass {
  element: HTMLAudioElement;
  gain: GainNode;
}

function build(): Running | null {
  // Duración `0`: el bus no puede dormirse mientras esto suene, y de eso se
  // encarga `holdAudio`, no el temporizador de inactividad.
  const session = openAudio(LEVEL, 0);
  if (!session) return null;
  const { context, now, out } = session;
  const release = holdAudio();

  // Entrada larga, hasta `LEVEL` y no hasta 1 —ese fue un fallo real, y lo que
  // deja es que un peso declarado y luego pisado es peor que no declararlo.
  out.gain.setValueAtTime(0, now);
  out.gain.linearRampToValueAtTime(LEVEL, now + FADE_IN);

  const passes: Pass[] = [0, 1].map(() => {
    const element = new Audio(SOURCE);
    element.preload = "auto";
    const gain = context.createGain();
    gain.gain.value = 0;
    context.createMediaElementSource(element).connect(gain);
    gain.connect(out);
    return { element, gain };
  });

  let active = 0;
  let stopped = false;
  let handing: ReturnType<typeof setTimeout> | null = null;

  const ending = (element: HTMLAudioElement) =>
    (Number.isFinite(element.duration) ? element.duration : SPAN) - TAIL;

  /** Arranca una pasada por el principio del material. */
  const begin = (pass: Pass, over: number) => {
    pass.element.currentTime = HEAD;
    void pass.element.play().catch(() => {});
    const at = context.currentTime;
    pass.gain.gain.cancelScheduledValues(at);
    pass.gain.gain.setValueAtTime(pass.gain.gain.value, at);
    if (over > 0) pass.gain.gain.linearRampToValueAtTime(1, at + over);
    else pass.gain.gain.setValueAtTime(1, at);
  };

  /** El relevo: el que se acaba se apaga mientras el otro ya está sonando. */
  const handover = () => {
    const leaving = passes[active];
    active = active === 0 ? 1 : 0;
    const at = context.currentTime;
    leaving.gain.gain.cancelScheduledValues(at);
    leaving.gain.gain.setValueAtTime(leaving.gain.gain.value, at);
    leaving.gain.gain.linearRampToValueAtTime(0, at + CROSS);
    begin(passes[active], CROSS);
    handing = setTimeout(() => {
      handing = null;
      if (!stopped) leaving.element.pause();
    }, CROSS * 1000 + 100);
  };

  const watch = () => {
    if (stopped || handing) return;
    const { element } = passes[active];
    if (element.currentTime >= ending(element) - CROSS) handover();
  };

  for (const pass of passes) pass.element.addEventListener("timeupdate", watch);
  begin(passes[0], 0);

  return {
    stop() {
      stopped = true;
      if (handing) clearTimeout(handing);
      const at = context.currentTime;
      out.gain.cancelScheduledValues(at);
      out.gain.setValueAtTime(out.gain.value, at);
      out.gain.linearRampToValueAtTime(0, at + FADE_OUT);
      for (const pass of passes) {
        pass.element.removeEventListener("timeupdate", watch);
        // Se deja terminar el desvanecido antes de parar el elemento, o el
        // último instante del mar sería un corte seco.
        setTimeout(() => {
          pass.element.pause();
          pass.element.removeAttribute("src");
        }, FADE_OUT * 1000 + 100);
      }
      release();
    },
  };
}

/**
 * Enciende el mar y devuelve cómo apagarlo.
 *
 * Se re-intenta solo: si al montar la página el navegador todavía no ha visto
 * un gesto —o el visitante tenía el audio apagado— `build()` devuelve `null` y
 * el mar entra en cuanto el bus avisa de que ya se puede.
 */
export function startOcean(): () => void {
  let running: Running | null = null;

  /*
    El bus avisa de CUALQUIER cambio, incluido mover el volumen. Reconstruir el
    mar en cada aviso le metería una entrada de tres segundos cada vez que el
    visitante arrastra el mando: sólo se monta si falta y sólo se desmonta si
    ya no se puede sonar.
  */
  const sync = () => {
    if (!audioAwake()) {
      // El bus ya corta el maestro al silenciar; aquí se para la descarga para
      // no dejar dos elementos tirando de red en una pestaña muda.
      running?.stop();
      running = null;
      return;
    }
    if (!running) running = build();
  };

  sync();
  const unsubscribe = subscribeAudio(sync);

  return () => {
    unsubscribe();
    running?.stop();
    running = null;
  };
}
