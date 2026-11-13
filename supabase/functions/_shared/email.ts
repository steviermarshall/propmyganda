// Transactional email. Two transports, picked by which secrets exist:
//   Gmail  — GMAIL_USER + GMAIL_APP_PASSWORD: sends from the team's own Gmail, replies land in that inbox.
//   Resend — RESEND_API_KEY (+ NOTIFY_FROM on a verified domain).
// NOTIFY_EMAIL is the team inbox for copies, alerts and replies; with Gmail it defaults to GMAIL_USER.
import { sendSmtp } from "./smtp.ts";

const gmailUser = () => (Deno.env.get("GMAIL_USER") ?? "").trim() || null;
const gmailPass = () => (Deno.env.get("GMAIL_APP_PASSWORD") ?? "").replace(/\s+/g, "") || null;

export function teamEmail(): string | null {
  return Deno.env.get("NOTIFY_EMAIL") ?? gmailUser();
}

export function emailTransport(): "gmail" | "resend" | "none" {
  if (gmailUser() && gmailPass()) return "gmail";
  if (Deno.env.get("RESEND_API_KEY")) return "resend";
  return "none";
}

/** Sends one plain-text email; `bccTeam` copies the team inbox. Returns false when no transport is configured. */
export async function sendEmail(to: string, subject: string, text: string, opts: { bccTeam?: boolean; replyTo?: string } = {}): Promise<boolean> {
  const notify = teamEmail();
  // Every email says "reply to this"; replies go to the team inbox unless a caller names another address.
  const replyTo = opts.replyTo ?? (notify && notify !== to ? notify : undefined);
  const transport = emailTransport();

  if (transport === "gmail") {
    const user = gmailUser()!;
    // Gmail keeps its own copy in Sent, so a bcc back to the sending address would only duplicate it.
    const bcc = opts.bccTeam && notify && notify !== to && notify !== user ? [notify] : [];
    const fromName = (Deno.env.get("NOTIFY_FROM") ?? "PMG").replace(/<.*>/, "").trim() || "PMG";
    await sendSmtp({ from: user, fromName, to, bcc, replyTo, subject, text }, user, gmailPass()!);
    return true;
  }

  if (transport === "resend") {
    const from = Deno.env.get("NOTIFY_FROM") ?? "PMG <no-reply@propmyganda.com>";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], bcc: opts.bccTeam && notify && notify !== to ? [notify] : undefined, reply_to: replyTo, subject, text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`email ${res.status} ${await res.text()}`);
    return true;
  }
  return false;
}
