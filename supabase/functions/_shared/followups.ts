// Which follow-up emails an order is due, as pure functions so they can be tested.
// recovery1/recovery2: an order with an email but no payment. shoot7/shoot48/release7/release48: before the dates.

export interface FollowupOrder {
  id: string; status: string; email: string | null; created_at: string; paid_at: string | null;
  session_at: string | null; post_at: string | null; followups: Record<string, string> | null; last_step?: number | null;
  payment_plan?: string; total_cents?: number; due_now_cents?: number; balance_paid_at?: string | null; stripe_customer_id?: string | null; stripe_payment_method_id?: string | null;
}

export type FollowupKey = "recovery1" | "recovery2" | "shoot7" | "shoot48" | "release7" | "release48";

const H = 3600_000, D = 24 * H;
export const RECOVERY_1_AFTER_MS = 1 * H;
export const RECOVERY_2_AFTER_MS = 24 * H;
export const RECOVERY_GIVE_UP_MS = 7 * D;

export function dueFollowups(o: FollowupOrder, now = new Date()): FollowupKey[] {
  const sent = o.followups ?? {};
  const due: FollowupKey[] = [];
  const t = now.getTime();
  const open = !o.paid_at && (o.status === "draft" || o.status === "pending_payment") && !!o.email;
  if (open) {
    const age = t - new Date(o.created_at).getTime();
    if (age < RECOVERY_GIVE_UP_MS) {
      if (age >= RECOVERY_2_AFTER_MS && !sent.recovery2) due.push("recovery2");
      else if (age >= RECOVERY_1_AFTER_MS && age < RECOVERY_2_AFTER_MS && !sent.recovery1) due.push("recovery1");
    }
  }
  const booked = !!o.paid_at && ["paid", "deposit_paid", "scheduled"].includes(o.status);
  if (booked) {
    for (const [field, k7, k48] of [["session_at", "shoot7", "shoot48"], ["post_at", "release7", "release48"]] as const) {
      const at = o[field]; if (!at) continue;
      const left = new Date(at).getTime() - t;
      if (left <= 0) continue;
      if (left <= 48 * H) { if (!sent[k48]) due.push(k48); }
      else if (left <= 7 * D && !sent[k7]) due.push(k7);
    }
  }
  return due;
}

export function nyWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }) + " ET";
}

export const BALANCE_PULL_BEFORE_MS = 36 * H; // the day before: the hourly run inside 36 hours charges once

/** A deposit order whose balance is still open and whose first date (shoot, else release) is inside the pull window. */
export function balanceDue(o: FollowupOrder, now = new Date()): { cents: number; at: string } | null {
  if (o.payment_plan !== "deposit" || !o.paid_at || o.balance_paid_at) return null;
  const cents = (o.total_cents ?? 0) - (o.due_now_cents ?? 0);
  if (cents <= 0) return null;
  const at = o.session_at ?? o.post_at;
  if (!at) return null;
  const left = new Date(at).getTime() - now.getTime();
  if (left <= 0 || left > BALANCE_PULL_BEFORE_MS) return null;
  return { cents, at };
}
