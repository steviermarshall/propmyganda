import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashLayout from "@/components/dashboard/DashLayout";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  artists: number;
  events: number;
  publications: number;
  distApps: number;
  sponsorLeads: number;
}

function StatCard({ label, value, to, accent }: { label: string; value: number; to: string; accent?: boolean }) {
  return (
    <Link
      to={to}
      className={`block border p-6 hover:border-electric transition-colors ${
        accent ? "border-electric bg-electric/5" : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <p className="text-3xl font-display">{value}</p>
      <p className="text-xs text-white/50 uppercase tracking-widest mt-1">{label}</p>
    </Link>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ artists: 0, events: 0, publications: 0, distApps: 0, sponsorLeads: 0 });

  useEffect(() => {
    Promise.all([
      supabase.from("artists").select("id", { count: "exact", head: true }),
      supabase.from("events").select("id", { count: "exact", head: true }),
      supabase.from("publications").select("id", { count: "exact", head: true }),
      supabase.from("distribution_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("sponsorship_leads").select("id", { count: "exact", head: true }).eq("stage", "new"),
    ]).then(([a, e, p, d, s]) => {
      setStats({
        artists:      a.count ?? 0,
        events:       e.count ?? 0,
        publications: p.count ?? 0,
        distApps:     d.count ?? 0,
        sponsorLeads: s.count ?? 0,
      });
    });
  }, []);

  return (
    <DashLayout title="Admin Overview">
      <div className="space-y-8">
        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Artists"       value={stats.artists}      to="/dashboard/distribution" />
          <StatCard label="Events"        value={stats.events}       to="/dashboard/marketing" />
          <StatCard label="Publications"  value={stats.publications} to="/dashboard/marketing" />
          <StatCard label="New Dist Apps" value={stats.distApps}     to="/dashboard/distribution" accent={stats.distApps > 0} />
          <StatCard label="New Leads"     value={stats.sponsorLeads} to="/dashboard/sponsorships" accent={stats.sponsorLeads > 0} />
        </div>

        {/* Quick links */}
        <div>
          <h2 className="text-xs text-white/40 uppercase tracking-widest mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Distribution Queue", path: "/dashboard/distribution" },
              { label: "Sponsorship Leads",  path: "/dashboard/sponsorships" },
              { label: "Social Metrics",     path: "/dashboard/marketing" },
              { label: "Visit Public Site",  path: "/" },
            ].map((a) => (
              <Link
                key={a.path}
                to={a.path}
                className="border border-white/10 px-4 py-3 text-xs uppercase tracking-wider text-white/60 hover:text-white hover:border-white/30 transition-colors"
              >
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashLayout>
  );
}
