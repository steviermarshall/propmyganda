import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import ImageUploader from "./ImageUploader";
import { DashField, DashInput, DashTextarea, DashSelect } from "./DashField";

type Event = Database["public"]["Tables"]["events"]["Row"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
  onSaved: (event: Event) => void;
}

const STATUSES: Event["status"][] = ["upcoming", "past", "cancelled"];

const empty = {
  title: "",
  slug: "",
  venue: "",
  city: "",
  event_date: "",
  doors_time: "",
  ticket_url: "",
  flyer_url: null as string | null,
  description: "",
  status: "upcoming" as Event["status"],
};

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventDialog({ open, onOpenChange, event, onSaved }: Props) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (event) {
      setForm({
        title:       event.title,
        slug:        event.slug,
        venue:       event.venue ?? "",
        city:        event.city ?? "",
        event_date:  toLocalInput(event.event_date),
        doors_time:  event.doors_time ?? "",
        ticket_url:  event.ticket_url ?? "",
        flyer_url:   event.flyer_url,
        description: event.description ?? "",
        status:      event.status,
      });
    } else {
      setForm(empty);
    }
    setError(null);
  }, [event, open]);

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function autoSlug(s: string) {
    return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      title:               form.title,
      slug:                form.slug || autoSlug(form.title),
      venue:               form.venue || null,
      city:                form.city || null,
      event_date:          new Date(form.event_date).toISOString(),
      doors_time:          form.doors_time || null,
      ticket_url:          form.ticket_url || null,
      flyer_url:           form.flyer_url,
      description:         form.description || null,
      status:              form.status,
      featured_artist_ids: event?.featured_artist_ids ?? [],
    };

    const query = event
      ? supabase.from("events").update(payload).eq("id", event.id).select().single()
      : supabase.from("events").insert(payload).select().single();

    const { data, error: err } = await query;
    setSaving(false);

    if (err || !data) {
      setError(err?.message ?? "Save failed");
      return;
    }

    onSaved(data as Event);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl uppercase tracking-wider">
            {event ? "Edit Event" : "New Event"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <DashField label="Title" required>
            <DashInput
              required
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              onBlur={() => !form.slug && form.title && set("slug", autoSlug(form.title))}
            />
          </DashField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DashField label="Slug" required>
              <DashInput required value={form.slug} onChange={(e) => set("slug", e.target.value)} />
            </DashField>
            <DashField label="Status" required>
              <DashSelect
                value={form.status}
                onChange={(e) => set("status", e.target.value as Event["status"])}
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </DashSelect>
            </DashField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DashField label="Venue">
              <DashInput value={form.venue} onChange={(e) => set("venue", e.target.value)} />
            </DashField>
            <DashField label="City">
              <DashInput value={form.city} onChange={(e) => set("city", e.target.value)} />
            </DashField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DashField label="Date / Time" required>
              <DashInput
                type="datetime-local"
                required
                value={form.event_date}
                onChange={(e) => set("event_date", e.target.value)}
              />
            </DashField>
            <DashField label="Doors" hint="e.g. 8:00 PM">
              <DashInput value={form.doors_time} onChange={(e) => set("doors_time", e.target.value)} />
            </DashField>
          </div>

          <DashField label="Ticket URL">
            <DashInput type="url" value={form.ticket_url} onChange={(e) => set("ticket_url", e.target.value)} />
          </DashField>

          <DashField label="Description">
            <DashTextarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </DashField>

          <ImageUploader
            value={form.flyer_url}
            onChange={(url) => set("flyer_url", url)}
            prefix="events"
            label="Flyer"
          />

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-xs uppercase tracking-wider px-4 py-2 border border-white/10 hover:border-white/30 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="text-xs uppercase tracking-wider px-5 py-2 bg-electric text-black font-bold hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving…" : event ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
