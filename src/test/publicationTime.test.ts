import { describe, it, expect } from "vitest";
import { timeAgo } from "@/lib/publicationTime";

describe("timeAgo", () => {
  const now = Date.parse("2026-09-29T12:00:00Z");
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it("labels recent times relatively", () => {
    expect(timeAgo(ago(20_000), now)).toBe("Just now");
    expect(timeAgo(ago(5 * 60_000), now)).toBe("5 min ago");
    expect(timeAgo(ago(60 * 60_000), now)).toBe("1 hour ago");
    expect(timeAgo(ago(7 * 3600_000), now)).toBe("7 hours ago");
    expect(timeAgo(ago(30 * 3600_000), now)).toBe("Yesterday");
    expect(timeAgo(ago(4 * 86_400_000), now)).toBe("4 days ago");
  });

  it("falls back to a date for older stories", () => {
    expect(timeAgo("2026-09-01T12:00:00Z", now)).toMatch(/^Sep \d+$/);
    expect(timeAgo("2025-03-01T12:00:00Z", now)).toMatch(/^Mar \d+, 2025$/);
  });

  it("handles missing or invalid input", () => {
    expect(timeAgo(null, now)).toBe("");
    expect(timeAgo("nope", now)).toBe("");
    expect(timeAgo(new Date(now + 60_000).toISOString(), now)).toBe("Just now");
  });
});
