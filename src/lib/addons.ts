// Add-ons offered after a booking is complete. A separate line of work, quoted by request.
// Shown on the done page and the prep page next to the area guide and the tips; never inside the booking steps.
export interface AddOn { id: string; name: string; from: string; line: string }
export const ADDONS: AddOn[] = [
  { id: "clips", name: "Short-form clip pack", from: "from $75 a clip", line: "Cut from your shoot footage. Eight a month if you want a run." },
  { id: "cover", name: "Cover art", from: "from $150", line: "From the shoot stills, or illustrated." },
  { id: "visualizer", name: "Visualizer or lyric video", from: "from $250", line: "For the DSP release and the stories." },
  { id: "photo", name: "Photoshoot", from: "from $600", line: "Half day, 15 retouched. Press shots, cover, socials." },
  { id: "interview", name: "Filmed interview", from: "from $750", line: "30 to 45 minutes, two or three cameras, edited, three clips." },
  { id: "brand", name: "Logo and mini brand kit", from: "from $400", line: "Logo, type, palette, social templates." },
  { id: "merch", name: "Merch", from: "from $250 design", line: "Plus the run: $8 to $12 a shirt on 24 to 50 pieces." },
  { id: "web", name: "Website, EPK, smart link", from: "from $150", line: "Smart link and pre-save from $150, EPK from $300, site from $800." },
  { id: "ads", name: "Ad management", from: "from $300 a campaign", line: "Spend at cost, fee on top, said out loud." },
  { id: "pitching", name: "Playlist pitching", from: "from $150 plus credits", line: "SubmitHub, Groover, Playlist Push, at cost." },
  { id: "mix", name: "Mix and master", from: "from $250 a song", line: "Before the shoot if the record is not done." },
];
