import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import CrmLayout from "@/components/crm/CrmLayout";
import KpiCard from "@/components/crm/KpiCard";
import KanbanBoard from "@/components/crm/KanbanBoard";
import { useCrmAuth } from "@/hooks/use-crm-auth";
import { startOfWeek, todayISO, addDaysISO, daysSince } from "@/lib/crm/dates";
import { logActivity } from "@/lib/crm/activity";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STEVEN = "#d97000";

const SPONSOR_COLS = [
  { key: "lead",            label: "Lead" },
  { key: "pitched",         label: "Pitched" },
  { key: "replied",         label: "Replied" },
  { key: "discovery_call",  label: "Discovery" },
  { key: "proposal",        label: "Proposal" },
  { key: "closed",          label: "Closed" },
  { key: "lost",            label: "Lost" },
];

const STAGE_FOLLOWUP: Record<string, number | null> = {
  pitched: 3, replied: 2, discovery_call: 7, proposal: 5,
  lead: null, closed: null, lost: null,
};

export default function StevenDashboard() {
  const qc = useQueryClient();
  const { member } = useCrmAuth();
  const weekStart = startOfWeek().toISOString();
  const today = todayISO();
  const [shipModal, setShipModal] = useState<{ id: string; orderNum: string | null } | null>(null);
  const [tracking, setTracking] = useState("");
  const [carrier, setCarrier] = useState("USPS");

  const { data: kpis } = useQuery({
    queryKey: ["steven-kpis", weekStart],
    queryFn: async () => {
      const [activity, orders] = await Promise.all([
        (supabase.from("activity_log") as any).select("entity_type,action,payload,created_at")
          .eq("entity_type", "sponsor_pipeline").gte("created_at", weekStart),
        (supabase.from("store_orders") as any).select("fulfillment_status,shipped_at").gte("shipped_at", weekStart),
      ]);
      const pitches = (activity.data ?? []).filter((a: any) =>
        a.action === "status_changed" && (a.payload as any)?.to === "pitched");
      // Need category — fetch sponsor rows in pitches
      const ids = pitches.map((p: any) => (p.payload as any)?.id).filter(Boolean);
      let sponsors: any[] = [];
      if (ids.length > 0) {
        const { data } = await (supabase.from("sponsor_pipeline") as any).select("id,category").in("id", ids);
        sponsors = data ?? [];
      }
      const catCount = (cat: string) => sponsors.filter((s: any) => s.category === cat).length;
      const ordersFulfilled = (orders.data ?? []).filter((o: any) => o.fulfillment_status === "shipped").length;
      return {
        total: pitches.length,
        brand: catCount("brand"),
        event: catCount("event"),
        publication: catCount("publication"),
        ordersFulfilled,
      };
    },
  });

  const { data: dueToday = [] } = useQuery({
    queryKey: ["steven-today", today, member?.id],
    enabled: !!member,
    queryFn: async () => {
      const { data } = await (supabase.from("sponsor_pipeline") as any)
        .select("*").eq("assigned_to", member!.id).eq("next_followup_date", today);
      return data ?? [];
    },
  });

  const { data: sponsors = [] } = useQuery({
    queryKey: ["steven-sponsors"],
    queryFn: async () => {
      const { data } = await (supabase.from("sponsor_pipeline") as any)
        .select("*").order("updated_at", { ascending: false }).limit(300);
      return data ?? [];
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["steven-orders"],
    queryFn: async () => {
      const { data } = await (supabase.from("store_orders") as any)
        .select("*").in("fulfillment_status", ["to_ship", "shipped"])
        .order("ordered_at", { ascending: true });
      return data ?? [];
    },
  });

  async function markContacted(s: any) {
    const patch = { last_contact_date: today, next_followup_date: addDaysISO(3) };
    qc.setQueryData(["steven-today", today, member?.id], (old: any[] = []) => old.filter((r) => r.id !== s.id));
    const { error } = await (supabase.from("sponsor_pipeline") as any).update(patch).eq("id", s.id);
    if (error) { toast.error("Failed"); qc.invalidateQueries({ queryKey: ["steven-today"] }); return; }
    await logActivity(member?.id, "sponsor_pipeline", s.id, "contacted", patch);
    toast.success("Marked contacted");
  }

  async function moveSponsor(item: any, next: string) {
    const days = STAGE_FOLLOWUP[next];
    const patch: any = { stage: next };
    if (days !== null) patch.next_followup_date = addDaysISO(days);
    qc.setQueryData(["steven-sponsors"], (old: any[] = []) =>
      old.map((r) => (r.id === item.id ? { ...r, ...patch } : r)));
    const { error } = await (supabase.from("sponsor_pipeline") as any).update(patch).eq("id", item.id);
    if (error) { toast.error("Move failed"); qc.invalidateQueries({ queryKey: ["steven-sponsors"] }); return; }
    await logActivity(member?.id, "sponsor_pipeline", item.id, "status_changed", { id: item.id, from: item.stage, to: next });
  }

  async function confirmShip() {
    if (!shipModal) return;
    const id = shipModal.id;
    const patch = {
      fulfillment_status: "shipped",
      tracking_number: tracking || null,
      shipping_carrier: carrier || null,
      shipped_at: new Date().toISOString(),
    };
    qc.setQueryData(["steven-orders"], (old: any[] = []) =>
      old.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const { error } = await (supabase.from("store_orders") as any).update(patch).eq("id", id);
    if (error) { toast.error("Failed"); qc.invalidateQueries({ queryKey: ["steven-orders"] }); return; }
    await logActivity(member?.id, "store_order", id, "status_changed", patch);
    toast.success("Marked shipped");
    setShipModal(null);
    setTracking("");
  }

  const toShip = orders.filter((o: any) => o.fulfillment_status === "to_ship");
  const shippedToday = orders.filter(
    (o: any) => o.fulfillment_status === "shipped" && o.shipped_at?.slice(0, 10) === today
  );

  return (
    <CrmLayout title="Steven's Dashboard" accent={STEVEN} quickAdd="sponsor">
      <section>
        <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-4">This Week</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard label="Total Pitches" value={kpis?.total ?? "—"} accent={STEVEN} />
          <KpiCard label="Brand"         value={kpis?.brand ?? "—"} target="4 tgt" accent={STEVEN} />
          <KpiCard label="Event"         value={kpis?.event ?? "—"} target="3 tgt" accent={STEVEN} />
          <KpiCard label="Publication"   value={kpis?.publication ?? "—"} target="3 tgt" accent={STEVEN} />
          <KpiCard label="Orders Shipped" value={kpis?.ordersFulfilled ?? "—"} accent={STEVEN} />
        </div>
      </section>

      <section className="border border-white/10 bg-crm-surface p-6">
        <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-3">Follow-Ups Due Today</p>
        {dueToday.length === 0 ? (
          <p className="text-white/40 text-sm">No follow-ups due. You're clear.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {dueToday.map((s: any) => (
              <div key={s.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="text-sm">{s.brand_name}</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-widest">
                    {s.category} · {s.stage} · {daysSince(s.last_contact_date)}d since last
                  </div>
                </div>
                <button onClick={() => markContacted(s)}
                  className="px-3 py-1 text-[10px] uppercase tracking-widest font-bold text-black"
                  style={{ backgroundColor: STEVEN }}>
                  Contacted
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-3">Sponsor Pipeline</p>
        <Tabs defaultValue="brand">
          <TabsList className="bg-black border border-white/10">
            <TabsTrigger value="brand">Brand</TabsTrigger>
            <TabsTrigger value="event">Event</TabsTrigger>
            <TabsTrigger value="publication">Publication</TabsTrigger>
          </TabsList>
          {(["brand", "event", "publication"] as const).map((cat) => (
            <TabsContent key={cat} value={cat} className="mt-3">
              <KanbanBoard
                accent={STEVEN}
                columns={SPONSOR_COLS}
                items={sponsors
                  .filter((s: any) => s.category === cat)
                  .map((s: any) => ({
                    id: s.id, stage: s.stage, updatedAt: s.updated_at,
                    staleStages: ["discovery_call", "proposal"], raw: s,
                  }))}
                onMove={(it: any, next) => moveSponsor(it.raw, next)}
                renderCard={(it: any) => (
                  <div className="space-y-1">
                    <div className="text-sm font-bold">{it.raw.brand_name}</div>
                    <div className="text-[10px] text-white/40">
                      {it.raw.contact_name ?? "—"} · ${Number(it.raw.pitch_amount ?? 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-white/30">{daysSince(it.raw.updated_at)}d in stage</div>
                  </div>
                )}
              />
            </TabsContent>
          ))}
        </Tabs>
      </section>

      <section className="border border-white/10 bg-crm-surface p-6">
        <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-3">
          Store Fulfillment — {toShip.length} to ship
        </p>
        {toShip.length === 0 ? (
          <p className="text-white/40 text-sm">Queue clear.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {toShip.map((o: any) => (
              <div key={o.id} className="py-2 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    {o.order_number ?? o.id.slice(0, 8)} · {o.customer_name ?? "—"}
                  </div>
                  <div className="text-[10px] text-white/40">
                    {o.product_name} {o.variant ? `· ${o.variant}` : ""} · ${Number(o.amount ?? 0).toLocaleString()} · {daysSince(o.ordered_at)}d ago
                  </div>
                </div>
                <button
                  onClick={() => setShipModal({ id: o.id, orderNum: o.order_number })}
                  className="px-3 py-1 text-[10px] uppercase tracking-widest font-bold text-black"
                  style={{ backgroundColor: STEVEN }}
                >
                  Ship
                </button>
              </div>
            ))}
          </div>
        )}

        {shippedToday.length > 0 && (
          <>
            <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mt-6 mb-2">Shipped Today</p>
            <div className="divide-y divide-white/5">
              {shippedToday.map((o: any) => (
                <div key={o.id} className="py-2 text-xs flex justify-between">
                  <span>{o.order_number ?? o.id.slice(0, 8)} · {o.customer_name}</span>
                  <span className="text-white/40">{o.shipping_carrier} · {o.tracking_number ?? "—"}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <Dialog open={!!shipModal} onOpenChange={(v) => !v && setShipModal(null)}>
        <DialogContent className="bg-crm-surface border-white/10 text-white font-mono">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-widest text-sm" style={{ color: STEVEN }}>
              Mark Shipped {shipModal?.orderNum ? `— ${shipModal.orderNum}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-white/40">Carrier</label>
              <select value={carrier} onChange={(e) => setCarrier(e.target.value)}
                className="bg-black border border-white/10 text-white text-sm px-3 py-2 w-full mt-1">
                {["USPS", "UPS", "FedEx", "DHL", "Other"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-white/40">Tracking #</label>
              <input value={tracking} onChange={(e) => setTracking(e.target.value)}
                className="bg-black border border-white/10 text-white text-sm px-3 py-2 w-full mt-1" />
            </div>
            <button onClick={confirmShip}
              className="w-full py-2 font-bold text-black uppercase tracking-widest text-xs"
              style={{ backgroundColor: STEVEN }}>
              Confirm Shipment
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </CrmLayout>
  );
}
