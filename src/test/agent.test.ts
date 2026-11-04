import { describe, it, expect } from "vitest";
import { HANDOFF, SYSTEM_PROMPT, THRESHOLDS, TOOLS, countUserTurns, engagementPct, qualify, transcriptText } from "../../supabase/functions/_shared/agent";

describe("contact agent rules", () => {
  it("qualifies free only when followers, engagement and listeners are all known and over the bar", () => {
    expect(qualify("free", { instagram_followers: 20_000, engagement_pct: 4, spotify_monthly_listeners: 30_000 })).toMatchObject({ qualified: true, missing: [], unknown: [] });
    expect(qualify("free", { instagram_followers: 20_000, engagement_pct: 1, spotify_monthly_listeners: 30_000 })).toMatchObject({ qualified: false, missing: ["engagement_pct"] });
    expect(qualify("free", { instagram_followers: 20_000, engagement_pct: 4 })).toMatchObject({ qualified: false, unknown: ["spotify_monthly_listeners"] });
    expect(qualify("free", {})).toMatchObject({ qualified: false, met: [] });
  });
  it("qualifies DSP on Spotify monthly listeners alone", () => {
    expect(qualify("dsp", { spotify_monthly_listeners: THRESHOLDS.dsp.spotifyMonthlyListeners })).toMatchObject({ qualified: true });
    expect(qualify("dsp", { spotify_monthly_listeners: "49,999" as unknown as number })).toMatchObject({ qualified: false });
    expect(qualify("dsp", { instagram_followers: 1_000_000 })).toMatchObject({ qualified: false, unknown: ["spotify_monthly_listeners"] });
  });
  it("works out engagement from interactions and followers", () => {
    expect(engagementPct(450, 10_000)).toBe(4.5);
    expect(engagementPct(10, 0)).toBeNull();
  });
  it("tells the model to come back to cost and to hand off with the secret word, without quoting thresholds", () => {
    expect(SYSTEM_PROMPT).toContain("Always come back to cost");
    expect(SYSTEM_PROMPT).toContain(HANDOFF.secretWord);
    expect(SYSTEM_PROMPT).toContain(HANDOFF.instagram);
    expect(SYSTEM_PROMPT).toContain("Never quote the qualifying thresholds");
    expect(SYSTEM_PROMPT).not.toContain(String(THRESHOLDS.free.instagramFollowers));
    expect(SYSTEM_PROMPT).not.toContain(String(THRESHOLDS.dsp.spotifyMonthlyListeners));
    expect(TOOLS.map((t) => t.name)).toEqual(["lookup_instagram", "lookup_spotify", "record_lead", "notify_team"]);
    for (const t of TOOLS) expect(t.input_schema).toMatchObject({ additionalProperties: false });
  });
  it("writes a transcript from text blocks only and counts user turns", () => {
    const messages = [
      { role: "user", content: "hey" },
      { role: "assistant", content: [{ type: "thinking", thinking: "" }, { type: "text", text: "PMG here." }, { type: "tool_use", id: "t1", name: "record_lead", input: {} }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: "{}" }] },
      { role: "assistant", content: [{ type: "text", text: "What's your handle?" }] },
      { role: "user", content: "@zoe" },
    ];
    expect(transcriptText(messages)).toBe("Visitor: hey\nPMG: PMG here.\nPMG: What's your handle?\nVisitor: @zoe");
    expect(countUserTurns(messages)).toBe(2);
  });
});
