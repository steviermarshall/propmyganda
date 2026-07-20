// Client-side funnel instrumentation for the funding wizard.
//
// - A stable session id lives in localStorage so we can stitch page views,
//   question progress, and eventual account creation into one funnel row.
// - First-touch attribution (UTM params + referrer + landing path) is captured
//   once, on the very first visit, and reused for the whole session.
// - Every meaningful action appends a row to funding_events.

import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "pmg_funding_session";
const ATTRIB_KEY = "pmg_funding_attribution";

export interface Attribution {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
  landing_path: string | null;
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // fallback for older browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Get (or lazily create) the browser session id for this applicant. */
export function getSessionId(): string {
  if (typeof window === "undefined") return uuid();
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = uuid();
    window.localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/** Capture first-touch attribution once; return whatever we have on file. */
export function getAttribution(): Attribution {
  if (typeof window === "undefined") {
    return {
      utm_source: null, utm_medium: null, utm_campaign: null,
      utm_content: null, utm_term: null, referrer: null, landing_path: null,
    };
  }
  const cached = window.localStorage.getItem(ATTRIB_KEY);
  if (cached) {
    try {
      return JSON.parse(cached) as Attribution;
    } catch {
      /* fall through and recapture */
    }
  }
  const params = new URLSearchParams(window.location.search);
  const attribution: Attribution = {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_content: params.get("utm_content"),
    utm_term: params.get("utm_term"),
    referrer: document.referrer || null,
    landing_path: window.location.pathname + window.location.search,
  };
  window.localStorage.setItem(ATTRIB_KEY, JSON.stringify(attribution));
  return attribution;
}

export type FundingEventType =
  | "page_view"
  | "question_view"
  | "question_answered"
  | "step_complete"
  | "account_created"
  | "submitted"
  | "drop_off";

interface TrackOptions {
  applicationId?: string | null;
  questionKey?: string | null;
  payload?: Record<string, unknown> | null;
}

/**
 * Append an analytics event. Fire-and-forget — instrumentation must never
 * block the applicant or throw into the UI.
 */
export async function trackEvent(
  type: FundingEventType,
  opts: TrackOptions = {},
): Promise<void> {
  try {
    const attribution = getAttribution();
    await supabase.from("funding_events").insert({
      application_id: opts.applicationId ?? null,
      session_id: getSessionId(),
      event_type: type,
      question_key: opts.questionKey ?? null,
      payload: opts.payload ?? null,
      page: typeof window !== "undefined" ? window.location.pathname : null,
      referrer: attribution.referrer,
      utm_source: attribution.utm_source,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    } as never);
  } catch {
    // swallow — analytics failures should be invisible to the user
  }
}

/** Clear the local funnel state (e.g. after a completed submission). */
export function resetFundingSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(ATTRIB_KEY);
}
