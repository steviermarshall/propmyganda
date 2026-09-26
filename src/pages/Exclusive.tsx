import { useState } from "react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { socialLinks, releases, videos } from "@/lib/exclusiveData";

function JoinForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      setState("error");
      return;
    }
    setState("sending");
    const { error } = await supabase.from("newsletter_subscribers").insert([
      { email: email.trim(), source: "site", unsubscribed_at: null, is_active: true },
    ] as never);
    setState(error ? "error" : "done");
  }

  if (state === "done") {
    return (
      <p className="font-mono text-[11px] uppercase tracking-[0.18em]">
        You're on the list.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className={`flex gap-2 ${compact ? "max-w-sm" : "max-w-md"}`}>
      <label htmlFor={compact ? "join-top" : "join-bottom"} className="sr-only">
        Email
      </label>
      <input
        id={compact ? "join-top" : "join-bottom"}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        className="min-w-0 flex-1 border border-current bg-transparent px-3 py-3 font-mono text-[11px] outline-none placeholder:opacity-50"
      />
      <button
        type="submit"
        disabled={state === "sending"}
        className="flex-shrink-0 bg-current px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] disabled:opacity-50"
      >
        <span className="mix-blend-difference text-background">
          {state === "sending" ? "…" : "Join"}
        </span>
      </button>
    </form>
  );
}

export default function Exclusive() {
  return (
    <main className="overflow-hidden bg-primary text-primary-foreground">
      <SEO
        title="PMG Exclusive — New Music & Everything Propmyganda"
        description="The official Propmyganda link hub. Hear every PMG Exclusive drop, watch new videos, enter Propworld, and join the list."
        path="/exclusive"
      />

      {/* Hero — condensed, drops within the first screen */}
      <section className="px-6 pb-8 pt-24 md:px-10 md:pt-32">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-60">
          Brooklyn, NY · 100% Independent
        </p>
        <h1 className="mt-2 font-display text-[14vw] uppercase leading-[0.85] tracking-[-0.03em] md:text-[8vw]">
          PMG Exclusive
        </h1>
        <p className="mt-3 max-w-md text-sm leading-snug opacity-65">
          A new artist every few days. Hear it first.
        </p>
        <div className="mt-5">
          <JoinForm compact />
        </div>
        <div className="mt-4 flex gap-1">
          {socialLinks.map(({ label, href, Icon }) => (
            <Button
              key={label}
              asChild
              variant="ghost"
              size="icon"
              className="text-electric hover:bg-electric hover:text-electric-foreground"
            >
              <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
                <Icon />
              </a>
            </Button>
          ))}
        </div>
      </section>

      {/* 1 — Latest drops */}
      <section id="drops" className="scroll-mt-16 border-t border-primary-foreground/15 px-6 py-10 md:px-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-electric">Out now</p>
        <h2 className="mt-1 font-display text-4xl uppercase leading-[0.85] tracking-[-0.03em] md:text-7xl">
          Latest drops
        </h2>
        <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
          {releases.map((release, i) => (
            <article key={release.title}>
              <a
                href={release.links.Spotify}
                target="_blank"
                rel="noopener noreferrer"
                className="group block border border-primary-foreground/15 bg-black p-2"
              >
                <img
                  src={release.cover}
                  alt={`${release.title} cover artwork`}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
              </a>
              <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.2em] text-electric">
                PMG-R-{String(i + 1).padStart(3, "0")} · {release.date}
              </p>
              <h3 className="mt-1 font-display text-xl uppercase leading-[0.9] tracking-[-0.03em]">
                {release.title}
              </h3>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.15em] opacity-55">
                {release.artist}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {Object.entries(release.links).map(([service, href]) => (
                  <a
                    key={service}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[9px] uppercase tracking-[0.12em] opacity-55 hover:opacity-100"
                  >
                    {service}
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 2 — Playlisting */}
      <section className="border-t border-primary-foreground/15 px-6 py-10 md:px-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-electric">
          Playlisting · PMG-P-001
        </p>
        <h2 className="mt-1 font-display text-4xl uppercase leading-[0.85] tracking-[-0.03em] md:text-7xl">
          Hear it all
        </h2>
        <div className="mt-6 border border-primary-foreground/15 bg-black p-3">
          <iframe
            className="h-[352px] w-full"
            src="https://open.spotify.com/embed/artist/2p1eP8MWD2IANiWjFVr7NV?utm_source=generator&theme=0"
            title="PROPMYGANDA on Spotify"
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          />
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] opacity-50">
            Propmyganda · Full catalogue · PMG-P-001
          </p>
        </div>
      </section>

      {/* 3 — Video */}
      <section className="border-t border-primary-foreground/15 px-6 py-10 md:px-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-45">
          Performances · Sessions · Interviews
        </p>
        <h2 className="mt-1 font-display text-4xl uppercase leading-[0.85] tracking-[-0.03em] md:text-7xl">
          PMG on camera
        </h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {videos.map((video, i) => (
            <article key={video.id}>
              <div className="aspect-video overflow-hidden border border-primary-foreground/15 bg-secondary">
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${video.id}`}
                  title={video.title}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.2em] text-electric">
                PMG-V-{String(i + 1).padStart(3, "0")}
              </p>
              <h3 className="font-display text-lg uppercase leading-[0.9] tracking-[-0.03em]">
                {video.title}
              </h3>
            </article>
          ))}
        </div>
        <a
          href="https://youtube.com/@propmyganda"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block border border-primary-foreground/30 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em]"
        >
          Subscribe on YouTube
        </a>
      </section>

      {/* 4 — Propworld */}
      <section className="border-t border-primary-foreground/15 px-6 py-10 md:px-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-45">The PMG World</p>
        <h2 className="mt-1 font-display text-4xl uppercase leading-[0.85] tracking-[-0.03em] md:text-7xl">
          Propworld
        </h2>
        <p className="mt-2 max-w-md text-sm leading-snug opacity-60">
          Walk the forest. Fight in the streets. Fly the space run.
        </p>
        <Link
          to="/propworld"
          className="mt-5 inline-block bg-electric px-6 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-electric-foreground"
        >
          Enter Propworld
        </Link>
      </section>

      {/* 5 — Join */}
      <section id="join" className="scroll-mt-16 bg-electric px-6 py-12 text-electric-foreground md:px-10">
        <h2 className="max-w-3xl font-display text-4xl uppercase leading-[0.85] tracking-[-0.03em] md:text-7xl">
          Get every drop first
        </h2>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] opacity-70">
          No spam · No skips
        </p>
        <div className="mt-5">
          <JoinForm />
        </div>
      </section>

      <section className="px-6 py-10 md:px-10">
        <nav className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.15em]">
          <Link to="/propworld" className="opacity-60 hover:opacity-100">Propworld</Link>
          <Link to="/artists" className="opacity-60 hover:opacity-100">Records</Link>
          <Link to="/store" className="opacity-60 hover:opacity-100">Store</Link>
          <Link to="/events" className="opacity-60 hover:opacity-100">Events</Link>
        </nav>
      </section>
    </main>
  );
}
