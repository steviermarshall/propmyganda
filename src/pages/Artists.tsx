import { artists } from "@/lib/data";
import SEO from "@/components/SEO";
import ReelCarousel from "@/components/ReelCarousel";

type Artist = (typeof artists)[number] & {
  bio?: string;
  spotifyArtistId?: string;
  spotifyTrackId?: string;
  albumCover?: string;
};

// PMG Records roster — artists we release with (not distribution clients).
const RECORDS = [
  { id: "jahballa", cat: "PMG-R-001" },
  { id: "hammad", cat: "PMG-R-002" },
  { id: "stockz", cat: "PMG-R-003" },
  { id: "zoe", cat: "PMG-R-004" },
];

export default function Artists() {
  const roster = RECORDS.map((r) => ({
    ...r,
    artist: artists.find((a) => a.id === r.id) as Artist | undefined,
  })).filter((r) => r.artist);

  return (
    <div className="min-h-screen bg-black text-white">
      <SEO
        title="Records — PMG Roster | PROPMYGANDA"
        description="PMG Records. Collaborative sessions, live cuts and renditions with our artists."
        path="/artists"
      />

      {/* Hero — short, straight to the point */}
      <section className="border-b border-white/10 px-6 pb-6 pt-24 md:px-10 md:pt-32">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
          PMG · Records
        </p>
        <h1 className="font-display text-[16vw] uppercase leading-[0.85] tracking-[-0.03em] md:text-[9vw]">
          Records
        </h1>
        <p className="mt-3 max-w-md text-sm leading-snug text-white/60">
          Collaborative records, live cuts and renditions. Made with the artist, in the room.
        </p>
      </section>

      {/* Video carousel — first screen */}
      <ReelCarousel />

      {/* Roster cards */}
      <section className="px-6 py-10 md:px-10">
        <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
          The Roster
        </p>

        <div className="grid grid-cols-1 gap-px bg-white/10 md:grid-cols-2">
          {roster.map(({ cat, artist }) => {
            const a = artist!;
            const embed = a.spotifyTrackId
              ? `https://open.spotify.com/embed/track/${a.spotifyTrackId}?utm_source=generator&theme=0`
              : a.spotifyArtistId
                ? `https://open.spotify.com/embed/artist/${a.spotifyArtistId}?utm_source=generator&theme=0`
                : null;

            return (
              <article key={a.id} className="bg-black p-5">
                <div className="flex items-start gap-4">
                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden bg-electric">
                    <img
                      src={a.albumCover ?? a.image}
                      alt={a.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                      style={{
                        filter: "grayscale(1) contrast(2) brightness(1.1)",
                        mixBlendMode: "multiply",
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-electric">
                      {cat}
                    </p>
                    <h2 className="font-display text-2xl uppercase leading-[0.9] tracking-[-0.03em]">
                      {a.name}
                    </h2>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
                      {a.genre}
                    </p>
                  </div>
                </div>

                {embed && (
                  <div className="mt-4 border border-white/15 bg-black p-3">
                    <iframe
                      title={`${a.name} on Spotify`}
                      src={embed}
                      width="100%"
                      height="152"
                      frameBorder="0"
                      loading="lazy"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    />
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
                      {a.name} · {cat}
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* One CTA */}
      <section className="border-t border-white/10 px-6 py-10 md:px-10">
        <h2 className="font-display text-3xl uppercase leading-[0.85] tracking-[-0.03em] md:text-5xl">
          Got a record?
        </h2>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white/50">
          Sessions · Video · Release · $0.00 (FREE)
        </p>
        <a
          href="https://docs.google.com/forms/d/1dXl9gqipbr_dqlHaEP4XLhOs1Q3ruVAPSST_khyfcPg/viewform"
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-block bg-electric px-6 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-electric-foreground"
        >
          Book a session
        </a>
      </section>
    </div>
  );
}
