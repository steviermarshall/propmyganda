import { describe, expect, it, vi } from "vitest";
import { importWithRetry, isChunkLoadError } from "@/lib/lazyWithRetry";

function fakeStore() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

const STALE_CHUNK = new Error(
  "Failed to fetch dynamically imported module: https://preview.lovable.app/assets/PropworldScene-BakjftAn.js",
);

const noWait = async () => {};

describe("importWithRetry", () => {
  it("returns the module when the import succeeds", async () => {
    const mod = { default: "scene" };
    const reload = vi.fn();
    const result = await importWithRetry(async () => mod, {
      reload,
      storage: fakeStore(),
      wait: noWait,
    });
    expect(result).toBe(mod);
    expect(reload).not.toHaveBeenCalled();
  });

  it("retries a chunk failure and succeeds without reloading", async () => {
    const mod = { default: "scene" };
    let calls = 0;
    const reload = vi.fn();
    const result = await importWithRetry(
      async () => {
        calls += 1;
        if (calls === 1) throw STALE_CHUNK;
        return mod;
      },
      { reload, storage: fakeStore(), wait: noWait },
    );
    expect(calls).toBe(2);
    expect(result).toBe(mod);
    expect(reload).not.toHaveBeenCalled();
  });

  it("reloads once when every try hits a missing chunk", async () => {
    const storage = fakeStore();
    const reload = vi.fn();
    await expect(
      importWithRetry(
        async () => {
          throw STALE_CHUNK;
        },
        { attempts: 3, reload, storage, wait: noWait },
      ),
    ).rejects.toBe(STALE_CHUNK);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(storage.getItem("pmg:chunk-reload-attempted")).toBe("1");
  });

  it("never reloads twice for the same build", async () => {
    const storage = fakeStore();
    storage.setItem("pmg:chunk-reload-attempted", "1");
    const reload = vi.fn();
    await expect(
      importWithRetry(
        async () => {
          throw STALE_CHUNK;
        },
        { attempts: 2, reload, storage, wait: noWait },
      ),
    ).rejects.toBe(STALE_CHUNK);
    expect(reload).not.toHaveBeenCalled();
  });

  it("does not reload for an unrelated error", async () => {
    const storage = fakeStore();
    const reload = vi.fn();
    const bug = new TypeError("x is not a function");
    await expect(
      importWithRetry(
        async () => {
          throw bug;
        },
        { attempts: 2, reload, storage, wait: noWait },
      ),
    ).rejects.toBe(bug);
    expect(reload).not.toHaveBeenCalled();
    expect(storage.getItem("pmg:chunk-reload-attempted")).toBeNull();
  });

  it("recognises the chunk-load error shapes", () => {
    expect(isChunkLoadError(STALE_CHUNK)).toBe(true);
    expect(isChunkLoadError(new Error("error loading dynamically imported module"))).toBe(true);
    expect(isChunkLoadError(new Error("Loading chunk 7 failed."))).toBe(true);
    expect(isChunkLoadError(new TypeError("x is not a function"))).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});
