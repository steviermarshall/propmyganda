import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCrmAuth } from "@/hooks/use-crm-auth";
import { logActivity } from "@/lib/crm/activity";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

const PRO_OPTIONS = [
  { value: "BMI", label: "BMI" },
  { value: "ASCAP", label: "ASCAP" },
  { value: "SESAC", label: "SESAC" },
  { value: "other", label: "Other" },
];

type Member = {
  role: "artist" | "producer";
  first_name: string;
  last_name: string;
  stage_name: string;
  pro_affiliation: string;
  pro_other: string;
  ipi_number: string;
  distro_email: string;
  agreements_email: string;
  is_primary: boolean;
};

const blankMember = (role: Member["role"]): Member => ({
  role, first_name: "", last_name: "", stage_name: "",
  pro_affiliation: "BMI", pro_other: "",
  ipi_number: "", distro_email: "", agreements_email: "",
  is_primary: false,
});

const memberSchema = z.object({
  first_name: z.string().trim().min(1, "First name required").max(80),
  last_name: z.string().trim().min(1, "Last name required").max(80),
  stage_name: z.string().trim().max(120),
  pro_affiliation: z.string(),
  pro_other: z.string().trim().max(80),
  ipi_number: z.string().trim().max(40),
  distro_email: z.string().trim().email("Invalid email").max(255).or(z.literal("")),
  agreements_email: z.string().trim().email("Invalid email").max(255).or(z.literal("")),
});

const intakeSchema = z.object({
  artist_name: z.string().trim().min(1, "Artist name required").max(120),
  side: z.enum(["jv_owned", "pure_service"]),
  dsp_title_approved: z.boolean(),
  dsp_title_custom: z.string().trim().max(160),
  description: z.string().trim().max(2000),
  spotify_url: z.string().trim().url("Invalid URL").max(500).or(z.literal("")),
  apple_url: z.string().trim().url("Invalid URL").max(500).or(z.literal("")),
  youtube_url: z.string().trim().url("Invalid URL").max(500).or(z.literal("")),
  chartmetric_url: z.string().trim().url("Invalid URL").max(500).or(z.literal("")),
});

const MIKE_ACCENT = "#00F0FF";

export default function DistroIntakeWizard({
  open, onClose, accent = MIKE_ACCENT,
}: {
  open: boolean;
  onClose: () => void;
  accent?: string;
}) {
  const { member } = useCrmAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [artist, setArtist] = useState({
    artist_name: "",
    artist_contact: "",
    side: "pure_service" as "jv_owned" | "pure_service",
    dsp_title_approved: true,
    dsp_title_custom: "",
    description: "",
    spotify_url: "",
    apple_url: "",
    youtube_url: "",
    chartmetric_url: "",
  });

  const [primary, setPrimary] = useState<Member>({ ...blankMember("artist"), is_primary: true });
  const [additional, setAdditional] = useState<Member[]>([]);
  const [producers, setProducers] = useState<Member[]>([]);

  function reset() {
    setStep(0);
    setArtist({
      artist_name: "", artist_contact: "", side: "pure_service",
      dsp_title_approved: true, dsp_title_custom: "", description: "",
      spotify_url: "", apple_url: "", youtube_url: "", chartmetric_url: "",
    });
    setPrimary({ ...blankMember("artist"), is_primary: true });
    setAdditional([]);
    setProducers([]);
  }

  function close() { onClose(); setTimeout(reset, 300); }

  const STEPS = [
    "DSP Title",
    "Primary Artist",
    "Additional Artists",
    "Producers",
    "Streaming Links",
    "Review",
  ];

  function validateStep(idx: number): string | null {
    if (idx === 0) {
      if (!artist.artist_name.trim()) return "Artist name required";
      if (!artist.dsp_title_approved && !artist.dsp_title_custom.trim())
        return "Provide a custom title";
    }
    if (idx === 1) {
      const r = memberSchema.safeParse(primary);
      if (!r.success) return r.error.issues[0]?.message ?? "Invalid";
    }
    if (idx === 2) {
      for (const m of additional) {
        const r = memberSchema.safeParse(m);
        if (!r.success) return r.error.issues[0]?.message ?? "Invalid additional artist";
      }
    }
    if (idx === 3) {
      for (const p of producers) {
        const r = memberSchema.safeParse(p);
        if (!r.success) return r.error.issues[0]?.message ?? "Invalid producer";
      }
    }
    if (idx === 4) {
      const r = intakeSchema.pick({
        spotify_url: true, apple_url: true, youtube_url: true, chartmetric_url: true,
        artist_name: true, side: true, dsp_title_approved: true, dsp_title_custom: true, description: true,
      }).safeParse(artist);
      if (!r.success) return r.error.issues[0]?.message ?? "Invalid URL";
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) { toast.error(err); return; }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

  async function submit() {
    if (!member) return;
    for (let i = 0; i <= 4; i++) {
      const err = validateStep(i);
      if (err) { toast.error(`Step ${i + 1}: ${err}`); setStep(i); return; }
    }
    setSaving(true);
    try {
      const insertPayload = {
        artist_name: artist.artist_name.trim(),
        artist_contact: artist.artist_contact.trim() || null,
        side: artist.side,
        onboarding_status: "intake",
        publishing_owned: false,
        admin_rights: false,
        onboarded_by: member.id,
        dsp_title_approved: artist.dsp_title_approved,
        dsp_title_custom: artist.dsp_title_approved ? null : artist.dsp_title_custom.trim(),
        description: artist.description.trim() || null,
      };
      const { data: created, error } = await supabase.from("distro_artists")
        .insert(insertPayload).select().single();
      if (error) throw error;

      const memberRows = [
        { ...primary, is_primary: true },
        ...additional.map((a) => ({ ...a, role: "artist" as const, is_primary: false })),
        ...producers.map((p) => ({ ...p, role: "producer" as const, is_primary: false })),
      ]
        .filter((m) => m.first_name.trim() || m.last_name.trim() || m.stage_name.trim())
        .map((m) => ({
          distro_artist_id: created.id,
          role: m.role,
          first_name: m.first_name.trim() || null,
          last_name: m.last_name.trim() || null,
          stage_name: m.stage_name.trim() || null,
          pro_affiliation: m.pro_affiliation,
          pro_other: m.pro_affiliation === "other" ? (m.pro_other.trim() || null) : null,
          ipi_number: m.ipi_number.trim() || null,
          distro_email: m.distro_email.trim() || null,
          agreements_email: m.agreements_email.trim() || null,
          is_primary: m.is_primary,
        }));
      if (memberRows.length) {
        const { error: mErr } = await supabase.from("distro_artist_members").insert(memberRows);
        if (mErr) throw mErr;
      }

      const streamingRows = [
        { platform: "spotify", url: artist.spotify_url },
        { platform: "apple", url: artist.apple_url },
        { platform: "youtube", url: artist.youtube_url },
        { platform: "chartmetric", url: artist.chartmetric_url },
      ]
        .filter((r) => r.url.trim())
        .map((r) => ({
          distro_artist_id: created.id,
          platform: r.platform,
          url: r.url.trim(),
        }));
      if (streamingRows.length) {
        const { error: sErr } = await supabase.from("streaming_metrics").insert(streamingRows);
        if (sErr) throw sErr;
      }

      await logActivity(member.id, "distro_artist", created.id, "created", {
        members: memberRows.length, streaming: streamingRows.length,
      });
      toast.success("Distro intake submitted");
      qc.invalidateQueries({ queryKey: ["mike-distro"] });
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="bg-crm-surface border-white/10 text-white font-mono max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest text-sm" style={{ color: accent }}>
            New Distro Intake — {STEPS[step]}
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1 mb-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1">
              <div
                className="h-1 transition-colors"
                style={{ backgroundColor: i <= step ? accent : "rgba(255,255,255,0.1)" }}
              />
              <div className={`text-[9px] uppercase tracking-widest mt-1 ${i === step ? "text-white" : "text-white/30"}`}>
                {i + 1}. {label}
              </div>
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-3">
            <FieldRow label="Artist Name *">
              <input
                value={artist.artist_name}
                onChange={(e) => setArtist({ ...artist, artist_name: e.target.value })}
                className="bg-black border border-white/10 text-white text-sm px-3 py-2 w-full"
                maxLength={120}
              />
            </FieldRow>
            <FieldRow label="Side">
              <select
                value={artist.side}
                onChange={(e) => setArtist({ ...artist, side: e.target.value as "jv_owned" | "pure_service" })}
                className="bg-black border border-white/10 text-white text-sm px-3 py-2 w-full"
              >
                <option value="pure_service">Pure Service</option>
                <option value="jv_owned">JV Owned</option>
              </select>
            </FieldRow>
            <FieldRow label="Will the title be approved by DSPs?">
              <div className="flex gap-3">
                <RadioPill checked={artist.dsp_title_approved} onChange={() => setArtist({ ...artist, dsp_title_approved: true })} label="Yes" accent={accent} />
                <RadioPill checked={!artist.dsp_title_approved} onChange={() => setArtist({ ...artist, dsp_title_approved: false })} label="Other (custom)" accent={accent} />
              </div>
            </FieldRow>
            {!artist.dsp_title_approved && (
              <FieldRow label="Custom Title *">
                <input
                  value={artist.dsp_title_custom}
                  onChange={(e) => setArtist({ ...artist, dsp_title_custom: e.target.value })}
                  className="bg-black border border-white/10 text-white text-sm px-3 py-2 w-full"
                  maxLength={160}
                />
              </FieldRow>
            )}
            <FieldRow label="Description / Notes">
              <textarea
                value={artist.description}
                onChange={(e) => setArtist({ ...artist, description: e.target.value })}
                rows={3}
                className="bg-black border border-white/10 text-white text-sm px-3 py-2 w-full"
                maxLength={2000}
              />
            </FieldRow>
            <FieldRow label="Main Contact (general)">
              <input
                value={artist.artist_contact}
                onChange={(e) => setArtist({ ...artist, artist_contact: e.target.value })}
                placeholder="email or phone"
                className="bg-black border border-white/10 text-white text-sm px-3 py-2 w-full"
                maxLength={255}
              />
            </FieldRow>
          </div>
        )}

        {step === 1 && (
          <MemberForm member={primary} onChange={setPrimary} accent={accent} />
        )}

        {step === 2 && (
          <MemberList
            members={additional}
            setMembers={setAdditional}
            role="artist"
            accent={accent}
            emptyLabel="No additional artists. Add one if there are features or co-leads."
            addLabel="+ Add Artist"
          />
        )}

        {step === 3 && (
          <MemberList
            members={producers}
            setMembers={setProducers}
            role="producer"
            accent={accent}
            emptyLabel="No producers added yet."
            addLabel="+ Add Producer"
          />
        )}

        {step === 4 && (
          <div className="space-y-3">
            <FieldRow label="Spotify URL">
              <input value={artist.spotify_url} onChange={(e) => setArtist({ ...artist, spotify_url: e.target.value })}
                placeholder="https://open.spotify.com/artist/…"
                className="bg-black border border-white/10 text-white text-sm px-3 py-2 w-full" maxLength={500}/>
            </FieldRow>
            <FieldRow label="Apple Music URL">
              <input value={artist.apple_url} onChange={(e) => setArtist({ ...artist, apple_url: e.target.value })}
                placeholder="https://music.apple.com/…"
                className="bg-black border border-white/10 text-white text-sm px-3 py-2 w-full" maxLength={500}/>
            </FieldRow>
            <FieldRow label="YouTube Channel">
              <input value={artist.youtube_url} onChange={(e) => setArtist({ ...artist, youtube_url: e.target.value })}
                placeholder="https://youtube.com/…"
                className="bg-black border border-white/10 text-white text-sm px-3 py-2 w-full" maxLength={500}/>
            </FieldRow>
            <FieldRow label="Chartmetric URL">
              <input value={artist.chartmetric_url} onChange={(e) => setArtist({ ...artist, chartmetric_url: e.target.value })}
                placeholder="https://app.chartmetric.com/…"
                className="bg-black border border-white/10 text-white text-sm px-3 py-2 w-full" maxLength={500}/>
            </FieldRow>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3 text-xs">
            <ReviewBlock title="Artist">
              <div>{artist.artist_name} <span className="text-white/40">· {artist.side}</span></div>
              <div className="text-white/50">
                DSP Title: {artist.dsp_title_approved ? "Approved" : `Custom: ${artist.dsp_title_custom}`}
              </div>
              {artist.description && <div className="text-white/50 mt-1 italic">"{artist.description}"</div>}
            </ReviewBlock>
            <ReviewBlock title="Primary">
              <PersonLine m={primary} />
            </ReviewBlock>
            {additional.length > 0 && (
              <ReviewBlock title={`Additional Artists (${additional.length})`}>
                {additional.map((m, i) => <PersonLine key={i} m={m} />)}
              </ReviewBlock>
            )}
            {producers.length > 0 && (
              <ReviewBlock title={`Producers (${producers.length})`}>
                {producers.map((m, i) => <PersonLine key={i} m={m} />)}
              </ReviewBlock>
            )}
            <ReviewBlock title="Streaming">
              {(["spotify","apple","youtube","chartmetric"] as const).map((p) => {
                const url = (artist as Record<string, string>)[`${p}_url`];
                return url ? <div key={p}><span className="text-white/40 uppercase tracking-widest text-[10px]">{p}</span> {url}</div> : null;
              })}
            </ReviewBlock>
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={back}
            disabled={step === 0 || saving}
            className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white disabled:opacity-30"
          >
            ← Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="px-4 py-2 font-bold text-black uppercase tracking-widest text-xs"
              style={{ backgroundColor: accent }}
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="px-4 py-2 font-bold text-black uppercase tracking-widest text-xs disabled:opacity-50"
              style={{ backgroundColor: accent }}
            >
              {saving ? "Submitting…" : "Submit Intake"}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-widest text-white/40">{label}</label>
      {children}
    </div>
  );
}

function RadioPill({ checked, onChange, label, accent }: { checked: boolean; onChange: () => void; label: string; accent: string }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="px-3 py-1.5 text-[10px] uppercase tracking-widest border"
      style={{
        backgroundColor: checked ? accent : "transparent",
        color: checked ? "#000" : "rgba(255,255,255,0.6)",
        borderColor: checked ? accent : "rgba(255,255,255,0.15)",
      }}
    >
      {label}
    </button>
  );
}

function MemberForm({ member, onChange, accent }: { member: Member; onChange: (m: Member) => void; accent: string }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <FieldRow label="First Name *">
          <input value={member.first_name} onChange={(e) => onChange({ ...member, first_name: e.target.value })}
            className="bg-black border border-white/10 text-white text-sm px-3 py-2 w-full" maxLength={80}/>
        </FieldRow>
        <FieldRow label="Last Name *">
          <input value={member.last_name} onChange={(e) => onChange({ ...member, last_name: e.target.value })}
            className="bg-black border border-white/10 text-white text-sm px-3 py-2 w-full" maxLength={80}/>
        </FieldRow>
      </div>
      <FieldRow label="Stage Name">
        <input value={member.stage_name} onChange={(e) => onChange({ ...member, stage_name: e.target.value })}
          className="bg-black border border-white/10 text-white text-sm px-3 py-2 w-full" maxLength={120}/>
      </FieldRow>
      <div className="grid grid-cols-2 gap-2">
        <FieldRow label="PRO Affiliation">
          <select value={member.pro_affiliation}
            onChange={(e) => onChange({ ...member, pro_affiliation: e.target.value })}
            className="bg-black border border-white/10 text-white text-sm px-3 py-2 w-full">
            {PRO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FieldRow>
        {member.pro_affiliation === "other" && (
          <FieldRow label="Other PRO">
            <input value={member.pro_other} onChange={(e) => onChange({ ...member, pro_other: e.target.value })}
              className="bg-black border border-white/10 text-white text-sm px-3 py-2 w-full" maxLength={80}/>
          </FieldRow>
        )}
      </div>
      <FieldRow label="IPI Number">
        <input value={member.ipi_number} onChange={(e) => onChange({ ...member, ipi_number: e.target.value })}
          className="bg-black border border-white/10 text-white text-sm px-3 py-2 w-full" maxLength={40}/>
      </FieldRow>
      <div className="grid grid-cols-2 gap-2">
        <FieldRow label="Email (Distrokid/Distro)">
          <input type="email" value={member.distro_email}
            onChange={(e) => onChange({ ...member, distro_email: e.target.value })}
            className="bg-black border border-white/10 text-white text-sm px-3 py-2 w-full" maxLength={255}/>
        </FieldRow>
        <FieldRow label="Email (Agreements)">
          <input type="email" value={member.agreements_email}
            onChange={(e) => onChange({ ...member, agreements_email: e.target.value })}
            className="bg-black border border-white/10 text-white text-sm px-3 py-2 w-full" maxLength={255}/>
        </FieldRow>
      </div>
    </div>
  );
}

function MemberList({
  members, setMembers, role, accent, emptyLabel, addLabel,
}: {
  members: Member[];
  setMembers: (m: Member[]) => void;
  role: Member["role"];
  accent: string;
  emptyLabel: string;
  addLabel: string;
}) {
  return (
    <div className="space-y-4">
      {members.length === 0 && <p className="text-white/40 text-sm">{emptyLabel}</p>}
      {members.map((m, i) => (
        <div key={i} className="border border-white/10 bg-black/30 p-3 relative">
          <button
            type="button"
            onClick={() => setMembers(members.filter((_, idx) => idx !== i))}
            className="absolute top-2 right-2 text-[10px] uppercase tracking-widest text-white/40 hover:text-red-400"
          >
            Remove
          </button>
          <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">{role} #{i + 1}</div>
          <MemberForm
            member={m}
            onChange={(nm) => setMembers(members.map((x, idx) => (idx === i ? nm : x)))}
            accent={accent}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => setMembers([...members, blankMember(role)])}
        className="px-3 py-1.5 text-[10px] uppercase tracking-widest border"
        style={{ borderColor: accent, color: accent }}
      >
        {addLabel}
      </button>
    </div>
  );
}

function ReviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-white/10 bg-black/30 p-3">
      <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">{title}</div>
      {children}
    </div>
  );
}

function PersonLine({ m }: { m: Member }) {
  const name = [m.first_name, m.last_name].filter(Boolean).join(" ");
  const pro = m.pro_affiliation === "other" ? m.pro_other : m.pro_affiliation;
  return (
    <div className="text-white/80">
      {name || "—"} {m.stage_name && <span className="text-white/40">"{m.stage_name}"</span>}
      <span className="text-white/40"> · {pro || "no PRO"}{m.ipi_number ? ` · IPI ${m.ipi_number}` : ""}</span>
    </div>
  );
}
