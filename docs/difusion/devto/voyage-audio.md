---
title: Synthesizing a spaceship's sound with Web Audio, no audio files
published: true
description: "Clicking a planet on my 3D portfolio bends space for 2.6 seconds. I wanted it to sound like something, but six destinations meant six files. So the sound is a pure function of the same four numbers the shader uses. Here's the code, and the exponential ramp that made it silent."
tags: webaudio, javascript, webdev, gamedev
cover_image: https://jonasjavier.dev/images/articulos/agujero-negro/gargantua-lente-1600.webp
series: Building Jonás Orbit, a 3D portfolio
---

On the home page of my portfolio you click a planet and the camera falls into
it. The trip takes 2.6 seconds in four phases: the instrument locks on, the
camera falls, space warps, and a flash covers the page change. A shader bends
the sky differently for each of the six destinations. The black hole pulls the
light into a lens. The ocean planet ripples like water. The tesseract turns
the stars into right angles.

It was silent. I wanted a sound.

## Why not an audio file

The obvious move is to find a nice "warp" sample and play it. Three reasons
stopped me:

1. **License.** At the time, the music file on the site still had its license
   paperwork open. A second third-party sound would double that, on a
   portfolio that recruiters will open.
2. **Weight.** That music file was 7.44 MiB. A synthesized sound is zero
   bytes.
3. **There are six destinations.** This is the one that decided it. Each
   world already has four numbers that drive the shader: `lens`, `liquid`,
   `grid` and `dark`. A recorded file means six files, or one sound for six
   different pictures.

```ts
export const VOYAGE_FLAVOURS: Readonly<Record<WorldId, VoyageFlavour>> = {
  gargantua: { lens: 1, liquid: 0, grid: 0, dark: 1 },
  miller: { lens: 0.35, liquid: 1, grid: 0, dark: 0 },
  endurance: { lens: 0.4, liquid: 0, grid: 0, dark: 0.1 },
  edmunds: { lens: 0.45, liquid: 0.15, grid: 0, dark: 0.2 },
  tesseract: { lens: 0.3, liquid: 0, grid: 1, dark: 0.15 },
  ranger: { lens: 0.4, liquid: 0.2, grid: 0, dark: 0 },
};
```

If the synth reads the same four numbers, the sound doesn't accompany the
effect. It comes out of the same numbers, so they can't disagree.

## The score is a pure function

I split it in two, like the animation code. `voyageSoundFor(id, mode)`
returns the whole score as plain data: times, frequencies, envelopes. A small
player renders it with Web Audio. Nothing in the score touches an
`AudioContext`, so I can test it without a sound card.

There are four layers, one per phase:

- **Latch** (0–0.4 s): two short triangle blips through a band-pass.
- **Fall** (0.4–1.35 s): a 32 Hz sub rising, and noise whose filter opens
  from 220 to 2,600 Hz.
- **Warp** (1.05–2.05 s): a resonant sweep over noise, plus a pair of
  detuned oscillators.
- **Cross** (1.85 s): a noise hit, a sub thump from 96 down to 30 Hz, and a
  tail.

Here's how the four flavours land on the warp layer (trimmed from
`lib/voyage-audio.ts`):

```ts
const { lens, liquid, grid, dark } = flavour;
const toneTo = TONE_ROOT * Math.pow(2, 1.45 - 2.6 * lens);

warp: {
  start: timeline.warpStart,
  end: timeline.push,
  sweepFrom: 320,
  sweepTo: 3400 * (1 - 0.7 * dark),
  sweepQ: 3.5 + 9.5 * liquid,
  sweepGain: 0.42,
  toneFrom: TONE_ROOT,
  toneTo,
  toneGain: 0.34,
  detune: grid > 0.5 ? 3 : 8 + 24 * liquid,
  wobbleRate: 4.8 + 2.4 * liquid,
  wobbleDepth: 60 * liquid,
  shape: grid > 0.5 ? "square" : "sawtooth",
  close: dark,
},
```

- `lens` decides whether the tone **falls or rises**. With `lens: 1` the
  exponent is `1.45 - 2.6 = -1.15`, so the black hole drops more than an
  octave. Every other world goes up. It's the gravity well, and it's the same
  number that curves its light.
- `liquid` raises the filter's Q and adds vibrato, so the sweep sounds like
  water instead of air. Only the ocean planet has it fully.
- `grid` switches to a square wave and almost no beating. The tesseract
  confirms its lock in an exact octave instead of a fifth.
- `dark` closes a master low-pass at the end. The black hole goes dark in
  your ears too.

One timing detail: the hit lands on the **flash**, not on the route change.
`crossAt = timeline.push - timeline.flashLead`. The ear should agree with what
the eye sees, not with the router.

Because the score is data, the tests read like the design doc:

```ts
it("sólo Gargantúa se desploma; los demás suben de tono al distorsionar", () => {
  for (const id of IDS) {
    const { warp } = voyageSoundFor(id, "full");
    if (id === "gargantua") {
      expect(warp.toneTo).toBeLessThan(warp.toneFrom * 0.5);
    } else {
      expect(warp.toneTo).toBeGreaterThan(warp.toneFrom);
    }
  }
});
```

(Test names are in Spanish; I'm from the Dominican Republic.) Other tests
check that the six scores are all different, that no layer goes above 1, and
that no exponential ramp ever starts or ends at zero. That last one has a
story.

## My mistake: an exponential ramp from epsilon

You can't `exponentialRampToValueAtTime` to or from zero, so the idiom you see
everywhere is to ramp from `0.0001` up to the peak and back down to `0.0001`.
I did that for every layer.

It didn't sound wrong. It sounded like nothing.

I measured it in the browser with a `ScriptProcessor` on the audio thread.
The whole fall, from 0.4 to 1.05 s, exactly where the camera drops, had an
**RMS of 0.0009**. Silence.

The arithmetic is simple once you see it. A ramp from 0.0001 to 0.55
multiplies by 5,500. Halfway through, it has only multiplied by the square
root of that: about 74, or **1.3 % of the target**. The whole audible range is
packed into the last fifth of the ramp. The tail of the cross hit died the
same way, 250 ms after it started (RMS 0.0010).

The fix is two helpers in `lib/audio-bus.ts`. The swell is linear in
amplitude, in two segments. The decay is exponential, but only down to −34 dB
of the peak, then a short linear cut to zero:

```ts
/** Hinchado: dos tramos lineales que suben sin enmudecer por el camino. */
export function swell(param: AudioParam, peak: number, from: number, until: number) {
  const span = Math.max(until - from, 0.001);
  param.setValueAtTime(0, from);
  param.linearRampToValueAtTime(peak * 0.22, from + span * 0.55);
  param.linearRampToValueAtTime(peak, until);
}

/** Golpe: ataque lineal, caída exponencial a −34 dB y corte limpio al cero. */
export function hit(param: AudioParam, peak: number, at: number, attack: number, decay: number) {
  param.setValueAtTime(0, at);
  param.linearRampToValueAtTime(peak, at + attack);
  param.exponentialRampToValueAtTime(peak * 0.02, at + attack + decay);
  param.linearRampToValueAtTime(0, at + attack + decay * 1.15);
}
```

An exponential that ends on a real value is a natural decay. One that chases
zero spends its whole life near it.

Same machine, same volume, before → after:

| Segment | Before | After |
| --- | --- | --- |
| Fall 400–700 ms | 0.0009 | 0.0061 |
| Fall 700–1050 ms | silent | 0.0254 |
| Cross 1850–2150 ms | 0.0590 | 0.1131 |
| Tail 2150–2500 ms | 0.0010 | 0.0160 |

Now it's a continuous staircase from the latch to the hit, which is the shape
of the animation.

A second measuring trap: I first sampled the level with
`requestAnimationFrame`. With the browser panel hidden, rAF stops firing, and
I got 6 samples in 4.5 seconds. The audio thread doesn't care about frames:
the `ScriptProcessor` gave 352 blocks in 3.8 seconds.

## Who turns it off

The site has one audio bus: one `AudioContext`, one master, one limiter, and
one place that knows if the visitor muted. The AUDIO control is the only
switch. With it on mute, clicking a destination creates **zero**
audio contexts, the peak measures 0.000000, and the route still changes. The
motion switch doesn't touch sound; with reduced motion you hear a short
0.7-second version without the warp.

## What isn't solved

The limiter is there because at the cross three layers sound at once, and at
100 % volume their sum can go above 1. But a `DynamicsCompressorNode` is not
transparent below its threshold. In an `OfflineAudioContext`, a hit 40 dB
under the threshold came out **+1.1 dB louder** with the limiter than without
it. If the hit falls in the first half second of a new context, it comes out
at **half** the level, because the detector starts cold. So my chain's
arithmetic predicts the order of magnitude, not the digit, and the first sound
of a session is useless as a measurement. I haven't found a cleaner way to
keep the clipping out without that coloring.

And the honest part: the numbers say the six trips sound different. Whether
they sound *good* is still an open review on my side.

Have you shipped synthesized UI sound on the web? How do you keep a safety
limiter from coloring everything under it?

---

*Click any planet on [jonasjavier.dev](https://jonasjavier.dev/en) to hear it
(the AUDIO switch has to be on). How the black hole itself is drawn is in
[How I built a black hole in WebGL](https://dev.to/jonasjavier/how-i-built-a-black-hole-in-webgl-2gc1).
I'm Jonás Javier Encarnación, a full-stack developer in Santo Domingo,
Dominican Republic. I wrote this post with help from an AI assistant; the code,
the bug and the decisions are from my project.*
