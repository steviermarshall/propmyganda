import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Track } from "@/lib/spotifyCatalog";

// One Spotify embed for the whole page, driven by the Spotify iFrame API.
// Tiles call play(track) and read `current`/`isPaused`/`position` back.
// Docs: https://developer.spotify.com/documentation/embeds/references/iframe-api

interface EmbedController {
  loadUri: (uri: string) => void;
  play: () => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  addListener: (event: string, cb: (e: { data: PlaybackData }) => void) => void;
}
interface PlaybackData { isPaused: boolean; isBuffering: boolean; duration: number; position: number }
interface IFrameAPI {
  createController: (el: HTMLElement, options: { uri: string; width?: string | number; height?: string | number; theme?: string }, cb: (c: EmbedController) => void) => void;
}
declare global {
  interface Window { onSpotifyIframeApiReady?: (api: IFrameAPI) => void; __spotifyIframeApi?: IFrameAPI }
}

export interface PlayerState {
  current: Track | null;
  /** Which tile started the current track, so only that tile shows as playing. */
  owner: string | null;
  isPaused: boolean;
  position: number;
  duration: number;
  ready: boolean;
  play: (track: Track, owner: string) => void;
  toggle: () => void;
}

const PlayerContext = createContext<PlayerState | null>(null);
const SCRIPT_SRC = "https://open.spotify.com/embed/iframe-api/v1";

function loadApi(): Promise<IFrameAPI> {
  return new Promise((resolve) => {
    if (window.__spotifyIframeApi) return resolve(window.__spotifyIframeApi);
    const prev = window.onSpotifyIframeApiReady;
    window.onSpotifyIframeApiReady = (api) => {
      window.__spotifyIframeApi = api;
      prev?.(api);
      resolve(api);
    };
    if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const s = document.createElement("script");
      s.src = SCRIPT_SRC;
      s.async = true;
      document.head.appendChild(s);
    }
  });
}

export function SpotifyPlayerProvider({ children }: { children: ReactNode }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<EmbedController | null>(null);
  const pendingRef = useRef<Track | null>(null);
  const [current, setCurrent] = useState<Track | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [isPaused, setPaused] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  // The controller is created lazily on the first play(), with that track as its URI.
  const ensureController = useCallback(async (track: Track) => {
    if (controllerRef.current) return controllerRef.current;
    const api = await loadApi();
    const host = mountRef.current;
    if (!host) return null;
    const el = document.createElement("div");
    host.replaceChildren(el);
    return new Promise<EmbedController>((resolve) => {
      api.createController(el, { uri: track.uri, width: "100%", height: 80, theme: "dark" }, (controller) => {
        controllerRef.current = controller;
        controller.addListener("ready", () => {
          setReady(true);
          controller.play();
        });
        controller.addListener("playback_update", (e) => {
          setPaused(e.data.isPaused);
          setPosition(e.data.position);
          setDuration(e.data.duration);
        });
        resolve(controller);
      });
    });
  }, []);

  const play = useCallback(
    (track: Track, who: string) => {
      setOpen(true);
      if (current?.uri === track.uri && controllerRef.current) {
        controllerRef.current.togglePlay();
        return;
      }
      setCurrent(track);
      setOwner(who);
      setPosition(0);
      setDuration(track.durationMs);
      setPaused(false);
      if (controllerRef.current) {
        controllerRef.current.loadUri(track.uri);
        controllerRef.current.play();
      } else if (!pendingRef.current) {
        pendingRef.current = track;
        ensureController(track).finally(() => { pendingRef.current = null; });
      }
    },
    [current, ensureController],
  );

  const toggle = useCallback(() => controllerRef.current?.togglePlay(), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && (e.target as HTMLElement)?.tagName !== "INPUT" && (e.target as HTMLElement)?.tagName !== "BUTTON") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, toggle]);

  const value = useMemo<PlayerState>(
    () => ({ current, owner, isPaused, position, duration, ready, play, toggle }),
    [current, owner, isPaused, position, duration, ready, play, toggle],
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {/* Now-playing dock. Lives on the page from the start so the embed can mount; slides up on first play. */}
      <div
        className={`fixed inset-x-3 bottom-16 z-40 mx-auto max-w-md transition-all duration-500 md:inset-x-auto md:bottom-3 md:right-6 md:w-[420px] ${
          open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
        }`}
        aria-hidden={!open}
      >
        <div className="overflow-hidden rounded-[22px] border border-white/10 bg-[#101012]/90 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          {current && (
            <div className="flex items-center gap-3 px-2 pb-2 pt-1">
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full rounded-full bg-electric ${isPaused ? "" : "animate-ping"} opacity-60`} />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-electric" />
              </span>
              <p className="min-w-0 flex-1 truncate font-mono text-[10px] uppercase tracking-[0.18em] text-white/60">
                {isPaused ? "Paused" : "Now playing"} · <span className="text-white">{current.name}</span> · {current.artists}
              </p>
            </div>
          )}
          <div ref={mountRef} className="overflow-hidden rounded-xl [&_iframe]:block" />
        </div>
      </div>
    </PlayerContext.Provider>
  );
}

export function useSpotifyPlayer(): PlayerState {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("useSpotifyPlayer must be used inside SpotifyPlayerProvider");
  return ctx;
}
