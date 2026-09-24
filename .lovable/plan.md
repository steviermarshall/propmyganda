# Propworld overhaul — audit + Zelda-style forest

## Audit findings (current state)
- Forest: fixed camera, you can only drag to look and click a tree. No walking or exploring.
- Blue tree (The Game): space shooter runs inside the 3D forest scene with its own camera; leaving it reloads the whole page ("Return to Forest" = full refresh). Feels slow and clunky next to PMG Fight.
- Amber tree (The Room): a 3D theater with kickable objects — unrelated to the PMG Exclusive link-in-bio content. Also exits with a full page reload.
- Crimson tree (PMG Fight): works well — opens instantly as a full-screen game, clean exit. This becomes the model for the other two.
- Visuals: flat lighting, one fog layer, no wind/sway, no ground detail around paths, no sound.
- Mobile: labels are hard-coded at the bottom and overlap small screens; no touch movement.

## 1. Forest — Zelda-style exploration
- Camera switches to a high three-quarter "Zelda" angle that follows a small PMG explorer character.
- Move with WASD / arrow keys, or click/tap anywhere on the ground to walk there. On-screen joystick on mobile.
- Walk up to a tree → a floating prompt appears ("Press E / Tap to enter PMG Fight"). Clicking a tree still works from anywhere (character walks to it, then enters).
- Soft collisions so you can't walk through trees, rocks or the forest edge.
- Same moonlit teal ambiance and fireflies kept.

## 2. Environment upgrades
- Glowing stone path connecting the three trees, lanterns along it.
- Wind-swaying grass and foliage, drifting ground mist layers, falling leaves/spores.
- Small pond with moon reflection, rocks, mushrooms that glow when you walk past.
- Better lighting: local lights at each tree in its own color, softer shadows, subtle color grading.
- Optional ambient forest sound with a mute button (off by default).
- Performance kept to phone budget (fewer particles and no shadows on mobile).

## 3. Blue tree — The Game (auto-starts like PMG Fight)
- Entering the blue tree opens a full-screen game layer immediately, same pattern as PMG Fight: 3D forest fades out, game starts, "← PROPWORLD" button returns you to the forest without reloading.
- Reuses the existing space shooter with its score / HP / wave HUD, just moved into its own full-screen layer with a start screen and game-over/restart.

## 4. Amber tree — The Room becomes the creative Exclusive hub
- Entering opens a full-screen, animated creative version of the PMG Exclusive page: hero, socials, releases with streaming links, YouTube videos, Spotify player, signup — styled in the amber/grunge Ink Toner look with motion and parallax.
- Same "← PROPWORLD" exit, no reload.
- The old 3D theater is retired (kept in code only if you want it back).

## Technical details
- `Propworld.tsx`: modes become `forest | fight | game | room`; each non-forest mode renders a full-screen overlay (like fight) and remounts the scene on exit. Remove `window.location.reload()`.
- New `Explorer.tsx` (character + keyboard/click-to-move + joystick), new follow camera replacing forest logic in `CameraRig.tsx`; proximity detection per tree triggers the enter prompt.
- New `ForestPath.tsx`, `Pond.tsx`, wind shader on grass in `Ground.tsx`, mist planes, per-tree point lights; `<Environment>` built from Lightformers.
- New `SpaceGameOverlay.tsx` hosting `SpaceGame` in its own Canvas + existing `GameHUD`.
- New `RoomExclusive.tsx` reusing the data/assets from `Exclusive.tsx` (shared constants extracted), framer-motion animations.
- Verify with Playwright: walk, click-to-move, enter/exit all three trees on desktop and mobile.
