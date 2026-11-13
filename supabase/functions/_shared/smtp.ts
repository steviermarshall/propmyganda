// A small SMTP client for Gmail over implicit TLS (smtp.gmail.com:465), so the site can send
// from the team's existing Gmail with an app password and no third-party email account.
// Supabase edge functions block ports 25 and 587 only; 465 is open.
// Message building is pure and tested; only sendSmtp touches the network.

// The app's typecheck reads this file too (the tests import it), so declare the one Deno call it makes.
declare const Deno: { connectTls(o: { hostname: string; port: number }): Promise<{ read(p: Uint8Array): Promise<number | null>; write(p: Uint8Array): Promise<number>; close(): void }> };

export interface Mail { from: string; fromName?: string; to: string; bcc?: string[]; replyTo?: string; subject: string; text: string }

const b64 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = ""; for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};

/** RFC 2047: headers stay ASCII; anything else is sent as a UTF-8 base64 encoded-word. */
export function encodeHeader(value: string): string {
  // deno-lint-ignore no-control-regex
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  // 45 bytes of UTF-8 per word keeps each encoded-word under 75 characters; split on code points, not bytes.
  const words: string[] = []; let chunk = "";
  for (const ch of value) {
    if (new TextEncoder().encode(chunk + ch).length > 45) { words.push(chunk); chunk = ""; }
    chunk += ch;
  }
  if (chunk) words.push(chunk);
  return words.map((w) => `=?UTF-8?B?${b64(w)}?=`).join("\r\n ");
}

const clean = (s: string) => s.replace(/[\r\n]+/g, " ").trim();
const addr = (email: string, name?: string) => (name ? `${encodeHeader(clean(name).replace(/["<>]/g, ""))} <${clean(email)}>` : clean(email));

/** The full message: headers, then the body as base64 UTF-8 wrapped at 76 columns. Bcc is never written here. */
export function buildMessage(m: Mail, now = new Date(), id: string = crypto.randomUUID()): string {
  const domain = m.from.split("@")[1] ?? "localhost";
  const body = (b64(m.text.replace(/\r?\n/g, "\r\n")).match(/.{1,76}/g) ?? []).join("\r\n");
  return [
    `From: ${addr(m.from, m.fromName)}`,
    `To: ${clean(m.to)}`,
    ...(m.replyTo ? [`Reply-To: ${clean(m.replyTo)}`] : []),
    `Subject: ${encodeHeader(clean(m.subject))}`,
    `Date: ${now.toUTCString().replace("GMT", "+0000")}`,
    `Message-ID: <${id}@${domain}>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    body,
  ].join("\r\n");
}

/** Sends one message through Gmail. Throws with the server's reply on any refusal. */
export async function sendSmtp(m: Mail, user: string, password: string, timeoutMs = 15_000): Promise<void> {
  const conn = await Deno.connectTls({ hostname: "smtp.gmail.com", port: 465 });
  const timer = setTimeout(() => { try { conn.close(); } catch { /* already closed */ } }, timeoutMs);
  const enc = new TextEncoder(), dec = new TextDecoder();
  let buf = "";
  const reply = async (): Promise<string> => {
    // A reply ends with a line whose 4th character is a space ("250 OK"); "250-" lines continue.
    for (;;) {
      const lines = buf.split("\r\n");
      for (let i = 0; i < lines.length - 1; i++) {
        if (/^\d{3} /.test(lines[i])) { const out = lines.slice(0, i + 1).join("\n"); buf = lines.slice(i + 1).join("\r\n"); return out; }
      }
      const chunk = new Uint8Array(2048);
      const n = await conn.read(chunk);
      if (n === null) throw new Error("SMTP connection closed");
      buf += dec.decode(chunk.subarray(0, n));
    }
  };
  const cmd = async (line: string, expect: number, label = line): Promise<string> => {
    await conn.write(enc.encode(line + "\r\n"));
    const r = await reply();
    if (!r.startsWith(String(expect))) throw new Error(`SMTP ${label.split(" ")[0]}: ${r.split("\n").pop()}`);
    return r;
  };
  try {
    const hello = await reply();
    if (!hello.startsWith("220")) throw new Error(`SMTP greeting: ${hello}`);
    await cmd("EHLO propmyganda.com", 250);
    await cmd("AUTH LOGIN", 334);
    await cmd(btoa(user), 334, "AUTH user");
    await cmd(btoa(password), 235, "AUTH password");
    await cmd(`MAIL FROM:<${m.from}>`, 250);
    for (const rcpt of [m.to, ...(m.bcc ?? [])]) await cmd(`RCPT TO:<${clean(rcpt)}>`, 250);
    await cmd("DATA", 354);
    // Dot-stuffing: a line starting with "." gets a second one. The base64 body never does; headers could.
    const data = buildMessage(m).replace(/\r\n\./g, "\r\n..");
    await cmd(data + "\r\n.", 250, "DATA end");
    try { await conn.write(enc.encode("QUIT\r\n")); } catch { /* the message is already accepted */ }
  } finally {
    clearTimeout(timer);
    try { conn.close(); } catch { /* already closed */ }
  }
}
