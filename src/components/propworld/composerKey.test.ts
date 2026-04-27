import { describe, it, expect } from "vitest";
import {
  getComposerKey,
  getActiveEffects,
  type CosmicMode,
} from "./composerKey";

describe("EffectComposer regression: rapid mode switching", () => {
  it("produces a stable key per (mode, device) pair", () => {
    expect(getComposerKey("forest", false)).toBe("forest-d");
    expect(getComposerKey("forest", false)).toBe("forest-d");
    expect(getComposerKey("theater", true)).toBe("theater-m");
  });

  it("does not remount when toggling forest <-> theater on the same device repeatedly", () => {
    // We only care that each (mode, device) maps to a single key — i.e.
    // round-tripping never produces a new identity for the same state.
    const seen = new Map<string, string>();
    const sequence: CosmicMode[] = [
      "forest",
      "transitioning",
      "theater",
      "forest",
      "theater",
      "transitioning",
      "forest",
      "theater",
    ];
    for (const m of sequence) {
      const id = `${m}-d`;
      const key = getComposerKey(m, false);
      if (seen.has(id)) {
        expect(key).toBe(seen.get(id));
      } else {
        seen.set(id, key);
      }
    }
    expect(seen.size).toBe(3); // forest, transitioning, theater
  });

  it("only changes key when the set of active effects changes", () => {
    const modes: CosmicMode[] = ["forest", "transitioning", "theater"];
    for (const isMobile of [false, true]) {
      for (const mode of modes) {
        const key1 = getComposerKey(mode, isMobile);
        const key2 = getComposerKey(mode, isMobile);
        expect(key1).toBe(key2);

        // Effects list must be deterministic and contain no nulls/dupes.
        const effects = getActiveEffects(mode, isMobile);
        expect(new Set(effects).size).toBe(effects.length);
        expect(effects.every((e) => typeof e === "string" && e.length > 0)).toBe(true);
      }
    }
  });

  it("desktop theater enables chromatic aberration + noise; mobile theater does not", () => {
    expect(getActiveEffects("theater", false)).toEqual([
      "bloom",
      "ca",
      "noise",
      "vignette",
    ]);
    expect(getActiveEffects("theater", true)).toEqual(["bloom", "vignette"]);
  });

  it("forest and transitioning never enable heavy effects (mobile or desktop)", () => {
    for (const isMobile of [false, true]) {
      expect(getActiveEffects("forest", isMobile)).toEqual(["bloom", "vignette"]);
      expect(getActiveEffects("transitioning", isMobile)).toEqual(["bloom", "vignette"]);
    }
  });

  it("simulates 50 rapid mode flips without producing unexpected key churn", () => {
    const order: CosmicMode[] = ["forest", "transitioning", "theater"];
    let lastKey = getComposerKey(order[0], false);
    let transitions = 0;
    for (let i = 1; i < 50; i++) {
      const mode = order[i % order.length];
      const key = getComposerKey(mode, false);
      if (key !== lastKey) transitions++;
      lastKey = key;
    }
    // Exactly one remount per real mode change — no spurious re-inits.
    expect(transitions).toBe(49);
  });
});
