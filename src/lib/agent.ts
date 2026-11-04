// Browser side of the contact agent. The rules live in supabase/functions/_shared/agent.ts.
import { supabase } from "@/integrations/supabase/client";

export const OPENING_LINE = "PMG here. Are you looking at a paid push, distribution, or something else?";
const KEY = "pmg-agent";

export interface ChatMessage { role: "user" | "assistant"; text: string }
export interface AgentReply { conversationId: string; reply: string; stage: string }

export function loadChat(): { conversationId: string | null; messages: ChatMessage[] } {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw) as { conversationId: string | null; messages: ChatMessage[]; at: number };
      if (Date.now() - v.at < 7 * 86400_000 && Array.isArray(v.messages)) return { conversationId: v.conversationId, messages: v.messages };
    }
  } catch { /* storage unavailable */ }
  return { conversationId: null, messages: [] };
}

export function saveChat(conversationId: string | null, messages: ChatMessage[]) {
  try { localStorage.setItem(KEY, JSON.stringify({ conversationId, messages, at: Date.now() })); } catch { /* ignore */ }
}

export function clearChat() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export async function sendToAgent(conversationId: string | null, message: string): Promise<AgentReply> {
  const { data, error } = await supabase.functions.invoke("contact-agent", { body: { conversationId, message, page: location.pathname } });
  if (error) {
    // The function's own error body has the useful message.
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try { const b = await ctx.json(); if (b?.error) throw new Error(String(b.error)); } catch (e) { if (e instanceof Error && e.message !== "Unexpected end of JSON input") throw e; }
    }
    throw new Error(error.message ?? "The agent is not answering right now.");
  }
  if (data?.error) throw new Error(String(data.error));
  return data as AgentReply;
}
