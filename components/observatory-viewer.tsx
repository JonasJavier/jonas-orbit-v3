"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { WorldId, WorldStructuralData } from "@/content/worlds.data";
import { useMotionEnabled } from "@/lib/effects-mode";
import { readVisualBench } from "@/lib/visual-bench";
import type { ObservatoryHandle } from "@/components/scene/observatory-scene";
import type { SpecimenContract } from "@/components/scene/specimen-contract";
import { architectureLabel, RENDER_LABELS } from "./observatory-labels";
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

export function ObservatoryViewer({
  world,
  name,
}: {
  world: {
    id: WorldId;
    visual: WorldStructuralData["visual"];
    accent: string;
    secondary: string;
    placement: WorldStructuralData["placement"];
  };
  name: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<ObservatoryHandle | null>(null);
  const motion = useMotionEnabled();

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
  const [bloom, setBloom] = useState(true);
  const [emission, setEmission] = useState(true);
  const [details, setDetails] = useState(false);
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
    if (!canvas) return;

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
  }, [id, visual, accent, secondary, placement]);

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

  return (
    <div className="observatory" data-idle={idle ? "true" : "false"}>
      {failed ? null : (
        <canvas
          aria-hidden="true"
          className="observatory__canvas"
          ref={canvasRef}
        />
      )}

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

        Cuatro marcas de 1 px y nada más. Sin texto, y eso es deliberado: el
        encargo veta las coordenadas falsas, y cualquier rótulo aquí —un índice,
        una lectura, un `ACQ`— sería o un dato inventado o el raíl de seis
        especímenes entrando por la puerta de atrás.
      */}
      {marks ? (
        <div aria-hidden="true" className="observatory__calipers">
          <span className="observatory__caliper observatory__caliper--tl" />
          <span className="observatory__caliper observatory__caliper--tr" />
          <span className="observatory__caliper observatory__caliper--bl" />
          <span className="observatory__caliper observatory__caliper--br" />
        </div>
      ) : null}

      <div className="observatory__chrome">
        <p className="observatory__specimen">{name}</p>

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
          {details && contract ? (
            <div className="observatory__data">
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
                pressed={details}
                onToggle={() => setDetails((on) => !on)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
