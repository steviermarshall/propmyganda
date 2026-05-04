/**
 * Pure helper that derives the stable `key` used on <EffectComposer>.
 *
 * The composer must only remount when the *set of active effects* changes
 * (driven by mode + device class). Any other prop change (intensity,
 * threshold, etc.) is tweened in-place and must NOT change this key —
 * otherwise the composer re-initializes every frame and the scene flickers.
 */
export type CosmicMode = "forest" | "transitioning" | "theater" | "game";

export function getComposerKey(mode: CosmicMode, isMobile: boolean): string {
  const isHeavy = (mode === "theater" || mode === "game") && !isMobile;
  return `${isHeavy ? "heavy" : "light"}-${isMobile ? "m" : "d"}`;
}

/**
 * Active effects for a given mode/device. Order matters and is asserted in
 * the regression test to catch accidental reordering (which also remounts).
 */
export function getActiveEffects(mode: CosmicMode, isMobile: boolean): string[] {
  const effects = ["bloom"];
  if ((mode === "theater" || mode === "game") && !isMobile) {
    effects.push("ca", "noise");
  }
  effects.push("vignette");
  return effects;
}
