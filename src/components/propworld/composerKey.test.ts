import { describe, it, expect } from "vitest";
import {
  getComposerKey,
  getActiveEffects,
  type CosmicMode,
} from "./composerKey";

describe("EffectComposer regression: rapid mode switching", () => {
  it("produces a stable key per (mode, device) pair", () => {
    expect(getComposerKey("forest", false)).toBe("light-d");
    expect(getComposerKey("forest", false)).toBe("light-d");
    expect(getComposerKey("transitioning", false)).toBe("light-d");
    expect(getComposerKey("theater", true)).toBe("light-m");
    expect(getComposerKey("game", false)).toBe("heavy-d");
  });

  it("does not remount when toggling forest <-> transitioning on the same device", () => {
    // forest and transitioning share the same effect set → same key → no remount
    expect(getComposerKey("forest", false)).toBe(getComposerKey("transitioning", false));
    expect(getComposerKey("theater", false)).toBe(getComposerKey("game", false));
    // mobile: no heavy effects, so all modes are light
    expect(getComposerKey("theater", true)).toBe(getComposerKey("forest", true));
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
    // forest↔transitioning share a key (no remount); only transitioning→theater
    // and theater→forest cause remounts — 32 instead of 49.
    expect(transitions).toBe(32);
  });
});
