import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";

const Store = () => {
  const [contact, setContact] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!contact.includes("@")) {
      setState("error");
      return;
    }
    setState("sending");
    const { error } = await supabase.from("newsletter_subscribers").insert([
      {
        email: contact.trim(),
        source: "store",
        unsubscribed_at: null,
        is_active: true,
      },
    ] as never);
    setState(error ? "error" : "done");
  }


  const line = (label: string, value: string) => (
    <div className="flex justify-between gap-4">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-black px-6 pb-16 pt-24 md:pt-32">
      <SEO
        title="Store — Vault Closed | PROPMYGANDA"
        description="The PMG store is closed between drops. Leave your contact for the next one."
        path="/store"
      />

      <div className="mx-auto max-w-sm">
        {/* jagged top */}
        <div
          className="h-3 bg-[#F2EFE9]"
          style={{
            clipPath:
              "polygon(0 100%, 0 40%, 4% 100%, 8% 40%, 12% 100%, 16% 40%, 20% 100%, 24% 40%, 28% 100%, 32% 40%, 36% 100%, 40% 40%, 44% 100%, 48% 40%, 52% 100%, 56% 40%, 60% 100%, 64% 40%, 68% 100%, 72% 40%, 76% 100%, 80% 40%, 84% 100%, 88% 40%, 92% 100%, 96% 40%, 100% 100%)",
          }}
        />

        <div className="bg-[#F2EFE9] px-6 py-6 font-mono text-[11px] uppercase tracking-[0.14em] text-[#0B0B0B]">
          <p className="text-center font-display text-3xl tracking-[-0.03em]">PROPMYGANDA</p>
          <p className="mt-1 text-center">Store · Vault Closed</p>

          <div className="my-4 border-t border-dashed border-[#0B0B0B]/40" />

          <div className="space-y-1.5">
            {line("Items", "0")}
            {line("Subtotal", "$0.00")}
            {line("Shipping", "$0.00")}
            {line("Total", "$0.00")}
            {line("Next drop", "Soon")}
          </div>

          <div className="my-4 border-t border-dashed border-[#0B0B0B]/40" />

          <p className="leading-relaxed normal-case tracking-normal">
            The vault is shut while we figure out what's worth printing. No filler merch.
          </p>

          <div className="my-4 border-t border-dashed border-[#0B0B0B]/40" />

          {state === "done" ? (
            <p className="text-center">You're on the list. PMG-M-001 pending.</p>
          ) : (
            <form onSubmit={submit} className="space-y-2">
              <label htmlFor="store-contact" className="block">
                Email or phone
              </label>
              <input
                id="store-contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full border border-[#0B0B0B] bg-transparent px-3 py-2 font-mono text-[11px] outline-none"
                placeholder="you@email.com"
              />
              <button
                type="submit"
                disabled={state === "sending"}
                className="w-full bg-[#0B0B0B] px-3 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[#FFD230] disabled:opacity-50"
              >
                {state === "sending" ? "Sending…" : "Notify me on drop"}
              </button>
              {state === "error" && <p className="text-center">Didn't save. Try again.</p>}
            </form>
          )}

          <div className="my-4 border-t border-dashed border-[#0B0B0B]/40" />
          <p className="text-center">*** Thank you · 100% independent ***</p>
        </div>

        {/* jagged bottom */}
        <div
          className="h-3 bg-[#F2EFE9]"
          style={{
            clipPath:
              "polygon(0 0, 100% 0, 96% 60%, 92% 0, 88% 60%, 84% 0, 80% 60%, 76% 0, 72% 60%, 68% 0, 64% 60%, 60% 0, 56% 60%, 52% 0, 48% 60%, 44% 0, 40% 60%, 36% 0, 32% 60%, 28% 0, 24% 60%, 20% 0, 16% 60%, 12% 0, 8% 60%, 4% 0, 0 60%)",
          }}
        />
      </div>
    </div>
  );
};

export default Store;
