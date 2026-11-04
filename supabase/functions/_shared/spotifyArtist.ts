// Spotify artist lookup with the client-credentials flow (SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET).
// The public API gives followers and popularity, not monthly listeners; the artist supplies those.

let token: { value: string; expires: number } | null = null;

async function spotifyToken(): Promise<string> {
  if (token && token.expires > Date.now() + 30_000) return token.value;
  const id = Deno.env.get("SPOTIFY_CLIENT_ID");
  const secret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
  if (!id || !secret) throw new Error("SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET not set");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${id}:${secret}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Spotify token: HTTP ${res.status}`);
  const data = await res.json();
  token = { value: data.access_token, expires: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return token.value;
}

export interface SpotifyArtist { id: string; name: string; url: string; followers: number; popularity: number; genres: string[] }

interface RawArtist { id: string; name: string; followers?: { total?: number }; popularity?: number; genres?: string[]; external_urls?: { spotify?: string } }

function shape(a: RawArtist): SpotifyArtist {
  return { id: a.id, name: a.name, url: a.external_urls?.spotify ?? `https://open.spotify.com/artist/${a.id}`, followers: a.followers?.total ?? 0, popularity: a.popularity ?? 0, genres: a.genres ?? [] };
}

/** Looks an artist up by Spotify link/ID or by name (top 3 matches by name). */
export async function spotifyArtistLookup(query: string): Promise<SpotifyArtist[]> {
  const t = await spotifyToken();
  const headers = { Authorization: `Bearer ${t}` };
  const idMatch = query.match(/artist[/:]([A-Za-z0-9]{22})/);
  if (idMatch) {
    const res = await fetch(`https://api.spotify.com/v1/artists/${idMatch[1]}`, { headers, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`Spotify artist: HTTP ${res.status}`);
    return [shape(await res.json())];
  }
  const res = await fetch(`https://api.spotify.com/v1/search?type=artist&limit=3&q=${encodeURIComponent(query)}`, { headers, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Spotify search: HTTP ${res.status}`);
  const data = await res.json();
  return ((data.artists?.items ?? []) as RawArtist[]).map(shape);
}
