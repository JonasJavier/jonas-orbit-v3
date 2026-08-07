"use client";

/**
 * G0 · HUD e instrumentación del spike — CÓDIGO DESECHABLE.
 *
 * El gate de G0 no es una impresión, es una medición: promedio ≈ 60 fps con
 * p5 ≥ 45 en un Android de gama media. Por eso este componente mide de verdad
 * (percentiles, no solo media) y permite apagar cada capa por separado para
 * saber cuál cuesta cara antes de decidir qué se sacrifica (§6 del plan).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CAMERA_POSES,
  createGargantuaScene,
  type CameraPose,
  type QualityTier,
  type SceneHandle,
  type SceneToggles,
} from "./scene";
import styles from "./spike.module.css";

const MEASURE_MS = 20_000;
/** Frames iniciales que se descartan: compilación de shaders y subida de
 *  texturas ensucian el arranque y no representan el estado estable. */
const WARMUP_FRAMES = 45;

interface Measurement {
  averageFps: number;
  p5Fps: number;
  medianMs: number;
  p95Ms: number;
  worstMs: number;
  frames: number;
  verdict: "pasa" | "justo" | "no pasa";
  /** En qué resolución y con cuántos pasos se tomó. Sin esto la cifra de fps no
   *  es comparable entre dos ejecuciones. */
  context: string;
}

function percentile(sorted: readonly number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor(sorted.length * fraction)),
  );
  return sorted[index];
}

function summarise(
  deltas: readonly number[],
  context: string,
): Measurement {
  const times = deltas.filter((delta) => delta > 0).sort((a, b) => a - b);
  const fps = times.map((delta) => 1000 / delta).sort((a, b) => a - b);
  const averageFps =
    fps.length > 0 ? fps.reduce((sum, value) => sum + value, 0) / fps.length : 0;
  const p5Fps = percentile(fps, 0.05);

  // El gate literal del plan: promedio ≈ 60 con p5 ≥ 45.
  const verdict: Measurement["verdict"] =
    averageFps >= 55 && p5Fps >= 45
      ? "pasa"
      : averageFps >= 45 && p5Fps >= 30
        ? "justo"
        : "no pasa";

  return {
    averageFps,
    p5Fps,
    // Tiempos de frame en el orden en que importan: la mediana es el estado
    // estable y el p95 es el frame lento que se PERCIBE como tirón.
    medianMs: percentile(times, 0.5),
    p95Ms: percentile(times, 0.95),
    worstMs: times.length > 0 ? times[times.length - 1] : 0,
    frames: times.length,
    verdict,
    context,
  };
}

export function GargantuaSpike() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<HTMLSpanElement>(null);
  const gpuRef = useRef<HTMLParagraphElement>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const handleRef = useRef<SceneHandle | null>(null);

  const [tier, setTier] = useState<QualityTier>("deep");
  const [pose, setPose] = useState<CameraPose>("media");
  const [doppler, setDoppler] = useState(true);
  const [halo, setHalo] = useState(true);
  const [lens, setLens] = useState(true);
  const [bloom, setBloom] = useState(true);
  const [measuring, setMeasuring] = useState(false);
  const [result, setResult] = useState<Measurement | null>(null);

  // El bucle de render escribe aquí en cada frame. Nada de setState por frame:
  // re-renderizar React 60 veces por segundo falsearía la propia medición.
  const recentRef = useRef<number[]>([]);
  const captureRef = useRef<number[] | null>(null);
  const warmupRef = useRef(0);
  // Solo las capas: `tier` viaja por las dependencias del efecto porque además
  // cambia la densidad de la malla, y eso obliga a reconstruir la escena.
  const layersRef = useRef<Omit<SceneToggles, "tier">>({
    pose,
    doppler,
    halo,
    lens,
    bloom,
  });

  // Una vez que la escena reporta un fallo, el pie deja de refrescarse con el
  // diagnóstico: si no, el mensaje de error se sobreescribiría a los 250 ms y
  // sería invisible.
  const statusLockedRef = useRef(false);

  // El estado del bucle se escribe en el DOM, no en estado de React: un setState
  // por frame falsearía la propia medición.
  const reportStatus = useCallback((message: string) => {
    statusLockedRef.current = true;
    if (gpuRef.current) gpuRef.current.textContent = message;
    if (liveRef.current) liveRef.current.textContent = "detenido";
  }, []);

  const handleFrame = useCallback((deltaMs: number) => {
    const recent = recentRef.current;
    recent.push(deltaMs);
    if (recent.length > 120) recent.shift();

    const capture = captureRef.current;
    if (capture) {
      if (warmupRef.current > 0) {
        warmupRef.current -= 1;
      } else {
        capture.push(deltaMs);
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let handle: SceneHandle;
    try {
      handle = createGargantuaScene(
        canvas,
        { tier, ...layersRef.current },
        handleFrame,
        reportStatus,
      );
    } catch (error) {
      if (gpuRef.current) {
        gpuRef.current.textContent = `WebGL no disponible: ${
          error instanceof Error ? error.message : "error desconocido"
        }`;
      }
      return;
    }
    handleRef.current = handle;
    // Se escribe en el DOM, no en estado: leer `window` durante el render daría
    // un markup distinto en servidor y cliente.
    if (gpuRef.current) gpuRef.current.textContent = handle.diagnostics;

    const onResize = () => handle.resize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      handle.dispose();
      handleRef.current = null;
    };
    // `tier` cambia la densidad de la malla y el tope de DPR: se reconstruye la
    // escena a propósito, lo que además ejercita el teardown en cada cambio.
  }, [handleFrame, reportStatus, tier]);

  useEffect(() => {
    layersRef.current = { pose, doppler, halo, lens, bloom };
    handleRef.current?.setToggles({ tier, pose, doppler, halo, lens, bloom });
  }, [tier, pose, doppler, halo, lens, bloom]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const recent = recentRef.current;
      const node = liveRef.current;
      if (node && recent.length > 0) {
        const mean =
          recent.reduce((sum, value) => sum + value, 0) / recent.length;
        node.textContent = `${(1000 / mean).toFixed(0)} fps · ${mean.toFixed(1)} ms`;
      }
      // El diagnóstico se relee: la resolución de render y el DPR efectivo
      // cambian al redimensionar y al cambiar de nivel, y el pie tiene que
      // decir lo que se está renderizando AHORA, no lo que se montó.
      const handle = handleRef.current;
      if (handle && gpuRef.current && !statusLockedRef.current) {
        gpuRef.current.textContent = handle.diagnostics;
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, []);

  // El panel arranca PLEGADO: a 412 px tapaba la escena entera, que fue lo que
  // hizo parecer que el móvil no cargaba. Se abre solo si hay sitio de sobra, y
  // se decide tras montar para no producir markup distinto en servidor y cliente.
  useEffect(() => {
    if (detailsRef.current) {
      detailsRef.current.open = window.innerWidth >= 900;
    }
  }, []);

  // Vigilante: si en 4 s no ha llegado ni un frame, la escena no arrancó. Sin
  // esto el HUD se queda en "midiendo…" para siempre y es indistinguible de una
  // carga lenta — que es exactamente lo que pasó en el móvil.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (recentRef.current.length > 0) return;
      if (liveRef.current) liveRef.current.textContent = "sin frames";
      if (gpuRef.current) {
        gpuRef.current.textContent = `LA ESCENA NO ARRANCÓ EN 4 s. ${gpuRef.current.textContent ?? ""}`;
      }
    }, 4_000);
    return () => window.clearTimeout(timer);
  }, [tier]);

  const measure = useCallback(() => {
    if (captureRef.current) return;
    setResult(null);
    setMeasuring(true);
    captureRef.current = [];
    warmupRef.current = WARMUP_FRAMES;

    window.setTimeout(() => {
      const captured = captureRef.current ?? [];
      captureRef.current = null;
      setMeasuring(false);
      setResult(
        summarise(captured, handleRef.current?.renderContext ?? "sin escena"),
      );
    }, MEASURE_MS);
  }, []);

  return (
    <div className={styles.spike}>
      <canvas className={styles.canvas} ref={canvasRef} />

      <details className={styles.panel} ref={detailsRef}>
        <summary className={styles.summary}>
          <span className={styles.live}>
            <span ref={liveRef}>midiendo…</span>
          </span>
          <span className={styles.summaryHint}>G0 · Gargantúa — ajustes</span>
        </summary>

        <p className={styles.note}>
          Código desechable. Cámara fija, sin controles: es el contrato del
          pivote, y es lo que hace barato el realismo.
        </p>

        <fieldset>
          <legend>Cámara (fija en cada pose)</legend>
          {CAMERA_POSES.map((value) => (
            <label key={value}>
              <input
                checked={pose === value}
                name="pose"
                onChange={() => setPose(value)}
                type="radio"
              />
              {value}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Nivel</legend>
          {(["orbit", "deep"] as const).map((value) => (
            <label key={value}>
              <input
                checked={tier === value}
                name="tier"
                onChange={() => setTier(value)}
                type="radio"
              />
              {/* «tope», no «DPR»: el DPR real es el mínimo entre este tope y
                  el de la pantalla, y el pie lo publica. Antes ponía «DPR 1.5»
                  mientras el pie decía 1.25 y parecían contradecirse. */}
              {value === "orbit"
                ? "orbit (móvil · tope DPR 1.0 · 190 pasos)"
                : "deep (tope DPR 1.5 · 340 pasos)"}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Capas</legend>
          <label>
            <input
              checked={doppler}
              onChange={(event) => setDoppler(event.target.checked)}
              type="checkbox"
            />
            Doppler beaming
          </label>
          <label>
            <input
              checked={halo}
              onChange={(event) => setHalo(event.target.checked)}
              type="checkbox"
            />
            Imágenes de orden superior
          </label>
          <label>
            <input
              checked={lens}
              onChange={(event) => setLens(event.target.checked)}
              type="checkbox"
            />
            Lente sobre el fondo
          </label>
          <label>
            <input
              checked={bloom}
              onChange={(event) => setBloom(event.target.checked)}
              type="checkbox"
            />
            Bloom (glow HDR)
          </label>
        </fieldset>

        <button disabled={measuring} onClick={measure} type="button">
          {measuring ? "Midiendo 20 s…" : "Medir 20 s"}
        </button>

        {result ? (
          <dl className={styles.result} data-verdict={result.verdict}>
            <div>
              <dt>Promedio</dt>
              <dd>{result.averageFps.toFixed(1)} fps</dd>
            </div>
            <div>
              <dt>p5</dt>
              <dd>{result.p5Fps.toFixed(1)} fps</dd>
            </div>
            <div>
              <dt>Mediana</dt>
              <dd>{result.medianMs.toFixed(2)} ms</dd>
            </div>
            <div>
              <dt>p95</dt>
              <dd>{result.p95Ms.toFixed(2)} ms</dd>
            </div>
            <div>
              <dt>Peor frame</dt>
              <dd>{result.worstMs.toFixed(2)} ms</dd>
            </div>
            <div>
              <dt>Veredicto</dt>
              <dd>
                <strong>{result.verdict}</strong> ({result.frames} frames)
              </dd>
            </div>
            <div>
              <dt>Condiciones</dt>
              <dd>{result.context}</dd>
            </div>
          </dl>
        ) : null}

        <p className={styles.gpu} ref={gpuRef}>
          detectando GPU…
        </p>
      </details>
    </div>
  );
}
