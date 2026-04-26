import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import Marquee from "@/components/Marquee";
import ScrollReveal from "@/components/webgl/ScrollReveal";

type Event = Database["public"]["Tables"]["events"]["Row"];
type Pub = Database["public"]["Tables"]["publications"]["Row"];
type Settings = Database["public"]["Tables"]["site_settings"]["Row"];

const World = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [pubs, setPubs] = useState<Pub[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
      supabase
        .from("events")
        .select("*")
        .eq("status", "upcoming")
        .order("event_date", { ascending: true })
        .limit(3),
      supabase
        .from("publications")
        .select("*")
        .not("published_at", "is", null)
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false })
        .limit(3),
    ]).then(([s, e, p]) => {
      setSettings((s.data ?? null) as Settings | null);
      setEvents((e.data ?? []) as Event[]);
      setPubs((p.data ?? []) as Pub[]);
      setLoading(false);
    });
  }, []);

  const discordId = settings?.discord_server_id;
  const discordInvite = settings?.discord_invite_url;

  return (
    <div>
      {/* Hero */}
      <section className="bg-black text-white pt-32 pb-16 md:pt-44 md:pb-24 overflow-hidden relative">
        <div className="container-content relative z-10">
          <ScrollReveal y={60}>
            <p className="text-xs tracking-[0.4em] uppercase text-white/40 mb-6">Propmyganda · World</p>
            <h1 className="font-display text-[14vw] md:text-[10vw] uppercase leading-none tracking-tight">
              The <span className="text-electric">World.</span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <p className="text-base md:text-lg leading-relaxed text-white/60 max-w-xl mt-8">
              The PMG community lives on Discord. Drops, debates, behind-the-scenes, and direct access to the artists.
              This is where the culture happens in real time.
            </p>
          </ScrollReveal>
        </div>
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </section>

      {/* Discord embed + Join CTA */}
      <section className="section-padding bg-background border-t border-border">
        <div className="container-content">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Embed */}
            <div className="lg:col-span-2">
              <ScrollReveal>
                <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-3">Live Server</p>
                <h2 className="font-display text-3xl md:text-5xl uppercase mb-6">In The Discord Right Now</h2>
              </ScrollReveal>

              <ScrollReveal delay={0.1}>
                {discordId ? (
                  <div className="border border-foreground bg-black overflow-hidden">
                    <iframe
                      src={`https://discord.com/widget?id=${discordId}&theme=dark`}
                      width="100%"
                      height="500"
                      allowTransparency={true}
                      frameBorder="0"
                      sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                      title="PMG Discord"
                    />
                  </div>
                ) : (
                  <div className="border border-border bg-secondary p-12 text-center space-y-3">
                    <MessageCircle className="mx-auto opacity-40" size={32} />
                    <p className="text-sm text-muted-foreground uppercase tracking-widest">
                      Discord widget not configured
                    </p>
                    <p className="text-xs text-muted-foreground/60 max-w-md mx-auto">
                      Admin: enable the Server Widget in Discord Server Settings → Widget, then add the Server ID
                      and invite URL in the dashboard's Settings panel.
                    </p>
                  </div>
                )}
              </ScrollReveal>
            </div>

            {/* Join Card */}
            <ScrollReveal delay={0.2}>
              <div className="bg-black text-white p-8 md:p-10 h-full flex flex-col justify-between border border-electric/30">
                <div>
                  <p className="text-xs tracking-[0.3em] uppercase text-electric mb-4">Join</p>
                  <h3 className="font-display text-3xl md:text-4xl uppercase leading-none mb-4">
                    Step Inside.
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed">
                    Free. Open. Independent. Get notified on releases, talk directly with the artists,
                    and unlock community-only drops.
                  </p>

                  <ul className="mt-8 space-y-3 text-xs uppercase tracking-widest text-white/70">
                    <li className="flex items-center gap-3">
                      <span className="w-1 h-1 bg-electric" /> Early Listen Sessions
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-1 h-1 bg-electric" /> Community Drops
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-1 h-1 bg-electric" /> Direct Artist Access
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-1 h-1 bg-electric" /> Behind-the-Scenes
                    </li>
                  </ul>
                </div>

                <a
                  href={discordInvite ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (!discordInvite) e.preventDefault();
                  }}
                  className={`mt-8 inline-flex items-center justify-center gap-3 bg-electric text-black px-6 py-4 text-xs tracking-[0.2em] uppercase font-bold transition-opacity ${
                    discordInvite ? "hover:opacity-80" : "opacity-40 cursor-not-allowed"
                  }`}
                >
                  {discordInvite ? "Join the Discord" : "Coming Soon"}
                  <ArrowRight size={14} />
                </a>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Activity feed: events + publications */}
      <section className="section-padding bg-secondary border-t border-border">
        <div className="container-content">
          <ScrollReveal>
            <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-3">From The World</p>
            <h2 className="font-display text-3xl md:text-5xl uppercase mb-12">Latest Activity</h2>
          </ScrollReveal>

          {loading && (
            <div className="text-muted-foreground text-sm">Loading…</div>
          )}

          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Upcoming Events */}
              <div>
                <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-5">Upcoming Events</h3>
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground/60">Nothing on the calendar yet.</p>
                ) : (
                  <div className="space-y-3">
                    {events.map((ev) => {
                      const d = new Date(ev.event_date);
                      return (
                        <div key={ev.id} className="border border-border bg-background p-5 flex gap-5 items-center hover:border-foreground transition-colors">
                          <div className="text-center shrink-0 w-14">
                            <p className="text-3xl font-display leading-none">{d.getDate()}</p>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                              {d.toLocaleString("en-US", { month: "short" })}
                            </p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm uppercase tracking-tight truncate">{ev.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {ev.venue ?? ""}{ev.venue && ev.city ? " · " : ""}{ev.city ?? ""}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <Link
                      to="/events"
                      className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase font-bold mt-2 hover:opacity-60 transition-opacity"
                    >
                      All events <ArrowRight size={12} />
                    </Link>
                  </div>
                )}
              </div>

              {/* Latest Publications */}
              <div>
                <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-5">Latest News</h3>
                {pubs.length === 0 ? (
                  <p className="text-sm text-muted-foreground/60">No articles yet.</p>
                ) : (
                  <div className="space-y-3">
                    {pubs.map((p) => (
                      <div key={p.id} className="border border-border bg-background p-5 hover:border-foreground transition-colors">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground border border-border px-2 py-0.5">
                            {p.category}
                          </span>
                          {p.published_at && (
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(p.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-sm uppercase tracking-tight">{p.title}</p>
                        {p.excerpt && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.excerpt}</p>}
                      </div>
                    ))}
                    <Link
                      to="/publication"
                      className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase font-bold mt-2 hover:opacity-60 transition-opacity"
                    >
                      All articles <ArrowRight size={12} />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <Marquee />
    </div>
  );
};

export default World;
