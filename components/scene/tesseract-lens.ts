import * as THREE from "three";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { GARGANTUA_VERTEX } from "./gargantua-shaders";

/**
 * El espacio se pliega alrededor del Tesseracto (2026-10-07).
 *
 * ── Qué es ──────────────────────────────────────────────────────────────────
 *
 * Un paso de pantalla completa, entre el raymarch y los cuerpos, que desplaza
 * la imagen del CIELO en un anillo alrededor de la posición proyectada del
 * Tesseracto: las estrellas y el gas que quedan a su alrededor se acercan
 * apenas hacia él, con un pliegue de cuatro lóbulos que gira muy despacio y
 * una separación cromática mínima. Un objeto de cuatro dimensiones no se limita
 * a ocupar espacio: lo deforma, y ésa es la señal que le faltaba para ser
 * algo más que un alambre luminoso al lado de cuerpos con volumen.
 *
 * ── Dónde vive en la cadena, y por qué ahí ──────────────────────────────────
 *
 * Después del raymarch y ANTES de `bodyPass`. Los cuerpos se dibujan encima
 * con `clear = false`, así que el propio Tesseracto —y cualquier otro cuerpo—
 * sale nítido sobre un fondo ya doblado: lo que se distorsiona es el espacio
 * que tiene detrás, no él. Y como el raymarch acumula en el tiempo en su propio
 * par de búferes, doblar su salida no toca la convergencia.
 *
 * ── Presupuesto ─────────────────────────────────────────────────────────────
 *
 * Cuesta un blit: fuera del anillo el fragment devuelve el texel tal cual.
 * Sólo existe con `canFloat` —el mismo gate que el bloom— y se deshabilita
 * cuando el Tesseracto no está en el cuadro. El radio llega como fracción del
 * ALTO (misma convención que la travesía); el anillo alcanza 2,2 radios
 * publicados y el desplazamiento máximo es un 1,2 % del alto: en 900 px, once
 * píxeles en el pico y cero en el centro y en el borde.
 */
const TESSERACT_LENS_FRAGMENT = /* glsl */ `
precision highp float;

uniform sampler2D tDiffuse;
/** Tesseracto proyectado, en UV (0..1, origen abajo a la izquierda). */
uniform vec2 uCentre;
/** Radio publicado del Tesseracto, como fracción del ALTO del cuadro. */
uniform float uRadius;
uniform float uAspect;
uniform float uTime;
/** Desplazamiento máximo, en fracción del alto. */
uniform float uStrength;
/** Intensidad del campo de luz del pliegue (lineal, antes del bloom). */
uniform float uField;

varying vec2 vUv;

void main() {
  vec2 asp = vec2(uAspect, 1.0);
  vec2 p = (vUv - uCentre) * asp;
  float r = length(p);
  float reach = uRadius * 2.2;
  if (r >= reach) {
    gl_FragColor = texture2D(tDiffuse, vUv);
    return;
  }
  float t = r / reach;
  /* Campana: nada en el centro —ahí está el cuerpo— ni en el borde, y el pico
     a medio camino, donde quedan las estrellas que lo rodean. */
  float bell = smoothstep(0.0, 0.5, t) * (1.0 - smoothstep(0.5, 1.0, t));
  /* Cuatro lóbulos que giran despacio: el pliegue de un hipercubo, no el halo
     redondo de una lente. Vuelta completa cada ~36 s. */
  float ang = atan(p.y, p.x);
  float fold = 0.70 + 0.30 * sin(ang * 4.0 + uTime * 0.175);
  float shift = uStrength * bell * fold;
  vec2 dir = p / max(r, 1e-4);
  vec2 uv = vUv - dir * shift / asp;
  /* Separación cromática mínima: el rojo y el azul no se pliegan igual. */
  vec2 split = dir * shift * 0.16 / asp;
  vec3 col = vec3(
    texture2D(tDiffuse, clamp(uv + split, vec2(0.0), vec2(1.0))).r,
    texture2D(tDiffuse, clamp(uv, vec2(0.0), vec2(1.0))).g,
    texture2D(tDiffuse, clamp(uv - split, vec2(0.0), vec2(1.0))).b
  );
  /*
    Y un campo apenas visible donde el espacio se pliega: cian hacia violeta,
    con los mismos cuatro lóbulos, por debajo del umbral en el que se lee como
    halo. Sin él, sobre un cielo vacío la distorsión no tiene qué mover y el
    pliegue no existe; con él, el Tesseracto perturba su entorno aunque no haya
    una estrella detrás. El bloom, que viene después, lo levanta apenas.
  */
  vec3 field = mix(vec3(0.24, 0.81, 1.0), vec3(0.57, 0.36, 1.0), 0.5 + 0.5 * sin(ang * 2.0 - uTime * 0.11));
  col += field * bell * (fold - 0.40) * uField;
  gl_FragColor = vec4(col, 1.0);
}
`;

export interface TesseractLensUniforms {
  tDiffuse: { value: THREE.Texture | null };
  uCentre: { value: THREE.Vector2 };
  uRadius: { value: number };
  uAspect: { value: number };
  uTime: { value: number };
  uStrength: { value: number };
  uField: { value: number };
}

export function createTesseractLens(): {
  pass: ShaderPass;
  uniforms: TesseractLensUniforms;
} {
  const uniforms: TesseractLensUniforms = {
    tDiffuse: { value: null },
    uCentre: { value: new THREE.Vector2(0.5, 0.5) },
    uRadius: { value: 0.06 },
    uAspect: { value: 1 },
    uTime: { value: 0 },
    uStrength: { value: 0.015 },
    uField: { value: 0.045 },
  };
  const pass = new ShaderPass({
    name: "TesseractLens",
    uniforms,
    vertexShader: GARGANTUA_VERTEX,
    fragmentShader: TESSERACT_LENS_FRAGMENT,
  });
  pass.enabled = false;
  // `ShaderPass` CLONA los uniformes que recibe: los que hay que escribir son
  // los suyos, no el objeto de arriba.
  return { pass, uniforms: pass.uniforms as unknown as TesseractLensUniforms };
}
