import { useState } from "react";
import AgentChat from "@/components/contact/AgentChat";

/** "Questions?" on the Tier and Pay steps. Opens the contact agent without leaving the flow. */
export default function QuestionsDrawer() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="fixed bottom-5 left-5 z-40 bg-[#FFD230] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#0B0B0B] shadow-[0_0_0_2px_#0B0B0B]">
        Questions? Chat with PMG
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-start bg-black/60 p-4 sm:p-6" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md bg-[#0B0B0B] text-[#F2EFE9]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#F2EFE9]/25 px-4 py-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#9A9A9E]">A person reads every thread</span>
              <button type="button" onClick={() => setOpen(false)} className="font-mono text-[10px] uppercase tracking-[0.2em]">Close</button>
            </div>
            <AgentChat />
          </div>
        </div>
      )}
    </>
  );
}
