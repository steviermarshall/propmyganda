import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSpotifyPlayer } from "./SpotifyPlayer";
import { PlayIcon } from "./ui";
import { formatDuration, type ArtistCatalog, type Track } from "@/lib/spotifyCatalog";

export interface RosterEntry {
  id: string;
  cat: string;
  name: string;
  genre: string;
  image: string;
  albumCover?: string;
  spotifyArtistId?: string;
  spotifyTrackId?: string;
}

interface Card {
  key: string;
  artist: RosterEntry;
  track: Track;
  artistUrl: string;
}

const OWNER = "roster";

/** Every roster artist's songs, newest first, as one deck of cards. */
function buildDeck(roster: RosterEntry[], catalog?: Record<string, ArtistCatalog>): Card[] {
  const deck: Card[] = [];
  for (const artist of roster) {
    const c = catalog?.[artist.id];
    const artistUrl =
      c?.url ?? (artist.spotifyArtistId ? `https://open.spotify.com/artist/${artist.spotifyArtistId}` : `https://open.spotify.com/track/${artist.spotifyTrackId ?? ""}`);
    const tracks: Track[] =
      c?.tracks?.length
        ? c.tracks
        : artist.spotifyTrackId
          ? [{
              id: artist.spotifyTrackId, uri: `spotify:track:${artist.spotifyTrackId}`, name: "Single", artists: artist.name,
              album: "", image: artist.albumCover ?? artist.image, durationMs: 0, releaseDate: null, previewUrl: null,
              url: `https://open.spotify.com/track/${artist.spotifyTrackId}`,
            }]
          : [];
    for (const track of tracks) {
      deck.push({ key: `${artist.id}:${track.id}`, artist, track: { ...track, image: track.image ?? artist.albumCover ?? artist.image }, artistUrl });
    }
  }
  // Interleave artists so the deck opens with one card per artist, then their next songs, and so on.
  const byArtist = new Map<string, Card[]>();
  for (const card of deck) byArtist.set(card.artist.id, [...(byArtist.get(card.artist.id) ?? []), card]);
  const out: Card[] = [];
  let more = true;
  while (more) {
    more = false;
    for (const cards of byArtist.values()) {
      const next = cards.shift();
      if (next) { out.push(next); more = true; }
    }
  }
  return out;
}

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={d} /></svg>;
}
const PREV = "M6 5h2v14H6zM20 5v14L9 12z";
const NEXT = "M16 5h2v14h-2zM4 5l11 7-11 7z";

export function RosterCoverFlow({ roster, catalog, loading }: { roster: RosterEntry[]; catalog?: Record<string, ArtistCatalog>; loading: boolean }) {
  const player = useSpotifyPlayer();
  const deck = useMemo(() => buildDeck(roster, catalog), [roster, catalog]);
  const [active, setActive] = useState(0);
  const [spread, setSpread] = useState(150);
  const touch = useRef<{ x: number; t: number } | null>(null);

  useEffect(() => {
    const update = () => setSpread(window.innerWidth < 640 ? 96 : window.innerWidth < 1024 ? 130 : 160);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const card = deck[active];
  const mine = player.owner === OWNER ? player.current : null;
  const playing = !!mine && !player.isPaused;
  const isCurrent = !!card && mine?.id === card.track.id;
  const progress = isCurrent && player.duration ? player.position / player.duration : 0;

  // Follow the player: if a different roster song is playing (e.g. after "next"), bring its card to the front.
  useEffect(() => {
    if (!mine) return;
    const i = deck.findIndex((c) => c.track.id === mine.id);
    if (i >= 0) setActive(i);
  }, [mine, deck]);

  // Auto-advance when a song finishes.
  useEffect(() => {
    if (!mine || player.duration <= 0) return;
    if (player.isPaused && player.position >= player.duration - 1.5 && active < deck.length - 1) {
      player.play(deck[active + 1].track, OWNER);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.isPaused, player.position, player.duration]);

  const go = useCallback(
    (d: number) => {
      if (deck.length === 0) return;
      const next = (active + d + deck.length) % deck.length;
      setActive(next);
      if (mine) player.play(deck[next].track, OWNER);
    },
    [active, deck, mine, player],
  );

  const toggle = () => card && player.play(card.track, OWNER);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  return (
    <section
      aria-label="PMG Records roster"
      className="relative px-4 pb-10 pt-12 text-white md:px-10 md:pb-14 md:pt-16"
    >
      <div className="mb-3 flex items-baseline justify-between px-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">The Roster</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">{catalog && Object.keys(catalog).length ? "Live from Spotify" : "Spotify"}</p>
      </div>

      {/* Wordmark */}
      <div className="flex items-center justify-center gap-2 py-6 text-white/80 md:py-8">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.6 14.4a.6.6 0 0 1-.9.2c-2.4-1.5-5.4-1.8-9-1a.6.6 0 1 1-.3-1.2c3.9-.9 7.3-.5 10 1.1.3.2.4.6.2.9zm1.2-2.7a.8.8 0 0 1-1.1.3c-2.8-1.7-7-2.2-10.3-1.2a.8.8 0 1 1-.4-1.5c3.7-1.1 8.4-.6 11.6 1.4.3.2.4.7.2 1zm.1-2.9C14.6 8.8 9.1 8.6 5.9 9.6a.9.9 0 1 1-.5-1.8c3.7-1.1 9.8-.9 13.6 1.4a.9.9 0 0 1-1 1.6z" />
        </svg>
        <span className="text-xl font-semibold tracking-tight">PMG Records</span>
      </div>

      {/* Cover flow */}
      <div
        className="relative mx-auto h-[300px] max-w-5xl select-none sm:h-[340px]"
        style={{ perspective: 1200 }}
        onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, t: Date.now() }; }}
        onTouchEnd={(e) => {
          if (!touch.current) return;
          const dx = e.changedTouches[0].clientX - touch.current.x;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touch.current = null;
        }}
      >
        {loading && deck.length === 0 ? (
          <div className="absolute left-1/2 top-0 h-[260px] w-[210px] -translate-x-1/2 animate-pulse rounded-[22px] bg-white/15" />
        ) : deck.length === 0 ? (
          <p className="pt-24 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-white/60">Music coming soon.</p>
        ) : (
          deck.map((c, i) => {
            // Shortest wrapped distance, so the active card always has neighbours on both sides.
            const n = deck.length;
            let d = i - active;
            if (d > n / 2) d -= n;
            if (d < -n / 2) d += n;
            if (Math.abs(d) > 3) return null;
            const center = d === 0;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => (center ? toggle() : setActive(i))}
                aria-label={center ? `${playing && isCurrent ? "Pause" : "Play"} ${c.track.name} by ${c.artist.name}` : `Show ${c.track.name} by ${c.artist.name}`}
                aria-current={center ? "true" : undefined}
                className="absolute left-1/2 top-0 w-[210px] origin-center rounded-[22px] border border-white/40 bg-white/15 p-2 text-left shadow-[0_24px_60px_rgba(10,10,40,0.45)] backdrop-blur-xl transition-all duration-500 ease-out hover:bg-white/25"
                style={{
                  transform: `translateX(calc(-50% + ${d * spread}px)) translateZ(${-Math.abs(d) * 140}px) rotateY(${-d * 10}deg) scale(${center ? 1 : 0.92})`,
                  zIndex: 10 - Math.abs(d),
                  opacity: 1 - Math.abs(d) * 0.12,
                  animation: center ? "pmg-float 4s ease-in-out infinite alternate" : undefined,
                  backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.35), rgba(255,255,255,0.05) 45%, rgba(255,255,255,0.15))",
                }}
              >
                <div className="relative aspect-square overflow-hidden rounded-[16px] bg-black/30">
                  <img src={c.track.image ?? c.artist.image} alt="" className="h-full w-full object-cover" loading="lazy" draggable={false} />
                  {center && (
                    <span className={`absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity ${playing && isCurrent ? "opacity-0 hover:opacity-100" : "opacity-100"}`}>
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black">
                        <PlayIcon paused={!(playing && isCurrent)} />
                      </span>
                    </span>
                  )}
                </div>
                <div className="px-1 pb-1 pt-3 text-center">
                  <p className="truncate text-[15px] font-semibold leading-tight">{c.artist.name}</p>
                  <p className="truncate text-[12px] text-white/70">{c.track.name}</p>
                </div>
              </button>
            );
          })
        )}
      </div>

      <p className="mt-6 text-center text-[15px] text-white/90">Collaborative records, live cuts and renditions. Made with the artist, in the room.</p>

      {/* Player bar */}
      <div className="mx-auto mt-6 flex max-w-3xl items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-2 shadow-[0_16px_40px_rgba(5,5,30,0.35)] backdrop-blur-2xl sm:gap-4 sm:px-5 sm:py-3">
        <div className="flex items-center gap-1 sm:gap-3">
          <button type="button" onClick={() => go(-1)} className="rounded-full p-2 hover:bg-white/15" aria-label="Previous"><Icon d={PREV} /></button>
          <button type="button" onClick={toggle} disabled={!card} className="rounded-full p-2 hover:bg-white/15 disabled:opacity-40" aria-label={playing && isCurrent ? "Pause" : "Play"}>
            <span className="block scale-125"><PlayIcon paused={!(playing && isCurrent)} /></span>
          </button>
          <button type="button" onClick={() => go(1)} className="rounded-full p-2 hover:bg-white/15" aria-label="Next"><Icon d={NEXT} /></button>
        </div>

        {card && (
          <div className="relative flex min-w-0 flex-1 items-center gap-3 overflow-hidden rounded-2xl bg-black/25 px-2 py-1.5">
            <img src={card.track.image ?? card.artist.image} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold leading-tight">{card.artist.name}</p>
              <p className="truncate text-[10px] text-white/65">{card.track.name}{isCurrent && player.duration ? ` · ${formatDuration(player.position * 1000)} / ${formatDuration(player.duration * 1000)}` : card.track.durationMs ? ` · ${formatDuration(card.track.durationMs)}` : ""}</p>
            </div>
            <span className="hidden items-end gap-[2px] sm:flex" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="w-[2px] rounded-sm bg-white/80" style={{ height: playing && isCurrent ? undefined : 4, animation: playing && isCurrent ? `pmg-eq 0.8s ease-in-out ${i * 0.12}s infinite alternate` : "none" }} />
              ))}
            </span>
            <span className="absolute inset-x-2 bottom-0 h-[2px] rounded bg-white/20">
              <span className="block h-full rounded bg-white transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
            </span>
          </div>
        )}

        <div className="hidden items-center gap-1 sm:flex">
          <a href={card?.track.url ?? "#"} target="_blank" rel="noreferrer" className="rounded-full p-2 hover:bg-white/15" aria-label="Open this song on Spotify">
            <Icon d="M14 3h7v7h-2V6.4l-9.3 9.3-1.4-1.4L17.6 5H14zM5 5h6v2H7v10h10v-4h2v6H5z" />
          </a>
          <a href={card?.artistUrl ?? "#"} target="_blank" rel="noreferrer" className="rounded-full p-2 hover:bg-white/15" aria-label="Follow this artist on Spotify">
            <Icon d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 8a8 8 0 0 1 12.5-6.6l-1.2 1.6A6 6 0 0 0 6 20zm14-5v-2h2v2h2v2h-2v2h-2v-2h-2v-2z" />
          </a>
        </div>
      </div>
      <style>{`@keyframes pmg-eq { from { height: 3px } to { height: 14px } } @keyframes pmg-float { from { margin-top: 0 } to { margin-top: -10px } }`}</style>
    </section>
  );
}
