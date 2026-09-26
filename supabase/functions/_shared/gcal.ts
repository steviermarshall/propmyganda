// Shared Google Calendar access through the Lovable connector gateway.
export const GCAL_BASE = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

export function gcalHeaders(): Record<string, string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const GCAL_KEY = Deno.env.get("GOOGLE_CALENDAR_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
  if (!GCAL_KEY) throw new Error("GOOGLE_CALENDAR_API_KEY is not configured — connect Google Calendar");
  return {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": GCAL_KEY,
    "Content-Type": "application/json",
  };
}
