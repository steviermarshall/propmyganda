// Funding application wizard configuration.
//
// One question per screen, grouped into 5 steps (the progress bar has 5
// segments). Step 5 ("account") is the account gate rather than a question.
// Each question's `key` maps 1:1 to a column on funding_applications, so every
// answer is a progressive write — a half-finished application is still a lead.

export type QuestionType =
  | "currency"
  | "select"
  | "text"
  | "email"
  | "tel"
  | "boolean";

export interface Question {
  /** column on funding_applications */
  key: string;
  /** 0-based step this question belongs to */
  step: number;
  prompt: string;
  subtext?: string;
  type: QuestionType;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** returns an error string when invalid, or null when the value is OK */
  validate?: (value: string) => string | null;
}

export interface Step {
  index: number;
  label: string;
}

export const STEPS: Step[] = [
  { index: 0, label: "Funding" },
  { index: 1, label: "Business" },
  { index: 2, label: "Revenue" },
  { index: 3, label: "About you" },
  { index: 4, label: "Account" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const required = (label: string) => (v: string) =>
  v.trim().length === 0 ? `${label} is required.` : null;

export const QUESTIONS: Question[] = [
  // ── Step 0 · Funding ──
  {
    key: "funding_amount",
    step: 0,
    prompt: "How much funding are you looking for?",
    subtext: "Ballpark is fine — you can fine-tune this with your advisor.",
    type: "currency",
    placeholder: "50,000",
    validate: (v) => {
      const n = Number(v.replace(/[^0-9.]/g, ""));
      if (!n) return "Enter an amount.";
      if (n < 5000) return "We fund from $5,000 and up.";
      return null;
    },
  },
  {
    key: "use_of_funds",
    step: 0,
    prompt: "What will you use it for?",
    type: "select",
    options: [
      { value: "working_capital", label: "Working capital" },
      { value: "equipment", label: "Equipment" },
      { value: "inventory", label: "Inventory" },
      { value: "expansion", label: "Expansion / new location" },
      { value: "payroll", label: "Payroll" },
      { value: "marketing", label: "Marketing" },
      { value: "debt_refinance", label: "Refinance existing debt" },
      { value: "other", label: "Something else" },
    ],
    validate: required("Use of funds"),
  },

  // ── Step 1 · Business ──
  {
    key: "business_name",
    step: 1,
    prompt: "What's your business's legal name?",
    type: "text",
    placeholder: "Acme LLC",
    validate: required("Business name"),
  },
  {
    key: "industry",
    step: 1,
    prompt: "What industry are you in?",
    type: "select",
    options: [
      { value: "retail", label: "Retail" },
      { value: "restaurant", label: "Restaurant / food service" },
      { value: "construction", label: "Construction" },
      { value: "trucking", label: "Trucking / transportation" },
      { value: "healthcare", label: "Healthcare" },
      { value: "professional_services", label: "Professional services" },
      { value: "auto", label: "Automotive" },
      { value: "ecommerce", label: "E-commerce" },
      { value: "manufacturing", label: "Manufacturing" },
      { value: "other", label: "Other" },
    ],
    validate: required("Industry"),
  },
  {
    key: "business_state",
    step: 1,
    prompt: "Which state is your business in?",
    type: "select",
    options: US_STATES.map((s) => ({ value: s, label: s })),
    validate: required("State"),
  },
  {
    key: "time_in_business",
    step: 1,
    prompt: "How long have you been in business?",
    type: "select",
    options: [
      { value: "lt_6mo", label: "Less than 6 months" },
      { value: "6_12mo", label: "6–12 months" },
      { value: "1_2yr", label: "1–2 years" },
      { value: "2_5yr", label: "2–5 years" },
      { value: "gt_5yr", label: "5+ years" },
    ],
    validate: required("Time in business"),
  },

  // ── Step 2 · Revenue ──
  {
    key: "monthly_revenue",
    step: 2,
    prompt: "What's your average monthly revenue?",
    subtext: "Your last few months of deposits, roughly.",
    type: "currency",
    placeholder: "40,000",
    validate: (v) => {
      const n = Number(v.replace(/[^0-9.]/g, ""));
      if (!n) return "Enter an amount.";
      return null;
    },
  },
  {
    key: "accepts_cards",
    step: 2,
    prompt: "Do you accept credit / debit cards?",
    type: "boolean",
    validate: required("Answer"),
  },

  // ── Step 3 · About you ──
  {
    key: "contact_name",
    step: 3,
    prompt: "What's your name?",
    type: "text",
    placeholder: "Jordan Rivera",
    validate: required("Name"),
  },
  {
    key: "email",
    step: 3,
    prompt: "What email should we reach you at?",
    type: "email",
    placeholder: "you@business.com",
    validate: (v) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : "Enter a valid email.",
  },
  {
    key: "phone",
    step: 3,
    prompt: "And your cell phone?",
    subtext: "So we can text you an offer — no spam.",
    type: "tel",
    placeholder: "(555) 123-4567",
    validate: (v) =>
      v.replace(/\D/g, "").length >= 10 ? null : "Enter a valid phone number.",
  },
  {
    key: "credit_score_range",
    step: 3,
    prompt: "Roughly, where's your credit score?",
    subtext: "No hard pull — this never affects your credit.",
    type: "select",
    options: [
      { value: "excellent", label: "720+ (Excellent)" },
      { value: "good", label: "680–719 (Good)" },
      { value: "fair", label: "620–679 (Fair)" },
      { value: "poor", label: "Below 620" },
      { value: "unsure", label: "Not sure" },
    ],
    validate: required("Credit range"),
  },
];

/** Ordered question keys — used to compute funnel progress. */
export const QUESTION_KEYS = QUESTIONS.map((q) => q.key);

/** Questions belonging to a given step, in order. */
export function questionsForStep(step: number): Question[] {
  return QUESTIONS.filter((q) => q.step === step);
}

/** The flat list of question "screens" the user walks through before the gate. */
export const TOTAL_QUESTIONS = QUESTIONS.length;
