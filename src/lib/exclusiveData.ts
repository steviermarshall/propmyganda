import { Facebook, Instagram, Music2, Play, Youtube } from "lucide-react";
export { default as pmgLogo } from "@/assets/pmg-logo-clean.png";
import prideCover from "@/assets/exclusive/pride.jpg";
import dirtyDanCover from "@/assets/exclusive/dirty-dan.jpg";
import roamCover from "@/assets/exclusive/roam.jpg";
import inverseCover from "@/assets/exclusive/inverse.jpg";

export const socialLinks = [
  { label: "Instagram", href: "https://www.instagram.com/propmyganda_", Icon: Instagram },
  { label: "TikTok", href: "https://www.tiktok.com/@propmyganda", Icon: Music2 },
  { label: "YouTube", href: "https://youtube.com/@propmyganda", Icon: Youtube },
  { label: "Facebook", href: "https://www.facebook.com/propmyganda", Icon: Facebook },
  { label: "Spotify", href: "https://open.spotify.com/artist/2p1eP8MWD2IANiWjFVr7NV", Icon: Play },
];

export const releases = [
  {
    title: "Pride",
    artist: "Jahballa",
    date: "Sep 17",
    cover: prideCover ,
    links: {
      Spotify: "https://open.spotify.com/track/2I8KpG4z6IfzBZb2wcrDmr",
      Apple: "https://music.apple.com/us/album/pride-pmg-exclusive/6802542804?i=6802542805",
      YouTube: "https://www.youtube.com/watch?v=5_y7rHkk3kY",
      Amazon: "https://music.amazon.com/tracks/B0HFLPHKLG",
      Tidal: "https://tidal.com/track/553271123",
      Deezer: "https://www.deezer.com/track/4229942772",
      Audiomack: "https://audiomack.com/propmyganda/song/pride-pmg-exclusive",
    },
  },
  {
    title: "Dirty Dan",
    artist: "JPEEZ",
    date: "Sep 17",
    cover: dirtyDanCover ,
    links: {
      Spotify: "https://open.spotify.com/track/5k8kd1tcdgXoUrjWBBCXGn",
      Apple: "https://music.apple.com/us/album/dirty-dan-pmg-exclusive/6802543194?i=6802543196",
      YouTube: "https://www.youtube.com/watch?v=68VNKEHDQEg",
      Amazon: "https://music.amazon.com/tracks/B0HFM13NX1",
      Tidal: "https://tidal.com/track/553271163",
      Deezer: "https://www.deezer.com/track/4229942762",
      Audiomack: "https://audiomack.com/propmyganda/song/dirty-dan-pmg-exclusive",
    },
  },
  {
    title: "Roam",
    artist: "Hammad",
    date: "Sep 19",
    cover: roamCover ,
    links: {
      Spotify: "https://open.spotify.com/track/6UoBXNEbOnh0lbFTcY0EtY",
      Apple: "https://music.apple.com/us/album/roam-pmg-exclusive/6803564780?i=6803564781",
      YouTube: "https://www.youtube.com/watch?v=ydHLASMekAc",
      Amazon: "https://music.amazon.com/tracks/B0HFXCQQTB",
      Tidal: "https://tidal.com/track/554130548",
      Deezer: "https://www.deezer.com/track/4235846642",
      Audiomack: "https://audiomack.com/propmyganda/song/roam-pmg-exclusive",
    },
  },
  {
    title: "The Inverse",
    artist: "Stockz",
    date: "Sep 19",
    cover: inverseCover ,
    links: {
      Spotify: "https://open.spotify.com/track/2GTOG4F5hhZoUngsyZFPpq",
      Apple: "https://music.apple.com/us/album/the-inverse-pmg-exclusive/6803185608?i=6803185609",
      YouTube: "https://www.youtube.com/watch?v=CaeU5yA0Py4",
      Amazon: "https://music.amazon.com/tracks/B0HFT8WBTF",
      Tidal: "https://tidal.com/track/553814298",
      Deezer: "https://www.deezer.com/track/4233621822",
      Audiomack: "https://audiomack.com/propmyganda/song/the-inverse-pmg-exclusive",
    },
  },
];

export const videos = [
  { title: "KINO — NO TIME (PMG)", id: "Ielihry8M20" },
  { title: "Stockz — The Inverse (PMG)", id: "O79bphnB7gI" },
  { title: "Big Yavo speaks with his mother", id: "wu3HSbXf5zA" },
];

export const SPOTIFY_ARTIST_EMBED = "https://open.spotify.com/embed/artist/2p1eP8MWD2IANiWjFVr7NV?utm_source=generator&theme=0";
export const JOIN_URL = "https://propmyganda.sym.fm/pmg-exclusive#join";
