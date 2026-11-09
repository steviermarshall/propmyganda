import { describe, it, expect } from "vitest";
import { dueFollowups, type FollowupOrder } from "../../supabase/functions/_shared/followups";
import { TIERS, monthlyEstimateCents } from "../../supabase/functions/_shared/tiers";

const now = new Date("2026-11-09T15:00:00Z");
const base: FollowupOrder = { id: "o1", status: "draft", email: "a@b.co", created_at: "2026-11-09T13:30:00Z", paid_at: null, session_at: null, post_at: null, followups: {} };
const ago = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString();
const ahead = (h: number) => new Date(now.getTime() + h * 3600_000).toISOString();

describe("follow-ups", () => {
  it("sends the first recovery after an hour, the second after a day, then stops", () => {
    expect(dueFollowups({ ...base, created_at: ago(0.5) }, now)).toEqual([]);
    expect(dueFollowups({ ...base, created_at: ago(1.5) }, now)).toEqual(["recovery1"]);
    expect(dueFollowups({ ...base, created_at: ago(1.5), followups: { recovery1: "x" } }, now)).toEqual([]);
    expect(dueFollowups({ ...base, created_at: ago(26), followups: { recovery1: "x" } }, now)).toEqual(["recovery2"]);
    expect(dueFollowups({ ...base, created_at: ago(26) }, now)).toEqual(["recovery2"]); // a missed first email is not sent late
    expect(dueFollowups({ ...base, created_at: ago(24 * 8) }, now)).toEqual([]);
  });
  it("never chases a paid order or one without an email", () => {
    expect(dueFollowups({ ...base, created_at: ago(2), paid_at: ago(1), status: "paid" }, now)).toEqual([]);
    expect(dueFollowups({ ...base, created_at: ago(2), email: null }, now)).toEqual([]);
  });
  it("reminds a week out and 48 hours out for the shoot and the release, and does not double up", () => {
    const booked: FollowupOrder = { ...base, status: "paid", paid_at: ago(100), session_at: ahead(24 * 6), post_at: ahead(30) };
    expect(dueFollowups(booked, now).sort()).toEqual(["release48", "shoot7"]);
    expect(dueFollowups({ ...booked, followups: { shoot7: "x", release48: "x" } }, now)).toEqual([]);
    expect(dueFollowups({ ...booked, session_at: ahead(24 * 9) }, now)).toEqual(["release48"]);
    expect(dueFollowups({ ...booked, session_at: ahead(-2), post_at: ahead(-1) }, now)).toEqual([]);
    expect(dueFollowups({ ...booked, session_at: ahead(40) }, now).sort()).toEqual(["release48", "shoot48"]);
  });
});

describe("pay over time", () => {
  it("is on for Basic, Mid and Viral", () => {
    expect(TIERS.filter((t) => t.financing).map((t) => t.id)).toEqual(["basic", "mid", "viral"]);
  });
  it("estimates twelve equal payments, rounded up", () => {
    expect(monthlyEstimateCents(55_000)).toBe(4_584);
    expect(monthlyEstimateCents(100_000)).toBe(8_334);
    expect(monthlyEstimateCents(1_500_000)).toBe(125_000);
  });
});
