// Spotify catalog for the Records page.
// Resolves each roster artist (from an artist ID or one of their track IDs),
// returns their current top tracks plus anything from their newest releases,
// and the live track list of each PMG playlist — so the page keeps up with
// Spotify without code changes.
//
// Secrets: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET (client-credentials flow).
// Body: { artists: [{ id, artistId?, trackId? }], playlists: ["<playlist id or url>"] }
import {
  mergeArtistTracks,
  parseSpotifyId,
  pickImage,
  toTrack,
  type SpotifyTrack,
  type Track,
} from "./spotify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const API = "https://api.spotify.com/v1";
const MARKET = "US";
const CACHE_TTL_MS = 20 * 60 * 1000;

interface ArtistRequest { id: string; artistId?: string; trackId?: string }
interface ArtistResult {
  id: string;
  artistId: string | null;
  name: string | null;
  image: string | null;
  url: string | null;
  followers: number | null;
  tracks: Track[];
}
interface PlaylistResult {
  id: string;
  name: string;
  description: string;
  image: string | null;
  url: string;
  followers: number | null;
  tracks: Track[];
}

let token: { value: string; expires: number } | null = null;
const cache = new Map<string, { at: number; value: unknown }>();

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

async function getToken(): Promise<string> {
  if (token && token.expires > Date.now() + 30_000) return token.value;
  const id = Deno.env.get("SPOTIFY_CLIENT_ID");
  const secret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
  if (!id || !secret) throw new Error("SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET not set");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`Spotify token: HTTP ${res.status}`);
  const data = await res.json();
  token = { value: data.access_token, expires: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return token.value;
}

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${await getToken()}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Spotify ${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as T;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  return value;
}

async function loadArtist(req: ArtistRequest): Promise<ArtistResult> {
  return cached(`artist:${req.artistId ?? ""}:${req.trackId ?? ""}`, async () => {
    let artistId = req.artistId ? parseSpotifyId(req.artistId, "artist") : null;
    if (!artistId && req.trackId) {
      const trackId = parseSpotifyId(req.trackId, "track");
      if (trackId) {
        const track = await api<{ artists: { id: string }[] }>(`/tracks/${trackId}?market=${MARKET}`);
        artistId = track.artists?.[0]?.id ?? null;
      }
    }
    if (!artistId) return { id: req.id, artistId: null, name: null, image: null, url: null, followers: null, tracks: [] };

    const [artist, top, albums] = await Promise.all([
      api<{ name: string; images: { url: string; width: number }[]; external_urls: { spotify: string }; followers?: { total: number } }>(`/artists/${artistId}`),
      api<{ tracks: SpotifyTrack[] }>(`/artists/${artistId}/top-tracks?market=${MARKET}`),
      api<{ items: { id: string; name: string; images: { url: string; width: number }[]; release_date: string }[] }>(
        `/artists/${artistId}/albums?include_groups=album,single&market=${MARKET}&limit=6`,
      ),
    ]);

    // Tracks from the two newest releases, so a drop shows up the day it lands.
    const newest = [...albums.items].sort((a, b) => b.release_date.localeCompare(a.release_date)).slice(0, 2);
    const latestTracks: Track[] = [];
    await Promise.all(
      newest.map(async (album) => {
        try {
          const data = await api<{ items: SpotifyTrack[] }>(`/albums/${album.id}/tracks?market=${MARKET}&limit=20`);
          for (const t of data.items) {
            const track = toTrack(t, { name: album.name, images: album.images, release_date: album.release_date });
            if (track) latestTracks.push(track);
          }
        } catch (e) {
          console.error("album tracks failed", album.id, e instanceof Error ? e.message : e);
        }
      }),
    );
    const topTracks = top.tracks.map((t) => toTrack(t)).filter((t): t is Track => !!t);

    return {
      id: req.id,
      artistId,
      name: artist.name,
      image: pickImage(artist.images, 400),
      url: artist.external_urls?.spotify ?? `https://open.spotify.com/artist/${artistId}`,
      followers: artist.followers?.total ?? null,
      tracks: mergeArtistTracks(topTracks, latestTracks),
    };
  });
}

async function loadPlaylist(input: string): Promise<PlaylistResult | null> {
  const id = parseSpotifyId(input, "playlist");
  if (!id) return null;
  return cached(`playlist:${id}`, async () => {
    const fields =
      "name,description,images,followers.total,external_urls.spotify," +
      "tracks.items(track(id,uri,name,is_local,artists(name),album(name,images,release_date),duration_ms,preview_url,external_urls))";
    const p = await api<{
      name: string;
      description: string;
      images: { url: string; width: number }[];
      followers?: { total: number };
      external_urls?: { spotify?: string };
      tracks: { items: { track: SpotifyTrack | null }[] };
    }>(`/playlists/${id}?market=${MARKET}&fields=${encodeURIComponent(fields)}`);
    const tracks = p.tracks.items
      .map((i) => (i.track ? toTrack(i.track) : null))
      .filter((t): t is Track => !!t)
      .slice(0, 50);
    return {
      id,
      name: p.name,
      description: p.description ?? "",
      image: pickImage(p.images),
      url: p.external_urls?.spotify ?? `https://open.spotify.com/playlist/${id}`,
      followers: p.followers?.total ?? null,
      tracks,
    };
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  let body: { artists?: ArtistRequest[]; playlists?: string[] } = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    body = {};
  }
  const artistReqs = (body.artists ?? []).slice(0, 20);
  const playlistReqs = (body.playlists ?? []).slice(0, 20);

  try {
    await getToken();
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e), configured: false }, 503);
  }

  const artists: Record<string, ArtistResult> = {};
  const playlists: Record<string, PlaylistResult> = {};
  const errors: string[] = [];
  await Promise.all([
    ...artistReqs.map(async (a) => {
      try {
        artists[a.id] = await loadArtist(a);
      } catch (e) {
        errors.push(`artist ${a.id}: ${e instanceof Error ? e.message : e}`);
      }
    }),
    ...playlistReqs.map(async (p) => {
      try {
        const r = await loadPlaylist(p);
        if (r) playlists[r.id] = r;
      } catch (e) {
        errors.push(`playlist ${p}: ${e instanceof Error ? e.message : e}`);
      }
    }),
  ]);
  return json({ ok: true, configured: true, artists, playlists, errors, fetchedAt: new Date().toISOString() }, 200, {
    "Cache-Control": "public, max-age=600",
  });
});
