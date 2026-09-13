"use client";

import { useEffect, useRef } from "react";

/**
 * Observatorio de la cabecera: un cielo real detrás del cristal.
 *
 * Sustituye la textura SVG que derivaba de un lado a otro por un campo
 * estelar dibujado en un canvas 2D: tres profundidades que giran a ritmos
 * distintos y en un solo sentido —el cielo pasa, no se balancea—, magnitudes
 * repartidas como en el cielo (muchas débiles, pocas brillantes), tres
 * temperaturas de color, centelleo propio de cada estrella, picos de
 * difracción en las más brillantes, una banda lechosa de fondo y, de tarde en
 * tarde, un meteoro. La textura SVG sigue debajo para quien navega sin
 * JavaScript; en cuanto el canvas dibuja, el CSS la retira.
 *
 * El reloj es de módulo: cada página monta su propia cabecera, y sin esto el
 * cielo saltaría atrás en cada navegación. `running` lo pone a 30 fps;
 * quieto —pausa, segundo plano, reduced-motion, perfil ligero— deja un solo
 * fotograma. El campo es determinista (misma semilla), así que es el mismo
 * cielo en todas las rutas.
 */

type Star = { x: number; y: number; r: number; a: number; tint: number; f: number; p: number; layer: number };
type Meteor = { born: number; x: number; y: number; dx: number; dy: number };

const ORIGIN = typeof performance !== "undefined" ? performance.now() : 0;
const TAU = Math.PI * 2;
const LAYER_SPEED = [0.45, 0.72, 1];
const TINTS = ["255, 255, 255", "255, 232, 205", "196, 214, 255"];
/** Degrees per second of sky: 2.4 px/s on the near layer at 1× is a slow pan. */
const PAN = 2.4;

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function buildStars(width: number, height: number): Star[] {
  const random = seeded(2026);
  const span = width + 400;
  const count = Math.round(span * 0.115);
  return Array.from({ length: count }, () => {
    // Distribución de magnitudes: casi todo es débil; una de cada veinte brilla.
    const magnitude = Math.pow(random(), 4.6);
    const r = 0.3 + magnitude * 1.7;
    return {
      x: random() * span,
      y: random() * height,
      r,
      a: 0.22 + random() * 0.5 + magnitude * 0.25,
      tint: random() < 0.72 ? 0 : random() < 0.5 ? 1 : 2,
      f: 0.35 + random() * 2.1,
      p: random() * TAU,
      layer: r < 0.7 ? 0 : r < 1.2 ? 1 : 2,
    };
  });
}

export function VoyageSky({ running }: { running: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const surface = canvas?.parentElement;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !surface || !context) return;
    let stars: Star[] = [];
    let width = 0;
    let height = 0;
    let ratio = 1;
    let frame = 0;
    let previous = 0;
    let meteor: Meteor | null = null;
    let nextMeteor = 6 + Math.random() * 14;
    const random = seeded(Math.floor(ORIGIN) + 7);

    function draw() {
      if (!context || !width) return;
      const t = (performance.now() - ORIGIN) / 1000;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      // Banda lechosa: una franja tenue e inclinada que también pasa, despacio.
      const bandX = ((width * 0.5 + t * PAN * 0.3) % (width + 600)) - 300;
      context.save();
      context.translate(bandX, height * 0.5);
      context.rotate(-0.16);
      context.scale(1, 0.22);
      const band = context.createRadialGradient(0, 0, 0, 0, 0, Math.max(width * 0.45, 320));
      band.addColorStop(0, "rgba(186, 204, 236, 0.07)");
      band.addColorStop(0.55, "rgba(186, 204, 236, 0.03)");
      band.addColorStop(1, "rgba(186, 204, 236, 0)");
      context.fillStyle = band;
      context.fillRect(-width, -height * 4, width * 2, height * 8);
      context.restore();

      const span = width + 400;
      for (const star of stars) {
        const x = ((star.x + t * PAN * LAYER_SPEED[star.layer]) % span) - 200;
        if (x < -4 || x > width + 4) continue;
        // Centelleo: una onda lenta propia y, en las brillantes, un temblor rápido.
        let twinkle = 0.74 + 0.26 * Math.sin(t * star.f * TAU + star.p);
        if (star.layer === 2) twinkle *= 0.92 + 0.08 * Math.sin(t * 9.7 + star.p * 3);
        const alpha = star.a * twinkle;
        const color = TINTS[star.tint];
        if (star.r < 0.8) {
          context.fillStyle = `rgba(${color}, ${alpha})`;
          context.fillRect(x, star.y, 1, 1);
          continue;
        }
        context.fillStyle = `rgba(${color}, ${alpha})`;
        context.beginPath();
        context.arc(x, star.y, star.r, 0, TAU);
        context.fill();
        if (star.r > 1.45) {
          // Picos de difracción y halo: lo que un telescopio hace con una estrella brillante.
          const spike = star.r * 2.6 * twinkle;
          context.strokeStyle = `rgba(${color}, ${alpha * 0.22})`;
          context.lineWidth = 0.7;
          context.beginPath();
          context.moveTo(x - spike, star.y);
          context.lineTo(x + spike, star.y);
          context.moveTo(x, star.y - spike);
          context.lineTo(x, star.y + spike);
          context.stroke();
          const halo = context.createRadialGradient(x, star.y, 0, x, star.y, star.r * 3.2);
          halo.addColorStop(0, `rgba(${color}, ${alpha * 0.18})`);
          halo.addColorStop(1, `rgba(${color}, 0)`);
          context.fillStyle = halo;
          context.beginPath();
          context.arc(x, star.y, star.r * 3.2, 0, TAU);
          context.fill();
        }
      }

      // Meteoro: raro, breve, con cola que se apaga.
      if (running) {
        if (!meteor && t > nextMeteor) {
          const fromLeft = random() < 0.5;
          meteor = { born: t, x: fromLeft ? width * (0.1 + random() * 0.3) : width * (0.6 + random() * 0.3), y: random() * height * 0.6, dx: (fromLeft ? 1 : -1) * (260 + random() * 160), dy: 30 + random() * 40 };
          nextMeteor = t + 14 + random() * 24;
        }
        if (meteor) {
          const age = t - meteor.born;
          if (age > 0.75) meteor = null;
          else {
            const hx = meteor.x + meteor.dx * age;
            const hy = meteor.y + meteor.dy * age;
            const tail = Math.min(age, 0.3) * 0.45;
            const tx = hx - meteor.dx * tail;
            const ty = hy - meteor.dy * tail;
            const fade = age < 0.15 ? age / 0.15 : 1 - (age - 0.15) / 0.6;
            const streak = context.createLinearGradient(tx, ty, hx, hy);
            streak.addColorStop(0, "rgba(220, 232, 255, 0)");
            streak.addColorStop(1, `rgba(236, 243, 255, ${0.85 * fade})`);
            context.strokeStyle = streak;
            context.lineWidth = 1.1;
            context.beginPath();
            context.moveTo(tx, ty);
            context.lineTo(hx, hy);
            context.stroke();
          }
        }
      }
      canvas!.dataset.ready = "true";
    }

    function tick(timestamp: number) {
      frame = requestAnimationFrame(tick);
      if (timestamp - previous < 1000 / 30) return;
      previous = timestamp;
      draw();
    }

    function sync() {
      cancelAnimationFrame(frame);
      frame = 0;
      if (running) frame = requestAnimationFrame(tick);
      else draw();
    }

    const resize = new ResizeObserver(() => {
      const bounds = surface.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      stars = buildStars(width, height);
      draw();
    });
    resize.observe(surface);
    sync();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
    };
  }, [running]);

  return <canvas ref={canvasRef} className="voyage-sky__canvas" aria-hidden="true" />;
}
