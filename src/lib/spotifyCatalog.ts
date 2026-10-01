import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
export interface ArtistCatalog {
  id: string;
  artistId: string | null;
  name: string | null;
  image: string | null;
  url: string | null;
  followers: number | null;
  tracks: Track[];
}
export interface PlaylistCatalog {
  id: string;
  name: string;
  description: string;
  image: string | null;
  url: string;
  followers: number | null;
  tracks: Track[];
}
export interface Catalog {
  configured: boolean;
  artists: Record<string, ArtistCatalog>;
  playlists: Record<string, PlaylistCatalog>;
  errors?: string[];
  fetchedAt?: string;
}

/** PMG playlists shown under the roster. Order matters: it is the grid order. */
export const PLAYLISTS = [
  { id: "3MyhqNLVwBKGmphHdNa5Rc", name: "Pressure", tone: "pink" },
  { id: "2UNWy5IR16rYyzgbJcXYOI", name: "Heavy Rotation", tone: "navy" },
  { id: "5ZrrI4v0Utzy4UlJmAGC4W", name: "First Listen", tone: "sage" },
  { id: "3k81HjH5Fb08mfL0FGA8g6", name: "Concrete", tone: "ember" },
  { id: "1InEowM2gR3vav0B1CeZh3", name: "Slow Burn", tone: "plum" },
] as const;
export type Tone = (typeof PLAYLISTS)[number]["tone"];

export const SPOTIFY_PLAYLIST_URL = (id: string) => `https://open.spotify.com/playlist/${id}`;

export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}

export function formatCount(n: number | null): string {
  if (n === null || n === undefined) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export function useSpotifyCatalog(artists: { id: string; artistId?: string; trackId?: string }[]) {
  return useQuery<Catalog>({
    queryKey: ["spotify-catalog", artists.map((a) => a.id).join(","), PLAYLISTS.map((p) => p.id).join(",")],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("spotify-catalog", {
        body: { artists, playlists: PLAYLISTS.map((p) => p.id) },
      });
      if (error || !data || data.configured === false) {
        // The function is not deployed or has no Spotify credentials yet: the page falls back to embeds.
        return { configured: false, artists: {}, playlists: {} };
      }
      return data as Catalog;
    },
    staleTime: 10 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
