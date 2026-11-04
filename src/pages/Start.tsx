import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import SEO from "@/components/SEO";
import { AGREEMENT_TEXT, STANDARD_SPLITS } from "@/lib/agreement";
import { AD_BUDGET_MAX, AD_BUDGET_MIN, PUBLIC_TIERS, TIERS, formatUsd, getTier, quote, type PaymentPlan, type Tier, type TierId } from "@/lib/tiers";
import { api, fmtBytes, fmtSlot, loadSession, saveSession, type IgProfile, type Order, type Session, type Slot, type Upload } from "@/lib/onboarding";
import { Button, ErrorLine, Input, Note, Select, Textarea, Toggle } from "@/components/start/ui";

const STEPS = ["Tier", "Details", "Upload", "Schedule", "Pay"] as const;
const PRO_OPTIONS = ["", "BMI", "ASCAP", "SESAC", "Other", "None"];

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex gap-1 font-mono text-[10px] uppercase tracking-[0.18em]">
      {STEPS.map((s, i) => (
        <li key={s} className="flex-1 border-t-2 pt-2" style={{ borderColor: i <= step ? "#FFD230" : "#F2EFE9", opacity: i <= step ? 1 : 0.35, color: i === step ? "#FFD230" : "#F2EFE9" }}>
          {String(i + 1).padStart(2, "0")} <span className="hidden sm:inline">{s}</span>
        </li>
      ))}
    </ol>
  );
}

// ── 1. Tier ────────────────────────────────────────────────────────────────
function priceLabel(t: Tier): string {
  if (t.revenueShare) return "$0 up front";
  if (t.inviteOnly) return "On us";
  return formatUsd(t.priceCents);
}

function TierStep({ tier, setTier, adBudget, setAdBudget, onNext, invite }: { tier: TierId; setTier: (t: TierId) => void; adBudget: number; setAdBudget: (n: number) => void; onNext: () => void; invite: { label: string | null } | null }) {
  const q = quote(tier, adBudget);
  // An invite link shows exactly the plan it was issued for (Invited or DSP Release); the public link shows the paid tiers.
  const shown = invite ? TIERS.filter((t) => t.id === tier) : PUBLIC_TIERS;
  return (
    <div>
      {invite && (
        <p className="mb-4 inline-block bg-[#FFD230] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#0B0B0B]">
          Invite accepted{invite.label ? ` · ${invite.label}` : ""}
        </p>
      )}
      <div className={`grid gap-3 ${shown.length > 3 ? "md:grid-cols-2 lg:grid-cols-4" : shown.length > 1 ? "md:grid-cols-3" : "max-w-md"}`}>
        {shown.map((t) => {
          const active = t.id === tier;
          return (
            <button key={t.id} type="button" onClick={() => setTier(t.id)} aria-pressed={active} className="flex flex-col border p-5 text-left transition-colors" style={{ borderColor: active ? "#FFD230" : "rgba(242,239,233,0.3)", background: active ? "rgba(255,210,48,0.06)" : "transparent" }}>
              <span className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: active ? "#FFD230" : "#9A9A9E" }}>
                <span>{t.name}</span><span>PMG-T-{String(TIERS.indexOf(t) + 1).padStart(2, "0")}</span>
              </span>
              <span className="mt-3 font-display text-4xl uppercase leading-none tracking-[-0.03em] text-[#F2EFE9]">{priceLabel(t)}</span>
              <span className="mt-2 text-sm text-[#F2EFE9]/80">{t.tagline}</span>
              <ul className="mt-4 space-y-1.5 font-mono text-[10px] uppercase leading-4 tracking-[0.12em] text-[#9A9A9E]">
                {t.includes.map((i) => <li key={i}>› {i}</li>)}
              </ul>
              {t.financing && <span className="mt-4 inline-block self-start bg-[#FFD230] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-[#0B0B0B]">Affirm · pay over time</span>}
            </button>
          );
        })}
      </div>

      {q.tier.adBudgetAddOn && (
        <div className="mt-6 border border-[#F2EFE9]/30 p-5">
          <Input
            label="Add-on: extra ad budget (USD)"
            hint={`${formatUsd(AD_BUDGET_MIN)} – ${formatUsd(AD_BUDGET_MAX)}, or leave 0`}
            type="number" inputMode="numeric" min={0} step={50}
            value={adBudget ? adBudget / 100 : ""}
            placeholder="0"
            onChange={(e) => setAdBudget(Math.round(Number(e.target.value || 0) * 100))}
          />
          <Note>Every dollar here goes to ad spend. You get the full report when it ends, or we share the dashboard so you watch it live.</Note>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#F2EFE9]/20 pt-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#F2EFE9]">
          {q.tier.revenueShare ? (
            <>Due today <span className="text-[#FFD230]">$0</span><span className="text-[#9A9A9E]"> · PMG is paid from the streaming split you sign</span></>
          ) : q.tier.inviteOnly ? (
            <>Due today <span className="text-[#FFD230]">$0</span></>
          ) : (
            <>Total <span className="text-[#FFD230]">{formatUsd(q.totalCents)}</span>{q.tier.depositAllowed && <span className="text-[#9A9A9E]"> · deposit option at checkout</span>}</>
          )}
        </p>
        <Button onClick={onNext}>Continue →</Button>
      </div>
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
    <a href={p.url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-3 border border-[#FFD230] p-3">
      <span className="h-12 w-12 shrink-0 overflow-hidden bg-[#F2EFE9]/10">{p.picture && <img src={p.picture} alt="" className="h-full w-full object-cover" />}</span>
      <span className="min-w-0">
        <span className="block truncate text-[15px] text-[#F2EFE9]">@{p.handle}{p.name ? ` · ${p.name}` : ""}</span>
        <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-[#9A9A9E]">
          {p.verified ? `${(p.followers ?? 0).toLocaleString()} followers · ${p.posts ?? 0} posts · linked` : "Profile linked · we'll confirm it's public"}
        </span>
      </span>
    </a>
  );
}

function DetailsStep({ initial, busy, onBack, onSubmit, forceDistribution }: { initial: Details; busy: boolean; onBack: () => void; onSubmit: (d: Details) => void; forceDistribution: boolean }) {
  const [d, setD] = useState<Details>(forceDistribution ? { ...initial, wants_distribution: true } : initial);
  const [ig, setIg] = useState<IgProfile | null>(null);
  const [igBusy, setIgBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof Details>(k: K, v: Details[K]) => setD((x) => ({ ...x, [k]: v }));

  async function findIg() {
    const h = d.instagram_handle.trim();
    if (!h) return;
    setIgBusy(true);
    try { setIg(await api.igLookup(h)); } catch (e) { setIg({ handle: h.replace(/^@/, ""), url: `https://www.instagram.com/${h.replace(/^@/, "")}/`, verified: false, error: (e as Error).message }); } finally { setIgBusy(false); }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!d.artist_name || !d.legal_name || !d.email) return setErr("Artist name, legal name and email are required.");
    if (!d.instagram_handle) return setErr("Link your Instagram. The collab post goes to your page.");
    if (d.wants_distribution) {
      if (!d.pro_affiliation || !d.ipi_number || !d.distro_email) return setErr("Distribution needs your PRO, IPI number (or 'none') and distro email.");
      if (!d.self_produced && (!d.producer_name || !d.producer_stage_name || !d.producer_pro || !d.producer_ipi || !d.producer_email)) return setErr("Fill in the producer, or mark the record self-produced.");
      if (d.alt_splits && d.splits.pmg + d.splits.artist + d.splits.producer !== 100) return setErr("Alternate master splits must add up to 100.");
      if (!d.agreement_accepted || !d.signature.trim()) return setErr("Read the agreement, tick the box and sign with your full legal name.");
      if (d.signature.trim().toLowerCase() !== d.legal_name.trim().toLowerCase()) return setErr("Your signature must match your legal name exactly.");
    }
    onSubmit(d);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Artist name" hint="exactly as it goes live" required value={d.artist_name} onChange={(e) => set("artist_name", e.target.value)} />
        <Input label="Legal name" required value={d.legal_name} onChange={(e) => set("legal_name", e.target.value)} />
        <Input label="Email" hint="the one you check" type="email" required value={d.email} onChange={(e) => set("email", e.target.value)} />
        <Input label="Phone" type="tel" value={d.phone} onChange={(e) => set("phone", e.target.value)} />
      </div>

      <div>
        <div className="flex items-end gap-2">
          <div className="flex-1"><Input label="Instagram" hint="handle or link" placeholder="@yourname" value={d.instagram_handle} onChange={(e) => { set("instagram_handle", e.target.value); setIg(null); }} onBlur={findIg} /></div>
          <Button tone="ghost" onClick={findIg} disabled={igBusy || !d.instagram_handle}>{igBusy ? "…" : "Find"}</Button>
        </div>
        {ig && <IgCard p={ig} />}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="TikTok" placeholder="tiktok.com/@…" value={d.tiktok_url} onChange={(e) => set("tiktok_url", e.target.value)} />
        <Input label="YouTube" placeholder="youtube.com/@…" value={d.youtube_url} onChange={(e) => set("youtube_url", e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Track title" hint="exactly as it goes live" value={d.track_title} onChange={(e) => set("track_title", e.target.value)} />
        <Toggle label="Explicit" hint="be honest, a wrong answer gets throttled" checked={d.explicit} onChange={(v) => set("explicit", v)} />
      </div>

      <Select label="Ad results" hint="how you want to see what the ad dollars did" value={d.report_preference} onChange={(e) => set("report_preference", e.target.value as Details["report_preference"])}>
        <option value="email">Emailed report when the run ends</option>
        <option value="dashboard">Live shared dashboard link</option>
        <option value="both">Both</option>
      </Select>

      {forceDistribution ? (
        <div className="border border-[#FFD230] px-3 py-3">
          <span className="block text-[15px] text-[#F2EFE9]">DSP Release · PMG distribution included</span>
          <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-[#9A9A9E]">Released under Propmyganda on every DSP · the release agreement below is part of this plan</span>
        </div>
      ) : (
        <Toggle label="Add PMG distribution to DSPs" hint="Spotify, Apple, Tidal and the rest · fills the release agreement" checked={d.wants_distribution} onChange={(v) => set("wants_distribution", v)} />
      )}
      {d.wants_distribution && (
        <div className="space-y-5 border border-[#F2EFE9]/30 p-4">
          <div>
            <Note>Standard DSP title: "{d.artist_name || "Your Artist Name"}" Propmyganda Performance</Note>
            <Input label="Different title?" hint="leave blank to use the standard title" value={d.dsp_title} onChange={(e) => set("dsp_title", e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="Your PRO" value={d.pro_affiliation} onChange={(e) => set("pro_affiliation", e.target.value)}>{PRO_OPTIONS.map((o) => <option key={o} value={o}>{o || "Select"}</option>)}</Select>
            <Input label="IPI number" hint="9 to 11 digits, or 'none'" value={d.ipi_number} onChange={(e) => set("ipi_number", e.target.value)} />
            <Input label="Distro email" hint="the email on your DistroKid / UnitedMasters account" type="email" value={d.distro_email} onChange={(e) => set("distro_email", e.target.value)} />
          </div>

          <Toggle label="I produced this record myself" hint="producer credit and split stay with you" checked={d.self_produced} onChange={(v) => set("self_produced", v)} />
          {!d.self_produced && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Producer legal name" value={d.producer_name} onChange={(e) => set("producer_name", e.target.value)} />
              <Input label="Producer stage name" value={d.producer_stage_name} onChange={(e) => set("producer_stage_name", e.target.value)} />
              <Select label="Producer PRO" value={d.producer_pro} onChange={(e) => set("producer_pro", e.target.value)}>{PRO_OPTIONS.map((o) => <option key={o} value={o}>{o || "Select"}</option>)}</Select>
              <Input label="Producer IPI" hint="9 to 11 digits, or 'none'" value={d.producer_ipi} onChange={(e) => set("producer_ipi", e.target.value)} />
              <Input label="Producer email" hint="they get a copy of the agreement" type="email" value={d.producer_email} onChange={(e) => set("producer_email", e.target.value)} />
            </div>
          )}

          <div className="border border-[#F2EFE9]/20 p-3">
            <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-[#FFD230]">Splits</span>
            <span className="mt-2 block text-sm text-[#F2EFE9]">Master · PMG {STANDARD_SPLITS.master.pmg}% / Artist {STANDARD_SPLITS.master.artist}% / Producer {STANDARD_SPLITS.master.producer}%</span>
            <span className="block text-sm text-[#F2EFE9]/70">Publishing · PMG {STANDARD_SPLITS.publishing.pmg} / Artist {STANDARD_SPLITS.publishing.artist} / Producer {STANDARD_SPLITS.publishing.producer} (of 200)</span>
            <div className="mt-3">
              <Toggle label="Request a different master split" hint="all contributors must have agreed · applies to this release only" checked={d.alt_splits} onChange={(v) => set("alt_splits", v)} />
            </div>
            {d.alt_splits && (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {(["pmg", "artist", "producer"] as const).map((k) => (
                  <Input key={k} label={`${k === "pmg" ? "PMG" : k[0].toUpperCase() + k.slice(1)} %`} type="number" min={0} max={100} value={d.splits[k]} onChange={(e) => set("splits", { ...d.splits, [k]: Number(e.target.value) })} />
                ))}
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] sm:col-span-3" style={{ color: d.splits.pmg + d.splits.artist + d.splits.producer === 100 ? "#9A9A9E" : "#FF5A36" }}>
                  Total {d.splits.pmg + d.splits.artist + d.splits.producer}% · must be 100
                </span>
              </div>
            )}
          </div>

          <div>
            <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-[#FFD230]">PMG Streaming Release Agreement</span>
            <pre className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap border border-[#F2EFE9]/20 bg-[#0B0B0B] p-4 font-sans text-[13px] leading-5 text-[#F2EFE9]/85">{AGREEMENT_TEXT}</pre>
          </div>
          <Toggle label="I have read and agree to the PMG Streaming Release Agreement" hint="binding electronic contract · a signed copy is emailed to you" checked={d.agreement_accepted} onChange={(v) => set("agreement_accepted", v)} />
          <Input label="Signature" hint={`type your full legal name${d.legal_name ? ` · ${d.legal_name}` : ""}`} value={d.signature} onChange={(e) => set("signature", e.target.value)} />
        </div>
      )}

      <Textarea label="Notes" hint="optional" value={d.notes} onChange={(e) => set("notes", e.target.value)} />

      {err && <ErrorLine>{err}</ErrorLine>}
      <div className="flex items-center justify-between gap-4 border-t border-[#F2EFE9]/20 pt-6">
        <Button tone="ghost" onClick={onBack}>← Back</Button>
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Continue →"}</Button>
      </div>
    </form>
  );
}

// ── 3. Upload ──────────────────────────────────────────────────────────────
function UploadStep({ session, uploads, setUploads, onBack, onNext }: { session: Session; uploads: Upload[]; setUploads: (u: Upload[]) => void; onBack: () => void; onNext: () => void }) {
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [err, setErr] = useState<string | null>(null);
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

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); add(e.dataTransfer.files); }}
        className="border border-dashed border-[#F2EFE9]/40 p-8 text-center"
      >
        <p className="font-display text-2xl uppercase leading-none tracking-[-0.03em] text-[#F2EFE9]">Drop the final master</p>
        <Note>WAV, FLAC, MP3 · video MP4 / MOV · artwork · up to 2 GB each. Final. Not the rough.</Note>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && add(e.target.files)} accept="audio/*,video/*,image/*,.zip" />
        <Button tone="ghost" className="mt-5" onClick={() => inputRef.current?.click()}>Choose files</Button>
      </div>

      {(uploads.length > 0 || Object.keys(progress).length > 0) && (
        <ul className="divide-y divide-[#F2EFE9]/15 border border-[#F2EFE9]/30">
          {uploads.map((u) => (
            <li key={u.path} className="flex items-center justify-between gap-4 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em]">
              <span className="truncate text-[#F2EFE9]">{u.name}</span>
              <span className="shrink-0 text-[#FFD230]">{fmtBytes(u.size)} · received</span>
            </li>
          ))}
          {Object.entries(progress).filter(([, p]) => p < 100).map(([name, p]) => (
            <li key={name} className="flex items-center justify-between gap-4 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em]">
              <span className="truncate text-[#F2EFE9]">{name}</span>
              <span className="shrink-0 text-[#9A9A9E]">uploading {p}%</span>
            </li>
          ))}
        </ul>
      )}
      {err && <ErrorLine>{err}</ErrorLine>}

      <div className="flex items-center justify-between gap-4 border-t border-[#F2EFE9]/20 pt-6">
        <Button tone="ghost" onClick={onBack}>← Back</Button>
        <div className="flex items-center gap-4">
          {uploads.length === 0 && <Note>No file yet? You can send it later by reply.</Note>}
          <Button onClick={onNext} disabled={busy}>{uploads.length ? "Continue →" : "Skip for now →"}</Button>
        </div>
      </div>
    </div>
  );
}

// ── 4. Schedule ────────────────────────────────────────────────────────────
const NY = "America/New_York";
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-US", { timeZone: NY, weekday: "short", month: "short", day: "numeric" });
const timeKey = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { timeZone: NY, hour: "numeric", minute: "2-digit" });

function groupByDay(slots: Slot[]): { day: string; slots: Slot[] }[] {
  const map = new Map<string, Slot[]>();
  for (const s of slots) { const k = dayKey(s.start); map.set(k, [...(map.get(k) ?? []), s]); }
  return [...map.entries()].map(([day, slots]) => ({ day, slots }));
}

/** Pick a day, then a time on that day. `allTimes` lists every possible time so taken ones show as struck out. */
function DayTimePicker({ slots, value, onPick, allTimes, max = 14 }: { slots: Slot[] | null; value: string | null; onPick: (s: string) => void; allTimes?: string[]; max?: number }) {
  const days = useMemo(() => (slots ? groupByDay(slots) : []), [slots]);
  const [showAll, setShowAll] = useState(false);
  const [day, setDay] = useState<string | null>(value ? dayKey(value) : null);
  useEffect(() => { if (value) setDay(dayKey(value)); }, [value]);
  if (slots === null) return <Note>Checking the calendar…</Note>;
  if (days.length === 0) return <Note>No open slots right now. Continue and we'll place you by email.</Note>;
  const shown = showAll ? days : days.slice(0, max);
  const current = days.find((d) => d.day === day) ?? null;
  const times = current ? (allTimes ?? current.slots.map((s) => timeKey(s.start))) : [];
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
        {shown.map((d) => {
          const active = day === d.day;
          return (
            <button key={d.day} type="button" onClick={() => setDay(d.day)} aria-pressed={active} className="border px-2 py-2.5 text-center font-mono text-[11px] uppercase tracking-[0.1em]" style={{ borderColor: active ? "#FFD230" : "rgba(242,239,233,0.3)", background: active ? "#FFD230" : "transparent", color: active ? "#0B0B0B" : "#F2EFE9" }}>
              {d.day}
            </button>
          );
        })}
      </div>
      {days.length > max && !showAll && <button type="button" onClick={() => setShowAll(true)} className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#FFD230]">More dates →</button>}
      {current && (
        <div className="mt-4 flex flex-wrap gap-2">
          {times.map((t) => {
            const slot = current.slots.find((s) => timeKey(s.start) === t);
            const active = !!slot && value === slot.start;
            return (
              <button key={t} type="button" disabled={!slot} onClick={() => slot && onPick(slot.start)} aria-pressed={active} className="border px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] disabled:line-through disabled:opacity-40" style={{ borderColor: active ? "#FFD230" : "rgba(242,239,233,0.3)", background: active ? "#FFD230" : "transparent", color: active ? "#0B0B0B" : "#F2EFE9" }}>
                {t}{!slot ? " · taken" : ""}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const RELEASE_TIMES = ["3:00 PM", "4:00 PM", "6:00 PM"];

function ScheduleStep({ session, needsSession, postAt, sessionAt, onBack, onNext }: { session: Session; needsSession: boolean; postAt: string | null; sessionAt: string | null; onBack: () => void; onNext: (post: string | null, sess: string | null) => void }) {
  const [post, setPost] = useState<Slot[] | null>(null);
  const [sess, setSess] = useState<Slot[] | null>(null);
  const [pickPost, setPickPost] = useState(postAt);
  const [pickSess, setPickSess] = useState(sessionAt);
  useEffect(() => {
    api.availability(session, "post").then((r) => setPost(r.slots)).catch(() => setPost([]));
    if (needsSession) api.availability(session, "session").then((r) => setSess(r.slots)).catch(() => setSess([]));
  }, [session, needsSession]);

  return (
    <div className="space-y-10">
      <div>
        <p className="mb-1 font-display text-2xl uppercase leading-none tracking-[-0.03em] text-[#F2EFE9]">Release date and time</p>
        <Note>Posts go out at 3, 4 or 6pm New York. The date you pick is the date. It comes off the board for everyone else.</Note>
        <div className="mt-4"><DayTimePicker slots={post} value={pickPost} onPick={setPickPost} allTimes={RELEASE_TIMES} /></div>
        {pickPost && <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[#FFD230]">Release · {fmtSlot(pickPost)} ET</p>}
      </div>

      {needsSession && (
        <div>
          <p className="mb-1 font-display text-2xl uppercase leading-none tracking-[-0.03em] text-[#F2EFE9]">Book your shoot</p>
          <Note>30 minutes in the room, DUMBO. Monday to Friday, 2 to 8pm. Live from the PMG calendar, so a time you can't see is already taken.</Note>
          <div className="mt-4"><DayTimePicker slots={sess} value={pickSess} onPick={setPickSess} /></div>
          {pickSess && <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[#FFD230]">Shoot · {fmtSlot(pickSess)} ET · 30 min</p>}
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#9A9A9E]">
            Parking, the subway and what to do before and after: <Link to="/start/prep" target="_blank" className="text-[#FFD230] underline">the prep page</Link>.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 border-t border-[#F2EFE9]/20 pt-6">
        <Button tone="ghost" onClick={onBack}>← Back</Button>
        <Button onClick={() => onNext(pickPost, pickSess)} disabled={(!pickPost && (post?.length ?? 0) > 0) || (needsSession && !pickSess && (sess?.length ?? 0) > 0)}>Continue →</Button>
      </div>
    </div>
  );
}

// ── 5. Pay ─────────────────────────────────────────────────────────────────
function PayStep({ session, order, onBack }: { session: Session; order: Order; onBack: () => void }) {
  const [plan, setPlan] = useState<PaymentPlan>(order.payment_plan);
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
    <div className="flex items-baseline justify-between gap-4 border-b border-[#F2EFE9]/15 py-2 font-mono text-[11px] uppercase tracking-[0.14em]">
      <span className="text-[#9A9A9E]">{k}</span><span className="text-right text-[#F2EFE9]">{v}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="border border-[#F2EFE9]/30 p-5">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#FFD230]">{order.catalogue_no} · receipt preview</p>
        {row("Artist", order.artist_name)}
        {row("Plan", `${q.tier.name} · ${priceLabel(q.tier)}`)}
        {q.adBudgetCents > 0 && row("Extra ad budget", formatUsd(q.adBudgetCents))}
        {row("Release", order.post_at ? `${fmtSlot(order.post_at)} ET` : "to be placed")}
        {order.session_at && row("Shoot", `${fmtSlot(order.session_at)} ET · 30 min`)}
        {row("Files", String(order.uploads?.length ?? 0))}
        {order.wants_distribution && row("Distribution", `agreement signed by ${order.signature ?? order.legal_name}`)}
        {q.tier.revenueShare ? row("PMG's share", "from the streaming split you signed") : row("Total", formatUsd(q.totalCents))}
        {row("Due now", formatUsd(q.dueNowCents))}
        {q.balanceCents > 0 && row("Balance before posting", formatUsd(q.balanceCents))}
      </div>

      {q.tier.depositAllowed && (
        <div className="grid gap-2 sm:grid-cols-2">
          {(["full", "deposit"] as PaymentPlan[]).map((p) => {
            const pq = quote(order.tier, order.ad_budget_cents, p);
            const active = plan === p;
            return (
              <button key={p} type="button" onClick={() => setPlan(p)} aria-pressed={active} className="border p-4 text-left" style={{ borderColor: active ? "#FFD230" : "rgba(242,239,233,0.3)" }}>
                <span className="block font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: active ? "#FFD230" : "#9A9A9E" }}>{p === "full" ? "Pay in full" : "50% deposit"}</span>
                <span className="mt-1 block font-display text-3xl uppercase leading-none tracking-[-0.03em] text-[#F2EFE9]">{formatUsd(pq.dueNowCents)}</span>
                <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-[#9A9A9E]">{p === "full" ? "nothing else owed" : `${formatUsd(pq.balanceCents)} before posting`}</span>
              </button>
            );
          })}
        </div>
      )}

      {free ? (
        <Note>Nothing to charge. Confirm and your date is held, the calendar is booked and the agreement goes out by email.</Note>
      ) : (
        <Note>Checkout runs on Stripe. Card{q.tier.financing ? ", or Affirm to pay over time" : ""}. Receipt by email. No payola · 0.00.</Note>
      )}
      {err && <ErrorLine>{err}</ErrorLine>}
      <div className="flex items-center justify-between gap-4 border-t border-[#F2EFE9]/20 pt-6">
        <Button tone="ghost" onClick={onBack}>← Back</Button>
        <Button onClick={pay} disabled={busy}>{busy ? (free ? "Confirming…" : "Opening checkout…") : free ? "Confirm order →" : `Pay ${formatUsd(q.dueNowCents)} →`}</Button>
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
        const r = await api.create({ tier, adBudgetCents: adBudget, invite: invite?.code, ...payload });
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

  return (
    <main className="min-h-screen bg-[#0B0B0B] text-[#F2EFE9]">
      <SEO title="Start — PMG" description="Pick a tier, pay, book, upload. Done. The PMG release flow." path="/start" />
      <header className="mx-auto max-w-4xl px-6 pb-6 pt-28 md:px-10 md:pt-32">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#FFD230]">Propmyganda · Release onboarding</p>
        <h1 className="font-display text-5xl uppercase leading-[0.85] tracking-[-0.03em] md:text-8xl">{step === 0 ? "You're in." : STEPS[step]}</h1>
        <p className="mt-3 max-w-md font-mono text-[11px] uppercase leading-5 tracking-[0.14em] text-[#9A9A9E]">
          {step === 0 ? "Pick a plan. Fill it out once. Pick a date and hold it. We do the rest." : `${tierDef.name} · ${order?.catalogue_no ?? "PMG-R-###"}`}
        </p>
      </header>

      <section className="mx-auto max-w-4xl px-6 pb-20 md:px-10">
        <div>
          <Stepper step={step} />
          <div className="mt-8">
            {err && <div className="mb-4"><ErrorLine>{err}</ErrorLine></div>}
            {inviteErr && <div className="mb-4"><ErrorLine>{inviteErr} — showing the public plans instead.</ErrorLine></div>}
            {step === 0 && <TierStep tier={tier} setTier={setTier} adBudget={adBudget} setAdBudget={setAdBudget} onNext={() => go(1)} invite={invite} />}
            {step === 1 && <DetailsStep initial={order ? { ...details, artist_name: order.artist_name, legal_name: order.legal_name, email: order.email, phone: order.phone ?? "", instagram_handle: order.instagram_handle ?? "", tiktok_url: order.tiktok_url ?? "", youtube_url: order.youtube_url ?? "", track_title: order.track_title ?? "", explicit: order.explicit, wants_distribution: order.wants_distribution } : details} busy={busy} onBack={() => go(0)} onSubmit={submitDetails} forceDistribution={!!tierDef.distribution} />}
            {step === 2 && session && <UploadStep session={session} uploads={uploads} setUploads={(u) => setOrder((o) => (o ? { ...o, uploads: u } : o))} onBack={() => go(1)} onNext={() => go(3)} />}
            {step === 3 && session && <ScheduleStep session={session} needsSession={tierDef.bookings.includes("session")} postAt={order?.post_at ?? null} sessionAt={order?.session_at ?? null} onBack={() => go(2)} onNext={submitSchedule} />}
            {step === 4 && session && order && <PayStep session={session} order={order} onBack={() => go(3)} />}
            {step > 0 && !session && step !== 1 && <Note>Session expired. <Link to="/start" className="text-[#FFD230] underline">Start again</Link>.</Note>}
          </div>
        </div>
      </section>
    </main>
  );
}
