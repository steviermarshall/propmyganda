import { useEffect, useState } from "react";
import DashLayout from "@/components/dashboard/DashLayout";
import { DashField, DashInput } from "@/components/dashboard/DashField";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Settings = Database["public"]["Tables"]["site_settings"]["Row"];

const empty = {
  discord_invite_url: "",
  discord_server_id: "",
  instagram_url: "",
  twitter_url: "",
  youtube_url: "",
  tiktok_url: "",
  contact_email: "",
};

export default function SettingsDashboard() {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const s = data as Settings;
          setForm({
            discord_invite_url: s.discord_invite_url ?? "",
            discord_server_id:  s.discord_server_id ?? "",
            instagram_url:      s.instagram_url ?? "",
            twitter_url:        s.twitter_url ?? "",
            youtube_url:        s.youtube_url ?? "",
            tiktok_url:         s.tiktok_url ?? "",
            contact_email:      s.contact_email ?? "",
          });
        }
        setLoading(false);
      });
  }, []);

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      id: 1,
      discord_invite_url: form.discord_invite_url || null,
      discord_server_id:  form.discord_server_id || null,
      instagram_url:      form.instagram_url || null,
      twitter_url:        form.twitter_url || null,
      youtube_url:        form.youtube_url || null,
      tiktok_url:         form.tiktok_url || null,
      contact_email:      form.contact_email || null,
    };

    const { error: err } = await supabase.from("site_settings").upsert(payload);
    setSaving(false);
    if (err) {
      setError(err.message);
    } else {
      setSavedAt(new Date());
    }
  }

  return (
    <DashLayout title="Settings">
      {loading ? (
        <div className="text-white/40 text-sm">Loading…</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <section className="space-y-4">
            <div>
              <h2 className="text-xs uppercase tracking-widest text-electric mb-1">Discord</h2>
              <p className="text-[11px] text-white/40">Powers the World tab embed and join CTA.</p>
            </div>
            <DashField
              label="Server ID"
              hint="Discord → Server Settings → Widget → enable + copy ID"
            >
              <DashInput
                value={form.discord_server_id}
                onChange={(e) => set("discord_server_id", e.target.value)}
                placeholder="e.g. 1234567890123456789"
              />
            </DashField>
            <DashField label="Invite URL">
              <DashInput
                type="url"
                value={form.discord_invite_url}
                onChange={(e) => set("discord_invite_url", e.target.value)}
                placeholder="https://discord.gg/..."
              />
            </DashField>
          </section>

          <section className="space-y-4 pt-6 border-t border-white/10">
            <div>
              <h2 className="text-xs uppercase tracking-widest text-electric mb-1">Social</h2>
              <p className="text-[11px] text-white/40">Used in the social dock + footer.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DashField label="Instagram URL">
                <DashInput type="url" value={form.instagram_url} onChange={(e) => set("instagram_url", e.target.value)} />
              </DashField>
              <DashField label="Twitter / X URL">
                <DashInput type="url" value={form.twitter_url} onChange={(e) => set("twitter_url", e.target.value)} />
              </DashField>
              <DashField label="YouTube URL">
                <DashInput type="url" value={form.youtube_url} onChange={(e) => set("youtube_url", e.target.value)} />
              </DashField>
              <DashField label="TikTok URL">
                <DashInput type="url" value={form.tiktok_url} onChange={(e) => set("tiktok_url", e.target.value)} />
              </DashField>
            </div>
          </section>

          <section className="space-y-4 pt-6 border-t border-white/10">
            <div>
              <h2 className="text-xs uppercase tracking-widest text-electric mb-1">Contact</h2>
            </div>
            <DashField label="Public Contact Email">
              <DashInput
                type="email"
                value={form.contact_email}
                onChange={(e) => set("contact_email", e.target.value)}
              />
            </DashField>
          </section>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex items-center gap-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="text-xs uppercase tracking-wider px-6 py-2.5 bg-electric text-black font-bold hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Settings"}
            </button>
            {savedAt && (
              <p className="text-[10px] text-white/40 uppercase tracking-widest">
                Saved at {savedAt.toLocaleTimeString()}
              </p>
            )}
          </div>
        </form>
      )}
    </DashLayout>
  );
}
