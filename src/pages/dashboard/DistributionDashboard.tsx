import { useEffect, useState } from "react";
import CrmLayout from "@/components/crm/CrmLayout";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type App = Database["public"]["Tables"]["distribution_applications"]["Row"];
type Artist = Database["public"]["Tables"]["artists"]["Row"];

const ACCENT = "#00F0FF";

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
    await supabase.from("distribution_applications").update({ status, reviewed_at: new Date().toISOString() } as never).eq("id", id);
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  return (
    <CrmLayout title="Distribution" accent={ACCENT}>
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/10">
          {(["applications", "artists"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-[10px] uppercase tracking-widest transition-colors ${
                tab === t
                  ? "border-b-2 -mb-px font-bold"
                  : "text-white/40 hover:text-white"
              }`}
              style={tab === t ? { color: ACCENT, borderColor: ACCENT } : {}}
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
              <div key={app.id} className="border border-white/10 bg-crm-surface p-5 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-sm uppercase tracking-wide">{app.artist_name}</p>
                    <p className="text-white/50 text-xs mt-0.5">{app.contact_name} · {app.email}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 border uppercase tracking-wider ${STATUS_STYLE[app.status ?? "pending"]}`}>
                    {app.status}
                  </span>
                </div>
                {app.genre && (
                  <p className="text-white/50 text-xs">{app.genre} · {app.monthly_listeners ?? "—"} monthly listeners</p>
                )}
                {app.message && (
                  <p className="text-white/60 text-sm border-l-2 border-white/10 pl-3 italic">{app.message}</p>
                )}
                {app.status === "pending" && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => updateStatus(app.id, "reviewing")}
                      className="text-[10px] uppercase tracking-wider px-3 py-1.5 border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 transition-colors"
                    >
                      Review
                    </button>
                    <button
                      onClick={() => updateStatus(app.id, "approved")}
                      className="text-[10px] uppercase tracking-wider px-3 py-1.5 border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => updateStatus(app.id, "rejected")}
                      className="text-[10px] uppercase tracking-wider px-3 py-1.5 border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors"
                    >
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {artists.length === 0 && <p className="text-white/40 text-sm">No artists yet.</p>}
            {artists.map((artist) => (
              <div key={artist.id} className="border border-white/10 bg-crm-surface p-4 flex items-center gap-4">
                {artist.image_url && (
                  <img src={artist.image_url} alt={artist.name} className="w-12 h-12 object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm uppercase tracking-wide truncate">{artist.name}</p>
                  <p className="text-white/40 text-xs">{artist.genre ?? "—"}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 border ${artist.active ? "border-green-500/40 text-green-400" : "border-white/10 text-white/30"}`}>
                  {artist.active ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </CrmLayout>
  );
}
