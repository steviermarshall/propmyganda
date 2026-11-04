// Instagram public profile via the Graph API's business_discovery.
// Secrets: IG_ACCESS_TOKEN, IG_BUSINESS_ID. Without them the handle is only linked, not verified.

export interface IgProfile {
  handle: string; url: string; verified: boolean; name?: string; followers?: number; posts?: number; picture?: string; bio?: string; error?: string;
}

export function cleanHandle(input: string): string {
  return String(input ?? "").trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?].*$/, "").toLowerCase();
}

export async function igLookup(raw: string): Promise<IgProfile> {
  const handle = cleanHandle(raw);
  const token = Deno.env.get("IG_ACCESS_TOKEN");
  const businessId = Deno.env.get("IG_BUSINESS_ID");
  const profileUrl = `https://www.instagram.com/${handle}/`;
  if (!handle) return { handle, url: profileUrl, verified: false, error: "no handle" };
  if (!token || !businessId) return { handle, url: profileUrl, verified: false };
  const fields = `business_discovery.username(${handle}){username,name,followers_count,media_count,profile_picture_url,biography}`;
  const res = await fetch(`https://graph.facebook.com/v21.0/${businessId}?fields=${encodeURIComponent(fields)}&access_token=${token}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return { handle, url: profileUrl, verified: false, error: `IG ${res.status}` };
  const data = await res.json();
  const p = data.business_discovery;
  if (!p) return { handle, url: profileUrl, verified: false };
  return { handle: p.username, url: `https://www.instagram.com/${p.username}/`, verified: true, name: p.name, followers: p.followers_count, posts: p.media_count, picture: p.profile_picture_url, bio: p.biography };
}
