import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import SEO from "@/components/SEO";
import { api } from "@/lib/onboarding";
import { Note } from "@/components/start/ui";

/** /start/balance?order=&token= — opens Stripe for the remaining amount on a deposit order. */
export default function StartBalance() {
  const [params] = useSearchParams();
  const [state, setState] = useState<"loading" | "paid" | "error">("loading");
  const [msg, setMsg] = useState("");
  const orderId = params.get("order"), token = params.get("token");
  useEffect(() => {
    if (!orderId || !token) { setState("error"); setMsg("This link is missing its order."); return; }
    api.balanceLink({ orderId, token, step: 5 }).then((r) => {
      if (r.paid) { setState("paid"); return; }
      if (r.url) { window.location.href = r.url; return; }
      setState("error"); setMsg(r.error ?? "Could not open the payment page.");
    }).catch((e) => { setState("error"); setMsg((e as Error).message); });
  }, [orderId, token]);
  return (
    <main className="min-h-screen bg-[#0B0B0B] text-[#F2EFE9]">
      <SEO title="Balance — PMG" description="Pay the balance on your PMG booking." path="/start/balance" />
      <div className="mx-auto max-w-4xl px-6 pb-20 pt-28 md:px-10 md:pt-32">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#FFD230]">Propmyganda · Balance</p>
        <h1 className="font-display text-5xl uppercase leading-[0.85] tracking-[-0.03em] md:text-8xl">{state === "paid" ? "Paid in full." : state === "error" ? "Hold on." : "Opening Stripe…"}</h1>
        <div className="mt-6 max-w-md">
          {state === "loading" && <Note>Taking you to the payment page for the remaining amount.</Note>}
          {state === "paid" && <Note>Nothing left to pay on this booking. See you at the shoot.</Note>}
          {state === "error" && <Note>{msg} Reply to your confirmation email and we sort it, or bring cash on the day.</Note>}
          <p className="mt-6"><Link to="/" className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#FFD230] underline">Home</Link></p>
        </div>
      </div>
    </main>
  );
}
