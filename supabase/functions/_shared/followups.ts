// Which follow-up emails an order is due, as pure functions so they can be tested.
// recovery1/recovery2: an order with an email but no payment. shoot7/shoot48/release7/release48: before the dates.

export interface FollowupOrder {
  id: string; status: string; email: string | null; created_at: string; paid_at: string | null;
  session_at: string | null; post_at: string | null; followups: Record<string, string> | null; last_step?: number | null;
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
