import { Link } from "react-router-dom";
import SEO from "@/components/SEO";

// What an artist can do to make the post land, plus how to get to the room and
// what's around it. Plain, short, the way the rest of the flow reads.

function Block({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[#F2EFE9]/20 py-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#FFD230]">{n}</p>
      <h2 className="mt-1 font-display text-3xl uppercase leading-[0.9] tracking-[-0.03em] md:text-4xl">{title}</h2>
      <div className="mt-4 space-y-2 font-mono text-[11px] uppercase leading-5 tracking-[0.14em] text-[#F2EFE9]">{children}</div>
    </section>
  );
}

const L = ({ children }: { children: React.ReactNode }) => <p><span className="text-[#FFD230]">›</span> {children}</p>;

export default function StartPrep() {
  return (
    <main className="min-h-screen bg-[#0B0B0B] text-[#F2EFE9]">
      <SEO title="Prep — PMG" description="The first five minutes after the collab posts, how to get to the room in DUMBO, and what's around it." path="/start/prep" />
      <div className="mx-auto max-w-4xl px-6 pb-20 pt-28 md:px-10 md:pt-32">
        <header className="pb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#FFD230]">Propmyganda · Prep</p>
          <h1 className="font-display text-5xl uppercase leading-[0.85] tracking-[-0.03em] md:text-8xl">Make it land.</h1>
          <p className="mt-3 max-w-md font-mono text-[11px] uppercase leading-5 tracking-[0.14em] text-[#9A9A9E]">
            The push works if you're in it. Here's the whole of what we ask, and what's around the room.
          </p>
        </header>

        <Block n="01" title="Before the post">
          <L>Accounts public on TikTok, Instagram and YouTube. Collaboration requests on and set to accept.</L>
          <L>Tell your closest 20 people the date and time. Not a story, a message. "3pm Thursday, I need you on it in the first five minutes."</L>
          <L>Have one comment ready that adds something: the story behind the record, a lyric, a question. Not "go stream".</L>
          <L>Be on your phone, charged, logged in, from ten minutes before.</L>
        </Block>

        <Block n="02" title="The first five minutes">
          <L>Accept the collab invite the second it lands. If it sits, the post dies.</L>
          <L>Reply to every comment for the first hour. Replies count more than likes.</L>
          <L>Share it to your story with a line, not just the post. Pin it to your profile.</L>
          <L>Send the link to the 20 people. Ask for a comment, a save and a share, in that order.</L>
          <L>Don't post anything else for 24 hours. One thing at a time.</L>
        </Block>

        <Block n="03" title="The shoot">
          <L>30 minutes in the room. Arrive ten minutes early; the slot after yours is real.</L>
          <L>Know your hook cold. Two outfits if you can, no fine stripes or small logos.</L>
          <L>Bring the master on a drive even if you uploaded it. Bring water.</L>
          <L>Need to move it? Email the thread at least 7 days out and pick again from what's open.</L>
        </Block>

        <Block n="04" title="Getting here · 81 Prospect Street, DUMBO">
          <L>Subway: F to York Street, four minutes on foot. A or C to High Street, seven minutes.</L>
          <L>Driving at 2 to 8pm is peak. Street parking on Front, Water and Washington is metered and rarely open. Allow 20 extra minutes.</L>
          <L>Garages sit along Jay Street and Front Street; booking ahead on SpotHero is cheaper than driving in.</L>
          <L>Ferry: the NYC Ferry stops at DUMBO, Brooklyn Bridge Park Pier 1, five minutes on foot.</L>
        </Block>

        <Block n="05" title="Make a day of it">
          <L>Pebble Beach, Brooklyn Bridge Park, under the Manhattan Bridge. The shot everyone comes for, and the one you'll want after the shoot.</L>
          <L>Time Out Market New York, 55 Water Street. Food from across the city, rooftop over the bridges.</L>
          <L>Washington Street at Water Street. The Manhattan Bridge framed by the buildings.</L>
          <L>Jane's Carousel and Main Street Park, on the water.</L>
          <L>Empire Stores, next door to Time Out. Shops, a rooftop, a place to sit.</L>
          <L>St. Ann's Warehouse if there's a show on. Walk the Brooklyn Bridge back to Manhattan at sunset.</L>
        </Block>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/start" className="bg-[#FFD230] px-6 py-4 font-mono text-[11px] uppercase tracking-[0.2em] text-[#0B0B0B]">Back to your order →</Link>
          <Link to="/artists" className="border border-[#F2EFE9]/40 px-6 py-4 font-mono text-[11px] uppercase tracking-[0.2em]">The roster</Link>
        </div>
      </div>
    </main>
  );
}
