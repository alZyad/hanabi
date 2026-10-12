const STORAGE_KEY = "hanabi.perfLog";
const MAX_ENTRIES = 2000;
// Writing the whole log to localStorage is not free: batch it instead of doing it on every entry
const FLUSH_DELAY_MS = 2000;

export interface PerfScript {
  invoker: string;
  type: string;
  source: string;
  fn: string;
  char: number;
  ms: number;
  layout: number;
  pause: number;
}

export type PerfEntry =
  | {
      t: number;
      kind: "update";
      turns: number;
      total: number;
      parse: number;
      rebuild: number;
      render: number;
    }
  | { t: number; kind: "aiSim"; turns: number; ms: number }
  | {
      t: number;
      kind: "hand";
      action: "expand" | "collapse";
      // Missing on entries logged before other players' hands were tracked: those are all "self"
      hand?: "self" | "other";
      // Triggering input event -> toggle handler (queueing delay)
      input?: number;
      // Last pointerdown -> toggle handler (includes how long the finger stayed down)
      tap?: number;
      // Toggle handler -> React commit
      render: number;
      // React commit -> next frame
      paint: number;
      // That frame -> the frame after (a slow paint/raster of the toggled UI shows up here)
      nextFrame?: number;
    }
  | {
      t: number;
      kind: "session";
      build: string;
      ua: string;
      dpr: number;
      viewport: string;
      screen: string;
      cores?: number;
      memory?: number;
      connection?: string;
      apis: string[];
    }
  | { t: number; kind: "visibility"; state: string; ms: number }
  | { t: number; kind: "lifecycle"; event: string }
  // Main thread unresponsive: a 250ms timer fired `ms` late (works in every browser)
  | { t: number; kind: "stall"; ms: number; heap?: number }
  // Event Timing API: a slow interaction, whether or not it toggled a hand
  | {
      t: number;
      kind: "interaction";
      event: string;
      target: string;
      ms: number;
      input: number;
      handler: number;
      present: number;
    }
  // Long Animation Frame API: what kept a frame from being rendered
  | {
      t: number;
      kind: "loaf";
      ms: number;
      blocking: number;
      // Time spent on style/layout and rendering at the end of the frame
      render: number;
      layout: number;
      // First input event that waited for this frame, relative to frame start
      input?: number;
      heap?: number;
      scripts: PerfScript[];
    };

let entries: PerfEntry[] | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function load(): PerfEntry[] {
  if (entries) return entries;
  if (typeof window === "undefined") {
    entries = [];
    return entries;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    entries = raw ? (JSON.parse(raw) as PerfEntry[]) : [];
  } catch {
    entries = [];
  }
  return entries;
}

function scheduleFlush() {
  if (flushTimer !== null) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
    if (idle) idle(() => perfDebug.flush());
    else perfDebug.flush();
  }, FLUSH_DELAY_MS);
}

export const perfDebug = {
  enabled: false,
  receivedAt: null as number | null,
  parseMs: 0,
  rebuildMs: 0,
  turns: 0,
  handToggleAt: null as number | null,
  handInputAt: null as number | null,
  lastPointerDownAt: null as number | null,

  /**
   * Called by the handlers that expand/collapse a hand
   */
  markHandToggle() {
    if (!perfDebug.enabled || typeof window === "undefined") return;
    perfDebug.handToggleAt = performance.now();
    perfDebug.handInputAt = window.event?.timeStamp ?? null;
  },

  record(entry: PerfEntry) {
    if (!perfDebug.enabled || typeof window === "undefined") return;
    const log = load();
    log.push(entry);
    if (log.length > MAX_ENTRIES) log.splice(0, log.length - MAX_ENTRIES);
    scheduleFlush();
  },

  flush() {
    if (typeof window === "undefined" || !entries) return;
    if (flushTimer !== null) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      return;
    }
  },

  getLog(): PerfEntry[] {
    return [...load()];
  },

  clear() {
    entries = [];
    if (flushTimer !== null) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      return;
    }
  },
};
