// RSS feeds often supply a tiny cropped thumbnail rather than the original photograph.
export function publicationImage(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) return null;
    if (parsed.hostname === "www.billboard.com" || parsed.hostname === "billboard.com") {
      parsed.searchParams.delete("w");
      parsed.searchParams.delete("h");
      parsed.searchParams.delete("crop");
    }
    return parsed.toString();
  } catch {
    return null;
  }
}