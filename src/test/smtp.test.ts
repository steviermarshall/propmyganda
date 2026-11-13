import { describe, it, expect } from "vitest";
import { buildMessage, encodeHeader } from "../../supabase/functions/_shared/smtp";

const decode = (b: string) => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\s+/g, "")), (c) => c.charCodeAt(0)));

describe("smtp message", () => {
  it("leaves plain ASCII headers alone and encodes anything else as UTF-8 words", () => {
    expect(encodeHeader("Shoot in 48 hours")).toBe("Shoot in 48 hours");
    const enc = encodeHeader("PMG · PMG-R-007 · you're in — Zoë");
    expect(enc).toMatch(/^=\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=/);
    const joined = [...enc.matchAll(/=\?UTF-8\?B\?([^?]+)\?=/g)].map((m) => decode(m[1])).join("");
    expect(joined).toBe("PMG · PMG-R-007 · you're in — Zoë");
    for (const word of enc.split("\r\n ")) expect(word.length).toBeLessThanOrEqual(75);
  });
  it("builds a complete message with CRLF lines, a base64 UTF-8 body and no Bcc header", () => {
    const msg = buildMessage({ from: "team@gmail.com", fromName: "PMG", to: "artist@example.com", bcc: ["hidden@example.com"], replyTo: "team@gmail.com", subject: "You're in", text: "Zoë — you're in.\n.\nSecond line." }, new Date("2026-11-13T15:00:00Z"), "abc");
    const [head, body] = msg.split("\r\n\r\n");
    expect(head).toContain("From: PMG <team@gmail.com>");
    expect(head).toContain("To: artist@example.com");
    expect(head).toContain("Reply-To: team@gmail.com");
    expect(head).toContain("Subject: You're in");
    expect(head).toContain("Message-ID: <abc@gmail.com>");
    expect(head).toContain("Date: Fri, 13 Nov 2026 15:00:00 +0000");
    expect(head).not.toMatch(/bcc/i);
    expect(msg.split("\n").every((l, i, a) => i === a.length - 1 || l.endsWith("\r"))).toBe(true);
    expect(decode(body)).toBe("Zoë — you're in.\r\n.\r\nSecond line.");
    for (const line of body.split("\r\n")) expect(line.length).toBeLessThanOrEqual(76);
  });
  it("cannot be used to inject headers through the subject or addresses", () => {
    const msg = buildMessage({ from: "team@gmail.com", to: "a@example.com\r\nBcc: evil@example.com", subject: "Hi\r\nBcc: evil@example.com", text: "x" });
    const head = msg.split("\r\n\r\n")[0];
    expect(head.split("\r\n").filter((l) => /^bcc:/i.test(l))).toEqual([]);
  });
});
