import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { AreaBlocks, TipsBlocks } from "@/components/start/prep";
import AddOns from "@/components/start/AddOns";

// What an artist can do to make the post land, plus how to get to the room and
// what's around it. Plain, short, the way the rest of the flow reads.
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

        <AreaBlocks from={1} />
        <TipsBlocks from={3} />
        <AddOns />

        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/start" className="bg-[#FFD230] px-6 py-4 font-mono text-[11px] uppercase tracking-[0.2em] text-[#0B0B0B]">Back to your order →</Link>
          <Link to="/artists" className="border border-[#F2EFE9]/40 px-6 py-4 font-mono text-[11px] uppercase tracking-[0.2em]">The roster</Link>
        </div>
      </div>
    </main>
  );
}
