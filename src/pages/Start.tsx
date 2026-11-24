import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import SEO from "@/components/SEO";
import { AGREEMENT_TEXT, STANDARD_SPLITS } from "@/lib/agreement";
import { AD_BUDGET_MAX, AD_BUDGET_MIN, AFFIRM_MAX_CENTS, AFFIRM_MIN_CENTS, PUBLIC_TIERS, TIERS, formatUsd, getTier, monthlyEstimateCents, quote, type PaymentPlan, type Tier, type TierId } from "@/lib/tiers";
import { api, fmtBytes, fmtSlot, loadSession, saveSession, visitorId, type IgProfile, type Order, type Session, type Slot, type Upload } from "@/lib/onboarding";
import { Bullet, Button, ErrorLine, Input, Note, SectionHead, Select, StepNav, TextButton, Textarea, Toggle } from "@/components/start/ui";
import { AreaBlocks } from "@/components/start/prep";
import QuestionsDrawer from "@/components/start/QuestionsDrawer";

const STEPS = ["Tier", "Details", "Upload", "Schedule", "Pay"] as const;
const PRO_OPTIONS = ["", "BMI", "ASCAP", "SESAC", "Other", "None"];
// Quick picks for the extra ad budget, in cents. Anything else goes in the field next to them.
const AD_PICKS = [0, 10_000, 25_000, 50_000, 100_000];

/** Where you are in the five steps. A finished step is a way back to it. */
/** The step names. With nothing to charge, the last step is a confirmation, not a payment. */
const stepNames = (free: boolean, invited = false): readonly string[] => {
  const names: string[] = free ? [...STEPS.slice(0, -1), "Confirm"] : [...STEPS];
  if (invited) names[0] = "Invite";
  return names;
};

function Stepper({ step, onJump, free = false, invited = false }: { step: number; onJump: (n: number) => void; free?: boolean; invited?: boolean }) {
  const names = stepNames(free, invited);
  return (
    <nav aria-label="Progress">
      <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.16em] text-smoke sm:hidden">Step {step + 1} of {names.length} · {names[step]}</p>
      <ol className="grid grid-cols-5 gap-1.5">
        {names.map((s, i) => {
          const done = i < step, current = i === step;
          const cls = `flex w-full items-baseline gap-2 border-t-4 pb-1 pt-3 text-left transition-colors ${current ? "border-blood text-bone" : done ? "border-bone text-bone" : "border-rule text-ash"}`;
          const inner = (
            <>
              <span className="font-poster text-[20px] leading-none">{String(i + 1).padStart(2, "0")}</span>
              <span className="hidden text-[12px] font-bold uppercase tracking-[0.14em] sm:inline">{s}</span>
            </>
          );
          return (
            <li key={s} aria-current={current ? "step" : undefined}>
              {done ? <button type="button" onClick={() => onJump(i)} aria-label={`Back to step ${i + 1}, ${s}`} className={`${cls} hover:border-blood-hi hover:text-blood-hi`}>{inner}</button> : <div className={cls}>{inner}</div>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const Check = () => (
  <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"><path d="M3 8.5l3.2 3L13 4.5" /></svg>
);

/** The mark on a card you can pick: empty box, or a red box with a tick. */
function PickMark({ active }: { active: boolean }) {
  return (
    <span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center border-2 text-white ${active ? "border-blood bg-blood" : "border-ash"}`}>{active && <Check />}</span>
  );
}

// One rule for every choice in the flow: the card you picked turns bone.
const pick = (active: boolean) => (active ? "border-bone bg-bone text-ink" : "border-edge bg-transparent text-bone hover:border-bone");

// ── 1. Tier ────────────────────────────────────────────────────────────────
// The invite plans (Invited, DSP Release) cost nothing, so they show no price, no total and no payment talk anywhere.
function priceLabel(t: Tier): string | null {
  return t.priceCents === 0 ? null : formatUsd(t.priceCents);
}

const RULES = [
  "A 50% deposit locks your date; the rest the day before, by link, or in cash.",
  "Move the shoot free up to 7 days out.",
  "Payments by Stripe.",
  "You keep your masters.",
];
// The same rules with the money ones taken out, for plans with nothing to pay.
const RULES_NO_CHARGE = [
  "Your date is held the moment you confirm.",
  "Move the shoot up to 7 days out.",
  "You keep your masters.",
];

// What an invite gets, written for the artist. The plan lists in tiers.ts compare plans ("Everything in Mid"),
// which means nothing to someone who never saw the paid plans, so invites get their own words here.
const INVITE_OFFER: Partial<Record<TierId, { title: string; line: string; gets: string[] }>> = {
  comp: {
    title: "A free video on PMG",
    line: "We invite a few artists a month. This one is on us.",
    gets: [
      "A shoot at our studio in DUMBO, Brooklyn",
      "One long-form and one short-form video",
      "Posted as a collab on PMG's channels and yours",
      "Ads behind the post",
    ],
  },
  dsp: {
    title: "Release with PMG",
    line: "Your record, released under Propmyganda. Split on streams.",
    gets: [
      "Your record on every streaming platform, released by PMG through UnitedMasters",
      "A shoot at our studio in DUMBO, Brooklyn, with long-form and short-form video",
      "Posted as a collab with ads behind it",
      "Non-exclusive, one release at a time. You keep your masters",
      "Master split: 45 you, 45 PMG, 10 producer. You sign it in the next step",
    ],
  },
};

function InviteOffer({ tier }: { tier: TierId }) {
  const t = getTier(tier);
  const o = INVITE_OFFER[tier] ?? { title: t?.name ?? "Your invite", line: t?.tagline ?? "", gets: t?.includes ?? [] };
  return (
    <div className="max-w-2xl">
      <p className="mb-5 inline-block bg-blood px-3 py-2 text-[12px] font-bold uppercase tracking-[0.16em] text-white">Invite only · nothing to pay</p>
      <div className="border-2 border-bone bg-bone p-6 text-ink sm:p-8">
        <h2 className="font-poster text-[34px] uppercase leading-[0.95] sm:text-[44px]">{o.title}</h2>
        <p className="mt-3 text-[17px] font-bold leading-6">{o.line}</p>
        <ul className="mt-6 space-y-3 text-[15px] leading-[22px]">
          {o.gets.map((g) => <Bullet key={g} tone="light">{g}</Bullet>)}
        </ul>
      </div>
    </div>
  );
}

function TierStep({ tier, setTier, adBudget, setAdBudget, onNext, invite }: { tier: TierId; setTier: (t: TierId) => void; adBudget: number; setAdBudget: (n: number) => void; onNext: () => void; invite: { label: string | null } | null }) {
  const q = quote(tier, adBudget);
  // An invite link shows exactly the plan it was issued for (Invited or DSP Release); the public link shows the paid tiers.
  const shown = invite ? TIERS.filter((t) => t.id === tier) : PUBLIC_TIERS;
  return (
    <div>
      {invite ? <InviteOffer tier={tier} /> : (
      <div role="radiogroup" aria-label="Plan" className={`grid gap-4 ${shown.length > 3 ? "md:grid-cols-2 lg:grid-cols-4" : shown.length > 1 ? "md:grid-cols-3" : "max-w-md"}`}>
        {shown.map((t) => {
          const active = t.id === tier;
          const affirm = t.financing && t.priceCents >= AFFIRM_MIN_CENTS && t.priceCents <= AFFIRM_MAX_CENTS;
          return (
            <button key={t.id} type="button" role="radio" aria-checked={active} onClick={() => setTier(t.id)} className={`flex flex-col border-2 p-6 text-left transition-colors ${pick(active)}`}>
              <span className="flex items-center justify-between gap-3">
                <span className="font-poster text-[26px] uppercase leading-none tracking-[0.02em]">{t.name}</span>
                <PickMark active={active} />
              </span>
              {priceLabel(t) && <span className="mt-5 font-poster text-[56px] uppercase leading-[0.9] lg:text-[64px]">{priceLabel(t)}</span>}
              <span className={`text-[16px] font-bold leading-6 ${priceLabel(t) ? "mt-3" : "mt-4"}`}>{t.tagline}</span>
              <ul className="mb-6 mt-5 space-y-2 text-[14px] leading-[22px]">
                {t.includes.map((i) => <Bullet key={i} tone={active ? "light" : "dark"}>{i}</Bullet>)}
              </ul>
              {affirm && (
                <span className={`mt-auto border-t pt-4 text-[13px] leading-5 ${active ? "border-ink/20 text-[#444444]" : "border-rule text-ash"}`}>
                  Or from about {formatUsd(monthlyEstimateCents(t.priceCents))}/mo with Affirm
                </span>
              )}
            </button>
          );
        })}
      </div>
      )}

      {q.tier.adBudgetAddOn && (
        <div className="mt-10 border border-rule p-6">
          <SectionHead title="Add ad budget">Optional. Every dollar here goes to ad spend. You get the full report when it ends, or we share the dashboard so you watch it live.</SectionHead>
          <div role="group" aria-label="Extra ad budget" className="mt-5 flex flex-wrap gap-2">
            {AD_PICKS.map((c) => {
              const active = q.adBudgetCents === c;
              return (
                <button key={c} type="button" aria-pressed={active} onClick={() => setAdBudget(c)} className={`min-h-[48px] border-2 px-5 text-[15px] font-bold transition-colors ${pick(active)}`}>
                  {c === 0 ? "None" : `+ ${formatUsd(c)}`}
                </button>
              );
            })}
          </div>
          <div className="mt-5 max-w-xs">
            <Input
              label="Or type an amount (USD)"
              hint={`${formatUsd(AD_BUDGET_MIN)} to ${formatUsd(AD_BUDGET_MAX)}`}
              type="number" inputMode="numeric" min={0} step={50}
              value={adBudget ? adBudget / 100 : ""}
              placeholder="0"
              onChange={(e) => setAdBudget(Math.round(Number(e.target.value || 0) * 100))}
            />
          </div>
        </div>
      )}

      <div className="mt-10">
        <SectionHead title="The rules" />
        <ol className="mt-5 grid gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {(q.tier.priceCents === 0 ? RULES_NO_CHARGE : RULES).map((r, i) => (
            <li key={r} className="border-t-[3px] border-bone pt-3">
              <span className="block font-poster text-[30px] leading-none text-blood">{i + 1}</span>
              <span className="mt-2 block text-[15px] font-medium leading-[22px] text-bone">{r}</span>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-[15px] leading-6 text-smoke">
          Want to see what it looks like? <Link to="/artists" className="font-bold text-bone underline decoration-blood decoration-2 underline-offset-4 hover:text-blood-hi">See the previous highlighted videos</Link>
        </p>
      </div>

      <StepNav
        summary={
          q.tier.revenueShare ? (
            <><span className="font-bold text-bone">{q.tier.name}.</span> PMG is paid from the streaming split you sign.</>
          ) : q.totalCents === 0 ? (
            <><span className="font-bold text-bone">{q.tier.name}.</span> Nothing to pay.</>
          ) : (
            <><span className="font-bold text-bone">{q.tier.name} · total {formatUsd(q.totalCents)}.</span>{q.tier.depositAllowed && <> Deposit option at checkout.</>}</>
          )
        }
      >
        <Button onClick={onNext}>Continue</Button>
      </StepNav>
    </div>
  );
}

// ── 2. Details ─────────────────────────────────────────────────────────────
type Details = {
  artist_name: string; legal_name: string; email: string; phone: string; instagram_handle: string; tiktok_url: string; youtube_url: string;
  track_title: string; explicit: boolean; wants_distribution: boolean; pro_affiliation: string; ipi_number: string; distro_email: string;
  producer_name: string; producer_stage_name: string; producer_pro: string; producer_ipi: string; producer_email: string;
  report_preference: "email" | "dashboard" | "both"; notes: string; agreement_accepted: boolean; signature: string;
  dsp_title: string; self_produced: boolean; alt_splits: boolean; splits: { pmg: number; artist: number; producer: number };
};
const EMPTY: Details = {
  artist_name: "", legal_name: "", email: "", phone: "", instagram_handle: "", tiktok_url: "", youtube_url: "", track_title: "", explicit: false,
  wants_distribution: false, pro_affiliation: "", ipi_number: "", distro_email: "", producer_name: "", producer_stage_name: "", producer_pro: "",
  producer_ipi: "", producer_email: "", report_preference: "email", notes: "", agreement_accepted: false, signature: "",
  dsp_title: "", self_produced: false, alt_splits: false, splits: { ...STANDARD_SPLITS.master },
};

function IgCard({ p }: { p: IgProfile }) {
  return (
    <a href={p.url} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-4 border border-bone p-3 hover:bg-coal">
      <span className="h-12 w-12 shrink-0 overflow-hidden bg-coal">{p.picture && <img src={p.picture} alt="" className="h-full w-full object-cover" />}</span>
      <span className="min-w-0">
        <span className="block truncate text-[16px] font-bold text-bone">@{p.handle}{p.name ? ` · ${p.name}` : ""}</span>
        <span className="block text-[13px] leading-5 text-ash">
          {p.verified ? `${(p.followers ?? 0).toLocaleString()} followers · ${p.posts ?? 0} posts · linked` : "Profile linked. We'll confirm it's public."}
        </span>
      </span>
    </a>
  );
}

function DetailsStep({ initial, busy, onBack, onSubmit, forceDistribution, showAdResults }: { initial: Details; busy: boolean; onBack: () => void; onSubmit: (d: Details) => void; forceDistribution: boolean; showAdResults: boolean }) {
  const [d, setD] = useState<Details>({ ...initial, wants_distribution: forceDistribution });
  const [ig, setIg] = useState<IgProfile | null>(null);
  const [igBusy, setIgBusy] = useState(false);
  const [showLinks, setShowLinks] = useState(!!(initial.tiktok_url || initial.youtube_url));
  const [errors, setErrors] = useState<Partial<Record<keyof Details, string>>>({});
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof Details>(k: K, v: Details[K]) => { setD((x) => ({ ...x, [k]: v })); if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined })); if (err) setErr(null); };

  // One rule per field, run on blur and again on submit. Specific text, not "invalid".
  const rules: Partial<Record<keyof Details, (v: Details) => string | undefined>> = {
    artist_name: (v) => (v.artist_name.trim() ? undefined : "Your artist name, as it goes live."),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim()) ? undefined : "An email we can reach you at, like name@domain.com."),
    instagram_handle: (v) => (v.instagram_handle.trim() ? undefined : "The collab post goes to your Instagram. Add the handle."),
    phone: (v) => (!v.phone.trim() || /^[+\d][\d\s().-]{6,}$/.test(v.phone.trim()) ? undefined : "Digits only, with the area code."),
    tiktok_url: (v) => (!v.tiktok_url.trim() || /tiktok\.com\//i.test(v.tiktok_url) || /^@?[\w.]+$/.test(v.tiktok_url.trim()) ? undefined : "A tiktok.com link or your @handle."),
    youtube_url: (v) => (!v.youtube_url.trim() || /youtu(\.be|be\.com)\//i.test(v.youtube_url) || /^@?[\w.-]+$/.test(v.youtube_url.trim()) ? undefined : "A youtube.com link or your @handle."),
    legal_name: (v) => (!v.wants_distribution || v.legal_name.trim() ? undefined : "Your full legal name goes on the release agreement."),
    pro_affiliation: (v) => (!v.wants_distribution || v.pro_affiliation ? undefined : "Pick your PRO, or None."),
    ipi_number: (v) => (!v.wants_distribution || /^(none|n\/a|no)$/i.test(v.ipi_number.trim()) || v.ipi_number.replace(/\D/g, "").length >= 9 ? undefined : "9 to 11 digits, or type none."),
    distro_email: (v) => (!v.wants_distribution || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.distro_email.trim()) ? undefined : "The email on your distro account."),
    producer_name: (v) => (!v.wants_distribution || v.self_produced || v.producer_name.trim() ? undefined : "Producer's legal name, or mark it self-produced."),
    producer_stage_name: (v) => (!v.wants_distribution || v.self_produced || v.producer_stage_name.trim() ? undefined : "Producer's stage name."),
    producer_pro: (v) => (!v.wants_distribution || v.self_produced || v.producer_pro ? undefined : "Producer's PRO, or None."),
    producer_ipi: (v) => (!v.wants_distribution || v.self_produced || /^(none|n\/a|no)$/i.test(v.producer_ipi.trim()) || v.producer_ipi.replace(/\D/g, "").length >= 9 ? undefined : "9 to 11 digits, or none."),
    producer_email: (v) => (!v.wants_distribution || v.self_produced || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.producer_email.trim()) ? undefined : "Producer's email, for their copy of the agreement."),
    signature: (v) => (!v.wants_distribution ? undefined : !v.signature.trim() ? "Type your full legal name to sign." : v.signature.trim().toLowerCase() !== v.legal_name.trim().toLowerCase() ? "Must match your legal name exactly." : undefined),
  };
  const check = (k: keyof Details) => () => { const m = rules[k]?.(d); setErrors((e) => ({ ...e, [k]: m })); };

  async function findIg() {
    const h = d.instagram_handle.trim();
    if (!h) return;
    setIgBusy(true);
    try { setIg(await api.igLookup(h)); } catch (e) { setIg({ handle: h.replace(/^@/, ""), url: `https://www.instagram.com/${h.replace(/^@/, "")}/`, verified: false, error: (e as Error).message }); } finally { setIgBusy(false); }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    const found: Partial<Record<keyof Details, string>> = {};
    for (const k of Object.keys(rules) as (keyof Details)[]) { const m = rules[k]!(d); if (m) found[k] = m; }
    if (d.wants_distribution && d.alt_splits && d.splits.pmg + d.splits.artist + d.splits.producer !== 100) found.splits = "Alternate master splits must add up to 100.";
    if (d.wants_distribution && !d.agreement_accepted) found.agreement_accepted = "Tick the box once you have read the agreement.";
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      const el = document.querySelector<HTMLElement>(`[name="${first}"]`) ?? document.querySelector<HTMLElement>('[aria-invalid="true"]');
      el?.scrollIntoView({ block: "center", behavior: "smooth" }); el?.focus?.();
      setErr(`${Object.keys(found).length} thing${Object.keys(found).length > 1 ? "s" : ""} to fix above.`);
      return;
    }
    onSubmit(d);
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-2xl">
      <div className="space-y-12">
        <section className="space-y-6">
          <SectionHead n="01" title="Who you are">Anything missing delays your release. Fill it out once.</SectionHead>
          <Input id="artist_name" name="artist_name" label="Artist name" hint="Exactly as it should appear on every platform. Spelling, spacing, capitals." required autoComplete="nickname" value={d.artist_name} onChange={(e) => set("artist_name", e.target.value)} onBlur={check("artist_name")} error={errors.artist_name} />
          <div className="grid gap-6 sm:grid-cols-2">
            <Input id="email" name="email" label="Email" hint="The one you actually check." type="email" inputMode="email" autoComplete="email" required value={d.email} onChange={(e) => set("email", e.target.value)} onBlur={check("email")} error={errors.email} />
            <Input id="phone" name="phone" label="Phone" hint="For shoot-day texts only." optional type="tel" inputMode="tel" autoComplete="tel" value={d.phone} onChange={(e) => set("phone", e.target.value)} onBlur={check("phone")} error={errors.phone} />
          </div>
          <div>
            <div className="flex items-end gap-2">
              <div className="flex-1"><Input id="instagram_handle" name="instagram_handle" label="Instagram" hint="Handle or link. The collab post goes here." required placeholder="@yourname" autoComplete="off" autoCapitalize="none" value={d.instagram_handle} onChange={(e) => { set("instagram_handle", e.target.value); setIg(null); }} onBlur={() => { check("instagram_handle")(); findIg(); }} error={errors.instagram_handle} /></div>
              <Button tone="ghost" onClick={findIg} disabled={igBusy || !d.instagram_handle} className={errors.instagram_handle ? "mb-7" : ""}>{igBusy ? "Finding…" : "Find"}</Button>
            </div>
            {ig && <IgCard p={ig} />}
          </div>
          {!showLinks ? (
            <TextButton onClick={() => setShowLinks(true)}>+ Add TikTok or YouTube</TextButton>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              <Input id="tiktok_url" name="tiktok_url" label="TikTok" optional placeholder="tiktok.com/@…" type="url" inputMode="url" autoComplete="url" value={d.tiktok_url} onChange={(e) => set("tiktok_url", e.target.value)} onBlur={check("tiktok_url")} error={errors.tiktok_url} />
              <Input id="youtube_url" name="youtube_url" label="YouTube" optional placeholder="youtube.com/@…" type="url" inputMode="url" autoComplete="url" value={d.youtube_url} onChange={(e) => set("youtube_url", e.target.value)} onBlur={check("youtube_url")} error={errors.youtube_url} />
            </div>
          )}
        </section>

        <section className="space-y-6">
          <SectionHead n="02" title="The record" />
          <Input id="track_title" name="track_title" label="Track title" hint="Exactly as it should appear. It can come later." optional value={d.track_title} onChange={(e) => set("track_title", e.target.value)} />
          <Toggle label="This record is explicit" hint="Be honest. A wrong answer gets the post throttled on TikTok." checked={d.explicit} onChange={(v) => set("explicit", v)} />
          {showAdResults && (
            <Select label="Ad results" hint="How you want to see what the ad dollars did." value={d.report_preference} onChange={(e) => set("report_preference", e.target.value as Details["report_preference"])}>
              <option value="email">Emailed report when the run ends</option>
              <option value="dashboard">Live shared dashboard link</option>
              <option value="both">Both</option>
            </Select>
          )}
          <Textarea label="Notes" hint="Anything we should know." optional value={d.notes} onChange={(e) => set("notes", e.target.value)} />
        </section>

        {d.wants_distribution && (
          <section className="space-y-6">
            <SectionHead n="03" title="Release agreement">
              {forceDistribution ? "DSP Release: released under Propmyganda on every DSP. This agreement is part of the plan." : "PMG distribution for this record."}
            </SectionHead>
            <Input id="legal_name" name="legal_name" label="Legal name" hint="Goes on the agreement." required autoComplete="name" value={d.legal_name} onChange={(e) => set("legal_name", e.target.value)} onBlur={check("legal_name")} error={errors.legal_name} />
            <Input id="dsp_title" name="dsp_title" label="Different title?" optional hint={`Standard DSP title: "${d.artist_name || "Your Artist Name"}" Propmyganda Performance. Leave blank to use it.`} value={d.dsp_title} onChange={(e) => set("dsp_title", e.target.value)} />
            <div className="grid items-start gap-6 sm:grid-cols-2">
              <Select name="pro_affiliation" label="Your PRO" hint="Your performing rights organization." required value={d.pro_affiliation} onChange={(e) => set("pro_affiliation", e.target.value)} onBlur={check("pro_affiliation")} error={errors.pro_affiliation}>{PRO_OPTIONS.map((o) => <option key={o} value={o}>{o || "Select"}</option>)}</Select>
              <Input id="ipi_number" name="ipi_number" label="IPI number" required hint="9 to 11 digits, or type none." inputMode="numeric" value={d.ipi_number} onChange={(e) => set("ipi_number", e.target.value)} onBlur={check("ipi_number")} error={errors.ipi_number} />
            </div>
            <Input id="distro_email" name="distro_email" label="Distro email" required hint="The email on your DistroKid or UnitedMasters account." type="email" inputMode="email" value={d.distro_email} onChange={(e) => set("distro_email", e.target.value)} onBlur={check("distro_email")} error={errors.distro_email} />

            <Toggle label="I produced this record myself" hint="Producer credit and split stay with you." checked={d.self_produced} onChange={(v) => set("self_produced", v)} />
            {!d.self_produced && (
              <div className="space-y-6 border-l-4 border-rule pl-5">
                <div className="grid gap-6 sm:grid-cols-2">
                  <Input id="producer_name" name="producer_name" label="Producer legal name" required value={d.producer_name} onChange={(e) => set("producer_name", e.target.value)} onBlur={check("producer_name")} error={errors.producer_name} />
                  <Input id="producer_stage_name" name="producer_stage_name" label="Producer stage name" required value={d.producer_stage_name} onChange={(e) => set("producer_stage_name", e.target.value)} onBlur={check("producer_stage_name")} error={errors.producer_stage_name} />
                  <Select name="producer_pro" label="Producer PRO" hint="Their performing rights organization." required value={d.producer_pro} onChange={(e) => set("producer_pro", e.target.value)} onBlur={check("producer_pro")} error={errors.producer_pro}>{PRO_OPTIONS.map((o) => <option key={o} value={o}>{o || "Select"}</option>)}</Select>
                  <Input id="producer_ipi" name="producer_ipi" label="Producer IPI" required hint="9 to 11 digits, or none." inputMode="numeric" value={d.producer_ipi} onChange={(e) => set("producer_ipi", e.target.value)} onBlur={check("producer_ipi")} error={errors.producer_ipi} />
                </div>
                <Input id="producer_email" name="producer_email" label="Producer email" required hint="They get a copy of the agreement." type="email" inputMode="email" value={d.producer_email} onChange={(e) => set("producer_email", e.target.value)} onBlur={check("producer_email")} error={errors.producer_email} />
              </div>
            )}

            <div className="border border-rule p-5">
              <span className="block text-[12px] font-bold uppercase tracking-[0.16em] text-smoke">Splits</span>
              <span className="mt-3 block text-[16px] font-medium leading-6 text-bone">Master · PMG {STANDARD_SPLITS.master.pmg}% / Artist {STANDARD_SPLITS.master.artist}% / Producer {STANDARD_SPLITS.master.producer}%</span>
              <span className="block text-[15px] leading-6 text-smoke">Publishing · PMG {STANDARD_SPLITS.publishing.pmg} / Artist {STANDARD_SPLITS.publishing.artist} / Producer {STANDARD_SPLITS.publishing.producer} (of 200)</span>
              <div className="mt-4">
                <Toggle label="Request a different master split" hint="All contributors must have agreed. Applies to this release only." checked={d.alt_splits} onChange={(v) => set("alt_splits", v)} />
              </div>
              {d.alt_splits && (
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  {(["pmg", "artist", "producer"] as const).map((k) => (
                    <Input key={k} name={k === "pmg" ? "splits" : undefined} label={`${k === "pmg" ? "PMG" : k[0].toUpperCase() + k.slice(1)} %`} type="number" inputMode="numeric" min={0} max={100} value={d.splits[k]} onChange={(e) => set("splits", { ...d.splits, [k]: Number(e.target.value) })} />
                  ))}
                  <span className={`text-[14px] font-medium sm:col-span-3 ${d.splits.pmg + d.splits.artist + d.splits.producer === 100 ? "text-ash" : "text-blood-hi"}`}>
                    Total {d.splits.pmg + d.splits.artist + d.splits.producer}%. It must be 100.
                  </span>
                </div>
              )}
            </div>

            <div>
              <span className="block text-[12px] font-bold uppercase tracking-[0.16em] text-smoke">PMG Streaming Release Agreement</span>
              <pre tabIndex={0} className="mt-3 max-h-80 overflow-y-auto whitespace-pre-wrap border border-rule bg-coal p-5 font-sans text-[14px] leading-6 text-bone/90">{AGREEMENT_TEXT}</pre>
            </div>
            <div>
              <Toggle label="I have read and agree to the PMG Streaming Release Agreement" hint="Binding electronic contract. A signed copy is emailed to you." checked={d.agreement_accepted} onChange={(v) => set("agreement_accepted", v)} />
              {errors.agreement_accepted && <span role="alert" className="mt-2 block text-[13px] font-medium leading-5 text-blood-hi">{errors.agreement_accepted}</span>}
            </div>
            <Input id="signature" name="signature" label="Signature" required hint={`Type your full legal name${d.legal_name ? `: ${d.legal_name}` : ""}.`} autoComplete="off" value={d.signature} onChange={(e) => set("signature", e.target.value)} onBlur={check("signature")} error={errors.signature} />
          </section>
        )}
      </div>

      {err && <div className="mt-8"><ErrorLine>{err}</ErrorLine></div>}
      <StepNav onBack={onBack}>
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Continue"}</Button>
      </StepNav>
    </form>
  );
}

// ── 3. Upload ──────────────────────────────────────────────────────────────
function UploadStep({ session, uploads, setUploads, onBack, onNext }: { session: Session; uploads: Upload[]; setUploads: (u: Upload[]) => void; onBack: () => void; onNext: () => void }) {
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [err, setErr] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = Object.values(progress).some((p) => p < 100);

  const add = useCallback(async (files: FileList | File[]) => {
    setErr(null);
    for (const file of Array.from(files)) {
      if (file.size > 2 * 1024 ** 3) { setErr(`${file.name} is over 2 GB.`); continue; }
      setProgress((p) => ({ ...p, [file.name]: 0 }));
      try {
        const u = await api.upload(session, file, (pct) => setProgress((p) => ({ ...p, [file.name]: pct })));
        setUploads([...uploads, u]);
        uploads.push(u);
      } catch (e) {
        setErr(`${file.name}: ${(e as Error).message}`);
        setProgress((p) => { const { [file.name]: _x, ...rest } = p; return rest; });
      }
    }
  }, [session, uploads, setUploads]);

  const pending = Object.entries(progress).filter(([, p]) => p < 100);
  return (
    <div className="mx-auto max-w-2xl">
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
        className={`border-2 border-dashed px-6 py-12 text-center transition-colors ${over ? "border-bone bg-coal" : "border-rule"}`}
      >
        <p className="font-poster text-[36px] uppercase leading-none text-bone md:text-[44px]">Drop the final master</p>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-6 text-smoke">Final. Not the rough, not the "almost."</p>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && add(e.target.files)} accept="audio/*,video/*,image/*,.zip" />
        <Button className="mt-6" onClick={() => inputRef.current?.click()}>Choose files</Button>
        <p className="mt-5 text-[13px] leading-5 text-ash">Audio: WAV, FLAC or MP3 · Video: MP4 or MOV · Artwork · Up to 2 GB each</p>
      </div>

      {(uploads.length > 0 || pending.length > 0) && (
        <ul className="mt-6 divide-y divide-rule border border-rule">
          {uploads.map((u) => (
            <li key={u.path} className="flex items-center justify-between gap-4 px-4 py-3 text-[15px]">
              <span className="truncate font-medium text-bone">{u.name}</span>
              <span className="flex shrink-0 items-center gap-2 text-[13px] text-smoke"><span aria-hidden="true" className="flex h-5 w-5 items-center justify-center bg-blood text-white"><Check /></span>{fmtBytes(u.size)} · received</span>
            </li>
          ))}
          {pending.map(([name, p]) => (
            <li key={name} className="px-4 py-3 text-[15px]">
              <span className="flex items-center justify-between gap-4">
                <span className="truncate font-medium text-bone">{name}</span>
                <span className="shrink-0 text-[13px] text-smoke">Uploading {p}%</span>
              </span>
              <span className="mt-2 block h-1 bg-rule" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label={`Uploading ${name}`}><span className="block h-1 bg-blood transition-all" style={{ width: `${p}%` }} /></span>
            </li>
          ))}
        </ul>
      )}
      {err && <div className="mt-6"><ErrorLine>{err}</ErrorLine></div>}

      <StepNav onBack={onBack} summary={uploads.length === 0 ? "No file yet? You can send it later by reply." : `${uploads.length} file${uploads.length > 1 ? "s" : ""} received.`}>
        <Button tone={uploads.length || busy ? "red" : "ghost"} onClick={onNext} disabled={busy}>{busy ? "Uploading…" : uploads.length ? "Continue" : "Skip for now"}</Button>
      </StepNav>
    </div>
  );
}

// ── 4. Schedule ────────────────────────────────────────────────────────────
const NY = "America/New_York";
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-US", { timeZone: NY, weekday: "short", month: "short", day: "numeric" });
const timeKey = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { timeZone: NY, hour: "numeric", minute: "2-digit" });

// Calendar helpers. Days are New York days, written YYYY-MM-DD so they sort and compare as text.
const isoDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: NY });
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthName = (y: number, m: number) => new Date(Date.UTC(y, m, 1, 12)).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", year: "numeric" });

/** A month calendar: open days are outlined, the rest are greyed. Pick a day, then a time on that day.
 *  `allTimes` lists every possible time so taken ones show as struck out. */
function DayTimePicker({ slots, value, onPick, allTimes, label }: { slots: Slot[] | null; value: string | null; onPick: (s: string) => void; allTimes?: string[]; label: string }) {
  const byDay = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots ?? []) { const k = isoDay(s.start); map.set(k, [...(map.get(k) ?? []), s]); }
    return map;
  }, [slots]);
  const open = useMemo(() => [...byDay.keys()].sort(), [byDay]);
  const [day, setDay] = useState<string | null>(value ? isoDay(value) : null);
  // The month on screen, as "YYYY-MM". Starts on the picked day's month, else the first month with an open day.
  const [month, setMonth] = useState<string | null>(value ? isoDay(value).slice(0, 7) : null);
  useEffect(() => { if (value) { setDay(isoDay(value)); setMonth(isoDay(value).slice(0, 7)); } }, [value]);
  if (slots === null) return <Note>Checking the calendar…</Note>;
  if (open.length === 0) return <Note>No open slots right now. Continue and we'll place you by email.</Note>;

  const first = open[0].slice(0, 7), last = open[open.length - 1].slice(0, 7);
  const shownMonth = month ?? first;
  const [y, m] = shownMonth.split("-").map(Number);
  const step = (by: number) => { const d = new Date(Date.UTC(y, m - 1 + by, 1)); setMonth(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`); };
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  const current = day ? byDay.get(day) ?? null : null;
  const times = current ? (allTimes ?? current.map((s) => timeKey(s.start))) : [];
  const arrow = "flex h-11 w-11 items-center justify-center border border-edge text-bone transition-colors hover:border-bone disabled:cursor-not-allowed disabled:border-rule disabled:text-ash/50";
  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] md:gap-10">
      <div>
        <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.16em] text-smoke">1 · Pick a day</p>
        <div className="border border-rule p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <button type="button" onClick={() => step(-1)} disabled={shownMonth <= first} aria-label="Previous month" className={arrow}><span aria-hidden="true" className="h-2.5 w-2.5 translate-x-0.5 rotate-45 border-b-2 border-l-2 border-current" /></button>
            <span aria-live="polite" className="font-poster text-[24px] uppercase leading-none tracking-[0.02em] text-bone">{monthName(y, m - 1)}</span>
            <button type="button" onClick={() => step(1)} disabled={shownMonth >= last} aria-label="Next month" className={arrow}><span aria-hidden="true" className="h-2.5 w-2.5 -translate-x-0.5 rotate-45 border-r-2 border-t-2 border-current" /></button>
          </div>
          <div aria-hidden="true" className="grid grid-cols-7 gap-1 pb-1 text-center text-[11px] font-bold uppercase tracking-[0.1em] text-ash">
            {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
          </div>
          <div role="group" aria-label={`${label}: day`} className="grid grid-cols-7 gap-1">
            {cells.map((n, i) => {
              if (n === null) return <span key={`pad-${i}`} />;
              const key = `${shownMonth}-${String(n).padStart(2, "0")}`;
              const isOpen = byDay.has(key);
              const active = day === key;
              if (!isOpen) return <span key={key} className="flex aspect-square min-h-[40px] items-center justify-center text-[15px] text-ash/50">{n}</span>;
              return (
                <button key={key} type="button" onClick={() => setDay(key)} aria-pressed={active} aria-label={dayKey(byDay.get(key)![0].start)} className={`flex aspect-square min-h-[40px] items-center justify-center border-2 text-[16px] font-bold transition-colors ${pick(active)}`}>
                  {n}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[13px] leading-5 text-ash">Outlined days are open. Times are New York.</p>
        </div>
      </div>

      <div>
        <p className={`mb-3 text-[12px] font-bold uppercase tracking-[0.16em] ${current ? "text-smoke" : "text-ash"}`}>2 · Pick a time{current ? ` on ${dayKey(current[0].start)}` : ""}</p>
        {current ? (
          <div role="group" aria-label={`${label}: time`} className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-2">
            {times.map((t) => {
              const slot = current.find((s) => timeKey(s.start) === t);
              const active = !!slot && value === slot.start;
              return (
                <button key={t} type="button" disabled={!slot} onClick={() => slot && onPick(slot.start)} aria-pressed={active} className={`min-h-[48px] border-2 px-3 text-[15px] font-bold transition-colors disabled:cursor-not-allowed disabled:border-rule disabled:font-medium disabled:text-ash disabled:line-through ${slot ? pick(active) : ""}`}>
                  {t}{!slot ? " · taken" : ""}
                </button>
              );
            })}
          </div>
        ) : (
          <Note>Times show once you pick a day.</Note>
        )}
      </div>
    </div>
  );
}

const RELEASE_TIMES = ["3:00 PM", "4:00 PM", "6:00 PM"];
const SHOOT_TIMES = ["1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM"];

/** The slot you locked, said back to you. */
function Locked({ children }: { children: ReactNode }) {
  return (
    <p className="mt-5 flex items-center gap-3 border-l-4 border-blood bg-coal px-4 py-3 text-[15px] font-bold leading-6 text-bone">{children}</p>
  );
}

function ScheduleStep({ session, needsSession, postAt, sessionAt, onBack, onNext }: { session: Session; needsSession: boolean; postAt: string | null; sessionAt: string | null; onBack: () => void; onNext: (post: string | null, sess: string | null) => void }) {
  const [post, setPost] = useState<Slot[] | null>(null);
  const [sess, setSess] = useState<Slot[] | null>(null);
  const [pickPost, setPickPost] = useState(postAt);
  const [pickSess, setPickSess] = useState(sessionAt);
  useEffect(() => {
    api.availability(session, "post").then((r) => setPost(r.slots)).catch(() => setPost([]));
    if (needsSession) api.availability(session, "session").then((r) => setSess(r.slots)).catch(() => setSess([]));
  }, [session, needsSession]);

  const [skipRelease, setSkipRelease] = useState(false);
  const shootReady = !needsSession || !!pickSess || (sess?.length ?? 0) === 0;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="space-y-14">
        {needsSession && (
          <section>
            <SectionHead n="01" title="Book your shoot">30 minutes in the room, DUMBO. Monday to Friday, 1 to 8pm, on the hour. Live from the PMG calendar: a struck-out time is already taken.</SectionHead>
            <div className="mt-6"><DayTimePicker label="Shoot" slots={sess} value={pickSess} onPick={setPickSess} allTimes={SHOOT_TIMES} /></div>
            {pickSess && <Locked>Shoot · {fmtSlot(pickSess)} ET · 30 min</Locked>}
          </section>
        )}

        <section>
          <SectionHead n={needsSession ? "02" : "01"} title="Pick your release date">Posts go out at 3, 4 or 6pm New York. Pick it now and it comes off the board for everyone else, or skip and we place you by email.</SectionHead>
          {!skipRelease ? (
            <>
              <div className="mt-6"><DayTimePicker label="Release" slots={post} value={pickPost} onPick={setPickPost} allTimes={RELEASE_TIMES} /></div>
              {pickPost && <Locked>Release · {fmtSlot(pickPost)} ET</Locked>}
              <TextButton onClick={() => { setSkipRelease(true); setPickPost(null); }} className="mt-4">Not sure yet. Place me by email.</TextButton>
            </>
          ) : (
            <>
              <Locked>Release · to be placed by email</Locked>
              <TextButton onClick={() => setSkipRelease(false)} className="mt-4">Pick a date instead</TextButton>
            </>
          )}
        </section>
      </div>

      <StepNav onBack={onBack} summary={!shootReady ? "Pick a shoot day and time to continue." : undefined}>
        <Button onClick={() => onNext(skipRelease ? null : pickPost, pickSess)} disabled={!shootReady}>Continue</Button>
      </StepNav>
    </div>
  );
}

// ── 5. Pay ─────────────────────────────────────────────────────────────────
function PayStep({ session, order, onBack }: { session: Session; order: Order; onBack: () => void }) {
  const depositOk = quote(order.tier, order.ad_budget_cents, "deposit").plan === "deposit";
  const [plan, setPlan] = useState<PaymentPlan>(depositOk && order.payment_plan === "full" && !order.paid_at ? "deposit" : order.payment_plan);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const q = quote(order.tier, order.ad_budget_cents, plan);
  const free = q.dueNowCents === 0;

  async function pay() {
    setBusy(true); setErr(null);
    try {
      if (free) {
        await api.confirm(session);
        saveSession(null);
        window.location.href = `/start/done?order=${session.orderId}&token=${session.token}`;
        return;
      }
      const r = await api.checkout(session, plan);
      if (r.url) window.location.href = r.url;
      else setErr(r.error ?? "Checkout is not available yet.");
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  const row = (k: string, v: string) => (
    <div className="flex items-baseline justify-between gap-6 border-b border-rule py-3 text-[15px] leading-6">
      <dt className="shrink-0 text-ash">{k}</dt><dd className="text-right font-medium text-bone">{v}</dd>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="space-y-10">
        {q.tier.depositAllowed && (
          <section>
            <SectionHead n="01" title="How you're paying" />
            <div role="radiogroup" aria-label="Payment plan" className="mt-5 grid gap-4 sm:grid-cols-2">
              {(["deposit", "full"] as PaymentPlan[]).map((p) => {
                const pq = quote(order.tier, order.ad_budget_cents, p);
                const active = plan === p;
                return (
                  <button key={p} type="button" role="radio" aria-checked={active} onClick={() => setPlan(p)} className={`flex flex-col border-2 p-5 text-left transition-colors ${pick(active)}`}>
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-[13px] font-bold uppercase tracking-[0.14em]">{p === "full" ? "Pay in full" : "50% deposit · locks your date"}</span>
                      <PickMark active={active} />
                    </span>
                    <span className="mt-4 font-poster text-[52px] leading-[0.9]">{formatUsd(pq.dueNowCents)}</span>
                    <span className={`mt-3 text-[14px] leading-[22px] ${active ? "text-[#444444]" : "text-ash"}`}>{p === "full" ? `Nothing else owed${q.tier.financing ? ". Affirm available." : "."}` : `${formatUsd(pq.balanceCents)} the day before the shoot, charged to this card. Or pay it earlier by link, or in cash.`}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <SectionHead n={q.tier.depositAllowed ? "02" : "01"} title="Your order" />
          <div className="mt-5 border border-rule bg-coal p-5 md:p-6">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.16em] text-smoke">{order.catalogue_no} · {free ? "your booking" : "receipt preview"}</p>
            <dl>
              {row("Artist", order.artist_name)}
              {row("Plan", priceLabel(q.tier) ? `${q.tier.name} · ${priceLabel(q.tier)}` : q.tier.name)}
              {q.adBudgetCents > 0 && row("Extra ad budget", formatUsd(q.adBudgetCents))}
              {row("Release", order.post_at ? `${fmtSlot(order.post_at)} ET` : "to be placed")}
              {order.session_at && row("Shoot", `${fmtSlot(order.session_at)} ET · 30 min`)}
              {row("Files", String(order.uploads?.length ?? 0))}
              {order.wants_distribution && row("Distribution", `agreement signed by ${order.signature ?? order.legal_name}`)}
              {q.tier.revenueShare ? row("PMG's share", "from the streaming split you signed") : !free && row("Total", formatUsd(q.totalCents))}
              {q.balanceCents > 0 && row("Balance before posting", formatUsd(q.balanceCents))}
            </dl>
            {!free && (
              <div className="flex items-end justify-between gap-6 pt-5">
                <span className="text-[13px] font-bold uppercase tracking-[0.14em] text-bone">Due now</span>
                <span className="font-poster text-[52px] leading-[0.85] text-bone md:text-[64px]">{formatUsd(q.dueNowCents)}</span>
              </div>
            )}
          </div>
        </section>

        {free ? (
          <Note>Confirm and your date is held, the calendar is booked{order.wants_distribution ? " and the agreement goes out by email" : ""}.</Note>
        ) : (
          <ul className="grid gap-x-5 gap-y-6 sm:grid-cols-3">
            {[
              ["Payments by Stripe", `Cards, Apple Pay, Google Pay, Link${q.tier.financing && q.dueNowCents >= AFFIRM_MIN_CENTS ? ". Affirm to pay over time." : "."}`],
              ["Your date, held", "Deposit or full, paid means booked. Move the shoot free up to 7 days before."],
              ["A person on the other end", "Jay confirms by email. Questions now: the chat at the top of this page."],
            ].map(([k, v]) => (
              <li key={k} className="border-t-[3px] border-bone pt-3">
                <span className="block text-[15px] font-bold leading-6 text-bone">{k}</span>
                <span className="mt-1 block text-[14px] leading-[22px] text-ash">{v}</span>
              </li>
            ))}
          </ul>
        )}
        {err && <ErrorLine>{err}</ErrorLine>}
      </div>

      <StepNav onBack={onBack}>
        <Button onClick={pay} disabled={busy}>{busy ? (free ? "Confirming…" : "Opening checkout…") : free ? "Confirm" : `Pay ${formatUsd(q.dueNowCents)}`}</Button>
      </StepNav>

      <div className="pt-12">
        <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-smoke">While you're here · the area</p>
        <AreaBlocks compact from={1} />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function Start() {
  const [params] = useSearchParams();
  const [step, setStep] = useState(0);
  const [tier, setTier] = useState<TierId>(getTier(params.get("tier") ?? "")?.public ? (params.get("tier") as TierId) : "basic");
  const [invite, setInvite] = useState<{ code: string; label: string | null } | null>(null);
  const [inviteErr, setInviteErr] = useState<string | null>(null);
  const [adBudget, setAdBudget] = useState(0);
  const [details, setDetails] = useState<Details>(EMPTY);
  const [session, setSession] = useState<Session | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const uploads = useMemo(() => order?.uploads ?? [], [order]);

  // Invite link: /start?invite=CODE unlocks the Invited plan and hides the public tiers.
  useEffect(() => {
    const code = params.get("invite");
    if (!code) return;
    api.inviteCheck(code).then((r) => {
      if (r.ok) { setInvite({ code: code.toUpperCase(), label: r.label ?? null }); setTier((r.tier as TierId) || "comp"); }
      else setInviteErr(r.reason ?? "That invite link isn't valid.");
    }).catch((e) => {
      const m = (e as Error).message;
      // An old build of the backend has no invite-check and answers with its order lookup instead.
      setInviteErr(/order not found|unknown action/i.test(m) ? "The site's backend hasn't been updated yet, so invite links can't be checked. Ask PMG to republish and try again." : m);
    });
  }, [params]);

  // Resume: from the Stripe cancel link or from a saved session on this device.
  useEffect(() => {
    const resume = params.get("resume"), token = params.get("token");
    const s: Session | null = resume && token ? { orderId: resume, token, step: 4 } : loadSession();
    if (!s) return;
    setSession(s);
    api.status(s).then(({ order: o }) => {
      if (["paid", "deposit_paid", "scheduled", "done"].includes(o.status)) { saveSession(null); setSession(null); return; }
      setOrder(o); setTier(o.tier as TierId); setAdBudget(o.ad_budget_cents);
      setStep(Math.min(s.step, 4));
    }).catch(() => { saveSession(null); setSession(null); });
  }, [params]);

  // Funnel: one event per step reached, and the furthest step on the order itself.
  const tracked = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (tracked.current.has(step)) return;
    tracked.current.add(step);
    api.track({ visitor: visitorId(), step: step + 1, tier, invite: !!invite, orderId: session?.orderId });
    if (session && step >= 2) api.update(session, {}, step + 1).catch(() => undefined);
  }, [step, tier, invite, session]);

  const go = (n: number) => { setStep(n); window.scrollTo({ top: 0, behavior: "smooth" }); if (session) saveSession({ ...session, step: n }); };

  async function submitDetails(d: Details) {
    const { alt_splits, splits, ...rest } = d;
    const payload = { ...rest, splits: alt_splits ? splits : null };
    setBusy(true); setErr(null); setDetails(d);
    try {
      if (session) {
        const { order: o } = await api.update(session, { ...payload, tier, adBudgetCents: adBudget });
        setOrder(o);
      } else {
        const r = await api.create({ tier, adBudgetCents: adBudget, invite: invite?.code, visitor: visitorId(), ...payload });
        const s = { orderId: r.orderId, token: r.token, step: 2 };
        setSession(s); saveSession(s);
        const { order: o } = await api.status(s);
        setOrder(o);
      }
      go(2);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  async function submitSchedule(post: string | null, sess: string | null) {
    if (!session) return;
    setBusy(true); setErr(null);
    try { const { order: o } = await api.update(session, { post_at: post, session_at: sess }); setOrder(o); go(4); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  const tierDef = quote(tier, adBudget).tier;
  const free = quote(tier, order?.ad_budget_cents ?? adBudget).totalCents === 0;
  const invited = !!tierDef.inviteOnly;
  const names = stepNames(free, invited);

  return (
    <main className="min-h-screen bg-ink font-sans text-bone">
      <SEO title="Start — PMG" description="Pick a tier, pay, book, upload. Done. The PMG release flow." path="/start" />
      <header className="mx-auto max-w-5xl px-6 pb-8 pt-28 md:px-10 md:pt-36">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-ash">Propmyganda · Release onboarding</p>
          <QuestionsDrawer />
        </div>
        {step === 0 ? (
          <>
            <h1 className="mt-6 font-poster text-[21vw] uppercase leading-[0.86] sm:text-[112px] md:text-[136px]">You're in.</h1>
            <div aria-hidden="true" className="mt-6 h-2.5 w-40 bg-blood" />
            <p className="mt-6 max-w-xl text-[18px] font-medium leading-[1.45] md:text-[22px]">{invite ? "" : "Pick a plan. "}Fill it out once. Pick a date and hold it. We do the rest.</p>
          </>
        ) : (
          <>
            <h1 className="mt-5 font-poster text-[64px] uppercase leading-[0.9] md:text-[96px]">{names[step]}</h1>
            <p className="mt-3 text-[15px] font-medium leading-6 text-smoke">{tierDef.name} · {order?.catalogue_no ?? "PMG-R-###"}</p>
          </>
        )}
      </header>

      <section className="mx-auto max-w-5xl px-6 pb-16 md:px-10">
        <Stepper step={step} onJump={go} free={free} invited={invited} />
        <div className="mt-10">
          {err && <div className="mb-6"><ErrorLine>{err}</ErrorLine></div>}
          {inviteErr && <div className="mb-6"><ErrorLine>{inviteErr} Showing the public plans instead.</ErrorLine></div>}
          {step === 0 && <TierStep tier={tier} setTier={setTier} adBudget={adBudget} setAdBudget={setAdBudget} onNext={() => go(1)} invite={invite} />}
          {step === 1 && <DetailsStep initial={order ? { ...details, artist_name: order.artist_name, legal_name: order.legal_name, email: order.email, phone: order.phone ?? "", instagram_handle: order.instagram_handle ?? "", tiktok_url: order.tiktok_url ?? "", youtube_url: order.youtube_url ?? "", track_title: order.track_title ?? "", explicit: order.explicit, wants_distribution: order.wants_distribution } : details} busy={busy} onBack={() => go(0)} onSubmit={submitDetails} forceDistribution={!!tierDef.distribution} showAdResults={tier === "viral" || adBudget > 0} />}
          {step === 2 && session && <UploadStep session={session} uploads={uploads} setUploads={(u) => setOrder((o) => (o ? { ...o, uploads: u } : o))} onBack={() => go(1)} onNext={() => go(3)} />}
          {step === 3 && session && <ScheduleStep session={session} needsSession={tierDef.bookings.includes("session")} postAt={order?.post_at ?? null} sessionAt={order?.session_at ?? null} onBack={() => go(2)} onNext={submitSchedule} />}
          {step === 4 && session && order && <PayStep session={session} order={order} onBack={() => go(3)} />}
          {step > 0 && !session && step !== 1 && <Note>Session expired. <Link to="/start" className="font-bold text-bone underline decoration-blood decoration-2 underline-offset-4">Start again</Link>.</Note>}
        </div>
      </section>
    </main>
  );
}
