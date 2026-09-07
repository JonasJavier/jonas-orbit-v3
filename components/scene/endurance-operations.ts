/** Four existing rim pods, eight attitude jets and two docking RCS. */
export const ENDURANCE_JETS = 14;

function random(seed: number): number {
  let value = Math.imul(seed + 1, 374761393);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

function envelope(age: number, duration: number): number {
  if (age <= 0 || age >= duration) return 0;
  const t = age / duration;
  const smooth = (x: number) => x * x * (3 - 2 * x);
  return smooth(Math.min(1, t / 0.18)) * smooth(Math.min(1, (1 - t) / 0.34));
}

/** Stateless, seekable and allocation-free. A bounded event window prevents
 * accidental twelve-jet coincidences, without giving every nozzle a loop.
 * Every event includes one of the two exposed rim nozzles: random selection
 * across all fourteen could spend a minute firing only tiny, occluded RCS.
 * The 5.8 s window has 1.6 s of jitter: silence is always > 3.7 s. */
export function updateEnduranceOperations(
  seconds: number,
  ignition: Float32Array,
  navigation: Float32Array,
): void {
  ignition.fill(0);
  const event = Math.floor(seconds / 5.8);
  const start = event * 5.8 + 0.8 + random(event * 11) * 1.6;
  const duration = 0.31 + random(event * 11 + 1) * 0.07;
  const jet = (event % 2) * 2;
  ignition[jet] = envelope(seconds - start, duration);
  if (random(event * 11 + 3) > 0.35) {
    // A different nozzle, slightly later; at most two can ever fire together.
    const partner = (jet + 1 + Math.floor(random(event * 11 + 4) * 13)) % ENDURANCE_JETS;
    ignition[partner] = envelope(seconds - start - 0.045, duration * 0.9);
  }
  for (let index = 0; index < navigation.length; index++) {
    const period = 8.3 + index * 2.17;
    const phase = (seconds + index * 3.31) % period;
    navigation[index] = 0.58 + 0.42 * envelope(phase - 1.4, 0.72);
  }
}

/** Endurance's existing fourth batch only. The hull and every other body keep
 * their original shaders. Mask 0: service, 1: technical, 2–4: navigation.
 * Each nozzle owns two mask units above 8: its index + a continuous tail ramp.
 * No baked light on panels, no scene lights, no extra bloom pass. */
export const ENDURANCE_LIGHT_FRAGMENT = /* glsl */ `
  uniform float uEmission;
  uniform float uIgnition[14];
  uniform float uNavPulse[3];
  uniform vec3 uCamPos;
  varying vec3 vPositionW;
  varying vec3 vNormalW;
  varying float vSurfaceMask;

  void main() {
    // Closed lamps emit once; exhaust needs both sides of its open cone.
    // Discarding its back faces made these subpixel jets disappear at grazing
    // angles, especially when the brief ignition coincided with a thin view.
    if (!gl_FrontFacing && (vSurfaceMask < 7.5 || vSurfaceMask >= 40.0)) discard;
    vec3 warm = vec3(1.0, 0.75, 0.46);
    vec3 cool = vec3(0.78, 0.92, 1.0);
    vec3 light = warm * 1.65;
    float alpha = 1.0;
    if (vSurfaceMask >= 40.0) {
      float lamp = vSurfaceMask - 40.0;
      vec3 view = normalize(uCamPos - vPositionW);
      float facing = max(dot(normalize(vNormalW), view), 0.0);
      float pulse = lamp >= 2.0 ? uNavPulse[int(lamp - 2.0 + 0.1)] : 1.0;
      light = (lamp == 1.0 || lamp == 3.0 ? cool : warm) * 0.5 * pulse;
      alpha = pow(facing, 5.0);
    } else if (vSurfaceMask > 7.5) {
      float encoded = (vSurfaceMask - 8.0) * 0.5;
      int jet = int(floor(encoded + 0.0001));
      float tail = clamp(fract(encoded + 0.0001) * 2.0, 0.0, 1.0);
      vec3 view = normalize(uCamPos - vPositionW);
      float incidence = abs(dot(normalize(vNormalW), view));
      light = mix(vec3(1.0), vec3(0.72, 0.85, 1.0), tail) * 2.1;
      alpha = uIgnition[jet] * pow(1.0 - tail, 2.6)
        * (0.3 + 0.7 * smoothstep(0.03, 0.65, incidence)) * 0.65;
    } else if (vSurfaceMask > 1.5) {
      int beacon = int(vSurfaceMask - 2.0 + 0.1);
      light = (beacon == 1 ? cool : warm) * 1.7 * uNavPulse[beacon];
    } else if (vSurfaceMask > 0.5) {
      light = cool * 1.65;
    }
    gl_FragColor = vec4(light * uEmission, alpha);
  }
`;
