"use client";

import { useEffect, useRef, useState } from "react";
import { useMounted, useRangerCockpit } from "./ranger-cockpit";

/**
 * Ventanal de la Ranger: la travesía por la garganta de un agujero de gusano.
 *
 * Un contexto WebGL2 propio con un triángulo y ningún asset. La nave va DENTRO
 * del túnel: tres paredes concéntricas de hilos de luz —estrellas estiradas por
 * la velocidad— que vienen desde el fondo y pasan de largo, retorcidas por la
 * curvatura (el ángulo gira con la profundidad: el espacio se dobla); gas
 * violeta y cian sobre las paredes; y al fondo la boca, donde el cielo del otro
 * lado llega lensado por una masa puntual, con su anillo de Einstein. El túnel
 * se curva despacio —la boca se desplaza y las paredes cercanas no— y respira.
 * Sin planetas: sólo estrellas y espacio.
 *
 * Es continuo. Todo patrón es periódico en profundidad con periodo PERIOD y la
 * distancia recorrida se envuelve exactamente ahí, así que el vuelo no se
 * detiene ni salta mientras el interruptor único de movimiento esté encendido.
 * Apagarlo en vuelo deja el ventanal en el último fotograma: la nave se detiene
 * donde estaba y el bucle deja de pedir cuadros. Quien LLEGA con el movimiento
 * apagado (perfil ligero) recibe la vista fija y ningún contexto WebGL.
 *
 * Presupuesto: 30 fps, DPR ≤ 1,5, 2048 px de ancho máximo, suspensión fuera de
 * pantalla y en segundo plano. Sin WebGL2 —o si el contexto se pierde— queda la
 * vista fija en SVG, la misma composición que recibe quien navega sin
 * JavaScript.
 */

const VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

/** Depth period of every pattern in the tunnel; the distance wraps here. */
const PERIOD = 48;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uLook;
uniform float uDist;
uniform float uSpeed;
uniform vec2 uVp;
uniform vec2 uBend;
uniform float uTwist;
uniform float uThroat;
in vec2 vUv;
out vec4 outColor;

const float TAU = 6.2831853;

float hash21(vec2 p) {
  p = fract(p * vec2(233.34, 851.73));
  p += dot(p, p + 23.45);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}
// Value noise whose lattice repeats every per cells: the wall has no seam and
// the flight no jump when the distance wraps.
float pnoise(vec2 p, vec2 per) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  vec2 a = mod(i, per), b = mod(i + 1.0, per);
  return mix(mix(hash21(a), hash21(vec2(b.x, a.y)), f.x), mix(hash21(vec2(a.x, b.y)), hash21(b), f.x), f.y);
}
float pfbm(vec2 p, vec2 per) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * pnoise(p, per);
    p *= 2.0;
    per *= 2.0;
    a *= 0.5;
  }
  return v;
}
// Far-side stars, at most one per cell, four nearest cells.
float starField(vec2 p, float density, float radius) {
  vec2 base = floor(p - 0.5), f = p - base;
  float acc = 0.0;
  for (int y = 0; y <= 1; y++) {
    for (int x = 0; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y));
      vec2 c = base + o;
      float h = hash21(c);
      if (h > density) continue;
      float d = length(o + vec2(hash21(c + 1.3), hash21(c + 2.7)) - f);
      float q = (d * d) / (radius * radius);
      acc += (0.35 + 0.65 * hash21(c + 5.1)) * (exp(-4.0 * q) + 0.08 * exp(-q * 0.3));
    }
  }
  return acc;
}

// One wall of the tunnel, radius R. Every sector of the wall carries one thread
// of light per period L of depth; the ship's advance brings it toward the
// viewer. Perspective keeps the width constant in sector units (screen width
// is W / z and r z = R); threads fade where they would be a blur (too near) or
// finer than a pixel (too deep).
vec3 wall(float ang, float r, float R, float N, float L, float W, float len, float px) {
  float z = R / r;
  float sector = 6.2831853 * r / N;
  float vis = smoothstep(0.26, 0.7, z) * smoothstep(0.7 * px, 2.6 * px, sector) * smoothstep(0.5 * L, 0.12 * L, R * px / (r * r));
  if (vis <= 0.001) return vec3(0.0);
  float s = ang / TAU * N;
  float base = floor(s - 0.5);
  float width = W / z;
  float cover = min(1.0, width / px);
  width = max(width, px);
  // Doppler: what lies ahead arrives blue, what passes goes warm.
  vec3 near = vec3(1.0, 0.64, 0.4);
  vec3 far = vec3(0.64, 0.86, 1.0);
  vec3 tint = mix(near, far, smoothstep(0.45, 2.6, z));
  vec3 acc = vec3(0.0);
  for (int k = 0; k < 2; k++) {
    float c = base + float(k);
    float cw = mod(c, N);
    float h1 = hash21(vec2(cw, R * 17.0));
    float h2 = hash21(vec2(cw + 3.1, R * 29.0));
    float h3 = hash21(vec2(cw + 7.7, R * 41.0));
    if (h3 < 0.22) continue;
    float across = (s - c - 0.5 - (h1 - 0.5) * 0.6) * sector;
    float prof = exp(-across * across / (width * width));
    float f = fract((z + uDist) / L + h2);
    float l = len * (0.3 + 0.7 * h3);
    float body = smoothstep(0.0, 0.01, f) * (exp(-f / l) + 0.6 * exp(-f / (0.08 * l)));
    vec3 col = mix(tint, vec3(0.8, 0.6, 1.0), step(0.86, h1) * 0.75);
    acc += col * prof * body * (0.4 + 0.6 * h3);
  }
  return acc * cover * vis;
}

void main() {
  vec2 frag = vUv * uRes;
  vec2 uv = (frag - 0.5 * uRes) / uRes.y;
  float px = 1.0 / uRes.y;
  float t = uTime;

  // The throat sits where the ship is headed; the head moves it a little.
  vec2 p0 = uv - uVp - uLook * 0.03;
  // The tunnel bends: the far end swings, the near walls stay. A flat-topped
  // weight moves the throat whole, so the ring keeps its shape.
  vec2 p = p0 - uBend * exp(-dot(p0, p0) / 0.2);
  float th = uThroat;
  // Space folds: the cross-section of the tube is an ellipse whose axis turns
  // with depth and with time, so the walls wring like a twisted sleeve.
  float r0 = max(length(p), 1e-4);
  float phi = t * 0.07 + 0.3 * (0.4 / r0);
  float fold = 0.09 * sin(t * 0.11 + 0.8) * smoothstep(th * 1.6, th * 4.5, r0);
  vec2 axis = vec2(cos(phi), sin(phi));
  p += axis * dot(p, axis) * fold;
  float r = max(length(p), 1e-4);
  // Frame dragging: the angle turns with depth and slowly with time.
  float ang = atan(p.y, p.x) + uTwist * (0.4 / r) + t * 0.03;

  vec3 col = vec3(0.008, 0.01, 0.022);

  // Gas on the walls, streaming along the depth.
  float zg = 0.5 / r;
  vec2 gq = vec2(ang / TAU * 6.0, (zg + uDist) * 0.5);
  float g1 = pfbm(gq, vec2(6.0, 24.0));
  float g2 = pnoise(gq * vec2(2.0, 1.0) + vec2(3.0, 7.0), vec2(12.0, 24.0));
  float gas = smoothstep(0.38, 0.8, g1) * smoothstep(0.35, 1.1, zg) * smoothstep(12.0, 3.0, zg);
  vec3 gasCol = mix(vec3(0.5, 0.3, 0.95), vec3(0.24, 0.72, 1.0), smoothstep(0.3, 0.7, g2));
  col += gasCol * gas * 0.5;
  // A faint glow of the walls themselves, so the tunnel reads as a volume.
  col += vec3(0.16, 0.2, 0.42) * smoothstep(0.35, 2.4, zg) * smoothstep(14.0, 4.0, zg) * 0.18;

  // Three walls of threads: far and fine, middle, near and bold.
  vec3 threads = wall(ang, r, 0.2, 150.0, 2.4, 0.0012, 0.32 * (0.18 + 0.82 * uSpeed), px) * 0.9;
  threads += wall(ang + 1.7, r, 0.36, 96.0, 4.0, 0.002, 0.3 * (0.18 + 0.82 * uSpeed), px) * 0.95;
  threads += wall(ang + 3.9, r, 0.6, 54.0, 6.0, 0.0034, 0.26 * (0.18 + 0.82 * uSpeed), px);
  col += threads * smoothstep(th * 1.05, th * 2.6, r);

  // Ribs: a faint luminous ring every few units of depth, passing by.
  float zr = 0.45 / r;
  float rib = exp(-pow(fract((zr + uDist) / 6.0) * 6.0 - 0.4, 2.0) * 18.0);
  col += vec3(0.4, 0.6, 1.0) * rib * smoothstep(0.5, 1.6, zr) * smoothstep(9.0, 3.0, zr) * 0.07;

  // The mouth: the far side's sky, lensed by a point mass. Stars pile up on
  // the Einstein ring; the band of a far galaxy becomes arcs around it.
  // Only the pixels near the throat pay for it.
  float mouth = 1.0 - smoothstep(th * 1.3, th * 4.2, r);
  if (mouth > 0.0) {
    float lens = th * th / (r * r);
    vec2 b = p * (1.0 - lens);
    float mag = clamp(1.0 / abs(1.0 - lens * lens), 0.0, 7.0);
    float ca = cos(t * 0.012), sa = sin(t * 0.012);
    vec2 bb = mat2(ca, -sa, sa, ca) * b;
    float sky = starField(bb * 44.0 + vec2(3.0, 7.0), 0.46, 1.5 * 44.0 * px) + starField(bb * 20.0 + vec2(9.0, 1.0), 0.3, 1.9 * 20.0 * px) * 1.3;
    float band = exp(-pow(dot(bb, vec2(-0.45, 0.89)) * 7.0, 2.0)) * (0.3 + 0.7 * vnoise(bb * 16.0));
    vec3 farCol = vec3(0.86, 0.92, 1.0) * sky * sqrt(mag) + mix(vec3(0.62, 0.62, 1.0), vec3(1.0, 0.82, 0.66), vnoise(bb * 5.0)) * band * min(mag, 5.0) * 0.5;
    col += farCol * mouth;
  }
  // Light from the other side fills the throat; the ring is sharp, the halo wide.
  col += vec3(0.55, 0.78, 1.0) * exp(-r / th * 1.25) * 0.42;
  col += vec3(0.42, 0.6, 1.0) * smoothstep(th, th * 0.2, r) * 0.12;
  float ring = r - th;
  col += vec3(0.8, 0.93, 1.0) * (exp(-ring * ring / pow(1.4 * px + 0.0012, 2.0)) * 0.85 + exp(-abs(ring) * 34.0) * 0.22);
  // A darker annulus just outside the ring: the photon region, where the
  // walls hand over to the mouth.
  col *= 1.0 - 0.45 * exp(-pow((r - th * 2.0) / (th * 0.7), 2.0));

  // Vignette, a soft shoulder for the highlights and a breath of grain.
  float vig = smoothstep(1.45, 0.3, length(uv * vec2(0.78, 1.0)));
  col *= 0.6 + 0.4 * vig;
  col = 1.0 - exp(-col * 1.25);
  col += (hash21(frag + fract(t) * 100.0) - 0.5) * 0.014;
  outColor = vec4(col, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * Where the throat sits, in height units from the centre. Apaisado, a la
 * derecha, para que la copia del HUD quede sobre la pared oscura; vertical,
 * centrado y alto, con la copia debajo. The still view reads the same numbers
 * from CSS (`--vp-x`, `--vp-y` in `ranger-contact.css`).
 */
function throatFor(aspect: number) {
  return aspect >= 1.2 ? { x: 0.27, y: 0.03, radius: 0.078 } : { x: 0, y: 0.17, radius: 0.08 };
}

/**
 * The slow motions of the tunnel, shared by the shader and the HUD (the
 * heading tape rides the bend, the reticle follows the throat).
 */
function tunnelAt(time: number) {
  return {
    bendX: 0.07 * Math.sin(time * 0.083) + 0.035 * Math.sin(time * 0.21 + 1.1),
    bendY: 0.045 * Math.sin(time * 0.067 + 0.6) + 0.02 * Math.sin(time * 0.19),
    twist: 0.55 + 0.15 * Math.sin(time * 0.05),
    breath: 1 + 0.045 * Math.sin(time * 0.4),
  };
}

/** Same numbers on the server and the client: the still tunnel never re-rolls. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}
/**
 * La vista fija: 150 hilos de luz desde la garganta, curvados por el mismo
 * giro que el shader, en un lienzo cuadrado centrado en la boca (1 unidad =
 * 0,1 % del alto del ventanal). Cerca de la boca, fríos; hacia fuera, cálidos.
 */
const STILL_THREADS = (() => {
  const random = seeded(97);
  return Array.from({ length: 150 }, () => {
    const angle = random() * Math.PI * 2;
    const start = 90 + random() ** 1.6 * 520;
    const end = start + 60 + random() * (220 + start * 1.4);
    const twist = 0.22 * (0.4 / (start / 1000) - 0.4 / (end / 1000)) * 0.35;
    const mid = (start + end) / 2;
    const point = (radius: number, turn: number) => [Math.cos(angle + turn) * radius, Math.sin(angle + turn) * radius].map((v) => Number(v.toFixed(1)));
    const [x1, y1] = point(start, twist);
    const [cx, cy] = point(mid, twist * 0.45);
    const [x2, y2] = point(end, 0);
    return {
      d: `M${x1} ${y1}Q${cx} ${cy} ${x2} ${y2}`,
      tone: start < 220 ? "far" : start < 420 ? "mid" : "near",
      width: Number((0.8 + (start / 600) * 2.4).toFixed(2)),
      opacity: Number((0.25 + random() * 0.6).toFixed(2)),
    };
  });
})();

export function RangerViewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const { running, supported, markUnsupported, look } = useRangerCockpit();
  const mounted = useMounted();
  // The light profile never pays for the GPU: arriving with motion off (the
  // icon, or `?no3d=1`, the profile audits run with) keeps the still SVG and
  // creates no context. The context is born with the first flight and then
  // stays: turning motion off afterwards freezes the frame where it was.
  const [engaged, setEngaged] = useState(false);
  if (mounted && running && supported && !engaged) setEngaged(true);
  const live = mounted && supported && engaged;
  // The loop reads the switch through a ref: turning motion off freezes the
  // current frame instead of tearing the context down and redrawing a still.
  const runningRef = useRef(running);
  const syncRef = useRef<() => void>(() => {});

  useEffect(() => {
    runningRef.current = running;
    syncRef.current();
  }, [running]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const surface = surfaceRef.current;
    if (!canvas || !surface || !live) return;
    if (typeof WebGL2RenderingContext === "undefined") {
      markUnsupported();
      return;
    }
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
    const vertex = gl && compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = gl && compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl?.createProgram();
    if (!gl || !vertex || !fragment || !program) {
      markUnsupported();
      return;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      markUnsupported();
      return;
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uniform = (name: string) => gl.getUniformLocation(program, name);
    const uniforms = {
      res: uniform("uRes"),
      time: uniform("uTime"),
      look: uniform("uLook"),
      dist: uniform("uDist"),
      speed: uniform("uSpeed"),
      vp: uniform("uVp"),
      bend: uniform("uBend"),
      twist: uniform("uTwist"),
      throat: uniform("uThroat"),
    };
    const bridge = surface.closest<HTMLElement>(".ranger-bridge");

    let frame = 0;
    let visible = false;
    let lost = false;
    let previous = 0;
    // The context only exists once motion is on: the engines spool up from rest.
    let time = 0;
    let dist = 0;
    let speed = 0;
    let lookX = 0;
    let lookY = 0;

    function render() {
      if (!gl || !canvas) return;
      const aspect = canvas.width / Math.max(canvas.height, 1);
      const throat = throatFor(aspect);
      const tunnel = tunnelAt(time);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uniforms.res, canvas.width, canvas.height);
      gl.uniform1f(uniforms.time, time);
      gl.uniform2f(uniforms.look, lookX, -lookY);
      gl.uniform1f(uniforms.dist, dist);
      gl.uniform1f(uniforms.speed, speed * speed * (3 - 2 * speed));
      gl.uniform2f(uniforms.vp, throat.x, throat.y);
      gl.uniform2f(uniforms.bend, tunnel.bendX, tunnel.bendY);
      gl.uniform1f(uniforms.twist, tunnel.twist);
      gl.uniform1f(uniforms.throat, throat.radius * tunnel.breath);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // The HUD rides the same tunnel: the tape follows the bend (yaw in
      // [-1, 1]) and the reticle sits on the throat.
      bridge?.style.setProperty("--yaw", (tunnel.bendX / 0.105).toFixed(3));
      bridge?.style.setProperty("--bend-x", (tunnel.bendX + lookX * 0.03).toFixed(4));
      bridge?.style.setProperty("--bend-y", (tunnel.bendY - lookY * 0.03).toFixed(4));
    }

    function draw(timestamp: number) {
      if (lost) return;
      frame = requestAnimationFrame(draw);
      if (timestamp - previous < 1000 / 30) return;
      const dt = Math.min((timestamp - previous) / 1000, 0.05);
      previous = timestamp;
      time += dt;
      // Engines: from rest to cruise in 2.8 s after the first start. Resuming
      // picks up from the frozen speed, so the view never jumps.
      speed = Math.min(1, speed + dt / 2.8);
      const eased = speed * speed * (3 - 2 * speed);
      dist = (dist + dt * 1.7 * eased) % PERIOD;
      lookX += (look.current.x - lookX) * 0.08;
      lookY += (look.current.y - lookY) * 0.08;
      render();
    }

    function sync() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      if (visible && !document.hidden && !lost && runningRef.current) {
        previous = performance.now();
        frame = requestAnimationFrame(draw);
      }
    }
    syncRef.current = sync;

    const onLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      sync();
      markUnsupported();
    };
    const resize = new ResizeObserver(() => {
      const bounds = surface.getBoundingClientRect();
      if (!bounds.width) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.min(2048, Math.round(bounds.width * ratio));
      const height = Math.round((bounds.height * width) / bounds.width);
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      // Resizing clears the canvas: a frozen view redraws its frame once.
      if (!frame && !lost) render();
    });
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    resize.observe(surface);
    observer.observe(surface);
    canvas.addEventListener("webglcontextlost", onLost);
    document.addEventListener("visibilitychange", sync);
    return () => {
      cancelAnimationFrame(frame);
      syncRef.current = () => {};
      resize.disconnect();
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      document.removeEventListener("visibilitychange", sync);
      for (const property of ["--yaw", "--bend-x", "--bend-y"]) bridge?.style.removeProperty(property);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [live, look, markUnsupported]);

  return (
    <div className="ranger-view" ref={surfaceRef} data-flight={live && running ? "on" : "off"} aria-hidden="true">
      <div className="ranger-view__still">
        <svg className="ranger-view__tunnel" viewBox="-2000 -2000 4000 4000" focusable="false">
          <defs>
            <radialGradient id="ranger-throat">
              <stop offset="0" stopColor="#dff4ff" stopOpacity=".95" />
              <stop offset=".035" stopColor="#9fdcff" stopOpacity=".55" />
              <stop offset=".12" stopColor="#6d7dff" stopOpacity=".16" />
              <stop offset=".3" stopColor="#8a55e6" stopOpacity=".08" />
              <stop offset="1" stopColor="#04060d" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle r="1500" fill="url(#ranger-throat)" />
          {STILL_THREADS.map((thread, index) => <path key={index} d={thread.d} data-tone={thread.tone} strokeWidth={thread.width} opacity={thread.opacity} />)}
          <circle className="ranger-view__ring" r="78" />
        </svg>
      </div>
      {live ? <canvas ref={canvasRef} /> : null}
      <div className="ranger-view__reticle"><i /></div>
      <div className="ranger-view__shade" />
    </div>
  );
}
