/**
 * Resilient lazy loading.
 *
 * A dynamically imported chunk can fail to fetch when the browser is holding an
 * older build's chunk names (a redeploy renames the files) or when the network
 * hiccups. React.lazy() has no retry, so the throw blanks the screen.
 *
 * This wrapper retries the import, and if the failure still looks like a missing
 * chunk it reloads the page once so the browser picks up the current build.
 * The one-reload guard lives in sessionStorage so a genuinely broken build
 * cannot put the page into a reload loop.
 */
import { lazy } from "react";
import type { ComponentType } from "react";

const RELOAD_FLAG = "pmg:chunk-reload-attempted";

type FlagStore = Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;

export interface RetryOptions {
  /** How many times to try the import before giving up. */
  attempts?: number;
  /** Base back-off between tries, in ms. Grows with each attempt. */
  delayMs?: number;
  /** Called once when a missing-chunk failure needs a fresh build. Injectable for tests. */
  reload?: () => void;
  /** Where the one-reload guard is kept. Injectable for tests. */
  storage?: FlagStore;
  /** Awaitable pause between tries. Injectable for tests. */
  wait?: (ms: number) => Promise<void>;
}

function browserStore(): FlagStore {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) return window.sessionStorage;
  } catch {
    /* storage blocked (private mode) — no guard available */
  }
  return null;
}

/** True for the errors a stale or unreachable chunk produces. */
export function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error ?? "");
  return /dynamically imported module|error loading dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk\s+\S+\s+failed|Failed to fetch dynamically/i.test(
    message,
  );
}

/**
 * Run an import factory with retries. On a missing-chunk failure, trigger one
 * page reload so the browser fetches the current build, then rethrow so a
 * boundary can show something instead of a blank screen.
 */
export async function importWithRetry<T>(
  factory: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    attempts = 3,
    delayMs = 250,
    reload = () => window.location.reload(),
    storage = browserStore(),
    wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const mod = await factory();
      // Loaded fine — let a later deploy ask for a reload again.
      try {
        storage?.removeItem(RELOAD_FLAG);
      } catch {
        /* ignore */
      }
      return mod;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await wait(delayMs * attempt);
    }
  }

  if (isChunkLoadError(lastError)) {
    let alreadyReloaded = false;
    try {
      alreadyReloaded = storage?.getItem(RELOAD_FLAG) === "1";
      if (!alreadyReloaded) storage?.setItem(RELOAD_FLAG, "1");
    } catch {
      /* ignore */
    }
    if (!alreadyReloaded) {
      try {
        reload();
      } catch {
        /* ignore */
      }
    }
  }

  throw lastError;
}

/** React.lazy() that retries a failed chunk and reloads once if it stays missing. */
export function lazyWithRetry<P>(factory: () => Promise<{ default: ComponentType<P> }>) {
  return lazy(() => importWithRetry(factory));
}

export default lazyWithRetry;
