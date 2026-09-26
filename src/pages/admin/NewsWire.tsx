import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import CrmLayout from "@/components/crm/CrmLayout";
import { toast } from "sonner";

const ACCENT = "#FFD230";

interface Pub {
  id: string;
  title: string;
  slug: string;
  category: string;
  author: string | null;
  credit: string | null;
  source_url: string | null;
  published_at: string | null;
}

export default function NewsWire() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const { data: pubs = [], isLoading } = useQuery({
    queryKey: ["wire-publications"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("publications") as any)
        .select("id,title,slug,category,author,credit,source_url,published_at")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(40);
      if (error) throw new Error(error.message);
      return (data ?? []) as Pub[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["wire-publications"] });

  async function runNow() {
    setRunning(true);
    setLastResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-news", { body: {} });
      if (error) throw new Error(error.message);
      const r = data as { inserted?: number; skipped?: string; error?: string };
      if (r?.error) throw new Error(r.error);
      setLastResult(
        r?.skipped
          ? "Skipped — the bot ran less than 90 minutes ago."
          : `Done — ${r?.inserted ?? 0} new item(s) posted to the Publication page.`,
      );
      toast.success("PMG Wire run complete");
      invalidate();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLastResult(`Run failed: ${msg}`);
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  }

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("publications") as any).delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const botCount = pubs.filter((p) => p.author === "PMG Wire").length;

  return (
    <CrmLayout title="PMG Wire" accent={ACCENT}>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-baseline justify-between mb-2">
          <h1 className="text-2xl font-bold tracking-tight">PMG Wire</h1>
          <p className="text-xs uppercase tracking-widest opacity-60">
            {botCount} wire items · {pubs.length} shown
          </p>
        </div>
        <p className="text-xs opacity-50 mb-6">
          The bot pulls headlines from Music Business Worldwide, Pitchfork, Billboard and The FADER,
          rewrites each story as a short original item, and posts it to the Publication page
          with source credit. It runs itself every 4 hours once the scheduler SQL is in.
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-8">
          <button
            type="button"
            onClick={runNow}
            disabled={running}
            className="px-5 py-3 text-xs uppercase tracking-widest font-bold text-black disabled:opacity-50"
            style={{ background: ACCENT }}
          >
            {running ? "Fetching…" : "Fetch news now"}
          </button>
          {lastResult && <p className="text-xs opacity-70">{lastResult}</p>}
        </div>

        {isLoading ? (
          <p className="text-sm opacity-50">Loading…</p>
        ) : pubs.length === 0 ? (
          <p className="text-sm opacity-50">Nothing published yet — hit "Fetch news now".</p>
        ) : (
          <ul className="space-y-2">
            {pubs.map((p) => (
              <li key={p.id} className="border border-white/15 p-3 flex items-center gap-3">
                <span
                  className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 text-black shrink-0"
                  style={{ background: ACCENT }}
                >
                  {p.category}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{p.title}</p>
                  <p className="text-xs opacity-50 truncate">
                    {p.author === "PMG Wire" ? "PMG Wire" : p.author || "Staff"}
                    {p.credit ? ` · ${p.credit}` : ""}
                    {p.published_at ? ` · ${new Date(p.published_at).toLocaleDateString()}` : ""}
                    {p.source_url ? (
                      <>
                        {" · "}
                        <a href={p.source_url} target="_blank" rel="noreferrer" className="underline hover:opacity-100">
                          source
                        </a>
                      </>
                    ) : null}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove.mutate(p.id)}
                  className="text-xs uppercase tracking-widest border border-red-500/40 text-red-400 px-2.5 py-1 hover:border-red-500 shrink-0"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </CrmLayout>
  );
}
