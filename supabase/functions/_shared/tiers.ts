// PMG onboarding tiers. Single source of truth for the site and the edge functions.
// Prices are in US cents. Edit here to lock pricing.

export type TierId = "basic" | "mid" | "viral";
export type PaymentPlan = "full" | "deposit";

export interface Tier {
  id: TierId;
  name: string;
  priceCents: number;
  tagline: string;
  includes: string[];
  /** Basic lets the client add extra ad budget on top. */
  adBudgetAddOn: boolean;
  /** Whether a 50% deposit is offered instead of paying in full. */
  depositAllowed: boolean;
  /** Offer Affirm financing at checkout (Stripe: $50–$30,000, US only). */
  financing: boolean;
  /** Which calendar bookings this tier needs. */
  bookings: ("post" | "session")[];
}

export const TIERS: Tier[] = [
  {
    id: "basic",
    name: "Basic",
    priceCents: 55_000,
    tagline: "Post + small ad spend.",
    includes: [
      "Collab post to TikTok, Instagram and YouTube",
      "Small ad spend behind the post",
      "Full ad report when the run ends",
      "Add-on: extra ad budget, any amount",
    ],
    adBudgetAddOn: true,
    depositAllowed: false,
    financing: false,
    bookings: ["post"],
  },
  {
    id: "mid",
    name: "Mid",
    priceCents: 100_000,
    tagline: "Long-form + short-form, placed and guaranteed.",
    includes: [
      "One long-form video, one short-form video",
      "Posted as collabs on PMG channels and yours",
      "Ad platform placements",
      "Guaranteed plays",
      "Ad report or live shared dashboard",
    ],
    adBudgetAddOn: false,
    depositAllowed: true,
    financing: false,
    bookings: ["post", "session"],
  },
  {
    id: "viral",
    name: "Viral",
    priceCents: 1_500_000,
    tagline: "1M views. Most of it goes to ad dollars.",
    includes: [
      "YouTube video, TikTok video, Instagram video, Facebook post",
      "1,000,000 views, majority of spend on ads",
      "Live shared dashboard for the whole run",
      "Affirm financing available",
    ],
    adBudgetAddOn: false,
    depositAllowed: true,
    financing: true,
    bookings: ["post", "session"],
  },
];

/** Deposit share for tiers that allow it. The open question: change to 1 to force full pay. */
export const DEPOSIT_SHARE = 0.5;
/** Add-on ad budget bounds (cents). */
export const AD_BUDGET_MIN = 10_000;
export const AD_BUDGET_MAX = 2_000_000;

export function getTier(id: string): Tier | undefined {
  return TIERS.find((t) => t.id === id);
}

export interface Quote {
  tier: Tier;
  adBudgetCents: number;
  totalCents: number;
  plan: PaymentPlan;
  /** What is charged now. */
  dueNowCents: number;
  /** What is left after today. */
  balanceCents: number;
}

/** Everything the checkout needs, computed the same way on both sides. */
export function quote(tierId: string, adBudgetCents = 0, plan: PaymentPlan = "full"): Quote {
  const tier = getTier(tierId);
  if (!tier) throw new Error(`Unknown tier: ${tierId}`);
  const ad = tier.adBudgetAddOn ? clampAdBudget(adBudgetCents) : 0;
  const totalCents = tier.priceCents + ad;
  const usePlan: PaymentPlan = tier.depositAllowed && plan === "deposit" ? "deposit" : "full";
  const dueNowCents = usePlan === "deposit" ? Math.round(totalCents * DEPOSIT_SHARE) : totalCents;
  return { tier, adBudgetCents: ad, totalCents, plan: usePlan, dueNowCents, balanceCents: totalCents - dueNowCents };
}

export function clampAdBudget(cents: number): number {
  if (!Number.isFinite(cents) || cents <= 0) return 0;
  return Math.min(AD_BUDGET_MAX, Math.max(AD_BUDGET_MIN, Math.round(cents / 100) * 100));
}

export function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: cents % 100 === 0 ? 0 : 2 });
}
