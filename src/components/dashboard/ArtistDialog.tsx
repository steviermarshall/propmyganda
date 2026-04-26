import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import ImageUploader from "./ImageUploader";
import { DashField, DashInput, DashTextarea } from "./DashField";

type Artist = Database["public"]["Tables"]["artists"]["Row"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artist: Artist | null;
  onSaved: (artist: Artist) => void;
}

const empty = {
  slug: "",
  name: "",
  genre: "",
  bio: "",
  image_url: null as string | null,
  spotify_url: "",
  apple_music_url: "",
  youtube_url: "",
  soundcloud_url: "",
  instagram_url: "",
  featured: false,
  active: true,
};

export default function ArtistDialog({ open, onOpenChange, artist, onSaved }: Props) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (artist) {
      setForm({
        slug:            artist.slug,
        name:            artist.name,
        genre:           artist.genre ?? "",
        bio:             artist.bio ?? "",
        image_url:       artist.image_url,
        spotify_url:     artist.spotify_url ?? "",
        apple_music_url: artist.apple_music_url ?? "",
        youtube_url:     artist.youtube_url ?? "",
        soundcloud_url:  artist.soundcloud_url ?? "",
        instagram_url:   artist.instagram_url ?? "",
        featured:        artist.featured,
        active:          artist.active,
      });
    } else {
      setForm(empty);
    }
    setError(null);
  }, [artist, open]);

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function autoSlug(name: string) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      slug:            form.slug || autoSlug(form.name),
      name:            form.name,
      genre:           form.genre || null,
      bio:             form.bio || null,
      image_url:       form.image_url,
      spotify_url:     form.spotify_url || null,
      apple_music_url: form.apple_music_url || null,
      youtube_url:     form.youtube_url || null,
      soundcloud_url:  form.soundcloud_url || null,
      instagram_url:   form.instagram_url || null,
      featured:        form.featured,
      active:          form.active,
    };

    const query = artist
      ? supabase.from("artists").update(payload).eq("id", artist.id).select().single()
      : supabase.from("artists").insert(payload).select().single();

    const { data, error: err } = await query;
    setSaving(false);

    if (err || !data) {
      setError(err?.message ?? "Save failed");
      return;
    }

    onSaved(data as Artist);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl uppercase tracking-wider">
            {artist ? "Edit Artist" : "Add Artist"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DashField label="Name" required>
              <DashInput
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                onBlur={() => !form.slug && form.name && set("slug", autoSlug(form.name))}
              />
            </DashField>
            <DashField label="Slug" required hint="URL identifier (lowercase, dashes)">
              <DashInput required value={form.slug} onChange={(e) => set("slug", e.target.value)} />
            </DashField>
          </div>

          <DashField label="Genre">
            <DashInput value={form.genre} onChange={(e) => set("genre", e.target.value)} />
          </DashField>

          <DashField label="Bio">
            <DashTextarea rows={4} value={form.bio} onChange={(e) => set("bio", e.target.value)} />
          </DashField>

          <ImageUploader
            value={form.image_url}
            onChange={(url) => set("image_url", url)}
            prefix="artists"
            label="Hero Image"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/10">
            <DashField label="Spotify URL">
              <DashInput value={form.spotify_url} onChange={(e) => set("spotify_url", e.target.value)} />
            </DashField>
            <DashField label="Apple Music URL">
              <DashInput value={form.apple_music_url} onChange={(e) => set("apple_music_url", e.target.value)} />
            </DashField>
            <DashField label="YouTube URL">
              <DashInput value={form.youtube_url} onChange={(e) => set("youtube_url", e.target.value)} />
            </DashField>
            <DashField label="SoundCloud URL">
              <DashInput value={form.soundcloud_url} onChange={(e) => set("soundcloud_url", e.target.value)} />
            </DashField>
            <DashField label="Instagram URL">
              <DashInput value={form.instagram_url} onChange={(e) => set("instagram_url", e.target.value)} />
            </DashField>
          </div>

          <div className="flex items-center gap-6 pt-2 border-t border-white/10">
            <label className="flex items-center gap-2 text-xs uppercase tracking-wider">
              <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} />
              Featured
            </label>
            <label className="flex items-center gap-2 text-xs uppercase tracking-wider">
              <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
              Active
            </label>
          </div>

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
              {saving ? "Saving…" : artist ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
