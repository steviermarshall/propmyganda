import { Link } from "react-router-dom";
import { Facebook, Instagram, Music2, Play, Youtube } from "lucide-react";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import pmgLogo from "@/assets/pmg-logo-clean.png";
import prideCover from "@/assets/exclusive/pride.jpg.asset.json";
import dirtyDanCover from "@/assets/exclusive/dirty-dan.jpg.asset.json";
import roamCover from "@/assets/exclusive/roam.jpg.asset.json";
import inverseCover from "@/assets/exclusive/inverse.jpg.asset.json";

const socialLinks = [
  { label: "Instagram", href: "https://www.instagram.com/propmyganda_", Icon: Instagram },
  { label: "TikTok", href: "https://www.tiktok.com/@propmyganda", Icon: Music2 },
  { label: "YouTube", href: "https://youtube.com/@propmyganda", Icon: Youtube },
  { label: "Facebook", href: "https://www.facebook.com/propmyganda", Icon: Facebook },
  { label: "Spotify", href: "https://open.spotify.com/artist/2p1eP8MWD2IANiWjFVr7NV", Icon: Play },
];

const releases = [
  {
    title: "Pride",
    artist: "Jahballa",
    date: "Sep 17",
    cover: prideCover.url,
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
    cover: dirtyDanCover.url,
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
    cover: roamCover.url,
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
    cover: inverseCover.url,
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

const videos = [
  { title: "KINO — NO TIME (PMG)", id: "Ielihry8M20" },
  { title: "Stockz — The Inverse (PMG)", id: "O79bphnB7gI" },
  { title: "Big Yavo speaks with his mother", id: "wu3HSbXf5zA" },
];

const ExternalLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
);

export default function Exclusive() {
  return (
    <main className="bg-primary text-primary-foreground overflow-hidden">
      <SEO
        title="PMG Exclusive — New Music & Everything Propmyganda"
        description="The official Propmyganda link hub. Hear every PMG Exclusive drop, watch new videos, enter Propworld, and join the list."
        path="/exclusive"
      />

      <section className="min-h-[680px] pt-28 md:pt-36 pb-20 md:pb-28">
        <div className="container-content grid items-center gap-14 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] opacity-60">Brooklyn, NY / 100% Independent</p>
            <h1 className="mt-5 font-condensed text-[clamp(4rem,10vw,9rem)] uppercase leading-[0.78]">PMG Exclusive</h1>
            <p className="mt-8 max-w-xl text-base leading-relaxed opacity-65 md:text-lg">
              PROPMYGANDA links with a new artist every few days. Four drops out now, new heat on the way.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild variant="secondary" className="h-12 rounded-full px-7 font-mono text-[10px] uppercase tracking-[0.18em]">
                <a href="#drops">Hear the drops</a>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full border-primary-foreground/25 bg-transparent px-7 font-mono text-[10px] uppercase tracking-[0.18em] text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                <a href="https://propmyganda.sym.fm/pmg-exclusive#join" target="_blank" rel="noopener noreferrer">Get every drop first</a>
              </Button>
            </div>
            <div className="mt-9 flex gap-2">
              {socialLinks.map(({ label, href, Icon }) => (
                <Button key={label} asChild variant="ghost" size="icon" className="rounded-full text-electric hover:bg-electric hover:text-electric-foreground">
                  <ExternalLink href={href}><Icon aria-label={label} /></ExternalLink>
                </Button>
              ))}
            </div>
          </div>

          <div className="mx-auto flex aspect-square w-full max-w-[410px] items-center justify-center rounded-lg bg-background p-14 md:p-20">
            <img src={pmgLogo} alt="PROPMYGANDA" className="w-full" />
          </div>
        </div>
      </section>

      <section className="bg-background py-20 text-foreground md:py-28">
        <div className="container-content grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">The PMG World</p>
            <h2 className="mt-3 max-w-lg font-condensed text-6xl uppercase leading-[0.85] md:text-8xl">Step into Propworld</h2>
            <p className="mt-7 max-w-xl text-sm leading-7 text-muted-foreground">
              An interactive 3D space built by PMG. Fly the space combat game, then walk the social room and the media wall.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="rounded-full font-mono text-[10px] uppercase tracking-[0.16em]"><Link to="/propworld">Enter Propworld</Link></Button>
              <Button asChild variant="outline" className="rounded-full font-mono text-[10px] uppercase tracking-[0.16em]"><Link to="/">Visit PMG.com</Link></Button>
            </div>
          </div>
          <div className="grid gap-px border border-border bg-border sm:grid-cols-2">
            <div className="bg-background p-7">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Blue Tree</span>
              <h3 className="mt-3 font-condensed text-3xl uppercase">The Game</h3>
              <p className="mt-2 text-sm text-muted-foreground">Space combat, wave survival.</p>
            </div>
            <div className="bg-background p-7">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Amber Tree</span>
              <h3 className="mt-3 font-condensed text-3xl uppercase">The Room</h3>
              <p className="mt-2 text-sm text-muted-foreground">Social hub, media wall.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="drops" className="scroll-mt-16 py-20 md:py-28">
        <div className="container-content">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-electric">Out now</p>
          <h2 className="mt-3 font-condensed text-6xl uppercase leading-none md:text-8xl">Latest drops</h2>
          <div className="mt-12 grid gap-x-5 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
            {releases.map((release) => (
              <article key={release.title}>
                <a href={release.links.Spotify} target="_blank" rel="noopener noreferrer" className="group block overflow-hidden rounded-lg">
                  <img src={release.cover} alt={`${release.title} cover artwork`} className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </a>
                <p className="mt-5 font-mono text-[9px] uppercase tracking-[0.28em] text-electric">{release.date}</p>
                <h3 className="mt-2 font-condensed text-4xl uppercase leading-none">{release.title}</h3>
                <p className="mt-2 text-sm opacity-55">with {release.artist}</p>
                <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
                  {Object.entries(release.links).map(([service, href]) => (
                    <a key={service} href={href} target="_blank" rel="noopener noreferrer" className="font-mono text-[9px] uppercase tracking-[0.12em] opacity-55 transition-opacity hover:opacity-100">
                      {service}
                    </a>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-primary-foreground/15 py-20 md:py-28">
        <div className="container-content">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-45">Performances / Show and tell / Interviews</p>
          <h2 className="mt-3 font-condensed text-6xl uppercase leading-none md:text-8xl">PMG on camera</h2>
          <p className="mt-5 max-w-xl text-sm leading-7 opacity-55">New videos every week. Performances, studio sessions, and artist interviews.</p>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {videos.map((video) => (
              <article key={video.id}>
                <div className="aspect-video overflow-hidden rounded-lg bg-secondary">
                  <iframe
                    className="h-full w-full"
                    src={`https://www.youtube-nocookie.com/embed/${video.id}`}
                    title={video.title}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <h3 className="mt-4 font-condensed text-2xl uppercase">{video.title}</h3>
              </article>
            ))}
          </div>
          <Button asChild variant="outline" className="mt-10 rounded-full border-primary-foreground/25 bg-transparent font-mono text-[10px] uppercase tracking-[0.16em] text-primary-foreground hover:bg-primary-foreground hover:text-primary">
            <ExternalLink href="https://youtube.com/@propmyganda">Subscribe on YouTube</ExternalLink>
          </Button>
        </div>
      </section>

      <section className="border-t border-primary-foreground/15 py-20 md:py-28">
        <div className="container-content grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-center">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-electric">Stream the series</p>
            <h2 className="mt-3 font-condensed text-6xl uppercase leading-[0.85] md:text-8xl">Hear it all</h2>
          </div>
          <iframe
            className="h-[352px] w-full rounded-lg"
            src="https://open.spotify.com/embed/artist/2p1eP8MWD2IANiWjFVr7NV?utm_source=generator&theme=0"
            title="PROPMYGANDA on Spotify"
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          />
        </div>
      </section>

      <section id="join" className="scroll-mt-16 bg-electric py-20 text-electric-foreground md:py-28">
        <div className="container-content grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-60">PMG Exclusive</p>
            <h2 className="mt-3 max-w-4xl font-display text-5xl uppercase leading-[0.9] md:text-8xl">Get every drop first</h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed opacity-70">Join the list and hear the next PMG EXCLUSIVE release before it hits the feeds.</p>
          </div>
          <Button asChild size="lg" className="h-14 rounded-full px-8 font-mono text-[10px] uppercase tracking-[0.18em]">
            <a href="https://propmyganda.sym.fm/pmg-exclusive#join" target="_blank" rel="noopener noreferrer">Join the list</a>
          </Button>
        </div>
      </section>

      <section className="py-16">
        <div className="container-content flex flex-col justify-between gap-8 md:flex-row md:items-center">
          <p className="font-condensed text-3xl uppercase">More from PMG</p>
          <nav className="flex flex-wrap gap-x-7 gap-y-3 font-mono text-[10px] uppercase tracking-[0.15em]">
            <Link to="/propworld" className="opacity-60 hover:opacity-100">Propworld</Link>
            <Link to="/artists" className="opacity-60 hover:opacity-100">Records</Link>
            <Link to="/store" className="opacity-60 hover:opacity-100">Store</Link>
            <Link to="/events" className="opacity-60 hover:opacity-100">Events</Link>
          </nav>
        </div>
      </section>
    </main>
  );
}