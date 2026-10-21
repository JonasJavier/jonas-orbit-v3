import { describe, expect, it } from "vitest";
import { shouldMeasureVisits } from "./visit-analytics";

describe("shouldMeasureVisits", () => {
  const site = "https://jonasjavier.dev";

  it("mide sólo en el dominio canónico y con token", () => {
    expect(shouldMeasureVisits("jonasjavier.dev", site, "abc")).toBe(true);
  });

  it("no manda datos desde localhost, el preview ni otros hosts", () => {
    expect(shouldMeasureVisits("localhost", site, "abc")).toBe(false);
    expect(shouldMeasureVisits("127.0.0.1", site, "abc")).toBe(false);
    expect(shouldMeasureVisits("jonas-orbit-v3.workers.dev", site, "abc")).toBe(false);
    expect(shouldMeasureVisits("www.jonasjavier.dev", site, "abc")).toBe(false);
  });

  it("sin token no mide en ningún host", () => {
    expect(shouldMeasureVisits("jonasjavier.dev", site, "")).toBe(false);
  });
});
