import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import CrmLayout from "@/components/crm/CrmLayout";
import { toast } from "sonner";

const ACCENT = "#FFD230";
const SITE = "https://propmyganda.com";
// The invites table is newer than the generated types; use the untyped client for it.
const db = supabase as unknown as SupabaseClient;

interface Invite { code: string; label: string | null; tier: string; max_uses: number; used_count: number; expires_at: string | null; created_at: string }

/** 8 characters, no 0/O/1/I so it survives being read out loud. */
function makeCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export default function Invites() {
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [uses, setUses] = useState(1);
  const [days, setDays] = useState(30);
  const [tier, setTier] = useState<"comp" | "dsp" | "test">("comp");

  const { data: invites = [], isLoading } = useQuery({
    queryKey: ["onboarding-invites"],
    queryFn: async () => {
      const { data, error } = await db.from("onboarding_invites").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw new Error(error.message);
      return (data ?? []) as Invite[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const row = { code: makeCode(), label: label.trim() || null, tier, max_uses: Math.max(1, uses), expires_at: days > 0 ? new Date(Date.now() + days * 86400_000).toISOString() : null, created_by: auth.user?.id ?? null };
      const { error } = await db.from("onboarding_invites").insert(row);
      if (error) throw new Error(error.message);
      return row.code;
    },
    onSuccess: (code) => { qc.invalidateQueries({ queryKey: ["onboarding-invites"] }); setLabel(""); copy(code); },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await db.from("onboarding_invites").update({ expires_at: new Date().toISOString() }).eq("code", code);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["onboarding-invites"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  function copy(code: string) {
    const link = `${SITE}/start?invite=${code}`;
    navigator.clipboard?.writeText(link).then(() => toast.success("Link copied"), () => toast.message(link));
  }

  const state = (i: Invite) => (i.expires_at && new Date(i.expires_at) < new Date() ? "expired" : i.used_count >= i.max_uses ? "used" : "open");

  return (
    <CrmLayout title="Invite links" accent={ACCENT}>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Invite links</h1>
        <p className="mt-1 mb-6 text-xs opacity-50">
          Two private doors, neither on the public /start page. <b>Invited</b> is completely free: everything in Mid, $0, no agreement. <b>DSP Release</b> is $0 up front with a record released under PMG: the artist signs the streaming agreement in the flow. Both skip payment and still book the calendar and fill the sheets. One use by default; give a DSP link many uses to reuse it. <b>Test</b> is for staff: a real $1 deposit and $1 balance to check payments end to end.
        </p>

        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="mb-8 grid gap-3 border border-white/15 p-4 sm:grid-cols-[150px_1fr_90px_110px_auto]">
          <label className="text-xs uppercase tracking-widest opacity-70">
            Plan
            <select value={tier} onChange={(e) => setTier(e.target.value as "comp" | "dsp" | "test")} className="mt-1 w-full border border-white/20 bg-black px-2 py-2 text-sm text-white">
              <option value="comp">Invited · free</option>
              <option value="dsp">DSP Release</option>
              <option value="test">Test · $2 · staff only</option>
            </select>
          </label>
          <label className="text-xs uppercase tracking-widest opacity-70">
            Who is it for
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Artist name" className="mt-1 w-full border border-white/20 bg-black px-2 py-2 text-sm text-white" />
          </label>
          <label className="text-xs uppercase tracking-widest opacity-70">
            Uses
            <input type="number" min={1} value={uses} onChange={(e) => setUses(Number(e.target.value))} className="mt-1 w-full border border-white/20 bg-black px-2 py-2 text-sm text-white" />
          </label>
          <label className="text-xs uppercase tracking-widest opacity-70">
            Expires (days)
            <input type="number" min={0} value={days} onChange={(e) => setDays(Number(e.target.value))} className="mt-1 w-full border border-white/20 bg-black px-2 py-2 text-sm text-white" />
          </label>
          <button type="submit" disabled={create.isPending} className="self-end px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-black disabled:opacity-50" style={{ background: ACCENT }}>
            {create.isPending ? "Making…" : "New link"}
          </button>
        </form>

        {isLoading ? (
          <p className="text-sm opacity-50">Loading…</p>
        ) : invites.length === 0 ? (
          <p className="text-sm opacity-50">No invite links yet.</p>
        ) : (
          <ul className="space-y-2">
            {invites.map((i) => {
              const st = state(i);
              return (
                <li key={i.code} className="flex flex-wrap items-center gap-3 border border-white/15 p-3">
                  <span className="font-mono text-sm tracking-widest">{i.code}</span>
                  <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5" style={{ background: st === "open" ? ACCENT : "rgba(255,255,255,0.15)", color: st === "open" ? "#000" : "#fff" }}>{st}</span>
                  <span className="text-[9px] uppercase tracking-widest border border-white/30 px-1.5 py-0.5">{i.tier === "dsp" ? "DSP" : i.tier === "test" ? "Test $2" : "Invited"}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{i.label ?? "—"}</span>
                  <span className="text-xs opacity-50">{i.used_count}/{i.max_uses} used{i.expires_at ? ` · until ${new Date(i.expires_at).toLocaleDateString()}` : ""}</span>
                  <button type="button" onClick={() => copy(i.code)} className="border border-white/30 px-2.5 py-1 text-xs uppercase tracking-widest hover:border-white">Copy link</button>
                  {st === "open" && <button type="button" onClick={() => revoke.mutate(i.code)} className="border border-red-500/40 px-2.5 py-1 text-xs uppercase tracking-widest text-red-400 hover:border-red-500">Revoke</button>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </CrmLayout>
  );
}
