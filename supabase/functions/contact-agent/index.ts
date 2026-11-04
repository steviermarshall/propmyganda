// Contact agent: talks with whoever writes in on /contact, qualifies distro and free
// requests, always comes back to the paid plans, and emails the team when money comes up.
//
//   POST { conversationId?, message, page? }  ->  { conversationId, reply, stage }
//   GET                                        ->  { ok, version }
//
// Secrets: ANTHROPIC_API_KEY (required), RESEND_API_KEY + NOTIFY_EMAIL (team email),
// IG_ACCESS_TOKEN + IG_BUSINESS_ID (Instagram lookups), SPOTIFY_CLIENT_ID/SECRET (Spotify lookups).
// Rules, thresholds and the system prompt: ../_shared/agent.ts

import Anthropic from "npm:@anthropic-ai/sdk@1.4.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { AGENT_VERSION, CLOSING_LINE, HANDOFF, MAX_MESSAGE_CHARS, MAX_NEW_CONVERSATIONS_PER_HOUR, MAX_USER_TURNS, SYSTEM_PROMPT, TOOLS, countUserTurns, qualify, transcriptText, type Intent, type Metrics } from "../_shared/agent.ts";
import { igLookup } from "../_shared/igLookup.ts";
import { spotifyArtistLookup } from "../_shared/spotifyArtist.ts";
import { sendEmail, teamEmail } from "../_shared/email.ts";

const MODEL = "claude-opus-5-5";
const MAX_TOOL_ROUNDS = 6;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const bad = (error: string, status = 400) => json({ error }, status);

function db() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
}

interface Row {
  id: string; messages: Anthropic.MessageParam[]; visitor_name: string | null; email: string | null; instagram: string | null; spotify: string | null;
  intent: string | null; metrics: Metrics | null; qualified: boolean | null; notes: string | null; stage: string; notified_at: string | null; turns: number;
}

async function runTool(supabase: ReturnType<typeof db>, row: Row, name: string, input: Record<string, unknown>): Promise<{ result: string; patch: Record<string, unknown> }> {
  if (name === "lookup_instagram") {
    const p = await igLookup(String(input.handle ?? ""));
    return { result: JSON.stringify(p), patch: p.verified && !row.instagram ? { instagram: p.handle } : {} };
  }
  if (name === "lookup_spotify") {
    try {
      const artists = await spotifyArtistLookup(String(input.query ?? ""));
      return { result: JSON.stringify(artists.length ? artists : { error: "no match" }), patch: {} };
    } catch (e) {
      return { result: JSON.stringify({ error: e instanceof Error ? e.message : "lookup failed" }), patch: {} };
    }
  }
  if (name === "record_lead") {
    const intent = String(input.intent ?? "other") as Intent;
    const metrics = (input.metrics ?? {}) as Metrics;
    const q = intent === "dsp" || intent === "free" ? qualify(intent, metrics) : null;
    const patch: Record<string, unknown> = {
      visitor_name: (input.name as string | null) ?? row.visitor_name, email: (input.email as string | null) ?? row.email,
      instagram: (input.instagram as string | null) ?? row.instagram, spotify: (input.spotify as string | null) ?? row.spotify,
      intent, metrics, qualified: q?.qualified ?? null, notes: String(input.notes ?? "") || row.notes,
    };
    return { result: JSON.stringify({ saved: true, bar: q ?? "n/a for this intent", reminder: "Do not quote thresholds. Steer to the paid plan that fits." }), patch };
  }
  if (name === "notify_team") {
    const to = teamEmail();
    const transcript = transcriptText(row.messages);
    const text = [
      `Reason: ${input.reason}`, `Summary: ${input.summary}`, "",
      `Name: ${row.visitor_name ?? "—"}`, `Email: ${row.email ?? "—"}`, `Instagram: ${row.instagram ? "@" + row.instagram : "—"}`, `Spotify: ${row.spotify ?? "—"}`,
      `Intent: ${row.intent ?? "—"}`, `Metrics: ${JSON.stringify(row.metrics ?? {})}`, `Meets the bar: ${row.qualified === null ? "not assessed" : row.qualified ? "yes" : "no"}`,
      `Notes: ${row.notes ?? "—"}`, "", `Thread: https://propmyganda.com/admin/contact (conversation ${row.id})`, "", "— Transcript —", transcript,
    ].join("\n");
    let sent = false;
    if (to) {
      try { sent = await sendEmail(to, `[PMG agent] ${input.reason}: ${row.visitor_name ?? row.instagram ?? "visitor"}`, text, { replyTo: row.email ?? undefined }); }
      catch (e) { console.error("notify failed", e instanceof Error ? e.message : e); }
    }
    const patch = { notified_at: new Date().toISOString(), stage: input.reason === "question" ? "question" : "handed_off" };
    return {
      result: JSON.stringify({ emailed: sent, handoff: { instagram: HANDOFF.instagram, word: HANDOFF.secretWord, book: HANDOFF.startUrl }, note: sent ? "Tell them the team has the thread." : "Email is not set up; tell them to DM Instagram with the word, or email " + HANDOFF.email }),
      patch,
    };
  }
  return { result: JSON.stringify({ error: `unknown tool ${name}` }), patch: {} };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method === "GET") return json({ ok: true, function: "contact-agent", version: AGENT_VERSION, model: MODEL });
  if (req.method !== "POST") return bad("POST only", 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return bad("ANTHROPIC_API_KEY is not set", 503);

  let body: Record<string, unknown> = {};
  try { body = (await req.json()) ?? {}; } catch { return bad("Invalid JSON"); }
  const message = String(body.message ?? "").trim().slice(0, MAX_MESSAGE_CHARS);
  if (!message) return bad("Say something first");
  const ip = (req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? "").split(",")[0].trim() || null;
  const supabase = db();

  try {
    // Load or open the conversation.
    let row: Row | null = null;
    const id = typeof body.conversationId === "string" && /^[0-9a-f-]{36}$/i.test(body.conversationId) ? body.conversationId : null;
    if (id) {
      const { data } = await supabase.from("agent_conversations").select("*").eq("id", id).maybeSingle();
      row = (data as Row | null) ?? null;
    }
    if (!row) {
      if (ip) {
        const since = new Date(Date.now() - 3600_000).toISOString();
        const { count } = await supabase.from("agent_conversations").select("id", { count: "exact", head: true }).eq("ip", ip).gte("created_at", since);
        if ((count ?? 0) >= MAX_NEW_CONVERSATIONS_PER_HOUR) return bad("Too many new chats from here. Email " + HANDOFF.email, 429);
      }
      const { data, error } = await supabase.from("agent_conversations").insert({ ip, page: String(body.page ?? "/contact").slice(0, 120), messages: [] }).select("*").single();
      if (error) throw new Error(error.message);
      row = data as Row;
    }

    if (countUserTurns(row.messages) >= MAX_USER_TURNS) return json({ conversationId: row.id, reply: CLOSING_LINE, stage: "closed" });

    const client = new Anthropic({ apiKey });
    const messages: Anthropic.MessageParam[] = [...row.messages, { role: "user", content: message }];
    const patch: Record<string, unknown> = {};
    let reply = "";

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 4000,
        output_config: { effort: "low" },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        tools: TOOLS as unknown as Anthropic.Beta.BetaTool[],
        messages,
      } as unknown as Anthropic.Beta.MessageCreateParamsNonStreaming);

      messages.push({ role: "assistant", content: response.content as unknown as Anthropic.ContentBlockParam[] });
      reply = response.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("\n").trim();

      if (response.stop_reason === "refusal") { reply = reply || `I can't help with that here. Email ${HANDOFF.email}.`; break; }
      if (response.stop_reason === "max_tokens") break;
      const uses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
      if (response.stop_reason !== "tool_use" || uses.length === 0) break;

      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const u of uses) {
        const snapshot: Row = { ...row, ...(patch as Partial<Row>), messages };
        const { result, patch: p } = await runTool(supabase, snapshot, u.name, (u.input ?? {}) as Record<string, unknown>);
        Object.assign(patch, p);
        results.push({ type: "tool_result", tool_use_id: u.id, content: result });
      }
      messages.push({ role: "user", content: results });
    }

    if (!reply) reply = `Got it. A person on the team will pick this up by email, or DM ${HANDOFF.instagram} with the word "${HANDOFF.secretWord}".`;
    const stage = (patch.stage as string | undefined) ?? row.stage ?? "chatting";
    await supabase.from("agent_conversations").update({
      ...patch, messages, transcript: transcriptText(messages), turns: countUserTurns(messages), stage, updated_at: new Date().toISOString(),
    }).eq("id", row.id);

    return json({ conversationId: row.id, reply, stage });
  } catch (e) {
    console.error("contact-agent", e);
    const m = e instanceof Error ? e.message : String(e);
    return bad(/relation .*agent_conversations.* does not exist/.test(m) ? "The agent_conversations migration has not been applied yet (supabase/migrations/20261104_018)." : m, 500);
  }
});
