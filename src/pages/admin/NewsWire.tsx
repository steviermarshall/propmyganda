import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import CrmLayout from "@/components/crm/CrmLayout";
import { toast } from "sonner";
import { publicationImage } from "@/lib/publicationImage";
import { timeAgo } from "@/lib/publicationTime";

const ACCENT = "#FFD230";
const COUNTS = [6, 12, 20, 30] as const;

interface Pub {
  id: string;
  title: string;
  slug: string;
  category: string;
  author: string | null;
  credit: string | null;
  source_url: string | null;
  cover_url: string | null;
  published_at: string | null;
  created_at: string;
}

interface RunResult {
  ok?: boolean;
  error?: string;
  skipped?: string;
  inserted?: number;
  candidates?: number;
  selected?: number;
  posted?: { title: string; source: string; category: string; slug: string }[];
  failed?: { title: string; source: string; reason: string }[];
  feeds?: { name: string; items: number; error?: string }[];
}

export default function NewsWire() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState<number>(12);
  const [result, setResult] = useState<RunResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const { data: pubs = [], isLoading } = useQuery({
    queryKey: ["wire-publications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("publications")
        .select("id,title,slug,category,author,credit,source_url,cover_url,published_at,created_at")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(60);
      if (error) throw new Error(error.message);
      return (data ?? []) as Pub[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["wire-publications"] });

  async function runNow() {
    setRunning(true);
    setResult(null);
    setFailure(null);
    try {
      // force: a manual run is never throttled; only the scheduler waits between runs.
      const { data, error } = await supabase.functions.invoke("scrape-news", { body: { limit: count, force: true } });
      if (error) throw new Error(error.message);
      const r = (data ?? {}) as RunResult;
      if (r.error) throw new Error(r.error);
      setResult(r);
      toast.success(`PMG Wire posted ${r.inserted ?? 0} new item(s)`);
      invalidate();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setFailure(msg);
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  }

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("publications").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const wireItems = pubs.filter((p) => p.author === "PMG Wire");
  const lastRun = wireItems.reduce<string | null>(
    (latest, p) => (!latest || p.created_at > latest ? p.created_at : latest),
    null,
  );
  const brokenFeeds = result?.feeds?.filter((f) => f.error) ?? [];

  return (
    <CrmLayout title="PMG Wire" accent={ACCENT}>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-baseline justify-between mb-2">
          <h1 className="text-2xl font-bold tracking-tight">PMG Wire</h1>
          <p className="text-xs uppercase tracking-widest opacity-60">
            {wireItems.length} wire items · {pubs.length} shown
          </p>
        </div>
        <p className="text-xs opacity-50 mb-1">
          The bot pulls headlines from a dozen music outlets (Billboard, Pitchfork, MBW, The FADER, Stereogum,
          Rolling Stone, NME, HipHopDX and more), rewrites each story as a short original item with a photo,
          and posts it to the Publication page with source credit.
        </p>
        <p className="text-xs opacity-50 mb-6">
          It also runs itself every 2 hours. Manual runs are never throttled.
          {lastRun ? ` Last posted ${timeAgo(lastRun)}.` : ""}
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <label className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80">
            Pull
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              disabled={running}
              className="bg-black border border-white/20 px-2 py-2 text-xs text-white"
            >
              {COUNTS.map((n) => <option key={n} value={n}>{n} stories</option>)}
            </select>
          </label>
          <button
            type="button"
            onClick={runNow}
            disabled={running}
            className="px-5 py-3 text-xs uppercase tracking-widest font-bold text-black disabled:opacity-50"
            style={{ background: ACCENT }}
          >
            {running ? "Fetching…" : "Fetch news now"}
          </button>
          {running && <p className="text-xs opacity-60">Reading feeds and rewriting stories — about a minute for {count}.</p>}
        </div>

        {failure && (
          <p className="mb-6 border border-red-500/40 p-3 text-xs text-red-300">Run failed: {failure}</p>
        )}

        {result && (
          <div className="mb-8 border border-white/15 p-4 text-xs space-y-3">
            <p className="font-semibold">
              {result.skipped
                ? "Skipped — the scheduler ran a few minutes ago."
                : `Done — ${result.inserted ?? 0} new item(s) posted from ${result.candidates ?? 0} headlines across ${result.feeds?.filter((f) => !f.error).length ?? 0} feeds.`}
            </p>
            {result.posted && result.posted.length > 0 && (
              <ul className="space-y-1 opacity-80">
                {result.posted.map((p) => (
                  <li key={p.slug}>
                    <span className="text-[9px] uppercase tracking-widest mr-2" style={{ color: ACCENT }}>{p.category}</span>
                    {p.title} <span className="opacity-50">· via {p.source}</span>
                  </li>
                ))}
              </ul>
            )}
            {result.failed && result.failed.length > 0 && (
              <p className="opacity-60">
                {result.failed.length} story(ies) were not posted:{" "}
                {result.failed.map((f) => `${f.title} (${f.reason})`).join("; ")}
              </p>
            )}
            {!result.skipped && (result.selected ?? 0) < count && (
              <p className="opacity-60">
                Only {result.selected ?? 0} unposted stories were found in the last 3 days — everything else is already on the site.
              </p>
            )}
            {brokenFeeds.length > 0 && (
              <p className="text-amber-300/80">
                Feeds that did not respond: {brokenFeeds.map((f) => `${f.name} (${f.error})`).join(", ")}
              </p>
            )}
          </div>
        )}

        {isLoading ? (
          <p className="text-sm opacity-50">Loading…</p>
        ) : pubs.length === 0 ? (
          <p className="text-sm opacity-50">Nothing published yet — hit "Fetch news now".</p>
        ) : (
          <ul className="space-y-2">
            {pubs.map((p) => {
              const image = publicationImage(p.cover_url);
              return (
                <li key={p.id} className="border border-white/15 p-3 flex items-center gap-3">
                  <div className="h-12 w-16 shrink-0 bg-white/5 overflow-hidden">
                    {image && <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />}
                  </div>
                  <span
                    className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 text-black shrink-0"
                    style={{ background: ACCENT }}
                  >
                    {p.category}
                  </span>
                  <div className="min-w-0 flex-1">
                    <a href={`/publication/${p.slug}`} target="_blank" rel="noreferrer" className="text-sm font-semibold truncate block hover:underline">
                      {p.title}
                    </a>
                    <p className="text-xs opacity-50 truncate">
                      {p.author === "PMG Wire" ? "PMG Wire" : p.author || "Staff"}
                      {p.credit ? ` · ${p.credit}` : ""}
                      {p.published_at ? ` · ${timeAgo(p.published_at)}` : ""}
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
              );
            })}
          </ul>
        )}
      </div>
    </CrmLayout>
  );
}
