import { useRef } from "react";
import { artists } from "@/lib/data";
import SEO from "@/components/SEO";
import ReelCarousel from "@/components/ReelCarousel";
import { SpotifyPlayerProvider } from "@/components/records/SpotifyPlayer";
import { ArtistTile, PlaylistTile, type RosterEntry } from "@/components/records/PlaylistTile";
import { HudLink, LogLine, PHOS, Pill, Tile } from "@/components/records/ui";
import { AmbientField } from "@/components/records/AmbientField";
import { useSpotifyPlayer } from "@/components/records/SpotifyPlayer";
import { PLAYLISTS, useSpotifyCatalog } from "@/lib/spotifyCatalog";

type Artist = (typeof artists)[number] & {
  bio?: string;
  spotifyArtistId?: string;
  spotifyTrackId?: string;
  albumCover?: string;
};

const BOOKING_URL = "https://docs.google.com/forms/d/1dXl9gqipbr_dqlHaEP4XLhOs1Q3ruVAPSST_khyfcPg/viewform";

// PMG Records roster — artists we release with (not distribution clients).
const RECORDS = [
  { id: "jahballa", cat: "PMG-R-001", tone: "navy" },
  { id: "hammad", cat: "PMG-R-002", tone: "sage" },
  { id: "stockz", cat: "PMG-R-003", tone: "ember" },
  { id: "zoe", cat: "PMG-R-004", tone: "plum" },
] as const;

/** The CRT field brightens while audio runs. */
function Ambient() {
  const player = useSpotifyPlayer();
  return <AmbientField active={!!player.current && !player.isPaused} />;
}

export default function Artists() {
  const roster: RosterEntry[] = RECORDS.flatMap((r) => {
    const a = artists.find((x) => x.id === r.id) as Artist | undefined;
    if (!a) return [];
    return [{
      id: a.id, cat: r.cat, tone: r.tone, name: a.name, genre: a.genre, image: a.image,
      albumCover: a.albumCover, spotifyArtistId: a.spotifyArtistId, spotifyTrackId: a.spotifyTrackId,
    }];
  });

  const { data: catalog, isLoading } = useSpotifyCatalog(
    roster.map((a) => ({ id: a.id, artistId: a.spotifyArtistId, trackId: a.spotifyTrackId })),
  );
  const loading = isLoading;
  const rowRef = useRef<HTMLDivElement>(null);
  const scrollRow = (dir: number) => {
    const el = rowRef.current;
    if (!el) return;
    const tile = el.firstElementChild as HTMLElement | null;
    el.scrollBy({ left: dir * ((tile?.offsetWidth ?? 320) + 16), behavior: "smooth" });
  };

  return (
    <SpotifyPlayerProvider>
      <div className="min-h-screen bg-black text-white">
        <SEO
          title="Records — PMG Roster | PROPMYGANDA"
          description="PMG Records. Collaborative sessions, live cuts and renditions with our artists."
          path="/artists"
        />

        {/* Hero — short, straight to the point. The "Got a record?" pill is absolutely placed so it never moves the rest. */}
        <section className="relative border-b border-white/10 px-6 pb-6 pt-24 md:px-10 md:pt-32">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
            PMG · Records
          </p>
          <h1 className="font-display text-[16vw] uppercase leading-[0.85] tracking-[-0.03em] md:text-[9vw]">
            Records
          </h1>
          <p className="mt-3 max-w-md pr-36 text-sm leading-snug text-white/60 sm:pr-0">
            Collaborative records, live cuts and renditions. Made with the artist, in the room.
          </p>
          <div className="absolute bottom-6 right-6 sm:bottom-auto sm:top-24 md:right-10 md:top-32">
            <Pill href={BOOKING_URL} tone="light" className="bg-white/10 text-white backdrop-blur-md hover:bg-white/20 [&>span]:bg-electric [&>span]:text-black" ariaLabel="Got a record? Book a free session">
              <span className="hidden sm:inline">Got a record?</span>
              <span className="sm:hidden">Got one?</span>
            </Pill>
          </div>
        </section>

        {/* Video carousel — first screen */}
        <ReelCarousel />

        {/* Roster + playlists sit on one liquid-glass ambient field */}
        <div className="pmg-ambient relative isolate overflow-hidden">
          <Ambient />
          <section className="px-4 pb-6 pt-10 md:px-10 md:pt-14">
            <div className="mb-4 flex items-center justify-between gap-4 px-2 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: PHOS.mid }}>
              <span>// The Roster</span>
              <span className="hidden flex-1 overflow-hidden whitespace-nowrap opacity-40 sm:block" aria-hidden="true">{"................................................................................................"}</span>
              <span className="flex items-center gap-3">
                <span>Signal: {catalog?.configured ? "Live" : "Weak"}</span>
                <button type="button" onClick={() => scrollRow(-1)} className="border px-2 py-0.5 hover:bg-[rgba(120,255,190,0.15)]" style={{ borderColor: PHOS.dim, color: PHOS.bright }} aria-label="Scroll roster left">◀</button>
                <button type="button" onClick={() => scrollRow(1)} className="border px-2 py-0.5 hover:bg-[rgba(120,255,190,0.15)]" style={{ borderColor: PHOS.dim, color: PHOS.bright }} aria-label="Scroll roster right">▶</button>
                <span className="opacity-60">: Move</span>
              </span>
            </div>
            {/* One row, same tile size as the playlist grid; scrolls sideways for more */}
            <div ref={rowRef} className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:gap-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {roster.map((a) => (
                <div key={a.id} className="w-[88%] shrink-0 snap-start sm:w-[calc((100%-0.75rem)/2)] md:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)]">
                  <ArtistTile artist={a} catalog={catalog?.artists?.[a.id]} loading={loading} />
                </div>
              ))}
            </div>
          </section>

        {/* Playlists */}
        <section className="px-4 pb-14 md:px-10 md:pb-20">
          <div className="mb-4 flex items-center justify-between gap-4 px-2 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: PHOS.mid }}>
            <span>// PMG Playlists</span>
            <span className="hidden flex-1 overflow-hidden whitespace-nowrap opacity-40 sm:block" aria-hidden="true">{"................................................................................................"}</span>
            <span>Battlefield status: {catalog?.configured ? "Live" : "Silent"}</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
            {PLAYLISTS.map((p) => (
              <PlaylistTile key={p.id} id={p.id} name={p.name} tone={p.tone} catalog={catalog?.playlists?.[p.id]} loading={loading} />
            ))}
            {/* Got a record? — same panel language, closes the grid */}
            <Tile className="flex min-h-[380px] flex-col p-4 md:p-5">
              <header className="mb-3 flex items-center justify-between border-b pb-2 font-mono text-[10px] uppercase" style={{ borderColor: PHOS.faint }}>
                <span style={{ color: PHOS.mid }}>// PMG-RECORDS</span>
                <span className="opacity-70">OPEN CALL</span>
              </header>
              <h2 className="font-mono text-[20px] font-bold uppercase leading-none tracking-[0.08em]">Got a record?</h2>
              <div className="my-4 flex-1 space-y-0.5 font-mono uppercase">
                <LogLine label="SESSIONS" value="OPEN" />
                <LogLine label="VIDEO" value="OPEN" />
                <LogLine label="RELEASE" value="OPEN" />
                <LogLine label="COST" value="$0.00 (FREE)" />
                <LogLine label="ZONE" value="BROOKLYN" dim />
                <p className="pt-4 text-[10px] leading-5">
                  <span style={{ color: PHOS.mid }}>&gt;</span> BRING THE RECORD. WE BUILD THE REST.
                </p>
              </div>
              <footer className="mt-3 flex items-center justify-between gap-2 border-t pt-3 font-mono text-[10px] uppercase" style={{ borderColor: PHOS.faint }}>
                <span className="opacity-60">OK : BOOK</span>
                <HudLink href={BOOKING_URL}>Book a session</HudLink>
              </footer>
            </Tile>
          </div>
        </section>
        </div>
      </div>
    </SpotifyPlayerProvider>
  );
}
