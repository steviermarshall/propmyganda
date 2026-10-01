import { useState } from "react";
import { useSpotifyPlayer } from "./SpotifyPlayer";
import { DotDigits, Equalizer, Glow, Pill, PlayIcon, Tile } from "./ui";
import { formatCount, formatDuration, type ArtistCatalog, type Tone } from "@/lib/spotifyCatalog";

export interface RosterArtist {
  id: string;
  cat: string;
  name: string;
  genre: string;
  image: string;
  albumCover?: string;
  spotifyArtistId?: string;
  spotifyTrackId?: string;
  tone: Tone | "ink";
}

const SHOW = 5;

/** The dial ring from the sensor screen, drawn around the artwork. */
function Dial({ progress, active }: { progress: number; active: boolean }) {
  const ticks = 60;
  return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden="true">
      {Array.from({ length: ticks }, (_, i) => {
        const a = (i / ticks) * Math.PI * 2 - Math.PI / 2;
        const major = i % 5 === 0;
        const r1 = major ? 84 : 88;
        const lit = active && i / ticks <= progress;
        return (
          <line
            key={i}
            x1={100 + Math.cos(a) * r1} y1={100 + Math.sin(a) * r1}
            x2={100 + Math.cos(a) * 96} y2={100 + Math.sin(a) * 96}
            stroke={lit ? "#FFD230" : "currentColor"}
            strokeOpacity={lit ? 1 : major ? 0.6 : 0.3}
            strokeWidth={major ? 1.6 : 1}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

export function ArtistTile({ artist, catalog, loading }: { artist: RosterArtist; catalog?: ArtistCatalog; loading: boolean }) {
  const player = useSpotifyPlayer();
  const [expanded, setExpanded] = useState(false);
  const tracks = catalog?.tracks ?? [];
  const mine = player.owner === artist.id ? player.current : null;
  const progress = mine && player.duration ? player.position / player.duration : 0;
  const art = mine?.image ?? catalog?.image ?? artist.albumCover ?? artist.image;
  const spotifyUrl =
    catalog?.url ??
    (artist.spotifyArtistId
      ? `https://open.spotify.com/artist/${artist.spotifyArtistId}`
      : artist.spotifyTrackId
        ? `https://open.spotify.com/track/${artist.spotifyTrackId}`
        : undefined);
  const number = artist.cat.replace(/\D/g, "").slice(-3);
  const visible = expanded ? tracks : tracks.slice(0, SHOW);

  return (
    <Tile tone={artist.tone} className="flex min-h-[520px] flex-col p-5 md:p-6">
      <Glow tone={artist.tone} className="left-1/2 top-[150px] h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 opacity-70" />

      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] opacity-60">{artist.cat} · {artist.genre}</p>
          <h2 className="mt-1 truncate font-display text-3xl uppercase leading-[0.9] tracking-[-0.03em] md:text-4xl">{artist.name}</h2>
        </div>
        <div className="shrink-0 text-right">
          <DotDigits value={number} size={4} className="ml-auto opacity-90" />
          {catalog?.followers != null && (
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] opacity-60">{formatCount(catalog.followers)} followers</p>
          )}
        </div>
      </header>

      {/* Artwork in the dial */}
      <div className="relative mx-auto my-5 h-[200px] w-[200px] md:h-[220px] md:w-[220px]">
        <Dial progress={progress} active={!!mine} />
        <button
          type="button"
          onClick={() => {
            const t = mine ?? tracks[0];
            if (t) player.play(t, artist.id);
          }}
          disabled={tracks.length === 0}
          className="group absolute inset-[22px] overflow-hidden rounded-full border-4 border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.45)] disabled:cursor-default"
          aria-label={mine && !player.isPaused ? `Pause ${artist.name}` : `Play ${artist.name}`}
        >
          <img src={art} alt="" className="h-full w-full object-cover" loading="lazy" />
          {tracks.length > 0 && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black">
                <PlayIcon paused={!mine || player.isPaused} />
              </span>
            </span>
          )}
        </button>
      </div>

      {/* Tracks straight from Spotify */}
      <div className="flex-1">
        {loading ? (
          <ul className="animate-pulse space-y-2">
            {[0, 1, 2].map((i) => <li key={i} className="h-10 rounded-2xl bg-black/15" />)}
          </ul>
        ) : tracks.length > 0 ? (
          <ul className="space-y-1">
            {visible.map((t, i) => {
              const isCurrent = mine?.id === t.id;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => player.play(t, artist.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors ${
                      isCurrent ? "bg-black/30 text-white" : "hover:bg-black/15"
                    }`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/25">
                      {isCurrent ? <Equalizer paused={player.isPaused} /> : <PlayIcon paused />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium leading-tight">{t.name}</span>
                      <span className="block truncate text-[10px] uppercase tracking-[0.14em] opacity-55">{t.album || t.artists}</span>
                    </span>
                    <span className="shrink-0 text-[11px] tabular-nums opacity-60">{i === 0 && t.releaseDate ? "New" : formatDuration(t.durationMs)}</span>
                  </button>
                </li>
              );
            })}
            {tracks.length > SHOW && (
              <li>
                <button type="button" onClick={() => setExpanded((v) => !v)} className="w-full py-2 text-center text-[10px] uppercase tracking-[0.18em] opacity-60 hover:opacity-100">
                  {expanded ? "Show less" : `All ${tracks.length} tracks`}
                </button>
              </li>
            )}
          </ul>
        ) : artist.spotifyTrackId ? (
          <div className="overflow-hidden rounded-2xl">
            <iframe
              title={`${artist.name} on Spotify`}
              src={`https://open.spotify.com/embed/track/${artist.spotifyTrackId}?utm_source=generator&theme=0`}
              width="100%" height="152" frameBorder="0" loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            />
          </div>
        ) : (
          <p className="text-[11px] uppercase tracking-[0.18em] opacity-60">Music coming soon.</p>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.18em] opacity-55">{mine ? `Playing · ${mine.name}` : "PMG Records"}</p>
        {spotifyUrl && <Pill href={spotifyUrl} tone={artist.tone === "ink" || artist.tone === "navy" || artist.tone === "plum" || artist.tone === "ember" ? "light" : "dark"}>Follow</Pill>}
      </div>
    </Tile>
  );
}
