import type { ReactNode } from "react";

// The prep content, in one place: shown while paying (the area), after paying
// (the area, then the tips) and on /start/prep (all of it).

export function Block({ n, title, children, compact }: { n: string; title: string; children: ReactNode; compact?: boolean }) {
  return (
    <section className={compact ? "border-t border-[#F2EFE9]/20 py-5" : "border-t border-[#F2EFE9]/20 py-8"}>
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#FFD230]">{n}</p>
      <h2 className={`mt-1 font-display uppercase leading-[0.9] tracking-[-0.03em] ${compact ? "text-2xl" : "text-3xl md:text-4xl"}`}>{title}</h2>
      <div className="mt-4 space-y-2 font-mono text-[11px] uppercase leading-5 tracking-[0.14em] text-[#F2EFE9]">{children}</div>
    </section>
  );
}

export const L = ({ children }: { children: ReactNode }) => <p><span className="text-[#FFD230]">›</span> {children}</p>;

/** Getting to the room and what's around it. */
export function AreaBlocks({ compact, from = 1 }: { compact?: boolean; from?: number }) {
  const n = (i: number) => String(from + i).padStart(2, "0");
  return (
    <>
      <Block n={n(0)} title="Getting here · 81 Prospect Street, DUMBO" compact={compact}>
        <L>Subway: F to York Street, four minutes on foot. A or C to High Street, seven minutes.</L>
        <L>Driving at 1 to 8pm is peak. Street parking on Front, Water and Washington is metered and rarely open. Allow 20 extra minutes.</L>
        <L>Garages sit along Jay Street and Front Street; booking ahead on SpotHero is cheaper than driving in.</L>
        <L>Ferry: the NYC Ferry stops at DUMBO, Brooklyn Bridge Park Pier 1, five minutes on foot.</L>
      </Block>
      <Block n={n(1)} title="Make a day of it" compact={compact}>
        <L>Pebble Beach, Brooklyn Bridge Park, under the Manhattan Bridge. The shot everyone comes for, and the one you'll want after the shoot.</L>
        <L>Time Out Market New York, 55 Water Street. Food from across the city, rooftop over the bridges.</L>
        <L>Washington Street at Water Street. The Manhattan Bridge framed by the buildings.</L>
        <L>Jane's Carousel and Main Street Park, on the water.</L>
        <L>Empire Stores, next door to Time Out. Shops, a rooftop, a place to sit.</L>
        <L>St. Ann's Warehouse if there's a show on. Walk the Brooklyn Bridge back to Manhattan at sunset.</L>
      </Block>
    </>
  );
}

/** What the artist does so the post lands. */
export function TipsBlocks({ compact, from = 1 }: { compact?: boolean; from?: number }) {
  const n = (i: number) => String(from + i).padStart(2, "0");
  return (
    <>
      <Block n={n(0)} title="Before the post" compact={compact}>
        <L>Accounts public on TikTok, Instagram and YouTube. Collaboration requests on and set to accept.</L>
        <L>Tell your closest 20 people the date and time. Not a story, a message. "3pm Thursday, I need you on it in the first five minutes."</L>
        <L>Have one comment ready that adds something: the story behind the record, a lyric, a question. Not "go stream".</L>
        <L>Be on your phone, charged, logged in, from ten minutes before.</L>
      </Block>
      <Block n={n(1)} title="The first five minutes" compact={compact}>
        <L>Accept the collab invite the second it lands. If it sits, the post dies.</L>
        <L>Reply to every comment for the first hour. Replies count more than likes.</L>
        <L>Share it to your story with a line, not just the post. Pin it to your profile.</L>
        <L>Send the link to the 20 people. Ask for a comment, a save and a share, in that order.</L>
        <L>Don't post anything else for 24 hours. One thing at a time.</L>
      </Block>
      <Block n={n(2)} title="The shoot" compact={compact}>
        <L>30 minutes in the room. Arrive ten minutes early; the slot after yours is real.</L>
        <L>Know your hook cold. Two outfits if you can, no fine stripes or small logos.</L>
        <L>Bring the master on a drive even if you uploaded it. Bring water.</L>
        <L>Need to move it? Email the thread at least 7 days out and pick again from what's open.</L>
      </Block>
    </>
  );
}
