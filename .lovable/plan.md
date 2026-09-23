# PMG Exclusive Link-in-Bio Page

## Goal
Add a new public **Exclusive** tab that recreates the linked PMG page inside the current website, optimized as the single destination for social profiles.

## What I’ll build
- Add `/exclusive` as a full public page and add **Exclusive** to the main navigation.
- Recreate the reference page’s black-and-white editorial layout with PMG’s electric-yellow accents and current rough display fonts.
- Include the PMG Exclusive introduction, social links, Propworld section, four current releases with artwork and all provided streaming links, video features, Spotify artist player, mailing-list callout, and links back into the main PMG site.
- Use the current PMG logo and locally stored release artwork so the page remains visually reliable.
- Keep the page fast and link-in-bio friendly on phones, while preserving the wider reference layout on desktop.

## Technical details
- Build a focused React page with reusable data arrays for releases, social profiles, videos, and destinations.
- Use semantic design tokens and existing site typography; external services open safely in new tabs.
- The signup call-to-action will send visitors to the existing Symphony signup section, preserving the working consent/form flow rather than creating a second unconnected form.
- Add page metadata and verify the new route at desktop and mobile sizes.
