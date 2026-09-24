# Add uploaded assets to PMG Fight

## What will change
- Add JPeez, JahBalla, Stockz, Zoe, and Hammad as the playable roster models. Keep KatBot’s existing fallback because no KatBot model was supplied.
- Add the Mercedes, billboard, trash cans, and rats to The Streets.
- Replace the current Subway placeholders with the uploaded metro scene and bench.
- Use the uploaded spray can in the opening animation.
- Add “Dirty Dan” and “JahBalla — Pride” to the game’s shuffled soundtrack.
- Preserve the existing controls, fight logic, mobile layout, and return-to-Propworld button.

## Technical details
- Store the large uploaded media on the project asset CDN rather than committing binaries into the repository.
- Add FBX loading alongside the existing GLB loading, including automatic model normalization so differently scaled exports fit the fighters consistently.
- Map each existing asset lookup to its uploaded CDN file; retain graceful fallbacks if an individual asset cannot load.
- Validate fighter selection, both arenas, soundtrack playback after interaction, an actual fight round, and return to the forest.
