import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function fmtError(error: unknown, data: unknown): string {
  // supabase.functions.invoke returns FunctionsHttpError with `context`
  // that holds the upstream Response — read its body for the real reason.
  const d = data as { error?: unknown } | null;
  const e = error as { context?: { response?: unknown; body?: unknown }; message?: string } | null;
  if (d?.error) return String(d.error);
  if (e?.context?.response) {
    try {
      // best-effort sync read of the cached body
      const body = e.context.body;
      if (body) return typeof body === "string" ? body : JSON.stringify(body);
    } catch { /* ignore */ }
  }
  return e?.message ?? "Unknown error";
}

export async function pushToGcal(entity_type: "shoot" | "deliverable" | "booking" | "crm_booking", entity_id: string, opts: { delete?: boolean } = {}) {
  try {
    const { data, error } = await supabase.functions.invoke("gcal-push", {
      body: { entity_type, entity_id, delete: opts.delete },
    });
    if (error) throw new Error(fmtError(error, data));
    return data;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.warn("gcal-push failed (non-fatal)", msg);
    toast.warning(`Calendar sync failed: ${msg}`, {
      duration: 8000,
      description: "Data was saved. Check Supabase Function secrets if this persists.",
    });
    return null;
  }
}

export async function pullGcal() {
  const { data, error } = await supabase.functions.invoke("gcal-pull", { body: {} });
  if (error) {
    // Try to extract the real upstream error message
    let detail = error.message;
    try {
      const ctx = (error as { context?: { json?: () => Promise<{ error?: string }>; text?: () => Promise<string> } }).context;
      if (ctx?.json) {
        const j = await ctx.json();
        if (j?.error) detail = j.error;
      } else if (ctx?.text) {
        const t = await ctx.text();
        if (t) detail = t;
      }
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  return data as { ok: boolean; updated: number; deleted: number; skipped: number; total: number };
}

export async function getGcalSettings(): Promise<{ calendar_id: string; last_pull_at: string | null } | null> {
  const { data } = await supabase.from("crm_settings")
    .select("value").eq("key", "gcal").maybeSingle();
  return (data?.value as { calendar_id: string; last_pull_at: string | null } | undefined) ?? null;
}

export interface GcalRawEvent {
  id: string;
  summary: string;
  description: string | null;
  location: string | null;
  start: string;
  end: string;
  htmlLink: string;
  isPmg: boolean;
  pmgSource: string | null;
  pmgId: string | null;
  colorId: string | null;
}

export async function listGcalEvents(timeMin?: string, timeMax?: string): Promise<GcalRawEvent[]> {
  const { data, error } = await supabase.functions.invoke("gcal-events", {
    body: { timeMin, timeMax },
  });
  if (error) {
    console.warn("gcal-events failed", error);
    return [];
  }
  return (data?.events ?? []) as GcalRawEvent[];
}
