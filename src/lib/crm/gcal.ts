import { supabase } from "@/integrations/supabase/client";

export async function pushToGcal(entity_type: "shoot" | "deliverable", entity_id: string, opts: { delete?: boolean } = {}) {
  try {
    const { data, error } = await supabase.functions.invoke("gcal-push", {
      body: { entity_type, entity_id, delete: opts.delete },
    });
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn("gcal-push failed (non-fatal)", e);
    return null;
  }
}

export async function pullGcal() {
  const { data, error } = await supabase.functions.invoke("gcal-pull", { body: {} });
  if (error) throw error;
  return data as { ok: boolean; updated: number; deleted: number; skipped: number; total: number };
}

export async function getGcalSettings(): Promise<{ calendar_id: string; last_pull_at: string | null } | null> {
  const { data } = await (supabase.from("crm_settings") as any)
    .select("value").eq("key", "gcal").maybeSingle();
  return data?.value ?? null;
}
