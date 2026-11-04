// The PMG Streaming Release Agreement, as published on the DSP Release Agreement
// form. Shown in full at signing; its version and SHA-256 are stored on the order.
// Bump AGREEMENT_VERSION whenever the text changes.

export const AGREEMENT_VERSION = "2026-02-form";

export const STANDARD_SPLITS = {
  master: { pmg: 45, artist: 45, producer: 10 },
  publishing: { pmg: 100, artist: 50, producer: 50 },
} as const;

export const AGREEMENT_TEXT = `PMG STREAMING RELEASE AGREEMENT

Thank you for being a part of PROPMYGANDA (PMG). This is both the collection of artist and producer information and a binding agreement for the release of your performance on digital streaming platforms (DSPs).

SPLITS AND CREDITS
Master royalties (totalling 100%): PMG 45% | Artist 45% | Producer(s) 10%
Publishing (totalling 200%): PMG 100% | Artist 50% | Producer(s) 50%
PMG and the Artist will be listed as primary rights holders on DSPs.
Distribution via UnitedMasters.
If the Artist or Producer request different splits, those adjustments must be clearly provided in the Alternate Split section. Any such adjusted splits apply only to the specific release covered by this agreement and must be agreed to by all contributors (Artists, Producers, PMG). By submitting alternate splits you represent that all listed contributors have consented to the adjustment.

COVER ART
PMG's in-house team will select the official cover art from thumbnails captured during your performance. If you prefer to submit alternate cover art, contact your booking representative before release.

RELEASE TIMELINE
Performances published on PMG's social platforms are estimated at 4 to 6 weeks turnaround from recording. Streaming release follows within one week after the social performance is published (sometimes the same day).

TITLE FORMAT
The standard DSP title is "[Your Artist Name]" Propmyganda Performance. If you request another title, provide it where asked.

AGREEMENT TERMS
1. Rights granted: by submitting, the Artist and Producer grant PMG the non-exclusive right to distribute the recorded performance to DSPs worldwide.
2. Ownership: the Artist and Producer retain ownership of their contributions. PMG claims no copyright in the underlying work.
3. Royalties and payment: the splits above (or agreed alternates) will be honoured and administered via DSP distribution.
4. Warranties: the Artist and Producer confirm the submitted work is original and does not infringe third-party rights.
5. Term: this agreement applies only to the performance submitted here.
6. Termination: either party may terminate future use with written notice; this does not affect earnings already accrued.
7. Governing law: this agreement is governed by the laws of the State of New York.

By typing your full legal name you agree that it serves as your binding electronic signature under the ESIGN Act.`;

export interface Splits { pmg: number; artist: number; producer: number }

/** Alternate master splits must be whole percentages that total exactly 100. */
export function validateSplits(input: unknown): Splits | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  const n = (v: unknown) => (Number.isInteger(Number(v)) ? Number(v) : NaN);
  const s = { pmg: n(o.pmg), artist: n(o.artist), producer: n(o.producer) };
  if ([s.pmg, s.artist, s.producer].some((v) => isNaN(v) || v < 0 || v > 100)) return null;
  return s.pmg + s.artist + s.producer === 100 ? s : null;
}

export function splitsLine(s: Splits): string {
  return `PMG ${s.pmg}% / Artist ${s.artist}% / Producer ${s.producer}%`;
}

/** IPI numbers are 9–11 digits; "none" is an explicit answer, anything else is noise. */
export function normalizeIpi(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (/^(none|n\/a|no)$/i.test(s)) return "none";
  const digits = s.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 11 ? digits : null;
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
