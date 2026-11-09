import { ADDONS } from "@/lib/addons";

const CONTACT_EMAIL = "workwithpmg@gmail.com";

/** Shown only once a booking is complete: what else is open to a booked artist, quoted by request. */
export default function AddOns({ orderRef }: { orderRef?: string | null }) {
  const subject = encodeURIComponent(`Add-on${orderRef ? ` · ${orderRef}` : ""}`);
  return (
    <section className="border-t border-[#F2EFE9]/20 py-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#FFD230]">Open to you now</p>
      <h2 className="mt-1 font-display text-3xl uppercase leading-[0.9] tracking-[-0.03em] md:text-4xl">Take it further</h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-[#F2EFE9]/80">
        Your date is held. These are open to booked artists by request, most of them built from what the shoot already produced. Reply to your confirmation email with the one you want, or <a className="text-[#FFD230] underline" href={`mailto:${CONTACT_EMAIL}?subject=${subject}`}>email us</a>, and we quote it. Nothing here changes your booking.
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ADDONS.map((a) => (
          <li key={a.id} className="border border-[#F2EFE9]/20 p-4">
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-[15px] text-[#F2EFE9]">{a.name}</span>
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-[#FFD230]">{a.from}</span>
            </span>
            <span className="mt-1 block font-mono text-[10px] uppercase leading-4 tracking-[0.12em] text-[#9A9A9E]">{a.line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
