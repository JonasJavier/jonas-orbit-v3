import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Soundtrack } from "./soundtrack";

describe("enabled-by-default, persistent soundtrack", () => {
  let player: Soundtrack;
  let media: HTMLAudioElement;
  let context: { resume: ReturnType<typeof vi.fn>; suspend: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };
  let ramp: ReturnType<typeof vi.fn>;
  let contextState: AudioContextState;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    media = document.createElement("audio");
    vi.spyOn(media, "play").mockResolvedValue();
    vi.spyOn(media, "pause").mockImplementation(() => {});
    vi.spyOn(media, "load").mockImplementation(() => {});
    ramp = vi.fn();
    contextState = "running";
    context = { resume: vi.fn().mockResolvedValue(undefined), suspend: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined) };
    vi.stubGlobal("Audio", vi.fn(function () { return media; }));
    vi.stubGlobal("AudioContext", vi.fn(function () {
      return { ...context, get state() { return contextState; }, currentTime: 0, destination: {},
        createGain: () => ({ gain: { value: 0, cancelAndHoldAtTime: vi.fn(), linearRampToValueAtTime: ramp }, connect: vi.fn() }),
        createMediaElementSource: () => ({ connect: vi.fn() }),
      };
    }));
    player = new Soundtrack();
  });
  afterEach(() => { player.dispose(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("starts on entry with the saved volume", async () => {
    localStorage.setItem("jonas-orbit:audio-volume", "0.6");
    player.setHidden(false);
    player.startDefault();
    await Promise.resolve(); await Promise.resolve();
    expect(player.getSnapshot()).toEqual({ playback: "playing", volume: 0.6, muted: false });
    expect(Audio).toHaveBeenCalledTimes(1);
    expect(AudioContext).toHaveBeenCalledTimes(1);
    expect(media.src).toContain("/audio/orbit-ambient.m4a");
  });

  it("forgets the retired key and a saved zero volume: the visit starts audible", async () => {
    localStorage.setItem("jonas-orbit:audio-enabled", "false");
    localStorage.setItem("jonas-orbit:audio-volume", "0");
    player.setHidden(false);
    player.startDefault();
    await Promise.resolve(); await Promise.resolve();
    expect(localStorage.getItem("jonas-orbit:audio-enabled")).toBeNull();
    expect(player.getSnapshot()).toEqual({ playback: "playing", volume: 0.28, muted: false });
  });

  it("stays off only after the visitor explicitly disables it", () => {
    localStorage.setItem("jonas-orbit:audio-on", "false");
    player.startDefault();
    expect(player.getSnapshot().playback).toBe("off");
    expect(Audio).not.toHaveBeenCalled();
    expect(AudioContext).not.toHaveBeenCalled();
  });

  it("keeps the default-on intent when autoplay waits for a gesture", async () => {
    vi.mocked(media.play).mockRejectedValueOnce(new DOMException("Blocked", "NotAllowedError"));
    player.startDefault();
    await Promise.resolve(); await Promise.resolve();
    // Armed, not paused: the tray keeps showing ON while the browser waits.
    expect(player.getSnapshot().playback).toBe("armed");
    expect(localStorage.getItem("jonas-orbit:audio-on")).toBeNull();
    player.resumeWanted();
    await Promise.resolve(); await Promise.resolve();
    expect(player.getSnapshot().playback).toBe("playing");
  });

  it("a playing element behind a suspended context is not sound: the next gesture resumes it", async () => {
    // The browser let the <audio> start but kept the graph suspended: resume()
    // stays pending until a gesture, so the start never settles on its own.
    contextState = "suspended";
    context.resume.mockReturnValueOnce(new Promise(() => {}));
    player.startDefault();
    media.dispatchEvent(new Event("playing"));
    expect(player.getSnapshot().playback).toBe("armed");
    // The gesture arrives: resume again, now allowed.
    contextState = "running";
    player.resumeWanted();
    await Promise.resolve(); await Promise.resolve();
    expect(context.resume).toHaveBeenCalledTimes(2);
    expect(player.getSnapshot().playback).toBe("playing");
    // Once it truly sounds, further gestures do nothing.
    player.resumeWanted();
    expect(context.resume).toHaveBeenCalledTimes(2);
  });

  it("a gesture that is not an activation (touch pointerdown) leaves it armed for the next event", async () => {
    vi.mocked(media.play)
      .mockRejectedValueOnce(new DOMException("Blocked", "NotAllowedError"))
      .mockRejectedValueOnce(new DOMException("Blocked", "NotAllowedError"));
    player.startDefault();
    await Promise.resolve(); await Promise.resolve();
    player.resumeWanted(); // pointerdown of a tap: still not allowed
    await Promise.resolve(); await Promise.resolve();
    expect(player.getSnapshot().playback).toBe("armed");
    player.resumeWanted(); // touchend of the same tap: allowed
    await Promise.resolve(); await Promise.resolve();
    expect(player.getSnapshot().playback).toBe("playing");
  });

  it("streams one source after activation and fades to the visitor's volume", async () => {
    localStorage.setItem("jonas-orbit:audio-volume", "0.4");
    await player.play();
    expect(media.src).toContain("/audio/orbit-ambient.m4a");
    expect(media.preload).toBe("none");
    expect(media.loop).toBe(true);
    expect(player.getSnapshot()).toEqual({ playback: "playing", volume: 0.4, muted: false });
    expect(ramp).toHaveBeenLastCalledWith(0.4, 1.2);
    media.currentTime = 42;
    player.pause();
    expect(localStorage.getItem("jonas-orbit:audio-on")).toBe("false");
    await vi.advanceTimersByTimeAsync(250);
    await player.play();
    expect(localStorage.getItem("jonas-orbit:audio-on")).toBe("true");
    expect(Audio).toHaveBeenCalledTimes(1);
    expect(media.currentTime).toBe(42);
  });

  it("cancels a pending activation without a late play promise turning it back on", async () => {
    let resolve!: () => void;
    vi.mocked(media.play).mockReturnValueOnce(new Promise<void>((done) => { resolve = done; }));
    const pending = player.play();
    player.pause();
    resolve();
    await pending;
    expect(player.getSnapshot().playback).toBe("off");
    expect(media.pause).toHaveBeenCalled();
  });

  it("cancels a fade-out when the user immediately resumes", async () => {
    await player.play();
    player.pause();
    await player.play();
    await vi.advanceTimersByTimeAsync(300);
    expect(player.getSnapshot().playback).toBe("playing");
    expect(media.pause).not.toHaveBeenCalled();
  });

  it("pauses a hidden page immediately and resumes only existing consent", async () => {
    await player.play();
    player.setHidden(true);
    expect(media.pause).toHaveBeenCalled();
    expect(context.suspend).toHaveBeenCalled();
    expect(player.getSnapshot().playback).toBe("paused");
    player.setHidden(false);
    await Promise.resolve(); await Promise.resolve();
    expect(media.play).toHaveBeenCalledTimes(2);
    player.pause();
    player.setHidden(true);
    player.setHidden(false);
    expect(media.play).toHaveBeenCalledTimes(2);
  });

  it("handles rejection and lets the visitor retry", async () => {
    vi.mocked(media.play).mockRejectedValueOnce(new DOMException("Decode failed", "NotSupportedError"));
    await player.play();
    expect(player.getSnapshot().playback).toBe("error");
    player.setHidden(true); player.setHidden(false);
    expect(media.play).toHaveBeenCalledTimes(1);
    await player.play();
    expect(player.getSnapshot().playback).toBe("playing");
  });

  it("mutes through gain without losing volume, position, or consent", async () => {
    await player.play();
    player.setVolume(0.65);
    player.toggleMute();
    expect(ramp).toHaveBeenLastCalledWith(0, 0.08);
    expect(player.getSnapshot()).toEqual({ playback: "playing", volume: 0.65, muted: true });
    player.toggleMute();
    expect(ramp).toHaveBeenLastCalledWith(0.65, 0.08);
    expect(localStorage.getItem("jonas-orbit:audio-volume")).toBe("0.65");
  });

  it("updates mute while playback is off and restores audible volume from zero", () => {
    player.toggleMute();
    expect(player.getSnapshot()).toEqual({ playback: "off", volume: 0.28, muted: true });
    player.toggleMute();
    expect(player.getSnapshot()).toEqual({ playback: "off", volume: 0.28, muted: false });
    player.setVolume(0);
    player.toggleMute();
    expect(player.getSnapshot()).toEqual({ playback: "off", volume: 0.28, muted: false });
    expect(localStorage.getItem("jonas-orbit:audio-volume")).toBe("0.28");
  });

  it("survives blocked storage and releases the media and audio context", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("denied"); });
    await player.play();
    player.dispose();
    expect(context.close).toHaveBeenCalled();
    expect(media).not.toHaveAttribute("src");
    expect(media.load).toHaveBeenCalled();
  });
});
