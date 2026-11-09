import { describe, it, expect } from "vitest";
import { AD_BUDGET_MAX, AD_BUDGET_MIN, DEPOSIT_SHARE, TIERS, clampAdBudget, formatUsd, quote } from "../../supabase/functions/_shared/tiers";
import { AGREEMENT_TEXT, AGREEMENT_VERSION, STANDARD_SPLITS, normalizeIpi, sha256Hex, splitsLine, validateSplits } from "../../supabase/functions/_shared/agreement";
import { catalogueNo, distributionRow, editingRow, EDITING_COLUMNS, formEncode, nyOffsetMinutes, nyTime, parseStripeSignature, postSlots, sessionBlock, sessionSlots, splitName, type OrderRow } from "../../supabase/functions/_shared/onboarding";

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
  it("shows only the three paid tiers in public; DSP and Invited open from their own links", () => {
    expect(TIERS.map((t) => [t.id, t.priceCents, t.public])).toEqual([
      ["dsp", 0, false], ["basic", 55_000, true], ["mid", 100_000, true], ["viral", 1_500_000, true], ["comp", 0, false],
    ]);
    expect(TIERS.find((t) => t.id === "dsp")).toMatchObject({ inviteOnly: true, distribution: true, revenueShare: true });
    expect(TIERS.find((t) => t.id === "comp")).toMatchObject({ inviteOnly: true });
  });
  it("quotes $0 due for DSP and Invited, never a deposit", () => {
    expect(quote("dsp", 50_000, "deposit")).toMatchObject({ totalCents: 0, dueNowCents: 0, plan: "full", adBudgetCents: 0 });
    expect(quote("comp").dueNowCents).toBe(0);
  });
  it("quotes full pay by default and a 50% deposit where allowed", () => {
    expect(quote("basic").dueNowCents).toBe(55_000);
    expect(quote("basic", 0, "deposit").plan).toBe("deposit"); // every paid plan takes a deposit
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
  const from = new Date("2026-10-18T12:00:00Z"); // a Sunday, EDT
  it("knows New York's offset across DST", () => {
    expect(nyOffsetMinutes(2026, 9, 18)).toBe(-240); // October: EDT
    expect(nyOffsetMinutes(2026, 11, 18)).toBe(-300); // December: EST
    expect(nyTime(2026, 9, 19, 14).toISOString()).toBe("2026-10-19T18:00:00.000Z"); // 2pm EDT
    expect(nyTime(2026, 11, 7, 14).toISOString()).toBe("2026-12-07T19:00:00.000Z"); // 2pm EST
  });
  it("offers Mon–Fri 30-minute shoots on the hour from 1pm to 7pm and blocks the full hour", () => {
    const slots = sessionSlots(from, 7, [sessionBlock("2026-10-19T18:00:00.000Z")]);
    const monday = slots.filter((s) => s.start.startsWith("2026-10-19"));
    // 2pm EDT (18:00Z) is taken; 1pm and 3pm..7pm remain.
    expect(monday.map((s) => s.start)).toEqual(["2026-10-19T17:00:00.000Z", "2026-10-19T19:00:00.000Z", "2026-10-19T20:00:00.000Z", "2026-10-19T21:00:00.000Z", "2026-10-19T22:00:00.000Z", "2026-10-19T23:00:00.000Z"]);
    expect(new Date(monday[0].end).getTime() - new Date(monday[0].start).getTime()).toBe(30 * 60_000);
    expect(slots.every((s) => { const d = new Date(s.start).getUTCDay(); return d >= 1 && d <= 5; })).toBe(true);
    expect(slots.filter((s) => s.start.startsWith("2026-10-20")).length).toBe(7);
  });
  it("a calendar event inside the hour block hides the slot", () => {
    const busy = [{ start: "2026-10-19T19:40:00.000Z", end: "2026-10-19T19:50:00.000Z" }]; // 3:40pm EDT
    const monday = sessionSlots(from, 1, busy).map((s) => s.start);
    expect(monday).not.toContain("2026-10-19T19:00:00.000Z");
    expect(monday).toContain("2026-10-19T18:00:00.000Z");
  });
  it("offers release times at 3, 4 and 6pm on weekdays after the lead time and skips taken ones", () => {
    const slots = postSlots(from, 3, ["2026-10-26T20:00:00.000Z"]); // 4pm EDT on Monday the 26th is taken
    expect(slots.filter((s) => s.start.startsWith("2026-10-25")).length).toBe(0); // Sunday
    const monday = slots.filter((s) => s.start.startsWith("2026-10-26")).map((s) => s.start);
    expect(monday).toEqual(["2026-10-26T19:00:00.000Z", "2026-10-26T22:00:00.000Z"]);
    expect(slots.filter((s) => s.start.startsWith("2026-10-27")).length).toBe(3);
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

describe("release agreement", () => {
  it("carries the form's splits and the clauses the artist signs", () => {
    expect(STANDARD_SPLITS.master).toEqual({ pmg: 45, artist: 45, producer: 10 });
    expect(STANDARD_SPLITS.publishing).toEqual({ pmg: 100, artist: 50, producer: 50 });
    for (const clause of ["non-exclusive", "retain ownership", "UnitedMasters", "4 to 6 weeks", "ESIGN", "State of New York"]) expect(AGREEMENT_TEXT).toContain(clause);
    expect(AGREEMENT_VERSION).toMatch(/^\d{4}-\d{2}-/);
  });
  it("hashes the text deterministically so a signed version can be proven later", async () => {
    const h = await sha256Hex(AGREEMENT_TEXT);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(await sha256Hex(AGREEMENT_TEXT)).toBe(h);
    expect(await sha256Hex(AGREEMENT_TEXT + " ")).not.toBe(h);
  });
  it("accepts alternate splits only when whole numbers totalling 100", () => {
    expect(validateSplits({ pmg: 40, artist: 50, producer: 10 })).toEqual({ pmg: 40, artist: 50, producer: 10 });
    expect(validateSplits({ pmg: "40", artist: "50", producer: "10" })).toEqual({ pmg: 40, artist: 50, producer: 10 });
    expect(validateSplits({ pmg: 45, artist: 45, producer: 11 })).toBeNull();
    expect(validateSplits({ pmg: 45.5, artist: 44.5, producer: 10 })).toBeNull();
    expect(validateSplits({ pmg: -10, artist: 100, producer: 10 })).toBeNull();
    expect(validateSplits(null)).toBeNull();
    expect(splitsLine({ pmg: 40, artist: 50, producer: 10 })).toBe("PMG 40% / Artist 50% / Producer 10%");
  });
  it("normalises IPI numbers to digits, or an explicit none", () => {
    expect(normalizeIpi(" 00123456789 ")).toBe("00123456789");
    expect(normalizeIpi("123-456-789")).toBe("123456789");
    expect(normalizeIpi("None")).toBe("none");
    expect(normalizeIpi("n/a")).toBe("none");
    expect(normalizeIpi("12")).toBeNull();
    expect(normalizeIpi("")).toBeNull();
  });
  it("puts a requested title and alternate splits on the distribution sheet row", () => {
    const row = distributionRow({ ...order, dsp_title: "Night Shift (Live at PMG)", splits: { pmg: 40, artist: 50, producer: 10 } });
    expect(row[2]).toBe("Night Shift (Live at PMG)");
    expect(row[20]).toBe("Yes");
    expect(row[21]).toBe("PMG 40% / Artist 50% / Producer 10%");
    const std = distributionRow(order);
    expect(std[2]).toBe("Yes");
    expect(std[20]).toBe("No");
  });
});
