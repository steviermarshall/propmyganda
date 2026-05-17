import { supabase } from "@/integrations/supabase/client";

function fmtError(error: any, data: any): string {
  // supabase.functions.invoke returns FunctionsHttpError with `context`
  // that holds the upstream Response — read its body for the real reason.
  if (data?.error) return String(data.error);
  if (error?.context?.response) {
    try {
      // best-effort sync read of the cached body
      const body = (error.context as any).body;
      if (body) return typeof body === "string" ? body : JSON.stringify(body);
    } catch { /* ignore */ }
  }
  return error?.message ?? "Unknown error";
}

export async function pushToGcal(entity_type: "shoot" | "deliverable" | "booking", entity_id: string, opts: { delete?: boolean } = {}) {
  try {
    const { data, error } = await supabase.functions.invoke("gcal-push", {
      body: { entity_type, entity_id, delete: opts.delete },
    });
    if (error) throw new Error(fmtError(error, data));
    return data;
  } catch (e) {
    console.warn("gcal-push failed (non-fatal)", e);
    return null;
  }
}

export async function pullGcal() {
  const { data, error } = await supabase.functions.invoke("gcal-pull", { body: {} });
  if (error) {
    // Try to extract the real upstream error message
    let detail = error.message;
    try {
      const ctx: any = (error as any).context;
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
  const { data } = await (supabase.from("crm_settings") as any)
    .select("value").eq("key", "gcal").maybeSingle();
  return data?.value ?? null;
}
