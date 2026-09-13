"use client";

import { useEffect, useRef } from "react";
import { useMounted, useRangerCockpit } from "./ranger-cockpit";

/**
 * Ventanal de la Ranger: lo que se ve desde el asiento.
 *
 * Un contexto WebGL2 propio con un triángulo y ningún asset: campo estelar
 * profundo con paralaje de cabeza, cuatro capas de estrellas que se abren desde
 * el punto de fuga —la nave avanza—, una nebulosa violeta y cian en el cuadrante
 * superior izquierdo y un mundo azul grisáceo cuyo limbo cruza la parte baja
 * del cristal con su atmósfera encendida por un sol fuera de cuadro. El mismo
 * desplazamiento del puntero mueve cada plano a un ritmo distinto: eso es lo
 * que convierte una imagen en una ventana.
 *
 * Presupuesto: 30 fps, DPR ≤ 1,5, suspensión fuera de pantalla y en segundo
 * plano, contexto liberado al pausar. Sin WebGL2 —o si el contexto se pierde—
 * queda la vista fija, que es la misma composición en CSS y SVG y la que
 * recibe quien navega sin JavaScript o con reduced-motion.
 */

const VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uLook;
in vec2 vUv;
out vec4 outColor;

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
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p = p * 2.03 + vec2(17.3, 9.1);
    a *= 0.5;
  }
  return v;
}
// At most one star per cell. p and radius in cell units.
float starField(vec2 p, float density, float radius, float t) {
  vec2 cell = floor(p), f = fract(p);
  float acc = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y));
      vec2 c = cell + o;
      float h = hash21(c);
      if (h > density) continue;
      vec2 jitter = vec2(hash21(c + 1.3), hash21(c + 2.7));
      float d = length(o + jitter - f);
      float b = 0.35 + 0.65 * hash21(c + 5.1);
      float twinkle = 0.8 + 0.2 * sin(t * (1.0 + 3.0 * h) + h * 40.0);
      float q = (d * d) / (radius * radius);
      acc += b * twinkle * (exp(-4.0 * q) + 0.1 * exp(-q * 0.35));
    }
  }
  return acc;
}

void main() {
  vec2 frag = vUv * uRes;
  vec2 uv = (frag - 0.5 * uRes) / uRes.y;
  float t = uTime;
  vec3 col = vec3(0.012, 0.016, 0.03);

  // Deep field: two still layers, the farther one barely follows the head.
  float s1 = starField((uv + uLook * 0.006 + vec2(3.2, 1.7)) * 26.0, 0.42, 1.5 * 26.0 / uRes.y, t);
  float s2 = starField((uv + uLook * 0.010 + vec2(8.9, 4.1)) * 14.0, 0.30, 2.3 * 14.0 / uRes.y, t);
  float tint = hash21(floor((uv + vec2(8.9, 4.1)) * 14.0));
  vec3 starCol = mix(vec3(0.72, 0.84, 1.0), vec3(1.0, 0.9, 0.78), smoothstep(0.55, 0.85, tint));
  col += vec3(0.85, 0.9, 1.0) * s1 * 0.8 + starCol * s2 * 1.05;

  // Flight: four shells of stars open from the vanishing point and pass by.
  vec2 vp = vec2(0.24, 0.10);
  for (int k = 0; k < 4; k++) {
    float ph = fract(t * 0.03 + float(k) * 0.25);
    float z = exp2(ph * 2.4);
    float fade = smoothstep(0.0, 0.3, ph) * (1.0 - smoothstep(0.7, 1.0, ph));
    vec2 p = vp + (uv - vp) / z + uLook * (0.012 + 0.03 * ph) + vec2(float(k) * 4.7, float(k) * 2.3);
    float sc = 9.0;
    float r = (1.2 + 2.4 * ph) * sc / (uRes.y * z);
    col += vec3(0.8, 0.9, 1.0) * starField(p * sc, 0.34, r, t) * fade * 1.1;
  }

  // Nebula: violet dust with cyan veins, upper left, drifting very slowly.
  vec2 nq = uv * 1.25 + uLook * 0.015 + vec2(0.35, 0.05) + vec2(t * 0.004, t * 0.002);
  float n1 = fbm(nq * 1.5);
  float n2 = fbm(nq * 3.2 + vec2(5.0, 2.0));
  float veins = fbm(nq * 0.8 + vec2(11.0, 3.0));
  float neb = smoothstep(0.36, 0.78, n1) * 0.6 + smoothstep(0.5, 0.88, n2) * 0.3;
  float ndist = length((uv - vec2(0.18, 0.2)) * vec2(0.62, 1.25));
  float nmask = smoothstep(1.25, 0.1, ndist);
  // A soft core keeps the cloud where the strut can cross it, whatever the noise does there.
  neb += smoothstep(0.9, 0.0, ndist) * (0.18 + 0.22 * n2);
  vec3 nebCol = mix(vec3(0.66, 0.42, 1.0), vec3(0.38, 0.84, 1.0), smoothstep(0.35, 0.65, veins));
  nebCol = mix(nebCol, vec3(1.0, 0.58, 0.66), smoothstep(0.68, 0.95, n1) * 0.4);
  col += nebCol * neb * nmask * 1.0;
  // A faint dust band leaning across the upper sky.
  float band = exp(-pow((uv.y - 0.12 - uv.x * 0.22) * 2.6, 2.0));
  col += vec3(0.55, 0.62, 0.85) * band * fbm(uv * 3.0 + vec2(2.0, 7.0)) * 0.11;
  // Sun just outside the top-right corner: the warmth every surface answers to.
  col += vec3(1.0, 0.8, 0.55) * exp(-length(uv - vec2(1.0, 0.45)) * 1.9) * 0.34;
  // A second, cooler wisp low on the right, behind the world's lit rim.
  float wisp = smoothstep(0.42, 0.8, fbm(uv * 2.2 + vec2(9.0, 1.0) + t * 0.003)) * smoothstep(0.8, 0.1, length((uv - vec2(0.62, 0.05)) * vec2(0.9, 1.6)));
  col += vec3(0.4, 0.8, 1.0) * wisp * 0.22;

  // The world below: blue-grey ocean bands under a thin lit atmosphere.
  vec3 sun = normalize(vec3(0.72, 0.5, 0.42));
  vec2 pc = vec2(0.56, -1.14);
  float pr = 1.22;
  vec2 rel = (uv - pc) / pr + uLook * 0.004;
  float r2 = dot(rel, rel);
  float rim = length(rel) - 1.0;
  if (r2 < 1.0) {
    float zz = sqrt(1.0 - r2);
    vec3 n = vec3(rel, zz);
    float diff = dot(n, sun);
    vec2 sp = vec2(atan(n.x, n.z) * 1.1 + t * 0.005, n.y * 2.4);
    float f = fbm(sp * 2.6 + vec2(0.0, 3.0));
    float bands = smoothstep(0.3, 0.7, 0.5 + 0.5 * sin(n.y * 14.0 + f * 5.0 + 1.0));
    float clouds = smoothstep(0.58, 0.86, fbm(sp * 5.0 + vec2(t * 0.012, 1.5)));
    vec3 deep = vec3(0.04, 0.08, 0.17);
    vec3 sea = vec3(0.09, 0.27, 0.42);
    vec3 teal = vec3(0.17, 0.46, 0.54);
    vec3 pale = vec3(0.74, 0.79, 0.85);
    vec3 alb = mix(deep, sea, bands);
    alb = mix(alb, teal, smoothstep(0.55, 0.8, f) * 0.8);
    alb = mix(alb, pale, clouds * 0.9);
    float light = smoothstep(-0.12, 0.55, diff);
    vec3 surf = alb * (0.03 + light * 1.25) * mix(vec3(1.0), vec3(1.0, 0.86, 0.68), 0.35);
    surf += vec3(1.0, 0.55, 0.22) * exp(-abs(diff - 0.02) * 9.0) * 0.14;
    float fres = pow(1.0 - zz, 3.2);
    surf += vec3(0.5, 0.85, 1.0) * fres * (0.12 + 0.6 * light);
    col = mix(col, surf, smoothstep(0.0, -0.008, rim));
  }
  float haloSide = smoothstep(-0.4, 0.7, dot(normalize(vec3(rel, 0.0)), sun));
  float halo = exp(-max(rim, 0.0) * 18.0) * step(0.0, rim);
  col += vec3(0.42, 0.82, 1.0) * halo * (0.10 + 0.55 * haloSide);

  // Vignette and a breath of grain: a window, not a render.
  float vig = smoothstep(1.35, 0.35, length(uv * vec2(0.8, 1.0)));
  col *= 0.75 + 0.25 * vig;
  col += (hash21(frag + fract(t) * 100.0) - 0.5) * 0.018;
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

/** Same numbers on the server and the client: the still sky never re-rolls. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}
const STILL_STARS = (() => {
  const random = seeded(97);
  return Array.from({ length: 170 }, () => ({
    x: Number((random() * 1440).toFixed(1)),
    y: Number((random() * 800).toFixed(1)),
    r: Number((0.4 + random() * 1.3).toFixed(2)),
    o: Number((0.35 + random() * 0.65).toFixed(2)),
  }));
})();

export function RangerViewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const { running, supported, markUnsupported, look } = useRangerCockpit();
  const mounted = useMounted();
  const flying = mounted && running && supported;

  useEffect(() => {
    const canvas = canvasRef.current;
    const surface = surfaceRef.current;
    if (!canvas || !surface || !flying) return;
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
    const uniforms = {
      res: gl.getUniformLocation(program, "uRes"),
      time: gl.getUniformLocation(program, "uTime"),
      look: gl.getUniformLocation(program, "uLook"),
    };

    let frame = 0;
    let visible = false;
    let lost = false;
    let previous = 0;
    let time = 0;
    // The head follows the pointer with inertia: a window, not a cursor.
    let lookX = 0;
    let lookY = 0;

    function draw(timestamp: number) {
      if (!gl || !canvas || lost) return;
      frame = requestAnimationFrame(draw);
      if (timestamp - previous < 1000 / 30) return;
      time += Math.min((timestamp - previous) / 1000, 0.05);
      previous = timestamp;
      lookX += (look.current.x - lookX) * 0.08;
      lookY += (look.current.y - lookY) * 0.08;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uniforms.res, canvas.width, canvas.height);
      gl.uniform1f(uniforms.time, time);
      gl.uniform2f(uniforms.look, lookX, -lookY);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function sync() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      if (visible && !document.hidden && !lost) {
        previous = performance.now();
        frame = requestAnimationFrame(draw);
      }
    }

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
      resize.disconnect();
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      document.removeEventListener("visibilitychange", sync);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [flying, look, markUnsupported]);

  return (
    <div className="ranger-view" ref={surfaceRef} data-flight={flying ? "on" : "off"} aria-hidden="true">
      <div className="ranger-view__still">
        <svg className="ranger-view__stars" viewBox="0 0 1440 800" preserveAspectRatio="xMidYMid slice" focusable="false">
          {STILL_STARS.map((star, index) => <circle key={index} cx={star.x} cy={star.y} r={star.r} opacity={star.o} />)}
        </svg>
        <i className="ranger-view__nebula" />
        <i className="ranger-view__world" />
      </div>
      {flying ? <canvas ref={canvasRef} /> : null}
      <div className="ranger-view__shade" />
    </div>
  );
}
