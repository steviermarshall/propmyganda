import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import Marquee from "@/components/Marquee";
import ScrollReveal from "@/components/webgl/ScrollReveal";

type Event = Database["public"]["Tables"]["events"]["Row"];

function EventCard({ ev }: { ev: Event }) {
  const d = new Date(ev.event_date);
  const past = ev.status === "past";

  return (
    <ScrollReveal y={40}>
      <div className={`border transition-colors ${past ? "border-border opacity-60" : "border-foreground hover:border-foreground"} p-6 md:p-8 flex gap-6`}>
        {/* Date block */}
        <div className={`shrink-0 text-center w-16 ${past ? "opacity-50" : ""}`}>
          <p className="text-4xl font-display leading-none">{d.getDate()}</p>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1">
            {d.toLocaleString("en-US", { month: "short" })}
          </p>
          <p className="text-xs text-muted-foreground">{d.getFullYear()}</p>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-lg uppercase tracking-tight truncate">{ev.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {ev.venue ?? ""}{ev.venue && ev.city ? " · " : ""}{ev.city ?? ""}
          </p>
          {ev.doors_time && (
            <p className="text-xs text-muted-foreground mt-0.5">Doors: {ev.doors_time}</p>
          )}
          {ev.description && (
            <p className="text-sm mt-3 text-muted-foreground line-clamp-2">{ev.description}</p>
          )}
        </div>

        {/* CTA */}
        {ev.ticket_url && !past && (
          <a
            href={ev.ticket_url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 self-start border border-foreground px-5 py-3 text-xs tracking-[0.15em] uppercase font-bold hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            Tickets
          </a>
        )}
      </div>
    </ScrollReveal>
  );
}

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("events")
      .select("*")
      .neq("status", "cancelled")
      .order("event_date", { ascending: false })
      .then(({ data }) => {
        setEvents((data ?? []) as Event[]);
        setLoading(false);
      });
  }, []);

  const upcoming = events.filter((e) => e.status === "upcoming");
  const past = events.filter((e) => e.status === "past");

  return (
    <div>
      <div className="bg-primary text-primary-foreground pt-32 pb-16">
        <div className="container-content">
          <ScrollReveal>
            <h1 className="text-5xl md:text-8xl text-heading">Events</h1>
          </ScrollReveal>
        </div>
      </div>

      <section className="section-padding bg-background">
        <div className="container-content max-w-4xl space-y-12">
          {loading && (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Loading…</div>
          )}

          {!loading && upcoming.length > 0 && (
            <div>
              <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">Upcoming</h2>
              <div className="space-y-3">
                {upcoming.map((ev) => <EventCard key={ev.id} ev={ev} />)}
              </div>
            </div>
          )}

          {!loading && upcoming.length === 0 && (
            <div className="border border-border p-12 text-center">
              <p className="text-muted-foreground text-sm uppercase tracking-widest">No upcoming events</p>
            </div>
          )}

          {!loading && past.length > 0 && (
            <div>
              <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">Past</h2>
              <div className="space-y-3">
                {past.map((ev) => <EventCard key={ev.id} ev={ev} />)}
              </div>
            </div>
          )}
        </div>
      </section>

      <Marquee />
    </div>
  );
}
