# Replace PMG Fight with the updated 3D version

## Changes
- Replace the current 2D PMG Fight component with the uploaded 3D version.
- Preserve Propworld’s existing “Return to Propworld” exit and forest return behavior.
- Reuse the existing PMG logo and prevent missing optional music or scenery props from breaking the game.
- Add a clear fallback for the six required fighter models because those model files were not included with the upload.

## Verification
- Check the title, fighter selection, location selection, fight screen, controls, and return-to-forest flow.
- Verify desktop and mobile layouts and confirm the preview has no new errors.

## Needed for the final character artwork
- The uploaded code expects `jpeez.glb`, `jahballa.glb`, `stockz.glb`, `zoe.glb`, `hammad.glb`, and `katbot.glb` plus four MP3 files. These were not included, so the replacement will remain usable with fallbacks until those files are supplied.
