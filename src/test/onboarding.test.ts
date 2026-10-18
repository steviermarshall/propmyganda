import { describe, it, expect } from "vitest";
import { AD_BUDGET_MAX, AD_BUDGET_MIN, DEPOSIT_SHARE, TIERS, clampAdBudget, formatUsd, quote } from "../../supabase/functions/_shared/tiers";
import { catalogueNo, distributionRow, editingRow, EDITING_COLUMNS, formEncode, parseStripeSignature, postSlots, sessionSlots, splitName, type OrderRow } from "../../supabase/functions/_shared/onboarding";

const order: OrderRow = {
  id: "00000000-0000-0000-0000-000000000001", created_at: "2026-10-18T15:04:05.000Z", catalogue_no: "PMG-R-007", tier: "mid",
  ad_budget_cents: 0, total_cents: 100_000, payment_plan: "deposit", due_now_cents: 50_000, status: "deposit_paid",
  artist_name: "Zoë", legal_name: "Zoe Ann Lewis", email: "zoe@example.com", phone: "718", instagram_handle: "zoe", instagram_url: "https://www.instagram.com/zoe/",
  instagram_followers: 1200, tiktok_url: null, youtube_url: null, track_title: "Night Shift", explicit: true, wants_distribution: true,
  pro_affiliation: "SESAC", ipi_number: "0106", distro_email: "distro@example.com", producer_name: "Alex Walker", producer_stage_name: "Ayy Walker",
  producer_pro: "BMI", producer_ipi: "0089", producer_email: "ayy@example.com", report_preference: "both", notes: null,
  uploads: [{ name: "master.wav", path: "orders/x/master.wav", size: 10, url: "https://files/master.wav" }], post_at: "2026-11-02T16:00:00.000Z",
  session_at: "2026-10-28T18:00:00.000Z", agreement_accepted: true, signature: "Zoe Ann Lewis",
};

describe("tiers", () => {
  it("has the three draft tiers at draft prices", () => {
    expect(TIERS.map((t) => [t.id, t.priceCents])).toEqual([["basic", 55_000], ["mid", 100_000], ["viral", 1_500_000]]);
  });
  it("quotes full pay by default and a 50% deposit where allowed", () => {
    expect(quote("basic").dueNowCents).toBe(55_000);
    expect(quote("basic", 0, "deposit").plan).toBe("full"); // not allowed on Basic
    const mid = quote("mid", 0, "deposit");
    expect(mid.dueNowCents).toBe(100_000 * DEPOSIT_SHARE);
    expect(mid.balanceCents).toBe(50_000);
    expect(quote("viral", 0, "deposit").dueNowCents).toBe(750_000);
  });
  it("adds the ad budget only on Basic and clamps it", () => {
    expect(quote("basic", 25_000).totalCents).toBe(80_000);
    expect(quote("mid", 25_000).totalCents).toBe(100_000);
    expect(clampAdBudget(50)).toBe(AD_BUDGET_MIN);
    expect(clampAdBudget(1e9)).toBe(AD_BUDGET_MAX);
    expect(clampAdBudget(12_345)).toBe(12_300);
    expect(clampAdBudget(0)).toBe(0);
  });
  it("formats dollars", () => {
    expect(formatUsd(55_000)).toBe("$550");
    expect(formatUsd(1_500_000)).toBe("$15,000");
    expect(formatUsd(12_345)).toBe("$123.45");
  });
});

describe("sheet rows", () => {
  it("maps the distribution row to the DSP agreement sheet columns A–Z", () => {
    const row = distributionRow(order);
    expect(row).toHaveLength(26);
    expect(row[0]).toBe("10/18/2026 15:04:05");
    expect(row[2]).toBe("Yes");
    expect(row[3]).toBe("zoe@example.com");
    expect(row.slice(4, 7)).toEqual(["Zoe Ann", "Lewis", "Zoë"]);
    expect(row[7]).toBe("SESAC");
    expect(row[9]).toBe("distro@example.com");
    expect(row.slice(12, 15)).toEqual(["Alex", "Walker", "Ayy Walker"]);
    expect(row[23]).toBe("Yes");
    expect(row[24]).toBe("Zoe Ann Lewis");
    expect(row[25]).toBe("Not Scheduled");
  });
  it("maps the editing row in the header order", () => {
    const row = editingRow(order);
    expect(row).toHaveLength(EDITING_COLUMNS.length);
    expect(row[EDITING_COLUMNS.indexOf("Artist")]).toBe("Zoë");
    expect(row[EDITING_COLUMNS.indexOf("Explicit")]).toBe("Yes");
    expect(row[EDITING_COLUMNS.indexOf("Post date")]).toBe("2026-11-02");
    expect(row[EDITING_COLUMNS.indexOf("Files")]).toBe("https://files/master.wav");
    expect(row[EDITING_COLUMNS.indexOf("Paid now")]).toBe("$500");
  });
  it("splits names and numbers catalogue entries", () => {
    expect(splitName("Zoe")).toEqual({ first: "Zoe", last: "" });
    expect(splitName("Muhammad De Lane")).toEqual({ first: "Muhammad De", last: "Lane" });
    expect(catalogueNo(7)).toBe("PMG-R-007");
  });
});

describe("availability", () => {
  const from = new Date("2026-10-18T12:00:00Z"); // a Sunday
  it("offers weekday two-hour sessions and skips busy ones", () => {
    const slots = sessionSlots(from, 7, [{ start: "2026-10-19T16:00:00.000Z", end: "2026-10-19T18:00:00.000Z" }]);
    // Mon 19th 12:00 EDT = 16:00Z is busy, so the first slot is 14:00 EDT.
    expect(slots[0]).toEqual({ start: "2026-10-19T18:00:00.000Z", end: "2026-10-19T20:00:00.000Z" });
    expect(slots.every((s) => { const d = new Date(s.start).getUTCDay(); return d >= 1 && d <= 5; })).toBe(true);
    expect(slots.filter((s) => s.start.startsWith("2026-10-19")).length).toBe(3);
  });
  it("offers one posting date per day after the lead time and skips taken days", () => {
    const slots = postSlots(from, 3, ["2026-10-26T16:00:00.000Z"]);
    expect(slots.map((s) => s.start.slice(0, 10))).toEqual(["2026-10-25", "2026-10-27", "2026-10-28"]);
  });
});

describe("stripe helpers", () => {
  it("form-encodes nested keys the way Stripe expects", () => {
    const body = formEncode({ mode: "payment", payment_method_types: ["card", "affirm"], line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: 50000 } }], metadata: { order_id: "abc" } });
    expect(body).toContain("mode=payment");
    expect(body).toContain("payment_method_types%5B0%5D=card");
    expect(body).toContain("payment_method_types%5B1%5D=affirm");
    expect(body).toContain("line_items%5B0%5D%5Bprice_data%5D%5Bunit_amount%5D=50000");
    expect(body).toContain("metadata%5Border_id%5D=abc");
  });
  it("parses the Stripe-Signature header", () => {
    expect(parseStripeSignature("t=1700000000,v1=abc,v0=zzz,v1=def")).toEqual({ t: "1700000000", v1: ["abc", "def"] });
    expect(parseStripeSignature(null)).toBeNull();
    expect(parseStripeSignature("junk")).toBeNull();
  });
});
