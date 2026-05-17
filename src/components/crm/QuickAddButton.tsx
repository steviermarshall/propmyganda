import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCrmAuth } from "@/hooks/use-crm-auth";
import { logActivity } from "@/lib/crm/activity";
import { useQueryClient } from "@tanstack/react-query";
import { addDaysISO } from "@/lib/crm/dates";
import { pushToGcal } from "@/lib/crm/gcal";
import DistroIntakeWizard from "./DistroIntakeWizard";

export type QuickAddEntity =
  | "booking"
  | "prospect"
  | "distro"
  | "sponsor"
  | "shoot";

interface Props {
  entity: QuickAddEntity;
  accent: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function QuickAddButton({ entity, accent, open, onOpenChange }: Props) {
  return (
    <>
      <button
        onClick={() => onOpenChange(true)}
        title="Quick add (⌘N)"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full text-3xl font-bold text-black flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
        style={{ backgroundColor: accent }}
      >
        +
      </button>
      {entity === "distro" ? (
        <DistroIntakeWizard open={open} onClose={() => onOpenChange(false)} accent={accent} />
      ) : (
        <QuickAddModal entity={entity} accent={accent} open={open} onClose={() => onOpenChange(false)} />
      )}
    </>
  );
}

function QuickAddModal({
  entity,
  accent,
  open,
  onClose,
}: {
  entity: QuickAddEntity;
  accent: string;
  open: boolean;
  onClose: () => void;
}) {
  const { member } = useCrmAuth();
  const qc = useQueryClient();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const schema = SCHEMAS[entity];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!member) {
      toast.error("You must be signed in to add records");
      return;
    }
    setSaving(true);
    try {
      const payload = schema.build(fields, member.id);
      const { data, error } = await (supabase.from(schema.table) as any)
        .insert(payload)
        .select()
        .single();
      if (error) {
        const detail = [error.message, error.details, error.hint].filter(Boolean).join(" · ");
        throw new Error(detail || "Database insert failed");
      }
      await logActivity(member.id, schema.entityType as any, data.id, "created", payload);
      if (schema.afterInsert) await schema.afterInsert(data, member.id);

      // Auto-push to Google Calendar for entities with a date
      if (entity === "shoot") {
        pushToGcal("shoot", data.id);
      } else if (entity === "booking" && data.shoot_date) {
        pushToGcal("crm_booking", data.id);
      }

      toast.success(`${schema.label} created`);
      qc.invalidateQueries();
      setFields({});
      onClose();
    } catch (err: any) {
      console.error("QuickAdd insert error:", err);
      toast.error(err?.message ?? "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-crm-surface border-white/10 text-white font-mono">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest text-sm" style={{ color: accent }}>
            New {schema.label}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {schema.fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-white/40">{f.label}</label>
              {f.type === "select" ? (
                <select
                  value={fields[f.key] ?? f.options?.[0]?.value ?? ""}
                  onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })}
                  className="bg-black border border-white/10 text-white text-sm px-3 py-2 w-full"
                >
                  {f.options!.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type}
                  value={fields[f.key] ?? ""}
                  onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })}
                  required={f.required}
                  autoFocus={f.key === schema.fields[0].key}
                  className="bg-black border border-white/10 text-white text-sm px-3 py-2 w-full"
                />
              )}
            </div>
          ))}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 font-bold text-black uppercase tracking-widest text-xs mt-2 disabled:opacity-50"
            style={{ backgroundColor: accent }}
          >
            {saving ? "Creating…" : "Create"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type Field = {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  required?: boolean;
  options?: { value: string; label: string }[];
};

const SCHEMAS: Record<
  QuickAddEntity,
  {
    label: string;
    table: string;
    entityType: string;
    fields: Field[];
    build: (f: Record<string, string>, memberId: string) => Record<string, any>;
    afterInsert?: (row: any, memberId: string) => Promise<void>;
  }
> = {
  booking: {
    label: "Booking",
    table: "crm_bookings",
    entityType: "crm_booking",
    fields: [
      { key: "artist_name", label: "Artist", type: "text", required: true },
      { key: "shoot_date",  label: "Shoot Date (optional)", type: "date" },
      {
        key: "package", label: "Package", type: "select",
        options: [
          { value: "550", label: "$550" },
          { value: "1000", label: "$1,000" },
          { value: "1500_premium", label: "$1,500 Premium" },
        ],
      },
      {
        key: "source", label: "Source", type: "select",
        options: [
          { value: "inbound", label: "Inbound" },
          { value: "outbound", label: "Outbound" },
          { value: "repeat", label: "Repeat" },
        ],
      },
    ],
    build: (f, memberId) => ({
      artist_name: f.artist_name,
      shoot_date: f.shoot_date || null,
      package: f.package || "550",
      source: f.source || "inbound",
      status: "inquiry",
      assigned_to: memberId,
      stripe_deposit_paid: false,
    }),
  },
  prospect: {
    label: "Prospect",
    table: "artist_prospects",
    entityType: "artist_prospect",
    fields: [
      { key: "name", label: "Artist Name", type: "text", required: true },
      { key: "ig_handle", label: "IG Handle", type: "text" },
      {
        key: "intended_lane", label: "Intended Lane", type: "select",
        options: [
          { value: "booking", label: "Booking" },
          { value: "distro_jv", label: "Distro JV" },
          { value: "distro_pure", label: "Distro Pure" },
          { value: "media_agency", label: "Media Agency" },
        ],
      },
    ],
    build: (f, memberId) => ({
      name: f.name,
      ig_handle: f.ig_handle || null,
      intended_lane: f.intended_lane || "booking",
      outreach_status: "cold",
      assigned_to: memberId,
    }),
  },
  distro: {
    label: "Distro Artist",
    table: "distro_artists",
    entityType: "distro_artist",
    fields: [
      { key: "artist_name", label: "Artist Name", type: "text", required: true },
      { key: "artist_contact", label: "Contact", type: "text" },
      {
        key: "side", label: "Side", type: "select",
        options: [
          { value: "jv_owned", label: "JV Owned" },
          { value: "pure_service", label: "Pure Service" },
        ],
      },
    ],
    build: (f, memberId) => ({
      artist_name: f.artist_name,
      artist_contact: f.artist_contact || null,
      side: f.side || "pure_service",
      onboarding_status: "intake",
      publishing_owned: false,
      admin_rights: false,
      onboarded_by: memberId,
    }),
  },
  sponsor: {
    label: "Sponsor Brand",
    table: "sponsor_brands",
    entityType: "sponsor_brand",
    fields: [
      { key: "name", label: "Brand Name", type: "text", required: true },
      { key: "industry", label: "Industry", type: "text" },
      {
        key: "tier", label: "Tier", type: "select",
        options: [
          { value: "tier_1", label: "Tier 1 (Top)" },
          { value: "tier_2", label: "Tier 2" },
          { value: "tier_3", label: "Tier 3" },
        ],
      },
      {
        key: "status", label: "Status", type: "select",
        options: [
          { value: "cold",        label: "Cold" },
          { value: "prospecting", label: "Prospecting" },
          { value: "pitched",     label: "Pitched" },
          { value: "negotiating", label: "Negotiating" },
          { value: "active",      label: "Active" },
        ],
      },
    ],
    build: (f, memberId) => ({
      name: f.name,
      industry: f.industry || null,
      tier: f.tier || "tier_3",
      status: f.status || "cold",
      owner_id: memberId,
    }),
  },
  shoot: {
    label: "Shoot",
    table: "shoots",
    entityType: "shoot",
    fields: [
      { key: "artist_name", label: "Artist", type: "text", required: true },
      { key: "shoot_date", label: "Date", type: "date", required: true },
      { key: "shoot_window", label: "Window (e.g. 2-6pm)", type: "text" },
      { key: "location", label: "Location", type: "text" },
      {
        key: "shoot_type", label: "Type", type: "select",
        options: [
          { value: "pmg_booking", label: "PMG Booking" },
          { value: "media_agency", label: "Media Agency" },
        ],
      },
    ],
    build: (f, memberId) => ({
      artist_name: f.artist_name,
      shoot_date: f.shoot_date || addDaysISO(0),
      shoot_window: f.shoot_window || null,
      location: f.location || null,
      shoot_type: f.shoot_type || "pmg_booking",
      status: "scheduled",
      shooter: memberId,
    }),
    afterInsert: async (row) => {
      const formats = row.shoot_type === "media_agency"
        ? ["Music Video", "Creative Content", "Short-form", "Interview"]
        : ["1 Mic Performance", "Crazy Story", "Show & Tell", "Long-form YouTube"];
      const rows = formats.map((format) => ({
        shoot_id: row.id,
        format,
        status: "filmed",
        upload_urls: {},
      }));
      await (supabase.from("deliverables") as any).insert(rows);
    },
  },
};
