import { describe, it, expect } from "vitest";
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  todayISO, addDaysISO, daysSince, hoursBetween,
} from "./dates";

describe("crm/dates", () => {
  it("startOfWeek returns the Monday 00:00 of the week", () => {
    // 2026-07-15 is a Wednesday
    const wed = new Date("2026-07-15T12:34:00");
    const s = startOfWeek(wed);
    expect(s.getDay()).toBe(1); // Monday
    expect(s.getHours()).toBe(0);
    expect(s.getMinutes()).toBe(0);
    expect(s.getDate()).toBe(13); // Mon 2026-07-13
  });

  it("startOfWeek treats Sunday as the end of the current week", () => {
    const sun = new Date("2026-07-19T09:00:00"); // Sunday
    const s = startOfWeek(sun);
    expect(s.getDay()).toBe(1);
    expect(s.getDate()).toBe(13); // still the Mon before
  });

  it("endOfWeek is 7 days after startOfWeek", () => {
    const d = new Date("2026-07-15T12:00:00");
    const diff = endOfWeek(d).getTime() - startOfWeek(d).getTime();
    expect(diff).toBe(7 * 86400000);
  });

  it("startOfMonth / endOfMonth bound the month", () => {
    const d = new Date("2026-07-15T00:00:00");
    expect(startOfMonth(d).getDate()).toBe(1);
    expect(startOfMonth(d).getMonth()).toBe(6); // July (0-indexed)
    expect(endOfMonth(d).getMonth()).toBe(7);   // Aug 1
    expect(endOfMonth(d).getDate()).toBe(1);
  });

  it("todayISO is a YYYY-MM-DD string", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("addDaysISO shifts by whole days", () => {
    const base = new Date("2026-07-15T00:00:00Z");
    expect(addDaysISO(3, base)).toBe("2026-07-18");
    expect(addDaysISO(-1, base)).toBe("2026-07-14");
  });

  it("daysSince returns Infinity for nullish input", () => {
    expect(daysSince(null)).toBe(Infinity);
    expect(daysSince(undefined)).toBe(Infinity);
  });

  it("daysSince counts elapsed days", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    expect(daysSince(threeDaysAgo)).toBe(3);
  });

  it("hoursBetween returns null when either bound is missing", () => {
    expect(hoursBetween(null, new Date().toISOString())).toBeNull();
    expect(hoursBetween(new Date().toISOString(), null)).toBeNull();
  });

  it("hoursBetween rounds the hour delta", () => {
    const a = "2026-07-15T00:00:00Z";
    const b = "2026-07-15T05:00:00Z";
    expect(hoursBetween(a, b)).toBe(5);
  });
});
