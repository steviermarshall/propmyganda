import { useEffect, useState } from "react";
import DashLayout from "@/components/dashboard/DashLayout";
import ArtistDialog from "@/components/dashboard/ArtistDialog";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { artistImage } from "@/lib/fallback-assets";

type App = Database["public"]["Tables"]["distribution_applications"]["Row"];
type Artist = Database["public"]["Tables"]["artists"]["Row"];

const STATUS_STYLE: Record<string, string> = {
  pending:   "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  reviewing: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  approved:  "bg-green-500/10 text-green-400 border-green-500/30",
  rejected:  "bg-red-500/10 text-red-400 border-red-500/30",
};

export default function DistributionDashboard() {
  const [apps, setApps] = useState<App[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [tab, setTab] = useState<"applications" | "artists">("applications");
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<Artist | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("distribution_applications").select("*").order("submitted_at", { ascending: false }),
      supabase.from("artists").select("*").order("name"),
    ]).then(([a, ar]) => {
      setApps((a.data ?? []) as App[]);
      setArtists((ar.data ?? []) as Artist[]);
      setLoading(false);
    });
  }, []);

  async function updateStatus(id: string, status: App["status"]) {
    await supabase.from("distribution_applications").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(artist: Artist) {
    setEditing(artist);
    setDialogOpen(true);
  }

  function handleSaved(saved: Artist) {
    setArtists((prev) => {
      const exists = prev.some((a) => a.id === saved.id);
      if (exists) return prev.map((a) => (a.id === saved.id ? saved : a));
      return [...prev, saved].sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  async function handleDelete(artist: Artist) {
    if (!confirm(`Remove ${artist.name}? This deletes all their releases too.`)) return;
    const { error } = await supabase.from("artists").delete().eq("id", artist.id);
    if (error) {
      alert(`Delete failed: ${error.message}`);
      return;
    }
    setArtists((prev) => prev.filter((a) => a.id !== artist.id));
  }

  return (
    <DashLayout title="Distribution">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/10">
          {(["applications", "artists"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs uppercase tracking-widest transition-colors ${
                tab === t ? "text-electric border-b-2 border-electric -mb-px" : "text-white/40 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading && <div className="text-white/40 text-sm">Loading…</div>}

        {/* Applications */}
        {!loading && tab === "applications" && (
          <div className="space-y-3">
            {apps.length === 0 && <p className="text-white/40 text-sm">No applications yet.</p>}
            {apps.map((app) => (
              <div key={app.id} className="border border-white/10 bg-white/[0.02] p-5 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-sm uppercase tracking-wide">{app.artist_name}</p>
                    <p className="text-white/50 text-xs mt-0.5">{app.contact_name} · {app.email}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 border uppercase tracking-wider ${STATUS_STYLE[app.status]}`}>
                    {app.status}
                  </span>
                </div>
                {app.genre && <p className="text-white/50 text-xs">{app.genre} · {app.monthly_listeners ?? "—"} monthly listeners</p>}
                {app.message && <p className="text-white/60 text-sm border-l-2 border-white/10 pl-3 italic">{app.message}</p>}
                {app.status === "pending" && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => updateStatus(app.id, "reviewing")} className="text-[10px] uppercase tracking-wider px-3 py-1.5 border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 transition-colors">
                      Review
                    </button>
                    <button onClick={() => updateStatus(app.id, "approved")} className="text-[10px] uppercase tracking-wider px-3 py-1.5 border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-colors">
                      Approve
                    </button>
                    <button onClick={() => updateStatus(app.id, "rejected")} className="text-[10px] uppercase tracking-wider px-3 py-1.5 border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors">
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Artists */}
        {!loading && tab === "artists" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-xs uppercase tracking-widest text-white/40">{artists.length} artists</p>
              <button
                onClick={openNew}
                className="text-xs uppercase tracking-wider px-4 py-2 bg-electric text-black font-bold hover:opacity-80 transition-opacity"
              >
                + Add Artist
              </button>
            </div>

            {artists.length === 0 && (
              <p className="text-white/40 text-sm">No artists yet.</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {artists.map((artist) => (
                <div key={artist.id} className="border border-white/10 bg-white/[0.02] p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={artistImage(artist.slug, artist.image_url)}
                      alt={artist.name}
                      className="w-12 h-12 object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm uppercase tracking-wide truncate">{artist.name}</p>
                      <p className="text-white/40 text-xs truncate">{artist.genre ?? "—"}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 border shrink-0 ${artist.active ? "border-green-500/40 text-green-400" : "border-white/10 text-white/30"}`}>
                      {artist.active ? "Active" : "Off"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(artist)}
                      className="flex-1 text-[10px] uppercase tracking-wider px-3 py-1.5 border border-white/20 hover:border-white/40 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(artist)}
                      className="text-[10px] uppercase tracking-wider px-3 py-1.5 border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Del
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ArtistDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        artist={editing}
        onSaved={handleSaved}
      />
    </DashLayout>
  );
}
