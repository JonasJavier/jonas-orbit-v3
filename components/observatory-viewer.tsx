"use client";

import { IntentLink as Link } from "@/components/intent-link";
import { Fragment, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { WorldId, WorldStructuralData } from "@/content/worlds.data";
import {
  useExplicitEffects,
  useForcedEffects,
  useLightEffectsMode,
  useMotionEnabled,
} from "@/lib/effects-mode";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { readVisualBench } from "@/lib/visual-bench";
import type {
  ObservatoryHandle,
  ProbeReading,
} from "@/components/scene/observatory-scene";
import {
  viewText,
  type ObservationTelemetry,
  type ObservationView,
} from "@/lib/observation-views";
import type { SpecimenContract } from "@/components/scene/specimen-contract";
import type { QualityTier } from "@/components/scene/gargantua-render";
import type { ObservationInstrument } from "@/lib/observatory";
import {
  evaluateCapabilities,
  readSignals,
} from "@/components/scene/capability";
import {
  OBSERVATORY_LABELS,
  architectureLabel,
  AXIS_LABELS,
  REGISTRO_SECTIONS,
} from "./observatory-labels";
import { defineCopy } from "@/lib/i18n";
import { useLocale } from "./locale-provider";
import "./observatory.css";

const COPY = defineCopy({
  es: {
    close: (title: string) => `Cerrar ${title.toLowerCase()}`,
    canonical: "Canónico",
    noBloom: "sin bloom",
    noEmission: "sin emisión",
    probeHint: "Señala una arista del hipercubo",
    probeEdge: (edge: string, axis: string) => `Arista ${edge} · eje ${axis}`,
    studyHint: "Mantén un mando para comparar",
    orbit: "Arrastra para orbitar",
    zoom: "rueda para acercar",
    fourViews: "Cuatro vistas en",
    specimens: "Especímenes",
    previous: "Muestra anterior:",
    specimen: (position: number, total: number) => `Espécimen ${position} de ${total}`,
    next: "Muestra siguiente:",
    exit: "Salir del Observatorio",
    read: "Cómo está hecho",
    data: "Datos",
    object: "Objeto",
    observation: "Observación",
    radii: "radios",
    render: "Render",
    record: "Registro",
    recordSections: "Secciones del registro",
    view: "Vista",
    views: "Vistas de observación",
    light: "Luz",
    figure: "Figura",
    camera: "Cámara",
    inspect: "Inspeccionar",
    probe: "Sonda",
    physics: { doppler: "Doppler", secundarias: "Secundarias", lente: "Lente" },
    mode: "Modo del instrumento",
    observe: "Observar",
    study: "Estudio",
    reset: "Reajustar",
  },
  en: {
    close: (title: string) => `Close ${title.toLowerCase()}`,
    canonical: "Canonical",
    noBloom: "no bloom",
    noEmission: "no emission",
    probeHint: "Point at an edge of the hypercube",
    probeEdge: (edge: string, axis: string) => `Edge ${edge} · axis ${axis}`,
    studyHint: "Hold a control to compare",
    orbit: "Drag to orbit",
    zoom: "scroll to zoom",
    fourViews: "Four views in",
    specimens: "Specimens",
    previous: "Previous specimen:",
    specimen: (position: number, total: number) => `Specimen ${position} of ${total}`,
    next: "Next specimen:",
    exit: "Leave the Observatory",
    read: "How it’s built",
    data: "Data",
    object: "Object",
    observation: "Observation",
    radii: "radii",
    render: "Render",
    record: "Log",
    recordSections: "Log sections",
    view: "View",
    views: "Observation views",
    light: "Light",
    figure: "Figure",
    camera: "Camera",
    inspect: "Inspect",
    probe: "Probe",
    physics: { doppler: "Doppler", secundarias: "Secondary", lente: "Lens" },
    mode: "Instrument mode",
    observe: "Observe",
    study: "Study",
    reset: "Reset",
  },
});

/**
 * El visor del Observatorio.
 *
 * El canvas es `aria-hidden` y **nunca es la única representación**: el HTML
 * servido de esta ruta ya trae el nombre del espécimen y su ficha, y esto se
 * monta encima. Sin JavaScript, sin WebGL2 o en perfil ligero, lo que queda es
 * ese contenido — no una página rota.
 *
 * ── V2 · DOS MODOS, y por qué no es una preferencia ─────────────────────────
 *
 * Jonás vio la V1.5 terminada y dijo dos cosas que son la misma: «hay mucha
 * información y se siente todo muy pesado» y «modo cine por defecto, sólo mover
 * la cámara con el ratón; y luego un modo estudio con las herramientas».
 *
 * El diagnóstico correcto no era «sobra un rótulo»: era que la pantalla estaba
 * contestando a la vez dos preguntas que nadie se hace a la vez. **Mirar** un
 * espécimen y **medirlo** son dos actividades, y el aparato tenía las dos
 * encendidas siempre.
 *
 *   · `OBSERVAR` es el estado de reposo del instrumento: el espécimen, su
 *     nombre, la salida y la mano. Nada más. La cámara se lleva con el ratón.
 *   · `ESTUDIO` despliega la consola: vistas, luz, sonda, comparación y fichas.
 *
 * Por eso el modo cine —la atenuación por inactividad— vive ahora SÓLO en
 * `OBSERVAR`. En V1.5 escondía los controles a los 3,5 s mientras el visitante
 * pensaba qué medir, que es exactamente cuando no puede desaparecer un mando.
 * Un instrumento desplegado se queda desplegado.
 */

/** Modo cine: los mismos 3,5 s que la cubierta de Edmunds. */
const IDLE_MS = 3500;

/**
 * A partir de aquí una pulsación es una COMPARACIÓN y no un clic.
 *
 * 220 ms: por debajo está el clic deliberado más lento que se mide en la
 * práctica, y por encima empieza el gesto de «déjame ver esto un momento».
 */
const HOLD_MS = 220;

/**
 * Fuera de esta banda el GIRO de la luz no significa nada.
 *
 * Con la lámpara casi alineada con el eje de mirada, su posición en el reloj de
 * la pantalla es la de un vector de longitud cero: el `atan2` devuelve ruido. El
 * dial deja de leerse del aparato y conserva el último valor con sentido, que es
 * además el que hace falta para salir de ahí.
 */
const ROLL_FLOOR = 2;

/**
 * El reloj de un gesto de puntero.
 *
 * `event.timeStamp` lo fija el navegador al CREAR el evento, así que mide
 * cuándo ocurrió y no cuándo se pudo atender — que es la diferencia entre medir
 * un gesto y medir un gesto más el fotograma que lo bloqueó. El respaldo cubre
 * entornos donde ese campo llega a cero, y deja además el camino por el que la
 * suite puede espiar el reloj.
 */
function stamp(event: { timeStamp: number }): number {
  return event.timeStamp > 0 ? event.timeStamp : performance.now();
}

/**
 * Los tres interruptores de física, y el orden es la lectura.
 *
 * Doppler, secundarias y lente van de lo más cercano a lo más lejano: lo que
 * le pasa al material del disco, lo que le pasa a la luz que ese disco emite, y
 * lo que le pasa a la luz que sólo estaba de paso. Es el mismo criterio que
 * ordena `DATOS` —objeto, observación, render— aplicado a la física.
 *
 * Vive fuera del componente porque es una tabla, no un estado: declararla
 * dentro del render la recrearía en cada pase y cambiaría la identidad de cada
 * `Fragment` con ella.
 */
const PHYSICS = ["doppler", "secundarias", "lente"] as const;

/** Dos dígitos. Es tipografía de instrumento: mantiene la columna del raíl
 *  alineada y hace que `01` y `06` ocupen lo mismo. */
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Un número con los separadores del sitio.
 *
 * Va por `toLocaleString` y no por `toFixed` para que todas las cifras del
 * Observatorio usen la misma convención: `es-DO` separa millares con coma y
 * decimales con punto —la del país, no la de España— y los vértices de malla ya
 * se imprimían así. Dos criterios en la misma tabla se notan.
 */
const fixed = (n: number, digits: number) =>
  n.toLocaleString("es-DO", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/** Con signo explícito: una elevación de −18° y una de +18° no son la misma
 *  observación, y sin el signo la lectura no distingue mirar desde arriba de
 *  mirar desde abajo. */
const signed = (n: number, digits: number) =>
  `${n < 0 ? "−" : "+"}${fixed(Math.abs(n), digits)}`;

/**
 * Un instrumento del banco: una palabra entre corchetes, sin caja.
 *
 * Los corchetes van en spans `aria-hidden` y eso NO es un detalle de estilo.
 * Son la señal que dice «este instrumento está abierto» —la que pidió la
 * dirección visual— pero el nombre accesible del mando tiene que seguir siendo
 * exactamente «Bloom», «Material» o «Datos»: es lo que lee un lector de
 * pantalla y lo que busca `tools/observatory-shot.mjs` con `exact: true`.
 *
 * Por eso tampoco pueden ser un `::before`/`::after`: el `content` de un
 * pseudoelemento SÍ entra en el cálculo del nombre accesible en Chromium, y el
 * mando pasaría a llamarse «[Bloom]». Un subárbol `aria-hidden`, en cambio,
 * queda fuera del nombre por especificación. `observatory-chrome.test.tsx` fija
 * las dos cosas a la vez — que el corchete se vea y que no se oiga.
 */
function Instrument({
  label,
  pressed,
  onToggle,
  onHold,
}: {
  label: string;
  pressed: boolean;
  onToggle: () => void;
  /**
   * COMPARAR SIN CAMBIAR DE ESTADO.
   *
   * Un interruptor responde «¿está encendido?»; una comparación responde «¿qué
   * parte de esto es el objeto y qué parte es el tratamiento?». Es la misma
   * pregunta que hace el bloom-off test del proyecto, y mantener pulsado es su
   * forma natural: se ve la diferencia mientras se sostiene y el instrumento
   * vuelve solo a su estado canónico, sin dejar al visitante mirando una
   * versión degradada sin saberlo.
   *
   * El clic corto SIGUE conmutando, y eso no es un extra: es lo que mantiene el
   * mando utilizable con teclado —donde «mantener» no existe como gesto— y para
   * quien quiera dejarlo apagado y orbitar.
   */
  onHold?: (held: boolean) => void;
}) {
  /**
   * Cuándo empezó la pulsación, o `null` si no hubo ninguna.
   *
   * El `null` es la pieza: distingue una activación con PUNTERO de una con
   * TECLADO. Space y Enter disparan `click` sin `pointerdown`, así que sin esa
   * distinción una comparación larga y una pulsación de teclado serían
   * indistinguibles y el mando dejaría de funcionar con teclado.
   */
  const since = useRef<number | null>(null);
  /**
   * El veredicto del gesto, decidido AL SOLTAR y leído al hacer clic.
   *
   * `null` significa que no hubo puntero —teclado— y entonces siempre conmuta.
   */
  const held = useRef(false);
  return (
    <button
      type="button"
      className="observatory__toggle"
      aria-pressed={pressed}
      onClick={() => {
        /*
          Una pulsación larga es una comparación, no un clic: el instrumento
          ya volvió solo a su estado canónico al soltar y conmutar el pestillo
          aquí lo dejaría al revés de como estaba.

          `preventDefault` en `pointerup` NO sirve para esto —el clic de un
          botón no se cancela desde el evento de puntero— y probarlo costó una
          captura: el `aria-pressed` se quedaba en `true` después de comparar.
        */
        const comparado = held.current;
        since.current = null;
        held.current = false;
        if (comparado) return;
        onToggle();
      }}
      onPointerDown={
        onHold
          ? (event) => {
              since.current = stamp(event);
              held.current = false;
              onHold(true);
            }
          : undefined
      }
      onPointerUp={
        onHold
          ? (event) => {
              /*
                EL GESTO SE MIDE CON EL RELOJ DEL EVENTO, NO CON EL DE QUIEN LO
                ATIENDE — y esto costó que un mando entero dejara de funcionar.

                La versión anterior comparaba `performance.now()` en el momento
                del CLIC contra el del `pointerdown`. Los dos relojes son
                monótonos, así que parecía equivalente, y sobre el Tesseracto lo
                era: medido, un clic normal entrega `down → up` en 113 ms, muy
                por debajo del umbral.

                Sobre Gargantúa el mismo clic mide **742 ms**. No porque el dedo
                tarde más, sino porque entre los dos eventos el hilo principal se
                queda dentro de un fotograma del raymarch — cientos de pasos de
                integración por píxel— y los entrega juntos al salir. O sea que
                el reloj del manejador no mide el gesto: mide el gesto MÁS lo
                que la página tardó en atenderlo.

                La consecuencia era un mando roto en el sitio donde más se nota:
                en un equipo lento, pulsar `BLOOM` nunca conmutaba el pestillo,
                siempre comparaba, y el visitante veía un botón que no responde.
                Y no era exclusivo de este espécimen: le pasaría a cualquiera en
                cuanto un fotograma pasara de 220 ms.

                `event.timeStamp` lo pone el navegador cuando CREA el evento, no
                cuando lo entrega, así que mide el gesto de verdad. El respaldo a
                `performance.now()` existe para entornos donde ese campo llega a
                cero, y la decisión se toma aquí —al soltar— porque es el último
                momento en que los dos extremos del gesto están disponibles.
              */
              held.current =
                since.current !== null && stamp(event) - since.current > HOLD_MS;
              onHold(false);
            }
          : undefined
      }
      onPointerCancel={
        onHold
          ? () => {
              since.current = null;
              held.current = false;
              onHold(false);
            }
          : undefined
      }
      onPointerLeave={
        onHold
          ? () => {
              since.current = null;
              held.current = false;
              onHold(false);
            }
          : undefined
      }
    >
      <span className="observatory__ink">
        <span aria-hidden="true" className="observatory__bracket">
          [
        </span>
        {label}
        <span aria-hidden="true" className="observatory__bracket">
          ]
        </span>
      </span>
    </button>
  );
}

/**
 * La cabecera de la ficha: su nombre y la forma de cerrarla.
 *
 * En escritorio está OCULTA —se cierra con el mismo instrumento que la abrió, y
 * un título encima de una ficha que ya sabes que pediste es ruido—. Existe para
 * móvil, donde la ficha se convierte en una hoja inferior que tapa el banco de
 * instrumentos: sin esta cabecera no habría salida visible del modo lectura.
 *
 * Va con `display: none` en escritorio y no con una condición de JavaScript
 * porque el ancho de la ventana no es estado de React: leerlo obligaría a un
 * efecto, a un re-render por cada arrastre del borde y a una discrepancia de
 * hidratación. Y `display: none` saca el botón del árbol de accesibilidad, así
 * que en escritorio tampoco aparece para quien navega escuchando.
 */
function SheetHead({ title, onClose }: { title: string; onClose: () => void }) {
  const t = COPY[useLocale()];
  return (
    <div className="observatory__sheet-head">
      <p className="observatory__legend">{title}</p>
      <button
        className="observatory__sheet-close"
        onClick={onClose}
        type="button"
      >
        <span className="sr-only">{t.close(title)}</span>
        <span aria-hidden="true">—</span>
      </button>
    </div>
  );
}

/**
 * Una entrada del catálogo. `href` a `null` es una muestra que aún no se monta.
 *
 * La construye la ruta, que es quien puede leer contenido: aquí no se resuelve
 * ni un nombre ni una URL. Y las no disponibles llegan con su nombre real y sin
 * enlace — nada de contenido inventado para rellenar el raíl.
 */
export interface SpecimenSlot {
  id: WorldId;
  /** Su sitio en el catálogo, desde 1. */
  index: number;
  name: string;
  href: string | null;
}

/** Las cinco secciones del registro, tal como llegan del MDX. */
export type SpecimenRecord = Record<
  (typeof REGISTRO_SECTIONS)[number][0],
  string
>;

/** Los dos estados del aparato. `observar` es el de reposo. */
type Mode = "observar" | "estudio";

export function ObservatoryViewer({
  world,
  name,
  descriptor,
  rail,
  indexHref,
  articleHref = null,
  record,
  children,
}: {
  /**
   * LA CARA SERVIDA: el instrumento en frío.
   *
   * Llega como `children` desde la ruta —que es un componente de servidor y es
   * quien puede leer contenido— y no se construye aquí. Es el HTML que existe
   * sin JavaScript (regla 7) y, a la vez, la pantalla de `EN ESPERA` mientras
   * el contexto WebGL monta.
   *
   * Que sea la MISMA pieza en los dos casos es la decisión: antes el visor
   * TAPABA la cara servida con un rectángulo negro `fixed; inset: 0`, y eso es
   * literalmente la definición de un modal — una superficie opaca que aparece
   * de golpe sobre una página viva. Ahora no hay un solo instante en que una
   * superficie nueva tape una vieja: la cara servida sostiene la pantalla, el
   * canvas entra a opacidad 0 y sube cuando hay imagen.
   */
  children: React.ReactNode;
  world: {
    id: WorldId;
    visual: WorldStructuralData["visual"];
    accent: string;
    secondary: string;
    placement: WorldStructuralData["placement"];
  };
  name: string;
  /** Dos o tres palabras bajo el nombre. Del MDX del espécimen. */
  descriptor: string;
  rail: readonly SpecimenSlot[];
  /** La vuelta al índice de Experimentos. */
  indexHref: string;
  /** La entrada del blog que cuenta cómo está hecho este espécimen, si existe. */
  articleHref?: string | null;
  /** `null` mientras un espécimen no tenga registro escrito. */
  record: SpecimenRecord | null;
}) {
  const locale = useLocale();
  const t = COPY[locale];
  // La sonda escribe desde el bucle de la escena, fuera de React: lee el texto de un ref.
  const probeEdge = useRef(t.probeEdge);
  const labels = OBSERVATORY_LABELS[locale];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<ObservatoryHandle | null>(null);
  const motion = useMotionEnabled();
  const reducedMotion = usePrefersReducedMotion();
  const lightEffects = useLightEffectsMode();
  const forced = useForcedEffects();
  // Sólo un encendido pedido monta WebGL en un equipo que no lo aguanta.
  const explicit = useExplicitEffects();

  /*
    EL GATE DE CAPACIDAD, que hasta ahora no existía aquí.

    El resto del sitio decide si hay equipo para 3D antes de montar nada; esta
    página montaba WebGL igual. Se vio en las primeras capturas del pase visual:
    el gate vetó la escena persistente por GPU por software y el Observatorio
    dibujó de todas formas.

    Es el MISMO veredicto que usa `gargantua-system.tsx`, con la misma lectura
    por `useSyncExternalStore` y la misma instantánea de servidor: en servidor
    siempre `flat`, porque ahí no hay navegador al que preguntar, y tras la
    hidratación se resuelve con las capacidades reales sin provocar mismatch.

    Se lee el NIVEL y no el veredicto entero: `useSyncExternalStore` compara la
    instantánea con `Object.is`, y devolver un objeto nuevo en cada llamada
    metería el componente en un bucle infinito de re-renders. Es la misma
    trampa que el otro archivo documenta.

    Como en la escena persistente (movimiento-unificado.md, §«Tres
    lecturas»): el encendido por defecto supera reduced-motion, y sólo el
    PEDIDO —icono pulsado o `?no3d=0`, `explicit`— supera además a un equipo
    sin aceleración, 2G o 2 GB. Ahí un fotograma bloquea el hilo principal
    segundos; sin la petición queda la cara servida, que es una página
    terminada con su dibujo y su salida.
  */
  const flat = useSyncExternalStore(
    () => () => {},
    () => {
      const verdict = evaluateCapabilities(
        readSignals({ reducedMotion, lightEffects, forced, explicit }),
      );
      if (verdict.level !== "flat") return false;
      /*
        DEGRADA POR FALTA DE EQUIPO, NO POR PREFERENCIA DE MOVIMIENTO.

        Esta línea es la que separa dos cosas que el resto del sitio junta a
        propósito, y hace falta aquí por una razón concreta.

        El interruptor global escribe el perfil ligero al apagarse
        (`effects-mode.ts:146`), así que sin este filtro apagar el movimiento
        retiraría el espécimen entero y dejaría el dibujo SVG. En la home eso
        es correcto —la escena es decoración sobre contenido—, pero aquí el
        espécimen ES la página, y el §12 del documento pide lo contrario en su
        prueba O6: «con movimiento apagado, sin giro en reposo, transiciones
        instantáneas, MANIPULACIÓN VIVA». No se puede manipular lo que no está.

        El interruptor ya tiene aquí un efecto propio y correcto: `setMotion`
        congela la reconfiguración del espécimen sin tocar la mano del
        visitante, que es lo que se aprobó en el primer pase visual.
      */
      return verdict.reason !== "perfil-ligero";
    },
    () => true,
  );

  /*
    EL NIVEL DE CALIDAD, del mismo veredicto y no de otra pregunta.

    Sólo lo consume Gargantúa —las dos palancas de un raymarcher son píxeles y
    pasos, y una malla no tiene ninguna de las dos— pero se resuelve aquí porque
    aquí ya está el veredicto. Preguntarle otra vez al navegador desde la escena
    daría dos respuestas que pueden discrepar, y la que manda tiene que ser la
    misma que decidió si hay escena.
  */
  const tier = useSyncExternalStore<QualityTier>(
    () => () => {},
    () =>
      evaluateCapabilities(readSignals({ reducedMotion, lightEffects, forced, explicit }))
        .level === "deep"
        ? "deep"
        : "orbit",
    () => "orbit",
  );

  /*
    El estado del interruptor en el MOMENTO DE MONTAR, y nada más.

    Va por ref y no por dependencia a propósito: encender o apagar el
    movimiento no puede reconstruir la escena —sería tirar el contexto WebGL y
    volver a subir la geometría por pulsar un icono—. El cambio en caliente lo
    propaga el efecto de abajo con `setMotion`.
  */
  const motionRef = useRef(motion);

  // Los campos sueltos: `worldsData` es una constante de módulo, así que su
  // `placement` tiene identidad estable y el efecto no se reejecuta solo.
  const { id, visual, accent, secondary, placement } = world;

  const [contract, setContract] = useState<SpecimenContract | null>(null);
  const [failed, setFailed] = useState(false);
  /*
    EN ESPERA → NOMINAL.

    `ready` no significa «la escena existe», significa «hay imagen». Son dos
    cosas distintas y entre ellas puede haber cientos de milisegundos de
    compilación de shaders en un equipo modesto. El contrato medido llega con lo
    primero; el instrumento se enciende con lo segundo.
  */
  const [ready, setReady] = useState(false);
  /*
    EL MODO, y arranca SIEMPRE en `observar`.

    No se recuerda entre visitas ni entre especímenes a propósito. El reposo del
    aparato es mirar; desplegar la consola es una decisión, y una decisión que se
    hereda de la sesión anterior deja de leerse como una decisión.
  */
  const [mode, setMode] = useState<Mode>("observar");
  const [bloom, setBloom] = useState(true);
  const [emission, setEmission] = useState(true);
  /*
    LAS VISTAS llegan con el instrumento y no con la ruta: las publica el handle
    de la escena, que es quien sabe si el espécimen tiene alguna. Así un
    espécimen sin vistas no enseña un grupo vacío, y añadir vistas a la Ranger
    mañana no pasa por este archivo.
  */
  const [views, setViews] = useState<readonly ObservationView[]>([]);
  const [view, setView] = useState(0);
  const [canProbe, setCanProbe] = useState(false);
  /*
    QUÉ MANDOS OFRECE ESTA MUESTRA, dicho por el instrumento.

    `fov` se fue de aquí: dejó de ser una constante del aparato cuando las
    vistas de Gargantúa empezaron a cambiar de objetivo, así que ahora viaja con
    la telemetría y se escribe en su hueco como los demás números.

    Lo que entra en su lugar es la lista de instrumentos. La interfaz no deduce
    qué puede hacer una muestra —eso lo sabe quien la va a ejecutar— y así
    montar la séptima no pasa por este archivo.
  */
  const [instruments, setInstruments] = useState<
    readonly ObservationInstrument[]
  >([]);
  /*
    Si esta muestra tiene luz que mover. Gargantúa es la única que no, y el
    método opcional del handle es la fuente: no hay una segunda lista que
    mantener en paralelo.
  */
  const [hasLight, setHasLight] = useState(true);
  /*
    Si esta figura se puede girar sobre su eje. Misma fuente y mismo criterio
    que la luz —el método opcional del handle— y dos ausencias en vez de una:
    Gargantúa no tiene malla y el Tesseracto tiene su lectura entera en la
    orientación de reposo. El motivo largo vive en `hasTurnInstrument`.
  */
  const [hasTurn, setHasTurn] = useState(false);
  /** Si la cámara se lleva con la mano. Falso sólo en Gargantúa (§7). */
  const [canOrbit, setCanOrbit] = useState(true);
  const [probe, setProbe] = useState(false);
  /** Qué instrumento se está sosteniendo para comparar. Se suma al pestillo:
   *  el efecto es el mismo, la intención no. */
  const [holding, setHolding] = useState<"bloom" | "material" | null>(null);
  /*
    LOS TRES INTERRUPTORES DE FÍSICA, sólo en Gargantúa.

    Van juntos en un objeto y no en tres estados porque son la misma clase de
    gesto —apagar una rama del integrador— y porque el efecto que los propaga
    puede entonces ser uno solo. Arrancan los tres encendidos, que es el estado
    canónico: un instrumento de inspección nunca puede ser la apariencia por
    defecto de una ruta (§6).
  */
  const [physics, setPhysics] = useState({
    doppler: true,
    secundarias: true,
    lente: true,
  });

  /*
    LA TELEMETRÍA SE ESCRIBE, NO SE RENDERIZA.

    Cambia en cada fotograma que se pinta, o sea hasta sesenta veces por segundo
    mientras se arrastra. Pasarla por estado de React re-renderizaría el visor
    entero —raíl, banco, paneles— sesenta veces por segundo para cambiar cuatro
    números: el coste no está en el número, está en reconciliar todo lo demás.

    Así que se guarda en una ref y se escribe en el DOM. Es imperativo a
    propósito y es la excepción, no la regla: sólo para lecturas de alta
    frecuencia que no cambian la ESTRUCTURA de nada. El panel `DATOS` enseña los
    mismos valores por el mismo camino, y por eso hace falta `writeReadouts`.
  */
  const telemetry = useRef<ObservationTelemetry | null>(null);
  const readouts = useRef<Record<string, HTMLElement | null>>({});
  const reticle = useRef<HTMLDivElement>(null);

  /*
    LOS DOS DIALES DE LA LUZ, y por qué son `<input type="range">` sin estado.

    Un dial de `LUZ` es una LECTURA que además se arrastra: mientras el visitante
    orbita, la geometría de la luz cambia sola y los dos mandos tienen que
    moverse con ella. Eso es lo que separa un instrumento conectado de un
    formulario con estilo.

    Se escriben por referencia, igual que la telemetría y por lo mismo. Y `grab`
    dice cuál está agarrado ahora: sin esa guarda, la lectura que vuelve del
    fotograma pelearía con el pulgar del visitante a mitad del arrastre. No vale
    mirar `document.activeElement` — el dial se queda enfocado después de
    soltarlo, y entonces dejaría de responder al resto del aparato.
  */
  const dials = useRef<Record<string, HTMLInputElement | null>>({});
  const grab = useRef<string | null>(null);
  const light = useRef({ key: 0, roll: 0 });

  /*
    UN solo panel abierto, y no dos banderas independientes.

    `DATOS` y `REGISTRO` ocupan el mismo hueco —encima de la fila que los
    enciende— y los dos son altos: la ficha de la Endurance tiene catorce filas
    y el registro cinco párrafos. Con dos estados sueltos, abrir los dos apila
    dos paneles y la banda crece hacia el espécimen, que es exactamente lo que
    el §5 prohíbe. Excluirse mutuamente también es lo correcto en significado:
    son dos LECTURAS distintas del mismo objeto, no dos capas que se sumen.
  */
  const [panel, setPanel] = useState<"datos" | "registro" | null>(null);

  /* Su sitio en el catálogo. Se deriva del raíl y no se pasa aparte: dos
     fuentes para el mismo número acabarían discrepando el día que se reordene. */
  const position = rail.findIndex((slot) => slot.id === id) + 1;

  /*
    La sección abierta del registro.

    El panel enseña UNA de las cinco, no las cinco a la vez, y ése fue el
    encargo: «abro REGISTRO para profundizar, no para reemplazar el
    Observatory». Con los cinco bloques puestos el ojo empezaba a leer en vez de
    seguir mirando el objeto — el panel se convertía en el segundo protagonista
    del cuadro.

    Son pestañas de verdad (`tablist`/`tab`/`tabpanel`) y no cinco botones que
    conmutan: quien navega con teclado espera que las flechas muevan la
    selección dentro del grupo y que el tabulador salte al contenido, y eso sólo
    lo da el patrón completo.
  */
  const [section, setSection] = useState<(typeof REGISTRO_SECTIONS)[number][0]>(
    REGISTRO_SECTIONS[0][0],
  );
  const tabsRef = useRef<HTMLDivElement>(null);

  /*
    El paso compacto de móvil: anterior y siguiente entre las muestras MONTADAS.

    Filtra por `href` y no por índice: llevar a alguien a un espécimen que no
    existe sería peor que no ofrecer el salto. Desde Miller y Edmunds el filtro
    deja pasar las seis, y se queda porque es lo que hace que montar la séptima
    —o retirar una— no tenga que pasar por aquí.

    Y no da la vuelta al llegar al final. La razón se escribió cuando había dos
    montadas —envolver habría hecho que las dos flechas apuntaran al mismo
    sitio— y con seis sigue valiendo por lo de fondo: un paso que envuelve no
    dice dónde estás, y esto es lo único que lo dice en táctil.
  */
  const mounted = rail.filter((slot) => slot.href);
  const here = mounted.findIndex((slot) => slot.id === id);
  const previous = here > 0 ? mounted[here - 1] : null;
  const next = here >= 0 && here < mounted.length - 1 ? mounted[here + 1] : null;

  /*
    Una celda de lectura. Es una FUNCIÓN QUE DEVUELVE ELEMENTOS, no un
    componente: un componente definido dentro del render cambia de identidad en
    cada pase, React desmonta y vuelve a montar su subárbol, y el texto que
    escribimos a mano en el DOM desaparecería con cada pulsación de cualquier
    otro mando.
  */
  function readout(code: string, slot: string, unit?: string) {
    return (
      <span className="observatory__cell" key={slot}>
        <span className="observatory__code">{code}</span>
        <span
          className="observatory__value"
          ref={(node) => {
            readouts.current[slot] = node;
          }}
        />
        {/* La unidad va aparte y más apagada que su número, y sólo donde el
            número no se explica solo: un ángulo lleva su grado dentro, pero
            `3,21` a secas no dice que sean RADIOS del propio espécimen, que es
            la única unidad de distancia que significa algo aquí. */}
        {unit ? <span className="observatory__unit">{unit}</span> : null}
      </span>
    );
  }

  /**
   * Un dial de la consola.
   *
   * También es una función y no un componente, y por la misma razón que
   * `readout`: su `<input>` lo escribimos a mano desde el bucle de la escena, y
   * un componente declarado dentro del render perdería identidad —y con ella el
   * valor escrito— en cuanto se pulsara cualquier otro mando.
   *
   * Sin estado de React: el valor lo pone el aparato y lo cambia el pulgar. La
   * única obligación es que `commitLight` lea SIEMPRE los dos suyos, porque la
   * luz se coloca con los dos números a la vez.
   *
   * ── Sirve a dos instrumentos, y la rama va DENTRO ───────────────────────────
   *
   * Los dos diales de `LUZ` son un PAR: mover uno manda los dos, porque una
   * geometría de luz con un solo ángulo no existe. `EJE` es un número solo y
   * manda solo. Lo natural sería recibir el `commit` como parámetro y que esta
   * función no supiera de qué instrumento es cada dial — y no se puede: pasar
   * una función que lee refs como VALOR durante el render es exactamente lo que
   * prohíbe `react-hooks/refs`, y con razón, porque un valor leído en render
   * puede quedarse con una versión vieja. En un atributo de JSX no hay ese
   * riesgo. Así que la rama vive aquí, en la única línea que la necesita.
   */
  function dial(
    slot: "key" | "roll" | "turn",
    code: string,
    label: string,
    min: number,
    max: number,
  ) {
    return (
      <div className="observatory__dial">
        <span aria-hidden="true" className="observatory__code">
          {code}
        </span>
        <input
          aria-label={label}
          className="observatory__dial-track"
          defaultValue={0}
          max={max}
          min={min}
          onInput={slot === "turn" ? commitTurn : commitLight}
          onPointerDown={() => {
            grab.current = slot;
          }}
          onPointerUp={() => {
            grab.current = null;
          }}
          onPointerCancel={() => {
            grab.current = null;
          }}
          onLostPointerCapture={() => {
            grab.current = null;
          }}
          ref={(node) => {
            dials.current[slot] = node;
          }}
          step={1}
          type="range"
        />
        <span
          aria-hidden="true"
          className="observatory__value"
          ref={(node) => {
            readouts.current[`dial-${slot}`] = node;
          }}
        />
      </div>
    );
  }

  /**
   * Manda la luz al sitio que dicen los dos diales.
   *
   * Los dos, siempre: la geometría de luz es un par y colocarla con uno solo
   * obligaría a inventarse el otro. Se leen del DOM porque el DOM es aquí la
   * fuente de verdad del mando — y porque la ida y la vuelta son exactas,
   * `lightPlacement` y `lightGeometry` son inversas, así que la lectura que
   * devuelve el fotograma siguiente escribe el mismo número y el pulgar no
   * pelea con nada.
   */
  function commitLight() {
    const key = Number(dials.current.key?.value ?? light.current.key);
    const roll = Number(dials.current.roll?.value ?? light.current.roll);
    // Opcional porque Gargantúa no lo trae: su espécimen ES la fuente de luz.
    handleRef.current?.setLight?.({ key, roll });
  }

  /**
   * Escribe el dial del eje y su cifra. Sin pasar por React, como los otros.
   *
   * Hace falta una función propia —y no sólo el `onInput` del mando— porque
   * este número tiene una segunda fuente: `Reajustar` devuelve la figura a su
   * orientación de reposo, y un dial que se quedara en +140 después de eso
   * estaría mintiendo sobre lo que se está viendo.
   */
  function writeTurn(value: number) {
    const node = dials.current.turn;
    if (node) node.value = String(Math.round(value));
    const cifra = readouts.current["dial-turn"];
    if (cifra) cifra.textContent = `${signed(value, 0)}°`;
  }

  /**
   * Manda la figura al ángulo que dice el dial.
   *
   * ── El único mando de la consola que NO es además una lectura ─────────────
   *
   * `CLAVE` y `GIRO` se mueven solos mientras el visitante orbita, porque
   * rodear el espécimen cambia de dónde le llega la luz: son lecturas que
   * además se arrastran, y por eso las escribe `writeReadouts` desde el bucle.
   * Aquí no hay nada que leer. La orientación propia de la figura no la cambia
   * ningún otro gesto del aparato —ni orbitar, ni el zoom, ni las vistas, ni el
   * interruptor de movimiento—, así que el valor de este dial es el valor que
   * alguien pidió, y publicarlo en cada fotograma sería un temporizador
   * disfrazado de telemetría.
   */
  function commitTurn() {
    const value = Number(dials.current.turn?.value ?? 0);
    writeTurn(value);
    // Opcional por dos motivos distintos: Gargantúa no tiene malla que girar y
    // el Tesseracto tiene su lectura entera en la orientación de reposo.
    handleRef.current?.setTurn?.(value);
  }

  /**
   * Cambiar de modo, y lo que se apaga al salir de `ESTUDIO`.
   *
   * La sonda y las fichas son instrumentos DESPLEGADOS: dejarlos encendidos
   * detrás del modo cine produce exactamente el estado que este pase existe
   * para quitar — una retícula viva que nadie puede ver ni apagar.
   *
   * Lo que NO se toca son bloom, material, vista y luz. Eso es cómo está puesto
   * el espécimen, no qué panel hay abierto, y volver a mirar no puede rehacer
   * la observación que el visitante acaba de montar.
   *
   * Va en el manejador y no en un efecto sobre `mode` a propósito: esto es la
   * consecuencia de un gesto, no la sincronización de dos estados. Escrito como
   * efecto, React lo señala —con razón— como un re-render en cascada.
   */
  function chooseMode(value: Mode) {
    setMode(value);
    if (value === "observar") {
      setProbe(false);
      setPanel(null);
    }
  }

  function onTabKey(event: React.KeyboardEvent) {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const i = REGISTRO_SECTIONS.findIndex(([key]) => key === section);
    const last = REGISTRO_SECTIONS.length - 1;
    const target =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? last
          : event.key === "ArrowLeft"
            ? Math.max(0, i - 1)
            : Math.min(last, i + 1);
    setSection(REGISTRO_SECTIONS[target][0]);
    // El foco viaja con la selección: es lo que hace que la flecha se sienta
    // navegación y no un atajo que deja el foco atrás.
    const botones = tabsRef.current?.querySelectorAll("button");
    botones?.[target]?.focus();
  }
  const [idle, setIdle] = useState(false);

  /*
    Las marcas de borde son la única capa de atmósfera que vive en el DOM y no
    en el shader, así que el banco visual hay que leerlo también aquí.

    Va por `useSyncExternalStore` y no por un estado con efecto, que es el
    patrón que ya usa `lib/effects-mode.ts` para lo mismo: las rutas son
    estáticas, el servidor nunca ve el almacenamiento local, y la instantánea
    de servidor —producción, marcas puestas— re-renderiza tras la hidratación
    sin provocar mismatch.

    La suscripción no hace nada a propósito: el banco NO es reactivo. Se lee al
    montar y no vuelve a mirarse, igual que en la escena.
  */
  const marks = useSyncExternalStore(
    () => () => {},
    () => readVisualBench().atmosphere.marks,
    () => true,
  );

  /**
   * Vuelca la telemetría en el DOM.
   *
   * Se llama desde el bucle de la escena y también al abrir el panel `DATOS`,
   * y ésa segunda llamada no es redundancia: el bucle es BAJO DEMANDA, así que
   * con el instrumento quieto no llega ningún fotograma y el panel se abriría
   * con los huecos vacíos.
   */
  function writeReadouts(measured: ObservationTelemetry) {
    telemetry.current = measured;
    /* Los mismos valores viven en dos sitios —la lectura de la consola y el
       panel `DATOS`— y se escriben en los dos de una vez. Dos huecos, una
       fuente: si alguna vez discreparan, uno de los dos estaría mintiendo. */
    const write = (key: string, value: string) => {
      for (const slot of [key, `panel-${key}`]) {
        const node = readouts.current[slot];
        if (node) node.textContent = value;
      }
    };
    write("azimuth", `${fixed(measured.azimuth, 1)}°`);
    write("elevation", `${signed(measured.elevation, 1)}°`);
    write("distance", fixed(measured.distance, 2));
    write("fov", `${fixed(measured.fov, 0)}°`);
    /*
      LO QUE NO SE MIDE NO SE ESCRIBE.

      `key` y las dos lecturas del raymarch son opcionales porque describen
      cosas que no todos los especímenes tienen: el ángulo de clave no existe
      donde la luz es el propio objeto, y la mezcla temporal no existe donde no
      hay integrador. Rellenar el hueco con un cero habría sido más corto y
      habría convertido una ausencia en una medición falsa, que es justo lo que
      el §8 prohíbe.
    */
    if (measured.key !== undefined) write("key", `${fixed(measured.key, 1)}°`);
    if (measured.blend !== undefined) {
      write("blend", fixed(measured.blend, 3));
    }
    if (measured.accumulated !== undefined) {
      write("accumulated", String(measured.accumulated));
    }

    if (measured.key === undefined || measured.roll === undefined) return;

    /*
      Y LOS DIALES DE LA LUZ SE MUEVEN SOLOS.

      Orbitar cambia la geometría de la luz —la lámpara es el origen del mundo,
      así que rodear el espécimen es cambiar de dónde le llega la clave— y los
      dos mandos lo reflejan en el mismo fotograma. Es la diferencia entre un
      dial y una casilla: éste sabe lo que está pasando aunque no lo toques.
    */
    const { key: measuredKey, roll: measuredRoll } = measured;
    light.current = { key: measuredKey, roll: measuredRoll };
    const dialled = (slot: "key" | "roll", value: number) => {
      const node = dials.current[slot];
      if (node && grab.current !== slot) node.value = String(Math.round(value));
    };
    dialled("key", measuredKey);
    const keyed = readouts.current["dial-key"];
    if (keyed) keyed.textContent = `${fixed(measuredKey, 1)}°`;
    /* El giro sólo existe fuera del eje de mirada: con la luz casi alineada con
       la cámara su posición en el reloj de la pantalla es ruido, y el dial
       conserva el último valor con sentido en vez de temblar. */
    if (measuredKey > ROLL_FLOOR && measuredKey < 180 - ROLL_FLOOR) {
      dialled("roll", measuredRoll);
      const rolled = readouts.current["dial-roll"];
      if (rolled) rolled.textContent = `${signed(measuredRoll, 0)}°`;
    }
  }

  /**
   * La lectura de la sonda y su retícula.
   *
   * La retícula vive en el DOM y no en WebGL: cuatro marcas de un píxel no
   * justifican una pasada de render, y en el DOM se pueden hacer tan discretas
   * como pide el encargo sin pelearse con el bloom.
   *
   * ── Y la lectura va PEGADA a la retícula ───────────────────────────────────
   *
   * En V1.5 la lectura de la sonda salía arriba a la izquierda, a seis líneas
   * de distancia del punto señalado. Técnicamente funcionaba —se midió: 136
   * aciertos en un barrido de 288 posiciones— y aun así el veredicto fue «la
   * sonda no sé qué hace, no funciona». Tenía razón: una medición que aparece
   * lejos de lo que se está midiendo no es una medición, es un mensaje. Ahora
   * el rótulo sale junto a la arista y se voltea al acercarse al canto derecho
   * de la pantalla, que es lo que hace cualquier instrumento que etiqueta algo.
   */
  function writeProbe(reading: ProbeReading | null) {
    const line = readouts.current.probe;
    const mark = reticle.current;
    if (mark) {
      mark.dataset.on = reading ? "true" : "false";
      if (reading) {
        mark.style.transform = `translate(${reading.screen.x}px, ${reading.screen.y}px)`;
        mark.dataset.side =
          reading.screen.x > (canvasRef.current?.clientWidth ?? 0) * 0.72
            ? "left"
            : "right";
      }
    }
    if (!line) return;
    line.textContent = reading
      ? `${probeEdge.current(pad(reading.edge + 1), AXIS_LABELS[reading.axis] ?? "?")} · W ${fixed(reading.depth, 2)} · ${fixed(reading.range, 2)} r`
      : "";
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || flat) return;

    let cancelled = false;
    let handle: ObservatoryHandle | null = null;

    // Igual que la escena persistente: three.js entra por `import()` y jamás en
    // la carga inicial de la ruta.
    void import("@/components/scene/observatory-scene")
      .then(({ createObservatoryScene }) => {
        if (cancelled) return;
        handle = createObservatoryScene({
          canvas,
          world: { id, visual, accent, secondary, placement },
          motion: motionRef.current,
          /*
            El nivel de calidad del raymarch. Sólo lo mira Gargantúa, y sale del
            MISMO veredicto que decide si hay escena: preguntarle otra vez al
            navegador daría dos respuestas que pueden discrepar.
          */
          tier,
          // El aviso puede llegar después de desmontar —el bucle sigue vivo un
          // fotograma— así que la guarda es la misma bandera del import.
          onFirstFrame: () => {
            if (!cancelled) setReady(true);
          },
          onTelemetry: (measured) => {
            if (!cancelled) writeReadouts(measured);
          },
          onProbe: (reading) => {
            if (!cancelled) writeProbe(reading);
          },
        });
        if (!handle) {
          setFailed(true);
          return;
        }
        handleRef.current = handle;
        setContract(handle.contract);
        setViews(handle.views);
        setCanProbe(handle.canProbe);
        setInstruments(handle.instruments);
        setHasLight(typeof handle.setLight === "function");
        setHasTurn(typeof handle.setTurn === "function");
        setCanOrbit(handle.canOrbit);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      handle?.dispose();
      handleRef.current = null;
    };
    // `flat` entra en las dependencias a propósito: en la hidratación el nivel
    // todavía es la instantánea de servidor, así que el primer pase no monta
    // nada. Sin esto, el re-render que trae el veredicto real no volvería a
    // llamar al efecto y el visor se quedaría vacío en un equipo perfectamente
    // capaz.
  }, [flat, tier, id, visual, accent, secondary, placement]);

  useEffect(() => {
    // La ref se sincroniza AQUÍ y no durante el render: escribirla al renderizar
    // es un error real, no un capricho del linter — React puede renderizar sin
    // llegar a confirmar, y la escena acabaría montándose con un valor que el
    // visitante nunca eligió.
    motionRef.current = motion;
    handleRef.current?.setMotion(motion);
  }, [motion]);

  useEffect(() => {
    handleRef.current?.setBloom(bloom && holding !== "bloom");
  }, [bloom, holding]);

  useEffect(() => {
    handleRef.current?.setEmission?.(emission && holding !== "material");
  }, [emission, holding]);

  /* Los tres interruptores de física, propagados de una vez: son la misma clase
     de gesto y separarlos en tres efectos sólo multiplicaría las llamadas. */
  useEffect(() => {
    const set = handleRef.current?.setPhysics;
    if (!set) return;
    set("uDoppler", physics.doppler);
    set("uSecondary", physics.secundarias);
    set("uSkyLens", physics.lente);
  }, [physics]);

  useEffect(() => {
    handleRef.current?.setView(view);
  }, [view]);

  useEffect(() => {
    handleRef.current?.setProbe(probe);
  }, [probe]);

  /*
    La cifra del eje, al encender.

    Los otros dos diales los rellena el primer fotograma de telemetría, porque
    son lecturas. Éste no lo es: su valor sólo cambia cuando alguien lo pide, y
    sin esta línea el hueco de la cifra se quedaría vacío hasta el primer
    arrastre — un mando con la casilla en blanco al lado de dos que ya llevan
    número parece roto antes de que nadie lo toque.

    `writeTurn` no entra en las dependencias a propósito: se redefine en cada
    render, así que listarla volvería a disparar el efecto en cada render. Lo
    que hace es escribir en dos nodos que ya existen, y sólo depende de que la
    fila exista.
  */
  useEffect(() => {
    if (hasTurn) writeTurn(0);
  }, [hasTurn]);

  /* Al abrir `DATOS` hay que rellenar sus huecos a mano: el bucle es bajo
     demanda y con el instrumento quieto no va a llegar ningún fotograma. */
  useEffect(() => {
    if (panel === "datos" && telemetry.current) writeReadouts(telemetry.current);
    /* `writeReadouts` no entra en las dependencias a propósito: se redefine en
       cada render, así que listarla volvería a disparar el efecto en cada
       render. Lo que hace es escribir texto en huecos que ya existen, y sólo
       depende de qué panel está abierto. */
  }, [panel, contract]);

  /* Modo cine. No es movimiento —es foco—, así que no obedece al interruptor
     global; y con puntero grueso no se atenúa, porque sin hover no habría forma
     barata de recuperar la instrumentación. */
  useEffect(() => {
    /*
      Sin `matchMedia` NO hay modo cine, y ese respaldo tiene dirección: el modo
      cine esconde los controles, así que la duda se resuelve dejándolos a la
      vista. Apagarlos en un entorno donde ni siquiera se puede preguntar por el
      tipo de puntero sería esconder la instrumentación a alguien que quizá no
      tenga hover para recuperarla.

      Es la misma guarda que ya lleva la galería de Edmunds
      (`edmunds-gallery.tsx:117`); este archivo era el único que preguntaba sin
      preguntar primero.
    */
    const coarse = window.matchMedia?.("(pointer: coarse)");
    if (!coarse || coarse.matches) return;
    let timer = 0;
    const wake = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), IDLE_MS);
    };
    wake();
    for (const event of ["pointermove", "pointerdown", "keydown", "wheel"]) {
      window.addEventListener(event, wake, { passive: true });
    }
    return () => {
      window.clearTimeout(timer);
      for (const event of ["pointermove", "pointerdown", "keydown", "wheel"]) {
        window.removeEventListener(event, wake);
      }
    };
  }, []);

  /*
    RESPALDO PLANO (§9 / O7).

    No es el visor apagado: es otra página. El visor normal es `fixed; inset:0`
    y TAPA el HTML servido —el título, el resumen y la vuelta al índice—, cosa
    que no importa cuando hay un espécimen en 3D encima porque ésa es la
    experiencia. En `flat` sí importa: si tapara la ficha, alguien con un equipo
    modesto se quedaría con una pantalla negra en vez de con la página.

    Así que aquí no se monta el contenedor a pantalla completa. El dibujo SVG
    del cuerpo entra en el flujo y la ficha servida se ve encima, que es
    exactamente lo que pide el §9: espécimen y ficha completa, nunca una página
    rota.
  */
  if (flat) {
    return <div className="observatory__flat">{children}</div>;
  }

  /**
   * La pista, y es el ÚNICO sitio donde el aparato habla.
   *
   * Un rótulo que dice cuatro cosas distintas en cuatro momentos distintos no
   * son cuatro rótulos: es lo que permite no tener una capa de avisos encima
   * del espécimen. Dice siempre lo que se puede hacer AHORA, que además es
   * distinto en cada modo — y por eso el sitio donde sobraba una instrucción
   * permanente es justo donde cabe esto.
   */
  const hint = holding ? (
    <>
      {t.canonical}
      <span aria-hidden="true" className="observatory__sep">
        |
      </span>
      {holding === "bloom" ? t.noBloom : t.noEmission}
    </>
  ) : probe ? (
    <>{t.probeHint}</>
  ) : mode === "estudio" ? (
    <>{t.studyHint}</>
  ) : canOrbit ? (
    /*
      «Orbitar» y no «girar», y el cambio de palabra lo obligó el mando `EJE`.

      Hasta ahora las dos cosas eran la misma porque sólo había una: arrastrar
      movía la cámara y en la pantalla el espécimen daba vueltas. Desde que se
      puede girar la FIGURA sobre su eje —dejando la luz donde está— llamar
      «girar» al arrastre haría que dos gestos distintos se anunciaran igual, y
      el que se enseña aquí es justo el que NO conserva la iluminación.
    */
    <>
      {t.orbit}
      {/* En táctil no hay rueda ni pellizco: la pista no promete un gesto
          que no existe (observatory.css, `observatory__wheel`). */}
      <span className="observatory__wheel">
        <span aria-hidden="true" className="observatory__sep">
          ·
        </span>
        {t.zoom}
      </span>
    </>
  ) : (
    /*
      Gargantúa no se arrastra, así que su pista no puede decirlo. Lo que dice
      en su lugar es lo único que sí se puede hacer desde el reposo — y es una
      frase que además explica por qué: aquí se ELIGE un punto de vista de una
      lista, no se busca uno.
    */
    <>
      {t.fourViews}
      <span aria-hidden="true" className="observatory__sep">
        ·
      </span>
      {t.study}
    </>
  );

  return (
    <div
      className="observatory"
      data-idle={idle ? "true" : "false"}
      /*
        EL MODO, publicado en el DOM.

        Toda la diferencia entre mirar y medir cuelga de este atributo en la
        hoja de estilo, y no de cinco condiciones de JavaScript repartidas por
        el árbol: la consola existe siempre en el DOM y `ESTUDIO` es lo que la
        despliega. Así el cambio de modo no monta ni desmonta un solo nodo, y
        los mandos conservan su estado al ir y volver.
      */
      data-mode={mode}
      /* El modo lectura de móvil cuelga de aquí: con un panel abierto se
         retiran la consola y el paso entre muestras, y la ficha pasa a ser una
         hoja inferior. */
      data-panel={panel ?? "none"}
      /* La sonda cambia el cursor del lienzo: señalar y girar son dos gestos y
         el puntero es el único sitio donde eso se puede decir sin una palabra. */
      data-probe={probe ? "true" : "false"}
      /*
        EL ESTADO DEL APARATO, publicado en el DOM.

        `standby` mientras no hay imagen: manda la cara servida y toda la
        instrumentación está apagada e `inert`. `nominal` cuando el primer
        fotograma ya se pintó. Un fallo de montaje se queda en `standby` para
        siempre, que es lo correcto — no hay nada que instrumentar y la cara
        servida sigue siendo una página terminada, con su salida.
      */
      data-state={ready ? "nominal" : "standby"}
    >
      {failed ? null : (
        <canvas
          aria-hidden="true"
          className="observatory__canvas"
          ref={canvasRef}
        />
      )}

      {/*
        La cara servida, DENTRO del instrumento y no debajo de él.

        Mientras el aparato está en espera es la única superficie viva: se ve,
        se lee y su salida funciona. Al encenderse el instrumento se apaga y
        sale del árbol de accesibilidad con `inert` — si se quedara, habría dos
        enlaces de salida y dos nombres de espécimen a la vez, y quien navega
        con tabulador encontraría una parada invisible bajo un canvas opaco.
      */}
      <div
        aria-hidden={ready ? "true" : undefined}
        className="observatory__served"
        inert={ready}
      >
        {children}
      </div>

      {/*
        LA RETÍCULA DE LA SONDA, y su lectura.

        Cuatro marcas de un píxel alrededor del punto, un hueco en medio y un
        rótulo de una línea al lado. El hueco es la pieza: una cruz completa
        tapa justo lo que se señala y un círculo convierte el instrumento en una
        mira. Vive en el DOM porque cuatro trazos no justifican una pasada de
        render, y porque en WebGL tendrían que pelearse con el bloom para
        quedarse discretas.
      */}
      <div
        aria-hidden="true"
        className="observatory__reticle"
        data-on="false"
        data-side="right"
        ref={reticle}
      >
        <span className="observatory__mark" />
        <span className="observatory__mark" />
        <span className="observatory__mark" />
        <span className="observatory__mark" />
        <span
          className="observatory__probe-line"
          ref={(node) => {
            readouts.current.probe = node;
          }}
        />
      </div>

      {/*
        Instrumentación de borde: el tercer ingrediente de la atmósfera.

        Va como HERMANO del cromo y no como hijo, y eso no es cosmética. El
        cromo es `flex-direction: column; justify-content: space-between` y su
        invariante está escrita en la hoja: «sólo tiene dos hijos, así que
        `space-between` no puede dejar nada a media altura». Un tercer hijo
        caería justo en el centro, encima del espécimen.

        Marcas de 1 px y nada más. Sin texto, y eso es deliberado: el encargo
        veta las coordenadas falsas, y cualquier rótulo aquí —un índice, una
        lectura, un `ACQ`— sería o un dato inventado o el raíl de seis
        especímenes entrando por la puerta de atrás.
      */}
      {marks ? (
        <div aria-hidden="true" className="observatory__calipers">
          <span className="observatory__caliper observatory__caliper--tl" />
          <span className="observatory__caliper observatory__caliper--tr" />
          <span className="observatory__caliper observatory__caliper--bl" />
          <span className="observatory__caliper observatory__caliper--br" />
          <span className="observatory__fiducial" />
          <span className="observatory__ticks" />
        </div>
      ) : null}

      {/*
        EL CATÁLOGO, hermano del cromo y no hijo — por el mismo motivo que las
        marcas de borde.

        En reposo son seis cifras en el borde; el nombre existe SIEMPRE en el
        árbol de accesibilidad y sólo se revela al apuntar, enfocar o estar
        activo. Por eso se oculta con opacidad y posición absoluta y nunca con
        `display: none` ni `visibility: hidden`, que lo sacarían del nombre
        accesible del enlace y dejarían seis enlaces llamados «01».
      */}
      <nav aria-label={t.specimens} className="observatory__rail" inert={!ready}>
        <ol>
          {rail.map((slot) => {
            const activo = slot.id === id;
            const cifra = (
              <span aria-hidden="true" className="observatory__slot-index">
                {pad(slot.index)}
              </span>
            );
            const rotulo = (
              <span className="observatory__slot-name">{slot.name}</span>
            );
            return (
              <li key={slot.id}>
                {slot.href ? (
                  <Link
                    aria-current={activo ? "page" : undefined}
                    className="observatory__slot"
                    href={slot.href}
                  >
                    {cifra}
                    {rotulo}
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    className="observatory__slot observatory__slot--off"
                  >
                    {cifra}
                    {rotulo}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/*
        El cromo entero espera al primer fotograma.

        No es una cortesía visual: mientras el aparato está en espera manda la
        cara servida, y las dos superficies dicen las mismas cosas —el nombre
        del espécimen, su sitio en el catálogo, la salida—. Dejar las dos vivas
        duplicaría cada nombre accesible y pondría dos salidas en el tabulador.
      */}
      <div className="observatory__chrome" inert={!ready}>
        {/*
          LA CABECERA, reducida a lo que contesta «dónde estoy».

          Tenía seis líneas: estado del aparato, paso de catálogo, nombre,
          descriptor, cuatro lecturas de telemetría y la línea de la sonda. Ahora
          tiene dos —cifra y nombre—, y el descriptor sólo aparece con la consola
          desplegada.

          Lo demás no se ha borrado, se ha MUDADO a donde sirve: la telemetría a
          la consola, porque contesta «cómo estoy mirando» y ésa es una pregunta
          que sólo existe mientras se opera; la lectura de la sonda, junto a la
          arista que señala. Y el punto ámbar dice `NOMINAL` sin gastar la
          palabra: la cara servida ya la enseña en grande mientras hace falta.
        */}
        <div className="observatory__head">
          <div className="observatory__identity">
            <div className="observatory__step">
              {previous ? (
                <Link className="observatory__step-arrow" href={previous.href!}>
                  <span aria-hidden="true">‹</span>
                  <span className="sr-only">
                    {t.previous} {previous.name}
                  </span>
                </Link>
              ) : (
                <span
                  aria-hidden="true"
                  className="observatory__step-arrow observatory__step-arrow--off"
                >
                  ‹
                </span>
              )}
              <p className="observatory__index">
                <span aria-hidden="true" className="observatory__state-dot" />
                <span className="sr-only">
                  {t.specimen(position, rail.length)}
                </span>
                <span aria-hidden="true">
                  {pad(position)}
                  <span className="observatory__sep">/</span>
                  {pad(rail.length)}
                </span>
              </p>
              {next ? (
                <Link className="observatory__step-arrow" href={next.href!}>
                  <span aria-hidden="true">›</span>
                  <span className="sr-only">{t.next} {next.name}</span>
                </Link>
              ) : (
                <span
                  aria-hidden="true"
                  className="observatory__step-arrow observatory__step-arrow--off"
                >
                  ›
                </span>
              )}
            </div>
            {/*
              Encendido, el nombre del espécimen ES el título de la página: la
              cara servida —y su h1— sale del árbol con `inert`, y sin esto
              quien navega por encabezados no encontraba ninguno. En espera el
              h1 sigue siendo el de la cara servida: nunca hay dos a la vez.
            */}
            {ready ? (
              <h1 className="observatory__specimen">{name}</h1>
            ) : (
              <p className="observatory__specimen">{name}</p>
            )}
            <p className="observatory__descriptor">{descriptor}</p>
          </div>

          {/*
            La salida, sola. El rastro `EXPERIMENTOS / OBSERVATORIO` se retira en
            este pase: estaba al 20 % de opacidad repitiendo lo que el enlace de
            debajo ya dice entero, y en una esquina donde sobraba texto.

            Se lee completa y dice a dónde va. El nombre accesible y el texto
            visible son la misma frase, que es lo que necesita quien dicta por
            voz.
          */}
          <div className="observatory__exit">
            <Link className="observatory__back" href={indexHref}>
              <span aria-hidden="true" className="observatory__arrow">
                ←
              </span>
              <span className="observatory__ink">{t.exit}</span>
            </Link>
            {articleHref ? (
              <Link className="observatory__back observatory__read" href={articleHref}>
                <span className="observatory__ink">{t.read}</span>
                <span aria-hidden="true" className="observatory__arrow">
                  →
                </span>
              </Link>
            ) : null}
          </div>
        </div>

        <div className="observatory__foot">
          {/* El panel se abre HACIA ARRIBA, sobre la consola que lo enciende: la
              bandeja se queda anclada abajo y los datos crecen hacia el hueco,
              no hacia fuera del cuadro. */}
          {panel === "datos" && contract ? (
            <div className="observatory__data">
              <SheetHead title={t.data} onClose={() => setPanel(null)} />
              {/*
                TRES FAMILIAS, Y EL ORDEN ES LA LECTURA.

                Qué estoy viendo → cómo lo estoy observando → cómo está
                construido. La separación es la regla de siempre: lo que ES la
                figura, cómo se está MIRANDO y lo que cuesta DIBUJARLA son tres
                cosas distintas, y juntarlas ya produjo una vez dos filas
                llamadas «vértices» con valores distintos.
              */}
              {contract.architecture ? (
                <section>
                  <h2 className="observatory__legend">{t.object}</h2>
                  <dl>
                    {Object.entries(contract.architecture).map(
                      ([key, value]) => (
                        <div key={key}>
                          <dt>{architectureLabel(key, locale)}</dt>
                          <dd>{value}</dd>
                        </div>
                      ),
                    )}
                  </dl>
                </section>
              ) : null}

              <section>
                <h2 className="observatory__legend">{t.observation}</h2>
                <dl>
                  {views.length > 1 ? (
                    <div>
                      <dt>{labels.observation.view}</dt>
                      <dd>{views[view] ? viewText(world.id, views[view], locale).label : null}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>{labels.observation.azimuth}</dt>
                    <dd>{readout("", "panel-azimuth")}</dd>
                  </div>
                  <div>
                    <dt>{labels.observation.elevation}</dt>
                    <dd>{readout("", "panel-elevation")}</dd>
                  </div>
                  <div>
                    <dt>{labels.observation.distance}</dt>
                    <dd>
                      {readout("", "panel-distance")}
                      <span className="observatory__unit"> {t.radii}</span>
                    </dd>
                  </div>
                  {/* El ángulo de clave sólo donde hay clave que medir. En
                      Gargantúa la luz es el propio objeto, así que la fila
                      entera se va en vez de enseñar un cero. */}
                  {hasLight ? (
                    <div>
                      <dt>{labels.observation.key}</dt>
                      <dd>{readout("", "panel-key")}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>{labels.observation.fov}</dt>
                    <dd>{readout("", "panel-fov")}</dd>
                  </div>
                </dl>
              </section>

              <section>
                <h2 className="observatory__legend">{t.render}</h2>
                <dl>
                  {/*
                    LO QUE DEFINE A UN OBJETO SIN MALLA.

                    Las tres cifras de abajo dicen la verdad sobre Gargantúa y
                    no dicen nada: un cuad de pantalla completa es un cuad. Lo
                    que de verdad la describe —dónde está su horizonte, hasta
                    dónde llega su disco, cuántos pasos da el integrador y
                    cuántos fotogramas lleva promediados— es esto, y sale del
                    mismo código que lo usa: los radios del módulo de shaders,
                    los pasos del `define` con el que se compila el material y
                    la mezcla leída del uniform que el bucle acaba de escribir.
                  */}
                  {contract.raymarch ? (
                    <>
                      <div>
                        <dt>{labels.raymarch.rs}</dt>
                        <dd>{fixed(contract.raymarch.rs, 2)}</dd>
                      </div>
                      <div>
                        <dt>{labels.raymarch.disk}</dt>
                        <dd>
                          {fixed(contract.raymarch.diskInner, 2)} –{" "}
                          {fixed(contract.raymarch.diskOuter, 0)}
                          <span className="observatory__unit"> rs</span>
                        </dd>
                      </div>
                      <div>
                        <dt>{labels.raymarch.steps}</dt>
                        <dd>{contract.raymarch.steps}</dd>
                      </div>
                      <div>
                        <dt>{labels.raymarch.blend}</dt>
                        <dd>{readout("", "panel-blend")}</dd>
                      </div>
                      <div>
                        <dt>{labels.raymarch.accumulated}</dt>
                        <dd>{readout("", "panel-accumulated")}</dd>
                      </div>
                    </>
                  ) : null}
                  <div>
                    <dt>{labels.render.draws}</dt>
                    <dd>{contract.draws}</dd>
                  </div>
                  <div>
                    <dt>{labels.render.materials}</dt>
                    <dd>{contract.materials}</dd>
                  </div>
                  <div>
                    <dt>{labels.render.vertices}</dt>
                    <dd>{contract.vertices.toLocaleString("es-DO")}</dd>
                  </div>
                </dl>
              </section>
            </div>
          ) : null}

          {/*
            EL REGISTRO: el mismo hueco, la otra profundidad.

            Comparte caja con `DATOS` a propósito —misma superficie de lectura,
            mismo sitio, misma forma de abrirse— porque las dos son la ficha del
            mismo objeto. Lo que no comparten es la naturaleza: aquélla mide y
            ésta cuenta. Por eso el registro NO lleva ni una cifra.
          */}
          {panel === "registro" && record ? (
            <div className="observatory__data observatory__record">
              <SheetHead title={t.record} onClose={() => setPanel(null)} />
              <div
                aria-label={t.recordSections}
                className="observatory__tabs"
                ref={tabsRef}
                role="tablist"
              >
                {labels.registro.map(([key, label]) => (
                  <button
                    aria-controls={`registro-${key}`}
                    aria-selected={section === key}
                    className="observatory__tab"
                    id={`registro-tab-${key}`}
                    key={key}
                    onClick={() => setSection(key)}
                    onKeyDown={onTabKey}
                    role="tab"
                    /* Tabulador roving: un solo punto de entrada al grupo, y
                       dentro se navega con flechas. Con los cinco a 0 habría
                       cinco paradas antes de llegar al texto. */
                    tabIndex={section === key ? 0 : -1}
                    type="button"
                  >
                    <span className="observatory__ink">{label}</span>
                  </button>
                ))}
              </div>
              <div
                aria-labelledby={`registro-tab-${section}`}
                className="observatory__tabpanel"
                id={`registro-${section}`}
                role="tabpanel"
                /* Enfocable porque puede tener barra de desplazamiento propia:
                   un contenedor con scroll que no recibe foco no se puede
                   recorrer con teclado. */
                tabIndex={0}
              >
                <p>{record[section]}</p>
              </div>
            </div>
          ) : null}

          {/*
            ══ LA CONSOLA ═══════════════════════════════════════════════════

            Todo lo que era una lista de rótulos sueltos pasa a ser un bastidor:
            una columna de nombres de grupo a la izquierda, una regla vertical
            continua y las filas de mandos a la derecha, bajo un alféizar que
            cruza la pantalla. Esa geometría es la que faltaba —«no se siente
            como una nave espacial»— y no cuesta ni un dato inventado: es la
            misma tipografía, el mismo ámbar y las mismas palabras, ordenadas
            como se ordena un panel y no como se ordena una página.

            Existe siempre en el DOM; `ESTUDIO` es lo que la despliega. Va
            `inert` en `OBSERVAR` para que sus mandos no queden en el tabulador
            bajo una capa invisible — el mismo fallo que ya se corrigió una vez
            con la cara servida.
          */}
          <div className="observatory__console" inert={mode !== "estudio"}>
            <div className="observatory__rack">
              {/*
                OBSERVAR: las vistas curadas.

                Una vista NO es un encuadre elegido a ojo: es otra geometría de
                luz sobre el mismo material, resuelta por la misma matemática
                que coloca el preset. Por eso cada una puede decir qué revela, y
                por eso la fila sólo aparece donde hay vistas de verdad.
              */}
              {views.length > 1 ? (
                <div className="observatory__row">
                  <p className="observatory__legend">{t.view}</p>
                  <div className="observatory__slots">
                    <div
                      aria-label={t.views}
                      className="observatory__views"
                      role="radiogroup"
                    >
                      {views.map((option, index) => (
                        <button
                          aria-checked={index === view}
                          className="observatory__view"
                          key={option.id}
                          onClick={() => setView(index)}
                          role="radio"
                          /* Tabulador roving, igual que las pestañas del
                             registro: un punto de entrada y flechas dentro. */
                          tabIndex={index === view ? 0 : -1}
                          type="button"
                        >
                          <span
                            aria-hidden="true"
                            className="observatory__view-index"
                          >
                            {pad(index + 1)}
                          </span>
                          <span className="observatory__ink">
                            {viewText(world.id, option, locale).label}
                          </span>
                        </button>
                      ))}
                    </div>
                    {/*
                      Qué estudia la vista elegida. Es la frase que convierte una
                      cámara en un instrumento: sin ella son tres ángulos, con
                      ella son tres preguntas.
                    */}
                    <p className="observatory__study">{views[view] ? viewText(world.id, views[view], locale).study : null}</p>
                  </div>
                </div>
              ) : null}

              {/*
                LUZ · el instrumento nuevo, y el que de verdad faltaba.

                Aquí no hay una lámpara que arrastrar: la luz ES el origen del
                mundo. Lo que estos dos diales mueven es el espécimen ALREDEDOR
                de ese origen, con la cámara rígidamente enganchada — misma
                cara, mismo encuadre, misma distancia, otra luz. Es la única
                variable que el §6 autoriza a tocar, y hasta ahora sólo se podía
                rozar de refilón orbitando.

                Y los dos son a la vez LECTURA: al orbitar se mueven solos,
                porque rodear el espécimen cambia de dónde le llega la clave. Un
                dial que no sabe lo que está pasando es una casilla con estilo.
              */}
              {/*
                LUZ, y la única muestra que no la tiene.

                Este instrumento gira el espécimen alrededor del origen del
                mundo para barrer su iluminación sin mover el encuadre. En
                Gargantúa el espécimen ES el origen y la luz es su propio disco,
                así que no hay nada que girar: la fila entera desaparece en vez
                de quedarse con dos diales que no obedecen. Es el §5 —el
                laboratorio adapta sus instrumentos a la muestra— aplicado a lo
                más visible de la consola.
              */}
              {hasLight ? (
              <div className="observatory__row">
                <p className="observatory__legend">{t.light}</p>
                <div className="observatory__dials">
                  {/*
                    `CLAVE` va de 0 a 180 porque es un ángulo entre dos
                    direcciones: frontal plana en un extremo, contraluz en el
                    otro, y no existe nada fuera de esa banda. `GIRO` es un
                    reloj completo y va de −180 a 180 — con el mínimo en cero,
                    media vuelta de la luz quedaba recortada contra el tope y el
                    mando mentía sobre lo que puede hacer.
                  */}
                  {dial("key", labels.dials.key, labels.light.key, 0, 180)}
                  {dial("roll", labels.dials.roll, labels.light.roll, -180, 180)}
                </div>
              </div>
              ) : null}

              {/*
                FIGURA · el tercer gesto, y el que Jonás echó en falta.

                El laboratorio ya dejaba ver otra cara —arrastrando— y ya dejaba
                cambiar la luz —con `LUZ`—, pero no las dos cosas por separado:
                como la lámpara ES el origen del mundo, rodear el espécimen
                cambia la cara Y la clave a la vez. Este dial es el único que
                enseña otro lado del cuerpo dejando la iluminación intacta, y
                por eso es el que contesta la pregunta de un catálogo: «¿qué hay
                en la otra mitad?».

                Lo que enseña cada uno no es retórico. La Endurance gira sobre
                el eje de su aro, así que los doce módulos desfilan; la Ranger
                alabea sobre su eje proa-popa y saca el vientre, que desde la
                pose del preset no se ve nunca; y los dos planetas giran sobre
                su polo, que es la ÚNICA forma de ver las provincias minerales
                de Edmunds o las corrientes de Miller que caen al otro lado.

                Falta en dos muestras y por motivos de distinta clase: Gargantúa
                no tiene malla, y el Tesseracto tiene su lectura entera en la
                orientación de reposo —el eje de la recursión enfilado a la
                cámara— así que girarlo no ofrece otra cara, le quita la suya.
              */}
              {hasTurn ? (
                <div className="observatory__row">
                  <p className="observatory__legend">{t.figure}</p>
                  <div className="observatory__dials">
                    {/*
                      De −180 a 180 y no de 0 a 360, aunque la vuelta sea la
                      misma: así el reposo cae en el CENTRO del recorrido. El
                      visitante ve de un vistazo cuánto se ha alejado de la pose
                      que encuadra el preset, y llega a cualquier cara en un
                      solo arrastre hacia el lado que le pille más cerca. Con el
                      cero en el tope izquierdo, media figura quedaba a una
                      travesía entera del mando.
                    */}
                    {dial("turn", labels.dials.turn, labels.turn, -180, 180)}
                  </div>
                </div>
              ) : null}

              {/*
                CÁMARA: dónde se ha sentado el visitante.

                Baja aquí desde la cabecera, y el sitio es la mitad del
                argumento: azimut, elevación y distancia contestan «cómo estoy
                mirando», que es una pregunta que sólo existe mientras se opera.
                Arriba, junto al nombre, eran tres números permanentes sobre un
                espécimen que no los necesita para presentarse.

                La distancia va en RADIOS del propio espécimen: las unidades de
                mundo son radios de Schwarzschild del sistema y aquí no
                significan nada, mientras que «a tres radios y medio del objeto»
                sí es una distancia de observación.

                `aria-hidden` porque cambia hasta sesenta veces por segundo y
                nadie puede seguir eso escuchando. Los mismos valores están en
                `DATOS`, quietos y con su nombre entero, que es donde sirven.
              */}
              <div className="observatory__row">
                <p className="observatory__legend">{t.camera}</p>
                <p aria-hidden="true" className="observatory__readout">
                  {readout("AZ", "azimuth")}
                  {readout("EL", "elevation")}
                  {readout("DIST", "distance", "r")}
                </p>
              </div>

              <div className="observatory__row observatory__inspect">
                <p className="observatory__legend">{t.inspect}</p>
                <div className="observatory__bank">
                  <Instrument
                    label="Bloom"
                    pressed={!bloom || holding === "bloom"}
                    onToggle={() => setBloom((on) => !on)}
                    onHold={(held) => setHolding(held ? "bloom" : null)}
                  />
                  {/*
                    MATERIAL sólo donde hay material que aislar. `uEmission`
                    vive en el shader común de los cuerpos: Miller y Edmunds no
                    escriben término emisivo y Gargantúa no tiene malla, así que
                    sobre los tres el botón no cambiaría un píxel. El criterio
                    de siempre: un mando que no hace nada es peor que ausente.
                  */}
                  {instruments.includes("material") ? (
                    <>
                      <span aria-hidden="true" className="observatory__div" />
                      <Instrument
                        label="Material"
                        pressed={!emission || holding === "material"}
                        onToggle={() => setEmission((on) => !on)}
                        onHold={(held) => setHolding(held ? "material" : null)}
                      />
                    </>
                  ) : null}
                  {/*
                    LOS TRES DE GARGANTÚA.

                    No son instrumentos inventados para llenar la fila: son
                    ramas que llevan escritas en el fragmento desde que se
                    escribió y que hasta este pase valían 1 y no tocaba nadie.
                    Cada una retira una pieza de física concreta —el beaming
                    relativista y la asimetría entre los dos lados, las imágenes
                    de orden superior, la curvatura del campo estelar— y las
                    tres son reversibles y están etiquetadas, que es lo que la
                    cláusula de inspección del §6 exige de un diagnóstico.

                    Van sin pulsación sostenida: su A/B no es un vistazo de
                    medio segundo, es mirar la imagen con y sin la pieza. La
                    comparación por pulsación se queda donde nació, en los dos
                    mandos cuyo efecto se lee de un golpe.
                  */}
                  {PHYSICS.filter((key) => instruments.includes(key)).map(
                    (key) => (
                      <Fragment key={key}>
                        <span aria-hidden="true" className="observatory__div" />
                        <Instrument
                          label={t.physics[key]}
                          pressed={!physics[key]}
                          onToggle={() =>
                            setPhysics((on) => ({ ...on, [key]: !on[key] }))
                          }
                        />
                      </Fragment>
                    ),
                  )}
                  {/*
                    LA SONDA sólo aparece donde se puede nombrar lo que se
                    señala. Hoy es el Tesseracto y nada más: su topología la
                    publica `lib/tesseract.ts` y su pose sale de una función pura
                    que se puede volver a evaluar con los mismos segundos. Sobre
                    la Endurance una sonda sólo podría decir «un triángulo», que
                    no es un instrumento: es un inspector.
                  */}
                  {canProbe ? (
                    <>
                      <span aria-hidden="true" className="observatory__div" />
                      <Instrument
                        label={t.probe}
                        pressed={probe}
                        onToggle={() => setProbe((on) => !on)}
                      />
                    </>
                  ) : null}
                  <span aria-hidden="true" className="observatory__div" />
                  <Instrument
                    label={t.data}
                    pressed={panel === "datos"}
                    onToggle={() =>
                      setPanel((abierto) =>
                        abierto === "datos" ? null : "datos",
                      )
                    }
                  />
                  {/*
                    `REGISTRO` sólo existe donde hay registro escrito, y por eso
                    no entra en `preset.instruments`: aquella lista dice qué
                    puede hacer la ESCENA con el cuerpo, y esto no es una
                    capacidad de la escena, es contenido.
                  */}
                  {record ? (
                    <>
                      <span aria-hidden="true" className="observatory__div" />
                      <Instrument
                        label={t.record}
                        pressed={panel === "registro"}
                        onToggle={() =>
                          setPanel((abierto) =>
                            abierto === "registro" ? null : "registro",
                          )
                        }
                      />
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/*
            LA BARRA DEL APARATO: el selector de modo, la pista y `Reajustar`.

            Es lo único que sigue estando en los dos modos, y por eso lleva el
            único gesto que cambia de qué va la pantalla. Se lee como un
            selector de hardware —dos posiciones con su muesca— y no como dos
            pestañas: las pestañas cambian de contenido, y aquí lo que cambia es
            lo que se está haciendo con el mismo objeto.
          */}
          <div className="observatory__controls">
            <div
              aria-label={t.mode}
              className="observatory__modes"
              role="radiogroup"
            >
              {(
                [
                  ["observar", t.observe],
                  ["estudio", t.study],
                ] as const
              ).map(([value, label]) => (
                <button
                  aria-checked={mode === value}
                  className="observatory__mode"
                  key={value}
                  onClick={() => chooseMode(value)}
                  role="radio"
                  tabIndex={mode === value ? 0 : -1}
                  type="button"
                >
                  <span aria-hidden="true" className="observatory__detent" />
                  <span className="observatory__ink">{label}</span>
                </button>
              ))}
            </div>

            {/* La palabra va envuelta porque el filete del foco se agarra a la
                TINTA y no al bloque de 44 px: sin este span, un mando sin caja
                se queda sin indicador de foco. */}
            <button
              type="button"
              className="observatory__button"
              onClick={() => {
                /*
                  REAJUSTAR TIENE QUE DEVOLVER TAMBIÉN EL RÓTULO.

                  `reset()` lleva el instrumento a la pose del preset, que es la
                  vista 01. La interfaz, en cambio, se quedaba marcando la que
                  el visitante hubiera elegido: el mando decía `SOMBRA`, la
                  frase de debajo explicaba qué estudia `SOMBRA`, y la cámara
                  estaba en la canónica.

                  Se destapó montando Gargantúa —donde las vistas SON la
                  interacción y la telemetría delata la pose, 42 radios y 9° de
                  elevación contra los 34 y 12° que prometía el rótulo— pero el
                  defecto era de los cinco sólidos también: allí `reset()`
                  restaura la esférica de casa y nadie tocaba `view`. Sólo que
                  con una figura que se puede orbitar a mano, una discrepancia
                  entre el rótulo y la pose se lee como «la vista era
                  aproximada» en vez de como un error.
                */
                handleRef.current?.reset();
                setView(0);
                /*
                  Y el dial del eje vuelve al centro. El instrumento ya devolvió
                  la figura —`reset()` la pone en su orientación de reposo— así
                  que esto no gira nada: sincroniza el mando con lo que se está
                  viendo. Sin esta línea, `Reajustar` dejaba un dial en +140
                  sobre una figura sin girar, que es la misma clase de mentira
                  que el rótulo de vista que este botón ya tuvo que aprender a
                  devolver.
                */
                writeTurn(0);
              }}
            >
              <span className="observatory__ink">{t.reset}</span>
            </button>

            <p className="observatory__hint" data-comparing={holding ?? "none"}>
              {hint}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
