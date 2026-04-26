import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import ImageUploader from "./ImageUploader";
import { DashField, DashInput, DashTextarea, DashSelect } from "./DashField";

type Pub = Database["public"]["Tables"]["publications"]["Row"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pub: Pub | null;
  onSaved: (pub: Pub) => void;
}

const CATEGORIES: Pub["category"][] = ["Business", "Artists", "Culture", "Milestones", "Industry"];

const empty = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  cover_url: null as string | null,
  category: "Culture" as Pub["category"],
  author: "",
  featured: false,
  publish: true,
};

export default function PublicationDialog({ open, onOpenChange, pub, onSaved }: Props) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pub) {
      setForm({
        title:     pub.title,
        slug:      pub.slug,
        excerpt:   pub.excerpt ?? "",
        body:      pub.body ?? "",
        cover_url: pub.cover_url,
        category:  pub.category,
        author:    pub.author ?? "",
        featured:  pub.featured,
        publish:   !!pub.published_at,
      });
    } else {
      setForm(empty);
    }
    setError(null);
  }, [pub, open]);

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function autoSlug(title: string) {
    return title.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      title:        form.title,
      slug:         form.slug || autoSlug(form.title),
      excerpt:      form.excerpt || null,
      body:         form.body || null,
      cover_url:    form.cover_url,
      category:     form.category,
      author:       form.author || null,
      featured:     form.featured,
      published_at: form.publish ? (pub?.published_at ?? new Date().toISOString()) : null,
    };

    const query = pub
      ? supabase.from("publications").update(payload).eq("id", pub.id).select().single()
      : supabase.from("publications").insert(payload).select().single();

    const { data, error: err } = await query;
    setSaving(false);

    if (err || !data) {
      setError(err?.message ?? "Save failed");
      return;
    }

    onSaved(data as Pub);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl uppercase tracking-wider">
            {pub ? "Edit Article" : "New Article"}
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
            <DashField label="Category" required>
              <DashSelect
                value={form.category}
                onChange={(e) => set("category", e.target.value as Pub["category"])}
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </DashSelect>
            </DashField>
          </div>

          <DashField label="Author">
            <DashInput value={form.author} onChange={(e) => set("author", e.target.value)} />
          </DashField>

          <DashField label="Excerpt" hint="Short summary shown in listings">
            <DashTextarea rows={2} value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
          </DashField>

          <DashField label="Body">
            <DashTextarea rows={8} value={form.body} onChange={(e) => set("body", e.target.value)} />
          </DashField>

          <ImageUploader
            value={form.cover_url}
            onChange={(url) => set("cover_url", url)}
            prefix="publications"
            label="Cover Image"
          />

          <div className="flex items-center gap-6 pt-2 border-t border-white/10">
            <label className="flex items-center gap-2 text-xs uppercase tracking-wider">
              <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} />
              Featured
            </label>
            <label className="flex items-center gap-2 text-xs uppercase tracking-wider">
              <input type="checkbox" checked={form.publish} onChange={(e) => set("publish", e.target.checked)} />
              Published
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
              {saving ? "Saving…" : pub ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
