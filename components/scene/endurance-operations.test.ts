import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { worldsData } from "@/content/worlds.data";
import { createBody, disposeBody } from "./bodies";
import { ENDURANCE_JETS, updateEnduranceOperations } from "./endurance-operations";

describe("Endurance operational life", () => {
  it("fires at most two jets, for 150–400 ms, with several seconds of irregular silence", () => {
    const jets = new Float32Array(ENDURANCE_JETS);
    const nav = new Float32Array(3);
    const starts = new Map<number, number>();
    const used = new Set<number>();
    const durations: number[] = [];
    const gaps: number[] = [];
    let lastEnd = 0;
    let previouslyActive = false;
    let maxActive = 0;
    for (let tick = 0; tick <= 60000; tick++) {
      const time = tick / 100;
      updateEnduranceOperations(time, jets, nav);
      const active = jets.filter((value) => value > 0).length;
      maxActive = Math.max(maxActive, active);
      if (active && !previouslyActive) gaps.push(time - lastEnd);
      if (!active && previouslyActive) lastEnd = time;
      previouslyActive = active > 0;
      for (let jet = 0; jet < jets.length; jet++) {
        if (jets[jet] > 0 && !starts.has(jet)) {
          starts.set(jet, time);
          used.add(jet);
        } else if (jets[jet] === 0 && starts.has(jet)) {
          durations.push(time - starts.get(jet)!);
          starts.delete(jet);
        }
      }
    }
    expect(maxActive).toBe(2);
    expect(used.size).toBe(14);
    expect(Math.min(...durations)).toBeGreaterThanOrEqual(0.15);
    expect(Math.max(...durations)).toBeLessThanOrEqual(0.4);
    expect(Math.min(...gaps.slice(1))).toBeGreaterThan(3.7);
    expect(Math.max(...gaps) - Math.min(...gaps.slice(1))).toBeGreaterThan(1);
  });

  it("renders a readable rim correction in every event, even at 15 fps", () => {
    const jets = new Float32Array(14);
    const nav = new Float32Array(3);
    // Regression: checking only 'some jet fired' accepted a whole minute of
    // hidden micro-RCS. Require multiple strong frames from the exposed rim.
    for (let event = 0; event < 100; event++) {
      let strongFrames = 0;
      for (let frame = Math.ceil(event * 5.8 * 15); frame < (event + 1) * 5.8 * 15; frame++) {
        updateEnduranceOperations(frame / 15, jets, nav);
        if (Math.max(jets[0], jets[2]) > 0.7) strongFrames++;
      }
      expect(strongFrames).toBeGreaterThanOrEqual(2);
    }
  });

  it("can seek backwards without stale ignitions and keeps navigation discreet", () => {
    const jets = new Float32Array(14);
    const nav = new Float32Array(3);
    updateEnduranceOperations(4, jets, nav);
    const initial = [...nav];
    updateEnduranceOperations(21600, jets, nav);
    updateEnduranceOperations(4, jets, nav);
    expect([...jets]).toEqual(Array(14).fill(0));
    expect([...nav]).toEqual(initial);
    let distinctPhases = false;
    for (let time = 0; time < 60; time += 0.1) {
      updateEnduranceOperations(time, jets, nav);
      expect(Math.min(...nav)).toBeGreaterThanOrEqual(0.57);
      expect(Math.max(...nav)).toBeLessThanOrEqual(1);
      if (Math.max(...nav) - Math.min(...nav) > 0.3) distinctPhases = true;
    }
    expect(distinctPhases).toBe(true);
  });

  it("keeps four draws, dark hull/panels, and all fourteen spatial jet channels", () => {
    const world = worldsData.endurance;
    const body = createBody({ id: "endurance", ...world })!;
    try {
      const assembly = body.object.getObjectByName("endurance-assembly")!;
      expect(assembly.children).toHaveLength(4);
      // Four body batches plus the existing orbital trajectory material.
      expect(body.materials).toHaveLength(5);
      const light = assembly.getObjectByName("endurance-airlock-lights") as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
      const mask = light.geometry.getAttribute("aSurfaceMask");
      const channels = new Set<number>();
      for (let index = 0; index < mask.count; index++) {
        if (mask.getX(index) >= 8 && mask.getX(index) < 40) channels.add(Math.floor((mask.getX(index) - 8) / 2));
      }
      expect(channels.size).toBe(14);
      expect(light.material.depthWrite).toBe(false);
      expect(light.material.depthTest).toBe(true);
      expect(light.material.forceSinglePass).toBe(true);
      const position = light.geometry.getAttribute("position");
      const original = position.array.slice();
      body.spinAt(13.37);
      expect((light.material.uniforms.uIgnition.value as Float32Array)
        .filter((value) => value > 0.7)).toHaveLength(2);
      body.spinAt(4);
      expect([...light.material.uniforms.uIgnition.value]).toEqual(Array(14).fill(0));
      expect(position.array).toEqual(original);
      expect(assembly.rotation.x).toBeCloseTo(Math.sin(4 * 0.071) * 0.007, 12);
      expect(assembly.rotation.y).toBeCloseTo(Math.sin(4 * 0.049) * 0.009, 12);
      for (const material of body.materials.filter((material) => material !== light.material)) {
        expect(material.uniforms.uIgnition).toBeUndefined();
      }
    } finally {
      disposeBody(body);
    }
  });
});
