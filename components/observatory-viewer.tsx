"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { WorldId, WorldStructuralData } from "@/content/worlds.data";
import {
  useForcedEffects,
  useLightEffectsMode,
  useMotionEnabled,
} from "@/lib/effects-mode";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { readVisualBench } from "@/lib/visual-bench";
import type { ObservatoryHandle } from "@/components/scene/observatory-scene";
import type { SpecimenContract } from "@/components/scene/specimen-contract";
import {
  evaluateCapabilities,
  readSignals,
} from "@/components/scene/capability";
import {
  architectureLabel,
  REGISTRO_SECTIONS,
  RENDER_LABELS,
} from "./observatory-labels";
import "./observatory.css";

/**
 * El visor del Observatorio.
 *
 * El canvas es `aria-hidden` y **nunca es la única representación**: el HTML
 * servido de esta ruta ya trae el nombre del espécimen y su ficha, y esto se
 * monta encima. Sin JavaScript, sin WebGL2 o en perfil ligero, lo que queda es
 * ese contenido — no una página rota.
 *
 * La instrumentación se atenúa tras unos segundos sin entrada y vuelve con
 * cualquier gesto: es el modo cine de Edmunds, con la misma constante. Es lo
 * que permite tener vocabulario de laboratorio sin encajonar al espécimen.
 */

/** Modo cine: los mismos 3,5 s que la cubierta de Edmunds. */
const IDLE_MS = 3500;

/** Dos dígitos. Es tipografía de instrumento: mantiene la columna del raíl
 *  alineada y hace que `01` y `06` ocupen lo mismo. */
const pad = (n: number) => String(n).padStart(2, "0");

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
}: {
  label: string;
  pressed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="observatory__toggle"
      aria-pressed={pressed}
      onClick={onToggle}
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
  return (
    <div className="observatory__sheet-head">
      <p className="observatory__legend">{title}</p>
      <button
        className="observatory__sheet-close"
        onClick={onClose}
        type="button"
      >
        <span className="sr-only">Cerrar {title.toLowerCase()}</span>
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

export function ObservatoryViewer({
  world,
  name,
  descriptor,
  rail,
  indexHref,
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
  /** `null` mientras un espécimen no tenga registro escrito. */
  record: SpecimenRecord | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<ObservatoryHandle | null>(null);
  const motion = useMotionEnabled();
  const reducedMotion = usePrefersReducedMotion();
  const lightEffects = useLightEffectsMode();
  const forced = useForcedEffects();

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

    `forced` —el icono pulsado— salta por encima de las heurísticas, igual que
    en la escena persistente: si alguien pide expresamente los efectos, los
    tiene.
  */
  const flat = useSyncExternalStore(
    () => () => {},
    () => {
      const verdict = evaluateCapabilities(
        readSignals({ reducedMotion, lightEffects, forced }),
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

        ⏳ Queda una pregunta abierta para Jonás, y es suya: `?no3d=1` es la
        puerta documentada del perfil ligero y la que usa la auditoría de
        Lighthouse (regla 5). Con este filtro, esa puerta tampoco retira el 3D
        de esta ruta. Antes de este pase no lo retiraba nadie porque no había
        gate ninguno, así que no es una regresión — pero es una decisión que
        conviene tomar a la vista y no por omisión.
      */
      return verdict.reason !== "perfil-ligero";
    },
    () => true,
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
  const [bloom, setBloom] = useState(true);
  const [emission, setEmission] = useState(true);
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

    No recorre las seis: llevar a alguien a un espécimen que no existe sería
    peor que no ofrecer el salto. Y no da la vuelta al llegar al final — con dos
    muestras montadas, envolver haría que las dos flechas apuntaran al mismo
    sitio y el control mentiría sobre dónde estás.
  */
  const mounted = rail.filter((slot) => slot.href);
  const here = mounted.findIndex((slot) => slot.id === id);
  const previous = here > 0 ? mounted[here - 1] : null;
  const next = here >= 0 && here < mounted.length - 1 ? mounted[here + 1] : null;

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
          // El aviso puede llegar después de desmontar —el bucle sigue vivo un
          // fotograma— así que la guarda es la misma bandera del import.
          onFirstFrame: () => {
            if (!cancelled) setReady(true);
          },
        });
        if (!handle) {
          setFailed(true);
          return;
        }
        handleRef.current = handle;
        setContract(handle.contract);
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
  }, [flat, id, visual, accent, secondary, placement]);

  useEffect(() => {
    // La ref se sincroniza AQUÍ y no durante el render: escribirla al renderizar
    // es un error real, no un capricho del linter — React puede renderizar sin
    // llegar a confirmar, y la escena acabaría montándose con un valor que el
    // visitante nunca eligió.
    motionRef.current = motion;
    handleRef.current?.setMotion(motion);
  }, [motion]);

  useEffect(() => {
    handleRef.current?.setBloom(bloom);
  }, [bloom]);

  useEffect(() => {
    handleRef.current?.setEmission(emission);
  }, [emission]);

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

  return (
    <div
      className="observatory"
      data-idle={idle ? "true" : "false"}
      /* El modo lectura de móvil cuelga de aquí: con un panel abierto se
         retiran la pista de manipulación, `Reajustar` y el paso entre muestras,
         y la ficha pasa a ser una hoja inferior. Dos estados claros —observar y
         leer— en vez de los dos a la vez. */
      data-panel={panel ?? "none"}
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
        Ese fallo existía antes de este pase: el HTML servido seguía enfocable
        debajo del rectángulo negro.
      */}
      <div
        aria-hidden={ready ? "true" : undefined}
        className="observatory__served"
        inert={ready}
      >
        {children}
      </div>

      {/*
        Dos bloques y nada en medio: la identidad arriba y TODA la
        instrumentación en la banda inferior. El centro del cuadro queda libre
        para el espécimen, que es el único sitio donde puede estar.

        Antes había tres bloques repartidos con `space-between`, así que la
        pista y `Reajustar` caían a media altura — encima de la figura, que es
        exactamente donde no pueden estar en un instrumento de observación.
      */}
      {/*
        Instrumentación de borde: el tercer ingrediente de la atmósfera.

        Va como HERMANO del cromo y no como hijo, y eso no es cosmética. El
        cromo es `flex-direction: column; justify-content: space-between` y su
        invariante está escrita en la hoja: «sólo tiene dos hijos, así que
        `space-between` no puede dejar nada a media altura». Un tercer hijo
        caería justo en el centro, encima del espécimen — que es exactamente el
        fallo que ya se corrigió una vez con la pista de arrastre.

        Marcas de 1 px y nada más. Sin texto, y eso es deliberado: el encargo
        veta las coordenadas falsas, y cualquier rótulo aquí —un índice, una
        lectura, un `ACQ`— sería o un dato inventado o el raíl de seis
        especímenes entrando por la puerta de atrás.

        Cuatro escuadras asimétricas y dos signos sueltos —fiducial arriba y
        marcas cortas a la derecha—, cada uno en un borde distinto, para que
        ninguna pareja insinúe un lado completo.

        El calibre del borde izquierdo se retira en este pase: ese borde lo ocupa
        ahora el catálogo de especímenes, que es una columna de cifras que sí
        mide algo — cuántas muestras hay y en cuál estás.
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
        marcas de borde: el cromo reparte sus hijos con `space-between` y un
        tercero caería en el centro del cuadro, encima del espécimen.

        En reposo son seis cifras en el borde; el nombre existe SIEMPRE en el
        árbol de accesibilidad y sólo se revela al apuntar, enfocar o estar
        activo. Por eso se oculta con opacidad y posición absoluta y nunca con
        `display: none` ni `visibility: hidden`, que lo sacarían del nombre
        accesible del enlace y dejarían seis enlaces llamados «01».

        Las cuatro muestras que aún no se montan son `<span>` y no enlaces
        muertos: un enlace que no lleva a ninguna parte es peor que la ausencia
        de enlace, y `aria-disabled` lo dice sin sacarlas del catálogo.
      */}
      <nav aria-label="Especímenes" className="observatory__rail" inert={!ready}>
        <ol>
          {rail.map((slot) => {
            const activo = slot.id === id;
            const cifra = (
              <span aria-hidden="true" className="observatory__slot-index">
                {pad(slot.index)}
              </span>
            );
            const rotulo = <span className="observatory__slot-name">{slot.name}</span>;
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
        `inert` resuelve las dos cosas con un atributo, y el cambio de mano
        —cara servida fuera, instrumento dentro— es el momento en que el
        instrumento se enciende.
      */}
      <div className="observatory__chrome" inert={!ready}>
        {/*
          LA CABECERA: dónde estoy, qué estoy mirando y cómo salgo.

          Tres piezas y ni una más, todas pegadas al borde superior. El centro
          sigue perteneciendo al espécimen — el cromo tiene exactamente dos
          hijos, así que `space-between` no puede dejar nada a media altura.
        */}
        <div className="observatory__head">
          <div className="observatory__identity">
            {/*
              `01 / 06` se ve como cifras y se OYE como una frase. Un lector de
              pantalla que lee «cero uno barra cero seis» no está diciendo nada;
              el relleno a dos dígitos es tipografía de instrumento, no dato.
            */}
            {/*
              EL PASO COMPACTO. En escritorio es sólo la cifra; en táctil se le
              suman dos flechas y sustituye al raíl vertical entero.

              El raíl revela el nombre al APUNTAR, y en una pantalla táctil no
              existe apuntar: la columna quedaría como seis cifras mudas que
              nadie puede interrogar. Copiar el layout de escritorio habría sido
              exactamente eso. Aquí el nombre ya está en grande justo debajo, así
              que el paso sólo necesita mover.

              Las dos presentaciones existen a la vez en el DOM y se excluyen con
              `display: none`, que SÍ saca del árbol de accesibilidad — así hay
              siempre una sola navegación de especímenes expuesta, nunca dos.
            */}
            {/*
              LA LECTURA DEL APARATO. Es la otra mitad del `EN ESPERA` grande
              de la cara servida: allí ocupa la pantalla porque es lo único que
              está pasando; aquí es una línea fina porque lo que importa ya es
              el espécimen. La misma frase en dos tamaños cuenta el encendido
              sin que haga falta una animación que lo explique.
            */}
            <p className="observatory__state">
              <span aria-hidden="true" className="observatory__state-dot" />
              Instrumento
              <span aria-hidden="true" className="observatory__sep">
                ·
              </span>
              {ready ? "Nominal" : "En espera"}
            </p>
            <div className="observatory__step">
              {previous ? (
                <Link className="observatory__step-arrow" href={previous.href!}>
                  <span aria-hidden="true">‹</span>
                  <span className="sr-only">Muestra anterior: {previous.name}</span>
                </Link>
              ) : (
                <span aria-hidden="true" className="observatory__step-arrow observatory__step-arrow--off">
                  ‹
                </span>
              )}
              <p className="observatory__index">
                <span className="sr-only">
                  Espécimen {position} de {rail.length}
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
                  <span className="sr-only">Muestra siguiente: {next.name}</span>
                </Link>
              ) : (
                <span aria-hidden="true" className="observatory__step-arrow observatory__step-arrow--off">
                  ›
                </span>
              )}
            </div>
            <p className="observatory__specimen">{name}</p>
            <p className="observatory__descriptor">{descriptor}</p>
          </div>

          {/*
            La salida. El rastro es decorativo —`aria-hidden`— porque la
            estructura real ya la da el enlace, y duplicarla en voz alta sólo
            añade ruido a quien navega escuchando.

            Se lee entera y dice a dónde va. Antes ponía «Índice», con el resto
            del destino en un `sr-only`: quien navega mirando tenía que deducir
            de qué índice se hablaba justo en la única ruta del sitio sin barra
            de navegación. El nombre accesible y el texto visible son ahora la
            misma frase, que es lo que necesita quien dicta por voz.
          */}
          <div className="observatory__exit">
            <p aria-hidden="true" className="observatory__trail">
              Experimentos
              <span className="observatory__sep">/</span>
              Observatorio
            </p>
            <Link className="observatory__back" href={indexHref}>
              <span aria-hidden="true" className="observatory__arrow">
                ←
              </span>
              <span className="observatory__ink">Salir del Observatorio</span>
            </Link>
          </div>
        </div>

        <div className="observatory__foot">
          <div className="observatory__controls">
            <p className="observatory__hint">
              Arrastra para girar
              <span aria-hidden="true" className="observatory__sep">
                ·
              </span>
              rueda para acercar
            </p>
            {/* La palabra va envuelta porque el filete del foco se agarra a la
                TINTA y no al bloque de 44 px: sin este span, un mando sin caja
                se queda sin indicador de foco. */}
            <button
              type="button"
              className="observatory__button"
              onClick={() => handleRef.current?.reset()}
            >
              <span className="observatory__ink">Reajustar</span>
            </button>
          </div>

          {/* El panel se abre HACIA ARRIBA, sobre la fila que lo enciende: la
              bandeja se queda anclada abajo y los datos crecen hacia el hueco,
              no hacia fuera del cuadro. */}
          {panel === "datos" && contract ? (
            <div className="observatory__data">
              <SheetHead title="Datos" onClose={() => setPanel(null)} />
              {/* Dos familias, y la separación importa: lo que cuesta DIBUJAR
                  el espécimen no es lo que ES la figura. Juntas, «vértices»
                  aparecía dos veces con valores distintos. */}
              <section>
                <h2 className="observatory__legend">Dibujo</h2>
                <dl>
                  <div>
                    <dt>{RENDER_LABELS.draws}</dt>
                    <dd>{contract.draws}</dd>
                  </div>
                  <div>
                    <dt>{RENDER_LABELS.materials}</dt>
                    <dd>{contract.materials}</dd>
                  </div>
                  <div>
                    <dt>{RENDER_LABELS.vertices}</dt>
                    <dd>{contract.vertices.toLocaleString("es-DO")}</dd>
                  </div>
                </dl>
              </section>

              {contract.architecture ? (
                <section>
                  <h2 className="observatory__legend">Figura</h2>
                  <dl>
                    {Object.entries(contract.architecture).map(
                      ([key, value]) => (
                        <div key={key}>
                          <dt>{architectureLabel(key)}</dt>
                          <dd>{value}</dd>
                        </div>
                      ),
                    )}
                  </dl>
                </section>
              ) : null}
            </div>
          ) : null}

          {/*
            EL REGISTRO: el mismo hueco, la otra profundidad.

            Comparte caja con `DATOS` a propósito —misma superficie de lectura,
            mismo sitio, misma forma de abrirse— porque las dos son la ficha del
            mismo objeto. Lo que no comparten es la naturaleza: aquélla mide y
            ésta cuenta. Por eso el registro NO lleva ni una cifra: en cuanto
            aparezca un número aquí, alguien tendrá que decidir si está medido o
            escrito a mano, y ésa es justo la pregunta que el §8 no quiere que
            exista.
          */}
          {panel === "registro" && record ? (
            <div className="observatory__data observatory__record">
              <SheetHead title="Registro" onClose={() => setPanel(null)} />
              <div
                aria-label="Secciones del registro"
                className="observatory__tabs"
                ref={tabsRef}
                role="tablist"
              >
                {REGISTRO_SECTIONS.map(([key, label]) => (
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

          <div className="observatory__inspect">
            {/* Cabecera de aparato, no rótulo suelto: la palabra y detrás una
                regla que se desvanece hasta el borde de la banda. */}
            <p className="observatory__legend observatory__group">
              Inspeccionar
              <span aria-hidden="true" className="observatory__rule" />
            </p>

            <div className="observatory__bank">
              <Instrument
                label="Bloom"
                pressed={!bloom}
                onToggle={() => setBloom((on) => !on)}
              />
              <span aria-hidden="true" className="observatory__div" />
              <Instrument
                label="Material"
                pressed={!emission}
                onToggle={() => setEmission((on) => !on)}
              />
              <span aria-hidden="true" className="observatory__div" />
              <Instrument
                label="Datos"
                pressed={panel === "datos"}
                onToggle={() =>
                  setPanel((abierto) => (abierto === "datos" ? null : "datos"))
                }
              />
              {/*
                `REGISTRO` sólo existe donde hay registro escrito, y por eso no
                entra en `preset.instruments`: aquella lista dice qué puede hacer
                la ESCENA con el cuerpo —apagar su halo, aislar su emisión— y
                esto no es una capacidad de la escena, es contenido. Un mando que
                abriera una ficha vacía sería peor que ningún mando.
              */}
              {record ? (
                <>
                  <span aria-hidden="true" className="observatory__div" />
                  <Instrument
                    label="Registro"
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
    </div>
  );
}
