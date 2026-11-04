---
title: "A soundtrack that's on by default, without an AudioContext until the first gesture"
published: true
description: "My portfolio's music is on by default, so every page load built an AudioContext just for the browser to refuse it: 168 console warnings in 174 loads. Here's the 'armed' state that waits for the first real gesture, and the touch bug that made the first tap silent."
tags: javascript, webaudio, webdev, ux
cover_image: https://jonasjavier.dev/images/articulos/fondos-gargantua/gargantua-interstellar-wallpaper-4k-cinematic-1600.webp
series: Building Jonás Orbit, a 3D portfolio
---

My portfolio has an ambient soundtrack. I wanted it on by default: the site is
a 3D map of space, and the music is part of it. A tray in the corner has one
AUDIO control that turns everything off, and that choice is saved.

"On by default" collides with the browser. No page can start audible sound
before the visitor has interacted with it. So the real question is not how to
autoplay. It's what the page does in the seconds between "the visitor wants
music" and "the browser allows music".

## The symptom

The first version did the obvious thing. On entry, build the audio graph, call
`play()`, and if the browser says `NotAllowedError`, wait for a click.

It worked. But Chrome printed this on every page load:

> The AudioContext was not allowed to start.

I counted 168 of those warnings in 174 page loads.
The graph was being built only so the browser could refuse it.

## Why the obvious fix doesn't work

The obvious fix is "don't start on entry, start on click". That kills the
default. The visitor would have to find the speaker icon to hear anything, and
the tray would show OFF while the saved preference says ON.

The other obvious fix is to catch the refusal and stay quiet. The warning is
printed when the `AudioContext` is created in a page without activation,
before any promise rejects. There is nothing to catch.

## What I did: an `armed` state

The player has six states. One of them is new:

```ts
/** `armed`: on by default, waiting for the browser's first user gesture. */
type Playback = "off" | "loading" | "playing" | "armed" | "paused" | "error";
```

`armed` means "the visitor wants sound, and the browser hasn't allowed it yet".
The tray shows it as ON, because what it shows is the intent, not the wait.

The browser can tell you whether a gesture has happened, through
`navigator.userActivation`. If it says no, the player goes straight to `armed`
and doesn't touch Web Audio at all:

```ts
startDefault() {
  // ...the saved "off" returns early...
  this.wanted = true;
  if (this.mustWaitForGesture()) {
    this.update({ playback: "armed" });
    return;
  }
  void this.play(false);
}

/** True while the browser says no gesture has happened yet and no graph exists. */
private mustWaitForGesture(): boolean {
  return this.context === null && typeof navigator !== "undefined" && navigator.userActivation?.hasBeenActive === false;
}
```

The `AudioContext` is only created inside `play()`, and `play()` runs from the
first gesture. So the graph is built inside the activation, as a click handler
would do it:

```ts
this.prepare(); // new AudioContext(), new Audio(), gain at 0
// Both calls happen within the click's user activation, including iOS.
await Promise.all([this.context!.resume(), this.media!.play()]);
```

The gain starts at 0 and ramps to the visitor's volume over 1.2 seconds, so
the first gesture never produces a jump.

The unit test checks the thing I actually care about: no graph before the
gesture, one graph after it.

```ts
it("before any gesture it arms itself without building an AudioContext (no console warning)", async () => {
  vi.stubGlobal("navigator", { ...navigator, userActivation: { hasBeenActive: false, isActive: false } });
  player.startDefault();
  await Promise.resolve(); await Promise.resolve();
  expect(player.getSnapshot().playback).toBe("armed");
  expect(AudioContext).not.toHaveBeenCalled();
  expect(Audio).not.toHaveBeenCalled();
  // The first real gesture builds the graph inside the activation and plays.
  vi.stubGlobal("navigator", { ...navigator, userActivation: { hasBeenActive: true, isActive: true } });
  player.resumeWanted();
  await Promise.resolve(); await Promise.resolve();
  expect(AudioContext).toHaveBeenCalledTimes(1);
  expect(player.getSnapshot().playback).toBe("playing");
});
```

There was one more door. `pageshow` fires right after `load`, and its handler
also called `play()`. Same warning, through a different path. It now asks the
same `mustWaitForGesture()` first.

## My mistake: the first tap was lost

The control listened for `pointerdown` and `keydown`. On a desktop that's
fine. On a phone, the music only started on the *second* tap.

A touch doesn't activate the page on `pointerdown`. It activates on
`pointerup` or `touchend`. So the first tap called `play()` too early, got
refused, and the player went back to `armed`. The second tap's `pointerdown`
came after the first tap's activation, so it worked.

The fix listens to every event that can be the activating one, in the capture
phase on `window`, so no other handler can swallow it:

```ts
const UNLOCK_EVENTS = ["pointerdown", "pointerup", "touchend", "keydown", "click"] as const;

for (const type of UNLOCK_EVENTS) window.addEventListener(type, unlock, { capture: true, passive: true });
```

`unlock` only calls `resumeWanted()`, which does nothing once the music is
really playing. Wheel and pointer movement are not in the list: they never
count as activation, so no code can make them sound. Someone who reads the
page by scrolling with the wheel stays `armed` until their first click or key.

## The quiet bug behind it

While testing that, I found a worse case. Sometimes the `<audio>` element
fired `playing`, but the `AudioContext` was still `suspended`. Sound was
flowing into a stopped graph. That's silence, and the old code marked it as
`playing`. The tray said ON, nothing sounded, and the next gesture thought
there was nothing to do.

Now `playing` only counts when the context is running:

```ts
media.onplaying = () => {
  if (!this.wanted || this.hidden) { media.pause(); return; }
  // Frames flowing into a suspended graph make no sound: still waiting.
  if (context.state !== "running") { this.update({ playback: "armed" }); return; }
  this.update({ playback: "playing" });
  this.level(1.2);
};
```

And `resumeWanted()` retries when the state says playing but the context
doesn't:

```ts
resumeWanted() {
  if (!this.wanted || this.hidden) return;
  const silent = this.context !== null && this.context.state !== "running";
  if (this.state.playback !== "playing" || silent) void this.play(false);
}
```

## Making the wait visible

`armed` showing ON had its own problem. People saw ON, heard nothing, and
assumed it was broken. So while the player is `armed`, the tray says "Click to
listen" ("Tap to listen" on touch screens) and the ON label pulses softly. It
goes away as soon as the music plays or the panel opens.

## What isn't solved

A new visitor always needs one gesture. That's the browser's rule and it's a
good one. The only way to hear the music without a click is for the visitor to
allow sound for the site in their browser settings.

Where `navigator.userActivation` isn't available, `mustWaitForGesture()`
returns `false` and the old path runs: try to play, get refused, go to
`armed`. It still works, but the warning can come back there.

And the site still has two `AudioContext`s: one for the soundtrack and one for
the sound effects bus. One control drives both, but it's two graphs to keep in
sync.

## A question

How do you show "sound is on, but waiting for you" without it looking broken?
A pulsing label is my answer for now, and I'm not sure it's the best one.

You can hear it (after one click) at
[jonasjavier.dev](https://jonasjavier.dev/en).

*I'm Jonás Javier Encarnación, a full-stack developer in Santo Domingo,
Dominican Republic. I wrote this post with help from an AI assistant; the code,
the bug and the decisions are from my project.*
