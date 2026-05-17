import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import CrmLayout from "@/components/crm/CrmLayout";
import KpiCard from "@/components/crm/KpiCard";
import KanbanBoard from "@/components/crm/KanbanBoard";
import { useCrmAuth } from "@/hooks/use-crm-auth";
import { daysSince, todayISO } from "@/lib/crm/dates";
import { logActivity } from "@/lib/crm/activity";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  SponsorChooser, SponsorBrandWizard, SponsorContactModal,
  SponsorDealModal, SponsorActivityModal,
} from "@/components/crm/SponsorModals";

const STEVEN = "#d97000";

const DEAL_STAGES = [
  { key: "intro",          label: "Intro" },
  { key: "pitch_sent",     label: "Pitch Sent" },
  { key: "deck_reviewed",  label: "Deck Reviewed" },
  { key: "term_sheet",     label: "Term Sheet" },
  { key: "contract",       label: "Contract" },
  { key: "signed",         label: "Signed" },
  { key: "activated",      label: "Activated" },
  { key: "wrapped",        label: "Wrapped" },
];

const TIER_COLORS: Record<string, string> = {
  tier_1: "#F5FF00", tier_2: "#d97000", tier_3: "#666",
};

export default function StevenDashboard() {
  const qc = useQueryClient();
  const { member } = useCrmAuth();
  const today = todayISO();

  const [chooserOpen, setChooserOpen] = useState(false);
  const [brandWizOpen, setBrandWizOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [dealOpen, setDealOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [focusBrand, setFocusBrand] = useState<string | undefined>();
  const [brandFilter, setBrandFilter] = useState<{ tier?: string; status?: string }>({});
  const [pipelineFilter, setPipelineFilter] = useState<string | null>(null);

  // ---------- queries ----------
  const { data: brands = [] } = useQuery({
    queryKey: ["sponsor-brands"],
    queryFn: async () => {
      const { data } = await (supabase.from("sponsor_brands") as any)
        .select("*").order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["sponsor-contacts"],
    queryFn: async () => {
      const { data } = await (supabase.from("sponsor_contacts") as any)
        .select("*, sponsor_brands(name)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["sponsor-deals"],
    queryFn: async () => {
      const { data } = await (supabase.from("sponsor_deals") as any)
        .select("*, sponsor_brands(name, tier)").order("updated_at", { ascending: false }).limit(300);
      return data ?? [];
    },
  });

  const { data: deliverables = [] } = useQuery({
    queryKey: ["sponsor-deliverables"],
    queryFn: async () => {
      const { data } = await (supabase.from("sponsor_deliverables") as any)
        .select("*, sponsor_deals(*, sponsor_brands(name))")
        .order("due_date", { ascending: true, nullsFirst: false });
      return data ?? [];
    },
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["sponsor-activities"],
    queryFn: async () => {
      const { data } = await (supabase.from("sponsor_activities") as any)
        .select("*, sponsor_brands(name)")
        .order("occurred_at", { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  // ---------- derived ----------
  const dueTouches = contacts.filter((c: any) => c.next_touch_at && c.next_touch_at.slice(0, 10) <= today);
  const activeDeals = deals.filter((d: any) => !["wrapped", "lost"].includes(d.stage));
  const pipelineValue = activeDeals.reduce((acc: number, d: any) => acc + Number(d.value_cents ?? 0), 0) / 100;
  const signedThisMonth = deals.filter((d: any) =>
    ["signed","activated","wrapped"].includes(d.stage) &&
    d.updated_at?.slice(0, 7) === today.slice(0, 7)
  ).length;
  const overdueDeliverables = deliverables.filter((d: any) =>
    !d.completed_at && d.due_date && d.due_date < today);

  // ---------- actions ----------
  async function moveDeal(item: any, next: string) {
    qc.setQueryData(["sponsor-deals"], (old: any[] = []) =>
      old.map((r) => r.id === item.id ? { ...r, stage: next } : r));
    const { error } = await (supabase.from("sponsor_deals") as any)
      .update({ stage: next }).eq("id", item.id);
    if (error) { toast.error("Move failed"); qc.invalidateQueries({ queryKey: ["sponsor-deals"] }); return; }
    await logActivity(member?.id, "sponsor_deal" as any, item.id, "status_changed", { from: item.stage, to: next });
  }

  async function bumpTouch(contactId: string, days: number) {
    const next = new Date(); next.setDate(next.getDate() + days);
    const patch = { last_touch_at: new Date().toISOString(), next_touch_at: next.toISOString() };
    const { error } = await (supabase.from("sponsor_contacts") as any).update(patch).eq("id", contactId);
    if (error) { toast.error("Failed"); return; }
    toast.success("Touch logged");
    qc.invalidateQueries({ queryKey: ["sponsor-contacts"] });
  }

  function handlePick(kind: "brand" | "contact" | "deal" | "activity") {
    setChooserOpen(false);
    setFocusBrand(undefined);
    if (kind === "brand") setBrandWizOpen(true);
    if (kind === "contact") setContactOpen(true);
    if (kind === "deal") setDealOpen(true);
    if (kind === "activity") setActivityOpen(true);
  }

  return (
    <CrmLayout
      title="Steven's Dashboard"
      accent={STEVEN}
      quickAdd="sponsor"
      onQuickAddClick={() => setChooserOpen(true)}
    >
      {/* KPIs */}
      <section>
        <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-4">Pipeline Snapshot</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard label="Active Brands" value={brands.filter((b: any) => !["dead","lapsed"].includes(b.status)).length} accent={STEVEN} />
          <KpiCard label="Active Deals" value={activeDeals.length} accent={STEVEN} />
          <KpiCard label="Pipeline $" value={`$${Math.round(pipelineValue).toLocaleString()}`} accent={STEVEN} />
          <KpiCard label="Signed MTD" value={signedThisMonth} accent={STEVEN} />
          <KpiCard label="Overdue Deliverables" value={overdueDeliverables.length} accent={STEVEN} />
        </div>
      </section>

      {/* Touch reminders */}
      <section className="border border-white/10 bg-crm-surface p-6">
        <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-3">
          Touch Reminders — {dueTouches.length} due
        </p>
        {dueTouches.length === 0 ? (
          <p className="text-white/40 text-sm">All caught up.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {dueTouches.slice(0, 10).map((c: any) => (
              <div key={c.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="text-sm">{c.name} <span className="text-white/40">· {c.sponsor_brands?.name}</span></div>
                  <div className="text-[10px] text-white/40 uppercase tracking-widest">
                    {c.title ?? "—"} · {c.decision_power} · {daysSince(c.last_touch_at)}d since last
                  </div>
                </div>
                <button onClick={() => bumpTouch(c.id, c.touch_cadence_days ?? 30)}
                  className="px-3 py-1 text-[10px] uppercase tracking-widest font-bold text-black"
                  style={{ backgroundColor: STEVEN }}>
                  Touched
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Main tabs */}
      <Tabs defaultValue="pipeline">
        <TabsList className="bg-black border border-white/10">
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="brands">Brands ({brands.length})</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
          <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
          <TabsTrigger value="activations">Activations</TabsTrigger>
          <TabsTrigger value="feed">Activity</TabsTrigger>
        </TabsList>

        {/* Pipeline kanban */}
        <TabsContent value="pipeline" className="mt-3">
          <FilterChips
            label="Tier"
            value={pipelineFilter}
            onChange={setPipelineFilter}
            options={[
              { value: "tier_1", label: "T1" },
              { value: "tier_2", label: "T2" },
              { value: "tier_3", label: "T3" },
            ]}
            accent={STEVEN}
          />
          <KanbanBoard
            accent={STEVEN}
            columns={DEAL_STAGES}
            items={deals
              .filter((d: any) => !pipelineFilter || d.sponsor_brands?.tier === pipelineFilter)
              .map((d: any) => ({
                id: d.id, stage: d.stage, updatedAt: d.updated_at, raw: d,
              }))}
            onMove={(it: any, next) => moveDeal(it.raw, next)}
            renderCard={(it: any) => (
              <div className="space-y-1">
                <div className="text-sm font-bold">{it.raw.sponsor_brands?.name ?? "—"}</div>
                <div className="text-[10px] text-white/40">
                  ${Number(it.raw.value_cents ?? 0) / 100 > 0 ? (it.raw.value_cents / 100).toLocaleString() : "—"}
                </div>
                {it.raw.next_action && (
                  <div className="text-[10px] text-white/50 truncate">→ {it.raw.next_action}</div>
                )}
                <div className="text-[10px] text-white/30">{daysSince(it.raw.updated_at)}d in stage</div>
              </div>
            )}
          />
        </TabsContent>

        {/* Brands */}
        <TabsContent value="brands" className="mt-3">
          <div className="border border-white/10 bg-crm-surface overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-black/40 text-[9px] uppercase tracking-widest text-white/40">
                <tr>
                  <th className="text-left p-2">Brand</th>
                  <th className="text-left p-2">Industry</th>
                  <th className="text-left p-2">Tier</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Budget</th>
                  <th className="text-left p-2">FY End</th>
                  <th className="text-left p-2"></th>
                </tr>
              </thead>
              <tbody>
                {brands.map((b: any) => (
                  <tr key={b.id} className="border-t border-white/5 hover:bg-black/30">
                    <td className="p-2 font-bold">{b.name}{b.parent_company && <span className="text-white/40 text-[10px] block">↳ {b.parent_company}</span>}</td>
                    <td className="p-2 text-white/70">{b.industry ?? "—"}</td>
                    <td className="p-2">
                      <span className="text-[10px] font-bold uppercase" style={{ color: TIER_COLORS[b.tier] }}>
                        {b.tier?.replace("tier_", "T") ?? "—"}
                      </span>
                    </td>
                    <td className="p-2 text-white/70 text-xs">{b.status}</td>
                    <td className="p-2 text-white/70">{b.annual_budget_estimate ? `$${Number(b.annual_budget_estimate).toLocaleString()}` : "—"}</td>
                    <td className="p-2 text-white/70">{b.fiscal_year_end_month ? `M${b.fiscal_year_end_month}` : "—"}</td>
                    <td className="p-2 text-right">
                      <button onClick={() => { setFocusBrand(b.id); setDealOpen(true); }}
                        className="text-[10px] uppercase tracking-widest text-white/60 hover:text-white">+ Deal</button>
                      <button onClick={() => { setFocusBrand(b.id); setContactOpen(true); }}
                        className="text-[10px] uppercase tracking-widest text-white/60 hover:text-white ml-3">+ Contact</button>
                    </td>
                  </tr>
                ))}
                {brands.length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-white/40 text-sm">No brands yet. Hit + to add one.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Contacts */}
        <TabsContent value="contacts" className="mt-3">
          <div className="border border-white/10 bg-crm-surface overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-black/40 text-[9px] uppercase tracking-widest text-white/40">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Brand</th>
                  <th className="text-left p-2">Title</th>
                  <th className="text-left p-2">Power</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Next Touch</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c: any) => (
                  <tr key={c.id} className="border-t border-white/5 hover:bg-black/30">
                    <td className="p-2 font-bold">{c.name}</td>
                    <td className="p-2 text-white/70">{c.sponsor_brands?.name ?? "—"}</td>
                    <td className="p-2 text-white/70">{c.title ?? "—"}</td>
                    <td className="p-2 text-white/70 text-[10px] uppercase">{c.decision_power ?? "—"}</td>
                    <td className="p-2 text-white/70 text-xs">{c.email ?? "—"}</td>
                    <td className="p-2 text-white/70 text-xs">{c.next_touch_at?.slice(0, 10) ?? "—"}</td>
                  </tr>
                ))}
                {contacts.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-white/40 text-sm">No contacts yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Deals */}
        <TabsContent value="deals" className="mt-3">
          <div className="border border-white/10 bg-crm-surface overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-black/40 text-[9px] uppercase tracking-widest text-white/40">
                <tr>
                  <th className="text-left p-2">Brand</th>
                  <th className="text-left p-2">Stage</th>
                  <th className="text-left p-2">Value</th>
                  <th className="text-left p-2">Start</th>
                  <th className="text-left p-2">End</th>
                  <th className="text-left p-2">Next Action</th>
                  <th className="text-left p-2">Due</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((d: any) => (
                  <tr key={d.id} className="border-t border-white/5 hover:bg-black/30">
                    <td className="p-2 font-bold">{d.sponsor_brands?.name ?? "—"}</td>
                    <td className="p-2 text-[10px] uppercase tracking-widest" style={{ color: STEVEN }}>{d.stage}</td>
                    <td className="p-2 text-white/70">{d.value_cents ? `$${(d.value_cents / 100).toLocaleString()}` : "—"}</td>
                    <td className="p-2 text-white/70 text-xs">{d.start_date ?? "—"}</td>
                    <td className="p-2 text-white/70 text-xs">{d.end_date ?? "—"}</td>
                    <td className="p-2 text-white/70 text-xs truncate max-w-[200px]">{d.next_action ?? "—"}</td>
                    <td className="p-2 text-white/70 text-xs">{d.next_action_due ?? "—"}</td>
                  </tr>
                ))}
                {deals.length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-white/40 text-sm">No deals yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Activations / deliverables */}
        <TabsContent value="activations" className="mt-3">
          <div className="border border-white/10 bg-crm-surface p-4">
            {deliverables.length === 0 ? (
              <p className="text-white/40 text-sm">No deliverables yet. Add them inside a deal.</p>
            ) : (
              <div className="divide-y divide-white/5">
                {deliverables.map((d: any) => {
                  const overdue = !d.completed_at && d.due_date && d.due_date < today;
                  return (
                    <div key={d.id} className="py-2 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">{d.description}</div>
                        <div className="text-[10px] text-white/40">
                          {d.sponsor_deals?.sponsor_brands?.name ?? "—"} ·
                          {" "}due {d.due_date ?? "—"} · {d.recap_status}
                        </div>
                      </div>
                      <span className={`text-[10px] uppercase tracking-widest ${overdue ? "text-red-400" : "text-white/50"}`}>
                        {d.completed_at ? "done" : overdue ? "overdue" : "open"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Activity Feed */}
        <TabsContent value="feed" className="mt-3">
          <div className="border border-white/10 bg-crm-surface p-4">
            {activities.length === 0 ? (
              <p className="text-white/40 text-sm">Nothing logged yet.</p>
            ) : (
              <div className="divide-y divide-white/5">
                {activities.map((a: any) => (
                  <div key={a.id} className="py-2">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/40">
                      <span style={{ color: STEVEN }}>{a.activity_type}</span>
                      <span>·</span>
                      <span>{a.sponsor_brands?.name ?? "—"}</span>
                      <span>·</span>
                      <span>{new Date(a.occurred_at).toLocaleString()}</span>
                    </div>
                    <div className="text-sm text-white/80 mt-1">{a.summary}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <SponsorChooser open={chooserOpen} onClose={() => setChooserOpen(false)} onPick={handlePick} />
      <SponsorBrandWizard open={brandWizOpen} onClose={() => setBrandWizOpen(false)} />
      <SponsorContactModal open={contactOpen} onClose={() => { setContactOpen(false); setFocusBrand(undefined); }} brandId={focusBrand} />
      <SponsorDealModal open={dealOpen} onClose={() => { setDealOpen(false); setFocusBrand(undefined); }} brandId={focusBrand} />
      <SponsorActivityModal open={activityOpen} onClose={() => setActivityOpen(false)} />
    </CrmLayout>
  );
}
