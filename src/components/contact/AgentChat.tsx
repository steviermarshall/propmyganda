import { useEffect, useRef, useState, type FormEvent } from "react";
import { OPENING_LINE, clearChat, loadChat, saveChat, sendToAgent, type ChatMessage } from "@/lib/agent";

const CONTACT_EMAIL = "workwithpmg@gmail.com";

/** The front-desk chat on /contact. Talks to the contact-agent edge function. */
export default function AgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [stage, setStage] = useState<string>("chatting");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = loadChat();
    setConversationId(saved.conversationId);
    setMessages(saved.messages.length ? saved.messages : [{ role: "assistant", text: OPENING_LINE }]);
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [messages, busy]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setErr(null);
    const next: ChatMessage[] = [...messages, { role: "user", text }];
    setMessages(next); setInput(""); setBusy(true);
    try {
      const r = await sendToAgent(conversationId, text);
      const done: ChatMessage[] = [...next, { role: "assistant", text: r.reply }];
      setMessages(done); setConversationId(r.conversationId); setStage(r.stage); saveChat(r.conversationId, done);
    } catch (ex) {
      setErr((ex as Error).message);
    } finally { setBusy(false); }
  }

  function reset() {
    clearChat(); setConversationId(null); setStage("chatting"); setErr(null);
    setMessages([{ role: "assistant", text: OPENING_LINE }]);
  }

  return (
    <section aria-label="Chat with PMG" className="border border-primary-foreground/25">
      <div className="flex items-center justify-between border-b border-primary-foreground/25 px-4 py-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.25em]">Talk to PMG · now</span>
        <button type="button" onClick={reset} className="text-[10px] uppercase tracking-[0.2em] opacity-50 hover:opacity-100">New chat</button>
      </div>
      <div className="max-h-[420px] min-h-[260px] space-y-3 overflow-y-auto px-4 py-4" role="log" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <p className={`max-w-[85%] whitespace-pre-wrap px-3 py-2 text-sm leading-6 ${m.role === "user" ? "bg-primary-foreground text-primary" : "border border-primary-foreground/25"}`}>{m.text}</p>
          </div>
        ))}
        {busy && <p className="text-[10px] uppercase tracking-[0.2em] opacity-50">PMG is typing…</p>}
        {err && (
          <p className="text-xs text-red-400">
            {err} — or email <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="flex items-end gap-2 border-t border-primary-foreground/25 p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement)?.requestSubmit(); } }}
          rows={2}
          maxLength={1500}
          placeholder={stage === "closed" ? "This chat is closed. Email or DM us." : "Type here. Enter to send."}
          disabled={busy || stage === "closed"}
          aria-label="Your message"
          className="flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-primary-foreground/40 disabled:opacity-50"
        />
        <button type="submit" disabled={busy || !input.trim() || stage === "closed"} className="bg-primary-foreground px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-primary disabled:opacity-40">
          Send
        </button>
      </form>
    </section>
  );
}
