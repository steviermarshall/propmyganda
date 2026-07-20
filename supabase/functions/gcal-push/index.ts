// Push a PMG shoot, deliverable, booking or crm_booking to Google Calendar.
// Uses a Google service account — no third-party gateway required.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { getAccessToken } from "../_shared/google-auth.ts";
import { corsHeaders, jsonResponse, requireTeamMember } from "../_shared/auth.ts";

const GCAL_BASE = "https://www.googleapis.com/calendar/v3";

const BodySchema = z.object({
  entity_type: z.enum(["shoot", "deliverable", "booking", "crm_booking"]),
  entity_id: z.string().uuid(),
  delete: z.boolean().optional(),
});

// Derive a Google colorId from any string (e.g. assignee id)
function colorFor(id: string | null | undefined): string {
  if (!id) return "8";
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return String((h % 11) + 1);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SA_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!SA_JSON) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Any authenticated CRM team member may sync their entities.
    const caller = await requireTeamMember(req, supabase);
    if (caller instanceof Response) return caller;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return jsonResponse({ error: parsed.error.flatten() }, 400);
    }
    const { entity_type, entity_id, delete: del } = parsed.data;

    const accessToken = await getAccessToken(SA_JSON);
    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    const { data: settings } = await supabase
      .from("crm_settings").select("value").eq("key", "gcal").maybeSingle();
    const calendarId: string = settings?.value?.calendar_id || "primary";

    const { data: syncRow } = await supabase
      .from("calendar_sync")
      .select("*")
      .eq("entity_type", entity_type)
      .eq("entity_id", entity_id)
      .maybeSingle();

    // Handle delete
    if (del) {
      if (syncRow?.google_event_id) {
        await fetch(
          `${GCAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${syncRow.google_event_id}`,
          { method: "DELETE", headers: authHeaders },
        );
        await supabase.from("calendar_sync").delete().eq("id", syncRow.id);
      }
      return new Response(JSON.stringify({ ok: true, deleted: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load entity and build event fields
    let summary = "";
    let description = "";
    let startISO: string | null = null;
    let endISO: string | null = null;
    let assignee: string | null = null;

    if (entity_type === "shoot") {
      const { data: s } = await supabase.from("shoots").select("*").eq("id", entity_id).maybeSingle();
      if (!s) throw new Error("Shoot not found");
      summary = `🎬 ${s.title || "Shoot"}`;
      description = [s.location && `📍 ${s.location}`, s.notes].filter(Boolean).join("\n\n");
      startISO = s.scheduled_at || s.shoot_date;
      if (startISO) {
        const end = new Date(startISO); end.setHours(end.getHours() + (s.duration_hours || 2));
        endISO = end.toISOString();
      }
      assignee = s.assigned_editor_id || null;

    } else if (entity_type === "deliverable") {
      const { data: d } = await supabase.from("deliverables")
        .select("*, team_members:assigned_to(name)").eq("id", entity_id).maybeSingle();
      if (!d) throw new Error("Deliverable not found");
      summary = `✂️ ${d.title || "Deliverable"}`;
      description = [
        d.objective && `Objective: ${d.objective}`,
        d.expected_runtime_sec && `Expected: ${d.expected_runtime_sec}s`,
        d.priority && `Priority: ${d.priority}`,
        d.editor_notes,
      ].filter(Boolean).join("\n");
      startISO = d.due_at;
      if (startISO) {
        const end = new Date(startISO); end.setMinutes(end.getMinutes() + 30);
        endISO = end.toISOString();
      }
      assignee = d.assigned_to || null;

    } else if (entity_type === "booking") {
      const { data: b } = await supabase.from("bookings").select("*").eq("id", entity_id).maybeSingle();
      if (!b) throw new Error("Booking not found");
      const label = b.artist_name || b.name || "Booking";
      summary = `📅 ${b.service?.toUpperCase() ?? "BOOKING"} — ${label}${b.is_free ? " (free)" : ""}`;
      description = [b.location && `📍 ${b.location}`].filter(Boolean).join("\n");
      startISO = b.event_at || (b.event_date ? new Date(b.event_date).toISOString() : null);
      if (startISO) {
        const end = new Date(startISO); end.setHours(end.getHours() + 4);
        endISO = end.toISOString();
      }

    } else {
      // crm_booking
      const { data: c } = await supabase.from("crm_bookings").select("*").eq("id", entity_id).maybeSingle();
      if (!c) throw new Error("CRM Booking not found");
      summary = `📋 ${c.artist_name} — ${c.status}`;
      description = [
        c.package && `Package: ${c.package}`,
        c.amount_quoted && `Amount: $${c.amount_quoted}`,
      ].filter(Boolean).join("\n");
      startISO = c.shoot_date ? new Date(c.shoot_date).toISOString() : null;
      if (startISO) {
        const end = new Date(startISO); end.setHours(end.getHours() + 4);
        endISO = end.toISOString();
      }
    }

    if (!startISO) {
      return new Response(JSON.stringify({ skipped: "no date" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventPayload = {
      summary,
      description,
      start: { dateTime: new Date(startISO).toISOString() },
      end: { dateTime: new Date(endISO || startISO).toISOString() },
      colorId: colorFor(assignee),
      extendedProperties: {
        private: { pmg_source: entity_type, pmg_id: entity_id },
      },
    };

    const isUpdate = !!syncRow?.google_event_id;
    const url = isUpdate
      ? `${GCAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${syncRow.google_event_id}`
      : `${GCAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events`;

    const resp = await fetch(url, {
      method: isUpdate ? "PATCH" : "POST",
      headers: authHeaders,
      body: JSON.stringify(eventPayload),
    });
    const data = await resp.json();

    if (!resp.ok) {
      await supabase.from("calendar_sync").upsert({
        entity_type, entity_id,
        google_event_id: syncRow?.google_event_id || "pending",
        google_calendar_id: calendarId,
        last_error: `[${resp.status}] ${JSON.stringify(data).slice(0, 500)}`,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: "entity_type,entity_id" });
      throw new Error(`Google Calendar API [${resp.status}]: ${JSON.stringify(data)}`);
    }

    await supabase.from("calendar_sync").upsert({
      entity_type, entity_id,
      google_event_id: data.id,
      google_calendar_id: calendarId,
      etag: data.etag,
      event_html_link: data.htmlLink,
      last_synced_at: new Date().toISOString(),
      sync_direction: "push",
      last_error: null,
    }, { onConflict: "entity_type,entity_id" });

    return new Response(JSON.stringify({ ok: true, event: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("gcal-push error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
