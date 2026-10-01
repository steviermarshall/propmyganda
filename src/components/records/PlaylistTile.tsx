import { useEffect, useMemo, useState } from "react";
import { useSpotifyPlayer } from "./SpotifyPlayer";
import { BlockBar, HudLink, Key, LogLine, PHOS, PlayIcon, ScanImage, StatusRow, Tile } from "./ui";
import { SPOTIFY_PLAYLIST_URL, formatCount, formatDuration, type ArtistCatalog, type PlaylistCatalog, type Tone, type Track } from "@/lib/spotifyCatalog";

export interface MediaTileProps {
  /** Unique key for the player, e.g. "playlist:<id>" or "artist:<id>". */
  owner: string;
  /** Panel header, e.g. "PMG-R-001" */
  label: string;
  /** Header right side, e.g. "HIP-HOP" or "PLAYLIST" */
  kind: string;
  title: string;
  tone?: Tone;
  tracks: Track[];
  url: string;
  /** Status rows, e.g. [["FOLLOWERS", "1.2K"]] */
  stats?: [string, string][];
  loading: boolean;
  /** Embed shown when no track list is available yet. */
  fallbackEmbed?: string;
  followLabel?: string;
}

/** One HUD panel: the track that is up, a scan of its artwork, log lines, a bar, a status table and keys. */
export function MediaTile({ owner, label, kind, title, tracks: tracksIn, url, stats = [], loading, fallbackEmbed, followLabel = "Follow on Spotify" }: MediaTileProps) {
  const player = useSpotifyPlayer();
  const tracks = useMemo(() => tracksIn ?? [], [tracksIn]);
  const [index, setIndex] = useState(0);
  const mine = player.owner === owner ? player.current : null;
  const track = mine ?? tracks[index];
  const playing = !!mine && !player.isPaused;
  const progress = mine && player.duration ? player.position / player.duration : 0;

  useEffect(() => {
    if (!mine) return;
    const i = tracks.findIndex((t) => t.id === mine.id);
    if (i >= 0) setIndex(i);
  }, [mine, tracks]);

  // When a track ends, move on to the next one.
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

  const status = playing ? "PLAYING" : mine ? "PAUSED" : tracks.length ? "STANDBY" : loading ? "SCANNING" : "NO DATA";
  const pos = String(tracks.length ? index + 1 : 0).padStart(2, "0");
  const total = String(tracks.length).padStart(2, "0");

  return (
    <Tile className="flex min-h-[380px] flex-col p-4 md:p-5" active={playing}>
      {/* header strip */}
      <header className="mb-3 flex items-center justify-between border-b pb-2 text-[10px]" style={{ borderColor: PHOS.faint }}>
        <span style={{ color: PHOS.mid }}>// {label}</span>
        <span className="flex items-center gap-2">
          <span className="opacity-70">{kind}</span>
          <span className="inline-block h-2 w-2" style={{ background: playing ? PHOS.bright : PHOS.faint, boxShadow: playing ? `0 0 6px ${PHOS.mid}` : undefined, animation: playing ? "pmg-blink 1s steps(1) infinite" : undefined }} aria-hidden="true" />
        </span>
      </header>

      <h3 className="text-[18px] font-bold leading-none tracking-[0.08em] md:text-[20px]">{title}</h3>

      {/* body */}
      {loading && tracks.length === 0 ? (
        <div className="my-4 flex-1 space-y-2 text-[10px]">
          <LogLine label="INDEXING CATALOG" value="…" />
          <LogLine label="RESTORING TRACKS" value="…" dim />
          <BlockBar value={0.4} label=">SCAN" />
        </div>
      ) : track ? (
        <div className="my-4 flex flex-1 gap-4">
          <button
            type="button"
            onClick={() => player.play(track, owner)}
            aria-label={playing ? `Pause ${track.name}` : `Play ${track.name}`}
            className="group relative h-32 w-32 shrink-0 md:h-36 md:w-36"
          >
            <ScanImage src={track.image} className="h-full w-full" />
            <span className="absolute inset-0 flex items-center justify-center" style={{ opacity: playing ? 0 : 1 }}>
              <span className="flex h-8 w-8 items-center justify-center border" style={{ borderColor: PHOS.bright, background: "rgba(5,16,11,0.8)", color: PHOS.bright }}>
                <PlayIcon paused={!playing} />
              </span>
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <LogLine label="TRACK" value={track.name} />
            <LogLine label="ARTIST" value={track.artists} />
            <LogLine label="LENGTH" value={mine && player.duration ? `${formatDuration(player.position * 1000)} / ${formatDuration(player.duration * 1000)}` : track.durationMs ? formatDuration(track.durationMs) : "—"} />
            <LogLine label="INDEX" value={`${pos} / ${total}`} dim />
            <LogLine label="STATUS" value={status} />
            <div className="mt-2">
              <BlockBar value={progress} label=">PLAYBACK" />
            </div>
          </div>
        </div>
      ) : fallbackEmbed ? (
        <div className="my-4 flex-1">
          <LogLine label="CATALOG LINK" value="OFFLINE" dim />
          <LogLine label="FALLBACK" value="SPOTIFY EMBED" dim />
          <div className="mt-3 overflow-hidden border" style={{ borderColor: PHOS.faint }}>
            <iframe title={`${title} on Spotify`} src={fallbackEmbed} width="100%" height="152" frameBorder="0" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" />
          </div>
        </div>
      ) : (
        <div className="my-4 flex-1">
          <LogLine label="SIGNAL" value="NONE" dim />
          <p className="mt-2 text-[10px] opacity-60">NO RECORD FOUND. CHECK BACK.</p>
        </div>
      )}

      {/* status table */}
      <div className="grid gap-1 sm:grid-cols-2">
        <StatusRow label="STATUS" value={status} />
        <StatusRow label="TRACKS" value={tracks.length ? total : "—"} />
        {stats.map(([k, v]) => <StatusRow key={k} label={k} value={v} />)}
      </div>

      {/* footer keys */}
      <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-[10px]" style={{ borderColor: PHOS.faint }}>
        <div className="flex items-center gap-2">
          <Key onClick={() => step(-1)} disabled={tracks.length === 0} ariaLabel="Previous track">◀</Key>
          <Key onClick={() => step(1)} disabled={tracks.length === 0} ariaLabel="Next track">▶</Key>
          <span className="opacity-60">: TRACK</span>
          <Key onClick={() => track && player.play(track, owner)} disabled={!track} ariaLabel={playing ? "Pause" : "Play"} active={playing}>OK</Key>
          <span className="opacity-60">: {playing ? "PAUSE" : "PLAY"}</span>
        </div>
        <HudLink href={url}>{followLabel}</HudLink>
      </footer>
    </Tile>
  );
}

/** A PMG playlist in the HUD panel. */
export function PlaylistTile({ id, name, tone, catalog, loading }: { id: string; name: string; tone: Tone; catalog?: PlaylistCatalog; loading: boolean }) {
  return (
    <MediaTile
      owner={`playlist:${id}`}
      label={`PMG-PL-${id.slice(0, 4).toUpperCase()}`}
      kind="PLAYLIST"
      title={catalog?.name ?? name}
      tone={tone}
      tracks={catalog?.tracks ?? []}
      url={catalog?.url ?? SPOTIFY_PLAYLIST_URL(id)}
      stats={catalog?.followers != null ? [["SAVES", formatCount(catalog.followers)]] : []}
      loading={loading}
      fallbackEmbed={`https://open.spotify.com/embed/playlist/${id}?utm_source=generator&theme=0`}
      followLabel="Follow playlist"
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

/** A roster artist in the same panel, stepping through their songs straight from Spotify. */
export function ArtistTile({ artist, catalog, loading }: { artist: RosterEntry; catalog?: ArtistCatalog; loading: boolean }) {
  // Until Spotify data arrives, the panel shows the same embed player the playlists use.
  const tracks: Track[] = (catalog?.tracks ?? []).map((t) => ({ ...t, image: t.image ?? artist.albumCover ?? artist.image }));
  const fallbackEmbed = artist.spotifyTrackId
    ? `https://open.spotify.com/embed/track/${artist.spotifyTrackId}?utm_source=generator&theme=0`
    : artist.spotifyArtistId
      ? `https://open.spotify.com/embed/artist/${artist.spotifyArtistId}?utm_source=generator&theme=0`
      : undefined;
  const url =
    catalog?.url ??
    (artist.spotifyArtistId
      ? `https://open.spotify.com/artist/${artist.spotifyArtistId}`
      : `https://open.spotify.com/track/${artist.spotifyTrackId ?? ""}`);
  return (
    <MediaTile
      owner={`artist:${artist.id}`}
      label={artist.cat}
      kind={artist.genre.toUpperCase()}
      title={artist.name}
      tone={artist.tone}
      tracks={tracks}
      url={url}
      stats={catalog?.followers != null ? [["FOLLOWERS", formatCount(catalog.followers)]] : []}
      loading={loading}
      fallbackEmbed={fallbackEmbed}
      followLabel="Follow artist"
    />
  );
}
