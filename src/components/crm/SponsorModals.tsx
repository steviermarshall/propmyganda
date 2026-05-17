import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCrmAuth } from "@/hooks/use-crm-auth";
import { logActivity } from "@/lib/crm/activity";
import { useQueryClient, useQuery } from "@tanstack/react-query";

const STEVEN = "#d97000";

// ============================================================================
// Sponsor chooser — entry point for Steven's quick-add
// ============================================================================
export function SponsorChooser({
  open, onClose, onPick,
}: { open: boolean; onClose: () => void; onPick: (kind: "brand" | "contact" | "deal" | "activity") => void }) {
  const items = [
    { key: "brand",    label: "New Brand",     hint: "Company / sponsor record" },
    { key: "contact",  label: "New Contact",   hint: "Person at a brand" },
    { key: "deal",     label: "New Deal",      hint: "Pitch → contract → activation" },
    { key: "activity", label: "Log Activity",  hint: "Email · call · meeting · note" },
  ] as const;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-crm-surface border-white/10 text-white font-mono">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest text-sm" style={{ color: STEVEN }}>
            Quick Add — Sponsorships
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {items.map((it) => (
            <button
              key={it.key}
              onClick={() => { onPick(it.key); }}
              className="border border-white/10 bg-black/40 hover:border-[#d97000] p-4 text-left transition"
            >
              <div className="text-sm font-bold uppercase tracking-widest" style={{ color: STEVEN }}>{it.label}</div>
              <div className="text-[10px] text-white/40 mt-1">{it.hint}</div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Reusable inputs
// ============================================================================
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-widest text-white/40">{label}</label>
      {children}
    </div>
  );
}
const inputCls = "bg-black border border-white/10 text-white text-sm px-3 py-2 w-full";

// ============================================================================
// Brand Wizard — 4 steps
// ============================================================================
export function SponsorBrandWizard({
  open, onClose, initial,
}: { open: boolean; onClose: () => void; initial?: any }) {
  const { member } = useCrmAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<any>({
    name: "", parent_company: "", industry: "", logo_url: "",
    brand_guidelines_url: "", hq_location: "",
    regions: "", annual_budget_estimate: "", fiscal_year_end_month: "",
    activation_style: "", previous_sponsorships: "",
    target_age: "", target_gender: "", target_psychographics: "",
    tier: "tier_3", status: "cold", source: "", notes: "",
  });

  useEffect(() => {
    if (initial) setF({ ...f, ...initial });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  function set(k: string, v: string) { setF((p: any) => ({ ...p, [k]: v })); }

  async function submit() {
    if (!member) return;
    if (!f.name) { toast.error("Brand name required"); setStep(1); return; }
    setSaving(true);
    try {
      const payload = {
        name: f.name,
        parent_company: f.parent_company || null,
        industry: f.industry || null,
        logo_url: f.logo_url || null,
        brand_guidelines_url: f.brand_guidelines_url || null,
        hq_location: f.hq_location || null,
        regions: f.regions ? f.regions.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        annual_budget_estimate: f.annual_budget_estimate ? Number(f.annual_budget_estimate) : null,
        fiscal_year_end_month: f.fiscal_year_end_month ? Number(f.fiscal_year_end_month) : null,
        activation_style: f.activation_style ? f.activation_style.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        previous_sponsorships: f.previous_sponsorships ? f.previous_sponsorships.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        target_demo: {
          age: f.target_age || null,
          gender: f.target_gender || null,
          psychographics: f.target_psychographics || null,
        },
        tier: f.tier, status: f.status,
        source: f.source || null, notes: f.notes || null,
        owner_id: member.id,
      };
      const { data, error } = await (supabase.from("sponsor_brands") as any)
        .insert(payload).select().single();
      if (error) throw error;
      await logActivity(member.id, "sponsor_brand" as any, data.id, "created", { name: data.name });
      toast.success("Brand created");
      qc.invalidateQueries({ queryKey: ["sponsor-brands"] });
      onClose(); setStep(1);
      setF({
        name: "", parent_company: "", industry: "", logo_url: "",
        brand_guidelines_url: "", hq_location: "", regions: "",
        annual_budget_estimate: "", fiscal_year_end_month: "",
        activation_style: "", previous_sponsorships: "",
        target_age: "", target_gender: "", target_psychographics: "",
        tier: "tier_3", status: "cold", source: "", notes: "",
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-crm-surface border-white/10 text-white font-mono max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest text-sm flex items-center gap-3" style={{ color: STEVEN }}>
            New Brand <span className="text-white/40 text-[10px]">Step {step} / 4</span>
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-3">
            <Field label="Brand Name *"><input className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} autoFocus /></Field>
            <Field label="Parent Company"><input className={inputCls} value={f.parent_company} onChange={(e) => set("parent_company", e.target.value)} /></Field>
            <Field label="Industry / Vertical"><input className={inputCls} value={f.industry} onChange={(e) => set("industry", e.target.value)} placeholder="apparel, beverage, fintech…" /></Field>
            <Field label="Logo URL"><input className={inputCls} value={f.logo_url} onChange={(e) => set("logo_url", e.target.value)} /></Field>
            <Field label="Brand Guidelines URL"><input className={inputCls} value={f.brand_guidelines_url} onChange={(e) => set("brand_guidelines_url", e.target.value)} /></Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <Field label="HQ Location"><input className={inputCls} value={f.hq_location} onChange={(e) => set("hq_location", e.target.value)} /></Field>
            <Field label="Regions They Activate In (comma-separated)"><input className={inputCls} value={f.regions} onChange={(e) => set("regions", e.target.value)} placeholder="NA, EU, LATAM" /></Field>
            <Field label="Annual Marketing/Sponsorship Budget (USD est.)"><input type="number" className={inputCls} value={f.annual_budget_estimate} onChange={(e) => set("annual_budget_estimate", e.target.value)} /></Field>
            <Field label="Fiscal Year End Month (1-12) — dictates budget reset">
              <input type="number" min={1} max={12} className={inputCls} value={f.fiscal_year_end_month} onChange={(e) => set("fiscal_year_end_month", e.target.value)} />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <Field label="Target Demo — Age"><input className={inputCls} value={f.target_age} onChange={(e) => set("target_age", e.target.value)} placeholder="18-34" /></Field>
            <Field label="Target Demo — Gender Skew"><input className={inputCls} value={f.target_gender} onChange={(e) => set("target_gender", e.target.value)} /></Field>
            <Field label="Target Psychographics"><textarea className={inputCls} rows={2} value={f.target_psychographics} onChange={(e) => set("target_psychographics", e.target.value)} /></Field>
            <Field label="Previous Sponsorships (comma-separated)"><input className={inputCls} value={f.previous_sponsorships} onChange={(e) => set("previous_sponsorships", e.target.value)} /></Field>
            <Field label="Activation Style (comma-separated)"><input className={inputCls} value={f.activation_style} onChange={(e) => set("activation_style", e.target.value)} placeholder="experiential, content, product seeding" /></Field>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <Field label="Tier">
              <select className={inputCls} value={f.tier} onChange={(e) => set("tier", e.target.value)}>
                <option value="tier_1">Tier 1 — strategic</option>
                <option value="tier_2">Tier 2 — promising</option>
                <option value="tier_3">Tier 3 — cold</option>
              </select>
            </Field>
            <Field label="Status">
              <select className={inputCls} value={f.status} onChange={(e) => set("status", e.target.value)}>
                {["cold","prospecting","pitched","negotiating","active","lapsed","dead"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Source"><input className={inputCls} value={f.source} onChange={(e) => set("source", e.target.value)} placeholder="referral, conference, inbound…" /></Field>
            <Field label="Notes"><textarea className={inputCls} rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
          </div>
        )}

        <div className="flex justify-between pt-4 border-t border-white/5 mt-2">
          <button onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="px-4 py-2 text-[10px] uppercase tracking-widest border border-white/20 text-white/70">
            {step === 1 ? "Cancel" : "Back"}
          </button>
          {step < 4 ? (
            <button onClick={() => setStep(step + 1)}
              className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold text-black"
              style={{ backgroundColor: STEVEN }}>
              Next
            </button>
          ) : (
            <button onClick={submit} disabled={saving}
              className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold text-black disabled:opacity-50"
              style={{ backgroundColor: STEVEN }}>
              {saving ? "Saving…" : "Create Brand"}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Brand picker hook
// ============================================================================
function useBrands() {
  return useQuery({
    queryKey: ["sponsor-brands-picker"],
    queryFn: async () => {
      const { data } = await (supabase.from("sponsor_brands") as any)
        .select("id,name").order("name");
      return data ?? [];
    },
  });
}

// ============================================================================
// Contact Modal
// ============================================================================
export function SponsorContactModal({ open, onClose, brandId }: { open: boolean; onClose: () => void; brandId?: string }) {
  const { member } = useCrmAuth();
  const qc = useQueryClient();
  const { data: brands = [] } = useBrands();
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<any>({
    brand_id: brandId ?? "", name: "", title: "", department: "", email: "",
    phone: "", linkedin_url: "", decision_power: "influencer",
    touch_cadence_days: "30", comms_preference: "", personal_notes: "", birthday: "",
  });

  useEffect(() => { if (brandId) setF((p: any) => ({ ...p, brand_id: brandId })); }, [brandId]);

  async function submit() {
    if (!member) return;
    if (!f.brand_id) { toast.error("Pick a brand"); return; }
    if (!f.name) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      const payload = {
        brand_id: f.brand_id, name: f.name, title: f.title || null,
        department: f.department || null, email: f.email || null,
        phone: f.phone || null, linkedin_url: f.linkedin_url || null,
        decision_power: f.decision_power, comms_preference: f.comms_preference || null,
        touch_cadence_days: f.touch_cadence_days ? Number(f.touch_cadence_days) : null,
        personal_notes: f.personal_notes || null, birthday: f.birthday || null,
      };
      const { data, error } = await (supabase.from("sponsor_contacts") as any)
        .insert(payload).select().single();
      if (error) throw error;
      await logActivity(member.id, "sponsor_contact" as any, data.id, "created", { name: data.name });
      toast.success("Contact created");
      qc.invalidateQueries({ queryKey: ["sponsor-contacts"] });
      onClose();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-crm-surface border-white/10 text-white font-mono max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest text-sm" style={{ color: STEVEN }}>New Contact</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Brand *">
            <select className={inputCls} value={f.brand_id} onChange={(e) => setF({ ...f, brand_id: e.target.value })}>
              <option value="">— Select —</option>
              {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name *"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Title"><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
            <Field label="Department"><input className={inputCls} value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} /></Field>
            <Field label="Email"><input className={inputCls} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            <Field label="Phone"><input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
            <Field label="LinkedIn"><input className={inputCls} value={f.linkedin_url} onChange={(e) => setF({ ...f, linkedin_url: e.target.value })} /></Field>
            <Field label="Decision Power">
              <select className={inputCls} value={f.decision_power} onChange={(e) => setF({ ...f, decision_power: e.target.value })}>
                <option value="gatekeeper">Gatekeeper</option>
                <option value="influencer">Influencer</option>
                <option value="signer">Signer</option>
              </select>
            </Field>
            <Field label="Touch Cadence (days)"><input type="number" className={inputCls} value={f.touch_cadence_days} onChange={(e) => setF({ ...f, touch_cadence_days: e.target.value })} /></Field>
            <Field label="Comms Preference"><input className={inputCls} value={f.comms_preference} onChange={(e) => setF({ ...f, comms_preference: e.target.value })} placeholder="email, text, IG DM…" /></Field>
            <Field label="Birthday"><input type="date" className={inputCls} value={f.birthday} onChange={(e) => setF({ ...f, birthday: e.target.value })} /></Field>
          </div>
          <Field label="Personal Notes"><textarea className={inputCls} rows={2} value={f.personal_notes} onChange={(e) => setF({ ...f, personal_notes: e.target.value })} /></Field>
          <button onClick={submit} disabled={saving}
            className="w-full py-2 font-bold text-black uppercase tracking-widest text-xs disabled:opacity-50"
            style={{ backgroundColor: STEVEN }}>
            {saving ? "Saving…" : "Create Contact"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Deal Modal
// ============================================================================
export function SponsorDealModal({ open, onClose, brandId }: { open: boolean; onClose: () => void; brandId?: string }) {
  const { member } = useCrmAuth();
  const qc = useQueryClient();
  const { data: brands = [] } = useBrands();
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<any>({
    brand_id: brandId ?? "", stage: "intro", value: "", payment_terms: "",
    exclusivity_terms: "", start_date: "", end_date: "",
    renewal_window: "", renewal_probability: "",
    next_action: "", next_action_due: "", notes: "",
  });

  useEffect(() => { if (brandId) setF((p: any) => ({ ...p, brand_id: brandId })); }, [brandId]);

  async function submit() {
    if (!member) return;
    if (!f.brand_id) { toast.error("Pick a brand"); return; }
    setSaving(true);
    try {
      const payload = {
        brand_id: f.brand_id, stage: f.stage,
        value_cents: f.value ? Math.round(Number(f.value) * 100) : null,
        payment_terms: f.payment_terms || null,
        exclusivity_terms: f.exclusivity_terms || null,
        start_date: f.start_date || null, end_date: f.end_date || null,
        renewal_window: f.renewal_window || null,
        renewal_probability: f.renewal_probability ? Number(f.renewal_probability) : null,
        owner_id: member.id,
        next_action: f.next_action || null,
        next_action_due: f.next_action_due || null,
        notes: f.notes || null,
      };
      const { data, error } = await (supabase.from("sponsor_deals") as any)
        .insert(payload).select().single();
      if (error) throw error;
      await logActivity(member.id, "sponsor_deal" as any, data.id, "created", { stage: f.stage });
      toast.success("Deal created");
      qc.invalidateQueries({ queryKey: ["sponsor-deals"] });
      onClose();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setSaving(false); }
  }

  const STAGES = ["intro","pitch_sent","deck_reviewed","term_sheet","contract","signed","activated","wrapped","lost"];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-crm-surface border-white/10 text-white font-mono max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest text-sm" style={{ color: STEVEN }}>New Deal</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Brand *">
            <select className={inputCls} value={f.brand_id} onChange={(e) => setF({ ...f, brand_id: e.target.value })}>
              <option value="">— Select —</option>
              {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stage">
              <select className={inputCls} value={f.stage} onChange={(e) => setF({ ...f, stage: e.target.value })}>
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Value (USD)"><input type="number" className={inputCls} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></Field>
            <Field label="Start Date"><input type="date" className={inputCls} value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></Field>
            <Field label="End Date"><input type="date" className={inputCls} value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></Field>
            <Field label="Renewal Window"><input className={inputCls} value={f.renewal_window} onChange={(e) => setF({ ...f, renewal_window: e.target.value })} placeholder="60 days pre-end" /></Field>
            <Field label="Renewal Probability (%)"><input type="number" min={0} max={100} className={inputCls} value={f.renewal_probability} onChange={(e) => setF({ ...f, renewal_probability: e.target.value })} /></Field>
            <Field label="Next Action"><input className={inputCls} value={f.next_action} onChange={(e) => setF({ ...f, next_action: e.target.value })} /></Field>
            <Field label="Next Action Due"><input type="date" className={inputCls} value={f.next_action_due} onChange={(e) => setF({ ...f, next_action_due: e.target.value })} /></Field>
          </div>
          <Field label="Payment Terms"><input className={inputCls} value={f.payment_terms} onChange={(e) => setF({ ...f, payment_terms: e.target.value })} placeholder="50/50, NET30…" /></Field>
          <Field label="Exclusivity Terms"><textarea className={inputCls} rows={2} value={f.exclusivity_terms} onChange={(e) => setF({ ...f, exclusivity_terms: e.target.value })} placeholder="Category lockout: no competing apparel sponsors 60d" /></Field>
          <Field label="Notes"><textarea className={inputCls} rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
          <button onClick={submit} disabled={saving}
            className="w-full py-2 font-bold text-black uppercase tracking-widest text-xs disabled:opacity-50"
            style={{ backgroundColor: STEVEN }}>
            {saving ? "Saving…" : "Create Deal"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Activity Modal
// ============================================================================
export function SponsorActivityModal({
  open, onClose, brandId, dealId, contactId,
}: { open: boolean; onClose: () => void; brandId?: string; dealId?: string; contactId?: string }) {
  const { member } = useCrmAuth();
  const qc = useQueryClient();
  const { data: brands = [] } = useBrands();
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<any>({
    brand_id: brandId ?? "", deal_id: dealId ?? "", contact_id: contactId ?? "",
    activity_type: "email", summary: "", occurred_at: new Date().toISOString().slice(0, 16),
  });

  async function submit() {
    if (!member) return;
    if (!f.summary) { toast.error("Summary required"); return; }
    setSaving(true);
    try {
      const payload = {
        brand_id: f.brand_id || null,
        deal_id: f.deal_id || null,
        contact_id: f.contact_id || null,
        activity_type: f.activity_type,
        summary: f.summary,
        occurred_at: f.occurred_at ? new Date(f.occurred_at).toISOString() : new Date().toISOString(),
        created_by: member.id,
      };
      const { error } = await (supabase.from("sponsor_activities") as any).insert(payload);
      if (error) throw error;
      toast.success("Activity logged");
      qc.invalidateQueries({ queryKey: ["sponsor-activities"] });
      onClose();
      setF({ ...f, summary: "" });
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-crm-surface border-white/10 text-white font-mono max-w-lg">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest text-sm" style={{ color: STEVEN }}>Log Activity</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select className={inputCls} value={f.activity_type} onChange={(e) => setF({ ...f, activity_type: e.target.value })}>
                {["email","call","meeting","proposal","note","other"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="When"><input type="datetime-local" className={inputCls} value={f.occurred_at} onChange={(e) => setF({ ...f, occurred_at: e.target.value })} /></Field>
          </div>
          <Field label="Brand">
            <select className={inputCls} value={f.brand_id} onChange={(e) => setF({ ...f, brand_id: e.target.value })}>
              <option value="">— None —</option>
              {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="Summary *"><textarea className={inputCls} rows={4} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} placeholder="What happened? Outcome? Next step?" /></Field>
          <button onClick={submit} disabled={saving}
            className="w-full py-2 font-bold text-black uppercase tracking-widest text-xs disabled:opacity-50"
            style={{ backgroundColor: STEVEN }}>
            {saving ? "Saving…" : "Log Activity"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
