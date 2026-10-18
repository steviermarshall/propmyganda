import { supabase } from "@/integrations/supabase/client";
import type { Quote, Tier } from "@/lib/tiers";

export interface Upload { name: string; path: string; size: number; type?: string }
export interface Order {
  id: string; created_at: string; catalogue_no: string | null; tier: string; ad_budget_cents: number; total_cents: number;
  payment_plan: "full" | "deposit"; due_now_cents: number; status: string; artist_name: string; legal_name: string; email: string;
  phone: string | null; instagram_handle: string | null; instagram_url: string | null; tiktok_url: string | null; youtube_url: string | null;
  track_title: string | null; explicit: boolean; wants_distribution: boolean; report_preference: string | null; uploads: Upload[];
  post_at: string | null; session_at: string | null; paid_at: string | null; sync_errors: string | null;
}
export interface Slot { start: string; end: string }
export interface IgProfile { handle: string; url: string; verified: boolean; name?: string; followers?: number; posts?: number; picture?: string; bio?: string; error?: string }

const SESSION_KEY = "pmg-start";
export interface Session { orderId: string; token: string; step: number }
export function loadSession(): Session | null {
  try { const raw = localStorage.getItem(SESSION_KEY); return raw ? (JSON.parse(raw) as Session) : null; } catch { return null; }
}
export function saveSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* private mode */ }
}

/** Calls the onboarding edge function and surfaces its error message. */
export async function call<T = Record<string, unknown>>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("onboarding", { body: { action, ...body } });
  if (error) {
    let message = error.message;
    try { const ctx = (error as { context?: Response }).context; if (ctx) message = (await ctx.json()).error ?? message; } catch { /* keep */ }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export const api = {
  create: (body: Record<string, unknown>) => call<{ orderId: string; token: string; catalogueNo: string; quote: Quote }>("create", body),
  update: (s: Session, patch: Record<string, unknown>) => call<{ order: Order }>("update", { orderId: s.orderId, token: s.token, patch }),
  igLookup: (handle: string) => call<IgProfile>("ig-lookup", { handle }),
  availability: (s: Session, kind: "post" | "session") => call<{ slots: Slot[] }>("availability", { orderId: s.orderId, token: s.token, kind }),
  checkout: (s: Session, plan: "full" | "deposit") => call<{ url?: string; error?: string; configured?: boolean }>("checkout", { orderId: s.orderId, token: s.token, plan }),
  status: (s: Session) => call<{ order: Order; tier: Tier }>("status", { orderId: s.orderId, token: s.token }),
  async upload(s: Session, file: File, onProgress?: (pct: number) => void): Promise<Upload> {
    const { path, token } = await call<{ path: string; signedUrl: string; token: string }>("upload-url", { orderId: s.orderId, token: s.token, filename: file.name, size: file.size, type: file.type });
    onProgress?.(5);
    const { error } = await supabase.storage.from("onboarding-uploads").uploadToSignedUrl(path, token, file, { contentType: file.type || "application/octet-stream" });
    if (error) throw new Error(error.message);
    onProgress?.(95);
    await call("upload-done", { orderId: s.orderId, token: s.token, name: file.name, path, size: file.size, type: file.type });
    onProgress?.(100);
    return { name: file.name, path, size: file.size, type: file.type };
  },
};

export function fmtSlot(iso: string, withTime = true): string {
  return new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric", ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}) });
}
export function fmtBytes(n: number): string {
  if (n > 1e9) return `${(n / 1e9).toFixed(1)} GB`;
  if (n > 1e6) return `${(n / 1e6).toFixed(0)} MB`;
  return `${Math.max(1, Math.round(n / 1e3))} KB`;
}
