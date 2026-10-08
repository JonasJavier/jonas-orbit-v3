---
title: A pixel-ratio governor for Three.js that doesn't trust 60 fps
published: true
description: "My WebGL scene looked soft on phones because it rendered at 1 pixel per point. Raising it blindly would choke weak GPUs, so the scene tries each step and keeps it only if the phone holds its own best pace. Here's the code."
tags: threejs, webgl, performance, javascript
cover_image: https://jonasjavier.dev/images/articulos/portafolio-3d/portafolio-3d-webgl-en-1600.webp
series: Building Jonás Orbit, a 3D portfolio
---

The home page of my portfolio is a WebGL scene: a ray-marched black hole and
five bodies around it. On a phone it ran at **1 render pixel per CSS point**.
Phone screens are 2.6 to 3 points per pixel, so the browser was stretching the
scene almost three times. Everything looked soft.

The obvious fix is `renderer.setPixelRatio(window.devicePixelRatio)`. On this
scene that's a bad idea: a ray march costs per pixel, and going from 1 to 3
means nine times the pixels. A mid-range phone that was just keeping up at 1
would choke.

So the scene doesn't guess. It **tries**.

## Try a step, keep it only if it holds

The governor starts at 1, which I already knew worked, and tries
`1 → 1.25 → 1.5`, never above `devicePixelRatio`. It measures windows of 45
frames (about 0.75 s at 60 Hz), throws away the 30 frames after every change
and looks at the 75th percentile of the frame interval. If a window is fast,
it steps up. If a window is slow, it steps down **and that ceiling stays
closed** for the rest of the visit.

That last part matters more than it looks. Every resolution change resets the
scene's temporal accumulation, and you see it as a flash of grain. A governor
that flips between two steps every second is worse than no governor at all.

## Why not measure the GPU?

Because on phones you can't. Almost no mobile browser exposes
`EXT_disjoint_timer_query`. The only clock you have is the interval between
two `requestAnimationFrame` calls, and that clock saturates at the refresh
rate. If the phone is hitting its refresh rate, you know there's *some*
headroom, but not how much. The only way to find out is to try the next step.

## The bug: 60 fps isn't "fast" on a 120 Hz phone

My first version used a fixed bar: p75 ≤ 18.5 ms meant "fast", step up.
That's fine on a 60 Hz screen. On a 90 or 120 Hz phone, 16.7 ms is **half**
the screen's rate, and the governor still read it as headroom. It kept
stepping up with the GPU already at its limit, and taps on the scene started
to feel late. I noticed it on my own phone the night I shipped it.

The fix: the bar is relative to the device. The governor remembers the
fastest pace it has seen during the visit, and a window only counts as
"held" if it stays within 15 % of that pace (8.3 → 9.6 ms at 120 Hz,
16.7 → 19.2 ms at 60 Hz). A step that can't hold it is undone and closed.
The fixed numbers stay as absolute limits, so a phone in battery saver at
30 Hz never steps up.

## The code

This is the whole thing, dependency-free (comments trimmed):

```ts
const TOUCH_DPR_STEPS = [1, 1.25, 1.5] as const;
export const WINDOW_FRAMES = 45;
export const SETTLE_FRAMES = 30;
const FAST_MS = 18.5;       // p75 below this: room to step up (≥ ~54 fps)
const SLOW_MS = 26;         // p75 above this: step down (≤ ~38 fps)
const PACE_TOLERANCE = 1.15;
const GAP_MS = 250;         // a gap like this is a paused tab or a GC, not a slow frame

export function createResolutionGovernor(deviceRatio: number) {
  const steps = TOUCH_DPR_STEPS.filter(
    (step, index) => index === 0 || step <= deviceRatio + 1e-3,
  );
  let index = 0;
  let ceiling = steps.length - 1;
  let settle = SETTLE_FRAMES;
  let pace = Number.POSITIVE_INFINITY; // best pace held this visit
  let last: number | null = null;
  const intervals: number[] = [];

  function restart() {
    last = null;
    settle = SETTLE_FRAMES;
    intervals.length = 0;
  }

  return {
    get dpr() {
      return steps[index];
    },
    interrupt: restart,
    /** Returns true when the pixel ratio changed and buffers must resize. */
    sample(timestamp: number) {
      const previous = last;
      last = timestamp;
      if (previous === null) return false;
      const interval = timestamp - previous;
      if (interval <= 0 || interval > GAP_MS) {
        restart();
        last = timestamp;
        return false;
      }
      if (settle > 0) {
        settle -= 1;
        return false;
      }
      intervals.push(interval);
      if (intervals.length < WINDOW_FRAMES) return false;

      const sorted = [...intervals].sort((a, b) => a - b);
      const p75 = sorted[Math.floor(sorted.length * 0.75)];
      intervals.length = 0;
      pace = Math.min(pace, p75);
      const held = p75 <= pace * PACE_TOLERANCE;

      if (index > 0 && (p75 >= SLOW_MS || !held)) {
        index -= 1;
        ceiling = index; // never try this step again
        restart();
        return true;
      }
      if (held && p75 <= FAST_MS && index < ceiling) {
        index += 1;
        restart();
        return true;
      }
      return false;
    },
  };
}
```

## Wiring it into a Three.js loop

The governor only exists on touch screens with a real GPU. Desktop keeps its
own fixed ratio, and a software rasterizer already renders at half resolution
on purpose.

```ts
const governor = isTouch && hasRealGpu
  ? createResolutionGovernor(window.devicePixelRatio || 1)
  : null;

function resize() {
  const cap = governor ? governor.dpr : DESKTOP_DPR;
  const dpr = Math.min(window.devicePixelRatio || 1, cap);
  renderer.setPixelRatio(dpr);
  renderer.setSize(width, height, false);
  composer.setPixelRatio(dpr);
  composer.setSize(width, height);
  // ...plus any render targets you size by hand
}

function frame(timestamp: number) {
  render();
  if (governor) {
    if (inTransition || !animated) governor.interrupt();
    else if (governor.sample(timestamp)) resize();
  }
  requestAnimationFrame(frame);
}
```

Two details that cost me time:

- **Interrupt when the frame pace means nothing.** During a camera transition
  or a frozen pose the scene has a different rhythm. Measuring it would teach
  the governor the wrong pace, so those frames call `interrupt()` instead.
- **Resize everything you own.** `setPixelRatio` on the renderer isn't enough
  if you keep your own history buffers or a bloom target sized in pixels.
  Mine resizes both history targets and the bloom chain, then resets the
  accumulation.

## Testing it without a 120 Hz phone

I don't own a 120 Hz phone, so the behaviour on one is pinned by unit tests
that feed fake timestamps. The one for the bug looks like this:

```ts
it("at 120 Hz, dropping to 60 fps is not headroom: undo the step", () => {
  const governor = createResolutionGovernor(3);
  let t = run(governor, 1000 / 120).end;
  expect(governor.dpr).toBe(1.25);

  // 16.7 ms passes the fixed 18.5 ms bar, but it's half the screen's rate.
  t = run(governor, 1000 / 60, t).end;
  expect(governor.dpr).toBe(1);

  for (let i = 0; i < 4; i += 1) t = run(governor, 1000 / 120, t).end;
  expect(governor.dpr).toBe(1); // the ceiling stays closed
});
```

`run` just calls `sample()` with evenly spaced timestamps for one settle
period plus one window. Ten small tests like this cover stepping up, the
device-ratio cap, a density-1 screen, a pause that isn't a slow frame and an
interrupted window.

## What isn't solved

The p75 of rAF intervals tells me when a phone is *below* its refresh rate.
It can't tell me how much room is left above it. A phone that sits right on
the edge will try 1.25 once, fail and go back, and you'll see one flash of
grain in that visit. I accepted that over never trying.

If you've solved headroom on mobile WebGL without a GPU timer, I'd like to
know how.

---

*The scene is live at [jonasjavier.dev](https://jonasjavier.dev/en). The rest
of the mobile work (no-JS fallback, deferred scene, image crops) is in
[A 3D portfolio Google can read and a phone can run](https://dev.to/jonasjavier/a-3d-portfolio-google-can-read-and-a-phone-can-run-2jlo).
I'm Jonás Javier Encarnación, a full-stack developer in Santo Domingo,
Dominican Republic. I wrote this post with help from an AI assistant; the code,
the bug and the decisions are from my project.*
