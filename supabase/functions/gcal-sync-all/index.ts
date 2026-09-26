// Backfill: push every dated shoot, deliverable, booking and CRM booking (past + future)
// to Google Calendar, then pull Google-side changes back. Also run on a schedule.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(url, key);
    const body = await req.json().catch(() => ({}));
    const pullOnly = body?.pull_only === true;

    const call = (fn: string, payload: unknown) =>
      fetch(`${url}/functions/v1/${fn}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (r) => ({ ok: r.ok, text: r.ok ? "" : await r.text() }));

    let pushed = 0, failed = 0;
    const errors: string[] = [];
    if (!pullOnly) {
      const { data: synced } = await supabase.from("calendar_sync").select("entity_type,entity_id,last_error");
      const done = new Set((synced ?? []).filter((r: any) => !r.last_error).map((r: any) => `${r.entity_type}:${r.entity_id}`));
      const sources: [string, string, string][] = [
        ["shoot", "shoots", "scheduled_at"],
        ["deliverable", "deliverables", "due_at"],
        ["booking", "bookings", "event_at"],
        ["crm_booking", "crm_bookings", "shoot_date"],
      ];
      for (const [type, table, col] of sources) {
        const { data, error } = await supabase.from(table).select("id").not(col, "is", null);
        if (error) { errors.push(`${table}: ${error.message}`); continue; }
        for (const row of data ?? []) {
          if (done.has(`${type}:${row.id}`)) continue;
          const r = await call("gcal-push", { entity_type: type, entity_id: row.id });
          if (r.ok) pushed++; else { failed++; if (errors.length < 5) errors.push(r.text.slice(0, 200)); }
        }
      }
    }
    const pull = await call("gcal-pull", {});
    return new Response(JSON.stringify({ ok: true, pushed, failed, pulled: pull.ok, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("gcal-sync-all error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
