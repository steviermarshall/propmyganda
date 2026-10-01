import { useEffect, useMemo, useState } from "react";
import { useSpotifyPlayer } from "./SpotifyPlayer";
import { DotDigits, Glow, Pill, PlayIcon, Ruler, Tile, TONES } from "./ui";
import { SPOTIFY_PLAYLIST_URL, formatCount, formatDuration, type ArtistCatalog, type PlaylistCatalog, type Tone, type Track } from "@/lib/spotifyCatalog";

export interface MediaTileProps {
  /** Unique key for the player, e.g. "playlist:<id>" or "artist:<id>". */
  owner: string;
  label: string;
  title: string;
  tone: Tone;
  tracks: Track[];
  url: string;
  /** Small count shown by the controls, e.g. "340 saves" or "1.2K followers". */
  count?: string | null;
  loading: boolean;
  /** Embed shown when no track list is available yet. */
  fallbackEmbed?: string;
  followLabel?: string;
}

/** One glass tile: shows the track that is up (never a cover), with play / skip and a Follow button. */
export function MediaTile({ owner, label, title, tone, tracks: tracksIn, url, count, loading, fallbackEmbed, followLabel = "Follow" }: MediaTileProps) {
  const player = useSpotifyPlayer();
  const tracks = useMemo(() => tracksIn ?? [], [tracksIn]);
  const [index, setIndex] = useState(0);
  const mine = player.owner === owner ? player.current : null;
  const track = mine ?? tracks[index];
  const progress = mine && player.duration ? player.position / player.duration : 0;
  const light = tone === "pink" || tone === "sage";
  const name = title;

  // Keep the shown index in step with what the player moved to.
  useEffect(() => {
    if (!mine) return;
    const i = tracks.findIndex((t) => t.id === mine.id);
    if (i >= 0) setIndex(i);
  }, [mine, tracks]);

  // When a track ends, move on to the next one in this playlist.
  useEffect(() => {
    if (!mine || player.duration <= 0) return;
    if (player.isPaused && player.position >= player.duration - 1.5 && index < tracks.length - 1) {
      player.play(tracks[index + 1], owner);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.isPaused, player.position, player.duration]);

  const step = (d: number) => {
    if (tracks.length === 0) return;
    const next = (index + d + tracks.length) % tracks.length;
    setIndex(next);
    if (mine) player.play(tracks[next], owner);
  };

  return (
    <Tile tone={tone} className="flex min-h-[420px] flex-col p-5 md:p-6">
      <Glow tone={tone} active={!!mine && !player.isPaused} className="left-1/2 top-[190px] h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2" />

      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] opacity-60">{label}</p>
          <h3 className="mt-0.5 font-display text-2xl uppercase leading-[0.9] tracking-[-0.03em] md:text-3xl">{title}</h3>
        </div>
        <div className="text-right">
          <DotDigits value={String(tracks.length ? index + 1 : 0).padStart(2, "0")} size={4} className="ml-auto" />
          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] opacity-60">of {tracks.length || "—"}</p>
        </div>
      </header>

      {loading ? (
        <div className="my-6 flex flex-1 animate-pulse flex-col items-center justify-center">
          <div className="h-36 w-36 rounded-full bg-black/15" />
          <div className="mt-5 h-4 w-40 rounded bg-black/15" />
        </div>
      ) : track ? (
        <div className="my-5 flex flex-1 flex-col items-center text-center">
          <button
            type="button"
            onClick={() => player.play(track, owner)}
            className="group relative h-36 w-36 overflow-hidden rounded-full border-4 border-white/35 shadow-[0_20px_50px_rgba(0,0,0,0.4)] transition-transform duration-500 group-hover/tile:scale-[1.04] md:h-40 md:w-40"
            aria-label={mine && !player.isPaused ? `Pause ${track.name}` : `Play ${track.name}`}
          >
            {track.image ? <img src={track.image} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="h-full w-full bg-black/40" />}
            <span className={`absolute inset-0 flex items-center justify-center bg-black/25 transition-opacity ${mine && !player.isPaused ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black">
                <PlayIcon paused={!mine || player.isPaused} />
              </span>
            </span>
          </button>
          <p className="mt-5 line-clamp-1 text-[15px] font-semibold leading-tight">{track.name}</p>
          <p className="mt-1 line-clamp-1 text-[11px] uppercase tracking-[0.16em] opacity-60">{track.artists}</p>
          <Ruler value={mine ? progress : 0} accent={light ? TONES[tone].glow : "#FFD230"} className="mt-4 w-full max-w-[260px]" />
          <p className="mt-1 text-[10px] tabular-nums opacity-55">
            {mine ? `${formatDuration(player.position * 1000)} / ${formatDuration(player.duration * 1000)}` : formatDuration(track.durationMs)}
          </p>
        </div>
      ) : fallbackEmbed ? (
        <div className="my-4 flex-1 overflow-hidden rounded-2xl">
          <iframe
            title={`${name} on Spotify`}
            src={fallbackEmbed}
            width="100%" height="152" frameBorder="0" loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          />
        </div>
      ) : (
        <p className="my-6 flex-1 text-[11px] uppercase tracking-[0.18em] opacity-60">Music coming soon.</p>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => step(-1)} disabled={tracks.length === 0} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur hover:bg-white/35 disabled:opacity-40" aria-label="Previous track">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M2 1h1.6v10H2zM10 1 4 6l6 5z" /></svg>
          </button>
          <button type="button" onClick={() => track && player.play(track, owner)} disabled={!track} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur hover:bg-white/35 disabled:opacity-40" aria-label={mine && !player.isPaused ? "Pause" : "Play"}>
            <PlayIcon paused={!mine || player.isPaused} />
          </button>
          <button type="button" onClick={() => step(1)} disabled={tracks.length === 0} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur hover:bg-white/35 disabled:opacity-40" aria-label="Next track">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M8.4 1H10v10H8.4zM2 1l6 5-6 5z" /></svg>
          </button>
          {count && <span className="ml-1 text-[10px] uppercase tracking-[0.16em] opacity-55">{count}</span>}
        </div>
        <Pill href={url} tone={light ? "dark" : "light"} ariaLabel={`${followLabel} ${name} on Spotify`}>{followLabel}</Pill>
      </div>
    </Tile>
  );
}

/** A PMG playlist in the glass tile. */
export function PlaylistTile({ id, name, tone, catalog, loading }: { id: string; name: string; tone: Tone; catalog?: PlaylistCatalog; loading: boolean }) {
  return (
    <MediaTile
      owner={`playlist:${id}`}
      label="PMG Playlist"
      title={catalog?.name ?? name}
      tone={tone}
      tracks={catalog?.tracks ?? []}
      url={catalog?.url ?? SPOTIFY_PLAYLIST_URL(id)}
      count={catalog?.followers != null ? `${formatCount(catalog.followers)} saves` : null}
      loading={loading}
      fallbackEmbed={`https://open.spotify.com/embed/playlist/${id}?utm_source=generator&theme=0`}
    />
  );
}

export interface RosterEntry {
  id: string;
  cat: string;
  name: string;
  genre: string;
  image: string;
  albumCover?: string;
  spotifyArtistId?: string;
  spotifyTrackId?: string;
  tone: Tone;
}

/** A roster artist in the same tile, stepping through their songs straight from Spotify. */
export function ArtistTile({ artist, catalog, loading }: { artist: RosterEntry; catalog?: ArtistCatalog; loading: boolean }) {
  const tracks: Track[] =
    catalog?.tracks?.length
      ? catalog.tracks
      : artist.spotifyTrackId
        ? [{
            id: artist.spotifyTrackId, uri: `spotify:track:${artist.spotifyTrackId}`, name: "Single", artists: artist.name,
            album: "", image: artist.albumCover ?? artist.image, durationMs: 0, releaseDate: null, previewUrl: null,
            url: `https://open.spotify.com/track/${artist.spotifyTrackId}`,
          }]
        : [];
  const url =
    catalog?.url ??
    (artist.spotifyArtistId
      ? `https://open.spotify.com/artist/${artist.spotifyArtistId}`
      : `https://open.spotify.com/track/${artist.spotifyTrackId ?? ""}`);
  return (
    <MediaTile
      owner={`artist:${artist.id}`}
      label={`${artist.cat} · ${artist.genre}`}
      title={artist.name}
      tone={artist.tone}
      tracks={tracks.map((t) => ({ ...t, image: t.image ?? artist.albumCover ?? artist.image }))}
      url={url}
      count={catalog?.followers != null ? `${formatCount(catalog.followers)} followers` : null}
      loading={loading}
    />
  );
}
