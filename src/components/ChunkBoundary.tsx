import { Component } from "react";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Shown when the scene cannot be loaded at all. */
  label?: string;
}

interface State {
  hasError: boolean;
}

/**
 * Keeps a scene that cannot be loaded from blanking the whole page.
 *
 * The usual cause is a stale build: the browser is holding chunk names from an
 * older deploy, so the file it asks for no longer exists. lazyWithRetry already
 * reloads once for that; this is the net underneath — a readable message with a
 * way back in, instead of a black screen.
 */
export default class ChunkBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.warn("Scene chunk failed to load:", error);
  }

  private retry = () => {
    try {
      window.sessionStorage.removeItem("pmg:chunk-reload-attempted");
    } catch {
      /* storage blocked — reload anyway */
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-sidebar px-6 text-center text-sidebar-foreground">
        <p className="font-display text-2xl uppercase tracking-[0.2em] text-electric">
          {this.props.label ?? "This scene didn't load"}
        </p>
        <p className="max-w-sm text-sm text-sidebar-foreground/70">
          The page was updated while you were here. Reload to get the newest version.
        </p>
        <button
          type="button"
          onClick={this.retry}
          className="border border-sidebar-border bg-sidebar-foreground px-6 py-2 font-display text-sm uppercase tracking-[0.2em] text-sidebar transition-opacity hover:opacity-80"
        >
          Reload
        </button>
      </div>
    );
  }
}
