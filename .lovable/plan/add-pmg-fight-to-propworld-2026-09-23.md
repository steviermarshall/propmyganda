# Add PMG Fight to Propworld

## What will change
- Add a third ancient tree to the Propworld forest named **PMG Fight**.
- Give its doorway and surrounding glow a distinct crimson/red color so it reads separately from The Game and The Room.
- Add a third forest label for PMG Fight and keep all three choices readable on desktop and mobile.
- Enter the uploaded PMG Fight arcade game when the new tree doorway is selected.
- Keep PMG Fight inside the existing Propworld full-screen experience, with a clear return-to-forest control.

## Technical details
- Extend Propworld's scene modes and tree variants to include `fight`.
- Position the three trees across the clearing and update camera hover/transition targeting for the selected tree.
- Add the uploaded self-contained React game as a project component, preserving its keyboard and touch controls.
- Mount the fight game as a DOM/canvas layer only after the third-tree transition completes, pausing the 3D scene behind it to avoid competing controls and rendering work.
- Verify the forest, transition, fighter selection, gameplay, touch layout, and return flow at desktop and mobile sizes.
