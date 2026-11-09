import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import SEO from "@/components/SEO";
import { api, fmtSlot, saveSession, type Order } from "@/lib/onboarding";
import { formatUsd, getTier } from "@/lib/tiers";
import { Note } from "@/components/start/ui";
import { AreaBlocks, TipsBlocks } from "@/components/start/prep";
import AddOns from "@/components/start/AddOns";

export default function StartDone() {
  const [params] = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [tries, setTries] = useState(0);
  const orderId = params.get("order"), token = params.get("token");

  // Stripe sends the artist here before the webhook has always landed; poll a few times.
  useEffect(() => {
    if (!orderId || !token) return;
    saveSession(null);
    let stop = false;
    const tick = async (n: number) => {
      try {
        const { order: o } = await api.status({ orderId, token, step: 5 });
        if (stop) return;
        setOrder(o);
        if (!o.paid_at && n < 8) { setTries(n + 1); setTimeout(() => tick(n + 1), 2000); }
      } catch { /* shown as pending */ }
    };
    tick(0);
    return () => { stop = true; };
  }, [orderId, token]);

  const tier = order ? getTier(order.tier) : undefined;
  const paid = !!order?.paid_at;

  return (
    <main className="min-h-screen bg-[#0B0B0B] text-[#F2EFE9]">
      <SEO title="You're in — PMG" description="Order received." path="/start/done" />
      <header className="mx-auto max-w-4xl px-6 pb-6 pt-28 md:px-10 md:pt-32">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#FFD230]">Propmyganda · {order?.catalogue_no ?? "Receipt"}</p>
        <h1 className="font-display text-5xl uppercase leading-[0.85] tracking-[-0.03em] md:text-8xl">{paid ? "Welcome to the machine." : "Confirming…"}</h1>
      </header>
      <section className="mx-auto max-w-4xl px-6 pb-20 md:px-10">
        <div className="max-w-xl">
          {!order ? (
            <Note>{tries > 0 ? "Waiting on the payment confirmation…" : "Loading your order…"}</Note>
          ) : (
            <div className="border border-[#F2EFE9]/30 p-5 font-mono text-[11px] uppercase tracking-[0.14em]">
              {[
                ["Artist", order.artist_name],
                ["Tier", `${tier?.name ?? order.tier} · ${formatUsd(order.total_cents)}`],
                ["Paid", paid ? `${formatUsd(order.due_now_cents)}${order.payment_plan === "deposit" ? " deposit" : ""}` : "pending"],
                ["Release", order.post_at ? `${fmtSlot(order.post_at)} ET` : "we'll place you by email"],
                ...(order.session_at ? [["Shoot", `${fmtSlot(order.session_at)} ET · 30 min`]] : []),
                ["Files", String(order.uploads?.length ?? 0)],
                ["Status", order.status.replace("_", " ")],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 border-b border-[#F2EFE9]/15 py-2 last:border-b-0">
                  <span className="text-[#9A9A9E]">{k}</span><span className="text-right">{v}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 space-y-2 font-mono text-[11px] uppercase leading-5 tracking-[0.14em] text-[#F2EFE9]">
            <p className="text-[#FFD230]">What happens next</p>
            <p>01 — Jay confirms your submission and your date by email. One thread, start to finish.</p>
            <p>02 — Edits get made. Revisions happen in that window, not the day of.</p>
            <p>03 — Your record goes out on the date you picked. Collab posts push to TikTok, Instagram and YouTube.</p>
            <p>04 — Ad report or dashboard link lands the way you asked.</p>
            <p className="pt-2 text-[#9A9A9E]">Before your date: accounts public, collab requests on, accept the invite when it comes through.</p>
          </div>
        </div>

        <div className="mt-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#9A9A9E]">Your day in DUMBO</p>
          <AreaBlocks from={1} />
          <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.3em] text-[#9A9A9E]">Make it land</p>
          <TipsBlocks from={3} />
          {paid && <AddOns orderRef={order?.catalogue_no} />}
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#9A9A9E]">Keep this: <Link to="/start/prep" className="text-[#FFD230] underline">propmyganda.com/start/prep</Link></p>
        </div>

        <div className="max-w-xl">

          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/artists" className="bg-[#FFD230] px-6 py-4 font-mono text-[11px] uppercase tracking-[0.2em] text-[#0B0B0B]">The roster →</Link>
            <Link to="/" className="border border-[#F2EFE9]/40 px-6 py-4 font-mono text-[11px] uppercase tracking-[0.2em]">Home</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
