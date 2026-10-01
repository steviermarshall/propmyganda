import { artists } from "@/lib/data";
import SEO from "@/components/SEO";
import ReelCarousel from "@/components/ReelCarousel";
import { SpotifyPlayerProvider } from "@/components/records/SpotifyPlayer";
import { ArtistTile, type RosterArtist } from "@/components/records/ArtistTile";
import { PlaylistTile } from "@/components/records/PlaylistTile";
import { Glow, Pill, Tile } from "@/components/records/ui";
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
  { id: "jahballa", cat: "PMG-R-001", tone: "sage" },
  { id: "hammad", cat: "PMG-R-002", tone: "pink" },
  { id: "stockz", cat: "PMG-R-003", tone: "navy" },
  { id: "zoe", cat: "PMG-R-004", tone: "ember" },
] as const;

export default function Artists() {
  const roster: RosterArtist[] = RECORDS.flatMap((r) => {
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

        {/* Roster */}
        <section className="px-4 py-10 md:px-10">
          <div className="mb-4 flex items-baseline justify-between px-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">The Roster</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
              {catalog?.configured ? "Live from Spotify" : "Spotify"}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            {roster.map((a) => (
              <ArtistTile key={a.id} artist={a} catalog={catalog?.artists?.[a.id]} loading={loading} />
            ))}
          </div>
        </section>

        {/* Playlists */}
        <section className="px-4 pb-10 md:px-10">
          <div className="mb-4 flex items-baseline justify-between px-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">PMG Playlists</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">Follow on Spotify</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
            {PLAYLISTS.map((p) => (
              <PlaylistTile key={p.id} id={p.id} name={p.name} tone={p.tone} catalog={catalog?.playlists?.[p.id]} loading={loading} />
            ))}
            {/* Got a record? — same tile language, closes the grid */}
            <Tile tone="ink" className="flex min-h-[420px] flex-col justify-between p-5 md:p-6">
              <Glow tone="ink" className="left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 opacity-40" />
              <p className="text-[10px] uppercase tracking-[0.18em] opacity-60">PMG Records</p>
              <div>
                <h2 className="font-display text-4xl uppercase leading-[0.85] tracking-[-0.03em] md:text-5xl">Got a record?</h2>
                <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-white/55">
                  Sessions · Video · Release · $0.00 (Free)
                </p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] uppercase tracking-[0.18em] opacity-55">Brooklyn, in the room</p>
                <Pill href={BOOKING_URL} tone="light">Book a session</Pill>
              </div>
            </Tile>
          </div>
        </section>
      </div>
    </SpotifyPlayerProvider>
  );
}
