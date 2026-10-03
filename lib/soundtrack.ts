/** `armed`: on by default, waiting for the browser's first user gesture. */
type Playback = "off" | "loading" | "playing" | "armed" | "paused" | "error";
type SoundtrackState = { playback: Playback; volume: number; muted: boolean };

const INITIAL: SoundtrackState = { playback: "off", volume: 0.28, muted: false };
const VOLUME_KEY = "jonas-orbit:audio-volume";
/*
  The saved choice. Renamed on 2026-09-22, when the owner asked for music and
  sound to be ON by default: a stale «off» written while the site was being
  built would otherwise keep answering for him. The old key is dropped.
*/
const ENABLED_KEY = "jonas-orbit:audio-on";
const RETIRED_ENABLED_KEY = "jonas-orbit:audio-enabled";

/** One streaming source with an enabled-by-default preference. Browsers may
 * postpone audible playback until the first gesture; `resumeWanted` completes
 * that start without changing the visitor's saved choice. */
export class Soundtrack {
  private state = INITIAL;
  private listeners = new Set<() => void>();
  private media: HTMLAudioElement | null = null;
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private pauseTimer: ReturnType<typeof setTimeout> | undefined;
  private wanted = false;
  private hidden = false;
  private attempt = 0;

  getSnapshot = () => this.state;
  getServerSnapshot = () => INITIAL;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private update(patch: Partial<SoundtrackState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  private level(seconds: number) {
    if (!this.context || !this.gain) return;
    const now = this.context.currentTime;
    const parameter = this.gain.gain;
    if (typeof parameter.cancelAndHoldAtTime === "function") {
      parameter.cancelAndHoldAtTime(now);
    } else {
      // Firefox does not implement cancelAndHoldAtTime. Read the live value
      // before cancelling a ramp, then anchor the next one at that level.
      const held = parameter.value;
      parameter.cancelScheduledValues(now);
      parameter.setValueAtTime(held, now);
    }
    parameter.linearRampToValueAtTime(
      this.wanted && !this.hidden && !this.state.muted ? this.state.volume : 0,
      now + seconds,
    );
  }

  private prepare() {
    if (this.media) return;
    try {
      const saved = localStorage.getItem(VOLUME_KEY);
      const volume = saved === null ? NaN : Number(saved);
      // A saved zero is a mute in disguise; mute is not remembered, so the
      // visit starts audible at the default level.
      if (Number.isFinite(volume) && volume > 0 && volume <= 1) {
        this.update({ volume });
      }
    } catch { /* Storage can be unavailable; audio still works. */ }
    const context = new AudioContext();
    this.context = context;
    const media = new Audio();
    this.media = media;
    media.preload = "none";
    media.loop = true;
    const gain = context.createGain();
    this.gain = gain;
    gain.gain.value = 0;
    context.createMediaElementSource(media).connect(gain);
    gain.connect(context.destination);
    media.onwaiting = () => {
      if (this.wanted && !this.hidden) this.update({ playback: "loading" });
    };
    media.onplaying = () => {
      if (!this.wanted || this.hidden) { media.pause(); return; }
      // Frames flowing into a suspended graph make no sound: still waiting.
      if (context.state !== "running") { this.update({ playback: "armed" }); return; }
      this.update({ playback: "playing" });
      this.level(1.2);
    };
    media.onerror = () => this.fail();
    media.onpause = () => {
      // Browser/OS interruptions must not leave a false ON indicator.
      if (media.paused && this.wanted && !this.hidden && !this.pauseTimer && this.state.playback === "playing") {
        this.wanted = false;
        this.update({ playback: "paused" });
      }
    };
    media.src = "/audio/orbit-ambient.m4a";
  }

  /** Starts on entry unless the visitor explicitly disabled the soundtrack. */
  startDefault() {
    let enabled = true;
    try {
      localStorage.removeItem(RETIRED_ENABLED_KEY);
      enabled = localStorage.getItem(ENABLED_KEY) !== "false";
    } catch { /* Default stays on. */ }
    if (!enabled) {
      this.wanted = false;
      this.update({ playback: "off" });
      return;
    }
    this.wanted = true;
    if (this.hidden) {
      this.update({ playback: "paused" });
      return;
    }
    /*
      Before any gesture the browser will not let audio start, and building an
      AudioContext just to be refused prints «The AudioContext was not allowed
      to start» on every page load. When the browser can say so
      (`navigator.userActivation`), go straight to `armed`: the first gesture
      (`resumeWanted`) builds the graph inside the activation, as a click does.
    */
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

  /** Retries a browser-blocked autoplay inside the next real user gesture.
   * Also when the element reports `playing` through a context the browser
   * still holds suspended: that is silence behind an ON tray. */
  resumeWanted() {
    if (!this.wanted || this.hidden) return;
    const silent = this.context !== null && this.context.state !== "running";
    if (this.state.playback !== "playing" || silent) void this.play(false);
  }

  async play(remember = true) {
    const attempt = ++this.attempt;
    clearTimeout(this.pauseTimer);
    this.pauseTimer = undefined;
    this.wanted = true;
    this.update({ playback: "loading" });
    if (remember) {
      try { localStorage.setItem(ENABLED_KEY, "true"); } catch { /* Optional. */ }
    }
    try {
      this.prepare();
      if (this.media!.error) this.media!.load();
      // Both calls happen within the click's user activation, including iOS.
      await Promise.all([this.context!.resume(), this.media!.play()]);
      if (attempt !== this.attempt) {
        if (!this.wanted || this.hidden) this.media?.pause();
        return;
      }
      if (this.hidden) { this.suspend(); return; }
      this.update({ playback: "playing" });
      this.level(1.2);
    } catch (error) {
      if (attempt === this.attempt) {
        if (error instanceof DOMException && error.name === "NotAllowedError") {
          // Audible autoplay is browser-controlled. Keep the default ON intent
          // and finish starting synchronously on the next pointer/key gesture.
          this.update({ playback: "armed" });
          return;
        }
        // A partially constructed audio graph must never be reused as an
        // unattenuated HTML player on retry.
        if (!this.media?.getAttribute("src")) this.dispose();
        this.fail();
      }
    }
  }

  pause(remember = true) {
    this.wanted = false;
    ++this.attempt;
    this.update({ playback: "off" });
    if (remember) {
      try { localStorage.setItem(ENABLED_KEY, "false"); } catch { /* Optional. */ }
    }
    this.level(0.22);
    clearTimeout(this.pauseTimer);
    this.pauseTimer = setTimeout(() => {
      this.media?.pause();
      void this.context?.suspend().catch(() => {});
      this.pauseTimer = undefined;
    }, 240);
  }

  setVolume(volume: number) {
    if (!Number.isFinite(volume)) return;
    const value = Math.min(1, Math.max(0, volume));
    this.update({ volume: value, muted: false });
    this.level(0.08);
    try { localStorage.setItem(VOLUME_KEY, String(value)); } catch { /* Optional. */ }
  }

  toggleMute() {
    const quiet = this.state.muted || this.state.volume === 0;
    const volume = quiet && this.state.volume === 0 ? INITIAL.volume : this.state.volume;
    const restoredVolume = volume !== this.state.volume;
    this.update({ muted: !quiet, volume });
    this.level(0.08);
    if (restoredVolume) {
      try { localStorage.setItem(VOLUME_KEY, String(volume)); } catch { /* Optional. */ }
    }
  }

  private suspend() {
    ++this.attempt;
    clearTimeout(this.pauseTimer);
    this.pauseTimer = undefined;
    this.media?.pause();
    void this.context?.suspend().catch(() => {});
    if (this.wanted) this.update({ playback: "paused" });
  }

  setHidden(hidden: boolean) {
    this.hidden = hidden;
    if (hidden) this.suspend();
    else if (this.wanted) {
      // `pageshow` lands here right after `load`; before any gesture that
      // would build an AudioContext only to be refused (the same warning
      // `startDefault` avoids), and in production it raced hydration.
      if (this.mustWaitForGesture()) {
        this.update({ playback: "armed" });
        return;
      }
      void this.play();
    }
  }

  private fail() {
    this.wanted = false;
    ++this.attempt;
    clearTimeout(this.pauseTimer);
    this.pauseTimer = undefined;
    this.media?.pause();
    void this.context?.suspend().catch(() => {});
    this.update({ playback: "error" });
  }

  /** Layout unmount/Strict Mode cleanup; the instance can be used again. */
  dispose() {
    this.wanted = false;
    ++this.attempt;
    clearTimeout(this.pauseTimer);
    this.pauseTimer = undefined;
    if (this.media) {
      this.media.onplaying = this.media.onwaiting = this.media.onerror = this.media.onpause = null;
      this.media.pause();
      this.media.removeAttribute("src");
      this.media.load();
    }
    void this.context?.close().catch(() => {});
    this.media = null;
    this.context = null;
    this.gain = null;
    this.state = { ...this.state, playback: "off" };
  }
}
