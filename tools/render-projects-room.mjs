/**
 * La sala de ingeniería de la Endurance — el fondo de `/es/proyectos`, horneado.
 *
 * La página no corre WebGL: pinta esta imagen a toda la ventana, detrás de la
 * mesa de proyección en CSS y de las pantallas flotantes. Por eso la sala se
 * renderiza UNA vez, aquí, sin prisa, y se guarda como un fotograma: lo que en
 * tiempo real sería caro —sombras suaves, profundidad de campo de verdad,
 * reflejo glossy del suelo, bruma con rayos— sale casi gratis cuando se pueden
 * gastar cientos de pasadas en un solo cuadro.
 *
 * Cómo se consigue que parezca un fotograma y no un render:
 *
 *   · Acumulación. Cada muestra renderiza la escena con la cámara desplazada un
 *     subpíxel (antialias), la pupila en otro punto del diafragma (desenfoque
 *     real, no un filtro), la luz del planeta en otro punto del limbo (sombras
 *     de penumbra larga) y otro grano de bruma. El promedio es la imagen.
 *   · Luz motivada. Sólo hay dos fuentes: el limbo iluminado del planeta, que
 *     entra frío por las ventanas de la derecha y recorta los bordes, y las
 *     luces de servicio ámbar de las cuadernas. El resto es sombra. El relleno
 *     es la propia sala capturada en un mapa de entorno (un rebote).
 *   · Materiales con historia. Paneles, juntas, tornillos y planchas del suelo
 *     salen de texturas procedurales proyectadas en triplanar en coordenadas del
 *     mundo, con suciedad, chorretones y rugosidad que varían en el espacio.
 *   · Óptica. Bloom sin umbral (el velo de una lente real), viñeta natural,
 *     una aberración cromática mínima y grano fino al final.
 *
 * Contrato del encuadre (lo que la página pone encima, `object-position: 50% 45%`):
 *   · tercio inferior, centro: suelo oscuro y vacío — ahí se dibuja la mesa CSS.
 *     El desorden de primer plano sólo en las esquinas inferiores.
 *   · arriba a la izquierda: pared en sombra — ahí va el título en blanco.
 *   · centro: el ventanal con espacio negro y estrellas, detrás de los paneles.
 *   · el limbo del planeta, que es lo más brillante, a la derecha.
 *
 * Y lo que NO lleva nunca, porque la página es HTML y lo pintado no se lee ni
 * se traduce (reglas 7 y 8 de AGENTS.md): texto, rótulos, logotipos, interfaz,
 * pantallas con contenido, hologramas, figuras humanas ni mesa. Ni cian: el
 * cian es de lo que proyecta la mesa.
 *
 * Todo el azar sale de una semilla y las secuencias de muestreo son de Halton:
 * repetir el comando en la misma máquina da la misma imagen.
 *
 * Uso:
 *
 *   node tools/render-projects-room.mjs
 *       → assets/proyectos/sala.png, 2560 × 1440, 192 muestras
 *   node tools/render-projects-room.mjs --ancho=1280 --muestras=24 --salida=.shots/sala.png
 *       → borrador rápido para iterar
 *   node tools/render-projects-room.mjs --swiftshader
 *       → sin GPU (SwiftShader). Muy lento; sólo si la GPU real no arranca.
 *
 * Después, `node tools/prepare-projects.mjs` saca las copias WebP publicadas.
 */
import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const args = process.argv.slice(2);

function option(name, fallback) {
  const hit = args.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

const WIDTH = Number(option("ancho", 2560));
const HEIGHT = Math.round((WIDTH * 9) / 16);
const SAMPLES = Number(option("muestras", 192));
const OUTPUT = path.resolve(root, option("salida", "assets/proyectos/sala.png"));
const SOFTWARE = args.includes("--swiftshader");

/*
  La escena vive en el navegador. Esta función no se ejecuta en Node: se
  serializa con `toString()` y se inyecta en la página como módulo, así que no
  puede tocar nada de fuera de su cuerpo. Recibe Three.js y dos utilidades de
  sus addons, y devuelve los píxeles finales ya en sRGB.
*/
async function renderRoom(THREE, extras, params) {
  const { RoundedBoxGeometry, mergeGeometries } = extras;
  const started = performance.now();
  const W = params.width;
  const H = params.height;
  const V3 = THREE.Vector3;

  // ── Azar con semilla y secuencias de baja discrepancia ─────────────────────
  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(params.seed);
  const range = (a, b) => a + (b - a) * rand();
  const chance = (p) => rand() < p;
  const halton = (index, base) => {
    let f = 1;
    let r = 0;
    let i = index;
    while (i > 0) {
      f /= base;
      r += f * (i % base);
      i = Math.floor(i / base);
    }
    return r;
  };
  const smooth = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const lerp = (a, b, t) => a + (b - a) * t;

  // ── Renderer: todo va a render targets; el canvas no se ve nunca ───────────
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 8;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const gl = renderer.getContext();
  const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
  const gpu = debugInfo
    ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    : gl.getParameter(gl.RENDERER);
  const anisotropy = renderer.capabilities.getMaxAnisotropy();

  const NOISE = /* glsl */ `
    float hash13(vec3 p3) {
      p3 = fract(p3 * 0.1031);
      p3 += dot(p3, p3.zyx + 31.32);
      return fract((p3.x + p3.y) * p3.z);
    }
    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }
    float vnoise(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash13(i);
      float b = hash13(i + vec3(1.0, 0.0, 0.0));
      float c = hash13(i + vec3(0.0, 1.0, 0.0));
      float d = hash13(i + vec3(1.0, 1.0, 0.0));
      float e = hash13(i + vec3(0.0, 0.0, 1.0));
      float g = hash13(i + vec3(1.0, 0.0, 1.0));
      float h = hash13(i + vec3(0.0, 1.0, 1.0));
      float k = hash13(i + vec3(1.0, 1.0, 1.0));
      return mix(mix(mix(a, b, f.x), mix(c, d, f.x), f.y), mix(mix(e, g, f.x), mix(h, k, f.x), f.y), f.z);
    }
    float fbm(vec3 p) {
      float s = 0.0;
      float a = 0.5;
      for (int i = 0; i < 5; i++) {
        s += a * vnoise(p);
        p = p * 2.03 + vec3(17.1, 9.2, 3.7);
        a *= 0.5;
      }
      return s / 0.96875;
    }
  `;

  // ── Texturas procedurales: paneles de casco y planchas de suelo ────────────
  /*
    Una textura RGBA por familia: R = altura (juntas hundidas, tornillos
    salientes), G = albedo relativo, B = rugosidad relativa, A = cavidad
    (suciedad en las juntas). Se proyectan en triplanar, así que la densidad es
    la misma en cualquier caja, sea del tamaño que sea.
  */
  function latticeNoise(size, period, rnd) {
    const grid = new Float32Array(period * period);
    for (let i = 0; i < grid.length; i++) grid[i] = rnd();
    const out = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * period;
      const iy = Math.floor(fy);
      const ty = fy - iy;
      const sy = ty * ty * (3 - 2 * ty);
      const y0 = (iy % period) * period;
      const y1 = ((iy + 1) % period) * period;
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * period;
        const ix = Math.floor(fx);
        const tx = fx - ix;
        const sx = tx * tx * (3 - 2 * tx);
        const x0 = ix % period;
        const x1 = (ix + 1) % period;
        const top = grid[y0 + x0] + (grid[y0 + x1] - grid[y0 + x0]) * sx;
        const bottom = grid[y1 + x0] + (grid[y1 + x1] - grid[y1 + x0]) * sx;
        out[y * size + x] = top + (bottom - top) * sy;
      }
    }
    return out;
  }
  function fbmTile(size, period, octaves, rnd) {
    const out = new Float32Array(size * size);
    let amp = 0.5;
    let total = 0;
    for (let o = 0; o < octaves; o++) {
      const layer = latticeNoise(size, Math.min(size, period << o), rnd);
      for (let i = 0; i < out.length; i++) out[i] += layer[i] * amp;
      total += amp;
      amp *= 0.5;
    }
    for (let i = 0; i < out.length; i++) out[i] /= total;
    return out;
  }

  function makeHullTexture(size, kind, seed) {
    const rnd = mulberry32(seed);
    const rr = (a, b) => a + (b - a) * rnd();
    const N = size * size;
    const height = new Float32Array(N).fill(0.5);
    const albedo = new Float32Array(N).fill(1);
    const rough = new Float32Array(N).fill(1);
    const cavity = new Float32Array(N).fill(1);
    const at = (x, y) => (((y % size) + size) % size) * size + (((x % size) + size) % size);

    function fillRect(r, o) {
      const x0 = Math.round(r.x * size);
      const x1 = Math.round((r.x + r.w) * size);
      const y0 = Math.round(r.y * size);
      const y1 = Math.round((r.y + r.h) * size);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const d = Math.min(x - x0, x1 - 1 - x, y - y0, y1 - 1 - y);
          const e = smooth(o.seam, o.seam + o.bevel, d);
          const i = at(x, y);
          height[i] = o.gap + (o.level - o.gap) * e;
          albedo[i] = lerp(0.42, o.tint, e);
          rough[i] = lerp(1.3, o.rough, e);
          cavity[i] = lerp(0.3, 1, smooth(o.seam, o.seam + o.bevel * 2.5, d));
        }
      }
    }
    function inset(r, o) {
      // Panel interior rebajado (o realzado) con su propio bisel.
      const x0 = Math.round(r.x * size);
      const x1 = Math.round((r.x + r.w) * size);
      const y0 = Math.round(r.y * size);
      const y1 = Math.round((r.y + r.h) * size);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const d = Math.min(x - x0, x1 - 1 - x, y - y0, y1 - 1 - y);
          const e = smooth(0, o.bevel, d);
          const i = at(x, y);
          height[i] += o.depth * e;
          cavity[i] *= lerp(0.55, 1, smooth(0, o.bevel * 2, d));
          albedo[i] *= lerp(0.8, o.tint, e);
        }
      }
    }
    function bolt(cx, cy, radius, raise) {
      for (let dy = -radius - 1; dy <= radius + 1; dy++) {
        for (let dx = -radius - 1; dx <= radius + 1; dx++) {
          const r = Math.hypot(dx, dy) / radius;
          if (r >= 1.25) continue;
          const i = at(Math.round(cx + dx), Math.round(cy + dy));
          if (r < 1) {
            height[i] += raise * Math.sqrt(1 - r * r);
            albedo[i] *= 1.15;
            rough[i] *= 0.7;
          } else {
            cavity[i] *= 0.6;
          }
        }
      }
    }
    function slots(r, pitch, width, depth) {
      const x0 = Math.round(r.x * size);
      const x1 = Math.round((r.x + r.w) * size);
      const y0 = Math.round(r.y * size);
      const y1 = Math.round((r.y + r.h) * size);
      for (let y = y0; y < y1; y++) {
        const phase = (y - y0) % pitch;
        if (phase >= width) continue;
        const edge = Math.min(phase, width - 1 - phase);
        for (let x = x0 + 3; x < x1 - 3; x++) {
          const i = at(x, y);
          const k = edge === 0 ? 0.55 : 1;
          height[i] -= depth * k;
          albedo[i] *= 0.35;
          cavity[i] *= 0.35;
          rough[i] = 1.3;
        }
      }
    }

    if (kind === "floor") {
      // Tesela de 2,4 m: filas de 0,6 m, planchas de 1,2 m al tresbolillo.
      for (let row = 0; row < 4; row++) {
        const shift = row % 2 ? 0.25 : 0;
        for (let col = 0; col < 2; col++) {
          const plate = { x: shift + col * 0.5, y: row * 0.25, w: 0.5, h: 0.25 };
          fillRect(plate, {
            seam: 2.2,
            bevel: 2.5,
            gap: 0.12,
            level: 0.5 + rr(-0.015, 0.015),
            tint: rr(0.82, 1.12),
            rough: rr(0.8, 1.15),
          });
          const px = plate.x * size;
          const py = plate.y * size;
          const pw = plate.w * size;
          const ph = plate.h * size;
          for (const [bx, by] of [
            [10, 10],
            [pw - 11, 10],
            [10, ph - 11],
            [pw - 11, ph - 11],
            [pw / 2, 10],
            [pw / 2, ph - 11],
          ]) {
            bolt(px + bx, py + by, 3, -0.06);
          }
          if (rnd() < 0.3) {
            const hatch = {
              x: plate.x + plate.w * rr(0.2, 0.45),
              y: plate.y + plate.h * 0.22,
              w: plate.w * 0.3,
              h: plate.h * 0.56,
            };
            const hx0 = Math.round(hatch.x * size);
            const hy0 = Math.round(hatch.y * size);
            const hx1 = Math.round((hatch.x + hatch.w) * size);
            const hy1 = Math.round((hatch.y + hatch.h) * size);
            for (let y = hy0; y < hy1; y++) {
              for (let x = hx0; x < hx1; x++) {
                const d = Math.min(x - hx0, hx1 - 1 - x, y - hy0, hy1 - 1 - y);
                if (d < 2) {
                  const i = at(x, y);
                  height[i] -= 0.2 * (1 - d / 2);
                  cavity[i] *= 0.5;
                  albedo[i] *= 0.6;
                }
              }
            }
          }
        }
      }
      // Arañazos: trazos cortos que pulen (menos rugosidad) y aclaran.
      for (let s = 0; s < 260; s++) {
        let x = rnd() * size;
        let y = rnd() * size;
        const angle = rr(-0.5, 0.5) + (rnd() < 0.5 ? 0 : Math.PI / 2);
        const len = rr(8, 70);
        for (let t = 0; t < len; t++) {
          const i = at(Math.round(x), Math.round(y));
          rough[i] *= 0.72;
          albedo[i] *= 1.12;
          x += Math.cos(angle);
          y += Math.sin(angle);
        }
      }
    } else {
      // Casco: subdivisión recursiva en paneles; los bordes de la tesela son
      // juntas, así que se repite sin costura.
      const rects = [];
      const split = (r, depth) => {
        const big = Math.max(r.w, r.h);
        if (depth > 4 || big < 0.2 || (depth > 1 && rnd() < 0.25)) {
          rects.push(r);
          return;
        }
        const t = rr(0.34, 0.66);
        if (r.w >= r.h) {
          const a = Math.round(r.w * t * 32) / 32;
          split({ x: r.x, y: r.y, w: a, h: r.h }, depth + 1);
          split({ x: r.x + a, y: r.y, w: r.w - a, h: r.h }, depth + 1);
        } else {
          const a = Math.round(r.h * t * 32) / 32;
          split({ x: r.x, y: r.y, w: r.w, h: a }, depth + 1);
          split({ x: r.x, y: r.y + a, w: r.w, h: r.h - a }, depth + 1);
        }
      };
      split({ x: 0, y: 0, w: 1, h: 1 }, 0);
      for (const r of rects) {
        const level = 0.5 + rr(-0.03, 0.05);
        fillRect(r, {
          seam: 1.6,
          bevel: 3,
          gap: 0.3,
          level,
          tint: rr(0.78, 1.16),
          rough: rr(0.78, 1.22),
        });
        const px = r.x * size;
        const py = r.y * size;
        const pw = r.w * size;
        const ph = r.h * size;
        if (rnd() < 0.55) {
          const step = rr(48, 90);
          for (let x = 9; x < pw - 8; x += step) {
            bolt(px + x, py + 8, 2.5, 0.1);
            bolt(px + x, py + ph - 9, 2.5, 0.1);
          }
        } else {
          for (const [bx, by] of [
            [9, 9],
            [pw - 10, 9],
            [9, ph - 10],
            [pw - 10, ph - 10],
          ]) {
            bolt(px + bx, py + by, 2.5, 0.1);
          }
        }
        const roll = rnd();
        const inner = {
          x: r.x + 18 / size,
          y: r.y + 18 / size,
          w: r.w - 36 / size,
          h: r.h - 36 / size,
        };
        if (inner.w > 0.05 && inner.h > 0.05) {
          if (roll < 0.16) {
            slots({ x: inner.x, y: inner.y, w: inner.w, h: Math.min(inner.h, 0.16) }, 9, 4, 0.16);
          } else if (roll < 0.4) {
            inset(inner, { depth: rnd() < 0.5 ? -0.05 : 0.04, bevel: 4, tint: rr(0.85, 1.1) });
          }
        }
      }
    }

    // Manchas grandes y suciedad fina, las dos repetibles.
    const stains = fbmTile(size, 4, 5, rnd);
    const smudge = fbmTile(size, 8, 4, rnd);
    const data = new Uint8Array(N * 4);
    for (let i = 0; i < N; i++) {
      const a = albedo[i] * (0.82 + 0.36 * stains[i]);
      const r = rough[i] * (0.85 + 0.3 * smudge[i]);
      data[i * 4] = Math.round(Math.min(1, Math.max(0, height[i])) * 255);
      data[i * 4 + 1] = Math.round(Math.min(1, Math.max(0, a / 1.5)) * 255);
      data[i * 4 + 2] = Math.round(Math.min(1, Math.max(0, r / 1.5)) * 255);
      data[i * 4 + 3] = Math.round(Math.min(1, Math.max(0, cavity[i])) * 255);
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = anisotropy;
    tex.needsUpdate = true;
    return tex;
  }

  const texPanel = makeHullTexture(1024, "panel", params.seed + 11);
  const texFloor = makeHullTexture(1024, "floor", params.seed + 23);

  // ── Material de superficie: triplanar + suciedad en espacio de mundo ───────
  const shared = {
    uReflTex: { value: null },
    uReflMatrix: { value: new THREE.Matrix4() },
    uReflJitter: { value: new THREE.Vector2() },
  };

  function patchSurface(shader) {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNrm;")
      .replace(
        "#include <worldpos_vertex>",
        /* glsl */ `#include <worldpos_vertex>
        vec4 surfPos = vec4(transformed, 1.0);
        vec3 surfNrm = objectNormal;
        #ifdef USE_INSTANCING
          surfPos = instanceMatrix * surfPos;
          surfNrm = mat3(instanceMatrix) * surfNrm;
        #endif
        vWPos = (modelMatrix * surfPos).xyz;
        vWNrm = normalize(mat3(modelMatrix) * surfNrm);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
        varying vec3 vWPos;
        varying vec3 vWNrm;
        uniform sampler2D uTex;
        uniform float uTexScale;
        uniform float uBump;
        uniform float uGrime;
        uniform float uAlbedoVar;
        uniform sampler2D uReflTex;
        uniform mat4 uReflMatrix;
        uniform vec2 uReflJitter;
        uniform float uReflStrength;
        ${NOISE}
        vec3 triWeights(vec3 n) {
          vec3 w = pow(abs(n), vec3(8.0));
          return w / (w.x + w.y + w.z);
        }`,
      )
      .replace(
        "#include <map_fragment>",
        /* glsl */ `#include <map_fragment>
        vec3 surfN = normalize(vWNrm);
        #ifdef DOUBLE_SIDED
          surfN *= gl_FrontFacing ? 1.0 : -1.0;
        #endif
        vec3 surfW = triWeights(surfN);
        vec4 surfS = vec4(0.5, 0.6667, 0.6667, 1.0);
        #if SURF_TEX == 1
          vec3 sp = vWPos * uTexScale;
          surfS = texture2D(uTex, sp.zy) * surfW.x + texture2D(uTex, sp.xz) * surfW.y + texture2D(uTex, sp.xy) * surfW.z;
        #endif
        float surfBroad = fbm(vWPos * 0.45);
        float surfFine = fbm(vWPos * 2.7 + 5.0);
        float surfStreak = fbm(vec3(vWPos.x * 6.0, vWPos.y * 0.5, vWPos.z * 6.0));
        float surfLow = 1.0 - smoothstep(0.0, 0.45, vWPos.y);
        float surfTone = (1.0 + (surfBroad - 0.5) * uAlbedoVar * 2.0)
          * (1.0 - uGrime * 0.3 * smoothstep(0.5, 0.8, surfStreak))
          * (1.0 - uGrime * 0.35 * surfLow);
        diffuseColor.rgb *= surfTone * surfS.g * 1.5 * mix(1.0, surfS.a, 0.9);`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        /* glsl */ `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor * surfS.b * 1.5 + (surfFine - 0.5) * 0.35 * uGrime + surfLow * 0.08 * uGrime, 0.04, 1.0);`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        /* glsl */ `#include <normal_fragment_maps>
        #if SURF_TEX == 1
        {
          float e = 1.0 / 1024.0;
          vec3 sp2 = vWPos * uTexScale;
          vec2 uvx = sp2.zy;
          vec2 uvy = sp2.xz;
          vec2 uvz = sp2.xy;
          float hx = texture2D(uTex, uvx).r;
          float hy = texture2D(uTex, uvy).r;
          float hz = texture2D(uTex, uvz).r;
          vec3 gx = vec3(0.0, texture2D(uTex, uvx + vec2(0.0, e)).r - hx, texture2D(uTex, uvx + vec2(e, 0.0)).r - hx);
          vec3 gy = vec3(texture2D(uTex, uvy + vec2(e, 0.0)).r - hy, 0.0, texture2D(uTex, uvy + vec2(0.0, e)).r - hy);
          vec3 gz = vec3(texture2D(uTex, uvz + vec2(e, 0.0)).r - hz, texture2D(uTex, uvz + vec2(0.0, e)).r - hz, 0.0);
          vec3 grad = (gx * surfW.x + gy * surfW.y + gz * surfW.z) * (uBump * uTexScale / e);
          grad -= surfN * dot(grad, surfN);
          vec3 bumped = normalize(surfN - grad);
          normal = normalize((viewMatrix * vec4(bumped, 0.0)).xyz);
        }
        #endif`,
      )
      .replace(
        "#include <opaque_fragment>",
        /* glsl */ `#if SURF_REFLECT == 1
        {
          vec4 rp = uReflMatrix * vec4(vWPos, 1.0);
          vec2 ruv = rp.xy / rp.w * 0.5 + 0.5;
          vec3 wn = (vec4(normal, 0.0) * viewMatrix).xyz;
          // Reflejo glossy: la textura se desenfoca por mipmaps según la
          // rugosidad y el resto lo hace el desplazamiento por muestra, estirado
          // en vertical como en un suelo de verdad.
          ruv += wn.xz * 0.015 + uReflJitter * vec2(0.22, 1.0) * (0.002 + roughnessFactor * roughnessFactor * 0.05);
          vec3 refl = textureLod(uReflTex, ruv, 1.0 + roughnessFactor * 5.0).rgb;
          vec3 V = normalize(vViewPosition);
          float NoV = clamp(dot(normal, V), 0.0, 1.0);
          float F = 0.04 + 0.96 * pow(1.0 - NoV, 5.0);
          float gloss = 1.0 - smoothstep(0.1, 0.75, roughnessFactor);
          outgoingLight += refl * F * gloss * uReflStrength;
        }
        #endif
        #include <opaque_fragment>`,
      );
  }

  function surface(o) {
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(o.color),
      roughness: o.roughness ?? 0.6,
      metalness: o.metalness ?? 0.3,
      envMapIntensity: o.env ?? 1,
      side: o.side ?? THREE.FrontSide,
    });
    const uniforms = {
      uTex: { value: o.tex === "floor" ? texFloor : texPanel },
      uTexScale: { value: 1 / (o.tile ?? 2) },
      uBump: { value: o.bump ?? 0.004 },
      uGrime: { value: o.grime ?? 1 },
      uAlbedoVar: { value: o.albedoVar ?? 0.35 },
      uReflStrength: { value: o.reflect ?? 0 },
      ...shared,
    };
    m.defines = { SURF_TEX: o.tex ? 1 : 0, SURF_REFLECT: o.reflect ? 1 : 0 };
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      patchSurface(shader);
    };
    m.customProgramCacheKey = () => `superficie-${m.defines.SURF_TEX}-${m.defines.SURF_REFLECT}`;
    m.userData.cast = o.cast ?? true;
    return m;
  }

  function glow(r, g, b, k) {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(r * k, g * k, b * k) });
    m.userData.cast = false;
    return m;
  }

  // Paleta: carbón, acero frío, gris cálido apagado. Nada saturado.
  const mat = {
    hull: surface({ color: "#8a8c8e", roughness: 0.62, metalness: 0.25, tex: "panel", tile: 2.2, bump: 0.005 }),
    hullDark: surface({ color: "#55585b", roughness: 0.58, metalness: 0.3, tex: "panel", tile: 1.6, bump: 0.004 }),
    rib: surface({ color: "#4a4d50", roughness: 0.42, metalness: 0.65, tex: "panel", tile: 3.1, bump: 0.002, albedoVar: 0.25 }),
    floor: surface({ color: "#353637", roughness: 0.34, metalness: 0.3, tex: "floor", tile: 2.4, bump: 0.0025, reflect: 1, env: 0.35 }),
    steel: surface({ color: "#9a9ea2", roughness: 0.35, metalness: 0.85, albedoVar: 0.2, grime: 0.6 }),
    rack: surface({ color: "#3c3f42", roughness: 0.5, metalness: 0.4, tex: "panel", tile: 0.9, bump: 0.002 }),
    rackWarm: surface({ color: "#4a4640", roughness: 0.55, metalness: 0.35, tex: "panel", tile: 0.8, bump: 0.002 }),
    crate: surface({ color: "#5c5d52", roughness: 0.7, metalness: 0.1, albedoVar: 0.3, tex: "panel", tile: 0.7, bump: 0.0015 }),
    crateGrey: surface({ color: "#76797b", roughness: 0.6, metalness: 0.2, albedoVar: 0.3, tex: "panel", tile: 0.6, bump: 0.0015 }),
    duct: surface({ color: "#55585b", roughness: 0.62, metalness: 0.45, albedoVar: 0.3 }),
    rubber: surface({ color: "#1a1a1b", roughness: 0.75, metalness: 0, albedoVar: 0.15, grime: 0.4 }),
    cable: surface({ color: "#161718", roughness: 0.45, metalness: 0.1, albedoVar: 0.2, grime: 0.3 }),
    pipe: surface({ color: "#6d7073", roughness: 0.52, metalness: 0.7, albedoVar: 0.25 }),
    paper: surface({ color: "#b8b4aa", roughness: 0.85, metalness: 0, albedoVar: 0.08, grime: 0.2 }),
    fixture: surface({ color: "#2b2c2d", roughness: 0.5, metalness: 0.5, cast: false }),
    lamp: glow(1.0, 0.58, 0.22, 7),
    ledAmber: glow(1.0, 0.52, 0.16, 9),
    ledWhite: glow(0.85, 0.88, 1.0, 4),
  };

  // ── Constructor: geometrías agrupadas por material y fusionadas ────────────
  const batches = new Map();
  function addGeo(geometry, material, matrix) {
    if (matrix) geometry.applyMatrix4(matrix);
    let list = batches.get(material);
    if (!list) {
      list = [];
      batches.set(material, list);
    }
    list.push(geometry);
  }
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler();
  const _one = new V3(1, 1, 1);
  function trs(pos, rot = [0, 0, 0]) {
    return new THREE.Matrix4().compose(
      new V3(pos[0], pos[1], pos[2]),
      _q.setFromEuler(_e.set(rot[0], rot[1], rot[2])),
      _one,
    );
  }
  function box(size, material, pos, rot, radius = 0.012) {
    const [w, h, d] = size;
    const r = Math.min(radius, w * 0.45, h * 0.45, d * 0.45);
    const geo = r > 0.002 ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d);
    addGeo(geo, material, trs(pos, rot));
  }
  function cyl(radius, length, material, pos, rot, segments = 20) {
    addGeo(new THREE.CylinderGeometry(radius, radius, length, segments, 1), material, trs(pos, rot));
  }
  function tube(points, radius, material, segments = 48, radial = 8) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new V3(p[0], p[1], p[2])));
    addGeo(new THREE.TubeGeometry(curve, segments, radius, radial, false), material);
  }
  /** Cable colgando entre dos puntos: catenaria aproximada por una parábola. */
  function sag(a, b, drop, radius, material) {
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      pts.push([
        lerp(a[0], b[0], t),
        lerp(a[1], b[1], t) - drop * 4 * t * (1 - t),
        lerp(a[2], b[2], t),
      ]);
    }
    tube(pts, radius, material, 24, 7);
  }
  function roundedRect(pathObj, u0, v0, u1, v1, r) {
    pathObj.moveTo(u0 + r, v0);
    pathObj.lineTo(u1 - r, v0);
    pathObj.absarc(u1 - r, v0 + r, r, -Math.PI / 2, 0, false);
    pathObj.lineTo(u1, v1 - r);
    pathObj.absarc(u1 - r, v1 - r, r, 0, Math.PI / 2, false);
    pathObj.lineTo(u0 + r, v1);
    pathObj.absarc(u0 + r, v1 - r, r, Math.PI / 2, Math.PI, false);
    pathObj.lineTo(u0, v0 + r);
    pathObj.absarc(u0 + r, v0 + r, r, Math.PI, Math.PI * 1.5, false);
    return pathObj;
  }
  function ring(u0, v0, u1, v1, r, width) {
    const shape = roundedRect(new THREE.Shape(), u0 - width, v0 - width, u1 + width, v1 + width, r + width);
    shape.holes.push(roundedRect(new THREE.Path(), u0, v0, u1, v1, r));
    return shape;
  }

  const room = new THREE.Group();
  const scene = new THREE.Scene();
  scene.add(room);

  // ── La sala: sección de bóveda facetada, cuadernas cada 1,9 m ─────────────
  const BACK = -9;
  const FRONT = 9.4;
  const RIBS = [-8.3, -6.4, -4.5, -2.6, -0.7, 1.2, 3.1, 5.0, 6.9, 8.8];
  const halfProfile = [
    [4.6, 0],
    [4.6, 2.4],
    [4.3, 3.2],
    [3.6, 3.9],
    [2.6, 4.35],
    [1.35, 4.6],
  ];
  const profile = [
    ...halfProfile.map(([x, y]) => [-x, y]),
    [0, 4.7],
    ...halfProfile.slice().reverse(),
  ];
  function offsetPath(pathPts, d) {
    const n = pathPts.length;
    const normals = [];
    for (let i = 0; i < n - 1; i++) {
      const dx = pathPts[i + 1][0] - pathPts[i][0];
      const dy = pathPts[i + 1][1] - pathPts[i][1];
      const l = Math.hypot(dx, dy);
      normals.push([dy / l, -dx / l]);
    }
    return pathPts.map((p, i) => {
      const a = normals[Math.max(0, i - 1)];
      const b = normals[Math.min(n - 2, i)];
      let nx = a[0] + b[0];
      let ny = a[1] + b[1];
      const l = Math.hypot(nx, ny);
      nx /= l;
      ny /= l;
      const k = d / (nx * b[0] + ny * b[1]);
      return [p[0] + nx * k, p[1] + ny * k];
    });
  }
  function ringFromPaths(outer, inner) {
    const s = new THREE.Shape();
    s.moveTo(outer[0][0], outer[0][1]);
    for (const p of outer.slice(1)) s.lineTo(p[0], p[1]);
    for (const p of inner.slice().reverse()) s.lineTo(p[0], p[1]);
    s.closePath();
    return s;
  }
  /** Base local de un tramo del perfil: u → z, v → a lo largo del tramo, w → hacia fuera. */
  function edgeFrame(i) {
    const a = profile[i];
    const b = profile[i + 1];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    const tx = dx / len;
    const ty = dy / len;
    const nx = ty;
    const ny = -tx;
    const m = new THREE.Matrix4()
      .makeBasis(new V3(0, 0, 1), new V3(tx, ty, 0), new V3(-nx, -ny, 0))
      .setPosition(a[0], a[1], 0);
    return { m, len, tx, ty, nx, ny, a };
  }
  const local = (f, u, v, w) =>
    new V3(f.a[0] + f.tx * v - f.nx * w, f.a[1] + f.ty * v - f.ny * w, u);

  // Cuadernas: alma + ala interior, como una T que atrapa el borde de luz.
  const ribWeb = ringFromPaths(offsetPath(profile, -0.1), offsetPath(profile, 0.3));
  const ribFlange = ringFromPaths(offsetPath(profile, 0.28), offsetPath(profile, 0.345));
  for (const z of RIBS) {
    addGeo(
      new THREE.ExtrudeGeometry(ribWeb, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2 }),
      mat.rib,
      trs([0, 0, z - 0.1]),
    );
    addGeo(
      new THREE.ExtrudeGeometry(ribFlange, { depth: 0.4, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 2 }),
      mat.rib,
      trs([0, 0, z - 0.2]),
    );
  }

  // Ventanas laterales (pared derecha) en las tres crujías del fondo.
  const sideWindows = [];
  for (let j = 0; j < 3; j++) {
    sideWindows.push({ z0: RIBS[j] + 0.36, z1: RIBS[j + 1] - 0.36 });
  }
  const lastEdge = profile.length - 2; // (4.6, 2.3) → (4.6, 0)
  const kneeEdge = profile.length - 3; // (4.3, 3.05) → (4.6, 2.3)

  // Piel del casco: un tramo por arista del perfil, de punta a punta.
  for (let i = 0; i < profile.length - 1; i++) {
    const f = edgeFrame(i);
    const shape = new THREE.Shape();
    shape.moveTo(BACK - 0.5, -0.08);
    shape.lineTo(FRONT, -0.08);
    shape.lineTo(FRONT, f.len + 0.08);
    shape.lineTo(BACK - 0.5, f.len + 0.08);
    shape.closePath();
    if (i === lastEdge) {
      for (const win of sideWindows) shape.holes.push(roundedRect(new THREE.Path(), win.z0, 0.12, win.z1, 1.42, 0.18));
    }
    if (i === kneeEdge) {
      for (const win of sideWindows) shape.holes.push(roundedRect(new THREE.Path(), win.z0, 0.16, win.z1, f.len - 0.06, 0.1));
    }
    addGeo(new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false }), i === lastEdge || i === 0 ? mat.hullDark : mat.hull, f.m);
  }

  // Marcos de las ventanas laterales, con tornillería.
  const glassPanes = [];
  for (const win of sideWindows) {
    for (const [edge, v0, v1, r] of [
      [lastEdge, 0.12, 1.42, 0.18],
      [kneeEdge, 0.16, edgeFrame(kneeEdge).len - 0.06, 0.1],
    ]) {
      const f = edgeFrame(edge);
      const frame = ring(win.z0, v0, win.z1, v1, r, 0.09);
      const geo = new THREE.ExtrudeGeometry(frame, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 2 });
      geo.translate(0, 0, -0.1);
      addGeo(geo, mat.rib, f.m);
      for (let u = win.z0 + 0.1; u < win.z1 - 0.05; u += 0.16) {
        for (const v of [v0 - 0.045, v1 + 0.045]) {
          const p = local(f, u, v, -0.115);
          const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), new V3(f.nx, f.ny, 0));
          const g = new THREE.CylinderGeometry(0.011, 0.011, 0.012, 8);
          g.applyQuaternion(q);
          g.translate(p.x, p.y, p.z);
          addGeo(g, mat.steel);
        }
      }
      const pane = roundedRect(new THREE.Shape(), win.z0, v0, win.z1, v1, r);
      const pg = new THREE.ShapeGeometry(pane, 8);
      pg.applyMatrix4(f.m);
      pg.translate(-f.nx * -0.03, -f.ny * -0.03, 0);
      glassPanes.push(pg);
    }
  }

  // Mamparo del fondo con el ventanal: tres paños y dos parteluces. El de la
  // derecha es el del planeta.
  const backWindows = [
    { x0: -3.3, x1: -1.3, y0: 0.85, y1: 3.35, r: 0.3, shutter: true },
    { x0: -1.0, x1: 1.0, y0: 0.85, y1: 3.35, r: 0.3 },
    { x0: 1.3, x1: 4.15, y0: 0.85, y1: 3.35, r: 0.3 },
  ];
  {
    const outer = offsetPath(profile, -0.12);
    const shape = new THREE.Shape();
    shape.moveTo(outer[0][0], -0.2);
    for (const p of outer) shape.lineTo(p[0], Math.max(p[1], -0.2));
    shape.lineTo(outer[outer.length - 1][0], -0.2);
    shape.closePath();
    for (const w of backWindows) shape.holes.push(roundedRect(new THREE.Path(), w.x0, w.y0, w.x1, w.y1, w.r));
    addGeo(
      new THREE.ExtrudeGeometry(shape, { depth: 0.34, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 }),
      mat.hull,
      trs([0, 0, BACK - 0.36]),
    );
    for (const w of backWindows) {
      const frame = ring(w.x0, w.y0, w.x1, w.y1, w.r, 0.11);
      addGeo(
        new THREE.ExtrudeGeometry(frame, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 2 }),
        mat.rib,
        trs([0, 0, BACK - 0.02]),
      );
      const per = 2 * (w.x1 - w.x0 + w.y1 - w.y0);
      const count = Math.round(per / 0.17);
      for (let k = 0; k < count; k++) {
        // Tornillos repartidos por el perímetro (aproximado con el rectángulo).
        let s = (k / count) * per;
        let x;
        let y;
        const wx = w.x1 - w.x0 + 0.11;
        const wy = w.y1 - w.y0 + 0.11;
        if (s < wx) {
          x = w.x0 - 0.055 + s;
          y = w.y0 - 0.055;
        } else if ((s -= wx) < wy) {
          x = w.x1 + 0.055;
          y = w.y0 - 0.055 + s;
        } else if ((s -= wy) < wx) {
          x = w.x1 + 0.055 - s;
          y = w.y1 + 0.055;
        } else {
          s -= wx;
          x = w.x0 - 0.055;
          y = w.y1 + 0.055 - s;
        }
        const nearCorner =
          (Math.abs(x - w.x0) < w.r || Math.abs(x - w.x1) < w.r) && (Math.abs(y - w.y0) < w.r || Math.abs(y - w.y1) < w.r);
        if (nearCorner) continue;
        cyl(0.012, 0.014, mat.steel, [x, y, BACK + 0.14], [Math.PI / 2, 0, 0], 8);
      }
      const pg = new THREE.ShapeGeometry(roundedRect(new THREE.Shape(), w.x0, w.y0, w.x1, w.y1, w.r), 8);
      pg.translate(0, 0, BACK - 0.16);
      glassPanes.push(pg);
      if (w.shutter) {
        // Contraventana blindada, cerrada: la luz del planeta que entraría por
        // aquí caería justo en la pared del título.
        const cx = (w.x0 + w.x1) / 2;
        const cy = (w.y0 + w.y1) / 2;
        const sw = w.x1 - w.x0 + 0.3;
        const sh = w.y1 - w.y0 + 0.3;
        box([sw, sh, 0.05], mat.hullDark, [cx, cy, BACK + 0.17], [0, 0, 0], 0.05);
        for (let k = 1; k < 6; k++) {
          box([sw - 0.24, 0.05, 0.05], mat.rack, [cx, w.y0 - 0.15 + (k * sh) / 6, BACK + 0.21], [0, 0, 0], 0.012);
        }
        cyl(0.05, sw - 0.1, mat.pipe, [cx, w.y1 + 0.2, BACK + 0.2], [0, 0, Math.PI / 2], 16);
        for (const dx of [-sw / 2 + 0.12, sw / 2 - 0.12]) {
          box([0.07, 0.16, 0.06], mat.steel, [cx + dx, cy, BACK + 0.22], [0, 0, 0], 0.012);
        }
      }
    }
    // Parteluces: columnas con conductos verticales.
    for (const mx of [-1.15, 1.15]) {
      box([0.36, 3.6, 0.3], mat.rack, [mx, 1.8, BACK + 0.12], [0, 0, 0], 0.03);
      for (const dx of [-0.09, 0.09]) cyl(0.03, 3.5, mat.pipe, [mx + dx, 1.75, BACK + 0.31], [0, 0, 0], 14);
      for (const y of [0.55, 1.5, 2.45, 3.3]) box([0.34, 0.05, 0.1], mat.steel, [mx, y, BACK + 0.33], [0, 0, 0], 0.01);
    }
    // Viga de cabecera sobre el ventanal.
    box([8.6, 0.34, 0.4], mat.rib, [0, 3.62, BACK + 0.2], [0, 0, 0], 0.03);
    box([8.6, 0.05, 0.46], mat.steel, [0, 3.44, BACK + 0.22], [0, 0, 0], 0.01);
  }

  // Suelo: planchas y zócalos.
  box([9.4, 0.1, FRONT - BACK + 0.6], mat.floor, [0, -0.05, (FRONT + BACK) / 2], [0, 0, 0], 0);
  for (const s of [-1, 1]) box([0.06, 0.14, FRONT - BACK], mat.hullDark, [s * 4.56, 0.07, (FRONT + BACK) / 2], [0, 0, 0], 0.01);
  box([9.2, 0.14, 0.06], mat.hullDark, [0, 0.07, BACK + 0.03], [0, 0, 0], 0.01);

  // ── Equipamiento: módulos por crujía, a los dos lados ──────────────────────
  const leds = [];
  function led(pos, material) {
    leds.push({ pos, material });
    box([0.012, 0.008, 0.008], material, pos, [0, 0, 0], 0);
  }
  function rack(side, z0, z1, h, material) {
    const depth = range(0.5, 0.66);
    const x = side * (4.6 - depth / 2);
    const len = z1 - z0;
    const zc = (z0 + z1) / 2;
    box([depth, h, len], material, [x, h / 2, zc], [0, 0, 0], 0.02);
    // Frente: unidades de alturas distintas, algunas con asas y respiraderos.
    let y = 0.12;
    const face = side * (4.6 - depth);
    while (y < h - 0.12) {
      const uh = Math.min(h - 0.1 - y, range(0.12, 0.42));
      if (uh < 0.06) break;
      const proud = range(0.008, 0.03);
      box([proud * 2, uh - 0.014, len - 0.08], chance(0.25) ? mat.rackWarm : mat.rack, [face - side * proud, y + uh / 2, zc], [0, 0, 0], 0.006);
      if (chance(0.55)) {
        for (const dz of [-len / 2 + 0.12, len / 2 - 0.12]) {
          cyl(0.009, 0.1, mat.steel, [face - side * (proud * 2 + 0.03), y + uh / 2, zc + dz], [0, 0, 0], 8);
        }
      }
      if (chance(0.3)) {
        for (let k = 0; k < Math.floor((uh - 0.04) / 0.025); k++) {
          box([0.006, 0.008, len * 0.5], mat.rubber, [face - side * (proud * 2 + 0.002), y + 0.03 + k * 0.025, zc + len * 0.1], [0, 0, 0], 0);
        }
      }
      if (chance(0.45)) {
        const n = 1 + Math.floor(rand() * 4);
        for (let k = 0; k < n; k++) {
          const lit = chance(0.7);
          const pos = [face - side * (proud * 2 + 0.004), y + uh - 0.035, zc - len / 2 + 0.1 + k * 0.035];
          if (lit) led(pos, chance(0.75) ? mat.ledAmber : mat.ledWhite);
          else box([0.012, 0.008, 0.008], mat.rubber, pos, [0, 0, 0], 0);
        }
      }
      y += uh;
    }
    // Mazo de cables que sale por arriba hacia la bandeja.
    for (let k = 0; k < 3; k++) {
      const zz = zc + range(-len / 3, len / 3);
      tube(
        [
          [x, h, zz],
          [x + side * range(0.0, 0.1), h + 0.15, zz + range(-0.05, 0.05)],
          [side * 4.25, 2.12, zz + range(-0.2, 0.2)],
        ],
        range(0.012, 0.022),
        mat.cable,
        12,
        6,
      );
    }
  }
  function lockers(side, z0, z1) {
    const depth = 0.5;
    const x = side * (4.6 - depth / 2);
    const len = z1 - z0;
    const doors = 3;
    const dl = len / doors;
    box([depth, 2.0, len], mat.hullDark, [x, 1.0, (z0 + z1) / 2], [0, 0, 0], 0.02);
    for (let k = 0; k < doors; k++) {
      const zc = z0 + dl * (k + 0.5);
      box([0.02, 1.9, dl - 0.02], chance(0.3) ? mat.rackWarm : mat.rack, [side * (4.6 - depth - 0.01), 1.0, zc], [0, 0, 0], 0.006);
      box([0.03, 0.14, 0.04], mat.steel, [side * (4.6 - depth - 0.03), 1.05, zc + dl * 0.32], [0, 0, 0], 0.008);
      for (let s = 0; s < 5; s++) box([0.006, 0.01, dl * 0.6], mat.rubber, [side * (4.6 - depth - 0.021), 1.75 + s * 0.03, zc], [0, 0, 0], 0);
    }
  }
  function crates(side, z0, z1) {
    let z = z0 + 0.05;
    while (z < z1 - 0.3) {
      const w = Math.min(z1 - z - 0.05, range(0.45, 0.9));
      const d = range(0.45, 0.75);
      const h = range(0.35, 0.7);
      const x = side * (4.6 - d / 2 - 0.05);
      crateBox([d, h, w], [x, h / 2, z + w / 2], chance(0.5) ? mat.crate : mat.crateGrey);
      if (chance(0.6)) {
        const h2 = range(0.25, 0.5);
        const d2 = d * range(0.7, 0.95);
        crateBox([d2, h2, w * range(0.7, 0.95)], [side * (4.6 - d2 / 2 - 0.05), h + h2 / 2, z + w / 2 + range(-0.05, 0.05)], chance(0.5) ? mat.crate : mat.crateGrey, range(-0.08, 0.08));
      }
      z += w + range(0.04, 0.12);
    }
  }
  function crateBox(size, pos, material, yaw = 0) {
    const [w, h, d] = size;
    box(size, material, pos, [0, yaw, 0], 0.02);
    // Cantoneras y flejes: lo que hace que una caja parezca una caja.
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const lx = (sx * w) / 2;
        const lz = (sz * d) / 2;
        box([0.05, h + 0.01, 0.05], mat.rubber, [pos[0] + lx * c + lz * s, pos[1], pos[2] - lx * s + lz * c], [0, yaw, 0], 0.01);
      }
    }
    for (const fy of [-h * 0.3, h * 0.3]) {
      box([w + 0.012, 0.035, d + 0.012], mat.rubber, [pos[0], pos[1] + fy, pos[2]], [0, yaw, 0], 0.006);
    }
  }
  function pipes(side, z0, z1) {
    const n = 3 + Math.floor(rand() * 2);
    for (let k = 0; k < n; k++) {
      const r = range(0.035, 0.07);
      const z = lerp(z0 + 0.2, z1 - 0.2, (k + 0.5) / n);
      const x = side * (4.6 - 0.12 - r - (k % 2) * 0.14);
      cyl(r, 2.25, mat.pipe, [x, 1.125, z], [0, 0, 0], 16);
      for (const y of [0.3, 1.2, 2.0]) cyl(r * 1.35, 0.05, mat.steel, [x, y, z], [0, 0, 0], 16);
      if (chance(0.5)) {
        const wy = range(0.9, 1.5);
        addGeo(new THREE.TorusGeometry(0.1, 0.012, 8, 24), mat.steel, trs([x - side * (r + 0.07), wy, z], [0, Math.PI / 2, 0]));
        cyl(0.012, 0.08, mat.steel, [x - side * (r + 0.035), wy, z], [0, 0, Math.PI / 2], 8);
      }
    }
  }

  const bays = [];
  for (let j = 0; j < RIBS.length - 1; j++) bays.push({ z0: RIBS[j] + 0.24, z1: RIBS[j + 1] - 0.24, j });
  for (const bay of bays) {
    // Izquierda: pared de equipo, siempre en sombra (ahí va el título).
    const leftKind = [rack, rack, lockers, pipes, rack, crates, rack, lockers, rack][bay.j];
    if (leftKind === rack) rack(-1, bay.z0, bay.z1, range(1.7, 2.05), chance(0.5) ? mat.rack : mat.rackWarm);
    else leftKind(-1, bay.z0, bay.z1);
    // Derecha: bajo las ventanas, cajas bajas; delante, equipo.
    if (bay.j < 3) {
      crates(1, bay.z0, bay.z1);
    } else {
      const rightKind = [rack, pipes, lockers, rack, crates, rack][bay.j - 3] ?? rack;
      if (rightKind === rack) rack(1, bay.z0, bay.z1, range(1.6, 2.0), chance(0.5) ? mat.rack : mat.rackWarm);
      else rightKind(1, bay.z0, bay.z1);
    }
  }

  // Pasamanos, bandejas de cable y conductos a todo lo largo.
  for (const side of [-1, 1]) {
    const railX = side * 4.16;
    cyl(0.022, FRONT - BACK, mat.steel, [railX, 1.08, (FRONT + BACK) / 2], [Math.PI / 2, 0, 0], 14);
    for (let z = BACK + 0.6; z < FRONT; z += 0.95) {
      box([0.3, 0.03, 0.03], mat.steel, [side * 4.3, 1.08, z], [0, 0, 0], 0.008);
    }
    // Bandeja en U a 2,15 m, con cables dentro y cables colgando entre cuadernas.
    const trayX = side * 4.12;
    box([0.36, 0.02, FRONT - BACK], mat.rack, [trayX, 2.12, (FRONT + BACK) / 2], [0, 0, 0], 0.005);
    box([0.02, 0.1, FRONT - BACK], mat.rack, [trayX - side * 0.18, 2.17, (FRONT + BACK) / 2], [0, 0, 0], 0.005);
    for (let k = 0; k < 4; k++) {
      cyl(range(0.018, 0.03), FRONT - BACK, mat.cable, [trayX + range(-0.12, 0.12), 2.155, (FRONT + BACK) / 2], [Math.PI / 2, 0, 0], 8);
    }
    for (let j = 0; j < RIBS.length - 1; j++) {
      if (!chance(0.7)) continue;
      const za = RIBS[j] + 0.3;
      const zb = RIBS[j + 1] - 0.3;
      sag([side * 3.95, 2.62, za], [side * 3.95, 2.62, zb], range(0.08, 0.26), range(0.012, 0.022), mat.cable);
      if (chance(0.5)) sag([side * 3.9, 2.7, za], [side * 3.9, 2.7, zb], range(0.15, 0.35), 0.01, mat.cable);
    }
    // Conducto grande en la bóveda, con collares en cada cuaderna.
    const ductX = side * 2.95;
    const ductY = 3.55;
    cyl(0.17, FRONT - BACK, mat.duct, [ductX, ductY, (FRONT + BACK) / 2], [Math.PI / 2, 0, 0], 24);
    cyl(0.07, FRONT - BACK, mat.duct, [side * 3.35, 3.2, (FRONT + BACK) / 2], [Math.PI / 2, 0, 0], 14);
    for (const z of RIBS) {
      cyl(0.2, 0.08, mat.steel, [ductX, ductY, z + 0.32], [Math.PI / 2, 0, 0], 24);
      cyl(0.2, 0.08, mat.steel, [ductX, ductY, z - 0.32], [Math.PI / 2, 0, 0], 24);
    }
  }
  // Espina central del techo.
  box([0.56, 0.18, FRONT - BACK], mat.rack, [0, 4.25, (FRONT + BACK) / 2], [0, 0, 0], 0.02);
  for (let k = 0; k < 3; k++) {
    cyl(0.03, FRONT - BACK, mat.cable, [-0.18 + k * 0.18, 4.13, (FRONT + BACK) / 2], [Math.PI / 2, 0, 0], 8);
  }

  // Bajo el ventanal: consola baja sin pantallas, cajas de equipo y una escotilla.
  box([7.6, 0.72, 0.55], mat.rack, [0.45, 0.36, BACK + 0.3], [0, 0, 0], 0.02);
  box([7.7, 0.04, 0.62], mat.steel, [0.45, 0.74, BACK + 0.32], [0, 0, 0], 0.01);
  for (let k = 0; k < 10; k++) {
    const x = -2.8 + k * 0.72;
    box([0.66, 0.5, 0.02], chance(0.3) ? mat.rackWarm : mat.rack, [x, 0.34, BACK + 0.585], [0, 0, 0], 0.006);
    if (chance(0.4)) led([x + 0.25, 0.54, BACK + 0.6], mat.ledAmber);
  }
  // Escotilla a la izquierda del ventanal.
  box([0.95, 2.3, 0.12], mat.hullDark, [-3.95, 1.15, BACK + 0.06], [0, 0, 0], 0.04);
  box([0.72, 2.0, 0.05], mat.rack, [-3.95, 1.08, BACK + 0.14], [0, 0, 0], 0.03);
  addGeo(new THREE.TorusGeometry(0.14, 0.018, 8, 28), mat.steel, trs([-3.95, 1.15, BACK + 0.19]));

  // Primer plano, esquina inferior izquierda: mesa de trabajo contra la pared,
  // con papeles. Sólo asoma su esquina: el resto queda fuera de cuadro.
  {
    const bx = -3.92;
    const bz = 1.75;
    const yawB = Math.PI / 2 + 0.04;
    box([1.9, 0.05, 0.85], mat.rackWarm, [bx, 0.78, bz], [0, yawB, 0], 0.012);
    box([1.8, 0.5, 0.78], mat.rack, [bx, 0.3, bz], [0, yawB, 0], 0.02);
    for (let k = 0; k < 8; k++) {
      box([0.21, 0.004, 0.297], mat.paper, [bx + range(-0.1, 0.3), 0.806 + k * 0.004, bz + range(-0.7, 0.2)], [0, range(-0.7, 0.7), 0], 0);
    }
    box([0.25, 0.06, 0.32], mat.crateGrey, [bx + 0.05, 0.835, bz + 0.55], [0, 0.3, 0], 0.01);
    cyl(0.045, 0.11, mat.rackWarm, [bx + 0.25, 0.86, bz - 0.35], [0, 0, 0], 20);
    box([0.34, 0.28, 0.26], mat.crate, [bx - 0.1, 0.945, bz - 0.7], [0, -0.2, 0], 0.02);
  }
  // Primer plano, esquina inferior derecha: cajas de carga apiladas en la cubierta.
  {
    crateBox([0.8, 0.6, 0.7], [0.62, 0.3, 1.95], mat.crate, 0.35);
    crateBox([0.6, 0.45, 0.55], [0.67, 0.825, 1.9], mat.crateGrey, 0.15);
    crateBox([0.55, 0.4, 0.5], [1.4, 0.2, 1.35], mat.crateGrey, -0.2);
    box([0.7, 0.22, 0.4], mat.rubber, [0.3, 0.11, 2.55], [0, 0.6, 0], 0.09);
  }

  // Luces de servicio ámbar: carcasa, lente emisiva y un foco por luz.
  const fixtures = [];
  function fixture(pos, facing, dir, intensity, shadow) {
    // `facing` es la normal de la lente (hacia dónde mira la carcasa).
    const q = new THREE.Quaternion().setFromUnitVectors(new V3(1, 0, 0), facing);
    const e = new THREE.Euler().setFromQuaternion(q);
    box([0.1, 0.12, 0.28], mat.fixture, [pos.x - facing.x * 0.05, pos.y - facing.y * 0.05, pos.z - facing.z * 0.05], [e.x, e.y, e.z], 0.012);
    box([0.012, 0.05, 0.22], mat.lamp, [pos.x + facing.x * 0.002, pos.y - 0.03, pos.z + facing.z * 0.002], [e.x, e.y, e.z], 0);
    fixtures.push({
      pos: pos.clone().addScaledVector(facing, 0.07).add(new V3(0, -0.06, 0)),
      dir: dir.clone().normalize(),
      color: new THREE.Color(1.0, 0.62, 0.3),
      intensity,
      shadow,
    });
  }
  RIBS.forEach((z, index) => {
    for (const side of [-1, 1]) {
      const x = side * (4.6 - 0.36);
      // A la izquierda sólo la del fondo: esa pared es la del título. Y las que
      // quedan detrás de la cámara, apagadas: su luz caería en el suelo del
      // primer plano, que es donde la página dibuja la mesa.
      const on = z < 1.5 && (side === 1 || index === 0);
      if (on) {
        fixture(new V3(x, 2.08, z), new V3(-side, 0, 0), new V3(-side * 0.5, -1, 0), range(4, 7) * (side === 1 ? 1 : 0.6), z < -5);
      } else {
        box([0.1, 0.12, 0.28], mat.fixture, [x - side * 0.05, 2.08, z], [0, 0, 0], 0.012);
        box([0.012, 0.05, 0.22], mat.rubber, [x - side * 0.101, 2.05, z], [0, 0, 0], 0);
      }
    }
  });
  // Bañadores hacia arriba en las cuadernas de estribor, al fondo: sacan la
  // bóveda de la oscuridad sin tocar la pared del título.
  for (const z of [-8.3, -6.4, -4.5]) {
    fixture(new V3(4.6 - 0.36, 2.55, z), new V3(-0.8, 0.6, 0).normalize(), new V3(-0.55, 1, 0), 6, z < -5);
  }
  // Luz de cornisa a los dos lados de la espina, en la mitad del fondo: la
  // bóveda se enciende tenue y las cuadernas se leen a contraluz.
  for (const z of [-7.35, -5.45, -3.55]) {
    for (const side of [-1, 1]) {
      fixture(new V3(side * 0.34, 4.2, z), new V3(side, 0.35, 0).normalize(), new V3(side, 0.8, 0), side === 1 ? 4 : 2.6, false);
    }
  }
  // Tres en la viga de cabecera, rasantes sobre el mamparo del ventanal.
  for (const x of [-2.3, 0, 2.7]) {
    fixture(new V3(x, 3.36, BACK + 0.44), new V3(0, -0.35, 1).normalize(), new V3(0, -1, -0.28), 3.2, true);
  }

  // Fusión por material.
  for (const [material, list] of batches) {
    const geos = list.map((g) => {
      const n = g.index ? g.toNonIndexed() : g;
      for (const key of Object.keys(n.attributes)) {
        if (!["position", "normal", "uv"].includes(key)) n.deleteAttribute(key);
      }
      return n;
    });
    const mesh = new THREE.Mesh(mergeGeometries(geos, false), material);
    mesh.castShadow = material.userData.cast !== false;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    room.add(mesh);
  }

  // Vidrio: sólo reflejos (mezcla aditiva sobre lo que hay detrás).
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    roughness: 0.06,
    metalness: 0,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    envMapIntensity: 0.22,
    side: THREE.DoubleSide,
  });
  const glass = new THREE.Mesh(mergeGeometries(glassPanes.map((g) => (g.index ? g.toNonIndexed() : g)), false), glassMat);
  glass.castShadow = false;
  room.add(glass);

  // ── Cámara ─────────────────────────────────────────────────────────────────
  const cam = params.camera;
  const camPos = new V3(...cam.position);
  const yaw = THREE.MathUtils.degToRad(cam.yaw);
  const pitch = THREE.MathUtils.degToRad(cam.pitch);
  const forward = new V3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
  const right = new V3().crossVectors(forward, new V3(0, 1, 0)).normalize();
  const up = new V3().crossVectors(right, forward).normalize();
  const camDir = (az, el) => {
    const a = THREE.MathUtils.degToRad(az);
    const e = THREE.MathUtils.degToRad(el);
    return forward
      .clone()
      .multiplyScalar(Math.cos(e) * Math.cos(a))
      .addScaledVector(right, Math.cos(e) * Math.sin(a))
      .addScaledVector(up, Math.sin(e))
      .normalize();
  };
  const camera = new THREE.PerspectiveCamera(cam.vfov, W / H, 0.05, 60);
  const spaceCamera = new THREE.PerspectiveCamera(cam.vfov, W / H, 1, 20000);
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(cam.vfov / 2));
  const pixelAngle = (2 * tanHalf) / H;
  const baseQuat = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(right, up, forward.clone().negate()),
  );
  function poseCamera(target, near, far, lens, jitter) {
    target.position.copy(camPos).addScaledVector(right, lens.x).addScaledVector(up, lens.y);
    target.quaternion.copy(baseQuat);
    target.near = near;
    target.far = far;
    target.updateMatrixWorld(true);
    const top = near * tanHalf;
    const rightEdge = top * (W / H);
    const sx = (-lens.x * near) / cam.focus + (jitter.x * 2 * rightEdge) / W;
    const sy = (-lens.y * near) / cam.focus + (jitter.y * 2 * top) / H;
    target.projectionMatrix.makePerspective(-rightEdge + sx, rightEdge + sx, top + sy, -top + sy, near, far);
    target.projectionMatrixInverse.copy(target.projectionMatrix).invert();
  }

  // ── El exterior: estrellas, Vía Láctea tenue y el planeta ──────────────────
  const space = new THREE.Scene();
  const planet = params.planet;
  const planetDir = camDir(planet.az, planet.el);
  const sunDir = camDir(planet.sunAz, planet.sunEl);
  const planetRadius = 5000 * Math.sin(THREE.MathUtils.degToRad(planet.radius));
  const planetCenter = planetDir.clone().multiplyScalar(5000);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uPixel: { value: pixelAngle }, uBand: { value: camDir(-30, 25).cross(camDir(40, -10)).normalize() } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uPixel;
      uniform vec3 uBand;
      varying vec3 vDir;
      ${NOISE}
      vec3 starLayer(vec3 d, float cells, float seed, float density) {
        vec3 a = abs(d);
        vec2 uv;
        float face;
        if (a.x >= a.y && a.x >= a.z) { uv = d.yz / a.x; face = d.x > 0.0 ? 0.0 : 1.0; }
        else if (a.y >= a.z) { uv = d.xz / a.y; face = d.y > 0.0 ? 2.0 : 3.0; }
        else { uv = d.xy / a.z; face = d.z > 0.0 ? 4.0 : 5.0; }
        vec2 g = (uv * 0.5 + 0.5) * cells;
        vec2 cell = floor(g);
        vec3 acc = vec3(0.0);
        float cellAngle = 2.0 / cells;
        for (int j = -1; j <= 1; j++) {
          for (int i = -1; i <= 1; i++) {
            vec2 c = cell + vec2(float(i), float(j));
            float h = hash13(vec3(c, face * 131.0 + seed));
            if (h > density) continue;
            vec2 off = vec2(hash13(vec3(c, face * 17.0 + seed + 1.0)), hash13(vec3(c, face * 29.0 + seed + 2.0)));
            vec2 p = (c + 0.15 + off * 0.7);
            float dist = length(g - p) * cellAngle;
            float sigma = uPixel * 0.62;
            float b = pow(hash13(vec3(c, face * 43.0 + seed + 3.0)), 10.0) * 4.0 + 0.012;
            float t = hash13(vec3(c, face * 61.0 + seed + 4.0));
            vec3 tint = mix(vec3(1.0, 0.82, 0.64), vec3(0.8, 0.86, 1.0), t);
            acc += tint * b * exp(-0.5 * dist * dist / (sigma * sigma));
          }
        }
        return acc;
      }
      void main() {
        vec3 d = normalize(vDir);
        vec3 col = vec3(0.0);
        col += starLayer(d, 520.0, 1.0, 0.03);
        col += starLayer(d, 1400.0, 7.0, 0.012) * 0.16;
        float band = dot(d, uBand);
        float mw = exp(-band * band / 0.03);
        float dust = fbm(d * 7.0);
        float lanes = smoothstep(0.35, 0.65, fbm(d * 13.0 + 3.0));
        col += vec3(0.85, 0.8, 0.74) * mw * (0.2 + 0.8 * dust) * (1.0 - 0.7 * lanes) * 0.0035;
        col += starLayer(d, 3200.0, 13.0, 0.02) * 0.06 * mw;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  space.add(new THREE.Mesh(new THREE.SphereGeometry(15000, 64, 32), skyMat));

  const planetUniforms = {
    uSun: { value: sunDir },
    uCenter: { value: planetCenter },
    uRadius: { value: planetRadius },
    uSunPower: { value: planet.power },
  };
  const planetMat = new THREE.ShaderMaterial({
    uniforms: planetUniforms,
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vPos = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(vPos, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun;
      uniform vec3 uCenter;
      uniform float uRadius;
      uniform float uSunPower;
      varying vec3 vPos;
      ${NOISE}
      void main() {
        vec3 N = normalize(vPos - uCenter);
        vec3 V = normalize(cameraPosition - vPos);
        float ndl = dot(N, uSun);
        vec3 q = N * 2.3;
        float cont = smoothstep(0.5, 0.56, fbm(q + fbm(q * 2.0) * 0.6));
        vec3 ocean = vec3(0.006, 0.014, 0.04);
        vec3 land = vec3(0.045, 0.04, 0.03);
        float cloudN = fbm(N * vec3(9.0, 16.0, 9.0) + fbm(N * 5.0) * 1.5);
        float cloud = smoothstep(0.48, 0.78, cloudN);
        vec3 albedo = mix(mix(ocean, land, cont), vec3(0.62), cloud);
        float ndv = max(dot(N, V), 0.0);
        // Día (casi nada: el sol está detrás) y crepúsculo, que se extiende un
        // poco más allá del terminador por la luz que dobla la atmósfera.
        vec3 col = albedo * max(ndl, 0.0) * uSunPower;
        float twilight = smoothstep(-0.12, 0.05, ndl) * (1.0 - smoothstep(0.05, 0.3, ndl));
        col += albedo * vec3(0.5, 0.65, 1.0) * twilight * uSunPower * 0.15;
        // La atmósfera delante del disco, a contraluz, cerca del borde.
        float mu = dot(-V, uSun);
        float g = 0.8;
        float hg = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * mu, 1.5);
        float edge = pow(1.0 - ndv, 40.0);
        col += (vec3(0.2, 0.36, 1.0) * 0.05 + vec3(0.85, 0.9, 1.0) * hg * 0.003) * edge * uSunPower;
        // Resplandor nocturno de la atmósfera, casi invisible.
        col += vec3(0.02, 0.03, 0.06) * pow(1.0 - ndv, 3.0) * 0.08;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const planetMesh = new THREE.Mesh(new THREE.SphereGeometry(planetRadius, 256, 128), planetMat);
  planetMesh.position.copy(planetCenter);
  space.add(planetMesh);
  const atmoMat = new THREE.ShaderMaterial({
    uniforms: { ...planetUniforms, uScale: { value: planet.atmosphere } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vPos = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(vPos, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun;
      uniform vec3 uCenter;
      uniform float uRadius;
      uniform float uSunPower;
      uniform float uScale;
      varying vec3 vPos;
      void main() {
        vec3 d = normalize(vPos - cameraPosition);
        vec3 oc = uCenter - cameraPosition;
        float tc = dot(oc, d);
        vec3 closest = cameraPosition + d * tc;
        float b = length(closest - uCenter);
        float hgt = (b - uRadius) / uRadius;
        if (hgt < 0.0) discard;
        // Dos capas: la fina y brillante, y un halo ancho y tenue.
        float dense = exp(-hgt / (uScale * 0.12));
        float halo = exp(-hgt / (uScale * 0.9));
        vec3 up = normalize(closest - uCenter);
        float lit = smoothstep(-0.2, 0.08, dot(up, uSun));
        float mu = dot(d, uSun);
        float rayleigh = 0.75 * (1.0 + mu * mu);
        float g = 0.86;
        float mie = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * mu, 1.5);
        vec3 blue = vec3(0.2, 0.38, 1.0);
        vec3 col = vec3(0.14, 0.3, 1.0) * rayleigh * (dense * 0.3 + halo * 0.035)
          + vec3(0.82, 0.9, 1.0) * mie * (dense * 0.07 + halo * 0.0008);
        gl_FragColor = vec4(col * lit * uSunPower, 1.0);
      }`,
  });
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(planetRadius * (1 + planet.atmosphere * 6), 256, 128), atmoMat);
  atmo.position.copy(planetCenter);
  space.add(atmo);

  // ── Luces ──────────────────────────────────────────────────────────────────
  // Limbo del planeta: direccional con sombra; su dirección recorre el arco
  // iluminado muestra a muestra (penumbra larga, como una fuente alargada).
  const limbLight = new THREE.DirectionalLight(new THREE.Color(0.78, 0.86, 1.0), planet.roomLight);
  limbLight.castShadow = true;
  limbLight.shadow.mapSize.set(4096, 4096);
  limbLight.shadow.bias = -0.0004;
  limbLight.shadow.normalBias = 0.02;
  const lsc = limbLight.shadow.camera;
  lsc.left = -14;
  lsc.right = 14;
  lsc.top = 14;
  lsc.bottom = -14;
  lsc.near = 0.5;
  lsc.far = 90;
  // Sin esto la cámara de sombra se queda en ±5 m y la pared de babor sale
  // iluminada a través del mamparo.
  lsc.updateProjectionMatrix();
  const roomCenter = new V3(0, 2, -1);
  limbLight.target.position.copy(roomCenter);
  scene.add(limbLight, limbLight.target);
  const limbArc = params.planet.arc; // [az0, el0, az1, el1] del tramo iluminado
  function limbDirection(t, s) {
    const az = lerp(limbArc[0], limbArc[2], t) + (s - 0.5) * 2;
    const el = lerp(limbArc[1], limbArc[3], t) + (s - 0.5) * 1.5;
    return camDir(az, el);
  }

  const spots = fixtures.map((f) => {
    const light = new THREE.SpotLight(f.color, f.intensity * params.amber, 0, THREE.MathUtils.degToRad(62), 0.85, 2);
    light.position.copy(f.pos);
    light.target.position.copy(f.pos.clone().add(f.dir));
    // D3D11 da 16 unidades de textura por shader: sólo los focos que se ven
    // proyectan sombra.
    light.castShadow = f.shadow;
    light.shadow.mapSize.set(512, 512);
    light.shadow.bias = -0.0008;
    light.shadow.normalBias = 0.015;
    light.shadow.camera.near = 0.05;
    light.shadow.camera.far = 12;
    scene.add(light, light.target);
    return { light, base: f.pos.clone(), dir: f.dir.clone() };
  });

  // Las dos esquinas del primer plano: un flexo fuera de cuadro sobre los
  // papeles de la mesa y una lámpara de trabajo en el suelo, escondida detrás
  // de las cajas. Son las que recortan las siluetas.
  {
    const desk = new THREE.SpotLight(new THREE.Color(1.0, 0.66, 0.36), 1.6 * params.amber, 0, THREE.MathUtils.degToRad(38), 0.9, 2);
    desk.position.set(-4.3, 1.45, 2.2);
    desk.target.position.set(-3.8, 0.78, 1.4);
    desk.castShadow = true;
    desk.shadow.mapSize.set(1024, 1024);
    desk.shadow.bias = -0.0006;
    desk.shadow.camera.near = 0.05;
    scene.add(desk, desk.target);
    const work = new THREE.PointLight(new THREE.Color(1.0, 0.62, 0.3), 1.8 * params.amber, 6, 2);
    work.position.set(1.15, 1.55, 0.85);
    scene.add(work);
  }

  // Balizas de suelo: pilotos ámbar en el zócalo cada 0,6 m, a los dos lados.
  // Algunas llevan una luz puntual débil (sin sombra): dibujan el borde del
  // suelo y recortan por detrás la mesa y las cajas del primer plano.
  const pathLights = [];
  for (const side of [-1, 1]) {
    for (let z = BACK + 0.5; z < 5.5; z += 0.6) {
      box([0.012, 0.018, 0.05], mat.ledAmber, [side * 4.525, 0.1, z], [0, 0, 0], 0);
    }
  }
  for (const [x, z, k] of [
    [4.45, -7.5, 0.5],
    [4.45, -4.5, 0.5],
    [4.45, -1.5, 0.6],
    [4.45, 0.9, 0.8],
    [-4.45, -7.5, 0.35],
    [-4.45, 0.6, 0.7],
  ]) {
    const light = new THREE.PointLight(new THREE.Color(1.0, 0.6, 0.28), k * params.amber, 5, 2);
    light.position.set(x, 0.14, z);
    scene.add(light);
    pathLights.push(light);
  }

  // ── Mapa de entorno: la sala capturada desde el centro (un rebote) ─────────
  const emitters = new THREE.Group();
  const emitRight = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.5, 1.0).multiplyScalar(params.planet.envGlow) });
  const emitBack = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.02, 0.025, 0.04) });
  for (const win of sideWindows) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(win.z1 - win.z0, 2.2), emitRight);
    m.position.set(4.9, 1.9, (win.z0 + win.z1) / 2);
    m.rotation.y = -Math.PI / 2;
    emitters.add(m);
  }
  for (const w of backWindows) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w.x1 - w.x0, w.y1 - w.y0), w.x0 > 1 ? emitRight : emitBack);
    m.position.set((w.x0 + w.x1) / 2, (w.y0 + w.y1) / 2, BACK - 0.6);
    emitters.add(m);
  }
  scene.add(emitters);
  limbLight.position.copy(roomCenter).addScaledVector(limbDirection(0.5, 0.5), 40);
  limbLight.target.updateMatrixWorld();
  glass.visible = false;
  renderer.shadowMap.needsUpdate = true;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(scene, 0.03, 0.05, 40, { size: 256, position: new V3(0, 1.7, -2.5) });
  scene.environment = envRT.texture;
  scene.environmentIntensity = params.envIntensity;
  emitters.visible = false;
  glass.visible = true;

  // ── Render targets y pasadas a pantalla completa ───────────────────────────
  const hdr = (w, h, extra = {}) =>
    new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false,
      depthBuffer: true,
      ...extra,
    });
  const rtScene = hdr(W, H, { depthTexture: new THREE.DepthTexture(W, H, THREE.FloatType) });
  const RW = Math.round(W / 2);
  const RH = Math.round(H / 2);
  const rtReflect = hdr(RW, RH);
  rtReflect.texture.generateMipmaps = true;
  rtReflect.texture.minFilter = THREE.LinearMipmapLinearFilter;
  const rtSample = hdr(W, H, { depthBuffer: false });
  const rtAcc = [0, 1].map(
    () =>
      new THREE.WebGLRenderTarget(W, H, {
        type: THREE.FloatType,
        format: THREE.RGBAFormat,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        depthBuffer: false,
      }),
  );
  /*
    Windows reinicia la GPU si un lote de trabajo pasa de ~2 s (TDR), y en una
    gráfica integrada una muestra a 2560 px roza ese límite. Así que cada pasada
    pesada se cierra con una sincronía (borrar un píxel y leerlo) y la bruma
    se marcha en franjas.
  */
  const rtSync = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
  const syncPixel = new Uint8Array(4);
  function sync() {
    renderer.setRenderTarget(rtSync);
    renderer.clear(true, false, false);
    renderer.readRenderTargetPixels(rtSync, 0, 0, 1, 1, syncPixel);
  }
  const STRIPS = Math.max(1, Math.round(H / 240));
  function inStrips(target, run) {
    target.scissorTest = true;
    for (let k = 0; k < STRIPS; k++) {
      const y0 = Math.floor((k * H) / STRIPS);
      const y1 = Math.floor(((k + 1) * H) / STRIPS);
      target.scissor.set(0, y0, W, y1 - y0);
      run(target);
      sync();
    }
    target.scissorTest = false;
  }

  const LIGHT_MAP = 2048;
  const rtLight = new THREE.WebGLRenderTarget(LIGHT_MAP, LIGHT_MAP, {
    depthTexture: new THREE.DepthTexture(LIGHT_MAP, LIGHT_MAP, THREE.FloatType),
  });
  shared.uReflTex.value = rtReflect.texture;

  const fsCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const fsGeometry = new THREE.PlaneGeometry(2, 2);
  const FS_VERT = /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
  function fullscreen(material) {
    const quad = new THREE.Mesh(fsGeometry, material);
    quad.frustumCulled = false;
    const holder = new THREE.Scene();
    holder.add(quad);
    return (target) => {
      renderer.setRenderTarget(target);
      renderer.render(holder, fsCamera);
    };
  }

  // Bruma: marcha de rayos dentro de la sala (fuera es vacío), con la luz del
  // limbo sombreada y los conos de las luces ámbar.
  const MAX_SPOTS = 32;
  const volUniforms = {
    tColor: { value: rtScene.texture },
    tDepth: { value: rtScene.depthTexture },
    tLight: { value: rtLight.depthTexture },
    uProjInv: { value: new THREE.Matrix4() },
    uViewInv: { value: new THREE.Matrix4() },
    uLightMatrix: { value: new THREE.Matrix4() },
    uLightDir: { value: new V3() },
    uLightColor: { value: new V3() },
    uSpotPos: { value: Array.from({ length: MAX_SPOTS }, () => new V3()) },
    uSpotDir: { value: Array.from({ length: MAX_SPOTS }, () => new V3()) },
    uSpotColor: { value: Array.from({ length: MAX_SPOTS }, () => new V3()) },
    uSpotCount: { value: 0 },
    uDensity: { value: params.haze },
    uSeed: { value: 0 },
    uRoomMin: { value: new V3(-4.6, 0, BACK) },
    uRoomMax: { value: new V3(4.6, 4.7, FRONT) },
  };
  const runVolume = fullscreen(
    new THREE.ShaderMaterial({
      uniforms: volUniforms,
      defines: { MAX_SPOTS },
      vertexShader: FS_VERT,
      fragmentShader: /* glsl */ `
        uniform sampler2D tColor;
        uniform sampler2D tDepth;
        uniform sampler2D tLight;
        uniform mat4 uProjInv;
        uniform mat4 uViewInv;
        uniform mat4 uLightMatrix;
        uniform vec3 uLightDir;
        uniform vec3 uLightColor;
        uniform vec3 uSpotPos[MAX_SPOTS];
        uniform vec3 uSpotDir[MAX_SPOTS];
        uniform vec3 uSpotColor[MAX_SPOTS];
        uniform int uSpotCount;
        uniform float uDensity;
        uniform float uSeed;
        uniform vec3 uRoomMin;
        uniform vec3 uRoomMax;
        varying vec2 vUv;
        ${NOISE}
        void main() {
          vec3 base = texture2D(tColor, vUv).rgb;
          float depth = texture2D(tDepth, vUv).r;
          vec4 ndc = vec4(vUv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
          vec4 view = uProjInv * ndc;
          view /= view.w;
          vec3 world = (uViewInv * view).xyz;
          vec3 origin = (uViewInv * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          vec3 rd = normalize(world - origin);
          float tEnd = length(world - origin);
          // Salida de la caja de la sala: más allá está el vacío.
          vec3 inv = 1.0 / rd;
          vec3 t0 = (uRoomMin - origin) * inv;
          vec3 t1 = (uRoomMax - origin) * inv;
          vec3 tmax = max(t0, t1);
          float exitT = min(min(tmax.x, tmax.y), tmax.z);
          tEnd = min(tEnd, exitT);
          const int STEPS = 48;
          float dt = tEnd / float(STEPS);
          float jitter = hash12(gl_FragCoord.xy + uSeed * 17.31);
          vec3 inscatter = vec3(0.0);
          float trans = 1.0;
          float mu = dot(rd, uLightDir);
          float g = 0.55;
          float hg = (1.0 - g * g) / (4.0 * 3.14159 * pow(1.0 + g * g - 2.0 * g * mu, 1.5));
          for (int i = 0; i < STEPS; i++) {
            float t = (float(i) + jitter) * dt;
            vec3 p = origin + rd * t;
            float dens = uDensity * (0.55 + 0.9 * fbm(p * 0.45 + vec3(0.0, 0.0, 3.0)));
            // Limbo: sombra propia del mapa de profundidad de la luz.
            vec4 lp = uLightMatrix * vec4(p, 1.0);
            vec3 lc = lp.xyz / lp.w * 0.5 + 0.5;
            float vis = 1.0;
            if (lc.x > 0.0 && lc.x < 1.0 && lc.y > 0.0 && lc.y < 1.0) {
              float occ = texture2D(tLight, lc.xy).r;
              vis = lc.z - 0.002 > occ ? 0.0 : 1.0;
            }
            vec3 light = uLightColor * vis * hg;
            for (int k = 0; k < MAX_SPOTS; k++) {
              if (k >= uSpotCount) break;
              vec3 L = p - uSpotPos[k];
              float d2 = dot(L, L);
              float cosA = dot(L * inversesqrt(d2), uSpotDir[k]);
              float cone = smoothstep(0.47, 0.72, cosA);
              light += uSpotColor[k] * cone / (d2 + 0.04) * (1.0 / (4.0 * 3.14159));
            }
            inscatter += trans * dens * light * dt;
            trans *= exp(-dens * dt);
          }
          gl_FragColor = vec4(base * trans + inscatter, 1.0);
        }`,
    }),
  );

  const accUniforms = { tPrev: { value: null }, tNew: { value: rtSample.texture }, uWeight: { value: 1 } };
  const runAccumulate = fullscreen(
    new THREE.ShaderMaterial({
      uniforms: accUniforms,
      vertexShader: FS_VERT,
      fragmentShader: /* glsl */ `
        uniform sampler2D tPrev;
        uniform sampler2D tNew;
        uniform float uWeight;
        varying vec2 vUv;
        void main() {
          vec3 prev = texture2D(tPrev, vUv).rgb;
          vec3 cur = texture2D(tNew, vUv).rgb;
          gl_FragColor = vec4(mix(prev, cur, uWeight), 1.0);
        }`,
    }),
  );

  // Cámara de la luz del limbo para la bruma (profundidad ortográfica propia).
  const lightCam = new THREE.OrthographicCamera(-14, 14, 14, -14, 0.5, 90);
  const depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false });

  // ── Bucle de muestras ──────────────────────────────────────────────────────
  const virtualCam = new THREE.PerspectiveCamera(cam.vfov * 1.08, W / H, 0.05, 60);
  const virtualSpace = new THREE.PerspectiveCamera(cam.vfov * 1.08, W / H, 1, 20000);
  const floorMesh = room.children.find((c) => c.material === mat.floor);
  const sampleRand = mulberry32(params.seed + 101);
  const lightTmp = new V3();

  for (let i = 0; i < params.samples; i++) {
    const n = i + 1;
    // Subpíxel gaussiano (σ ≈ 0,45 px) y punto del diafragma (disco).
    const u1 = Math.max(1e-6, halton(n, 2));
    const u2 = halton(n, 3);
    const rad = Math.sqrt(-2 * Math.log(u1)) * 0.45;
    const jitter = { x: rad * Math.cos(2 * Math.PI * u2), y: rad * Math.sin(2 * Math.PI * u2) };
    const lr = Math.sqrt(halton(n, 5)) * cam.aperture;
    const la = 2 * Math.PI * halton(n, 7);
    const lens = { x: lr * Math.cos(la), y: lr * Math.sin(la) };
    poseCamera(camera, 0.05, 60, lens, jitter);
    poseCamera(spaceCamera, 1, 20000, lens, jitter);

    // Luz del limbo en otro punto del arco.
    const ldir = limbDirection(halton(n, 11), halton(n, 13));
    limbLight.position.copy(roomCenter).addScaledVector(ldir, 40);
    limbLight.target.updateMatrixWorld();
    limbLight.updateMatrixWorld();
    lightCam.position.copy(limbLight.position);
    lightCam.lookAt(roomCenter);
    lightCam.updateMatrixWorld(true);
    lightCam.updateProjectionMatrix();

    // Focos ámbar: la fuente se mueve dentro de la lente (sombras suaves).
    spots.forEach((s, k) => {
      s.light.position.copy(s.base).add(new V3(sampleRand() - 0.5, sampleRand() - 0.5, sampleRand() - 0.5).multiply(new V3(0.03, 0.02, 0.18)));
      s.light.target.position.copy(s.light.position).add(s.dir);
      s.light.target.updateMatrixWorld();
      if (k < MAX_SPOTS) {
        volUniforms.uSpotPos.value[k].copy(s.light.position);
        volUniforms.uSpotDir.value[k].copy(s.dir);
        volUniforms.uSpotColor.value[k].set(s.light.color.r, s.light.color.g, s.light.color.b).multiplyScalar(s.light.intensity);
      }
    });
    volUniforms.uSpotCount.value = Math.min(MAX_SPOTS, spots.length);

    renderer.shadowMap.needsUpdate = true;

    renderer.autoClear = false;
    renderer.setClearColor(0x000000, 1);

    // Reflejo del suelo: cámara virtual al otro lado del plano y = 0. Va
    // primero porque es la pasada que recalcula las sombras de la muestra.
    const vp = camera.position.clone();
    vp.y = -vp.y;
    const vf = new V3(0, 0, -1).applyQuaternion(camera.quaternion);
    vf.y = -vf.y;
    virtualCam.position.copy(vp);
    virtualCam.up.set(0, 1, 0);
    virtualCam.lookAt(vp.clone().add(vf));
    virtualCam.updateMatrixWorld(true);
    virtualCam.updateProjectionMatrix();
    virtualSpace.position.copy(vp);
    virtualSpace.quaternion.copy(virtualCam.quaternion);
    virtualSpace.updateMatrixWorld(true);
    virtualSpace.updateProjectionMatrix();
    renderer.setRenderTarget(rtReflect);
    renderer.clear(true, true, true);
    renderer.render(space, virtualSpace);
    renderer.clearDepth();
    floorMesh.visible = false;
    glass.visible = false;
    renderer.render(scene, virtualCam);
    sync();
    floorMesh.visible = true;
    glass.visible = true;
    shared.uReflMatrix.value.multiplyMatrices(virtualCam.projectionMatrix, virtualCam.matrixWorldInverse);
    const ra = 2 * Math.PI * halton(n, 17);
    const rr = Math.sqrt(halton(n, 19));
    shared.uReflJitter.value.set(Math.cos(ra) * rr, Math.sin(ra) * rr);

    // Principal: el exterior y, encima, la sala.
    renderer.setRenderTarget(rtScene);
    renderer.clear(true, true, true);
    renderer.render(space, spaceCamera);
    renderer.clearDepth();
    renderer.render(scene, camera);

    sync();

    // Profundidad desde la luz del limbo, para la bruma.
    renderer.setRenderTarget(rtLight);
    renderer.clear(true, true, true);
    scene.overrideMaterial = depthOnly;
    renderer.render(scene, lightCam);
    scene.overrideMaterial = null;
    renderer.autoClear = true;

    volUniforms.uProjInv.value.copy(camera.projectionMatrixInverse);
    volUniforms.uViewInv.value.copy(camera.matrixWorld);
    volUniforms.uLightMatrix.value.multiplyMatrices(lightCam.projectionMatrix, lightCam.matrixWorldInverse);
    volUniforms.uLightDir.value.copy(ldir);
    lightTmp.set(limbLight.color.r, limbLight.color.g, limbLight.color.b).multiplyScalar(limbLight.intensity);
    volUniforms.uLightColor.value.copy(lightTmp).multiplyScalar(params.hazeLimb);
    volUniforms.uSeed.value = i;
    inStrips(rtSample, runVolume);

    accUniforms.tPrev.value = rtAcc[i % 2].texture;
    accUniforms.uWeight.value = 1 / n;
    runAccumulate(rtAcc[(i + 1) % 2]);

    sync();
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (gl.isContextLost()) throw new Error(`Contexto WebGL perdido en la muestra ${n}`);
  }
  const accumulated = rtAcc[params.samples % 2];

  // ── Óptica: bloom sin umbral (velo de lente), exposición, grano ────────────
  const LEVELS = 7;
  const down = [];
  const upChain = [];
  for (let l = 1; l <= LEVELS; l++) {
    const w = Math.max(2, Math.round(W / 2 ** l));
    const h = Math.max(2, Math.round(H / 2 ** l));
    down.push(hdr(w, h, { depthBuffer: false }));
    upChain.push(hdr(w, h, { depthBuffer: false }));
  }
  const downUniforms = { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } };
  const runDown = fullscreen(
    new THREE.ShaderMaterial({
      uniforms: downUniforms,
      vertexShader: FS_VERT,
      fragmentShader: /* glsl */ `
        uniform sampler2D tSrc;
        uniform vec2 uTexel;
        varying vec2 vUv;
        vec3 s(vec2 o) { return texture2D(tSrc, vUv + o * uTexel).rgb; }
        void main() {
          vec3 a = s(vec2(-2.0, 2.0)), b = s(vec2(0.0, 2.0)), c = s(vec2(2.0, 2.0));
          vec3 d = s(vec2(-2.0, 0.0)), e = s(vec2(0.0, 0.0)), f = s(vec2(2.0, 0.0));
          vec3 g = s(vec2(-2.0, -2.0)), h = s(vec2(0.0, -2.0)), i = s(vec2(2.0, -2.0));
          vec3 j = s(vec2(-1.0, 1.0)), k = s(vec2(1.0, 1.0)), l = s(vec2(-1.0, -1.0)), m = s(vec2(1.0, -1.0));
          vec3 col = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  );
  const upUniforms = { tLow: { value: null }, tHigh: { value: null }, uTexel: { value: new THREE.Vector2() } };
  const runUp = fullscreen(
    new THREE.ShaderMaterial({
      uniforms: upUniforms,
      vertexShader: FS_VERT,
      fragmentShader: /* glsl */ `
        uniform sampler2D tLow;
        uniform sampler2D tHigh;
        uniform vec2 uTexel;
        varying vec2 vUv;
        vec3 s(vec2 o) { return texture2D(tLow, vUv + o * uTexel).rgb; }
        void main() {
          vec3 tent = s(vec2(-1.0, 1.0)) + 2.0 * s(vec2(0.0, 1.0)) + s(vec2(1.0, 1.0))
            + 2.0 * s(vec2(-1.0, 0.0)) + 4.0 * s(vec2(0.0, 0.0)) + 2.0 * s(vec2(1.0, 0.0))
            + s(vec2(-1.0, -1.0)) + 2.0 * s(vec2(0.0, -1.0)) + s(vec2(1.0, -1.0));
          gl_FragColor = vec4(texture2D(tHigh, vUv).rgb + tent / 16.0, 1.0);
        }`,
    }),
  );
  let src = accumulated;
  for (let l = 0; l < LEVELS; l++) {
    downUniforms.tSrc.value = src.texture;
    downUniforms.uTexel.value.set(1 / src.width, 1 / src.height);
    runDown(down[l]);
    src = down[l];
  }
  // up[L-1] = down[L-1]; up[l] = down[l] + tienda(up[l+1])
  let low = down[LEVELS - 1];
  for (let l = LEVELS - 2; l >= 0; l--) {
    upUniforms.tLow.value = low.texture;
    upUniforms.tHigh.value = down[l].texture;
    upUniforms.uTexel.value.set(1 / low.width, 1 / low.height);
    runUp(upChain[l]);
    low = upChain[l];
  }

  const post = params.post;
  const rtFinal = new THREE.WebGLRenderTarget(W, H, { type: THREE.UnsignedByteType, depthBuffer: false });
  const runFinal = fullscreen(
    new THREE.ShaderMaterial({
      uniforms: {
        tHdr: { value: accumulated.texture },
        tBloom: { value: upChain[0].texture },
        uRes: { value: new THREE.Vector2(W, H) },
        uExposure: { value: post.exposure },
        uBloom: { value: post.bloom / LEVELS },
        uVignette: { value: post.vignette },
        uCA: { value: post.aberration },
        uGrain: { value: post.grain },
        uLift: { value: new V3(...post.lift) },
        uSat: { value: post.saturation },
        uSeed: { value: params.seed },
      },
      vertexShader: FS_VERT,
      fragmentShader: /* glsl */ `
        uniform sampler2D tHdr;
        uniform sampler2D tBloom;
        uniform vec2 uRes;
        uniform float uExposure;
        uniform float uBloom;
        uniform float uVignette;
        uniform float uCA;
        uniform float uGrain;
        uniform vec3 uLift;
        uniform float uSat;
        uniform float uSeed;
        varying vec2 vUv;
        ${NOISE}
        // ACES ajustado (Stephen Hill): RRT + ODT.
        vec3 rrtOdt(vec3 v) {
          vec3 a = v * (v + 0.0245786) - 0.000090537;
          vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
          return a / b;
        }
        vec3 aces(vec3 c) {
          const mat3 inM = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
          const mat3 outM = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
          return clamp(outM * rrtOdt(inM * c), 0.0, 1.0);
        }
        vec3 toSRGB(vec3 c) {
          return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
        }
        float grainNoise(vec2 p) {
          // Grano con algo de cuerpo: ruido de valor a 1,3 px, no un píxel suelto.
          vec2 q = p / 1.3;
          vec2 i = floor(q);
          vec2 f = fract(q);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash12(i + uSeed);
          float b = hash12(i + vec2(1.0, 0.0) + uSeed);
          float c = hash12(i + vec2(0.0, 1.0) + uSeed);
          float d = hash12(i + vec2(1.0, 1.0) + uSeed);
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        void main() {
          vec2 d = vUv - 0.5;
          vec2 da = d * vec2(uRes.x / uRes.y, 1.0);
          float r2 = dot(da, da);
          vec3 c;
          c.r = texture2D(tHdr, vUv - d * uCA).r;
          c.g = texture2D(tHdr, vUv).g;
          c.b = texture2D(tHdr, vUv + d * uCA).b;
          vec3 bloom = texture2D(tBloom, vUv).rgb;
          c = mix(c, bloom, uBloom);
          c *= uExposure;
          float vig = 1.0 / pow(1.0 + r2 * uVignette, 2.0);
          c *= vig;
          c = aces(c);
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          c = mix(vec3(l), c, uSat);
          c = uLift + c * (1.0 - uLift);
          c = toSRGB(c);
          // Candado de paleta, ya en sRGB (donde se mide el tono): ningún píxel
          // frío cae en el cian, que es de la mesa. Donde verde y azul superan
          // al rojo, el verde no pasa del 60 % del camino hacia el azul: el tono
          // queda en 204° o más. El grano suma lo mismo a los tres canales y no
          // lo mueve.
          if (c.g > c.r && c.b > c.r) c.g = min(c.g, c.r + 0.6 * (c.b - c.r));
          float gn = (grainNoise(gl_FragCoord.xy) + grainNoise(gl_FragCoord.xy + 71.3) - 1.0);
          float ls = dot(c, vec3(0.2126, 0.7152, 0.0722));
          c += gn * uGrain * (0.45 + 0.55 * smoothstep(0.0, 0.5, ls)) * (1.0 - 0.6 * ls);
          c += (hash12(gl_FragCoord.xy + 3.7) - 0.5) / 255.0;
          gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
        }`,
    }),
  );
  runFinal(rtFinal);

  const pixels = new Uint8Array(W * H * 4);
  renderer.readRenderTargetPixels(rtFinal, 0, 0, W, H, pixels);
  // RGB sin alfa, y en base64 por trozos para no desbordar la pila.
  const rgb = new Uint8Array(W * H * 3);
  for (let p = 0, q = 0; p < pixels.length; p += 4, q += 3) {
    rgb[q] = pixels[p];
    rgb[q + 1] = pixels[p + 1];
    rgb[q + 2] = pixels[p + 2];
  }
  let binary = "";
  const CHUNK = 0x8000;
  for (let p = 0; p < rgb.length; p += CHUNK) {
    binary += String.fromCharCode.apply(null, rgb.subarray(p, p + CHUNK));
  }
  window.__salaPixels = btoa(binary);
  return { width: W, height: H, gpu, ms: Math.round(performance.now() - started), leds: leds.length, lights: spots.length };
}

// ── Parámetros de la imagen (el encuadre y la luz se deciden aquí) ───────────
const PARAMS = {
  width: WIDTH,
  height: HEIGHT,
  samples: SAMPLES,
  seed: 20260924,
  camera: {
    // A la izquierda del eje: la pared de babor llena el tercio del título y
    // el ventanal queda en el centro y la derecha.
    position: [-1.6, 1.62, 6.4],
    yaw: 0, // grados, positivo = a la derecha
    pitch: -1.5,
    vfov: 32.3, // 35 mm en formato 16:9 de sensor completo
    focus: 12.5,
    aperture: 0.008,
  },
  planet: {
    // Ángulos respecto a la cámara (grados). Un planeta enorme por debajo del
    // ventanal: su horizonte cruza el paño de la derecha. El sol está justo
    // detrás del borde (amanecer orbital): no hay disco solar en el cuadro,
    // sólo la atmósfera encendida a contraluz, más fuerte donde va a salir.
    az: 30,
    el: -56,
    radius: 58,
    sunAz: 17,
    sunEl: -1.5,
    power: 6,
    atmosphere: 0.012,
    arc: [9, 0, 19, 1.5],
    roomLight: 0.9,
    envGlow: 0.3,
  },
  amber: 1,
  haze: 0.011,
  hazeLimb: 0.25,
  envIntensity: 0.75,
  post: {
    exposure: 2.5,
    bloom: 0.05,
    vignette: 0.9,
    aberration: 0.0007,
    grain: 0.022,
    lift: [0.006, 0.0068, 0.0085],
    saturation: 0.88,
  },
};

// `--set=planet.roomLight=0` cambia un parámetro sin editar el archivo (para
// probar A/B; se puede repetir).
for (const arg of args.filter((item) => item.startsWith("--set="))) {
  const [key, value] = arg.slice(6).split("=");
  const keys = key.split(".");
  let node = PARAMS;
  for (const k of keys.slice(0, -1)) node = node[k];
  node[keys.at(-1)] = JSON.parse(value);
}

const HOST = "http://sala.local";
const threeRoot = path.join(root, "node_modules", "three");
const pageHtml = `<!doctype html><html><head><meta charset="utf-8">
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
</head><body><script type="module" src="/sala.js"></script></body></html>`;
const moduleSource = `
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
const renderRoom = ${renderRoom.toString()};
renderRoom(THREE, { RoundedBoxGeometry, mergeGeometries }, ${JSON.stringify(PARAMS)}).then(
  (result) => { window.__sala = result; },
  (error) => { window.__sala = { error: String((error && error.stack) || error) }; },
);
`;

const started = Date.now();
const browser = await chromium.launch({
  args: SOFTWARE
    ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
    : ["--ignore-gpu-blocklist", "--enable-gpu"],
});
try {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") console.log(`[página] ${msg.text()}`);
  });
  page.on("pageerror", (error) => console.error(`[página] ${error.message}`));
  await page.route(`${HOST}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/") {
      return route.fulfill({ contentType: "text/html", body: pageHtml });
    }
    if (url.pathname === "/sala.js") {
      return route.fulfill({ contentType: "text/javascript", body: moduleSource });
    }
    if (url.pathname.startsWith("/three/")) {
      const file = path.join(threeRoot, url.pathname.slice("/three/".length));
      if (!file.startsWith(threeRoot)) return route.fulfill({ status: 403 });
      try {
        return route.fulfill({ contentType: "text/javascript", body: await readFile(file) });
      } catch {
        return route.fulfill({ status: 404 });
      }
    }
    return route.fulfill({ status: 404 });
  });
  await page.goto(`${HOST}/`);
  const handle = await page.waitForFunction(() => window.__sala, null, { timeout: 0, polling: 1000 });
  const result = await handle.jsonValue();
  if (result.error) throw new Error(result.error);
  const base64 = await page.evaluate(() => window.__salaPixels);
  const raw = Buffer.from(base64, "base64");
  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await sharp(raw, { raw: { width: result.width, height: result.height, channels: 3 } })
    .flip()
    .png({ compressionLevel: 9 })
    .toFile(OUTPUT);
  console.log(
    `${path.relative(root, OUTPUT)}  ${result.width}×${result.height}  ${SAMPLES} muestras  ` +
      `${(result.ms / 1000).toFixed(1)} s en la página, ${((Date.now() - started) / 1000).toFixed(1)} s en total`,
  );
  console.log(`GPU: ${result.gpu}  ·  ${result.lights} luces ámbar  ·  ${result.leds} pilotos`);
} finally {
  await browser.close();
}
