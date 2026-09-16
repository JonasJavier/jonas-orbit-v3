"use client";

import { useEffect, useRef, useState } from "react";
import type { WorldId, WorldStructuralData } from "@/content/worlds.data";
import { useMotionEnabled } from "@/lib/effects-mode";
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
    if (window.matchMedia("(pointer: coarse)").matches) return;
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
        <canvas aria-hidden="true" className="observatory__canvas" ref={canvasRef} />
      )}

      <div className="observatory__chrome">
        <p className="observatory__specimen">{name}</p>

        <div className="observatory__controls">
          <p className="observatory__hint">
            Arrastra para girar · rueda para acercar
          </p>
          <button
            type="button"
            className="observatory__button"
            onClick={() => handleRef.current?.reset()}
          >
            Reajustar
          </button>
        </div>

        <div className="observatory__inspect">
          <p className="observatory__legend">Inspeccionar</p>
          <button
            type="button"
            className="observatory__toggle"
            aria-pressed={!bloom}
            onClick={() => setBloom((on) => !on)}
          >
            Bloom
          </button>
          <button
            type="button"
            className="observatory__toggle"
            aria-pressed={!emission}
            onClick={() => setEmission((on) => !on)}
          >
            Material
          </button>
          <button
            type="button"
            className="observatory__toggle"
            aria-pressed={details}
            onClick={() => setDetails((on) => !on)}
          >
            Datos
          </button>
        </div>

        {details && contract ? (
          <div className="observatory__data">
            {/* Dos familias, y la separación importa: lo que cuesta DIBUJAR el
                espécimen no es lo que ES la figura. Juntas, «vértices» aparecía
                dos veces con valores distintos. */}
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
                  {Object.entries(contract.architecture).map(([key, value]) => (
                    <div key={key}>
                      <dt>{architectureLabel(key)}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
