import { artists } from "@/lib/data";

type Entry = { id: string; name: string; spotifyArtistId?: string; spotifyTrackId?: string };

/** The PMG Records roster, for proof next to the prices on /start. Same four as /artists. */
export const ROSTER_PROOF: Entry[] = ["jahballa", "hammad", "stockz", "zoe"]
  .map((id) => (artists as readonly Entry[]).find((a) => a.id === id))
  .filter((a): a is Entry => !!a)
  .map((a) => ({ id: a.id, name: a.name, spotifyArtistId: a.spotifyArtistId, spotifyTrackId: a.spotifyTrackId }));
