// Transactional email through Resend. Secrets: RESEND_API_KEY, NOTIFY_FROM, NOTIFY_EMAIL.

export function teamEmail(): string | null {
  return Deno.env.get("NOTIFY_EMAIL") ?? null;
}

/** Sends one plain-text email; `bccTeam` copies NOTIFY_EMAIL. Returns false when email is not configured. */
export async function sendEmail(to: string, subject: string, text: string, opts: { bccTeam?: boolean; replyTo?: string } = {}): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return false;
  const from = Deno.env.get("NOTIFY_FROM") ?? "PMG <no-reply@propmyganda.com>";
  const notify = teamEmail();
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    // Every email says "reply to this"; replies go to the team inbox unless a caller names another address.
    body: JSON.stringify({ from, to: [to], bcc: opts.bccTeam && notify && notify !== to ? [notify] : undefined, reply_to: opts.replyTo ?? (notify && notify !== to ? notify : undefined), subject, text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`email ${res.status} ${await res.text()}`);
  return true;
}
