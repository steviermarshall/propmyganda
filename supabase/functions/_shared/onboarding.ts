// Pure helpers for the onboarding flow (no Deno globals): row mapping for the
// two Google Sheets, slot generation, Stripe form encoding and signature parsing.
import { formatUsd, getTier } from "./tiers.ts";

export interface OrderRow {
  id: string;
  created_at: string;
  catalogue_no: string | null;
  tier: string;
  ad_budget_cents: number;
  total_cents: number;
  payment_plan: string;
  due_now_cents: number;
  status: string;
  artist_name: string;
  legal_name: string;
  email: string;
  phone: string | null;
  instagram_handle: string | null;
  instagram_url: string | null;
  instagram_followers: number | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  track_title: string | null;
  explicit: boolean;
  wants_distribution: boolean;
  pro_affiliation: string | null;
  ipi_number: string | null;
  distro_email: string | null;
  producer_name: string | null;
  producer_stage_name: string | null;
  producer_pro: string | null;
  producer_ipi: string | null;
  producer_email: string | null;
  report_preference: string | null;
  notes: string | null;
  uploads: { name: string; path: string; size: number; url?: string }[] | null;
  post_at: string | null;
  session_at: string | null;
  agreement_accepted: boolean;
  signature: string | null;
}

export function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return { first: parts[0] ?? "", last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

export function sheetTimestamp(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/**
 * One row for "The PMG DSP Release Agreement Form: (Responses)", columns A–Z,
 * in the exact order of that sheet.
 */
export function distributionRow(o: OrderRow): string[] {
  const { first, last } = splitName(o.legal_name);
  const producer = o.producer_name ? splitName(o.producer_name) : { first: "", last: "" };
  return [
    sheetTimestamp(o.created_at),                           // A Timestamp
    `From propmyganda.com/start · ${o.tier.toUpperCase()} · ${o.catalogue_no ?? ""}`, // B NOTES
    "Yes",                                                  // C standard DSP title approved
    o.email,                                                // D Email
    first,                                                  // E First Name
    last,                                                   // F Last Name
    o.artist_name,                                          // G Stage Name
    o.pro_affiliation ?? "",                                // H Artist PRO
    o.ipi_number ?? "",                                     // I IPI
    o.distro_email ?? o.email,                              // J Email (distro)
    o.email,                                                // K Email (agreements)
    "",                                                     // L Additional artists
    producer.first,                                         // M Producer first
    producer.last,                                          // N Producer last
    o.producer_stage_name ?? "",                            // O Producer stage
    o.producer_pro ?? "",                                   // P Producer PRO
    o.producer_ipi ?? "",                                   // Q Producer IPI
    o.producer_email ?? "",                                 // R Producer distro email
    o.producer_email ?? "",                                 // S Producer agreements email
    "",                                                     // T Additional producers
    "No",                                                   // U Alternate splits requested
    "",                                                     // V Split details
    "Yes",                                                  // W Contributors agreed
    o.agreement_accepted ? "Yes" : "No",                    // X Agreement accepted
    o.signature ?? o.legal_name,                            // Y Signature
    "Not Scheduled",                                        // Z Status
  ];
}

/** Header + row for the video editing sheet. Reorder here to match your columns. */
export const EDITING_COLUMNS = [
  "Date", "Catalogue", "Artist", "Tier", "Track", "Explicit", "Post date", "Session", "Files",
  "Instagram", "TikTok", "YouTube", "Email", "Phone", "Ad budget", "Total", "Paid now", "Report", "Status", "Order ID",
];

export function editingRow(o: OrderRow): string[] {
  const tier = getTier(o.tier);
  return [
    sheetTimestamp(o.created_at),
    o.catalogue_no ?? "",
    o.artist_name,
    tier?.name ?? o.tier,
    o.track_title ?? "",
    o.explicit ? "Yes" : "No",
    o.post_at ? o.post_at.slice(0, 10) : "",
    o.session_at ? o.session_at.replace("T", " ").slice(0, 16) : "",
    (o.uploads ?? []).map((u) => u.url ?? u.path).join("\n"),
    o.instagram_url ?? o.instagram_handle ?? "",
    o.tiktok_url ?? "",
    o.youtube_url ?? "",
    o.email,
    o.phone ?? "",
    o.ad_budget_cents ? formatUsd(o.ad_budget_cents) : "",
    formatUsd(o.total_cents),
    formatUsd(o.due_now_cents),
    o.report_preference ?? "",
    o.status,
    o.id,
  ];
}

// ── Availability ───────────────────────────────────────────────────────────
export interface Busy { start: string; end: string }
export interface Slot { start: string; end: string }

export const NY = "America/New_York";
/** Shoots: Monday–Friday, 30 minutes, starting on the hour from 2pm; the last starts at 7pm. */
export const SESSION_HOURS = [14, 15, 16, 17, 18, 19];
export const SESSION_MINUTES = 30;
/** A 30-minute shoot plus a 30-minute gap: each booking blocks a full hour. */
export const SESSION_BLOCK_MINUTES = 60;
/** The only release times, New York time. */
export const RELEASE_HOURS = [15, 16, 18];
export const POST_LEAD_DAYS = 7;

/** UTC offset of New York on a given calendar day (EDT −240, EST −300), via Intl so it's right across DST. */
export function nyOffsetMinutes(y: number, m: number, d: number): number {
  const probe = new Date(Date.UTC(y, m, d, 12));
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: NY, timeZoneName: "shortOffset" }).formatToParts(probe);
  const tz = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT-5";
  const mt = tz.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!mt) return -300;
  const sign = mt[1] === "-" ? -1 : 1;
  return sign * (Number(mt[2]) * 60 + Number(mt[3] ?? 0));
}

/** The instant of `hour:minute` New York time on the calendar day y-m-d. */
export function nyTime(y: number, m: number, d: number, hour: number, minute = 0): Date {
  return new Date(Date.UTC(y, m, d, hour, minute) - nyOffsetMinutes(y, m, d) * 60_000);
}

function nyWeekday(y: number, m: number, d: number): number {
  return new Date(Date.UTC(y, m, d, 12)).getUTCDay();
}

/** Calendar day in New York of an instant, as [y, m, d]. */
export function nyDay(at: Date): [number, number, number] {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: NY, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(at);
  const get = (t: string) => Number(f.find((p) => p.type === t)?.value);
  return [get("year"), get("month") - 1, get("day")];
}

/** Shoot slots for the next `days` days, skipping weekends, calendar busy time and other bookings. */
export function sessionSlots(from: Date, days: number, busy: Busy[]): Slot[] {
  const out: Slot[] = [];
  const [y0, m0, d0] = nyDay(from);
  for (let d = 1; d <= days; d++) {
    const day = new Date(Date.UTC(y0, m0, d0 + d, 12));
    const y = day.getUTCFullYear(), m = day.getUTCMonth(), dd = day.getUTCDate();
    const weekday = nyWeekday(y, m, dd);
    if (weekday === 0 || weekday === 6) continue;
    for (const h of SESSION_HOURS) {
      const start = nyTime(y, m, dd, h);
      const blockEnd = new Date(start.getTime() + SESSION_BLOCK_MINUTES * 60_000);
      if (!overlaps(start, blockEnd, busy)) out.push({ start: start.toISOString(), end: new Date(start.getTime() + SESSION_MINUTES * 60_000).toISOString() });
    }
  }
  return out;
}

/** A booked shoot blocks its full hour for everyone else. */
export function sessionBlock(startISO: string): Busy {
  return { start: startISO, end: new Date(new Date(startISO).getTime() + SESSION_BLOCK_MINUTES * 60_000).toISOString() };
}

/** Release slots: every day after the lead time, at 3, 4 and 6pm New York; a time already taken that day is left out. */
export function postSlots(from: Date, days: number, taken: string[], leadDays = POST_LEAD_DAYS): Slot[] {
  const out: Slot[] = [];
  const takenSet = new Set(taken.map((t) => new Date(t).toISOString()));
  const [y0, m0, d0] = nyDay(from);
  for (let d = leadDays; d <= leadDays + days; d++) {
    const day = new Date(Date.UTC(y0, m0, d0 + d, 12));
    const y = day.getUTCFullYear(), m = day.getUTCMonth(), dd = day.getUTCDate();
    for (const h of RELEASE_HOURS) {
      const start = nyTime(y, m, dd, h);
      if (takenSet.has(start.toISOString())) continue;
      out.push({ start: start.toISOString(), end: new Date(start.getTime() + 3600_000).toISOString() });
    }
  }
  return out;
}

export function overlaps(start: Date, end: Date, busy: Busy[]): boolean {
  return busy.some((b) => new Date(b.start) < end && new Date(b.end) > start);
}

// ── Stripe ─────────────────────────────────────────────────────────────────
/** Stripe's API takes form encoding with bracketed keys: line_items[0][price_data][currency]=usd */
export function formEncode(obj: Record<string, unknown>, prefix = ""): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === "object" && item !== null) parts.push(formEncode(item as Record<string, unknown>, `${key}[${i}]`));
        else parts.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`);
      });
    } else if (typeof v === "object") {
      parts.push(formEncode(v as Record<string, unknown>, key));
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
    }
  }
  return parts.filter(Boolean).join("&");
}

export function parseStripeSignature(header: string | null): { t: string; v1: string[] } | null {
  if (!header) return null;
  const out = { t: "", v1: [] as string[] };
  for (const part of header.split(",")) {
    const [k, v] = part.split("=");
    if (k === "t") out.t = v;
    if (k === "v1") out.v1.push(v);
  }
  return out.t && out.v1.length ? out : null;
}

export function catalogueNo(n: number): string {
  return `PMG-R-${String(n).padStart(3, "0")}`;
}
