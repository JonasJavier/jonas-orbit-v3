type Playback = "off" | "loading" | "playing" | "paused" | "error";
type SoundtrackState = { playback: Playback; volume: number; muted: boolean };

const INITIAL: SoundtrackState = { playback: "off", volume: 0.28, muted: false };
const VOLUME_KEY = "jonas-orbit:audio-volume";
const ENABLED_KEY = "jonas-orbit:audio-enabled";

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
    parameter.cancelAndHoldAtTime(now);
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
      if (Number.isFinite(volume) && volume >= 0 && volume <= 1) {
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
      this.update({ playback: "playing" });
      this.level(1.2);
    };
    media.onerror = () => this.fail();
    media.onpause = () => {
      // Browser/OS interruptions must not leave a false ON indicator.
      if (media.paused && this.wanted && !this.hidden && !this.pauseTimer) {
        this.wanted = false;
        this.update({ playback: "paused" });
      }
    };
    media.src = "/audio/orbit-ambient.m4a";
  }

  /** Starts on entry unless the visitor explicitly disabled the soundtrack. */
  startDefault() {
    let enabled = true;
    try { enabled = localStorage.getItem(ENABLED_KEY) !== "false"; } catch { /* Default stays on. */ }
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
    void this.play(false);
  }

  /** Retries a browser-blocked autoplay inside the next real user gesture. */
  resumeWanted() {
    if (this.wanted && !this.hidden && this.state.playback !== "playing") {
      void this.play(false);
    }
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
          this.update({ playback: "paused" });
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
    else if (this.wanted) void this.play();
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
