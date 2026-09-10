"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useMillerWater } from "./miller-water";

/** A single 2D surface, capped at 30 fps. The photograph remains the no-JS fallback. */
export function MillerOcean() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const { running, preferenceBlocked, paused, toggle } = useMillerWater();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const surface = surfaceRef.current;
    if (!canvas || !surface || !running || !ready) return;
    const context = canvas.getContext("2d");
    const source = surface.querySelector("img");
    if (!context || !source?.naturalWidth) return;

    let frame = 0;
    let visible = false;
    let previous = 0;
    let time = 0;

    function draw(timestamp: number) {
      if (!context || !canvas || !source) return;
      frame = requestAnimationFrame(draw);
      if (timestamp - previous < 1000 / 30) return;
      time += Math.min((timestamp - previous) / 1000, 0.05);
      previous = timestamp;
      const width = canvas.width;
      const height = canvas.height;
      const scale = Math.max(width / source.naturalWidth, height / source.naturalHeight);
      const sw = width / scale;
      const sh = height / scale;
      const sx = (source.naturalWidth - sw) / 2;
      const sy = (source.naturalHeight - sh) / 2;
      context.drawImage(source, sx, sy, sw, sh, 0, 0, width, height);
      // Sky stays still; only water below the photograph's horizon refracts.
      const horizon = Math.max(0, (source.naturalHeight * 0.24 - sy) * scale);
      for (let y = Math.ceil(horizon); y < height; y += 3) {
        const depth = (y - horizon) / Math.max(1, height - horizon);
        // All wave scales travel toward the viewer at one speed. At 700px this
        // advances the crests roughly 60px/s, instead of the former 2px shimmer.
        const phase = depth * 20 - time * 2.4;
        const envelope = depth * depth;
        const swell = Math.sin(phase) + 0.24 * Math.sin(phase * 2 + 0.7);
        const drift = (Math.cos(phase) * 14 + Math.sin(phase * 2 + 0.7) * 3) * envelope;
        const rise = swell * 24 * envelope;
        const sampleY = sy + (y + rise) / scale;
        context.drawImage(source, sx + drift / scale, sampleY, sw, 3 / scale, 0, y, width, 3);
        // Moving light rides the crests, restricted to the ocean foreground.
        context.globalCompositeOperation = "screen";
        context.globalAlpha = Math.pow(Math.max(0, Math.cos(phase - 0.5)), 8) * envelope * 0.35;
        context.drawImage(source, sx + drift / scale, sampleY, sw, 3 / scale, 0, y, width, 3);
        context.globalAlpha = 1;
        context.globalCompositeOperation = "source-over";
      }
    }

    function sync() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      if (visible && !document.hidden) {
        previous = performance.now();
        frame = requestAnimationFrame(draw);
      }
    }

    const resize = new ResizeObserver(() => {
      const bounds = surface.getBoundingClientRect();
      if (!bounds.width) return;
      const width = Math.min(1440, Math.round(bounds.width));
      const height = Math.round(bounds.height * width / bounds.width);
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
    });
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    resize.observe(surface);
    observer.observe(surface);
    document.addEventListener("visibilitychange", sync);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [ready, running]);

  return (
    <div className="miller-ocean" ref={surfaceRef} data-motion={running ? "flowing" : "still"}>
      <Image src="/images/miller/ocean.webp" alt="" fill sizes="100vw" preload unoptimized onLoad={() => setReady(true)} />
      {running && ready ? <canvas aria-hidden="true" ref={canvasRef} /> : null}
      <div className="miller-ocean__shade" aria-hidden="true" />
      {ready ? (
        <button className="miller-ocean__control" type="button" aria-pressed={running} onClick={toggle}>
          <span aria-hidden="true">{running ? "Ⅱ" : "▷"}</span>
          {preferenceBlocked ? "Activar océano" : paused ? "Reanudar océano" : "Pausar océano"}
        </button>
      ) : null}
    </div>
  );
}
