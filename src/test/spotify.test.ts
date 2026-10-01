import { describe, it, expect } from "vitest";
import { formatDuration, mergeArtistTracks, parseSpotifyId, pickImage, toTrack, type Track } from "../../supabase/functions/spotify-catalog/spotify";

const t = (id: string, name: string, releaseDate: string | null = null): Track => ({
  id, uri: `spotify:track:${id}`, name, artists: "A", album: "", image: null, durationMs: 0, releaseDate, previewUrl: null, url: "",
});

describe("parseSpotifyId", () => {
  it("reads share links, uris and bare ids", () => {
    expect(parseSpotifyId("https://open.spotify.com/playlist/3MyhqNLVwBKGmphHdNa5Rc?si=waYG0VozSaCeCS8Pes2V9g", "playlist")).toBe("3MyhqNLVwBKGmphHdNa5Rc");
    expect(parseSpotifyId("https://open.spotify.com/intl-de/track/2I8KpG4z6IfzBZb2wcrDmr", "track")).toBe("2I8KpG4z6IfzBZb2wcrDmr");
    expect(parseSpotifyId("spotify:artist:2ssMAH1zhNUAwxBNvESHnA", "artist")).toBe("2ssMAH1zhNUAwxBNvESHnA");
    expect(parseSpotifyId("2ssMAH1zhNUAwxBNvESHnA", "artist")).toBe("2ssMAH1zhNUAwxBNvESHnA");
    expect(parseSpotifyId("https://open.spotify.com/track/2I8KpG4z6IfzBZb2wcrDmr", "playlist")).toBeNull();
    expect(parseSpotifyId("nope", "track")).toBeNull();
  });
});

describe("pickImage / toTrack", () => {
  it("prefers the smallest image that is at least the target size", () => {
    const images = [{ url: "l", width: 640 }, { url: "s", width: 64 }, { url: "m", width: 300 }];
    expect(pickImage(images)).toBe("m");
    expect(pickImage(images, 1000)).toBe("l");
    expect(pickImage([])).toBeNull();
  });

  it("maps a spotify track and skips local files", () => {
    const track = toTrack({
      id: "x".repeat(22), name: "Song (feat. B)", artists: [{ name: "A" }, { name: "B" }],
      album: { name: "Album", images: [{ url: "img", width: 300 }], release_date: "2026-01-02" }, duration_ms: 125000,
    });
    expect(track).toMatchObject({ artists: "A, B", album: "Album", image: "img", releaseDate: "2026-01-02", uri: `spotify:track:${"x".repeat(22)}` });
    expect(toTrack({ id: "y", name: "local", is_local: true })).toBeNull();
  });
});

describe("mergeArtistTracks", () => {
  it("puts the newest release first and dedupes by id and name", () => {
    const top = [t("1", "Hit"), t("2", "Older"), t("3", "Hit - Remix")];
    const latest = [t("9", "Brand New", "2026-09-01"), t("1", "Hit", "2025-01-01"), t("8", "Also New", "2026-09-01")];
    expect(mergeArtistTracks(top, latest, 10).map((x) => x.id)).toEqual(["9", "8", "1", "2"]);
  });

  it("respects the limit", () => {
    expect(mergeArtistTracks([t("1", "a"), t("2", "b"), t("3", "c")], [], 2)).toHaveLength(2);
  });
});

describe("formatDuration", () => {
  it("formats m:ss", () => {
    expect(formatDuration(125000)).toBe("2:05");
    expect(formatDuration(0)).toBe("0:00");
  });
});
