"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { releaseWhenDetached } from "@/lib/webgl-release";
import { useMillerWater } from "./miller-water";

/**
 * Océano de Miller: la fotografía refractada por un campo de oleaje en WebGL2.
 *
 * El canvas 2D anterior desplazaba filas enteras de 3 px con una fase que sólo
 * dependía de la profundidad: cada banda horizontal se movía como un bloque y
 * la foto temblaba como gelatina. Aquí cada píxel del agua se desplaza según
 * la PENDIENTE de una superficie que viaja hacia la cámara en perspectiva —
 * las crestas lejanas son pequeñas y lentas, las cercanas grandes y rápidas —
 * y la luz del sol de la derecha se refleja en las caras que la miran. El cielo
 * no se toca. La fotografía sigue siendo el fallback sin JavaScript.
 *
 * Presupuesto: un contexto WebGL2 propio (la escena persistente duerme
 * cubierta), una textura, un triángulo, 30 fps, sin dependencias.
 */

const VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = vec2(aPosition.x * 0.5 + 0.5, 0.5 - aPosition.y * 0.5);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D uPhoto;
uniform vec2 uCover;
uniform vec2 uOffset;
uniform float uTime;
uniform float uAmp;
in vec2 vUv;
out vec4 outColor;

// Horizonte de la fotografía: fracción de su altura desde arriba.
const float HORIZON = 0.24;
// Velocidad de superficie del tren principal en unidades de mundo por segundo.
// Cerca del borde inferior equivale a unos 70 px/s a 600 px de agua: el oleaje
// tiene MARCHA, y todos los trenes la comparten hacia la cámara.
const float SPEED = 2.4;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
// Tren sinusoidal con derivadas analíticas: (altura, dh/dx, dh/dy).
// La velocidad decrece con la raíz del número de onda, como en aguas profundas.
vec3 wave(vec2 w, vec2 dir, float k, float amp, float t, float phase) {
  float p = k * (dot(dir, w) - SPEED * inversesqrt(k) * t) + phase;
  return vec3(amp * sin(p), amp * k * cos(p) * dir);
}
vec3 field(vec2 w, float t) {
  vec3 f = wave(w, vec2(0.0, 1.0), 1.0, 1.0, t, 0.0);
  f += wave(w, normalize(vec2(0.32, 1.0)), 1.9, 0.5, t, 1.7);
  f += wave(w, normalize(vec2(-0.45, 1.0)), 3.4, 0.25, t, 0.6);
  // Rizo irregular arrastrado en la misma dirección que el oleaje.
  vec2 s = vec2(1.7, 2.6);
  vec2 q = w * s + vec2(0.0, -SPEED * 0.7 * t);
  float e = 0.05;
  float n = vnoise(q);
  vec2 g = vec2(vnoise(q + vec2(e, 0.0)) - n, vnoise(q + vec2(0.0, e)) - n) / e;
  f += vec3((n - 0.5) * 0.7, g * s * 0.7);
  return f;
}

void main() {
  vec2 uv = uOffset + vUv * uCover;
  float d = (uv.y - HORIZON) / (1.0 - HORIZON);
  if (d <= 0.0) { outColor = texture(uPhoto, uv); return; }

  // Plano del mar en perspectiva: z crece hacia el horizonte.
  float z = 1.0 / (0.9 * d + 0.1);
  vec2 w = vec2((uv.x - 0.5) * z * 1.6, z) * 23.0;
  float t = uTime;
  vec3 f = field(w, t);
  float near = smoothstep(0.0, 0.16, d);
  float reach = pow(d, 1.5) * uAmp * near;

  // Refracción: la pendiente desvía la muestra; la altura la levanta.
  vec2 shift = f.yz * 0.0017 * reach + vec2(0.0, f.x * 0.005 * reach);
  vec3 color = texture(uPhoto, uv + shift).rgb;

  // Luz del sol bajo a la derecha: caras que lo miran ganan, las opuestas pierden.
  vec3 n = normalize(vec3(-f.y * 0.35, -f.z * 0.35, 1.0));
  vec3 light = normalize(vec3(0.6, 0.7, 0.3));
  vec3 halfway = normalize(light + vec3(0.0, 0.0, 1.0));
  float sunSide = smoothstep(0.3, 0.9, uv.x);
  float facing = clamp(dot(n, light) - light.z, -0.5, 0.5);
  color *= 1.0 + facing * 0.16 * near * (0.4 + 0.6 * sunSide) * uAmp;
  float glint = pow(max(dot(n, halfway), 0.0), 40.0);
  color += vec3(1.0, 0.93, 0.8) * glint * 0.6 * sunSide * near * (1.0 - 0.35 * d) * uAmp;

  // Destellos breves sobre la espuma, sólo donde ya hay luz.
  float luma = dot(color, vec3(0.3, 0.55, 0.15));
  float sparkle = vnoise(w * vec2(3.5, 5.5) + vec2(0.0, -t * 4.0)) * vnoise(w * vec2(7.0, 4.0) + vec2(t * 1.3, -t * 3.0));
  sparkle = smoothstep(0.55, 0.72, sparkle) * smoothstep(0.3, 0.8, luma) * sunSide * near;
  color += sparkle * 0.35 * uAmp;

  // Las crestas cercanas se aclaran un punto hacia el cian del mundo.
  color += vec3(0.0, 0.04, 0.05) * max(f.x, 0.0) * d * 0.5 * uAmp;
  outColor = vec4(color, 1.0);
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

export function MillerOcean() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const { running } = useMillerWater();
  const [ready, setReady] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const surface = surfaceRef.current;
    if (!canvas || !surface || !running || !ready || !supported) return;
    const source = surface.querySelector("img");
    if (!source?.naturalWidth) return;
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
    const vertex = gl && compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = gl && compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl?.createProgram();
    if (!gl || !vertex || !fragment || !program) {
      // Sin WebGL2 la fotografía se queda quieta.
      setSupported(false);
      return;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      setSupported(false);
      return;
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
    const uniforms = {
      cover: gl.getUniformLocation(program, "uCover"),
      offset: gl.getUniformLocation(program, "uOffset"),
      time: gl.getUniformLocation(program, "uTime"),
      amp: gl.getUniformLocation(program, "uAmp"),
    };
    gl.uniform1i(gl.getUniformLocation(program, "uPhoto"), 0);

    let frame = 0;
    let visible = false;
    let lost = false;
    let previous = 0;
    let time = 0;

    function draw(timestamp: number) {
      if (!gl || !canvas || !source || lost) return;
      frame = requestAnimationFrame(draw);
      if (timestamp - previous < 1000 / 30) return;
      time += Math.min((timestamp - previous) / 1000, 0.05);
      previous = timestamp;
      const width = canvas.width;
      const height = canvas.height;
      const scale = Math.max(width / source.naturalWidth, height / source.naturalHeight);
      const coverX = width / scale / source.naturalWidth;
      const coverY = height / scale / source.naturalHeight;
      gl.viewport(0, 0, width, height);
      gl.uniform2f(uniforms.cover, coverX, coverY);
      gl.uniform2f(uniforms.offset, (1 - coverX) / 2, (1 - coverY) / 2);
      gl.uniform1f(uniforms.time, time);
      gl.uniform1f(uniforms.amp, width < 900 ? 0.75 : 1);
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
      setSupported(false);
    };
    const resize = new ResizeObserver(() => {
      const bounds = surface.getBoundingClientRect();
      if (!bounds.width) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.min(2048, Math.round(bounds.width * ratio));
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
    canvas.addEventListener("webglcontextlost", onLost);
    document.addEventListener("visibilitychange", sync);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      document.removeEventListener("visibilitychange", sync);
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      // Apagar el movimiento retira el canvas: se suelta el contexto para no
      // ocupar uno de los pocos que concede el navegador mientras está quieto.
      releaseWhenDetached(canvas, gl);
    };
  }, [ready, running, supported]);

  const flowing = running && ready && supported;
  return (
    <div className="miller-ocean" ref={surfaceRef} data-motion={flowing ? "flowing" : "still"}>
      <Image src="/images/miller/ocean.webp" alt="" fill sizes="100vw" preload unoptimized onLoad={() => setReady(true)} />
      {running && ready && supported ? <canvas aria-hidden="true" ref={canvasRef} /> : null}
      <div className="miller-ocean__shade" aria-hidden="true" />
    </div>
  );
}
