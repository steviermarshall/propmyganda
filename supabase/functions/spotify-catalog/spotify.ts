// Pure helpers for the spotify-catalog function (no Deno globals, unit-tested with vitest).

export interface Track {
  id: string;
  uri: string;
  name: string;
  artists: string;
  album: string;
  image: string | null;
  durationMs: number;
  releaseDate: string | null;
  previewUrl: string | null;
  url: string;
}

export interface SpotifyImage { url: string; width?: number | null; height?: number | null }

export interface SpotifyTrack {
  id: string;
  uri?: string;
  name: string;
  artists?: { name: string }[];
  album?: { name?: string; images?: SpotifyImage[]; release_date?: string };
  duration_ms?: number;
  preview_url?: string | null;
  external_urls?: { spotify?: string };
  is_local?: boolean;
}

/** Pulls a Spotify ID out of a share URL, URI, or bare ID. */
export function parseSpotifyId(input: string, kind: "playlist" | "track" | "artist" | "album"): string | null {
  const s = input.trim();
  const url = s.match(new RegExp(`open\\.spotify\\.com/(?:intl-[a-z]+/)?${kind}/([A-Za-z0-9]{22})`));
  if (url) return url[1];
  const uri = s.match(new RegExp(`^spotify:${kind}:([A-Za-z0-9]{22})$`));
  if (uri) return uri[1];
  return /^[A-Za-z0-9]{22}$/.test(s) ? s : null;
}

/** Prefer a mid-size image (~300px) so tiles load quickly; fall back to the largest. */
export function pickImage(images: SpotifyImage[] | undefined, target = 300): string | null {
  if (!images || images.length === 0) return null;
  const sorted = [...images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  const fit = sorted.find((i) => (i.width ?? 0) >= target);
  return (fit ?? sorted[sorted.length - 1]).url;
}

export function toTrack(t: SpotifyTrack, albumFallback?: SpotifyTrack["album"]): Track | null {
  if (!t || !t.id || t.is_local) return null;
  const album = t.album ?? albumFallback;
  return {
    id: t.id,
    uri: t.uri ?? `spotify:track:${t.id}`,
    name: t.name,
    artists: (t.artists ?? []).map((a) => a.name).join(", "),
    album: album?.name ?? "",
    image: pickImage(album?.images),
    durationMs: t.duration_ms ?? 0,
    releaseDate: album?.release_date ?? null,
    previewUrl: t.preview_url ?? null,
    url: t.external_urls?.spotify ?? `https://open.spotify.com/track/${t.id}`,
  };
}

/**
 * Combine an artist's top tracks with the tracks from their newest releases:
 * newest release first, then the rest by popularity order, no duplicates
 * (same track on a single and an album counts once, by name).
 */
export function mergeArtistTracks(topTracks: Track[], latestReleaseTracks: Track[], limit = 12): Track[] {
  const out: Track[] = [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const push = (t: Track) => {
    const nameKey = t.name.toLowerCase().replace(/\s*[-([].*$/, "").trim();
    if (seenIds.has(t.id) || seenNames.has(nameKey)) return;
    seenIds.add(t.id);
    seenNames.add(nameKey);
    out.push(t);
  };
  const latest = [...latestReleaseTracks].sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""));
  for (const t of latest) push(t);
  for (const t of topTracks) push(t);
  return out.slice(0, limit);
}

export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
